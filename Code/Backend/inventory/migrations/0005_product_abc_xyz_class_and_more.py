
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_product_abc_classification'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='abc_xyz_class',
            field=models.CharField(default='AX', help_text='Combined ABC/XYZ Matrix Class (e.g. AX, CZ)', max_length=5),
        ),
        migrations.AddField(
            model_name='product',
            name='automated_reorder_policy',
            field=models.CharField(choices=[('automated', 'Automated Reordering'), ('review_required', 'Review Required'), ('manual', 'Manual Review / JIT')], default='automated', max_length=30),
        ),
        migrations.AddField(
            model_name='product',
            name='demand_coefficient_of_variation',
            field=models.DecimalField(decimal_places=4, default=Decimal('0.0000'), help_text='CV = StdDev / Mean demand', max_digits=6),
        ),
        migrations.AddField(
            model_name='product',
            name='demand_std_dev',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Standard deviation of daily demand', max_digits=8),
        ),
        migrations.AddField(
            model_name='product',
            name='dynamic_reorder_point',
            field=models.PositiveIntegerField(default=0, help_text='Stochastic Reorder Point = (Mean Daily Demand * Mean Lead Time) + Safety Stock'),
        ),
        migrations.AddField(
            model_name='product',
            name='lead_time_std_dev',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Standard deviation of supplier lead time (days)', max_digits=6),
        ),
        migrations.AddField(
            model_name='product',
            name='stochastic_safety_stock',
            field=models.PositiveIntegerField(default=0, help_text='Dynamic safety stock calculated via Stochastic Optimization'),
        ),
        migrations.AddField(
            model_name='product',
            name='target_service_level',
            field=models.DecimalField(decimal_places=2, default=Decimal('98.00'), help_text='Target non-stockout service level (e.g., 98.0%)', max_digits=5),
        ),
        migrations.AddField(
            model_name='product',
            name='xyz_classification',
            field=models.CharField(choices=[('X', 'X (Steady Demand)'), ('Y', 'Y (Variable Demand)'), ('Z', 'Z (Erratic Demand)')], default='X', max_length=1),
        ),
    ]
