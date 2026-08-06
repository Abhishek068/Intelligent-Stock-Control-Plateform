from decimal import Decimal
import uuid



from django.conf import settings
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
    class ABCClass(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"


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
    abc_classification = models.CharField(
        max_length=1, choices=ABCClass.choices, blank=True
    )



    class Meta:

        ordering = ["name"]

        unique_together = [("organization", "sku")]

        indexes = [

            models.Index(fields=["organization", "sku"]),

            models.Index(fields=["organization", "name"]),

        ]



    def __str__(self):
        return f"{self.sku} — {self.name}"

    def save(self, *args, **kwargs):
        if not self.barcode and self.sku:
            import hashlib
           
            hash_int = int(hashlib.md5(self.sku.encode('utf-8')).hexdigest()[:10], 16)
            self.barcode = str(hash_int)[:12].zfill(12)
            
        changed_by = kwargs.pop("changed_by", None) or getattr(self, "_changed_by", None)
        if self.pk:
            try:
                original = Product.objects.get(pk=self.pk)
                diff = {}
                fields_to_track = [
                    "name",
                    "description",
                    "unit_price",
                    "minimum_level",
                    "reorder_level",
                    "is_active",
                ]
                for field in fields_to_track:
                    old_val = getattr(original, field)
                    new_val = getattr(self, field)
                    if old_val != new_val:
                        from decimal import Decimal
                        old_val_serial = float(old_val) if isinstance(old_val, Decimal) else old_val
                        new_val_serial = float(new_val) if isinstance(new_val, Decimal) else new_val
                        diff[field] = {"old": old_val_serial, "new": new_val_serial}
                if diff:
                    super().save(*args, **kwargs)
                    ProductChangeHistory.objects.create(
                        product=self, changed_by=changed_by, diff=diff
                    )
                    return
            except Product.DoesNotExist:
                pass
        super().save(*args, **kwargs)





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


class ProductChangeHistory(TimeStampedModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="change_histories"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_changes",
    )
    diff = models.JSONField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"History {self.product.sku} at {self.created_at}"


class ProductImportJob(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VALIDATING = "validating", "Validating"
        IMPORTING = "importing", "Importing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="product_import_jobs"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="product_import_jobs",
    )
    file = models.FileField(upload_to="product_imports/%Y/%m/%d/")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress = models.PositiveSmallIntegerField(default=0)
    total_rows = models.PositiveIntegerField(default=0)
    imported_count = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Product import {self.id} ({self.status})"

