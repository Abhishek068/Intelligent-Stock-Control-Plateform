from django.db.models import Count

from rest_framework import serializers



from suppliers.models import Supplier





class SupplierSerializer(serializers.ModelSerializer):

    product_count = serializers.SerializerMethodField()



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

            "status",

            "delivery_reliability",

            "product_count",

            "created_at",

            "updated_at",

        ]

        read_only_fields = ["id", "created_at", "updated_at"]



    def get_product_count(self, obj):

        return obj.products.filter(is_active=True).count()

