from rest_framework import permissions


class IsOrganizationMember(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True
        return getattr(user, "organization_id", None) is not None


class IsSuperAdmin(permissions.BasePermission):
    message = "Super Admin access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class HasModulePermission(permissions.BasePermission):
    """
    Check module/action permission.
    Set on the view:
      module_permission = "products"
      action_permission = "view"  # or map via action_permission_map
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not IsOrganizationMember().has_permission(request, view):
            return False

        user = request.user
        if user.is_superuser:
            return True

        module = getattr(view, "module_permission", None)
        if not module:
            return True

        action_map = getattr(view, "action_permission_map", None)
        if action_map and hasattr(view, "action"):
            action = action_map.get(view.action)
            if action is None and request.method in permissions.SAFE_METHODS:
                action = action_map.get("list") or action_map.get("retrieve") or "view"
            if action is None:
                action = self._method_to_action(request.method)
        else:
            action = getattr(view, "action_permission", None) or self._method_to_action(
                request.method
            )

        return user.has_module_permission(module, action)

    @staticmethod
    def _method_to_action(method: str) -> str:
        mapping = {
            "GET": "view",
            "HEAD": "view",
            "OPTIONS": "view",
            "POST": "create",
            "PUT": "edit",
            "PATCH": "edit",
            "DELETE": "delete",
        }
        return mapping.get(method.upper(), "view")


# Backward-compatible aliases — Super Admin replaces former admin role
class IsAdminRole(IsSuperAdmin):
    """Deprecated alias: Super Admin only."""

    pass


class IsManagerOrAdmin(permissions.BasePermission):
    """Super Admin or user with manage/view elevated module access."""

    message = "Manager or Super Admin role required."

    def has_permission(self, request, view):
        if not IsOrganizationMember().has_permission(request, view):
            return False
        user = request.user
        if user.is_superuser:
            return True
        # Treat as elevated if user has any manager-like role name or manage on reports
        if user.roles.filter(name__iexact="Manager").exists():
            return True
        return user.has_module_permission("reports", "view")


class IsReadOnlyOrElevated(permissions.BasePermission):
    def has_permission(self, request, view):
        if not IsOrganizationMember().has_permission(request, view):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if user.is_superuser:
            return True
        if user.roles.filter(name__iexact="Manager").exists():
            return True
        return False
