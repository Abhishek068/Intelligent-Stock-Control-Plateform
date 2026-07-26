from django.contrib import admin

from suppliers.models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "contact_name",
        "email",
        "phone",
        "lead_time_days",
        "delivery_reliability",
        "status",
        "organization",
    )
    list_filter = ("status", "organization")
    search_fields = ("name", "contact_name", "email", "phone")
