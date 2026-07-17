from rest_framework import serializers

from accounts.models import (
    Role,
    RolePermission,
    User,
    UserPermissionOverride,
    UserRole,
)
from core.models import OrganizationSettings


class RoleSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "is_system",
            "organization",
            "member_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "organization", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.users.count()


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ["id", "module", "action", "allowed"]


class UserPermissionOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPermissionOverride
        fields = ["id", "module", "action", "allowed", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Role.objects.all(), source="roles", write_only=True, required=False
    )
    permissions = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "display_name",
            "phone",
            "address",
            "department",
            "status",
            "must_change_password",
            "email_verified_at",
            "organization",
            "roles",
            "role_ids",
            "primary_role",
            "permissions",
            "is_superuser",
            "is_staff",
            "last_login",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "organization",
            "email_verified_at",
            "must_change_password",
            "is_superuser",
            "is_staff",
            "last_login",
            "date_joined",
        ]

    def get_permissions(self, obj):
        return obj.permission_map()

    def get_primary_role(self, obj):
        return obj.primary_role_name()


class UserListSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    roles = RoleSerializer(many=True, read_only=True)
    primary_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "display_name",
            "first_name",
            "last_name",
            "phone",
            "status",
            "roles",
            "primary_role",
            "must_change_password",
            "is_superuser",
            "last_login",
            "date_joined",
        ]

    def get_primary_role(self, obj):
        return obj.primary_role_name()


class InviteUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    role_id = serializers.IntegerField(required=False, allow_null=True)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(default=False, required=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = [
            "id",
            "default_minimum_level",
            "default_reorder_level",
            "enable_predictive_alerts",
            "enable_email_notifications",
            "enable_push_notifications",
            "forecast_model",
            "forecast_horizon_days",
            "company_name",
            "company_address",
            "currency_code",
            "session_timeout_minutes",
            "jwt_access_minutes",
            "jwt_refresh_days",
            "remember_me_days",
            "max_login_attempts",
            "lockout_duration_minutes",
            "password_min_length",
            "password_require_uppercase",
            "password_require_lowercase",
            "password_require_number",
            "password_require_special",
            "extra_config",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class PermissionMatrixSerializer(serializers.Serializer):
    permissions = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {module, action, allowed}",
    )
