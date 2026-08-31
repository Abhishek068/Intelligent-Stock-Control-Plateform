from rest_framework import serializers

from inventory.models import InventoryBalance, Location, Product
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
from stock.services import (
    InsufficientStockError,
    StockService,
    StockTakeService,
    SupplierReturnService,
)


class BatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)
    location_name = serializers.SerializerMethodField()
    days_to_expiry = serializers.SerializerMethodField()
    expiry_status = serializers.SerializerMethodField()
    is_fifo_recommended = serializers.SerializerMethodField()

    def get_location_name(self, obj):
        return "Central Warehouse"

    class Meta:
        model = Batch
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "supplier",
            "supplier_name",
            "location",
            "location_name",
            "batch_number",
            "expiry_date",
            "days_to_expiry",
            "expiry_status",
            "is_fifo_recommended",
            "quantity_on_hand",
            "unit_cost",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_days_to_expiry(self, obj):
        if not obj.expiry_date:
            return None
        from django.utils import timezone

        return (obj.expiry_date - timezone.now().date()).days

    def get_expiry_status(self, obj):
        days = self.get_days_to_expiry(obj)
        if days is None:
            return "no_expiry"
        if days < 0:
            return "expired"
        if days <= 7:
            return "critical"
        if days <= 15:
            return "warning"
        if days <= 30:
            return "attention"
        return "healthy"

    def get_is_fifo_recommended(self, obj):
        if obj.quantity_on_hand <= 0:
            return False
        from django.db.models import F
        from django.utils import timezone
        today = timezone.now().date()
        earliest = (
            Batch.objects.filter(
                product=obj.product,
                location=obj.location,
                quantity_on_hand__gt=0,
            )
            .exclude(expiry_date__lt=today)
            .order_by(F("expiry_date").asc(nulls_last=True), "created_at", "id")
            .values_list("id", flat=True)
            .first()
        )
        return earliest == obj.id if earliest else False


class StockInSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), required=False, allow_null=True
    )
    location_name = serializers.SerializerMethodField()
    batch_number = serializers.CharField(required=False, allow_blank=True, write_only=True)
    expiry_date = serializers.DateField(required=False, allow_null=True, write_only=True)
    batch_id = serializers.IntegerField(source="batch.id", read_only=True, default=None)
    batch_label = serializers.CharField(source="batch.batch_number", read_only=True, default=None)

    def get_location_name(self, obj):
        return obj.location.name if obj.location else "Central Warehouse"

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
            "quantity_remaining",
            "reference",
            "notes",
            "received_at",
            "batch_number",
            "expiry_date",
            "batch_id",
            "batch_label",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "quantity_remaining",
            "created_by",
            "created_at",
            "batch_id",
            "batch_label",
        ]

    def validate(self, attrs):
        org = self.context["request"].user.organization
        product = attrs["product"]
        supplier = attrs.get("supplier")
        
        if not attrs.get("location"):
            loc, _ = Location.objects.get_or_create(
                organization=org,
                name="Central Warehouse",
                defaults={"location_type": Location.LocationType.WAREHOUSE, "is_active": True}
            )
            attrs["location"] = loc

        if product.organization_id != org.id:
            raise serializers.ValidationError("Product not found in your organization.")
        if supplier and supplier.organization_id != org.id:
            raise serializers.ValidationError("Supplier not found in your organization.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        batch_number = validated_data.pop("batch_number", None)
        expiry_date = validated_data.pop("expiry_date", None)
        txn, _ = StockService.stock_in(
            user=request.user,
            request=request,
            batch_number=batch_number,
            expiry_date=expiry_date,
            **validated_data,
        )
        return txn


class StockOutSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), required=False, allow_null=True
    )
    location_name = serializers.SerializerMethodField()
    available_stock = serializers.SerializerMethodField()
    batch_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    batch_label = serializers.CharField(source="batch.batch_number", read_only=True, default=None)
    batch = serializers.PrimaryKeyRelatedField(read_only=True)

    def get_location_name(self, obj):
        return obj.location.name if obj.location else "Central Warehouse"

    class Meta:
        model = StockOutTransaction
        fields = [
            "id",
            "product",
            "product_name",
            "location",
            "location_name",
            "quantity",
            "cogs",
            "available_stock",
            "issued_to",
            "reference",
            "notes",
            "issued_at",
            "batch_id",
            "batch",
            "batch_label",
            "anomaly_score",
            "is_anomaly",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "cogs",
            "anomaly_score",
            "is_anomaly",
            "created_by",
            "created_at",
            "batch",
            "batch_label",
        ]

    def get_available_stock(self, obj):
        balance = InventoryBalance.objects.filter(
            product=obj.product, location=obj.location
        ).first()
        return balance.available_quantity if balance else 0

    def validate(self, attrs):
        org = self.context["request"].user.organization
        product = attrs["product"]
        quantity = attrs["quantity"]

        if product.organization_id != org.id:
            raise serializers.ValidationError("Product not found in your organization.")

        batch_id = attrs.get("batch_id")
        today = timezone.now().date()
        if batch_id:
            batch = Batch.objects.filter(id=batch_id, product=product).first()
            if not batch:
                raise serializers.ValidationError({"batch_id": "Invalid batch for this product."})
            if not attrs.get("location") and batch.location:
                attrs["location"] = batch.location
            if batch.quantity_on_hand < quantity:
                raise serializers.ValidationError({"batch_id": f"Batch stock ({batch.quantity_on_hand}) is less than quantity requested."})
            if batch.expiry_date and batch.expiry_date < today:
                raise serializers.ValidationError({"batch_id": f"Batch '{batch.batch_number}' expired on {batch.expiry_date} and cannot be issued."})

        if not attrs.get("location"):
            pos_balance = InventoryBalance.objects.filter(
                product=product, location__organization=org, quantity_on_hand__gte=quantity
            ).first()
            if pos_balance:
                attrs["location"] = pos_balance.location
            else:
                loc, _ = Location.objects.get_or_create(
                    organization=org,
                    name="Central Warehouse",
                    defaults={"location_type": Location.LocationType.WAREHOUSE, "is_active": True}
                )
                attrs["location"] = loc

        location = attrs["location"]

        if not batch_id:
            valid_batches = Batch.objects.filter(
                product=product, location=location, quantity_on_hand__gt=0
            ).filter(Q(expiry_date__isnull=True) | Q(expiry_date__gte=today))
            expired_count = Batch.objects.filter(
                product=product, location=location, quantity_on_hand__gt=0, expiry_date__lt=today
            ).count()
            if not valid_batches.exists() and expired_count > 0:
                raise serializers.ValidationError(
                    "All available batches for this product have expired and cannot be issued. Please adjust or return expired stock."
                )

        balance = InventoryBalance.objects.filter(
            product=product, location=location
        ).first()
        available = balance.available_quantity if balance else 0
        if quantity > available:
            raise serializers.ValidationError(
                f"Cannot issue {quantity} units. Available stock at {location.name}: {available}."
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        batch_id = validated_data.pop("batch_id", None)
        try:
            txn, _ = StockService.stock_out(
                user=request.user, request=request, batch_id=batch_id, **validated_data
            )
        except InsufficientStockError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return txn


class StockAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    location_name = serializers.SerializerMethodField()

    def get_location_name(self, obj):
        return obj.location.name if obj.location else "Central Warehouse"

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
            "anomaly_score",
            "is_anomaly",
            "created_by",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "previous_qty",
            "anomaly_score",
            "is_anomaly",
            "created_by",
            "created_at",
        ]
        extra_kwargs = {
            "adjusted_at": {"required": False, "allow_null": True}
        }

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
        except (ValueError, InsufficientStockError) as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return adj


class StockTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_barcode = serializers.CharField(
        source="product.barcode", read_only=True, default=None
    )
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


class SupplierReturnLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    batch_number = serializers.CharField(
        source="batch.batch_number", read_only=True, default=None
    )

    class Meta:
        model = SupplierReturnLine
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "batch",
            "batch_number",
            "quantity",
            "unit_cost",
        ]
        read_only_fields = ["id", "product_name", "product_sku", "batch_number"]


class SupplierReturnSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    lines = SupplierReturnLineSerializer(many=True, read_only=True)
    line_items = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model = SupplierReturn
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "location",
            "location_name",
            "status",
            "reason",
            "created_by",
            "created_by_name",
            "shipped_at",
            "completed_at",
            "lines",
            "line_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "shipped_at",
            "completed_at",
            "created_at",
            "updated_at",
            "lines",
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.email

    def validate(self, attrs):
        request = self.context["request"]
        org = request.user.organization
        supplier = attrs.get("supplier")
        location = attrs.get("location")
        if self.instance is None:
            if not supplier or supplier.organization_id != org.id:
                raise serializers.ValidationError({"supplier": "Invalid supplier."})
            if not location or location.organization_id != org.id:
                raise serializers.ValidationError({"location": "Invalid location."})
            lines = attrs.get("line_items") or []
            if not lines:
                raise serializers.ValidationError(
                    {"line_items": "At least one line is required."}
                )
            resolved = []
            for item in lines:
                try:
                    product = Product.objects.get(id=item.get("product"), organization=org)
                except Product.DoesNotExist as exc:
                    raise serializers.ValidationError(
                        {"line_items": "Invalid product."}
                    ) from exc
                batch = None
                if item.get("batch"):
                    batch = Batch.objects.filter(
                        id=item["batch"], product=product, location=location
                    ).first()
                    if not batch:
                        raise serializers.ValidationError(
                            {"line_items": f"Invalid batch for product {product.name}."}
                        )
                qty = int(item.get("quantity") or 0)
                if qty < 1:
                    raise serializers.ValidationError(
                        {"line_items": "Quantity must be positive."}
                    )
                resolved.append(
                    {
                        "product": product,
                        "batch": batch,
                        "quantity": qty,
                        "unit_cost": item.get("unit_cost"),
                    }
                )
            attrs["resolved_lines"] = resolved
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data.pop("line_items", None)
        lines = validated_data.pop("resolved_lines")
        try:
            return SupplierReturnService.create_draft(
                supplier=validated_data["supplier"],
                location=validated_data["location"],
                reason=validated_data.get("reason") or "",
                user=request.user,
                lines=lines,
            )
        except (ValueError, InsufficientStockError) as exc:
            raise serializers.ValidationError(str(exc)) from exc
