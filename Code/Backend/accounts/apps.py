from django.apps import AppConfig
from django.db.models.signals import post_migrate


def seed_default_users(sender, **kwargs):
    try:
        from accounts.models import User
        User.objects.filter(email="manager@stocksense.com").delete()
        User.objects.filter(email="staff@stocksense.com").delete()
    except Exception:
        pass


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        post_migrate.connect(seed_default_users, sender=self)
