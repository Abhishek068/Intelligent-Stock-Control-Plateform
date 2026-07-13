from decimal import Decimal



from django.conf import settings

from django.core.validators import MinValueValidator

from django.db import models



from core.models import TimeStampedModel

from inventory.models import Location, Product

from suppliers.models import Supplier





class StockInTransaction(TimeStampedModel):

    product = models.ForeignKey(

        Product, on_delete=models.PROTECT, related_name="stock_in_transactions"

    )

    supplier = models.ForeignKey(

        Supplier, on_delete=models.PROTECT, related_name="stock_in_transactions"

    )

    location = models.ForeignKey(

        Location, on_delete=models.PROTECT, related_name="stock_in_transactions"

    )

    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    unit_cost = models.DecimalField(

        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))], default=0

    )

    reference = models.CharField(max_length=100, blank=True)

    notes = models.TextField(blank=True)

    received_at = models.DateTimeField()

    created_by = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.PROTECT,

        related_name="stock_in_transactions",

    )



    class Meta:

        ordering = ["-received_at"]



    def __str__(self):

        return f"IN {self.product.sku} +{self.quantity}"





class StockOutTransaction(TimeStampedModel):

    product = models.ForeignKey(

        Product, on_delete=models.PROTECT, related_name="stock_out_transactions"

    )

    location = models.ForeignKey(

        Location, on_delete=models.PROTECT, related_name="stock_out_transactions"

    )

    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    issued_to = models.CharField(max_length=255, blank=True)

    reference = models.CharField(max_length=100, blank=True)

    notes = models.TextField(blank=True)

    issued_at = models.DateTimeField()

    created_by = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.PROTECT,

        related_name="stock_out_transactions",

    )



    class Meta:

        ordering = ["-issued_at"]



    def __str__(self):

        return f"OUT {self.product.sku} -{self.quantity}"





class StockAdjustment(TimeStampedModel):

    product = models.ForeignKey(

        Product, on_delete=models.PROTECT, related_name="stock_adjustments"

    )

    location = models.ForeignKey(

        Location, on_delete=models.PROTECT, related_name="stock_adjustments"

    )

    previous_qty = models.PositiveIntegerField()

    adjusted_qty = models.PositiveIntegerField()

    reason = models.TextField()

    adjusted_at = models.DateTimeField()

    created_by = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.PROTECT,

        related_name="stock_adjustments",

    )



    class Meta:

        ordering = ["-adjusted_at"]



    def __str__(self):

        return f"ADJ {self.product.sku} {self.previous_qty}→{self.adjusted_qty}"





class StockTransfer(TimeStampedModel):

    class Status(models.TextChoices):

        DRAFT = "draft", "Draft"

        IN_TRANSIT = "in_transit", "In Transit"

        COMPLETED = "completed", "Completed"

        CANCELLED = "cancelled", "Cancelled"



    product = models.ForeignKey(

        Product, on_delete=models.PROTECT, related_name="stock_transfers"

    )

    source_location = models.ForeignKey(

        Location, on_delete=models.PROTECT, related_name="transfers_out"

    )

    destination_location = models.ForeignKey(

        Location, on_delete=models.PROTECT, related_name="transfers_in"

    )

    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    notes = models.TextField(blank=True)

    transferred_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.PROTECT,

        related_name="stock_transfers",

    )



    class Meta:

        ordering = ["-created_at"]



    def __str__(self):

        return f"XFER {self.product.sku} {self.quantity} ({self.status})"

