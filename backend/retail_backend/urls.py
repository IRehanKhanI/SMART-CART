from django.contrib import admin
from django.urls import include, path
from smart_cart import views as smart_cart_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/products/", smart_cart_views.products_api_view, name="root_products_api"),
    path("api/products/<str:barcode>/", smart_cart_views.product_single_api_view, name="root_product_single"),
    path("api/cart/", include("smart_cart.urls")),
    path("api/", include("operations.urls")),
]