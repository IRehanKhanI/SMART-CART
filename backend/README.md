# Retail Backend

Local Django and edge-AI backend for the retail operations dashboard. It stores anonymous operational events and configuration data in SQLite; no video frames, faces, names, or customer identities are modeled.

## Run locally

From this `backend` directory, using the system Python:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python scripts/download_models.py person
python scripts/download_models.py retail_product
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/api/`.

## Initial endpoints

- `GET /api/health/`
- `GET, POST /api/stores/`
- `GET, POST /api/zones/`
- `GET, POST /api/devices/`
- `GET, POST /api/inventory/`
- `GET, POST /api/queues/`
- `GET, POST /api/events/`
- `GET, POST /api/alerts/`
- `POST /api/alerts/{id}/acknowledge/`
- `GET /api/overview/`
- `GET /api/store/metrics` - Dashboard payload compatible with the existing frontend
- `POST /api/ai/vision-analysis/` - Run local YOLO/ByteTrack inference on a base64 image
- `GET /api/ai/health/` - Show local model readiness and paths
- `GET /api/ai/heatmap/` - Read the in-memory anonymous track heatmap
- `POST /api/ai/source/test/` - Test a webcam, video, HTTP, or RTSP source
- `POST /api/sensors/events/` - Ingest normalized ESP32 sensor values

`seed_demo` adds a local store, anonymous entry/exit events, zones, devices, inventory, checkout counters, and actionable alerts. It does not add video, faces, names, or other customer identities.

## Camera sources

Use camera index `0` for a laptop webcam, or provide a phone/IP camera stream URL:

```powershell
python manage.py run_edge_camera 0 --frames 10
python manage.py run_edge_camera "http://PHONE_IP:PORT/video"
python manage.py run_edge_camera "rtsp://CAMERA_IP/stream"
```

Edit `ai/config.json` to configure the normalized entry line, queue polygon, queue threshold, service-time estimate, and zone polygons. Model locations are defined in `ai/models/registry.json` and can be overridden with `RETAIL_AI_MODELS_DIR`. The optional retail product detector and PaddleOCR adapter are isolated from person inference; they are not reported as available unless their weights/dependencies are installed.
