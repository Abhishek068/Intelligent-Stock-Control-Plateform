from django.contrib import admin

from notifications.models import DeviceToken, Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "notification_type",
        "severity",
        "channel",
        "priority",
        "user",
        "organization",
        "is_read",
        "created_at",
    )
    list_filter = (
        "notification_type",
        "severity",
        "channel",
        "priority",
        "is_read",
        "organization",
    )
    search_fields = ("title", "message", "related_entity_type", "related_entity_id")


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "is_active", "created_at", "updated_at")
    list_filter = ("platform", "is_active")
    search_fields = ("user__username", "token")
