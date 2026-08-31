# Retail Backend

Local Django backend for the retail operations dashboard. It stores anonymous operational events and configuration data in SQLite; no video frames, faces, names, or customer identities are modeled.

## Run locally

From this `backend` directory, using the system Python:

```powershell
python manage.py migrate
python manage.py seed_demo
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

`seed_demo` adds a local store, anonymous entry/exit events, zones, devices, inventory, checkout counters, and actionable alerts. It does not add video, faces, names, or other customer identities.
