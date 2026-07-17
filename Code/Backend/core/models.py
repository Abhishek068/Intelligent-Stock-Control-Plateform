from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Organization(TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OrganizationSettings(TimeStampedModel):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    # General
    company_name = models.CharField(max_length=255, blank=True)
    company_address = models.TextField(blank=True)
    currency_code = models.CharField(max_length=3, default="GBP")
    # Inventory defaults
    default_minimum_level = models.PositiveIntegerField(default=10)
    default_reorder_level = models.PositiveIntegerField(default=20)
    # Notifications
    enable_predictive_alerts = models.BooleanField(default=True)
    enable_email_notifications = models.BooleanField(default=False)
    enable_push_notifications = models.BooleanField(default=False)
    # Forecast
    forecast_model = models.CharField(max_length=50, default="exponential_smoothing")
    forecast_horizon_days = models.PositiveIntegerField(default=30)
    # Authentication / Security
    session_timeout_minutes = models.PositiveIntegerField(default=60)
    jwt_access_minutes = models.PositiveIntegerField(default=60)
    jwt_refresh_days = models.PositiveIntegerField(default=7)
    remember_me_days = models.PositiveIntegerField(default=30)
    max_login_attempts = models.PositiveIntegerField(default=5)
    lockout_duration_minutes = models.PositiveIntegerField(default=30)
    password_min_length = models.PositiveIntegerField(default=8)
    password_require_uppercase = models.BooleanField(default=True)
    password_require_lowercase = models.BooleanField(default=True)
    password_require_number = models.BooleanField(default=True)
    password_require_special = models.BooleanField(default=False)
    # Extensible JSON for future sections
    extra_config = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Settings for {self.organization.name}"
