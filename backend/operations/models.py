from django.db import models


class Store(models.Model):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=32, unique=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    is_operational = models.BooleanField(default=True)
    configuration = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class Zone(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="zones")
    name = models.CharField(max_length=100)
    zone_type = models.CharField(max_length=50, default="floor")
    capacity = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("store", "name")

    def __str__(self) -> str:
        return f"{self.store.code}: {self.name}"


class Device(models.Model):
    class Status(models.TextChoices):
        ONLINE = "online", "Online"
        SYNCING = "syncing", "Syncing"
        LOCAL_MODE = "local_mode", "Local Mode"
        OFFLINE = "offline", "Offline"

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="devices")
    name = models.CharField(max_length=100)
    device_type = models.CharField(max_length=80)
    status = models.CharField(max_length=20, choices=Status, default=Status.ONLINE)
    source_url = models.URLField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return self.name


class InventoryItem(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="inventory_items")
    sku = models.CharField(max_length=64)
    name = models.CharField(max_length=140)
    category = models.CharField(max_length=80, blank=True)
    shelf_location = models.CharField(max_length=40)
    current_stock = models.PositiveIntegerField(default=0)
    max_stock = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("store", "sku")

    @property
    def status(self) -> str:
        if self.current_stock == 0:
            return "Out of Stock"
        if self.current_stock <= self.low_stock_threshold:
            return "Low Stock"
        return "Optimal"


class QueueCounter(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="queue_counters")
    name = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField(default=8)
    queue_length = models.PositiveIntegerField(default=0)
    estimated_wait_minutes = models.PositiveIntegerField(default=0)
    is_open = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.store.code}: {self.name}"


class OperationalEvent(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="events")
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    event_type = models.CharField(max_length=64)
    value = models.FloatField(null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    anonymous_track_id = models.CharField(max_length=80, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]


class Alert(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Information"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="alerts")
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name="alerts")
    severity = models.CharField(max_length=10, choices=Severity)
    title = models.CharField(max_length=140)
    description = models.TextField()
    is_acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["is_acknowledged", "-created_at"]