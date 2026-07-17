from django.contrib import admin

from accounts.models import (
    EmailVerificationToken,
    PasswordResetToken,
    Role,
    RolePermission,
    User,
    UserPermissionOverride,
    UserRole,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "status", "is_superuser", "organization", "is_active")
    list_filter = ("status", "is_superuser", "is_active")
    search_fields = ("email", "first_name", "last_name")
    filter_horizontal = ("groups", "user_permissions")
    raw_id_fields = ("organization", "invited_by")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "is_system")
    search_fields = ("name",)


admin.site.register(RolePermission)
admin.site.register(UserRole)
admin.site.register(UserPermissionOverride)
admin.site.register(EmailVerificationToken)
admin.site.register(PasswordResetToken)
