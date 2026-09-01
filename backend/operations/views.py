import csv
import json
from datetime import date
from pathlib import Path

from django.conf import settings
from django.db.models import Avg
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Alert, Device, InventoryItem, OperationalEvent, QueueCounter, Store, Zone
from .dashboard import dashboard_payload, device_payload, inventory_item_payload, queue_payload, settings_payload


def parse_body(request: HttpRequest) -> dict:
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError as error:
        raise ValueError("Request body must be valid JSON.") from error


def bad_request(message: str) -> JsonResponse:
    return JsonResponse({"detail": message}, status=400)


def store_data(store: Store) -> dict:
    return {"id": store.id, "name": store.name, "code": store.code, "address": store.address,
            "city": store.city, "isOperational": store.is_operational}


def zone_data(zone: Zone) -> dict:
    return {"id": zone.id, "storeId": zone.store_id, "name": zone.name, "type": zone.zone_type,
            "capacity": zone.capacity}


def device_data(device: Device) -> dict:
    return {"id": device.id, "storeId": device.store_id, "name": device.name, "type": device.device_type,
            "status": device.get_status_display(), "sourceUrl": device.source_url, "ipAddress": device.ip_address,
            "lastHeartbeat": device.last_heartbeat.isoformat() if device.last_heartbeat else None,
            "metadata": device.metadata}


@require_GET
def device_health(request: HttpRequest, device_id: int) -> JsonResponse:
    device = get_object_or_404(Device, id=device_id)
    heartbeat_age_ms = None
    if device.last_heartbeat:
        heartbeat_age_ms = max(round((timezone.now() - device.last_heartbeat).total_seconds() * 1000), 0)
    return JsonResponse({"id": str(device.id), "status": device.get_status_display(), "heartbeatAgeMs": heartbeat_age_ms})


def inventory_data(item: InventoryItem) -> dict:
    return {"id": item.id, "storeId": item.store_id, "sku": item.sku, "name": item.name,
            "category": item.category, "location": item.shelf_location, "currentStock": item.current_stock,
            "maxStock": item.max_stock, "threshold": item.low_stock_threshold, "status": item.status,
            "updatedAt": item.updated_at.isoformat()}


def alert_data(alert: Alert) -> dict:
    return {"id": alert.id, "storeId": alert.store_id, "zoneId": alert.zone_id, "severity": alert.severity,
            "title": alert.title, "description": alert.description, "isAcknowledged": alert.is_acknowledged,
            "createdAt": alert.created_at.isoformat(),
            "acknowledgedAt": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None}


@require_GET
def store_metrics(request: HttpRequest) -> JsonResponse:
    store_id = request.GET.get("store_id")
    return JsonResponse(dashboard_payload(int(store_id) if store_id else None))


@csrf_exempt
@require_http_methods(["POST"])
def store_acknowledge_alert(request: HttpRequest) -> JsonResponse:
    try:
        alert = Alert.objects.get(id=parse_body(request)["alertId"])
    except (Alert.DoesNotExist, KeyError, ValueError) as error:
        return bad_request(str(error))
    alert.is_acknowledged = True
    alert.acknowledged_at = timezone.now()
    alert.save(update_fields=["is_acknowledged", "acknowledged_at"])
    return JsonResponse({"success": True, "alert": alert_data(alert)})


@csrf_exempt
@require_http_methods(["POST"])
def dispatch_inventory(request: HttpRequest) -> JsonResponse:
    try:
        item = InventoryItem.objects.get(sku=parse_body(request)["sku"])
    except (InventoryItem.DoesNotExist, KeyError, ValueError) as error:
        return bad_request(str(error))
    OperationalEvent.objects.create(store=item.store, event_type="replenishment_dispatched", payload={"sku": item.sku}, occurred_at=timezone.now())
    return JsonResponse({"success": True, "item": inventory_item_payload(item)})


@csrf_exempt
@require_http_methods(["POST"])
def toggle_counter(request: HttpRequest) -> JsonResponse:
    try:
        counter = QueueCounter.objects.get(id=parse_body(request)["counterId"])
    except (QueueCounter.DoesNotExist, KeyError, ValueError) as error:
        return bad_request(str(error))
    counter.is_open = not counter.is_open
    if counter.is_open:
        counter.queue_length = 1
        counter.estimated_wait_minutes = 2
    counter.save()
    return JsonResponse({"success": True, "counter": queue_payload(counter)})


