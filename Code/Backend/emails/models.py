from django.conf import settings
from django.db import models

from core.models import Organization, TimeStampedModel


class EmailProviderConfig(TimeStampedModel):
    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="email_config"
    )
    provider = models.CharField(max_length=50, default="brevo")
    api_key = models.CharField(max_length=255, blank=True)
    sender_email = models.EmailField(blank=True)
    sender_name = models.CharField(max_length=255, blank=True)
    reply_to = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    environment = models.CharField(max_length=20, default="development")

    def __str__(self):
        return f"Email config ({self.provider}) — {self.organization.name}"


class EmailTemplate(TimeStampedModel):
    class TemplateKey(models.TextChoices):
        VERIFICATION = "verification", "Email Verification"
        WELCOME = "welcome", "Welcome"
        PASSWORD_RESET = "password_reset", "Password Reset"
        PASSWORD_CHANGED = "password_changed", "Password Changed"
        DAILY_REPORT = "daily_report", "Daily Report"
        LOW_STOCK = "low_stock", "Low Stock"
        FORECAST = "forecast", "Forecast"
        REORDER = "reorder", "Reorder"
        NOTIFICATION = "notification", "Notification"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="email_templates",
        null=True,
        blank=True,
    )
    key = models.CharField(max_length=50, choices=TemplateKey.choices)
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("organization", "key")]

    def __str__(self):
        return f"{self.key} — {self.subject}"


class EmailQueue(TimeStampedModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        RETRY = "retry", "Retry"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="email_queue",
        null=True,
        blank=True,
    )
    template_key = models.CharField(max_length=50, blank=True)
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.QUEUED
    )
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)
    error_message = models.TextField(blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    context_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]


class EmailLog(models.Model):
    queue_item = models.ForeignKey(
        EmailQueue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="email_logs",
        null=True,
        blank=True,
    )
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=20)
    provider_response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ScheduledReport(TimeStampedModel):
    class Frequency(models.TextChoices):
        EVERY_5_MIN = "every_5_min", "Every 5 Minutes"
        HOURLY = "hourly", "Hourly"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    class ReportType(models.TextChoices):
        INVENTORY = "inventory", "Inventory"
        STOCK_IN = "stock_in", "Stock In"
        STOCK_OUT = "stock_out", "Stock Out"
        LOW_STOCK = "low_stock", "Low Stock"
        FORECAST = "forecast", "Forecast"
        REORDER = "reorder", "Reorder"
        AUDIT = "audit", "Audit"

    class Delivery(models.TextChoices):
        EMAIL = "email", "Email"
        NOTIFICATION = "notification", "Notification"
        BOTH = "both", "Both"

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="scheduled_reports"
    )
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=30, choices=ReportType.choices)
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    delivery = models.CharField(
        max_length=20, choices=Delivery.choices, default=Delivery.EMAIL
    )
    recipient_user_ids = models.JSONField(default=list, blank=True)
    recipient_role_ids = models.JSONField(default=list, blank=True)
    recipient_emails = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_reports_created",
    )

    class Meta:
        ordering = ["name"]
