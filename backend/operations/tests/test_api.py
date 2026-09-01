import json
import base64
from unittest.mock import patch

import cv2
import numpy as np

from django.test import TestCase
from django.utils import timezone

from operations.models import Device, Store
from ai.contracts import Detection, FrameAnalysis, TrackedObject


class OperationsApiTests(TestCase):
    def test_health_endpoint_returns_ok(self) -> None:
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_create_store(self) -> None:
        response = self.client.post(
            "/api/stores/",
            data=json.dumps({"name": "Main Store", "code": "STORE-01"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Store.objects.count(), 1)

    def test_dashboard_metrics_matches_frontend_contract(self) -> None:
        Store.objects.create(name="Main Store", code="STORE-01")
        response = self.client.get("/api/store/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("metrics", response.json())
        self.assertIn("queues", response.json())

    def test_store_settings_are_persisted(self) -> None:
        response = self.client.post(
            "/api/store/settings",
            data=json.dumps({"profile": {"storeName": "Main Store", "storeId": "STORE-01"}, "notifications": {"queueThreshold": 5}}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Store.objects.get().configuration["notifications"]["queueThreshold"], 5)

    def test_local_dashboard_origin_is_allowed(self) -> None:
        response = self.client.options("/api/store/metrics", HTTP_ORIGIN="http://localhost:3001")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:3001")

    @patch("operations.ai_views.get_pipeline")
    def test_local_vision_result_is_persisted(self, get_pipeline) -> None:
        Store.objects.create(name="Main Store", code="STORE-01")
        get_pipeline.return_value.analyze.return_value = FrameAnalysis(
            people=[TrackedObject("track_1", Detection(0.1, 0.2, 0.2, 0.4, 0.91, "person"))],
            queue_length=1,
            shelf_stock_percent=None,
            empty_slots=None,
            shelf_condition="Product model not configured",
            advice="Observed 1 person.",
            latency_ms=12,
            events=[{"eventType": "person_entered", "anonymousTrackId": "track_1"}],
        )
        encoded = cv2.imencode(".jpg", np.zeros((32, 32, 3), dtype=np.uint8))[1].tobytes()
        response = self.client.post(
            "/api/ai/vision-analysis/",
            data=json.dumps({"imageBase64": base64.b64encode(encoded).decode()}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["crowdCount"], 1)
        self.assertEqual(response.json()["shelfAnalysis"]["stockLevelPercent"], None)

    def test_report_is_generated_from_stored_events(self) -> None:
        Store.objects.create(name="Main Store", code="STORE-01")
        response = self.client.post(
            "/api/store/reports/generate",
            data=json.dumps({"reportType": "Store Performance", "dateStart": "2026-08-31", "dateEnd": "2026-08-31"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["report"]["type"], "CSV")

    def test_device_health_uses_persisted_heartbeat(self) -> None:
        store = Store.objects.create(name="Main Store", code="STORE-01")
        device = Device.objects.create(store=store, name="Camera", device_type="AI Camera", last_heartbeat=timezone.now())
        response = self.client.get(f"/api/devices/{device.id}/health/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()["heartbeatAgeMs"])

    def test_operational_advice_is_grounded_in_snapshot(self) -> None:
        Store.objects.create(name="Main Store", code="STORE-01")
        response = self.client.post(
            "/api/store/operational-advice",
            data=json.dumps({"query": "What is the queue risk?"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["source"], "local_store_telemetry")

    @patch("operations.ai_views.get_product_detector")
    def test_stock_camera_persists_observed_products(self, get_product_detector) -> None:
        store = Store.objects.create(name="Main Store", code="STORE-01")
        get_product_detector.return_value.detect.return_value = [Detection(0.1, 0.1, 0.2, 0.2, 0.88, "product")]
        encoded = cv2.imencode(".jpg", np.zeros((32, 32, 3), dtype=np.uint8))[1].tobytes()
        response = self.client.post(
            "/api/ai/stock-analysis/",
            data=json.dumps({"storeId": store.id, "imageBase64": base64.b64encode(encoded).decode()}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["productCount"], 1)