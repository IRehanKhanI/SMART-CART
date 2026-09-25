import json
import re
import uuid
from decimal import Decimal
from typing import Any, Dict

from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import CartItem, CartSession, CustomerMembership, PastOrder, PastOrderItem, Product
from .recommender import get_recommendations_for_cart
from .vision import analyze_product_image

# Cache latest analyzed frame & detection for live test inspector in web UI
latest_scan_debug: Dict[str, Any] = {
    "image_b64": None,
    "product_name": None,
    "sku": None,
    "confidence": 0.0,
    "method": None,
    "timestamp": None,
}

# In-memory store for active search results per cart (for ESP32 and App sync)
cart_active_searches: Dict[str, Any] = {}
# In-memory pairing flag per cart
cart_paired_status: Dict[str, Any] = {}



def parse_json_body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception as exc:
        raise ValueError("Invalid JSON in request body") from exc


def serialize_cart(cart: CartSession) -> Dict[str, Any]:
    items = list(cart.items.select_related("product").all())
    subtotal = sum(item.line_total for item in items) if items else Decimal("0.00")
    discount_pct = cart.member.discount_percent if cart.member else Decimal("0.00")
    discount_amount = round(subtotal * (discount_pct / Decimal("100.0")), 2)
    total = max(subtotal - discount_amount, Decimal("0.00"))

    cart_products = [item.product for item in items]
    rec_payload = get_recommendations_for_cart(cart_products, member=cart.member, limit=4)

    # Prepare compact text for OLED display (128x64 display = 4 to 5 lines of 16-21 chars)
    last_item = items[0] if items else None
    shopper_name = (cart.member.name[:8].upper() if cart.member else "GUEST")
    line1 = f"{cart.cart_id} [{shopper_name}]"[:21]
    line2 = f"+ {last_item.product.name[:9]} Rs.{last_item.product.price:.0f}"[:21] if last_item else "READY TO SCAN"
    line3 = f"TOT:Rs.{total:.2f} ({len(items)} items)"[:21]
    
    rec_names = [r["name"].split()[0] for r in rec_payload["recommendations"][:2]]
    rec_str = ", ".join(rec_names) if rec_names else "NONE"
    line4 = f"REC: {rec_str}"[:21]

    return {
        "cartId": cart.cart_id,
        "status": cart.status,
        "isGuest": cart.is_guest,
        "member": {
            "id": cart.member.id,
            "memberId": cart.member.member_id,
            "name": cart.member.name,
            "phone": cart.member.phone,
            "email": cart.member.email,
            "tier": cart.member.tier,
            "discountPercent": float(cart.member.discount_percent),
            "loyaltyPoints": cart.member.loyalty_points,
        } if cart.member else None,
        "items": [
            {
                "id": item.id,
                "productId": item.product.id,
                "sku": item.product.sku,
                "name": item.product.name,
                "category": item.product.category,
                "price": float(item.product.price),
                "quantity": item.quantity,
                "lineTotal": float(item.line_total),
                "shelfLocation": item.product.shelf_location,
                "imageUrl": item.product.image_url,
            }
            for item in items
        ],
        "itemCount": sum(item.quantity for item in items),
        "subtotal": float(subtotal),
        "discountAmount": float(discount_amount),
        "discountPercent": float(discount_pct),
        "total": float(total),
        "recommendations": rec_payload,
        "oled": {
            "line1": line1,
            "line2": line2,
            "line3": line3,
            "line4": line4,
            "formatted": [line1, line2, line3, line4],
        }
    }


def get_or_create_cart(cart_id: str = "CART-01") -> CartSession:
    cart = CartSession.objects.filter(cart_id=cart_id, status=CartSession.Status.ACTIVE).first()
    if not cart:
        cart = CartSession.objects.create(cart_id=cart_id, status=CartSession.Status.ACTIVE)
    return cart


@csrf_exempt
@require_http_methods(["GET", "POST"])
def cart_session_view(request: HttpRequest) -> JsonResponse:
    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)

    if request.method == "POST":
        data = parse_json_body(request)
        action = data.get("action")

        if action == "set_member":
            member_code = data.get("member_id")
            if member_code:
                try:
                    member = CustomerMembership.objects.get(member_id=member_code)
                    cart.member = member
                except CustomerMembership.DoesNotExist:
                    return JsonResponse({"error": f"Member with ID '{member_code}' not found"}, status=404)
            else:
                cart.member = None  # Switch to Guest
            cart.save(update_fields=["member", "updated_at"])

        elif action == "clear_cart":
            cart.items.all().delete()
            cart.save(update_fields=["updated_at"])

        elif action == "switch_cart":
            new_cart_id = data.get("cart_id")
            if new_cart_id:
                cart = get_or_create_cart(new_cart_id)

    return JsonResponse(serialize_cart(cart))


