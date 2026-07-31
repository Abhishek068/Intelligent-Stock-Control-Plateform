from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("suppliers", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="delivery_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="supplier",
            name="order_accuracy",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="supplier",
            name="performance_score",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="supplier",
            name="performance_breakdown",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
