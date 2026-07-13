from decimal import Decimal



from django.core.validators import MinValueValidator

from django.db import models



from core.models import Organization, TimeStampedModel

from suppliers.models import Supplier





class Category(TimeStampedModel):

    organization = models.ForeignKey(

        Organization, on_delete=models.CASCADE, related_name="categories"

    )

    name = models.CharField(max_length=100)

    description = models.TextField(blank=True)



    class Meta:

        ordering = ["name"]

        unique_together = [("organization", "name")]



    def __str__(self):

        return self.name





class Location(TimeStampedModel):

    class LocationType(models.TextChoices):

        WAREHOUSE = "warehouse", "Warehouse"

        STORE = "store", "Store"

        OFFICE = "office", "Office"



    organization = models.ForeignKey(

        Organization, on_delete=models.CASCADE, related_name="locations"

    )

    name = models.CharField(max_length=150)

    location_type = models.CharField(

        max_length=20, choices=LocationType.choices, default=LocationType.WAREHOUSE

    )

    address = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)

    capacity = models.PositiveIntegerField(null=True, blank=True)



    class Meta:

        ordering = ["name"]

        unique_together = [("organization", "name")]



    def __str__(self):

        return self.name





class Product(TimeStampedModel):

    organization = models.ForeignKey(

        Organization, on_delete=models.CASCADE, related_name="products"

    )

    category = models.ForeignKey(

        Category, on_delete=models.PROTECT, related_name="products"

    )

    supplier = models.ForeignKey(

        Supplier, on_delete=models.PROTECT, related_name="products"

    )

    sku = models.CharField(max_length=50)

    name = models.CharField(max_length=255)

    description = models.TextField(blank=True)

    unit_price = models.DecimalField(

        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]

    )

    minimum_level = models.PositiveIntegerField(default=10)

    reorder_level = models.PositiveIntegerField(default=20)

    barcode = models.CharField(max_length=100, blank=True)

    qr_code = models.CharField(max_length=255, blank=True)

    is_active = models.BooleanField(default=True)



    class Meta:

        ordering = ["name"]

        unique_together = [("organization", "sku")]

        indexes = [

            models.Index(fields=["organization", "sku"]),

            models.Index(fields=["organization", "name"]),

        ]



    def __str__(self):

        return f"{self.sku} — {self.name}"





class InventoryBalance(TimeStampedModel):

    product = models.ForeignKey(

        Product, on_delete=models.CASCADE, related_name="inventory_balances"

    )

    location = models.ForeignKey(

        Location, on_delete=models.CASCADE, related_name="inventory_balances"

    )

    quantity_on_hand = models.PositiveIntegerField(default=0)

    reserved_qty = models.PositiveIntegerField(default=0)



    class Meta:

        unique_together = [("product", "location")]

        indexes = [

            models.Index(fields=["product", "location"]),

        ]



    def __str__(self):

        return f"{self.product.sku} @ {self.location.name}: {self.quantity_on_hand}"



    @property

    def available_quantity(self):

        return max(0, self.quantity_on_hand - self.reserved_qty)

