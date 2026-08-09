from decimal import Decimal



from django.core.validators import MinValueValidator

from django.db import models



from inventory.models import Product





class DemandForecast(models.Model):

    product = models.ForeignKey(

        Product, on_delete=models.CASCADE, related_name="demand_forecasts"

    )

    forecast_period_start = models.DateField()

    forecast_period_end = models.DateField()

    predicted_demand = models.DecimalField(max_digits=12, decimal_places=2)

    model_name = models.CharField(max_length=150)

    mae = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    rmse = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    mape = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)

    generated_at = models.DateTimeField(auto_now_add=True)

    weather_context = models.JSONField(default=dict, blank=True)


    class Meta:

        ordering = ["-generated_at"]



    def __str__(self):

        return f"Forecast {self.product.sku} ({self.forecast_period_start})"





class ReorderRecommendation(models.Model):

    class Priority(models.TextChoices):

        CRITICAL = "Critical", "Critical"

        HIGH = "High", "High"

        MEDIUM = "Medium", "Medium"

        LOW = "Low", "Low"



    product = models.ForeignKey(

        Product, on_delete=models.CASCADE, related_name="reorder_recommendations"

    )

    current_stock = models.PositiveIntegerField()

    lead_time_days = models.PositiveIntegerField()

    predicted_demand = models.DecimalField(max_digits=12, decimal_places=2)

    reorder_point = models.PositiveIntegerField()

    suggested_quantity = models.PositiveIntegerField()

    priority = models.CharField(max_length=20, choices=Priority.choices)

    stockout_risk = models.DecimalField(

        max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]

    )

    explanation_json = models.JSONField(default=dict)

    generated_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)



    class Meta:

        ordering = ["-generated_at"]



    def __str__(self):

        return f"Reorder {self.product.sku} qty={self.suggested_quantity}"





class PredictiveAlert(models.Model):

    class Severity(models.TextChoices):

        CRITICAL = "critical", "Critical"

        WARNING = "warning", "Warning"



    product = models.ForeignKey(

        Product, on_delete=models.CASCADE, related_name="predictive_alerts"

    )

    predicted_stockout_date = models.DateField()

    threshold_date = models.DateField()

    severity = models.CharField(max_length=20, choices=Severity.choices)

    explanation_json = models.JSONField(default=dict)

    is_resolved = models.BooleanField(default=False)

    generated_at = models.DateTimeField(auto_now_add=True)



    class Meta:

        ordering = ["-generated_at"]



    def __str__(self):

        return f"Predictive alert {self.product.sku} @ {self.predicted_stockout_date}"

