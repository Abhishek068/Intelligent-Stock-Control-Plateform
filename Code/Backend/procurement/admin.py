from django.contrib import admin

from procurement.models import PurchaseOrder, PurchaseOrderLine


class PurchaseOrderLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "supplier", "status", "total_amount", "created_at")
    list_filter = ("status",)
    search_fields = ("po_number", "supplier__name")
    inlines = [PurchaseOrderLineInline]