@csrf_exempt
@require_http_methods(["POST"])
def execute_queue_recommendation(request: HttpRequest) -> JsonResponse:
    counter = QueueCounter.objects.filter(is_open=False).first()
    if counter is None:
        return JsonResponse({"success": False, "detail": "No closed counters are available."}, status=409)
    counter.is_open = True
    counter.queue_length = 1
    counter.estimated_wait_minutes = 2
    counter.save()
    return JsonResponse({"success": True, "counter": queue_payload(counter)})


@csrf_exempt
@require_http_methods(["POST"])
def create_manual_task(request: HttpRequest) -> JsonResponse:
    try:
        data = parse_body(request)
        store = Store.objects.first() if not data.get("storeId") else Store.objects.get(id=data["storeId"])
        if store is None:
            return bad_request("Create a store before creating a task.")
    except (Store.DoesNotExist, ValueError) as error:
        return bad_request(str(error))
    task = OperationalEvent.objects.create(store=store, event_type="manual_task", payload={"title": data.get("title", "Manual task"), "location": data.get("location", "Store"), "priority": data.get("priority", "Standard"), "sku": data.get("sku", "")}, occurred_at=timezone.now())
    return JsonResponse({"success": True, "task": {"id": task.id, **task.payload}})


@csrf_exempt
@require_http_methods(["POST"])
def register_dashboard_device(request: HttpRequest) -> JsonResponse:
    try:
        data = parse_body(request)
        store = Store.objects.first() if not data.get("storeId") else Store.objects.get(id=data["storeId"])
        if store is None:
            return bad_request("Create a store before registering a device.")
        device = Device.objects.create(store=store, name=data["name"], device_type=data["type"], status="online", last_heartbeat=timezone.now(), metadata={"location": data.get("location", "Store")})
    except (Store.DoesNotExist, KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse({"success": True, "device": device_payload(device)}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def add_dashboard_zone(request: HttpRequest) -> JsonResponse:
    try:
        data = parse_body(request)
        store = Store.objects.first() if not data.get("storeId") else Store.objects.get(id=data["storeId"])
        if store is None:
            return bad_request("Create a store before adding a zone.")
        zone = Zone.objects.create(store=store, name=data["name"], zone_type=data.get("type", "floor"), capacity=data.get("capacity", 0))
    except (Store.DoesNotExist, KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse({"success": True, "zone": zone_data(zone)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def store_settings(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        return JsonResponse(settings_payload(Store.objects.first()))
    try:
        data = parse_body(request)
        profile = data["profile"]
        store = Store.objects.first()
        if store is None:
            store = Store(code=profile.get("storeId", "STORE-01"))
        store.name = profile["storeName"]
        store.address = profile.get("address", "")
        store.city = profile.get("city", "")
        store.configuration = {
            "managerName": profile.get("managerName", ""),
            "zipCode": profile.get("zipCode", ""),
            "operatingHours": profile.get("operatingHours", []),
            "notifications": data.get("notifications", {}),
        }
        store.save()
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse({"success": True, "store": store_data(store)})


@csrf_exempt
@require_http_methods(["POST"])
def generate_report(request: HttpRequest) -> JsonResponse:
    try:
        data = parse_body(request)
        store = Store.objects.get(id=data["storeId"]) if data.get("storeId") else Store.objects.first()
        if store is None:
            return bad_request("Create a store before generating a report.")
        start = date.fromisoformat(data["dateStart"])
        end = date.fromisoformat(data["dateEnd"])
        if end < start:
            return bad_request("dateEnd must be on or after dateStart.")
    except (KeyError, Store.DoesNotExist, ValueError) as error:
        return bad_request(str(error))

    report_type = str(data.get("reportType", "Store Performance"))
    reports_dir = Path(settings.BASE_DIR) / "generated_reports"
    reports_dir.mkdir(exist_ok=True)
    filename = f"{slugify(report_type) or 'store-report'}_{start}_{end}.csv"
    report_path = reports_dir / filename
    event_query = OperationalEvent.objects.filter(store=store, occurred_at__date__range=(start, end)).select_related("zone")
    zone_name = data.get("zone")
    if zone_name and zone_name != "All Store Zones":
        event_query = event_query.filter(zone__name=zone_name)
    with report_path.open("w", newline="", encoding="utf-8") as report_file:
        writer = csv.writer(report_file)
        writer.writerow(["timestamp", "event_type", "zone", "value", "confidence"])
        for event in event_query.order_by("occurred_at"):
            writer.writerow([event.occurred_at.isoformat(), event.event_type, event.zone.name if event.zone else "", event.value if event.value is not None else "", event.confidence if event.confidence is not None else ""])
    size = report_path.stat().st_size
    report_event = OperationalEvent.objects.create(store=store, event_type="report_generated", payload={"filename": filename, "fileSize": f"{size} B", "type": "CSV", "path": str(report_path.relative_to(settings.BASE_DIR))}, occurred_at=timezone.now())
    return JsonResponse({"success": True, "report": {"id": str(report_event.id), "filename": filename, "dateStr": "Just now", "statusColor": "success", "fileSize": f"{size} B", "type": "CSV"}}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def operational_advice(request: HttpRequest) -> JsonResponse:
    try:
        query = str(parse_body(request).get("query", "")).strip().lower()
    except ValueError as error:
        return bad_request(str(error))
    snapshot = dashboard_payload()
    if "queue" in query or "checkout" in query:
        queues = snapshot["queues"]
        advice = f"Queue risk is {queues['predictedRisk']}. {queues['aiRecommendation']['description']}"
    elif "stock" in query or "inventory" in query or "shelf" in query:
        affected = [item for item in snapshot["inventory"]["shelfItems"] if item["status"] != "Optimal"]
        advice = "No low-stock or out-of-stock items are currently recorded." if not affected else "Inventory attention required: " + ", ".join(f"{item['name']} ({item['status']})" for item in affected[:5]) + "."
    elif "footfall" in query or "shopper" in query or "dwell" in query:
        shoppers = snapshot["shoppers"]
        advice = f"Today has {shoppers['totalEntries']} observed entries and {shoppers['totalExits']} exits. Average completed dwell is {shoppers['avgDwellMinutes']}m {shoppers['avgDwellSeconds']}s."
    else:
        advice = f"Current occupancy is {snapshot['metrics']['activeShoppers']}; {snapshot['alerts'].__len__()} alerts are recorded; queue risk is {snapshot['queues']['predictedRisk']}."
    return JsonResponse({"advice": advice, "source": "local_store_telemetry"})


@require_GET
def health(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok", "service": "retail-backend", "time": timezone.now().isoformat()})


@require_GET
def overview(request: HttpRequest) -> JsonResponse:
    store_id = request.GET.get("store_id")
    stores = Store.objects.filter(id=store_id) if store_id else Store.objects.all()
    events = OperationalEvent.objects.filter(store__in=stores)
    today = timezone.localdate()
    entries = events.filter(event_type="person_entered", occurred_at__date=today).count()
    exits = events.filter(event_type="person_exited", occurred_at__date=today).count()
    active_alerts = Alert.objects.filter(store__in=stores, is_acknowledged=False)
    queues = QueueCounter.objects.filter(store__in=stores, is_open=True)
    return JsonResponse({
        "currentOccupancy": max(entries - exits, 0),
        "dailyFootfall": entries,
        "activeAlertsCount": active_alerts.count(),
        "criticalAlertsCount": active_alerts.filter(severity="critical").count(),
        "averageQueueLength": queues.aggregate(value=Avg("queue_length"))["value"] or 0,
        "openCounters": queues.count(),
        "devicesOnline": Device.objects.filter(store__in=stores, status__in=["online", "local_mode"]).count(),
        "lastUpdated": timezone.now().isoformat(),
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def stores(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        return JsonResponse({"results": [store_data(store) for store in Store.objects.all()]})
    try:
        data = parse_body(request)
        store = Store.objects.create(name=data["name"], code=data["code"], address=data.get("address", ""), city=data.get("city", ""))
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse(store_data(store), status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def zones(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        queryset = Zone.objects.filter(store_id=request.GET["store_id"]) if request.GET.get("store_id") else Zone.objects.all()
        return JsonResponse({"results": [zone_data(zone) for zone in queryset]})
    try:
        data = parse_body(request)
        zone = Zone.objects.create(store_id=data["storeId"], name=data["name"], zone_type=data.get("type", "floor"), capacity=data.get("capacity", 0))
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse(zone_data(zone), status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def devices(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        queryset = Device.objects.filter(store_id=request.GET["store_id"]) if request.GET.get("store_id") else Device.objects.all()
        return JsonResponse({"results": [device_data(device) for device in queryset]})
    try:
        data = parse_body(request)
        device = Device.objects.create(store_id=data["storeId"], name=data["name"], device_type=data["type"], status=data.get("status", "online"), source_url=data.get("sourceUrl", ""), ip_address=data.get("ipAddress") or None, metadata=data.get("metadata", {}), last_heartbeat=timezone.now())
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse(device_data(device), status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def inventory(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        queryset = InventoryItem.objects.filter(store_id=request.GET["store_id"]) if request.GET.get("store_id") else InventoryItem.objects.all()
        return JsonResponse({"results": [inventory_data(item) for item in queryset]})
    try:
        data = parse_body(request)
        item = InventoryItem.objects.create(store_id=data["storeId"], sku=data["sku"], name=data["name"], category=data.get("category", ""), shelf_location=data["location"], current_stock=data.get("currentStock", 0), max_stock=data.get("maxStock", 0), low_stock_threshold=data.get("threshold", 0))
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse(inventory_data(item), status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def queues(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        queryset = QueueCounter.objects.filter(store_id=request.GET["store_id"]) if request.GET.get("store_id") else QueueCounter.objects.all()
        results = [{"id": counter.id, "storeId": counter.store_id, "name": counter.name, "capacity": counter.capacity, "queueLength": counter.queue_length, "estimatedWaitMinutes": counter.estimated_wait_minutes, "isOpen": counter.is_open, "status": "Offline" if not counter.is_open else ("Congested" if counter.queue_length >= counter.capacity else "Normal")} for counter in queryset]
        return JsonResponse({"results": results})
    try:
        data = parse_body(request)
        counter = QueueCounter.objects.create(store_id=data["storeId"], name=data["name"], capacity=data.get("capacity", 8), queue_length=data.get("queueLength", 0), estimated_wait_minutes=data.get("estimatedWaitMinutes", 0), is_open=data.get("isOpen", True))
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse({"id": counter.id}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def events(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        queryset = OperationalEvent.objects.all()[:100]
        return JsonResponse({"results": [{"id": event.id, "storeId": event.store_id, "deviceId": event.device_id, "zoneId": event.zone_id, "eventType": event.event_type, "value": event.value, "confidence": event.confidence, "occurredAt": event.occurred_at.isoformat(), "payload": event.payload} for event in queryset]})
    try:
        data = parse_body(request)
        event = OperationalEvent.objects.create(store_id=data["storeId"], device_id=data.get("deviceId"), zone_id=data.get("zoneId"), event_type=data["eventType"], value=data.get("value"), confidence=data.get("confidence"), anonymous_track_id=data.get("anonymousTrackId", ""), payload=data.get("payload", {}), occurred_at=data.get("occurredAt", timezone.now().isoformat()))
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse({"id": event.id}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def alerts(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        queryset = Alert.objects.filter(store_id=request.GET["store_id"]) if request.GET.get("store_id") else Alert.objects.all()
        return JsonResponse({"results": [alert_data(alert) for alert in queryset]})
    try:
        data = parse_body(request)
        alert = Alert.objects.create(store_id=data["storeId"], zone_id=data.get("zoneId"), severity=data["severity"], title=data["title"], description=data["description"])
    except (KeyError, ValueError) as error:
        return bad_request(str(error))
    return JsonResponse(alert_data(alert), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def acknowledge_alert(request: HttpRequest, alert_id: int) -> JsonResponse:
    alert = get_object_or_404(Alert, id=alert_id)
    alert.is_acknowledged = True
    alert.acknowledged_at = timezone.now()
    alert.save(update_fields=["is_acknowledged", "acknowledged_at"])
    return JsonResponse(alert_data(alert))