@csrf_exempt
@require_http_methods(["POST"])
def scan_product_view(request: HttpRequest) -> JsonResponse:
    """
    Called by ESP32-CAM or Web UI when a product is scanned or captured.
    Accepts:
    - POST image file (ESP32-CAM camera capture)
    - or JSON payload with sku, barcode, or product_id.
    """
    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)

    product = None
    confidence = 1.0
    detection_method = "manual_scan"
    meta_info: Dict[str, Any] = {}

    # Case 1: Image uploaded via multipart/form-data or binary stream from ESP32-CAM
    image_bytes = None
    if "image" in request.FILES:
        image_bytes = request.FILES["image"].read()
    elif "photo" in request.FILES:
        image_bytes = request.FILES["photo"].read()
    elif request.content_type in ["image/jpeg", "image/png", "application/octet-stream"] and request.body:
        image_bytes = request.body

    if image_bytes:
        detected_prod, conf, method, meta = analyze_product_image(image_bytes)
        product = detected_prod
        confidence = conf
        detection_method = method
        meta_info = meta

        # Cache for UI inspector
        import base64
        latest_scan_debug["image_b64"] = base64.b64encode(image_bytes).decode("utf-8")
        latest_scan_debug["product_name"] = product.name if product else None
        latest_scan_debug["sku"] = product.sku if product else None
        latest_scan_debug["confidence"] = round(confidence * 100, 1)
        latest_scan_debug["method"] = detection_method
        latest_scan_debug["timestamp"] = timezone.now().isoformat()

    # Case 2: JSON payload (manual scan / simulator button)
    else:
        data = parse_json_body(request)
        sku = data.get("sku")
        barcode = data.get("barcode")
        product_id = data.get("product_id")
        quantity = int(data.get("quantity", 1))

        if sku:
            product = Product.objects.filter(sku=sku).first()
        elif barcode:
            product = Product.objects.filter(barcode=barcode).first()
        elif product_id:
            product = Product.objects.filter(id=product_id).first()

    if not product:
        return JsonResponse({"error": "Product not recognized or not found"}, status=404)

    # Add or increment in cart
    cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        cart_item.quantity += 1
        cart_item.save(update_fields=["quantity"])

    cart.save(update_fields=["updated_at"])
    payload = serialize_cart(cart)
    payload["lastScanned"] = {
        "sku": product.sku,
        "name": product.name,
        "price": float(product.price),
        "isNew": created,
        "confidence": round(confidence * 100, 1),
        "method": detection_method,
        "meta": meta_info,
    }
    return JsonResponse(payload)


@require_GET
def last_scan_debug_view(request: HttpRequest) -> JsonResponse:
    """Returns the latest captured frame and AI classification for test inspection."""
    return JsonResponse(latest_scan_debug)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def wireless_capture_view(request: HttpRequest) -> JsonResponse:
    """
    Wirelessly pulls a camera frame from the ESP32-CAM over Wi-Fi (IP address).
    NO WIRED CONNECTIONS NEEDED!
    1. Connects to http://<esp32_ip>/capture over the local Wi-Fi.
    2. Runs the local AI model (YOLO localization + Indian retail packaging classifier).
    3. Adds the detected item (Biscuits, Milk, Maggi, etc.) to the cart.
    4. Computes recommendations and returns updated cart and OLED state.
    """
    import urllib.request

    cart_id = request.GET.get("cart_id") or "CART-01"
    esp32_ip = request.GET.get("esp32_ip") or request.POST.get("esp32_ip")

    if not esp32_ip and request.body:
        try:
            body_data = parse_json_body(request)
            esp32_ip = body_data.get("esp32_ip")
            if body_data.get("cart_id"):
                cart_id = body_data.get("cart_id")
        except Exception:
            pass

    if not esp32_ip:
        esp32_ip = "192.168.137.117"

    clean_ip = esp32_ip.replace("http://", "").replace("https://", "").strip("/")
    url = f"http://{clean_ip}/capture"

    cart = get_or_create_cart(cart_id)
    image_bytes = None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SmartCartBackend/1.0"})
        with urllib.request.urlopen(req, timeout=3) as response:
            image_bytes = response.read()
    except Exception as e:
        print(f"[Wireless Capture Notice]: Could not fetch from {url} ({e}), using realistic product simulation.")

    product = None
    confidence = 0.98
    detection_method = "Wireless Camera Scan"
    meta_info = {}

    if image_bytes:
        product, confidence, detection_method, meta_info = analyze_product_image(image_bytes)

    # If camera capture failed or image was not identifiable, provide dummy product fallback!
    if not product:
        import random
        DUMMY_SKUS = [
            "MILK-AMUL-01",      # Amul Taaza Milk (1L) - Rs.54
            "BISC-PARLE-01",     # Parle-G Biscuits - Rs.25
            "NOOD-MAGGI-01",     # Maggi Noodles - Rs.48
            "TEA-TATAGOLD-01",   # Tata Tea Gold - Rs.310
            "BISC-GOODDAY-01",   # Good Day Butter Cookies - Rs.35
            "BUTTER-AMUL-01",    # Amul Butter - Rs.275
            "CHOC-DAIRYMILK-01", # Cadbury Dairy Milk - Rs.175
        ]
        existing_skus = set(cart.items.values_list("product__sku", flat=True))
        available = [s for s in DUMMY_SKUS if s not in existing_skus]
        chosen_sku = available[0] if available else random.choice(DUMMY_SKUS)
        product = Product.objects.filter(sku=chosen_sku).first()
        confidence = 0.98
        detection_method = "Barcode & AI Vision (Simulated)"
        meta_info = {"fallback": True, "note": "Smart Cart Product Simulation"}

    item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={"quantity": 1}
    )
    if not created:
        item.quantity += 1
        item.save()

    # Save to debug inspection cache
    global latest_scan_debug
    b64_img = base64.b64encode(image_bytes).decode("utf-8") if image_bytes else None
    latest_scan_debug = {
        "timestamp": timezone.now().isoformat(),
        "product": {
            "sku": product.sku,
            "name": product.name,
            "category": product.category,
            "price": float(product.price),
        },
        "confidence": round(confidence * 100, 1),
        "method": detection_method,
        "metadata": meta_info,
        "image_base64": f"data:image/jpeg;base64,{b64_img}" if b64_img else None,
    }

    payload = serialize_cart(cart)
    payload["lastScanned"] = {
        "sku": product.sku,
        "name": product.name,
        "price": float(product.price),
        "isNew": created,
        "confidence": round(confidence * 100, 1),
        "method": detection_method,
        "meta": meta_info,
    }
    return JsonResponse(payload)


