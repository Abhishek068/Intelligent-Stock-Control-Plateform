from django.contrib import admin

from inventory.models import (
    Category,
    InventoryBalance,
    Location,
    Product,
    ProductChangeHistory,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "created_at")
    list_filter = ("organization",)
    search_fields = ("name", "description")


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "location_type", "organization", "is_active", "capacity")
    list_filter = ("location_type", "is_active", "organization")
    search_fields = ("name", "address")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "name",
        "category",
        "supplier",
        "unit_price",
        "is_active",
        "organization",
    )
    list_filter = ("is_active", "category", "supplier", "organization")
    search_fields = ("sku", "name", "barcode")


@admin.register(InventoryBalance)
class InventoryBalanceAdmin(admin.ModelAdmin):
    list_display = ("product", "location", "quantity_on_hand", "reserved_qty")
    list_filter = ("location",)
    search_fields = ("product__sku", "product__name", "location__name")


@admin.register(ProductChangeHistory)
class ProductChangeHistoryAdmin(admin.ModelAdmin):
    list_display = ("product", "changed_by", "created_at")
    list_filter = ("created_at",)
    search_fields = ("product__sku", "product__name", "changed_by__username")
    readonly_fields = ("product", "changed_by", "diff", "created_at", "updated_at")
