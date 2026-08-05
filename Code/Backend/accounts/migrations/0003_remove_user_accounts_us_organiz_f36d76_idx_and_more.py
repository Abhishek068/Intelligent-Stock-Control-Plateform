

import accounts.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_iam_foundation'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('core', '0004_organizationsettings_expiry_alert_emails_and_more'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='user',
            name='accounts_us_organiz_f36d76_idx',
        ),
        migrations.AlterField(
            model_name='emailverificationtoken',
            name='token',
            field=models.CharField(default=accounts.models._token_default, max_length=128, unique=True),
        ),
        migrations.AlterField(
            model_name='passwordresettoken',
            name='token',
            field=models.CharField(default=accounts.models._token_default, max_length=128, unique=True),
        ),
        migrations.AddIndex(
            model_name='rolepermission',
            index=models.Index(fields=['role', 'module', 'action'], name='accounts_ro_role_id_ffa563_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['organization', 'status'], name='accounts_us_organiz_e54d76_idx'),
        ),
    ]
