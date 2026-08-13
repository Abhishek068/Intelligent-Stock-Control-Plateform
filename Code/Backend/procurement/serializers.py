from rest_framework import serializers

from inventory.models import Location, Product
from procurement.models import PurchaseOrder, PurchaseOrderLine
from procurement.services import PurchaseOrderService
from suppliers.models import Supplier


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    line_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    quantity_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = PurchaseOrderLine
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "quantity_ordered",
            "quantity_received",
            "quantity_remaining",
            "unit_cost",
            "line_total",
            "notes",
        ]
        read_only_fields = ["id", "quantity_received"]


class PurchaseOrderLineWriteSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity_ordered = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "po_number",
            "supplier",
            "supplier_name",
            "location",
            "location_name",
            "status",
            "expected_delivery",
            "notes",
            "total_amount",
            "created_by",
            "created_by_name",
            "submitted_at",
            "received_at",
            "delay_probability",
            "risk_score",
            "risk_level",
            "risk_factors",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "po_number",
            "status",
            "total_amount",
            "created_by",
            "submitted_at",
            "received_at",
            "created_at",
            "updated_at",
        ]


class PurchaseOrderCreateSerializer(serializers.Serializer):
    supplier = serializers.IntegerField()
    location = serializers.IntegerField(required=False, allow_null=True)
    expected_delivery = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = PurchaseOrderLineWriteSerializer(many=True)

    def validate(self, attrs):
        request = self.context["request"]
        org = request.user.organization
        try:
            supplier = Supplier.objects.get(id=attrs["supplier"], organization=org)
        except Supplier.DoesNotExist as exc:
            raise serializers.ValidationError({"supplier": "Supplier not found."}) from exc

        location = None
        if attrs.get("location"):
            try:
                location = Location.objects.get(id=attrs["location"], organization=org)
            except Location.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"location": "Location not found."}
                ) from exc

        if not attrs.get("lines"):
            raise serializers.ValidationError({"lines": "At least one line is required."})

        resolved_lines = []
        for line in attrs["lines"]:
            try:
                product = Product.objects.get(id=line["product"], organization=org)
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"lines": f"Product {line['product']} not found."}
                ) from exc
            resolved_lines.append(
                {
                    "product": product,
                    "quantity_ordered": line["quantity_ordered"],
                    "unit_cost": line.get("unit_cost") or product.unit_price,
                    "notes": line.get("notes", ""),
                }
            )

        attrs["supplier_obj"] = supplier
        attrs["location_obj"] = location
        attrs["resolved_lines"] = resolved_lines
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return PurchaseOrderService.create_order(
            organization=request.user.organization,
            supplier=validated_data["supplier_obj"],
            location=validated_data.get("location_obj"),
            user=request.user,
            lines=validated_data["resolved_lines"],
            expected_delivery=validated_data.get("expected_delivery"),
            notes=validated_data.get("notes", ""),
        )


class ReceiveLinesSerializer(serializers.Serializer):
    location = serializers.IntegerField(required=False, allow_null=True)
    lines = serializers.ListField(
        child=serializers.DictField(), required=False, allow_empty=True
    )
