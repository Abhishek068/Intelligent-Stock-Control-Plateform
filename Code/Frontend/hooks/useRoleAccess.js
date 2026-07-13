





import { useAuthStore } from "@/stores/auth.store";
import { ELEVATED_ROLES, ROLES } from "@/constants/roles.constants";


export function useRoleAccess() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? null;

  return {
    role,
    isAdmin: role === ROLES.ADMIN,
    isManager: role === ROLES.MANAGER,
    isStaff: role === ROLES.STAFF,
    
    canEdit: role ? ELEVATED_ROLES.includes(role) : false,
    
    hasRole: (requiredRole) => role === requiredRole,
    
    hasAnyRole: (roles) => role ? roles.includes(role) : false
  };
}