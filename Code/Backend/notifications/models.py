from django.conf import settings

from django.db import models





class Notification(models.Model):

    class NotificationType(models.TextChoices):

        LOW_STOCK = "low_stock", "Low Stock"

        OUT_OF_STOCK = "out_of_stock", "Out of Stock"

        PREDICTIVE = "predictive", "Predictive Stockout"

        EXPIRY = "expiry", "Expiry"

        ANOMALY = "anomaly", "Anomaly"

        SYSTEM = "system", "System"



    class Severity(models.TextChoices):

        CRITICAL = "critical", "Critical"

        WARNING = "warning", "Warning"

        INFO = "info", "Info"



    user = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.CASCADE,

        related_name="notifications",

        null=True,

        blank=True,

    )

    organization = models.ForeignKey(

        "core.Organization",

        on_delete=models.CASCADE,

        related_name="notifications",

    )

    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)

    title = models.CharField(max_length=255)

    message = models.TextField()

    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.WARNING)

    related_entity_type = models.CharField(max_length=50, blank=True)

    related_entity_id = models.CharField(max_length=50, blank=True)

    explanation_json = models.JSONField(null=True, blank=True)

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)



    class Meta:

        ordering = ["-created_at"]

        indexes = [

            models.Index(fields=["organization", "is_read", "severity"]),

        ]



    def __str__(self):

        return self.title

