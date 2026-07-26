from django.apps import AppConfig
from django.db.models.signals import post_migrate


def seed_default_users(sender, **kwargs):
    try:
        from accounts.models import Role, User
        from accounts.services import ensure_default_organization

        org = ensure_default_organization()
        staff_role = Role.objects.filter(organization=org, name="Staff").first()

        # 1. Remove Manager Account (user requested deletion)
        manager_email = "manager@stocksense.com"
        User.objects.filter(email=manager_email).delete()

        # 2. Seed Staff Account
        staff_email = "staff@stocksense.com"
        if not User.objects.filter(email=staff_email).exists():
            staff_user = User.objects.create(
                email=staff_email,
                username="staff",
                first_name="Warehouse",
                last_name="Staff",
                organization=org,
                status=User.Status.ACTIVE,
                is_active=True,
                must_change_password=False,
            )
            staff_user.set_password("StockSense2026!")
            staff_user.save()
            if staff_role:
                staff_user.roles.add(staff_role)

    except Exception:
        pass


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        post_migrate.connect(seed_default_users, sender=self)
