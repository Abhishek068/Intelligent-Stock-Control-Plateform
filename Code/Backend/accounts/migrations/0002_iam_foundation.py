import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def migrate_users_forward(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Role = apps.get_model("accounts", "Role")
    UserRole = apps.get_model("accounts", "UserRole")
    RolePermission = apps.get_model("accounts", "RolePermission")
    Organization = apps.get_model("core", "Organization")

    manager_defaults = {
        "dashboard": ["view"],
        "users": ["view"],
        "roles": ["view"],
        "products": ["view", "create", "edit", "delete", "export"],
        "categories": ["view", "create", "edit", "delete"],
        "suppliers": ["view", "create", "edit", "delete"],
        "stock_in": ["view", "create", "edit", "export"],
        "stock_out": ["view", "create", "edit", "export"],
        "adjustments": ["view", "create", "approve"],
        "transfers": ["view", "create", "approve"],
        "forecasting": ["view", "manage", "export"],
        "alerts": ["view", "manage"],
        "reports": ["view", "export", "manage"],
        "audit": ["view", "export"],
        "settings": ["view"],
        "notifications": ["view", "manage"],
        "emails": ["view"],
    }
    staff_defaults = {
        "dashboard": ["view"],
        "products": ["view"],
        "categories": ["view"],
        "suppliers": ["view"],
        "stock_in": ["view", "create"],
        "stock_out": ["view", "create"],
        "adjustments": ["view"],
        "transfers": ["view"],
        "forecasting": ["view"],
        "alerts": ["view"],
        "reports": ["view"],
        "notifications": ["view"],
    }

    orgs = list(Organization.objects.all())
    if not orgs:
        return

    for org in orgs:
        manager, _ = Role.objects.get_or_create(
            organization_id=org.id,
            name="Manager",
            defaults={"description": "Operations manager", "is_system": True},
        )
        staff, _ = Role.objects.get_or_create(
            organization_id=org.id,
            name="Staff",
            defaults={"description": "Operational staff", "is_system": True},
        )
        for module, actions in manager_defaults.items():
            for action in actions:
                RolePermission.objects.get_or_create(
                    role=manager, module=module, action=action, defaults={"allowed": True}
                )
        for module, actions in staff_defaults.items():
            for action in actions:
                RolePermission.objects.get_or_create(
                    role=staff, module=module, action=action, defaults={"allowed": True}
                )

        for user in User.objects.filter(organization_id=org.id):
            old_role = getattr(user, "role", "staff") or "staff"
            if user.is_superuser:
                user.status = "active"
                user.save(update_fields=["status"])
                continue
            target = manager if old_role in ("admin", "manager") else staff
            UserRole.objects.get_or_create(user=user, role=target)
            if old_role == "admin" and not user.is_superuser:
                # Former app-admins become Managers unless already superuser
                pass
            user.status = "active" if user.is_active else "inactive"
            user.save(update_fields=["status"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="roles", to="core.organization")),
            ],
            options={"ordering": ["name"], "unique_together": {("organization", "name")}},
        ),
        migrations.AddField(
            model_name="user",
            name="address",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="user",
            name="email_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="failed_login_attempts",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="user",
            name="locked_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="must_change_password",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="user",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending_verification", "Pending Verification"),
                    ("verified", "Verified"),
                    ("active", "Active"),
                    ("inactive", "Inactive"),
                    ("suspended", "Suspended"),
                    ("archived", "Archived"),
                ],
                default="pending_verification",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="invited_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invited_users", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name="user",
            name="organization",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="users", to="core.organization"),
        ),
        migrations.CreateModel(
            name="UserRole",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                ("assigned_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="role_assignments_made", to=settings.AUTH_USER_MODEL)),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.role")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("user", "role")}},
        ),
        migrations.AddField(
            model_name="user",
            name="roles",
            field=models.ManyToManyField(
                blank=True,
                related_name="users",
                through="accounts.UserRole",
                through_fields=("user", "role"),
                to="accounts.role",
            ),
        ),
        migrations.CreateModel(
            name="RolePermission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("module", models.CharField(max_length=50)),
                ("action", models.CharField(max_length=30)),
                ("allowed", models.BooleanField(default=True)),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="permissions", to="accounts.role")),
            ],
            options={"unique_together": {("role", "module", "action")}},
        ),
        migrations.CreateModel(
            name="UserPermissionOverride",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("module", models.CharField(max_length=50)),
                ("action", models.CharField(max_length=30)),
                ("allowed", models.BooleanField(default=True)),
                ("reason", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="overrides_created", to=settings.AUTH_USER_MODEL)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="permission_overrides", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("user", "module", "action")}},
        ),
        migrations.CreateModel(
            name="EmailVerificationToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=128, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="verification_tokens", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="PasswordResetToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=128, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reset_tokens", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(migrate_users_forward, migrations.RunPython.noop),
        migrations.RemoveField(model_name="user", name="role"),
        migrations.AlterModelOptions(name="user", options={"ordering": ["email"]}),
    ]
