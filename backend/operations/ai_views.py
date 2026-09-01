import base64
import binascii
import json
import threading
from functools import lru_cache

import cv2
import numpy as np
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from ai.config import AI_ROOT, load_json, load_pipeline_config
from ai.models.registry import ModelNotAvailableError, ModelRegistry
from ai.detectors.product_detector import YoloProductDetector
from ai.pipeline import RetailVisionPipeline
from ai.sensors import normalize_sensor_event
from ai.sources.opencv_source import OpenCVVideoSource
from operations.models import Device, OperationalEvent, QueueCounter, Store, Zone
from operations.views import bad_request, parse_body

inference_lock = threading.Lock()


@lru_cache(maxsize=1)
def get_pipeline() -> RetailVisionPipeline:
    return RetailVisionPipeline.from_registry()


@lru_cache(maxsize=1)
def get_product_detector() -> YoloProductDetector:
    return YoloProductDetector(ModelRegistry())


def decode_image(data_url: str) -> np.ndarray:
    if not data_url:
        raise ValueError("imageBase64 is required")
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("imageBase64 is not valid base64") from error
    if len(image_bytes) > 12 * 1024 * 1024:
        raise ValueError("Image exceeds the 12 MB limit")
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Decoded content is not a supported image")
    return image


def persist_analysis(analysis, store: Store, device: Device | None, context_zone: str = "") -> None:
    observed_at = timezone.now()
    fallback_zone = Zone.objects.filter(store=store, name=context_zone).first() if context_zone else None
    for event in analysis.events:
        zone = Zone.objects.filter(store=store, name=event.get("zone")).first() or fallback_zone
        payload = {key: value for key, value in event.items() if key not in {"eventType", "value", "anonymousTrackId"}}
        OperationalEvent.objects.create(
            store=store,
            device=device,
            zone=zone,
            event_type=event["eventType"],
            value=event.get("value"),
            anonymous_track_id=event.get("anonymousTrackId", ""),
            payload=payload,
            occurred_at=observed_at,
        )
        if event["eventType"] == "queue_update":
            counter = QueueCounter.objects.filter(store=store, is_open=True).order_by("id").first()
            if counter:
                counter.queue_length = int(event.get("value", 0))
                counter.estimated_wait_minutes = round(float(event.get("estimatedWaitMinutes", 0)))
                counter.save(update_fields=["queue_length", "estimated_wait_minutes", "updated_at"])
    OperationalEvent.objects.create(
        store=store,
        device=device,
        zone=fallback_zone,
        event_type="frame_analyzed",
        value=analysis.latency_ms,
        payload={"peopleCount": len(analysis.people), "rawFrameStored": False},
        occurred_at=observed_at,
    )


def analysis_payload(analysis) -> dict:
    return {
        "crowdCount": len(analysis.people),
        "detectedPeople": [{
            "x": track.detection.x,
            "y": track.detection.y,
            "width": track.detection.width,
            "height": track.detection.height,
            "label": track.track_id,
            "confidence": track.detection.confidence,
        } for track in analysis.people],
        "shelfAnalysis": {
            "stockLevelPercent": analysis.shelf_stock_percent,
            "emptySlotsDetected": analysis.empty_slots,
            "facingCondition": analysis.shelf_condition,
        },
        "queueEstimation": {
            "queueLength": analysis.queue_length,
            "estimatedWaitMinutes": round(analysis.queue_length * 2, 1) if analysis.queue_length is not None else None,
        },
        "hazardsDetected": [],
        "operationalAdvice": analysis.advice,
        "latencyMs": analysis.latency_ms,
        "timestamp": timezone.now().isoformat(),
    }


@require_GET
def ai_health(request: HttpRequest) -> JsonResponse:
    readiness = ModelRegistry().readiness()
    return JsonResponse({"status": "ready" if readiness["person"]["available"] else "model_required", "models": readiness})


def validate_config(data: dict) -> None:
    for point in data.get("entryLine", []):
        if len(point) != 2 or any(float(value) < 0 or float(value) > 1 for value in point):
            raise ValueError("entryLine coordinates must be normalized between 0 and 1")
    for section in [*data.get("zones", []), *data.get("shelves", []), data.get("queue", {})]:
        for point in section.get("polygon", []):
            if len(point) != 2 or any(float(value) < 0 or float(value) > 1 for value in point):
                raise ValueError("polygon coordinates must be normalized between 0 and 1")


