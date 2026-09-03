from collections import Counter, defaultdict
from decimal import Decimal
from typing import List, Dict, Any, Optional

from .models import CustomerMembership, Product, PastOrder, PastOrderItem


def get_recommendations_for_cart(
    cart_products: List[Product],
    member: Optional[CustomerMembership] = None,
    limit: int = 4
) -> Dict[str, Any]:
    """
    Computes intelligent product recommendations based on Market Basket Analysis:
    - For Normal People (Guests/Non-members):
        Recommendations are computed from aggregate purchase data across ALL people
        (co-occurrence frequency: products frequently bought together in the same basket).
    - For Members:
        Analyzes this member's past purchases and combination habits.
        If member has combination history, prioritizes it and blends with global trends.
        If member has no purchase history, seamlessly falls back to normal people's data.
    """
    cart_product_ids = {p.id for p in cart_products}
    cart_names = [p.name for p in cart_products]

    # --- Scenario 1: Cart is Empty ---
    if not cart_products:
        return _recommend_empty_cart(member=member, limit=limit)

    # --- Scenario 2: Cart has items -> Analyze combinations & co-occurrences ---
    
    # 1. Global Co-occurrence (All People's aggregate purchase history)
    # Find all past orders containing at least one item from the current cart
    matching_global_order_ids = (
        PastOrderItem.objects.filter(product_id__in=cart_product_ids)
        .values_list("order_id", flat=True)
        .distinct()
    )
    total_matching_orders = matching_global_order_ids.count()

    global_co_counts: Counter = Counter()
    for item in PastOrderItem.objects.filter(
        order_id__in=matching_global_order_ids
    ).exclude(product_id__in=cart_product_ids).select_related("product"):
        global_co_counts[item.product_id] += 1

    # 2. Member Personal Purchase Combinations (if member provided)
    member_co_counts: Counter = Counter()
    member_order_count = 0
    member_has_combos = False

    if member:
        member_orders = PastOrder.objects.filter(member=member)
        member_order_count = member_orders.count()

        if member_order_count > 0:
            matching_member_order_ids = (
                PastOrderItem.objects.filter(
                    order__member=member,
                    product_id__in=cart_product_ids
                )
                .values_list("order_id", flat=True)
                .distinct()
            )
            matching_member_count = matching_member_order_ids.count()
            if matching_member_count > 0:
                member_has_combos = True
                for item in PastOrderItem.objects.filter(
                    order_id__in=matching_member_order_ids
                ).exclude(product_id__in=cart_product_ids):
                    member_co_counts[item.product_id] += 1

    # 3. Score candidates based on Member vs Normal People (Global) logic
    candidate_scores: Dict[int, float] = defaultdict(float)
    provenance_map: Dict[int, str] = {}
    reason_map: Dict[int, str] = {}
    badge_map: Dict[int, str] = {}

    # All candidate product IDs
    candidate_ids = set(global_co_counts.keys()) | set(member_co_counts.keys())

    if not candidate_ids:
        # Fallback to top-selling products not in cart
        return _recommend_top_sellers(cart_product_ids, member=member, limit=limit)

    primary_cart_name = cart_names[0] if cart_names else "items"

    for pid in candidate_ids:
        g_count = global_co_counts.get(pid, 0)
        g_confidence = (g_count / total_matching_orders) if total_matching_orders > 0 else 0.0

        if member and member_has_combos and pid in member_co_counts:
            # Member has personal combination history with these items!
            m_count = member_co_counts[pid]
            # Heavily weight member preference (70%) + store trends (30%)
            combined_score = (m_count * 5.0) + (g_confidence * 20.0)
            candidate_scores[pid] = combined_score
            provenance_map[pid] = "member_personalized"
            reason_map[pid] = f"{member.name}'s go-to pairing with {primary_cart_name}"
            badge_map[pid] = "Personal Favorite"
        elif member and member_order_count > 0:
            # Member has some history, but this specific item pair comes from store trends
            combined_score = (g_confidence * 15.0) + (g_count * 1.0)
            candidate_scores[pid] = combined_score
            provenance_map[pid] = "member_blended"
            confidence_pct = min(round(g_confidence * 100), 98) if g_confidence > 0 else 75
            reason_map[pid] = f"Frequently bought with {primary_cart_name} ({confidence_pct}% match)"
            badge_map[pid] = "Smart Match"
        else:
            # Normal people (Guest shopper OR Member with zero purchase history -> fallback to normal people)
            confidence_pct = min(round(g_confidence * 100), 98) if g_confidence > 0 else 75
            candidate_scores[pid] = (g_confidence * 20.0) + (g_count * 1.2)
            if member:
                provenance_map[pid] = "member_fallback_global"
                reason_map[pid] = f"Store-wide favorite with {primary_cart_name} (Welcome {member.name})"
                badge_map[pid] = "Trending Pair"
            else:
                provenance_map[pid] = "global_shopper_analysis"
                reason_map[pid] = f"Frequently bought together with {primary_cart_name} ({confidence_pct}% of shoppers)"
                badge_map[pid] = "Customer Favorite"

    # Sort candidates by descending score
    ranked_candidate_ids = sorted(
        candidate_scores.keys(),
        key=lambda pid: candidate_scores[pid],
        reverse=True
    )[:limit]

    products_by_id = {
        p.id: p for p in Product.objects.filter(id__in=ranked_candidate_ids)
    }

    recommendations = []
    for pid in ranked_candidate_ids:
        product = products_by_id.get(pid)
        if not product:
            continue
        recommendations.append({
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "category": product.category,
            "price": float(product.price),
            "imageUrl": product.image_url,
            "shelfLocation": product.shelf_location,
            "reason": reason_map.get(pid, f"Goes great with {primary_cart_name}"),
            "badge": badge_map.get(pid, "Recommended"),
            "provenance": provenance_map.get(pid, "global_shopper_analysis"),
            "score": round(min(candidate_scores[pid] * 4.0, 99.0)),
        })

    # Summary provenance mode
    mode = "guest"
    mode_label = "Store-wide Shopper Patterns (All Customers)"
    if member:
        if member_has_combos:
            mode = "member_personalized"
            mode_label = f"Personalized for {member.name} ({member.tier} Member) + Store Trends"
        elif member_order_count > 0:
            mode = "member_blended"
            mode_label = f"Blended with {member.name}'s History + Store Trends"
        else:
            mode = "member_fallback"
            mode_label = f"Store-wide Trends (Fallback: {member.name} has no prior orders)"

    return {
        "mode": mode,
        "modeLabel": mode_label,
        "recommendations": recommendations,
        "basedOnItems": cart_names,
        "memberId": member.member_id if member else None,
        "memberName": member.name if member else "Guest",
    }


