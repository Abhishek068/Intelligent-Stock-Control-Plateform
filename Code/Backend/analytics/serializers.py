from rest_framework import serializers



from analytics.models import DemandForecast, PredictiveAlert, ReorderRecommendation





class DemandForecastSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source="product.name", read_only=True)

    product_sku = serializers.CharField(source="product.sku", read_only=True)



    class Meta:

        model = DemandForecast

        fields = [

            "id",

            "product",

            "product_name",

            "product_sku",

            "forecast_period_start",

            "forecast_period_end",

            "predicted_demand",

            "model_name",

            "mae",

            "rmse",

            "mape",

            "generated_at",

            "weather_context",

        ]

        read_only_fields = fields





class ReorderRecommendationSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source="product.name", read_only=True)

    product_sku = serializers.CharField(source="product.sku", read_only=True)

    supplier_name = serializers.CharField(source="product.supplier.name", read_only=True)



    class Meta:

        model = ReorderRecommendation

        fields = [

            "id",

            "product",

            "product_name",

            "product_sku",

            "supplier_name",

            "current_stock",

            "lead_time_days",

            "predicted_demand",

            "reorder_point",

            "suggested_quantity",

            "priority",

            "stockout_risk",

            "explanation_json",

            "generated_at",

            "is_active",

        ]

        read_only_fields = fields





class PredictiveAlertSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source="product.name", read_only=True)



    class Meta:

        model = PredictiveAlert

        fields = [

            "id",

            "product",

            "product_name",

            "predicted_stockout_date",

            "threshold_date",

            "severity",

            "explanation_json",

            "is_resolved",

            "generated_at",

        ]

        read_only_fields = fields

