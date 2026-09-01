from datetime import datetime, timezone
from typing import Any


ALLOWED_SENSOR_TYPES = {"weight", "ir", "tof", "door", "temperature", "shelf_occupancy"}


def normalize_sensor_event(data: dict[str, Any]) -> dict[str, Any]:
    sensor_type = str(data.get("sensorType", "")).lower()
    if sensor_type not in ALLOWED_SENSOR_TYPES:
        raise ValueError(f"Unsupported sensor type: {sensor_type}")
    if "deviceId" not in data or "value" not in data:
        raise ValueError("deviceId and value are required")
    return {
        "eventType": "sensor_reading",
        "deviceId": data["deviceId"],
        "value": float(data["value"]),
        "occurredAt": data.get("occurredAt", datetime.now(timezone.utc).isoformat()),
        "payload": {"sensorType": sensor_type, "unit": data.get("unit", ""), "shelf": data.get("shelf")},
    }