from django.contrib import admin

from .models import Alert, Device, InventoryItem, OperationalEvent, QueueCounter, Store, Zone

admin.site.register([Store, Zone, Device, InventoryItem, QueueCounter, OperationalEvent, Alert])