from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizationsettings",
            name="enable_push_notifications",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="session_timeout_minutes",
            field=models.PositiveIntegerField(default=60),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="jwt_access_minutes",
            field=models.PositiveIntegerField(default=60),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="jwt_refresh_days",
            field=models.PositiveIntegerField(default=7),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="remember_me_days",
            field=models.PositiveIntegerField(default=30),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="max_login_attempts",
            field=models.PositiveIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="lockout_duration_minutes",
            field=models.PositiveIntegerField(default=30),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="password_min_length",
            field=models.PositiveIntegerField(default=8),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="password_require_uppercase",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="password_require_lowercase",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="password_require_number",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="password_require_special",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="organizationsettings",
            name="extra_config",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
