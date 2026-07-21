from rest_framework import serializers

from inventory.models import InventoryBalance, Location
from stock.models import (
    StockAdjustment,
    StockInTransaction,
    StockOutTransaction,
    StockTake,
    StockTakeLine,
    StockTransfer,
)
from stock.services import InsufficientStockError, StockService, StockTakeService


class StockInSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = StockInTransaction
        fields = [
            "id",
            "product",
            "product_name",
            "supplier",
            "supplier_name",
            "location",
            "location_name",
            "quantity",
            "unit_cost",
            "reference",
            "notes",
            "received_at",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        product = attrs["product"]
        supplier = attrs["supplier"]
        location = attrs["location"]
        org = self.context["request"].user.organization
        if product.organization_id != org.id:
            raise serializers.ValidationError("Product not found in your organization.")
        if supplier.organization_id != org.id:
            raise serializers.ValidationError("Supplier not found in your organization.")
        if location.organization_id != org.id:
            raise serializers.ValidationError("Location not found in your organization.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        txn, _ = StockService.stock_in(
            user=request.user, request=request, **validated_data
        )
        return txn


class StockOutSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    available_stock = serializers.SerializerMethodField()

    class Meta:
        model = StockOutTransaction
        fields = [
            "id",
            "product",
            "product_name",
            "location",
            "location_name",
            "quantity",
            "available_stock",
            "issued_to",
            "reference",
            "notes",
            "issued_at",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_available_stock(self, obj):
        balance = InventoryBalance.objects.filter(
            product=obj.product, location=obj.location
        ).first()
        return balance.available_quantity if balance else 0

    def validate(self, attrs):
        product = attrs["product"]
        location = attrs["location"]
        quantity = attrs["quantity"]
        org = self.context["request"].user.organization
        if product.organization_id != org.id:
            raise serializers.ValidationError("Product not found in your organization.")
        if location.organization_id != org.id:
            raise serializers.ValidationError("Location not found in your organization.")
        balance = InventoryBalance.objects.filter(
            product=product, location=location
        ).first()
        available = balance.available_quantity if balance else 0
        if quantity > available:
            raise serializers.ValidationError(
                f"Cannot issue {quantity} units. Available stock: {available}."
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        try:
            txn, _ = StockService.stock_out(
                user=request.user, request=request, **validated_data
            )
        except InsufficientStockError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return txn


class StockAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = StockAdjustment
        fields = [
            "id",
            "product",
            "product_name",
            "location",
            "location_name",
            "previous_qty",
            "adjusted_qty",
            "reason",
            "adjusted_at",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "previous_qty", "created_by", "created_at"]

    def validate_reason(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("Adjustment reason is required.")
        return value.strip()

    def validate(self, attrs):
        product = attrs["product"]
        location = attrs["location"]
        org = self.context["request"].user.organization
        if product.organization_id != org.id:
            raise serializers.ValidationError("Product not found in your organization.")
        if location.organization_id != org.id:
            raise serializers.ValidationError("Location not found in your organization.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        try:
            adj, _ = StockService.adjust_stock(
                user=request.user, request=request, **validated_data
            )
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return adj


class StockTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_barcode = serializers.CharField(source="product.barcode", read_only=True, default=None)
    source_location_name = serializers.CharField(
        source="source_location.name", read_only=True
    )
    destination_location_name = serializers.CharField(
        source="destination_location.name", read_only=True
    )

    class Meta:
        model = StockTransfer
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "product_barcode",
            "source_location",
            "source_location_name",
            "destination_location",
            "destination_location_name",
            "quantity",
            "status",
            "notes",
            "transferred_at",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "status", "transferred_at", "created_by", "created_at"]

    def validate(self, attrs):
        product = attrs["product"]
        source = attrs["source_location"]
        destination = attrs["destination_location"]
        org = self.context["request"].user.organization
        if product.organization_id != org.id:
            raise serializers.ValidationError("Product not found in your organization.")
        if source.organization_id != org.id or destination.organization_id != org.id:
            raise serializers.ValidationError("Invalid location for your organization.")
        if source.id == destination.id:
            raise serializers.ValidationError("Source and destination must differ.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        try:
            return StockService.create_transfer_draft(
                user=request.user,
                request=request,
                **validated_data,
            )
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class StockTakeLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    variance = serializers.SerializerMethodField()
    has_variance = serializers.SerializerMethodField()

    class Meta:
        model = StockTakeLine
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "system_qty",
            "counted_qty",
            "variance",
            "has_variance",
            "notes",
            "adjustment",
        ]
        read_only_fields = ["id", "product", "system_qty", "adjustment"]

    def get_variance(self, obj):
        return obj.variance

    def get_has_variance(self, obj):
        return obj.has_variance


class StockTakeSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    expected_items = serializers.IntegerField(read_only=True)
    counted_items = serializers.IntegerField(read_only=True)
    variance_items = serializers.IntegerField(read_only=True)
    lines = StockTakeLineSerializer(many=True, read_only=True)

    class Meta:
        model = StockTake
        fields = [
            "id",
            "location",
            "location_name",
            "status",
            "scheduled_date",
            "assigned_to",
            "assigned_to_name",
            "notes",
            "created_by",
            "created_by_name",
            "started_at",
            "completed_at",
            "expected_items",
            "counted_items",
            "variance_items",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return None
        return obj.assigned_to.get_full_name() or obj.assigned_to.email

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.email


class StockTakeCreateSerializer(serializers.Serializer):
    location = serializers.IntegerField()
    scheduled_date = serializers.DateField()
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        request = self.context["request"]
        org = request.user.organization
        try:
            location = Location.objects.get(id=attrs["location"], organization=org)
        except Location.DoesNotExist as exc:
            raise serializers.ValidationError({"location": "Location not found."}) from exc

        assigned = None
        if attrs.get("assigned_to"):
            from accounts.models import User

            assigned = User.objects.filter(
                id=attrs["assigned_to"], organization=org
            ).first()
            if not assigned:
                raise serializers.ValidationError(
                    {"assigned_to": "User not found in your organization."}
                )
        attrs["location_obj"] = location
        attrs["assigned_obj"] = assigned
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return StockTakeService.create(
            organization=request.user.organization,
            location=validated_data["location_obj"],
            scheduled_date=validated_data["scheduled_date"],
            user=request.user,
            assigned_to=validated_data.get("assigned_obj"),
            notes=validated_data.get("notes", ""),
        )


class StockTakeCountSerializer(serializers.Serializer):
    counts = serializers.ListField(child=serializers.DictField(), allow_empty=False)