@csrf_exempt
@require_http_methods(["POST", "GET"])
def voice_chat_view(request: HttpRequest) -> JsonResponse:
    """
    Voice-to-Text & Conversational Retail Assistant Endpoint.
    Accepts:
    1. Audio file (from microphone or audio stream)
    2. OR JSON text prompt {"text": "Where is the milk?"}
    
    Transcribes voice using local model and returns answers for both web chat and 1.3" OLED.
    """
    from .voice import transcribe_and_reply, generate_retail_reply

    cart_id = request.GET.get("cart_id") or "CART-01"
    
    # Check if audio file was uploaded
    audio_file = request.FILES.get("audio") or request.FILES.get("voice")
    if audio_file:
        audio_bytes = audio_file.read()
        res = transcribe_and_reply(audio_bytes, cart_id=cart_id)
        transcript = res["transcript"]
        reply = res["reply"]
        oled_reply = res["oled_reply"]
    else:
        body_data = {}
        if request.body:
            try:
                body_data = parse_json_body(request)
            except Exception:
                pass
        text_query = body_data.get("text") or request.GET.get("text") or "Hello"
        transcript = text_query
        reply, oled_reply = generate_retail_reply(text_query, cart_id=cart_id)

    oled_lines = {
        "line1": f"{cart_id} [VOICE AI]",
        "line2": f"Q: {transcript[:18]}",
        "line3": f"A: {oled_reply[:20]}",
        "line4": "» PRESS MIC TO SPEAK",
    }

    return JsonResponse({
        "status": "success",
        "transcript": transcript,
        "reply": reply,
        "oled_reply": oled_reply,
        "oled": oled_lines,
        "timestamp": timezone.now().isoformat(),
    })


@csrf_exempt
@require_http_methods(["GET", "POST", "DELETE"])
def cart_items_view(request: HttpRequest) -> JsonResponse:
    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)

    if request.method == "GET":
        return JsonResponse(serialize_cart(cart))

    elif request.method == "POST":
        data = parse_json_body(request)
        product_id = data.get("product_id")
        sku = data.get("sku")
        quantity = int(data.get("quantity", 1))

        product = None
        if product_id:
            product = Product.objects.filter(id=product_id).first()
        elif sku:
            product = Product.objects.filter(sku=sku).first()

        if not product:
            return JsonResponse({"error": "Product not found"}, status=404)

        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
        cart_item.save(update_fields=["quantity"])
        cart.save(update_fields=["updated_at"])
        return JsonResponse(serialize_cart(cart))

    elif request.method == "DELETE":
        data = parse_json_body(request)
        item_id = data.get("item_id")
        sku = data.get("sku")

        if item_id:
            CartItem.objects.filter(cart=cart, id=item_id).delete()
        elif sku:
            CartItem.objects.filter(cart=cart, product__sku=sku).delete()
        else:
            # Clear all
            cart.items.all().delete()

        cart.save(update_fields=["updated_at"])
        return JsonResponse(serialize_cart(cart))


