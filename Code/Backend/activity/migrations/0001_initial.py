import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(choices=[("user_login", "User Login"), ("user_logout", "User Logout"), ("role_updated", "Role Updated"), ("permission_changed", "Permission Changed"), ("email_sent", "Email Sent"), ("notification_sent", "Notification Sent"), ("product_added", "Product Added"), ("stock_in", "Stock In"), ("stock_out", "Stock Out"), ("forecast_generated", "Forecast Generated"), ("user_invited", "User Invited"), ("password_changed", "Password Changed"), ("settings_updated", "Settings Updated"), ("system", "System")], max_length=50)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("entity_type", models.CharField(blank=True, max_length=50)),
                ("entity_id", models.CharField(blank=True, max_length=50)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("organization", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="activity_events", to="core.organization")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="activity_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
