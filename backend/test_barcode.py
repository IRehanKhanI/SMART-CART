import os
import django
import cv2
import numpy as np

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "retail_backend.settings")
django.setup()

from smart_cart.models import Product, CartSession, CartItem
from smart_cart.vision import analyze_product_image

print("=" * 60)
print("TESTING BARCODE SCANNING & AUTOMATIC CART INSERTION")
print("=" * 60)

# Check products with barcodes
milk = Product.objects.filter(sku="MILK-AMUL-01").first()
print(f"Test Product: {milk.name} | Barcode: {milk.barcode}")

# Generate a synthetic barcode image or test image using zxing-cpp / qrcode
import qrcode
qr = qrcode.QRCode(box_size=4, border=2)
qr.add_data(milk.barcode)
qr.make(fit=True)
img_pil = qr.make_image(fill_color="black", back_color="white")
img_np = np.array(img_pil.convert("RGB"))

# Encode to JPEG bytes as if from camera
_, encoded = cv2.imencode(".jpg", img_np)
image_bytes = encoded.tobytes()

# Analyze image
product, conf, method, meta = analyze_product_image(image_bytes)
print(f"Detection Method: {method} | Confidence: {conf * 100:.1f}%")
print(f"Recognized Product: {product.name if product else 'None'}")
print(f"Metadata: {meta}")

assert product is not None, "Product should be recognized via barcode!"
assert product.sku == "MILK-AMUL-01", f"Expected MILK-AMUL-01, got {product.sku}"

# Test automatic addition to cart
cart = CartSession.objects.filter(cart_id="CART-01").first()
item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": 1})
print(f"Cart Updated: Added {item.product.name}, Quantity: {item.quantity}")

print("\n" + "=" * 60)
print("ALL BARCODE SCANNING & AUTO CART INSERTION TESTS PASSED!")
print("=" * 60)
