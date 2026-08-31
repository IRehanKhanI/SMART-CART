from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("overview/", views.overview),
    path("store/metrics", views.store_metrics),
    path("store/alerts/acknowledge", views.store_acknowledge_alert),
    path("store/inventory/dispatch", views.dispatch_inventory),
    path("store/queues/toggle", views.toggle_counter),
    path("store/queues/execute-recommendation", views.execute_queue_recommendation),
    path("store/tasks/create", views.create_manual_task),
    path("store/devices/register", views.register_dashboard_device),
    path("store/zones/add", views.add_dashboard_zone),
    path("store/settings", views.store_settings),
    path("stores/", views.stores),
    path("zones/", views.zones),
    path("devices/", views.devices),
    path("inventory/", views.inventory),
    path("queues/", views.queues),
    path("events/", views.events),
    path("alerts/", views.alerts),
    path("alerts/<int:alert_id>/acknowledge/", views.acknowledge_alert),
]