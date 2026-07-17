import { useAuthStore } from "@/stores/auth.store";
import { ELEVATED_ROLES, ROLES, hasModulePermission } from "@/constants/roles.constants";

export function useRoleAccess() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const role = user?.role ?? null;

  return {
    role,
    user,
    isAdmin: !!user?.is_superuser || role === ROLES.ADMIN,
    isSuperAdmin: !!user?.is_superuser,
    isManager: role === ROLES.MANAGER,
    isStaff: role === ROLES.STAFF,
    canEdit: user?.is_superuser || (role ? ELEVATED_ROLES.includes(role) : false),
    hasRole: (requiredRole) => role === requiredRole,
    hasAnyRole: (roles) => (role ? roles.includes(role) : false),
    hasPermission: (module, action = "view") =>
      hasPermission(module, action) || hasModulePermission(user, module, action),
  };
}