def _recommend_empty_cart(
    member: Optional[CustomerMembership] = None,
    limit: int = 4
) -> Dict[str, Any]:
    """Fallback when the cart is empty: recommend member favorite or global top sellers."""
    if member:
        member_orders = PastOrder.objects.filter(member=member)
        if member_orders.exists():
            member_fav_ids = (
                PastOrderItem.objects.filter(order__member=member)
                .values("product_id")
                .annotate(count=models_Count("product_id"))
                .order_by("-count")
                .values_list("product_id", flat=True)[:limit]
            )
            fav_products = list(Product.objects.filter(id__in=member_fav_ids))
            if fav_products:
                return {
                    "mode": "member_personalized",
                    "modeLabel": f"Welcome back, {member.name}! Your Frequent Buys",
                    "recommendations": [
                        {
                            "id": p.id,
                            "sku": p.sku,
                            "name": p.name,
                            "category": p.category,
                            "price": float(p.price),
                            "imageUrl": p.image_url,
                            "shelfLocation": p.shelf_location,
                            "reason": f"Frequently repurchased by {member.name}",
                            "badge": "Your Habit",
                            "provenance": "member_favorite",
                            "score": 95,
                        }
                        for p in fav_products
                    ],
                    "basedOnItems": [],
                    "memberId": member.member_id,
                    "memberName": member.name,
                }

    # Global top sellers
    return _recommend_top_sellers(set(), member=member, limit=limit)


def _recommend_top_sellers(
    exclude_ids: set,
    member: Optional[CustomerMembership] = None,
    limit: int = 4
) -> Dict[str, Any]:
    """Returns store-wide best sellers."""
    top_selling_ids = (
        PastOrderItem.objects.exclude(product_id__in=exclude_ids)
        .values("product_id")
        .annotate(total_bought=models_Count("product_id"))
        .order_by("-total_bought")
        .values_list("product_id", flat=True)[:limit]
    )

    products = list(Product.objects.filter(id__in=top_selling_ids))
    if not products:
        # Default to first few products in DB
        products = list(Product.objects.exclude(id__in=exclude_ids)[:limit])

    label = "Store Top Sellers"
    if member:
        label = f"Store Best Sellers (Welcome {member.name})"

    return {
        "mode": "global_top_sellers",
        "modeLabel": label,
        "recommendations": [
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "price": float(p.price),
                "imageUrl": p.image_url,
                "shelfLocation": p.shelf_location,
                "reason": "Top trending item across all shoppers this week",
                "badge": "Bestseller",
                "provenance": "global_top_seller",
                "score": 88,
            }
            for p in products
        ],
        "basedOnItems": [],
        "memberId": member.member_id if member else None,
        "memberName": member.name if member else "Guest",
    }


def models_Count(field_name: str):
    from django.db.models import Count
    return Count(field_name)
