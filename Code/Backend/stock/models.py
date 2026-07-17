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


class StockTake(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    organization = models.ForeignKey(
        "core.Organization", on_delete=models.CASCADE, related_name="stock_takes"
    )
    location = models.ForeignKey(
        Location, on_delete=models.PROTECT, related_name="stock_takes"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    scheduled_date = models.DateField()
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_stock_takes",
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_takes_created",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-scheduled_date", "-created_at"]

    def __str__(self):
        return f"ST {self.location.name} {self.scheduled_date} ({self.status})"

    @property
    def expected_items(self):
        return self.lines.count()

    @property
    def counted_items(self):
        return self.lines.exclude(counted_qty__isnull=True).count()

    @property
    def variance_items(self):
        return sum(1 for line in self.lines.all() if line.has_variance)


class StockTakeLine(TimeStampedModel):
    stock_take = models.ForeignKey(
        StockTake, on_delete=models.CASCADE, related_name="lines"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="stock_take_lines"
    )
    system_qty = models.PositiveIntegerField(default=0)
    counted_qty = models.PositiveIntegerField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    adjustment = models.ForeignKey(
        StockAdjustment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_take_lines",
    )

    class Meta:
        ordering = ["product__name"]
        unique_together = [("stock_take", "product")]

    @property
    def variance(self):
        if self.counted_qty is None:
            return None
        return int(self.counted_qty) - int(self.system_qty)

    @property
    def has_variance(self):
        v = self.variance
        return v is not None and v != 0

