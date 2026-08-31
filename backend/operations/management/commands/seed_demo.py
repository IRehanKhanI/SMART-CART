from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from operations.models import Alert, Device, InventoryItem, OperationalEvent, QueueCounter, Store, Zone


class Command(BaseCommand):
    help = "Creates a local demo store with anonymous retail operations data."

    def handle(self, *args, **options) -> None:
        store, _ = Store.objects.update_or_create(
            code="STORE-01",
            defaults={"name": "Downtown Flagship", "address": "1200 Retail Avenue", "city": "Local Store"},
        )
        zones = {}
        for name, zone_type, capacity in [("Entrance", "entrance", 100), ("Fresh Produce", "floor", 60), ("Checkout West", "checkout", 32)]:
            zones[name], _ = Zone.objects.update_or_create(store=store, name=name, defaults={"zone_type": zone_type, "capacity": capacity})

        device_data = [
            ("Entrance Camera", "AI Camera (1080p)", "online", "Entrance"),
            ("Checkout Tracker", "AI Camera (1080p)", "online", "Checkout West"),
            ("Shelf Weight Sensor", "IoT Sensor (ESP32)", "local_mode", "Fresh Produce"),
            ("Edge Compute Node", "Edge Compute Node", "online", "Backroom"),
        ]
        for name, device_type, status, location in device_data:
            Device.objects.update_or_create(store=store, name=name, defaults={"device_type": device_type, "status": status, "last_heartbeat": timezone.now(), "metadata": {"location": location, "signalDbm": "LAN"}})

        items = [
            ("849201", "Organic Almond Milk, 1L", "Dairy", "Aisle 4, Shelf 2", 0, 50, 10),
            ("637281", "Avocados, Large Hass", "Produce", "Produce, Bin 3", 2, 40, 8),
            ("482019", "Sparkling Water, Lemon 12pk", "Beverages", "Aisle 2, Shelf 1", 3, 20, 6),
            ("772819", "Whole Grain Rolled Oats, 1kg", "Pantry", "Aisle 3, Shelf 4", 42, 45, 8),
        ]
        for sku, name, category, location, current_stock, max_stock, threshold in items:
            InventoryItem.objects.update_or_create(store=store, sku=sku, defaults={"name": name, "category": category, "shelf_location": location, "current_stock": current_stock, "max_stock": max_stock, "low_stock_threshold": threshold})

        for name, capacity, queue_length, wait, is_open in [("Counter 1", 8, 2, 4, True), ("Counter 2", 8, 8, 15, True), ("Counter 3", 8, 5, 10, True), ("Counter 4", 8, 0, 0, False)]:
            QueueCounter.objects.update_or_create(store=store, name=name, defaults={"capacity": capacity, "queue_length": queue_length, "estimated_wait_minutes": wait, "is_open": is_open})

        if not OperationalEvent.objects.filter(store=store).exists():
            now = timezone.now()
            OperationalEvent.objects.bulk_create([OperationalEvent(store=store, zone=zones["Entrance"], event_type="person_entered", anonymous_track_id=f"track_{index}", occurred_at=now - timedelta(minutes=index)) for index in range(18)] + [OperationalEvent(store=store, zone=zones["Entrance"], event_type="person_exited", anonymous_track_id=f"track_exit_{index}", occurred_at=now - timedelta(minutes=index + 2)) for index in range(7)])

        Alert.objects.get_or_create(store=store, title="Checkout queue requires attention", defaults={"zone": zones["Checkout West"], "severity": "critical", "description": "Counter 2 is at capacity. Open Counter 4 to reduce waiting time."})
        Alert.objects.get_or_create(store=store, title="Low stock in Fresh Produce", defaults={"zone": zones["Fresh Produce"], "severity": "warning", "description": "Avocados are below the configured replenishment threshold."})
        self.stdout.write(self.style.SUCCESS("Demo store data is ready."))