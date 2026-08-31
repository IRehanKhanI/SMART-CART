from django.db.models import Avg, F
from django.utils import timezone

from .models import Alert, Device, InventoryItem, OperationalEvent, QueueCounter, Store, Zone


def time_ago(timestamp) -> str:
    seconds = max(int((timezone.now() - timestamp).total_seconds()), 0)
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    return f"{hours} hr ago"


def counter_status(counter: QueueCounter) -> str:
    if not counter.is_open:
        return "Offline"
    if counter.queue_length >= counter.capacity:
        return "Congested"
    if counter.queue_length >= max(1, counter.capacity * 0.65):
        return "Elevated"
    return "Normal"


def dashboard_payload(store_id: int | None = None) -> dict:
    stores = Store.objects.filter(id=store_id) if store_id else Store.objects.all()
    events = OperationalEvent.objects.filter(store__in=stores)
    today = timezone.localdate()
    today_events = events.filter(occurred_at__date=today)
    entries = today_events.filter(event_type="person_entered").count()
    exits = today_events.filter(event_type="person_exited").count()
    inventory = InventoryItem.objects.filter(store__in=stores)
    counters = QueueCounter.objects.filter(store__in=stores)
    open_counters = counters.filter(is_open=True)
    active_alerts = Alert.objects.filter(store__in=stores, is_acknowledged=False)
    queue_average = open_counters.aggregate(value=Avg("queue_length"))["value"] or 0
    average_wait = open_counters.aggregate(value=Avg("estimated_wait_minutes"))["value"] or 0
    stockout_count = inventory.filter(current_stock=0).count()
    status_by_zone = {"floor": "info", "checkout": "error", "entrance": "success"}

    queue_risk = "HIGH" if any(counter_status(counter) == "Congested" for counter in open_counters) else "MEDIUM" if any(counter_status(counter) == "Elevated" for counter in open_counters) else "LOW"
    recommendation = {
        "title": "Open an additional counter" if queue_risk == "HIGH" else "Continue monitoring queues",
        "description": "A checkout counter is at capacity. Open an available counter to reduce expected waiting time." if queue_risk == "HIGH" else "Current queue activity is within the configured operating range.",
        "actionTarget": "Available checkout counter",
        "actionLabel": "Execute Recommendation",
        "executed": False,
    }

    return {
        "metrics": {
            "activeShoppers": max(entries - exits, 0),
            "activeShoppersDiff": "Live today",
            "avgDwellTime": "0m 0s",
            "avgDwellDiff": "Awaiting zone events",
            "checkoutQueueAvg": f"{queue_average:.1f}",
            "checkoutQueueDiff": "Live average",
            "shelfStockoutRate": f"{(stockout_count / inventory.count() * 100) if inventory else 0:.1f}%",
            "shelfStockoutDiff": "Current inventory",
        },
        "alerts": [{
            "id": str(alert.id), "type": alert.severity, "title": alert.title,
            "description": alert.description, "timeAgo": time_ago(alert.created_at),
            "timestamp": alert.created_at.isoformat(), "zone": alert.zone.name if alert.zone else "Store",
            "isAcknowledged": alert.is_acknowledged,
        } for alert in Alert.objects.filter(store__in=stores)[:20]],
        "shoppers": {
            "totalEntries": entries, "totalExits": exits, "netOccupancy": max(entries - exits, 0),
            "entriesTrendPercent": 0, "avgDwellMinutes": 0, "avgDwellSeconds": 0,
            "checkoutQueueAvg": queue_average, "hourlyTrend": [], "weeklyTrend": [],
            "zonePopularity": [{"id": zone.id, "zone": zone.name, "activeCount": 0,
                                "avgDwellMinutes": 0, "statusColor": status_by_zone.get(zone.zone_type, "dim")}
                               for zone in Zone.objects.filter(store__in=stores)],
        },
        "inventory": {
            "shelfItems": [inventory_item_payload(item) for item in inventory],
            "criticalOOS": [{"sku": item.sku, "name": item.name, "location": item.shelf_location,
                              "oosDuration": "Out of stock"} for item in inventory.filter(current_stock=0)],
            "lowStockAlerts": [{"sku": item.sku, "name": item.name, "remainingUnits": item.current_stock,
                                "threshold": item.low_stock_threshold, "icon": "inventory_2"}
                               for item in inventory.filter(current_stock__gt=0, current_stock__lte=F("low_stock_threshold"))],
            "tasksStats": {"urgentTasks": active_alerts.filter(severity="critical").count(), "inProgressTasks": events.filter(event_type="replenishment_dispatched").count(), "completedToday": 0},
        },
        "queues": {
            "predictedRisk": queue_risk, "peakExpectedMinutes": 15 if queue_risk == "HIGH" else 0,
            "aiRecommendation": recommendation, "avgWaitTime": f"{average_wait:.0f}m 0s",
            "avgWaitDiff": "Live average", "avgServiceTime": "0m 0s", "avgServiceDiff": "Awaiting POS data",
            "counters": [queue_payload(counter) for counter in counters],
        },
        "devices": {
            "stats": {"totalDevices": Device.objects.filter(store__in=stores).count(), "onlineCount": Device.objects.filter(store__in=stores, status__in=["online", "local_mode"]).count(), "offlineCount": Device.objects.filter(store__in=stores, status="offline").count(), "avgProcessingDelayMs": 0},
            "fleet": [device_payload(device) for device in Device.objects.filter(store__in=stores)],
        },
    }


def inventory_item_payload(item: InventoryItem) -> dict:
    return {"sku": item.sku, "name": item.name, "category": item.category, "location": item.shelf_location,
            "currentStock": item.current_stock, "maxStock": item.max_stock,
            "threshold": item.low_stock_threshold, "status": item.status}


def queue_payload(counter: QueueCounter) -> dict:
    return {"id": counter.id, "name": counter.name, "type": "Checkout",
            "queueLength": counter.queue_length if counter.is_open else None, "capacity": counter.capacity,
            "estWaitMins": counter.estimated_wait_minutes if counter.is_open else None,
            "status": counter_status(counter)}


def device_payload(device: Device) -> dict:
    return {"id": str(device.id), "name": device.name, "location": device.metadata.get("location", "Store"),
            "type": device.device_type, "status": device.get_status_display(),
            "cpuPercent": device.metadata.get("cpuPercent"), "tempCelsius": device.metadata.get("tempCelsius"),
            "signalDbm": device.metadata.get("signalDbm", "Unknown"),
            "lastHeartbeat": time_ago(device.last_heartbeat) if device.last_heartbeat else "No heartbeat",
            "ipAddress": device.ip_address}