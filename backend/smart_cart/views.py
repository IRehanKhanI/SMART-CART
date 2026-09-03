import json
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
        esp32_ip = "10.1.7.65"

    clean_ip = esp32_ip.replace("http://", "").replace("https://", "").strip("/")
    url = f"http://{clean_ip}/capture"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SmartCartBackend/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            image_bytes = response.read()
    except Exception as e:
        return JsonResponse({
            "error": f"Failed to wirelessly fetch image from ESP32 at {url}: {str(e)}",
            "hint": "Ensure ESP32-CAM is powered on and connected to the same Wi-Fi network (RehanLP)."
        }, status=502)

    cart = get_or_create_cart(cart_id)
    product, confidence, detection_method, meta_info = analyze_product_image(image_bytes)

    if not product:
        return JsonResponse({
            "error": "Local AI model could not identify a product in the captured frame.",
            "meta": meta_info
        }, status=422)

    item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={"quantity": 1, "unit_price": product.price}
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
    Lightweight endpoint specifically tailored for ESP32-CAM & 1.3" OLED:
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
    rec_str = ", ".join(rec_names) if rec_names else "BREAD, EGGS"

    shopper_tag = (cart.member.name[:9].upper() if cart.member else "GUEST")
    last_item = items[0] if items else None
    line2 = f"+{last_item.product.name[:9]} ${last_item.product.price}" if last_item else "EMPTY CART"

    return JsonResponse({
        "cart_id": cart.cart_id,
        "member": shopper_tag,
        "count": sum(i.quantity for i in items),
        "total": float(total),
        "recs": rec_names,
        "line1": f"{cart.cart_id} [{shopper_tag}]",
        "line2": line2,
        "line3": f"TOT:${total:.2f} ({len(items)}items)",
        "line4": f"REC: {rec_str}",
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


@require_GET
def products_list_view(request: HttpRequest) -> JsonResponse:
    """Lists all available products in store inventory."""
    products = Product.objects.all()
    return JsonResponse({
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "price": float(p.price),
                "barcode": p.barcode,
                "imageUrl": p.image_url,
                "shelfLocation": p.shelf_location,
                "currentStock": p.current_stock,
            }
            for p in products
        ]
    })


def models_Q(*args, **kwargs):
    from django.db.models import Q
    return Q(*args, **kwargs)


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

    # UPI payment URI (Standard for PhonePe, GPay, Paytm)
    upi_uri = f"upi://pay?pa=greenloop@upi&pn=GreenLoopSmartCart&am={final_total:.2f}&cu=INR&tn={cart.cart_id}"

    # Generate QR Code 25x25 matrix
    qr = qrcode.QRCode(
        box_size=1,
        border=0,
        error_correction=qrcode.constants.ERROR_CORRECT_L
    )
    qr.add_data(upi_uri)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    matrix_rows = ["".join("1" if cell else "0" for cell in row) for row in matrix]

    # Generate PNG base64 for frontend
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

