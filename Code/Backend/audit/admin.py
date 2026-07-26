from django.contrib import admin

from audit.models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "user",
        "action",
        "entity_type",
        "entity_id",
        "entity_name",
        "ip_address",
    )
    list_filter = ("entity_type", "action", "created_at")
    search_fields = ("user__username", "entity_name", "entity_id", "details")
    readonly_fields = (
        "user",
        "entity_type",
        "entity_id",
        "entity_name",
        "action",
        "before_json",
        "after_json",
        "details",
        "ip_address",
        "created_at",
    )
