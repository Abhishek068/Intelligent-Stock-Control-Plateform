
import django.core.validators
import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("inventory", "0001_initial"),
        ("suppliers", "0001_initial"),
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PurchaseOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("po_number", models.CharField(max_length=40)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("sent", "Sent"),
                            ("partial", "Partially Received"),
                            ("received", "Received"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("expected_delivery", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "total_amount",
                    models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=14),
                ),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_orders",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "location",
                    models.ForeignKey(
                        blank=True,
                        help_text="Default receive-into location",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_orders",
                        to="inventory.location",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="purchase_orders",
                        to="core.organization",
                    ),
                ),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_orders",
                        to="suppliers.supplier",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("organization", "po_number")},
            },
        ),
        migrations.CreateModel(
            name="PurchaseOrderLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "quantity_ordered",
                    models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)]),
                ),
                ("quantity_received", models.PositiveIntegerField(default=0)),
                (
                    "unit_cost",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(Decimal("0"))],
                    ),
                ),
                ("notes", models.CharField(blank=True, max_length=255)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="purchase_order_lines",
                        to="inventory.product",
                    ),
                ),
                (
                    "purchase_order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="procurement.purchaseorder",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
