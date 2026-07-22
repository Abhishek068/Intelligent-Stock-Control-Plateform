from django.apps import AppConfig





class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        import sys
        if 'migrate' in sys.argv or 'makemigrations' in sys.argv:
            return

        try:
            from accounts.models import User, Role
            from core.models import Organization
            from accounts.services import ensure_default_organization

            org = ensure_default_organization()
            manager_role = Role.objects.filter(organization=org, name="Manager").first()
            staff_role = Role.objects.filter(organization=org, name="Staff").first()

            # 1. Seed Manager Account
            manager_email = "manager@stocksense.com"
            if not User.objects.filter(email=manager_email).exists():
                manager_user = User.objects.create(
                    email=manager_email,
                    username="manager",
                    first_name="Operations",
                    last_name="Manager",
                    organization=org,
                    status=User.Status.ACTIVE,
                    is_active=True,
                    must_change_password=False,
                )
                manager_user.set_password("StockSense2026!")
                manager_user.save()
                if manager_role:
                    manager_user.roles.add(manager_role)
                print(f"--- AUTO-SEED: Created {manager_email} / StockSense2026! ---")

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
                print(f"--- AUTO-SEED: Created {staff_email} / StockSense2026! ---")

        except Exception:
            pass

