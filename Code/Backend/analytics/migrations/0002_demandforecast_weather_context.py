
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='demandforecast',
            name='weather_context',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
