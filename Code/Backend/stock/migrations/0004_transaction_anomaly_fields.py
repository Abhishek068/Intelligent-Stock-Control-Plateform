from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("stock", "0003_stockintransaction_quantity_remaining_and_more")]

    operations = [
        migrations.AddField(
            model_name="stockadjustment",
            name="anomaly_score",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="stockadjustment",
            name="is_anomaly",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="stockouttransaction",
            name="anomaly_score",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="stockouttransaction",
            name="is_anomaly",
            field=models.BooleanField(default=False),
        ),
    ]
