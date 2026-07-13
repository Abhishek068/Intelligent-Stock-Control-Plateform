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

    default_minimum_level = models.PositiveIntegerField(default=10)

    default_reorder_level = models.PositiveIntegerField(default=20)

    enable_predictive_alerts = models.BooleanField(default=True)

    enable_email_notifications = models.BooleanField(default=False)

    forecast_model = models.CharField(max_length=50, default="exponential_smoothing")

    forecast_horizon_days = models.PositiveIntegerField(default=30)

    company_name = models.CharField(max_length=255, blank=True)

    company_address = models.TextField(blank=True)

    currency_code = models.CharField(max_length=3, default="GBP")



    def __str__(self):

        return f"Settings for {self.organization.name}"

