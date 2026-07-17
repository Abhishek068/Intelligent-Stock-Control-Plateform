from decimal import Decimal

from rest_framework import serializers

from billing.models import Customer, Invoice, InvoiceLine, InvoicePayment
from billing.services import InvoiceService
from inventory.models import Product


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "address",
            "company",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InvoiceLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    line_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = InvoiceLine
        fields = [
            "id",
            "product",
            "product_name",
            "description",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id"]


class InvoicePaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoicePayment
        fields = [
            "id",
            "amount",
            "method",
            "paid_at",
            "notes",
            "recorded_by",
            "recorded_by_name",
        ]
        read_only_fields = fields

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.get_full_name() or obj.recorded_by.email


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    customer_address = serializers.CharField(source="customer.address", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "customer",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "status",
            "issue_date",
            "due_date",
            "notes",
            "tax_rate",
            "subtotal",
            "tax_amount",
            "total_amount",
            "paid_at",
            "created_by",
            "created_by_name",
            "lines",
            "payments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "status",
            "subtotal",
            "tax_amount",
            "total_amount",
            "paid_at",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.email


class InvoiceLineWriteSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )


class InvoiceCreateSerializer(serializers.Serializer):
    customer = serializers.IntegerField()
    due_date = serializers.DateField(required=False, allow_null=True)
    issue_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, default=Decimal("0.00")
    )
    lines = InvoiceLineWriteSerializer(many=True)

    def validate(self, attrs):
        request = self.context["request"]
        org = request.user.organization
        try:
            customer = Customer.objects.get(id=attrs["customer"], organization=org)
        except Customer.DoesNotExist as exc:
            raise serializers.ValidationError({"customer": "Customer not found."}) from exc

        if not attrs.get("lines"):
            raise serializers.ValidationError({"lines": "At least one line is required."})

        resolved = []
        for line in attrs["lines"]:
            product = None
            description = (line.get("description") or "").strip()
            unit_price = line.get("unit_price")
            if line.get("product"):
                try:
                    product = Product.objects.get(id=line["product"], organization=org)
                except Product.DoesNotExist as exc:
                    raise serializers.ValidationError(
                        {"lines": f"Product {line['product']} not found."}
                    ) from exc
                description = description or product.name
                if unit_price is None:
                    unit_price = product.unit_price
            if not description:
                raise serializers.ValidationError(
                    {"lines": "Each line needs a description or product."}
                )
            if unit_price is None:
                raise serializers.ValidationError(
                    {"lines": "Each line needs a unit_price."}
                )
            resolved.append(
                {
                    "product": product,
                    "description": description,
                    "quantity": line["quantity"],
                    "unit_price": unit_price,
                }
            )
        attrs["customer_obj"] = customer
        attrs["resolved_lines"] = resolved
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return InvoiceService.create_invoice(
            organization=request.user.organization,
            customer=validated_data["customer_obj"],
            user=request.user,
            lines=validated_data["resolved_lines"],
            due_date=validated_data.get("due_date"),
            issue_date=validated_data.get("issue_date"),
            notes=validated_data.get("notes", ""),
            tax_rate=validated_data.get("tax_rate") or Decimal("0.00"),
        )


class MarkPaidSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    method = serializers.CharField(required=False, allow_blank=True, default="other")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
