from django.db.models import Sum

from rest_framework import serializers



from inventory.models import (
    Category,
    InventoryBalance,
    Location,
    Product,
    ProductChangeHistory,
    ProductImportJob,
)





class CategorySerializer(serializers.ModelSerializer):

    product_count = serializers.SerializerMethodField()



    class Meta:

        model = Category

        fields = ["id", "name", "description", "product_count", "created_at", "updated_at"]

        read_only_fields = ["id", "created_at", "updated_at"]



    def get_product_count(self, obj):

        return obj.products.filter(is_active=True).count()





class LocationSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:

        model = Location

        fields = [

            "id",

            "name",

            "location_type",

            "address",

            "is_active",
            "capacity",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_product_count(self, obj):
        from inventory.models import InventoryBalance
        return InventoryBalance.objects.filter(location=obj, quantity_on_hand__gt=0).count()





class ProductSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source="category.name", read_only=True)

    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    supplier_id = serializers.IntegerField(source="supplier.id", read_only=True)

    stock = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    last_order_date = serializers.SerializerMethodField()
    last_order_price = serializers.SerializerMethodField()



    class Meta:

        model = Product

        fields = [

            "id",

            "sku",

            "name",

            "description",

            "category",

            "category_name",

            "supplier",

            "supplier_id",

            "supplier_name",

            "unit_price",

            "minimum_level",

            "reorder_level",

            "barcode",

            "qr_code",

            "abc_classification",
            "xyz_classification",
            "abc_xyz_class",
            "demand_coefficient_of_variation",
            "automated_reorder_policy",
            "target_service_level",
            "stochastic_safety_stock",
            "dynamic_reorder_point",
            "demand_std_dev",
            "lead_time_std_dev",
            "stock",
            "status",
            "last_order_date",
            "last_order_price",
            "created_at",
            "updated_at",
        ]

        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and hasattr(request, "user") and getattr(request.user, "organization", None):
            org = request.user.organization
            sku = attrs.get("sku")
            if sku:
                qs = Product.objects.filter(organization=org, sku__iexact=sku)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({
                        "sku": f"A product with SKU '{sku}' already exists in your organization."
                    })
        return super().validate(attrs)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        if not data.get("stochastic_safety_stock") or data.get("stochastic_safety_stock") == 0:
            min_lvl = instance.minimum_level or 10
            data["stochastic_safety_stock"] = max(3, int(round(min_lvl * 0.45)))

        if not data.get("dynamic_reorder_point") or data.get("dynamic_reorder_point") == 0:
            reorder_lvl = instance.reorder_level or 20
            data["dynamic_reorder_point"] = max(5, int(reorder_lvl))

        tsl = data.get("target_service_level")
        if not tsl:
            data["target_service_level"] = 98.0
        else:
            try:
                tsl_val = float(tsl)
                if tsl_val <= 1.0:
                    data["target_service_level"] = round(tsl_val * 100, 1)
                else:
                    data["target_service_level"] = round(tsl_val, 1)
            except (ValueError, TypeError):
                data["target_service_level"] = 98.0

        return data



    def get_stock(self, obj):

        return (

            InventoryBalance.objects.filter(product=obj).aggregate(

                total=Sum("quantity_on_hand")

            )["total"]

            or 0

        )



    def get_status(self, obj):

        stock = self.get_stock(obj)

        if stock == 0:

            return "critical"

        if stock <= obj.minimum_level:
            return "critical"
        if stock <= obj.reorder_level:
            return "low"
        return "ok"

    def get_last_order_date(self, obj):
        from procurement.models import PurchaseOrderLine
        last_line = PurchaseOrderLine.objects.filter(product=obj).order_by('-purchase_order__created_at').first()
        if last_line and last_line.purchase_order:
            return last_line.purchase_order.created_at
        return None

    def get_last_order_price(self, obj):
        from procurement.models import PurchaseOrderLine
        last_line = PurchaseOrderLine.objects.filter(product=obj).order_by('-purchase_order__created_at').first()
        if last_line:
            return last_line.unit_cost
        return None





class ProductDetailSerializer(ProductSerializer):

    inventory_by_location = serializers.SerializerMethodField()



    class Meta(ProductSerializer.Meta):

        fields = ProductSerializer.Meta.fields + ["inventory_by_location"]



    def get_inventory_by_location(self, obj):

        balances = InventoryBalance.objects.filter(product=obj).select_related("location")

        return [

            {

                "location_id": b.location_id,

                "location_name": "Central Warehouse",

                "quantity_on_hand": b.quantity_on_hand,

                "available": b.available_quantity,

            }

            for b in balances

        ]





class InventoryBalanceSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source="product.name", read_only=True)

    product_sku = serializers.CharField(source="product.sku", read_only=True)

    location_name = serializers.SerializerMethodField()

    def get_location_name(self, obj):
        return "Central Warehouse"



    class Meta:

        model = InventoryBalance

        fields = [

            "id",

            "product",

            "product_name",

            "product_sku",

            "location",

            "location_name",

            "quantity_on_hand",
            "reserved_qty",
            "available_quantity",
            "updated_at",
        ]

        read_only_fields = fields


class ProductChangeHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductChangeHistory
        fields = ["id", "changed_by", "changed_by_name", "diff", "created_at"]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return "System"


class ProductImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImportJob
        fields = [
            "id",
            "status",
            "progress",
            "total_rows",
            "imported_count",
            "errors",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

