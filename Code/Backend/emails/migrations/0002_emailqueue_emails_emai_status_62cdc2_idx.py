
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_settings_security'),
        ('emails', '0001_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='emailqueue',
            index=models.Index(fields=['status', 'created_at'], name='emails_emai_status_62cdc2_idx'),
        ),
    ]
