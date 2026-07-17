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
            name="EmailProviderConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("provider", models.CharField(default="brevo", max_length=50)),
                ("api_key", models.CharField(blank=True, max_length=255)),
                ("sender_email", models.EmailField(blank=True, max_length=254)),
                ("sender_name", models.CharField(blank=True, max_length=255)),
                ("reply_to", models.EmailField(blank=True, max_length=254)),
                ("is_active", models.BooleanField(default=True)),
                ("environment", models.CharField(default="development", max_length=20)),
                ("organization", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="email_config", to="core.organization")),
            ],
        ),
        migrations.CreateModel(
            name="EmailTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.CharField(choices=[("verification", "Email Verification"), ("welcome", "Welcome"), ("password_reset", "Password Reset"), ("password_changed", "Password Changed"), ("daily_report", "Daily Report"), ("low_stock", "Low Stock"), ("forecast", "Forecast"), ("reorder", "Reorder"), ("notification", "Notification")], max_length=50)),
                ("subject", models.CharField(max_length=255)),
                ("body_html", models.TextField()),
                ("body_text", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("organization", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="email_templates", to="core.organization")),
            ],
            options={"unique_together": {("organization", "key")}},
        ),
        migrations.CreateModel(
            name="EmailQueue",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("template_key", models.CharField(blank=True, max_length=50)),
                ("recipient", models.EmailField(max_length=254)),
                ("subject", models.CharField(max_length=255)),
                ("body_html", models.TextField()),
                ("body_text", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("processing", "Processing"), ("sent", "Sent"), ("failed", "Failed"), ("retry", "Retry")], default="queued", max_length=20)),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("max_attempts", models.PositiveIntegerField(default=3)),
                ("error_message", models.TextField(blank=True)),
                ("scheduled_at", models.DateTimeField(blank=True, null=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("context_json", models.JSONField(blank=True, default=dict)),
                ("organization", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="email_queue", to="core.organization")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="EmailLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recipient", models.EmailField(max_length=254)),
                ("subject", models.CharField(max_length=255)),
                ("status", models.CharField(max_length=20)),
                ("provider_response", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("organization", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="email_logs", to="core.organization")),
                ("queue_item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="logs", to="emails.emailqueue")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ScheduledReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("report_type", models.CharField(choices=[("inventory", "Inventory"), ("stock_in", "Stock In"), ("stock_out", "Stock Out"), ("low_stock", "Low Stock"), ("forecast", "Forecast"), ("reorder", "Reorder"), ("audit", "Audit")], max_length=30)),
                ("frequency", models.CharField(choices=[("every_5_min", "Every 5 Minutes"), ("hourly", "Hourly"), ("daily", "Daily"), ("weekly", "Weekly"), ("monthly", "Monthly")], max_length=20)),
                ("delivery", models.CharField(choices=[("email", "Email"), ("notification", "Notification"), ("both", "Both")], default="email", max_length=20)),
                ("recipient_user_ids", models.JSONField(blank=True, default=list)),
                ("recipient_role_ids", models.JSONField(blank=True, default=list)),
                ("recipient_emails", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
                ("last_run_at", models.DateTimeField(blank=True, null=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="scheduled_reports_created", to=settings.AUTH_USER_MODEL)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scheduled_reports", to="core.organization")),
            ],
            options={"ordering": ["name"]},
        ),
    ]
