from django.conf import settings
from django.db import models

from core.models import Organization


class ActivityEvent(models.Model):

    class EventType(models.TextChoices):
        USER_LOGIN = "user_login", "User Login"
        USER_LOGOUT = "user_logout", "User Logout"
        ROLE_UPDATED = "role_updated", "Role Updated"
        PERMISSION_CHANGED = "permission_changed", "Permission Changed"
        EMAIL_SENT = "email_sent", "Email Sent"
        NOTIFICATION_SENT = "notification_sent", "Notification Sent"
        PRODUCT_ADDED = "product_added", "Product Added"
        STOCK_IN = "stock_in", "Stock In"
        STOCK_OUT = "stock_out", "Stock Out"
        FORECAST_GENERATED = "forecast_generated", "Forecast Generated"
        USER_INVITED = "user_invited", "User Invited"
        PASSWORD_CHANGED = "password_changed", "Password Changed"
        SETTINGS_UPDATED = "settings_updated", "Settings Updated"
        SYSTEM = "system", "System"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="activity_events",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
    )
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id = models.CharField(max_length=50, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["event_type"]),
        ]

    def __str__(self):
        return self.title
