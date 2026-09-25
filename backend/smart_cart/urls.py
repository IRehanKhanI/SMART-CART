from django.urls import path
from . import views

urlpatterns = [
    path("session/", views.cart_session_view, name="cart_session"),
    path("scan/", views.scan_product_view, name="cart_scan"),
    path("items/", views.cart_items_view, name="cart_items"),
    path("recommendations/", views.cart_recommendations_view, name="cart_recommendations"),
    path("checkout/", views.checkout_cart_view, name="cart_checkout"),
    path("oled-status/", views.oled_status_view, name="cart_oled_status"),
    path("members/", views.members_admin_view, name="cart_members_admin"),
    path("products/", views.products_api_view, name="cart_products_api"),
    path("products/<str:barcode>/", views.product_single_api_view, name="cart_product_single"),
    path("last-scan/", views.last_scan_debug_view, name="cart_last_scan_debug"),
    path("wireless-capture/", views.wireless_capture_view, name="cart_wireless_capture"),
    path("voice-chat/", views.voice_chat_view, name="cart_voice_chat"),
    path("voice-search/", views.voice_search_view, name="cart_voice_search"),
    path("payment-qr/", views.payment_qr_view, name="cart_payment_qr"),
    path("pairing-qr/", views.pairing_qr_view, name="cart_pairing_qr"),
    path("pair/", views.cart_pair_view, name="cart_pair"),
]

