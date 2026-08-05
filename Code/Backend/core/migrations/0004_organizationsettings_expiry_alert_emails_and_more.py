

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_organizationsettings_valuation_method"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizationsettings",
            name="expiry_alert_emails",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="expiry_alert_user_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