@csrf_exempt
@require_http_methods(["GET", "POST"])
def ai_config(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        return JsonResponse(load_json())
    try:
        data = parse_body(request)
        validate_config(data)
        config_path = AI_ROOT / "config.json"
        config_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        load_pipeline_config(config_path)
        get_pipeline.cache_clear()
        return JsonResponse({"saved": True, "config": data})
    except (KeyError, TypeError, ValueError) as error:
        return bad_request(str(error))


@csrf_exempt
@require_http_methods(["POST"])
def analyze_image(request: HttpRequest) -> JsonResponse:
    try:
        data = parse_body(request)
        image = decode_image(data.get("imageBase64", ""))
        store = Store.objects.get(id=data["storeId"]) if data.get("storeId") else Store.objects.first()
        if store is None:
            return bad_request("Create a store before running inference.")
        device = Device.objects.filter(id=data.get("deviceId"), store=store).first() if data.get("deviceId") else None
        with inference_lock:
            analysis = get_pipeline().analyze(image)
        persist_analysis(analysis, store, device, data.get("contextZone", ""))
        return JsonResponse(analysis_payload(analysis))
    except (KeyError, Store.DoesNotExist, ValueError) as error:
        return bad_request(str(error))
    except ModelNotAvailableError as error:
        return JsonResponse({"detail": str(error)}, status=503)


@csrf_exempt
@require_http_methods(["POST"])
def analyze_stock_image(request: HttpRequest) -> JsonResponse:
    started = timezone.now()
    try:
        data = parse_body(request)
        image = decode_image(data.get("imageBase64", ""))
        store = Store.objects.get(id=data["storeId"]) if data.get("storeId") else Store.objects.first()
        if store is None:
            return bad_request("Create a store before running stock inference.")
        with inference_lock:
            products = get_product_detector().detect(image)
        event = OperationalEvent.objects.create(
            store=store,
            device=Device.objects.filter(id=data.get("deviceId"), store=store).first() if data.get("deviceId") else None,
            event_type="product_observed",
            value=len(products),
            payload={"products": [product.label for product in products], "rawFrameStored": False},
            occurred_at=timezone.now(),
        )
        elapsed = round((timezone.now() - started).total_seconds() * 1000)
        return JsonResponse({
            "productCount": len(products),
            "detectedProducts": [{"x": product.x, "y": product.y, "width": product.width, "height": product.height, "label": product.label, "confidence": product.confidence} for product in products],
            "latencyMs": elapsed,
            "timestamp": event.occurred_at.isoformat(),
            "status": "observed",
        })
    except (KeyError, Store.DoesNotExist, ValueError) as error:
        return bad_request(str(error))
    except ModelNotAvailableError as error:
        return JsonResponse({"detail": str(error)}, status=503)


@require_GET
def heatmap(request: HttpRequest) -> JsonResponse:
    try:
        snapshot = get_pipeline().heatmap_snapshot()
    except ModelNotAvailableError as error:
        return JsonResponse({"detail": str(error)}, status=503)
    return JsonResponse({"grid": snapshot, "rows": len(snapshot), "columns": len(snapshot[0]) if snapshot else 0})


@csrf_exempt
@require_http_methods(["POST"])
def test_source(request: HttpRequest) -> JsonResponse:
    try:
        source = parse_body(request)["source"]
        with OpenCVVideoSource(source) as video:
            frame = video.read()
        return JsonResponse({"available": True, "width": frame.shape[1], "height": frame.shape[0]})
    except (KeyError, RuntimeError, ValueError) as error:
        return bad_request(str(error))


@csrf_exempt
@require_http_methods(["POST"])
def sensor_event(request: HttpRequest) -> JsonResponse:
    try:
        data = normalize_sensor_event(parse_body(request))
        device = Device.objects.select_related("store").get(id=data["deviceId"])
        event = OperationalEvent.objects.create(store=device.store, device=device, event_type=data["eventType"], value=data["value"], payload=data["payload"], occurred_at=data["occurredAt"])
        device.last_heartbeat = timezone.now()
        device.status = Device.Status.ONLINE
        device.save(update_fields=["last_heartbeat", "status"])
        return JsonResponse({"id": event.id, "accepted": True}, status=201)
    except (Device.DoesNotExist, KeyError, ValueError) as error:
        return bad_request(str(error))