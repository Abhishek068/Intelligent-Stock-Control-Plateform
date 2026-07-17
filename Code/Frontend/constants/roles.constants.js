export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
};

export const ELEVATED_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

export const canEdit = (role) => ELEVATED_ROLES.includes(role);

export function hasModulePermission(user, module, action = "view") {
  if (!user) return false;
  if (user.is_superuser) return true;
  const actions = user.permissions?.[module] || [];
  return actions.includes(action) || actions.includes("manage");
}
