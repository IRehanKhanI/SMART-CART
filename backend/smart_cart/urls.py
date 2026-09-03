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
    path("products/", views.products_list_view, name="cart_products_list"),
    path("last-scan/", views.last_scan_debug_view, name="cart_last_scan_debug"),
    path("wireless-capture/", views.wireless_capture_view, name="cart_wireless_capture"),
    path("voice-chat/", views.voice_chat_view, name="cart_voice_chat"),
    path("payment-qr/", views.payment_qr_view, name="cart_payment_qr"),
]