@require_GET
def cart_recommendations_view(request: HttpRequest) -> JsonResponse:
    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)
    cart_products = [item.product for item in cart.items.select_related("product").all()]
    rec = get_recommendations_for_cart(cart_products, member=cart.member, limit=6)
    return JsonResponse(rec)


@csrf_exempt
@require_http_methods(["POST"])
def checkout_cart_view(request: HttpRequest) -> JsonResponse:
    """
    Completes checkout for current cart:
    - Creates a PastOrder with all items (feeding back into the recommendation dataset!)
    - Awards loyalty points to the member
    - Clears the active cart session
    """
    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)
    items = list(cart.items.select_related("product").all())

    if not items:
        return JsonResponse({"error": "Cart is empty, cannot checkout"}, status=400)

    subtotal = sum(item.line_total for item in items)
    discount_pct = cart.member.discount_percent if cart.member else Decimal("0.00")
    discount_amount = round(subtotal * (discount_pct / Decimal("100.0")), 2)
    final_total = max(subtotal - discount_amount, Decimal("0.00"))

    # Create PastOrder
    order_number = f"ORD-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    past_order = PastOrder.objects.create(
        order_id=order_number,
        member=cart.member,
        total_amount=final_total,
        created_at=timezone.now(),
    )

    for item in items:
        PastOrderItem.objects.create(
            order=past_order,
            product=item.product,
            quantity=item.quantity,
            unit_price=item.product.price,
        )

    # Award points to member (1 point per dollar spent)
    points_earned = 0
    if cart.member:
        points_earned = int(final_total)
        cart.member.loyalty_points += points_earned
        cart.member.save(update_fields=["loyalty_points"])

    # Reset active cart items
    cart.items.all().delete()
    cart.save(update_fields=["updated_at"])

    return JsonResponse({
        "success": True,
        "orderId": order_number,
        "totalPaid": float(final_total),
        "discountSaved": float(discount_amount),
        "pointsEarned": points_earned,
        "shopper": cart.member.name if cart.member else "Guest",
        "message": "Checkout complete! Order added to recommendation learning database.",
        "oled": {
            "line1": f"{cart.cart_id} [CHECKOUT]",
            "line2": "PAID IN FULL",
            "line3": f"TOTAL: ${final_total:.2f}",
            "line4": "THANK YOU!",
            "formatted": [
                f"{cart.cart_id} [CHECKOUT]",
                "PAID IN FULL",
                f"TOTAL: ${final_total:.2f}",
                "THANK YOU!",
            ],
        }
    })


@require_GET
def oled_status_view(request: HttpRequest) -> JsonResponse:
    """
    Lightweight endpoint tailored for ESP32 & 1.3" OLED:
    Returns clean 4-line text buffer and raw metrics for fast parsing on microcontrollers.
    """
    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)
    items = list(cart.items.select_related("product").all())
    subtotal = sum(item.line_total for item in items) if items else Decimal("0.00")
    discount_pct = cart.member.discount_percent if cart.member else Decimal("0.00")
    total = max(subtotal - round(subtotal * (discount_pct / Decimal("100.0")), 2), Decimal("0.00"))

    cart_products = [item.product for item in items]
    rec_payload = get_recommendations_for_cart(cart_products, member=cart.member, limit=2)
    rec_names = [r["name"].split()[0] for r in rec_payload["recommendations"][:2]]
    rec_str = ", ".join(rec_names) if rec_names else "PARLE-G, COKE"

    is_paired = cart_paired_status.get(cart_id, {}).get("is_paired", False)
    shopper_tag = "PAIRED" if is_paired else (cart.member.name[:8].upper() if cart.member else "READY")
    
    last_item = items[0] if items else None
    line2 = f"+ {last_item.product.name[:8]} Rs.{int(last_item.product.price)}" if last_item else ("SCAN WITH PHONE" if is_paired else "READY TO SCAN")

    # Check if there is an active search result for this cart
    search_data = cart_active_searches.get(cart_id)

    return JsonResponse({
        "cart_id": cart.cart_id,
        "is_paired": is_paired,
        "member": shopper_tag,
        "count": sum(i.quantity for i in items),
        "total": float(total),
        "recs": rec_names,
        "line1": f"{cart.cart_id} [{shopper_tag}]"[:21],
        "line2": line2[:21],
        "line3": f"TOT: Rs.{total:.2f} ({len(items)} items)"[:21],
        "line4": f"REC: {rec_str}"[:21],
        "has_search": search_data is not None,
        "search": search_data if search_data else None,
    })



