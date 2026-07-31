from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0002_settings_security")]

    operations = [
        migrations.AddField(
            model_name="organizationsettings",
            name="valuation_method",
            field=models.CharField(
                choices=[
                    ("fifo", "FIFO"),
                    ("lifo", "LIFO"),
                    ("weighted_average", "Weighted average"),
                ],
                default="fifo",
                max_length=20,
            ),
        )
    ]
