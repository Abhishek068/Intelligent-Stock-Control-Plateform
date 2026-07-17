import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from core.models import Organization


class User(AbstractUser):
    class Status(models.TextChoices):
        PENDING_VERIFICATION = "pending_verification", "Pending Verification"
        VERIFIED = "verified", "Verified"
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"
        ARCHIVED = "archived", "Archived"

    email = models.EmailField(unique=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    department = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_VERIFICATION,
    )
    must_change_password = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    invited_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invited_users",
    )
    roles = models.ManyToManyField(
        "Role",
        through="UserRole",
        through_fields=("user", "role"),
        related_name="users",
        blank=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        ordering = ["email"]
        indexes = [
            models.Index(fields=["organization", "status"]),
        ]

    def __str__(self):
        return self.email

    @property
    def display_name(self):
        full = self.get_full_name().strip()
        return full or self.email

    @property
    def is_locked(self):
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def primary_role_name(self):
        if self.is_superuser:
            return "Super Admin"
        role = self.roles.first()
        return role.name if role else "Staff"

    def has_module_permission(self, module: str, action: str) -> bool:
        if self.is_superuser:
            return True
        if self.status != self.Status.ACTIVE:
            return False

        override = self.permission_overrides.filter(
            module=module, action=action
        ).first()
        if override is not None:
            return override.allowed

        return RolePermission.objects.filter(
            role__in=self.roles.all(),
            module=module,
            action=action,
            allowed=True,
        ).exists()

    def permission_map(self) -> dict:
        """Return {module: [actions]} effective permissions."""
        if self.is_superuser:
            from accounts.permissions_catalog import ACTION_CODES, MODULE_CODES

            return {m: list(ACTION_CODES) for m in MODULE_CODES}

        result = {}
        for rp in RolePermission.objects.filter(
            role__in=self.roles.all(), allowed=True
        ):
            result.setdefault(rp.module, set()).add(rp.action)

        for ov in self.permission_overrides.all():
            actions = result.setdefault(ov.module, set())
            if ov.allowed:
                actions.add(ov.action)
            else:
                actions.discard(ov.action)

        return {k: sorted(v) for k, v in result.items()}


class Role(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="roles",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("organization", "name")]

    def __str__(self):
        return self.name

    def clone(self, new_name: str | None = None):
        clone_name = new_name or f"{self.name} (Copy)"
        cloned = Role.objects.create(
            organization=self.organization,
            name=clone_name,
            description=self.description,
            is_system=False,
        )
        for rp in self.permissions.all():
            RolePermission.objects.create(
                role=cloned,
                module=rp.module,
                action=rp.action,
                allowed=rp.allowed,
            )
        return cloned


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="role_assignments_made",
    )

    class Meta:
        unique_together = [("user", "role")]


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="permissions")
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=30)
    allowed = models.BooleanField(default=True)

    class Meta:
        unique_together = [("role", "module", "action")]
        indexes = [models.Index(fields=["role", "module", "action"])]


class UserPermissionOverride(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="permission_overrides"
    )
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=30)
    allowed = models.BooleanField(default=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="overrides_created",
    )

    class Meta:
        unique_together = [("user", "module", "action")]


def _token_default():
    return secrets.token_urlsafe(48)


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="verification_tokens"
    )
    token = models.CharField(max_length=128, unique=True, default=_token_default)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="reset_tokens"
    )
    token = models.CharField(max_length=128, unique=True, default=_token_default)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()
