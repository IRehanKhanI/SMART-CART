from collections import Counter, defaultdict
from datetime import timedelta

from django.db.models import Avg, F
from django.utils import timezone

from ai.analytics.prediction import QueueRiskEstimator
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
    yesterday_entries = events.filter(event_type="person_entered", occurred_at__date=today - timedelta(days=1)).count()
    inventory = InventoryItem.objects.filter(store__in=stores)
    counters = QueueCounter.objects.filter(store__in=stores)
    open_counters = counters.filter(is_open=True)
    active_alerts = Alert.objects.filter(store__in=stores, is_acknowledged=False)
    queue_average = open_counters.aggregate(value=Avg("queue_length"))["value"] or 0
    average_wait = open_counters.aggregate(value=Avg("estimated_wait_minutes"))["value"] or 0
    stockout_count = inventory.filter(current_stock=0).count()
    status_by_zone = {"floor": "info", "checkout": "error", "entrance": "success"}
    dwell_events = list(today_events.filter(event_type="zone_exited"))
    dwell_seconds = [float(event.payload["dwellSeconds"]) for event in dwell_events if event.payload.get("dwellSeconds") is not None]
    average_dwell_seconds = sum(dwell_seconds) / len(dwell_seconds) if dwell_seconds else 0
    service_seconds = [float(event.payload["serviceSeconds"]) for event in today_events.filter(event_type="service_completed") if event.payload.get("serviceSeconds") is not None]
    average_service_seconds = sum(service_seconds) / len(service_seconds) if service_seconds else 0

    hourly_counts = Counter(timezone.localtime(event.occurred_at).strftime("%H:00") for event in today_events.filter(event_type="person_entered"))
    hourly_trend = [{"time": hour, "count": hourly_counts[hour]} for hour in sorted(hourly_counts)]
    weekly_trend = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        weekly_trend.append({"day": day.strftime("%a"), "count": events.filter(event_type="person_entered", occurred_at__date=day).count()})

    active_tracks: dict[int, set[str]] = defaultdict(set)
    zone_visits: Counter = Counter()
    zone_dwell: dict[int, list[float]] = defaultdict(list)
    for event in events.filter(event_type__in=["zone_entered", "zone_exited"]).order_by("occurred_at"):
        if not event.zone_id or not event.anonymous_track_id:
            continue
        if event.event_type == "zone_entered":
            active_tracks[event.zone_id].add(event.anonymous_track_id)
            zone_visits[event.zone_id] += 1
        else:
            active_tracks[event.zone_id].discard(event.anonymous_track_id)
            if event.payload.get("dwellSeconds") is not None:
                zone_dwell[event.zone_id].append(float(event.payload["dwellSeconds"]))

    inference_latency = today_events.filter(event_type="frame_analyzed").aggregate(value=Avg("value"))["value"] or 0
    entry_change = round((entries - yesterday_entries) / yesterday_entries * 100) if yesterday_entries else 0

    busiest_counter = max(open_counters, key=lambda counter: counter.queue_length, default=None)
    queue_samples = list(events.filter(event_type="queue_update", value__isnull=False).order_by("-occurred_at")[:2])
    growth_per_minute = 0.0
    if len(queue_samples) == 2:
        elapsed_minutes = (queue_samples[0].occurred_at - queue_samples[1].occurred_at).total_seconds() / 60
        if elapsed_minutes > 0:
            growth_per_minute = (float(queue_samples[0].value) - float(queue_samples[1].value)) / elapsed_minutes
    forecast = QueueRiskEstimator().predict(
        busiest_counter.queue_length if busiest_counter else 0,
        growth_per_minute,
        busiest_counter.capacity if busiest_counter else 1,
    )
    queue_risk = forecast.risk
    recommendation = {
        "title": "Open an additional counter" if queue_risk in ["HIGH", "CRITICAL"] else "No queue action required",
        "description": f"Queue is projected to reach {forecast.projected_length:g} people in {forecast.horizon_minutes} minutes. Open an available counter." if queue_risk in ["HIGH", "CRITICAL"] else f"Queue is projected to remain at {forecast.projected_length:g} people over the next {forecast.horizon_minutes} minutes.",
        "actionTarget": "Available checkout counter",
        "actionLabel": "Execute Recommendation",
        "executed": False,
    }

    return {
        "metrics": {
            "activeShoppers": max(entries - exits, 0),
            "activeShoppersDiff": f"{entry_change:+d}% entries vs yesterday" if yesterday_entries else "No previous-day baseline",
            "avgDwellTime": format_duration(average_dwell_seconds),
            "avgDwellDiff": "Observed zone dwell" if dwell_seconds else "No completed dwell events",
            "checkoutQueueAvg": f"{queue_average:.1f}",
            "checkoutQueueDiff": f"{open_counters.count()} counters open",
            "shelfStockoutRate": f"{(stockout_count / inventory.count() * 100) if inventory else 0:.1f}%",
            "shelfStockoutDiff": f"{stockout_count} of {inventory.count()} items",
        },
        "alerts": [{
            "id": str(alert.id), "type": alert.severity, "title": alert.title,
            "description": alert.description, "timeAgo": time_ago(alert.created_at),
            "timestamp": alert.created_at.isoformat(), "zone": alert.zone.name if alert.zone else "Store",
            "isAcknowledged": alert.is_acknowledged,
        } for alert in Alert.objects.filter(store__in=stores)[:20]],
        "shoppers": {
            "totalEntries": entries, "totalExits": exits, "netOccupancy": max(entries - exits, 0),
            "entriesTrendPercent": entry_change, "avgDwellMinutes": int(average_dwell_seconds // 60),
            "avgDwellSeconds": round(average_dwell_seconds % 60), "checkoutQueueAvg": queue_average,
            "hourlyTrend": hourly_trend, "weeklyTrend": weekly_trend,
            "zonePopularity": [{"id": zone.id, "zone": zone.name, "activeCount": len(active_tracks[zone.id]),
                                "avgDwellMinutes": round(sum(zone_dwell[zone.id]) / len(zone_dwell[zone.id]) / 60, 1) if zone_dwell[zone.id] else 0,
                                "visits": zone_visits[zone.id], "statusColor": status_by_zone.get(zone.zone_type, "dim")}
                               for zone in Zone.objects.filter(store__in=stores)],
        },
        "inventory": {
            "shelfItems": [inventory_item_payload(item) for item in inventory],
            "criticalOOS": [{"sku": item.sku, "name": item.name, "location": item.shelf_location,
                              "oosDuration": "Out of stock"} for item in inventory.filter(current_stock=0)],
            "lowStockAlerts": [{"sku": item.sku, "name": item.name, "remainingUnits": item.current_stock,
                                "threshold": item.low_stock_threshold, "icon": "inventory_2"}
                               for item in inventory.filter(current_stock__gt=0, current_stock__lte=F("low_stock_threshold"))],
            "tasksStats": {"urgentTasks": active_alerts.filter(severity="critical").count(), "inProgressTasks": events.filter(event_type__in=["replenishment_dispatched", "manual_task"]).count(), "completedToday": today_events.filter(event_type="task_completed").count()},
        },
        "queues": {
            "predictedRisk": queue_risk, "peakExpectedMinutes": forecast.horizon_minutes if growth_per_minute > 0 else 0,
            "aiRecommendation": recommendation, "avgWaitTime": f"{average_wait:.0f}m 0s",
            "avgWaitDiff": "Observed queue estimate", "avgServiceTime": format_duration(average_service_seconds),
            "avgServiceDiff": "Observed POS/service events" if service_seconds else "No service events",
            "counters": [queue_payload(counter) for counter in counters],
        },
        "devices": {
            "stats": {"totalDevices": Device.objects.filter(store__in=stores).count(), "onlineCount": Device.objects.filter(store__in=stores, status__in=["online", "local_mode"]).count(), "offlineCount": Device.objects.filter(store__in=stores, status="offline").count(), "avgProcessingDelayMs": round(inference_latency)},
            "fleet": [device_payload(device) for device in Device.objects.filter(store__in=stores)],
        },
        "reports": [report_payload(event) for event in events.filter(event_type="report_generated")[:20]],
        "settings": settings_payload(stores.first()),
        "zoneBreakdown": [{"name": zone.name, "visits": str(zone_visits[zone.id]),
                           "avgDwell": f"{(sum(zone_dwell[zone.id]) / len(zone_dwell[zone.id]) / 60):.1f}m" if zone_dwell[zone.id] else "No dwell data",
                           "status": "warning" if len(active_tracks[zone.id]) > zone.capacity > 0 else "optimal"}
                          for zone in Zone.objects.filter(store__in=stores)],
    }


def format_duration(seconds: float) -> str:
    return f"{int(seconds // 60)}m {round(seconds % 60)}s"


def report_payload(event: OperationalEvent) -> dict:
    return {"id": str(event.id), "filename": event.payload.get("filename", "report.csv"),
            "dateStr": time_ago(event.occurred_at), "statusColor": "success",
            "fileSize": event.payload.get("fileSize", "0 B"), "type": event.payload.get("type", "CSV")}


def settings_payload(store: Store | None) -> dict:
    if store is None:
        return {"profile": {"storeName": "", "storeId": "", "managerName": "", "address": "", "city": "", "zipCode": "", "operatingHours": []}, "zones": [], "notifications": {"queueThreshold": 0, "inventoryThreshold": "", "dwellAnomaliesEnabled": False}}
    config = store.configuration
    devices = list(store.devices.all())
    return {
        "profile": {"storeName": store.name, "storeId": store.code, "managerName": config.get("managerName", ""),
                    "address": store.address, "city": store.city, "zipCode": config.get("zipCode", ""),
                    "operatingHours": config.get("operatingHours", [])},
        "zones": [{"id": str(zone.id), "name": zone.name, "type": zone.zone_type,
                   "sensorCount": sum(device.metadata.get("location") == zone.name for device in devices),
                   "statusColor": "status-info"} for zone in store.zones.all()],
        "notifications": config.get("notifications", {"queueThreshold": 0, "inventoryThreshold": "", "dwellAnomaliesEnabled": False}),
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