import os
import sys
import django

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "retail_backend.settings")
django.setup()

from smart_cart.voice import generate_retail_reply, transcribe_and_reply

print("=" * 60)
print("TESTING VOICE-TO-TEXT RETAIL ASSISTANT & OLED CHAT")
print("=" * 60)

test_queries = [
    ("Where is the Amul Milk?", "Location query"),
    ("How much is Parle-G?", "Price query"),
    ("What is my cart total?", "Cart query"),
    ("Recommend me something with tea", "Recommendation query"),
    ("What is my member discount?", "Membership query"),
]

for query, desc in test_queries:
    full_reply, oled_line = generate_retail_reply(query, cart_id="CART-01")
    print(f"\n[{desc}] Customer Voice: \"{query}\"")
    print(f"  -> AI Assistant: {full_reply}")
    print(f"  -> 1.3\" OLED Display Line: [{oled_line}]")
    assert len(oled_line) <= 24, "OLED line must fit within 1.3 display!"

print("\n" + "=" * 60)
print("ALL VOICE RETAIL ASSISTANT TESTS PASSED SUCCESSFULLY!")
print("=" * 60)
