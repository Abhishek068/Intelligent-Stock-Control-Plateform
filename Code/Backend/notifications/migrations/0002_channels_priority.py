import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="channel",
            field=models.CharField(choices=[("in_app", "In-App"), ("email", "Email"), ("push", "Push")], default="in_app", max_length=20),
        ),
        migrations.AddField(
            model_name="notification",
            name="priority",
            field=models.CharField(choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")], default="normal", max_length=20),
        ),
        migrations.AddField(
            model_name="notification",
            name="expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(choices=[("low_stock", "Low Stock"), ("out_of_stock", "Out of Stock"), ("predictive", "Predictive Stockout"), ("expiry", "Expiry"), ("anomaly", "Anomaly"), ("system", "System"), ("iam", "Identity & Access"), ("report", "Report")], max_length=30),
        ),
        migrations.CreateModel(
            name="DeviceToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=512)),
                ("platform", models.CharField(default="web", max_length=30)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="device_tokens", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("user", "token")}},
        ),
    ]
