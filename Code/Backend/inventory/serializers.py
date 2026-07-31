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

    class Meta:

        model = Location

        fields = [

            "id",

            "name",

            "location_type",

            "address",

            "is_active",

            "capacity",

            "created_at",

            "updated_at",

        ]

        read_only_fields = ["id", "created_at", "updated_at"]





class ProductSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source="category.name", read_only=True)

    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    supplier_id = serializers.IntegerField(source="supplier.id", read_only=True)

    stock = serializers.SerializerMethodField()

    status = serializers.SerializerMethodField()



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

            "is_active",

            "abc_classification",

            "stock",

            "status",

            "created_at",

            "updated_at",

        ]

        read_only_fields = ["id", "created_at", "updated_at"]



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





class ProductDetailSerializer(ProductSerializer):

    inventory_by_location = serializers.SerializerMethodField()



    class Meta(ProductSerializer.Meta):

        fields = ProductSerializer.Meta.fields + ["inventory_by_location"]



    def get_inventory_by_location(self, obj):

        balances = InventoryBalance.objects.filter(product=obj).select_related("location")

        return [

            {

                "location_id": b.location_id,

                "location_name": b.location.name,

                "quantity_on_hand": b.quantity_on_hand,

                "available": b.available_quantity,

            }

            for b in balances

        ]





class InventoryBalanceSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source="product.name", read_only=True)

    product_sku = serializers.CharField(source="product.sku", read_only=True)

    location_name = serializers.CharField(source="location.name", read_only=True)



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

