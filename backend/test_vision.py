import os
import django
import numpy as np
import cv2

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "retail_backend.settings")
django.setup()

from smart_cart.vision import analyze_product_image

print("=" * 60)
print("TESTING LOCAL VISION MODEL ON INDIAN RETAIL PRODUCTS")
print("=" * 60)

# 1. Parle-G Biscuit (Golden-Yellow, Warm Biscuit Brown & White)
bisc_img = np.zeros((480, 640, 3), dtype=np.uint8)
bisc_img[:, :] = [240, 240, 240] # White shelf background
# Yellow packaging
bisc_img[80:400, 150:490] = [30, 200, 230] # BGR for golden yellow
# Brown baked biscuit texture
bisc_img[140:340, 200:440] = [30, 95, 175] # BGR for warm baked brown
_, bisc_buf = cv2.imencode(".jpg", bisc_img)

prod1, conf1, method1, meta1 = analyze_product_image(bisc_buf.tobytes())
print(f"\n[Test 1 - Biscuit Analysis]")
print(f"  -> Detected: {prod1.name} (SKU: {prod1.sku})")
print(f"  -> Confidence: {conf1 * 100:.1f}%")
print(f"  -> Method: {method1}")
assert "BISC" in prod1.sku, f"Expected Biscuit, got {prod1.sku}"
print("  >>> PASS: Correctly identified Biscuit!")

# 2. Amul Milk (Taaza - Cyan/Blue & White Pouch)
milk_img = np.zeros((480, 640, 3), dtype=np.uint8)
milk_img[:, :] = [235, 235, 235]
milk_img[80:400, 180:460] = [235, 125, 20] # BGR Cyan/Blue pouch
_, milk_buf = cv2.imencode(".jpg", milk_img)

prod2, conf2, method2, meta2 = analyze_product_image(milk_buf.tobytes())
print(f"\n[Test 2 - Milk Analysis]")
print(f"  -> Detected: {prod2.name} (SKU: {prod2.sku})")
print(f"  -> Confidence: {conf2 * 100:.1f}%")
print(f"  -> Method: {method2}")
assert "MILK" in prod2.sku, f"Expected Milk, got {prod2.sku}"
print("  >>> PASS: Correctly identified Amul Milk!")

# 3. Maggi 2-Minute Noodles (Bright Yellow with Red Logo)
maggi_img = np.zeros((480, 640, 3), dtype=np.uint8)
maggi_img[:, :] = [230, 230, 230]
maggi_img[80:400, 160:480] = [10, 220, 240] # Bright Yellow packet
maggi_img[180:300, 220:420] = [25, 25, 225]  # Red Maggi Banner
_, maggi_buf = cv2.imencode(".jpg", maggi_img)

prod3, conf3, method3, meta3 = analyze_product_image(maggi_buf.tobytes())
print(f"\n[Test 3 - Maggi Noodles Analysis]")
print(f"  -> Detected: {prod3.name} (SKU: {prod3.sku})")
print(f"  -> Confidence: {conf3 * 100:.1f}%")
print(f"  -> Method: {method3}")
assert "MAGGI" in prod3.sku, f"Expected Maggi, got {prod3.sku}"
print("  >>> PASS: Correctly identified Maggi Noodles!")

# 4. Tata Tea Gold (Rich Green Packaging)
tea_img = np.zeros((480, 640, 3), dtype=np.uint8)
tea_img[:, :] = [225, 225, 225]
tea_img[80:400, 170:470] = [30, 140, 20] # Rich Green pack
_, tea_buf = cv2.imencode(".jpg", tea_img)

prod4, conf4, method4, meta4 = analyze_product_image(tea_buf.tobytes())
print(f"\n[Test 4 - Tata Tea Gold Analysis]")
print(f"  -> Detected: {prod4.name} (SKU: {prod4.sku})")
print(f"  -> Confidence: {conf4 * 100:.1f}%")
print(f"  -> Method: {method4}")
assert "TEA" in prod4.sku, f"Expected Tea, got {prod4.sku}"
print("  >>> PASS: Correctly identified Tata Tea Gold!")

print("\n" + "=" * 60)
print("ALL INDIAN RETAIL VISION CLASSIFICATION TESTS PASSED!")
print("=" * 60)
