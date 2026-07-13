




export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff"
};


export const ELEVATED_ROLES = [ROLES.ADMIN, ROLES.MANAGER];


export const canEdit = (role) => ELEVATED_ROLES.includes(role);