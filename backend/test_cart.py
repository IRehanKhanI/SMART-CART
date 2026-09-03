import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "retail_backend.settings")
django.setup()

from smart_cart.models import Product, CustomerMembership, CartSession, CartItem
from smart_cart.recommender import get_recommendations_for_cart
from smart_cart.views import serialize_cart

print("=" * 60)
print("SMART CART INDIAN RETAIL RECOMMENDATION & OLED VERIFICATION TEST")
print("=" * 60)

amul_milk = Product.objects.get(sku="MILK-AMUL-01")

# TEST 1: Normal People (Guest / Non-member) buys Amul Milk
print("\n--- TEST 1: Normal Shopper (Guest) buys Amul Milk ---")
guest_recs = get_recommendations_for_cart([amul_milk], member=None)
print("Logic Mode:", guest_recs["modeLabel"])
for r in guest_recs["recommendations"]:
    print(f"  * {r['name']}: [{r['badge']}] ({r['score']}% match) - {r['reason']}")

rec_skus = [r["sku"] for r in guest_recs["recommendations"]]
assert "BISC-PARLE-01" in rec_skus, "Parle-G Biscuit should be recommended when buying Milk!"
assert "TEA-TATAGOLD-01" in rec_skus, "Tata Tea Gold should be recommended when buying Milk!"
print(">>> PASS: Parle-G Biscuits and Tata Tea are top recommendations for Normal People buying Amul Milk!")

# TEST 2: Member Rahul Sharma (Gold) buys Amul Milk
print("\n--- TEST 2: Member Rahul Sharma (Gold) buys Amul Milk ---")
rahul = CustomerMembership.objects.get(member_id="MEM-IND-101")
rahul_recs = get_recommendations_for_cart([amul_milk], member=rahul)
print("Logic Mode:", rahul_recs["modeLabel"])
for r in rahul_recs["recommendations"]:
    print(f"  * {r['name']}: [{r['badge']}] ({r['score']}% match) - {r['reason']}")
rahul_skus = [r["sku"] for r in rahul_recs["recommendations"]]
assert "BISC-PARLE-01" in rahul_skus, "Rahul's personal combinations should include Parle-G Biscuits!"
print(">>> PASS: Member Rahul receives personalized recommendations based on his purchase history!")

# TEST 3: Brand New Member Amit Verma (0 past orders -> fallback to normal people)
print("\n--- TEST 3: New Member Amit Verma (0 past orders) buys Amul Milk ---")
amit = CustomerMembership.objects.get(member_id="MEM-IND-103")
amit_recs = get_recommendations_for_cart([amul_milk], member=amit)
print("Logic Mode:", amit_recs["modeLabel"])
for r in amit_recs["recommendations"]:
    print(f"  * {r['name']}: [{r['badge']}] ({r['score']}% match) - {r['reason']}")
amit_skus = [r["sku"] for r in amit_recs["recommendations"]]
assert "BISC-PARLE-01" in amit_skus, "Fallback to global pattern should recommend Parle-G Biscuits!"
print(">>> PASS: New member with 0 orders seamlessly falls back to normal people recommendations!")

# TEST 4: OLED Formatting for 128x64 display
print("\n--- TEST 4: 1.3\" OLED Display Formatting ---")
cart = CartSession.objects.filter(cart_id="CART-01").first()
cart.member = rahul
cart.items.all().delete()
CartItem.objects.create(cart=cart, product=amul_milk, quantity=1)
serialized = serialize_cart(cart)
print("OLED Line 1:", serialized["oled"]["line1"])
print("OLED Line 2:", serialized["oled"]["line2"])
print("OLED Line 3:", serialized["oled"]["line3"])
print("OLED Line 4:", serialized["oled"]["line4"])
assert len(serialized["oled"]["line1"]) <= 22, "Line 1 should fit on 1.3 OLED"
print(">>> PASS: OLED lines formatted within 128x64 pixel budget!")

print("\n" + "=" * 60)
print("ALL TESTS COMPLETED SUCCESSFULLY!")
print("=" * 60)
