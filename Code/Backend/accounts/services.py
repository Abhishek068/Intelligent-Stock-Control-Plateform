import re
import secrets
import string
from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone

from accounts.models import (
    EmailVerificationToken,
    PasswordResetToken,
    Role,
    RolePermission,
    User,
)
from accounts.permissions_catalog import MANAGER_DEFAULTS, STAFF_DEFAULTS
from core.models import Organization, OrganizationSettings
from emails.services import ensure_default_templates, queue_email


FRONTEND_BASE_URL = None


def get_frontend_url():
    from django.conf import settings

    return getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")


def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_org_settings(user_or_org):
    org = user_or_org if isinstance(user_or_org, Organization) else getattr(
        user_or_org, "organization", None
    )
    if not org:
        return None
    settings_obj, _ = OrganizationSettings.objects.get_or_create(organization=org)
    return settings_obj


def validate_password_policy(password: str, user=None, org_settings=None):
    errors = []
    min_len = 8
    require_upper = True
    require_lower = True
    require_number = True
    require_special = False
    if org_settings:
        min_len = org_settings.password_min_length
        require_upper = org_settings.password_require_uppercase
        require_lower = org_settings.password_require_lowercase
        require_number = org_settings.password_require_number
        require_special = org_settings.password_require_special

    if len(password) < min_len:
        errors.append(f"Password must be at least {min_len} characters.")
    if require_upper and not re.search(r"[A-Z]", password):
        errors.append("Password must include an uppercase letter.")
    if require_lower and not re.search(r"[a-z]", password):
        errors.append("Password must include a lowercase letter.")
    if require_number and not re.search(r"\d", password):
        errors.append("Password must include a number.")
    if require_special and not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must include a special character.")

    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        errors.extend(list(exc.messages))

    if errors:
        raise ValidationError(errors)


def seed_system_roles(organization: Organization):
    manager, _ = Role.objects.get_or_create(
        organization=organization,
        name="Manager",
        defaults={
            "description": "Operations manager with elevated inventory access",
            "is_system": True,
        },
    )
    staff, _ = Role.objects.get_or_create(
        organization=organization,
        name="Staff",
        defaults={
            "description": "Warehouse and operational staff",
            "is_system": True,
        },
    )
    _apply_defaults(manager, MANAGER_DEFAULTS)
    _apply_defaults(staff, STAFF_DEFAULTS)
    ensure_default_templates(organization)
    ensure_default_templates(None)
    return manager, staff


def _apply_defaults(role: Role, defaults: dict):
    for module, actions in defaults.items():
        for action in actions:
            RolePermission.objects.get_or_create(
                role=role,
                module=module,
                action=action,
                defaults={"allowed": True},
            )


def ensure_default_organization():
    org, created = Organization.objects.get_or_create(
        slug="stocksense",
        defaults={"name": "StockSense", "is_active": True},
    )
    OrganizationSettings.objects.get_or_create(organization=org)
    seed_system_roles(org)
    return org


def create_verification_token(user: User) -> EmailVerificationToken:
    EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    return EmailVerificationToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=48),
    )


def create_reset_token(user: User) -> PasswordResetToken:
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    return PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=1),
    )


def invite_user(
    *,
    email: str,
    first_name: str,
    last_name: str,
    phone: str = "",
    address: str = "",
    role: Role | None = None,
    invited_by: User,
    organization: Organization | None = None,
) -> User:
    org = organization or invited_by.organization or ensure_default_organization()
    username = email.split("@")[0][:140]
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    user = User.objects.create(
        email=email.lower().strip(),
        username=username,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        address=address,
        organization=org,
        status=User.Status.PENDING_VERIFICATION,
        is_active=True,
        invited_by=invited_by,
    )
    user.set_unusable_password()
    user.save()

    if role:
        user.roles.add(role)

    token = create_verification_token(user)
    verify_url = f"{get_frontend_url()}/verify-email?token={token.token}"
    queue_email(
        recipient=user.email,
        template_key="verification",
        context={
            "name": user.display_name,
            "verify_url": verify_url,
        },
        organization=org,
    )

    from activity.services import record_activity

    record_activity(
        organization=org,
        user=invited_by,
        event_type="user_invited",
        title=f"Invited {user.email}",
        description=f"User invitation sent to {user.email}",
        entity_type="User",
        entity_id=user.id,
    )
    return user


def complete_email_verification(token_str: str) -> User:
    token = EmailVerificationToken.objects.select_related("user").get(token=token_str)
    if not token.is_valid():
        raise ValidationError("Verification link is invalid or expired.")

    user = token.user
    temp_password = generate_temp_password()
    user.set_password(temp_password)
    user.status = User.Status.VERIFIED
    user.email_verified_at = timezone.now()
    user.must_change_password = True
    user.save(
        update_fields=[
            "password",
            "status",
            "email_verified_at",
            "must_change_password",
        ]
    )
    token.used_at = timezone.now()
    token.save(update_fields=["used_at"])

    queue_email(
        recipient=user.email,
        template_key="welcome",
        context={
            "name": user.display_name,
            "temp_password": temp_password,
            "login_url": f"{get_frontend_url()}/login",
        },
        organization=user.organization,
    )
    return user


def register_failed_login(user: User):
    settings_obj = get_org_settings(user)
    max_attempts = settings_obj.max_login_attempts if settings_obj else 5
    lockout_mins = settings_obj.lockout_duration_minutes if settings_obj else 30

    user.failed_login_attempts += 1
    update_fields = ["failed_login_attempts"]
    if user.failed_login_attempts >= max_attempts:
        user.locked_until = timezone.now() + timedelta(minutes=lockout_mins)
        update_fields.append("locked_until")
    user.save(update_fields=update_fields)


def clear_failed_logins(user: User):
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=["failed_login_attempts", "locked_until"])
