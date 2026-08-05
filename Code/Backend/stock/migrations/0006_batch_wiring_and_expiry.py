

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("stock", "0005_batch_supplierreturn_supplierreturnline"),
        ("suppliers", "0002_supplier_performance_metrics"),
    ]

    operations = [
        migrations.AddField(
            model_name="batch",
            name="last_expiry_alert_at",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="batch",
            name="last_expiry_alert_band",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
        migrations.AlterField(
            model_name="batch",
            name="supplier",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="batches",
                to="suppliers.supplier",
            ),
        ),
        migrations.AddField(
            model_name="stockintransaction",
            name="batch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_in_transactions",
                to="stock.batch",
            ),
        ),
        migrations.AddField(
            model_name="stockouttransaction",
            name="batch",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_out_transactions",
                to="stock.batch",
            ),
        ),
        migrations.AddField(
            model_name="supplierreturn",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
