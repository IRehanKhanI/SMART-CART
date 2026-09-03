from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/cart/", include("smart_cart.urls")),
    path("api/", include("operations.urls")),
]