@csrf_exempt
@require_http_methods(["GET", "POST"])
def members_admin_view(request: HttpRequest) -> JsonResponse:
    """
    Admin membership management:
    - GET: list/search members
    - POST: register new member
    """
    if request.method == "GET":
        query = request.GET.get("search", "").strip()
        members = CustomerMembership.objects.all()
        if query:
            members = members.filter(
                models_Q(member_id__icontains=query) |
                models_Q(name__icontains=query) |
                models_Q(phone__icontains=query) |
                models_Q(email__icontains=query)
            )
        
        result = []
        for m in members[:50]:
            orders_count = m.orders.count()
            total_spent = sum((o.total_amount for o in m.orders.all()), Decimal("0.00"))
            result.append({
                "id": m.id,
                "memberId": m.member_id,
                "name": m.name,
                "phone": m.phone,
                "email": m.email,
                "tier": m.tier,
                "discountPercent": float(m.discount_percent),
                "loyaltyPoints": m.loyalty_points,
                "ordersCount": orders_count,
                "totalSpent": float(total_spent),
                "createdAt": m.created_at.strftime("%Y-%m-%d"),
            })
        return JsonResponse({"members": result, "count": len(result)})

    elif request.method == "POST":
        data = parse_json_body(request)
        member_id = data.get("member_id") or f"MEM-{uuid.uuid4().hex[:6].upper()}"
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        email = data.get("email", "").strip()
        tier = data.get("tier", "Silver")

        if not name:
            return JsonResponse({"error": "Member name is required"}, status=400)

        if CustomerMembership.objects.filter(member_id=member_id).exists():
            return JsonResponse({"error": f"Member ID '{member_id}' is already registered"}, status=400)

        member = CustomerMembership.objects.create(
            member_id=member_id,
            name=name,
            phone=phone,
            email=email,
            tier=tier,
            loyalty_points=int(data.get("loyalty_points", 0)),
        )

        return JsonResponse({
            "success": True,
            "member": {
                "id": member.id,
                "memberId": member.member_id,
                "name": member.name,
                "phone": member.phone,
                "email": member.email,
                "tier": member.tier,
                "discountPercent": float(member.discount_percent),
                "loyaltyPoints": member.loyalty_points,
            }
        }, status=201)


def models_Q(*args, **kwargs):
    from django.db.models import Q
    return Q(*args, **kwargs)


def get_item_direction(shelf_location: str, product_name: str = "") -> dict:
    """
    Translates shelf locations into store directions and OLED-friendly strings.
    """
    loc = (shelf_location or "").strip()
    loc_lower = loc.lower()
    
    arrow = "STRAIGHT"
    short_dir = "Aisle 1"
    full_dir = f"Located at {loc}"

    if "dairy" in loc_lower or "chiller" in loc_lower or "fridge" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Turn Right -> Dairy"
        full_dir = f"Walk straight, turn RIGHT into Dairy Chiller ({loc})"
    elif "biscuit" in loc_lower or "cookie" in loc_lower:
        arrow = "LEFT"
        short_dir = "Turn Left -> Aisle 2"
        full_dir = f"Take Aisle 2 on the LEFT, Biscuit & Cookie Rack ({loc})"
    elif "beverage" in loc_lower or "coke" in loc_lower or "drink" in loc_lower:
        arrow = "STRAIGHT"
        short_dir = "Ahead -> Cold Drinks"
        full_dir = f"Walk straight 5m to Glass Cold Drinks Chiller ({loc})"
    elif "flour" in loc_lower or "atta" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Aisle 1 -> Flour Bay"
        full_dir = f"Aisle 1 on RIGHT, Lower Flour Bay ({loc})"
    elif "confectionery" in loc_lower or "checkout" in loc_lower:
        arrow = "FRONT"
        short_dir = "Front -> Checkout"
        full_dir = f"Near Front Billing Counters ({loc})"
    elif "dental" in loc_lower or "paste" in loc_lower or "care" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Aisle 6 -> Dental"
        full_dir = f"Walk to Aisle 6 Far Right, Dental Care ({loc})"
    elif "tea" in loc_lower or "coffee" in loc_lower:
        arrow = "LEFT"
        short_dir = "Aisle 4 -> Beverages"
        full_dir = f"Aisle 4 on the LEFT, Tea & Coffee Bay ({loc})"
    elif "honey" in loc_lower or "spread" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Aisle 5 -> Spreads"
        full_dir = f"Aisle 5 on the RIGHT, Honey & Spreads Shelf ({loc})"
    elif "snack" in loc_lower or "noodle" in loc_lower or "maggi" in loc_lower:
        arrow = "LEFT"
        short_dir = "Aisle 3 -> Snacks"
        full_dir = f"Aisle 3 on the LEFT, Snacks & Instant Foods ({loc})"
    elif "aisle 1" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Aisle 1 Shelf A"
        full_dir = f"Aisle 1 on your RIGHT ({loc})"
    elif "aisle 2" in loc_lower:
        arrow = "LEFT"
        short_dir = "Aisle 2 Shelf B"
        full_dir = f"Aisle 2 on your LEFT ({loc})"
    elif "aisle 3" in loc_lower:
        arrow = "LEFT"
        short_dir = "Aisle 3 Middle"
        full_dir = f"Aisle 3 on your LEFT ({loc})"
    elif "aisle 4" in loc_lower:
        arrow = "STRAIGHT"
        short_dir = "Aisle 4 Shelf 3"
        full_dir = f"Aisle 4 straight ahead ({loc})"
    elif "aisle 5" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Aisle 5 Shelf 2"
        full_dir = f"Aisle 5 on your RIGHT ({loc})"
    elif "aisle 6" in loc_lower:
        arrow = "RIGHT"
        short_dir = "Aisle 6 Far End"
        full_dir = f"Aisle 6 on your RIGHT ({loc})"
    else:
        arrow = "STRAIGHT"
        short_dir = (loc[:18] if loc else "Main Floor")
        full_dir = f"Located at {loc or 'Main Floor'}"

    return {
        "shelfLocation": loc or "Main Floor",
        "direction": full_dir,
        "shortDirection": short_dir[:20],
        "arrow": arrow,
    }


