export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  WAREHOUSE_STAFF: "WAREHOUSE_STAFF",
};

export const ROLE_LABELS = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAREHOUSE_STAFF: "Warehouse Staff",
};

// Feature access per role
export const ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.MANAGER],
  products: [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE_STAFF],
  inventory: [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE_STAFF],
  suppliers: [ROLES.ADMIN, ROLES.MANAGER],
  purchases: [ROLES.ADMIN, ROLES.MANAGER],
  customers: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  sales: [ROLES.ADMIN, ROLES.MANAGER],
  pos: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  reports: [ROLES.ADMIN, ROLES.MANAGER],
};

export function canAccess(role, feature) {
  if (role === ROLES.ADMIN) return true;
  return ACCESS[feature] ? ACCESS[feature].includes(role) : false;
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}