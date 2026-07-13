from rest_framework import serializers



from inventory.models import Location, Product

from stock.models import StockAdjustment, StockInTransaction, StockOutTransaction, StockTransfer

from stock.services import InsufficientStockError, StockService

from suppliers.models import Supplier





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

            user=request.user,

            request=request,

            **validated_data,

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

        from inventory.models import InventoryBalance



        balance = InventoryBalance.objects.filter(product=obj.product, location=obj.location).first()

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

        from inventory.models import InventoryBalance



        balance = InventoryBalance.objects.filter(product=product, location=location).first()

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

                user=request.user,

                request=request,

                **validated_data,

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

        adj, _ = StockService.adjust_stock(

            user=request.user,

            request=request,

            **validated_data,

        )

        return adj





class StockTransferSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source="product.name", read_only=True)

    source_location_name = serializers.CharField(source="source_location.name", read_only=True)

    destination_location_name = serializers.CharField(

        source="destination_location.name", read_only=True

    )



    class Meta:

        model = StockTransfer

        fields = [

            "id",

            "product",

            "product_name",

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

        transfer = StockTransfer.objects.create(

            created_by=request.user,

            status=StockTransfer.Status.DRAFT,

            **validated_data,

        )

        try:

            StockService.transfer_stock(transfer=transfer, user=request.user, request=request)

        except InsufficientStockError as exc:

            transfer.delete()

            raise serializers.ValidationError(str(exc)) from exc

        transfer.refresh_from_db()

        return transfer