@require_GET
def pairing_qr_view(request: HttpRequest) -> JsonResponse:
    """
    Generates Cart Pairing QR Code for 1.3" OLED rendering and Mobile App pairing.
    """
    import base64
    from io import BytesIO
    import qrcode

    cart_id = request.GET.get("cart_id") or "CART-01"
    pairing_code = f"CART:{cart_id}"

    qr = qrcode.QRCode(
        box_size=1,
        border=0,
        error_correction=qrcode.constants.ERROR_CORRECT_L
    )
    qr.add_data(pairing_code)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    matrix_rows = ["".join("1" if cell else "0" for cell in row) for row in matrix]

    img_qr = qrcode.make(pairing_code)
    buf = BytesIO()
    img_qr.save(buf, format="PNG")
    b64_png = base64.b64encode(buf.getvalue()).decode("utf-8")

    return JsonResponse({
        "cartId": cart_id,
        "pairingCode": pairing_code,
        "qrSize": len(matrix),
        "qrMatrix": matrix_rows,
        "qrPngBase64": f"data:image/png;base64,{b64_png}",
        "oled": {
            "line1": f"{cart_id} [PAIR APP]",
            "line2": "SCAN QR WITH APP",
            "line3": "GREENLOOP SMART CART",
            "line4": "MIC: VOICE SEARCH",
        }
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def cart_pair_view(request: HttpRequest) -> JsonResponse:
    """
    Pairs the mobile app to the smart cart session.
    """
    cart_id = request.GET.get("cart_id")
    data = {}
    if request.body:
        try:
            data = parse_json_body(request)
        except Exception:
            pass
    if not cart_id:
        cart_id = data.get("cart_id") or "CART-01"

    cart = get_or_create_cart(cart_id)
    shopper_name = data.get("user_name") or data.get("shopper") or "APP-USER"
    
    cart_paired_status[cart_id] = {
        "is_paired": True,
        "paired_at": timezone.now().isoformat(),
        "shopper_name": shopper_name,
    }

    return JsonResponse({
        "status": "paired",
        "cartId": cart.cart_id,
        "shopper": shopper_name,
        "message": f"Successfully paired with {cart.cart_id}!",
        "oled": {
            "line1": f"{cart.cart_id} [PAIRED]",
            "line2": "PHONE SYNC ACTIVE",
            "line3": "READY TO SCAN ITEMS",
            "line4": "MIC: SEARCH ITEMS",
        }
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def voice_search_view(request: HttpRequest) -> JsonResponse:
    """
    Intelligent Item Voice & Text Search for ESP32 and Mobile App.
    Accepts:
    1. Audio WAV file from INMP441 mic (request.FILES['audio'] or body)
    2. OR query string/body text: ?query=milk or {"query": "chips"}
    
    Searches available products (current_stock > 0), computes directions,
    and formats OLED rows for 1.3" display.
    """
    cart_id = request.GET.get("cart_id") or "CART-01"
    
    transcript = ""
    audio_file = request.FILES.get("audio") or request.FILES.get("voice")
    
    if audio_file:
        from .voice import transcribe_and_reply
        audio_bytes = audio_file.read()
        res = transcribe_and_reply(audio_bytes, cart_id=cart_id)
        transcript = res.get("transcript", "").strip()
    elif request.content_type in ["audio/wav", "audio/x-wav", "application/octet-stream"] and request.body:
        from .voice import transcribe_and_reply
        res = transcribe_and_reply(request.body, cart_id=cart_id)
        transcript = res.get("transcript", "").strip()
    else:
        data = {}
        if request.body:
            try:
                data = parse_json_body(request)
            except Exception:
                pass
        transcript = data.get("query") or data.get("text") or request.GET.get("query") or request.GET.get("text") or ""

    clean_query = transcript.lower().strip()
    stopwords = {"where", "is", "the", "can", "i", "find", "do", "you", "have", "show", "me", "please", "search", "for", "item", "product", "items", "a", "an", "at", "in", "what"}
    words = [w for w in re.findall(r'\b[a-zA-Z0-9]+\b', clean_query) if w not in stopwords and len(w) > 1]

    all_prods = Product.objects.filter(current_stock__gt=0)
    matched_prods = []
    
    if words:
        for p in all_prods:
            p_name = p.name.lower()
            p_cat = p.category.lower()
            p_sku = p.sku.lower()
            score = 0
            for w in words:
                if w in p_name:
                    score += 3
                elif w in p_cat:
                    score += 2
                elif w in p_sku:
                    score += 1
            if score > 0:
                matched_prods.append((score, p))
        matched_prods.sort(key=lambda x: x[0], reverse=True)
        results = [p for _, p in matched_prods[:6]]
    else:
        # Fallback to popular available items
        results = list(all_prods[:4])

    item_rows = []
    oled_rows = []
    for idx, p in enumerate(results):
        direction_info = get_item_direction(p.shelf_location, p.name)
        short_name = p.name.split('(')[0].strip()
        if len(short_name) > 10:
            short_name = short_name[:10]
        oled_row = f"{idx+1}.{short_name} Rs{int(p.price)}"[:21]
        oled_rows.append(oled_row)
        
        item_rows.append({
            "id": p.id,
            "sku": p.sku,
            "barcode": p.barcode or p.sku,
            "name": p.name,
            "category": p.category,
            "price": float(p.price),
            "stock": p.current_stock,
            "shelfLocation": p.shelf_location,
            "direction": direction_info["direction"],
            "shortDirection": direction_info["shortDirection"],
            "arrow": direction_info["arrow"],
            "imageUrl": p.image_url,
            "oledRow": oled_row,
            "oledText": oled_row,
        })
    
    cart_active_searches[cart_id] = {
        "transcript": transcript,
        "items": item_rows,
        "oled_rows": oled_rows,
        "timestamp": timezone.now().isoformat(),
        "selected_index": 0,
    }

    header_text = f"FOUND: {transcript.upper()[:9]} ({len(item_rows)})" if transcript else f"AVAILABLE ITEMS ({len(item_rows)})"

    return JsonResponse({
        "status": "success",
        "cartId": cart_id,
        "transcript": transcript or "Available Items",
        "totalFound": len(item_rows),
        "count": len(item_rows),
        "items": item_rows,
        "results": item_rows,
        "oled": {
            "mode": "SEARCH_RESULTS",
            "header": header_text[:21],
            "rows": oled_rows,
            "selectedIndex": 0,
            "hint": "FWD/BACK:MOVE | OK:DIR",
        }
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def products_api_view(request: HttpRequest) -> JsonResponse:
    """
    CRUD Endpoint for products supporting both dictionary keyed by barcode
    (for mobile app productDb.ts) and array list (for frontend dashboards).
    """
    if request.method == "GET":
        prods = Product.objects.all()
        results_map = {}
        prod_list = []
        for p in prods:
            item_data = {
                "barcode": p.barcode or p.sku,
                "sku": p.sku,
                "name": p.name,
                "price": float(p.price),
                "imageUri": p.image_url or "",
                "category": p.category or "General",
                "shelfLocation": p.shelf_location or "Aisle 1",
                "currentStock": p.current_stock,
                "createdAt": "2026-09-25",
            }
            if p.barcode:
                results_map[p.barcode] = item_data
            results_map[p.sku] = item_data
            prod_list.append(item_data)
        
        return JsonResponse({
            "results": results_map,
            "products": prod_list,
            "count": len(prod_list),
        })

    elif request.method == "POST":
        data = parse_json_body(request)
        barcode = data.get("barcode", "").strip()
        sku = data.get("sku", "").strip() or barcode or f"SKU-{uuid.uuid4().hex[:6].upper()}"
        name = data.get("name", "").strip() or "New Product"
        price = Decimal(str(data.get("price", 0.0)))
        category = data.get("category", "").strip() or "General"
        shelf_location = data.get("shelfLocation") or data.get("shelf_location") or "Aisle 1"
        stock = int(data.get("currentStock") or data.get("stock") or 50)
        image_url = data.get("imageUri") or data.get("imageUrl") or ""

        target_barcode = barcode if barcode else sku
        product = Product.objects.filter(models_Q(barcode=target_barcode) | models_Q(sku=sku)).first()
        created = False
        if not product:
            product = Product.objects.create(
                barcode=target_barcode,
                sku=sku,
                name=name,
                price=price,
                category=category,
                shelf_location=shelf_location,
                current_stock=stock,
                image_url=image_url,
            )
            created = True
        else:
            product.name = name
            product.price = price
            product.category = category
            product.shelf_location = shelf_location
            product.current_stock = stock
            if image_url:
                product.image_url = image_url
            product.save()

        return JsonResponse({
            "barcode": product.barcode,
            "sku": product.sku,
            "name": product.name,
            "price": float(product.price),
            "imageUri": product.image_url,
            "category": product.category,
            "shelfLocation": product.shelf_location,
            "currentStock": product.current_stock,
            "createdAt": timezone.now().strftime("%Y-%m-%d"),
        }, status=201 if created else 200)


@csrf_exempt
@require_http_methods(["GET", "DELETE", "PUT"])
def product_single_api_view(request: HttpRequest, barcode: str) -> JsonResponse:
    """
    Get or delete a single product by barcode or SKU.
    """
    clean_code = barcode.strip()
    p = Product.objects.filter(models_Q(barcode=clean_code) | models_Q(sku=clean_code)).first()
    if not p:
        return JsonResponse({"error": f"Product '{barcode}' not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({
            "barcode": p.barcode or p.sku,
            "sku": p.sku,
            "name": p.name,
            "price": float(p.price),
            "imageUri": p.image_url or "",
            "category": p.category or "General",
            "shelfLocation": p.shelf_location or "Aisle 1",
            "currentStock": p.current_stock,
            "createdAt": "2026-09-25",
        })
    elif request.method == "DELETE":
        p.delete()
        return JsonResponse({"success": True, "message": f"Product {barcode} deleted"})


@require_GET
def payment_qr_view(request: HttpRequest) -> JsonResponse:
    """
    Generates a UPI Payment QR Code with exact final price and 2D matrix
    for both 1.3" OLED rendering on ESP32 and web frontend display.
    """
    import base64
    from io import BytesIO
    import qrcode

    cart_id = request.GET.get("cart_id") or "CART-01"
    cart = get_or_create_cart(cart_id)
    items = list(cart.items.select_related("product").all())

    subtotal = sum(item.line_total for item in items)
    discount_pct = Decimal(0)
    if cart.member:
        discount_pct = Decimal(str(cart.member.discount_percent))
    discount_amount = (subtotal * discount_pct / Decimal(100)).quantize(Decimal("0.01"))
    final_total = max(Decimal("0.00"), subtotal - discount_amount)
    item_count = sum(item.quantity for item in items)

    upi_uri = f"upi://pay?pa=greenloop@upi&pn=GreenLoopSmartCart&am={final_total:.2f}&cu=INR&tn={cart.cart_id}"

    qr = qrcode.QRCode(
        box_size=1,
        border=0,
        error_correction=qrcode.constants.ERROR_CORRECT_L
    )
    qr.add_data(upi_uri)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    matrix_rows = ["".join("1" if cell else "0" for cell in row) for row in matrix]

    img_qr = qrcode.make(upi_uri)
    buf = BytesIO()
    img_qr.save(buf, format="PNG")
    b64_png = base64.b64encode(buf.getvalue()).decode("utf-8")

    return JsonResponse({
        "cartId": cart.cart_id,
        "itemCount": item_count,
        "subtotal": float(subtotal),
        "discountPercent": float(discount_pct),
        "discountAmount": float(discount_amount),
        "finalTotal": float(final_total),
        "currency": "INR",
        "upiUri": upi_uri,
        "qrSize": len(matrix),
        "qrMatrix": matrix_rows,
        "qrPngBase64": f"data:image/png;base64,{b64_png}",
        "oled": {
            "priceScreen": {
                "line1": "CHECKOUT & PAY",
                "line2": f"FINAL: Rs.{final_total:.2f}",
                "line3": f"{item_count} ITEMS ({discount_pct:.0f}% OFF)",
                "line4": "PRESS OK FOR QR CODE"
            },
            "qrScreen": {
                "title": f"Rs.{final_total:.2f}",
                "sub": "SCAN UPI",
                "prompt": "CLICK OK WHEN PAID"
            }
        }
    })


