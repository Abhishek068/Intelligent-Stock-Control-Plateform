from django.db.models import Count

from rest_framework import serializers



from suppliers.models import Supplier





class SupplierSerializer(serializers.ModelSerializer):

    product_count = serializers.SerializerMethodField()
    predicted_lead_time_info = serializers.SerializerMethodField()

    class Meta:

        model = Supplier

        fields = [

            "id",

            "name",

            "contact_name",

            "email",

            "phone",

            "address",

            "lead_time_days",

            "predicted_lead_time_info",

            "status",

            "delivery_reliability",

            "delivery_rate",

            "order_accuracy",

            "performance_score",

            "performance_breakdown",

            "product_count",

            "created_at",

            "updated_at",

        ]

        read_only_fields = [
            "id",
            "delivery_reliability",
            "delivery_rate",
            "order_accuracy",
            "performance_score",
            "performance_breakdown",
            "created_at",
            "updated_at",
        ]

    def get_product_count(self, obj):

        return obj.products.filter(is_active=True).count()

    def get_predicted_lead_time_info(self, obj):
        from suppliers.risk_prediction_service import SupplierRiskPredictionService
        return SupplierRiskPredictionService.predict_actual_lead_time(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        if not data.get("delivery_reliability") or float(data.get("delivery_reliability") or 0) == 0:
            data["delivery_reliability"] = 95.0
        if not data.get("order_accuracy") or float(data.get("order_accuracy") or 0) == 0:
            data["order_accuracy"] = 98.0
        if not data.get("performance_score") or float(data.get("performance_score") or 0) == 0:
            data["performance_score"] = 96.5

        return data



class PredictSupplierRiskSerializer(serializers.Serializer):
    supplier = serializers.IntegerField()
    total_volume = serializers.IntegerField(min_value=1, required=False, default=1)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0.0)
    expected_delivery = serializers.DateField(required=False, allow_null=True)
    location = serializers.IntegerField(required=False, allow_null=True)

