from decimal import Decimal
from django.db import models
from django.utils import timezone


class CustomerMembership(models.Model):
    class Tier(models.TextChoices):
        BRONZE = "Bronze", "Bronze (0% off)"
        SILVER = "Silver", "Silver (5% off)"
        GOLD = "Gold", "Gold (10% off)"
        PLATINUM = "Platinum", "Platinum (15% off)"

    member_id = models.CharField(max_length=64, unique=True, help_text="Unique Member ID, RFID tag, or phone")
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.SILVER)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("5.00"))
    loyalty_points = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.member_id}) - {self.tier}"

    def save(self, *args, **kwargs):
        # Auto-set discount percent based on tier if default
        tier_discounts = {
            self.Tier.BRONZE: Decimal("0.00"),
            self.Tier.SILVER: Decimal("5.00"),
            self.Tier.GOLD: Decimal("10.00"),
            self.Tier.PLATINUM: Decimal("15.00"),
        }
        if self.tier in tier_discounts and (self.discount_percent is None or self.discount_percent == Decimal("5.00")):
            self.discount_percent = tier_discounts[self.tier]
        super().save(*args, **kwargs)


class Product(models.Model):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=140)
    category = models.CharField(max_length=80, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    barcode = models.CharField(max_length=64, blank=True)
    image_url = models.CharField(max_length=255, blank=True)
    shelf_location = models.CharField(max_length=64, blank=True, default="Aisle 1")
    current_stock = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} (${self.price})"


class CartSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ABANDONED = "abandoned", "Abandoned"

    cart_id = models.CharField(max_length=64, default="CART-01")
    member = models.ForeignKey(
        CustomerMembership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cart_sessions"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        shopper = self.member.name if self.member else "Guest Shopper"
        return f"{self.cart_id} ({self.status}) - {shopper}"

    @property
    def is_guest(self) -> bool:
        return self.member is None


class CartItem(models.Model):
    cart = models.ForeignKey(CartSession, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("cart", "product")
        ordering = ["-added_at"]

    def __str__(self) -> str:
        return f"{self.quantity}x {self.product.name} in {self.cart.cart_id}"

    @property
    def line_total(self) -> Decimal:
        return self.product.price * self.quantity


class PastOrder(models.Model):
    order_id = models.CharField(max_length=64, unique=True)
    member = models.ForeignKey(
        CustomerMembership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        shopper = self.member.name if self.member else "Guest"
        return f"Order {self.order_id} - ${self.total_amount} ({shopper})"


class PastOrderItem(models.Model):
    order = models.ForeignKey(PastOrder, on_delete=models.CASCADE, related_name="order_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.quantity}x {self.product.name} @ ${self.unit_price}"
