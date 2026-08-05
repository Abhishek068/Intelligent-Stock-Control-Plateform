from django.contrib import admin

from stock.models import (
    Batch,
    StockAdjustment,
    StockInTransaction,
    StockOutTransaction,
    StockTake,
    StockTakeLine,
    StockTransfer,
    SupplierReturn,
    SupplierReturnLine,
)


@admin.register(StockInTransaction)
class StockInTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "supplier",
        "location",
        "quantity",
        "unit_cost",
        "quantity_remaining",
        "received_at",
    )
    list_filter = ("location", "supplier", "received_at")
    search_fields = ("product__sku", "product__name", "reference", "notes")


@admin.register(StockOutTransaction)
class StockOutTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "location",
        "quantity",
        "issued_to",
        "cogs",
        "issued_at",
    )
    list_filter = ("location", "issued_at")
    search_fields = ("product__sku", "product__name", "issued_to", "reference")


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "location",
        "previous_qty",
        "adjusted_qty",
        "adjusted_at",
        "created_by",
    )
    list_filter = ("location", "adjusted_at")
    search_fields = ("product__sku", "product__name", "reason")


@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "source_location",
        "destination_location",
        "quantity",
        "status",
        "created_at",
    )
    list_filter = ("status", "source_location", "destination_location")
    search_fields = ("product__sku", "product__name", "notes")


class StockTakeLineInline(admin.TabularInline):
    model = StockTakeLine
    extra = 0


@admin.register(StockTake)
class StockTakeAdmin(admin.ModelAdmin):
    list_display = (
        "location",
        "status",
        "scheduled_date",
        "assigned_to",
        "organization",
        "created_at",
    )
    list_filter = ("status", "location", "organization", "scheduled_date")
    search_fields = ("location__name", "notes")
    inlines = [StockTakeLineInline]


@admin.register(StockTakeLine)
class StockTakeLineAdmin(admin.ModelAdmin):
    list_display = ("stock_take", "product", "system_qty", "counted_qty")
    list_filter = ("stock_take",)
    search_fields = ("product__sku", "product__name", "notes")


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = (
        "batch_number",
        "product",
        "location",
        "quantity_on_hand",
        "expiry_date",
        "unit_cost",
    )
    list_filter = ("location", "expiry_date")
    search_fields = ("batch_number", "product__sku", "product__name")


class SupplierReturnLineInline(admin.TabularInline):
    model = SupplierReturnLine
    extra = 0


@admin.register(SupplierReturn)
class SupplierReturnAdmin(admin.ModelAdmin):
    list_display = ("supplier", "location", "status", "shipped_at", "created_at")
    list_filter = ("status", "location")
    search_fields = ("supplier__name", "reason")
    inlines = [SupplierReturnLineInline]
