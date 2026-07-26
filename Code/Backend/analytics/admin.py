from django.contrib import admin

from analytics.models import DemandForecast, PredictiveAlert, ReorderRecommendation


@admin.register(DemandForecast)
class DemandForecastAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "model_name",
        "forecast_period_start",
        "forecast_period_end",
        "predicted_demand",
        "generated_at",
    )
    list_filter = ("model_name", "forecast_period_start", "generated_at")
    search_fields = ("product__sku", "product__name", "model_name")


@admin.register(ReorderRecommendation)
class ReorderRecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "priority",
        "current_stock",
        "reorder_point",
        "suggested_quantity",
        "stockout_risk",
        "is_active",
        "generated_at",
    )
    list_filter = ("priority", "is_active", "generated_at")
    search_fields = ("product__sku", "product__name")


@admin.register(PredictiveAlert)
class PredictiveAlertAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "severity",
        "predicted_stockout_date",
        "threshold_date",
        "is_resolved",
        "generated_at",
    )
    list_filter = ("severity", "is_resolved", "generated_at")
    search_fields = ("product__sku", "product__name")
