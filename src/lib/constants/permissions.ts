/**
 * Permission constants for the application
 * These define all available permissions in the system
 */

export const RESOURCES = {
  USERS: 'users',
  ROLES: 'roles',
  FINANCE: 'finance',
  PRODUCTS: 'products',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings'
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage'
} as const;

/**
 * Predefined permission combinations
 */
export const PERMISSIONS = {
  // User management permissions
  USERS_CREATE: `${RESOURCES.USERS}.${ACTIONS.CREATE}`,
  USERS_READ: `${RESOURCES.USERS}.${ACTIONS.READ}`,
  USERS_UPDATE: `${RESOURCES.USERS}.${ACTIONS.UPDATE}`,
  USERS_DELETE: `${RESOURCES.USERS}.${ACTIONS.DELETE}`,
  USERS_MANAGE: `${RESOURCES.USERS}.${ACTIONS.MANAGE}`,

  // Role management permissions
  ROLES_CREATE: `${RESOURCES.ROLES}.${ACTIONS.CREATE}`,
  ROLES_READ: `${RESOURCES.ROLES}.${ACTIONS.READ}`,
  ROLES_UPDATE: `${RESOURCES.ROLES}.${ACTIONS.UPDATE}`,
  ROLES_DELETE: `${RESOURCES.ROLES}.${ACTIONS.DELETE}`,
  ROLES_MANAGE: `${RESOURCES.ROLES}.${ACTIONS.MANAGE}`,

  // Finance permissions
  FINANCE_CREATE: `${RESOURCES.FINANCE}.${ACTIONS.CREATE}`,
  FINANCE_READ: `${RESOURCES.FINANCE}.${ACTIONS.READ}`,
  FINANCE_UPDATE: `${RESOURCES.FINANCE}.${ACTIONS.UPDATE}`,
  FINANCE_DELETE: `${RESOURCES.FINANCE}.${ACTIONS.DELETE}`,
  FINANCE_MANAGE: `${RESOURCES.FINANCE}.${ACTIONS.MANAGE}`,

  // Product permissions
  PRODUCTS_CREATE: `${RESOURCES.PRODUCTS}.${ACTIONS.CREATE}`,
  PRODUCTS_READ: `${RESOURCES.PRODUCTS}.${ACTIONS.READ}`,
  PRODUCTS_UPDATE: `${RESOURCES.PRODUCTS}.${ACTIONS.UPDATE}`,
  PRODUCTS_DELETE: `${RESOURCES.PRODUCTS}.${ACTIONS.DELETE}`,
  PRODUCTS_MANAGE: `${RESOURCES.PRODUCTS}.${ACTIONS.MANAGE}`,

  // Report permissions
  REPORTS_CREATE: `${RESOURCES.REPORTS}.${ACTIONS.CREATE}`,
  REPORTS_READ: `${RESOURCES.REPORTS}.${ACTIONS.READ}`,
  REPORTS_UPDATE: `${RESOURCES.REPORTS}.${ACTIONS.UPDATE}`,
  REPORTS_DELETE: `${RESOURCES.REPORTS}.${ACTIONS.DELETE}`,
  REPORTS_MANAGE: `${RESOURCES.REPORTS}.${ACTIONS.MANAGE}`,

  // Dashboard permissions
  DASHBOARD_READ: `${RESOURCES.DASHBOARD}.${ACTIONS.READ}`,
  DASHBOARD_MANAGE: `${RESOURCES.DASHBOARD}.${ACTIONS.MANAGE}`,

  // Settings permissions
  SETTINGS_READ: `${RESOURCES.SETTINGS}.${ACTIONS.READ}`,
  SETTINGS_UPDATE: `${RESOURCES.SETTINGS}.${ACTIONS.UPDATE}`,
  SETTINGS_MANAGE: `${RESOURCES.SETTINGS}.${ACTIONS.MANAGE}`
} as const;

/**
 * Default role names
 */
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User',
  VIEWER: 'Viewer'
} as const;

/**
 * Permission hierarchy - higher level permissions include lower level ones
 */
export const PERMISSION_HIERARCHY = {
  [ACTIONS.MANAGE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
  [ACTIONS.UPDATE]: [ACTIONS.READ],
  [ACTIONS.DELETE]: [ACTIONS.READ],
  [ACTIONS.CREATE]: [ACTIONS.READ]
};

/**
 * Helper function to get all permissions for a resource.action combination
 * considering the permission hierarchy
 */
export function getImpliedPermissions(resource: string, action: string): string[] {
  const permissions = [action];

  if (PERMISSION_HIERARCHY[action as keyof typeof PERMISSION_HIERARCHY]) {
    permissions.push(...PERMISSION_HIERARCHY[action as keyof typeof PERMISSION_HIERARCHY]);
  }

  return permissions.map(perm => `${resource}.${perm}`);
}

/**
 * Check if a permission string is valid
 */
export function isValidPermission(permission: string): boolean {
  const [resource, action] = permission.split('.');
  return Object.values(RESOURCES).includes(resource as any) &&
         Object.values(ACTIONS).includes(action as any);
}