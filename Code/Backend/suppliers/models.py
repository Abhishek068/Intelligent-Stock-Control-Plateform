from django.db import models



from core.models import Organization, TimeStampedModel





class Supplier(TimeStampedModel):

    class Status(models.TextChoices):

        ACTIVE = "active", "Active"

        INACTIVE = "inactive", "Inactive"



    organization = models.ForeignKey(

        Organization, on_delete=models.CASCADE, related_name="suppliers"

    )

    name = models.CharField(max_length=255)

    contact_name = models.CharField(max_length=150, blank=True)

    email = models.EmailField(blank=True)

    phone = models.CharField(max_length=30, blank=True)

    address = models.TextField(blank=True)

    lead_time_days = models.PositiveIntegerField(default=7)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    delivery_reliability = models.DecimalField(max_digits=5, decimal_places=2, default=90.0)
    delivery_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    order_accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    performance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    performance_breakdown = models.JSONField(default=dict, blank=True)



    class Meta:

        ordering = ["name"]

        unique_together = [("organization", "name")]



    def __str__(self):

        return self.name

