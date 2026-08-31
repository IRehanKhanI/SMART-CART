import json

from django.test import TestCase

from operations.models import Store


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
        response = self.client.options("/api/store/metrics", HTTP_ORIGIN="http://localhost:3000")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:3000")