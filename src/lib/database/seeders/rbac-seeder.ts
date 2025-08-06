import mongoose from 'mongoose';
import Permission from '../models/Permission';
import Role from '../models/Role';
import SystemConfig from '../models/SystemConfig';

/**
 * Default permissions for the system
 */
const defaultPermissions = [
  // User management permissions
  { name: 'users.create', resource: 'users', action: 'create', description: 'Create new users' },
  { name: 'users.read', resource: 'users', action: 'read', description: 'View users' },
  { name: 'users.update', resource: 'users', action: 'update', description: 'Update user information' },
  { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },
  { name: 'users.manage', resource: 'users', action: 'manage', description: 'Full user management access' },

  // Role management permissions
  { name: 'roles.create', resource: 'roles', action: 'create', description: 'Create new roles' },
  { name: 'roles.read', resource: 'roles', action: 'read', description: 'View roles' },
  { name: 'roles.update', resource: 'roles', action: 'update', description: 'Update role information' },
  { name: 'roles.delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
  { name: 'roles.manage', resource: 'roles', action: 'manage', description: 'Full role management access' },

  // Finance permissions
  { name: 'finance.create', resource: 'finance', action: 'create', description: 'Create financial records' },
  { name: 'finance.read', resource: 'finance', action: 'read', description: 'View financial data' },
  { name: 'finance.update', resource: 'finance', action: 'update', description: 'Update financial records' },
  { name: 'finance.delete', resource: 'finance', action: 'delete', description: 'Delete financial records' },
  { name: 'finance.manage', resource: 'finance', action: 'manage', description: 'Full finance management access' },

  // Products permissions
  { name: 'products.create', resource: 'products', action: 'create', description: 'Create new products' },
  { name: 'products.read', resource: 'products', action: 'read', description: 'View products' },
  { name: 'products.update', resource: 'products', action: 'update', description: 'Update product information' },
  { name: 'products.delete', resource: 'products', action: 'delete', description: 'Delete products' },
  { name: 'products.manage', resource: 'products', action: 'manage', description: 'Full product management access' },

  // Reports permissions
  { name: 'reports.create', resource: 'reports', action: 'create', description: 'Create reports' },
  { name: 'reports.read', resource: 'reports', action: 'read', description: 'View reports' },
  { name: 'reports.update', resource: 'reports', action: 'update', description: 'Update reports' },
  { name: 'reports.delete', resource: 'reports', action: 'delete', description: 'Delete reports' },
  { name: 'reports.manage', resource: 'reports', action: 'manage', description: 'Full reports management access' },

  // Dashboard permissions
  { name: 'dashboard.read', resource: 'dashboard', action: 'read', description: 'View dashboard' },
  { name: 'dashboard.manage', resource: 'dashboard', action: 'manage', description: 'Manage dashboard settings' },

  // Settings permissions
  { name: 'settings.read', resource: 'settings', action: 'read', description: 'View settings' },
  { name: 'settings.update', resource: 'settings', action: 'update', description: 'Update settings' },
  { name: 'settings.manage', resource: 'settings', action: 'manage', description: 'Full settings management access' }
];

/**
 * Default roles with their permissions
 */
const defaultRoles = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystem: true,
    permissions: [
      'users.manage', 'roles.manage', 'finance.manage', 'products.manage',
      'reports.manage', 'dashboard.manage', 'settings.manage'
    ]
  },
  {
    name: 'Admin',
    description: 'Administrative access with user and content management',
    isSystem: true,
    permissions: [
      'users.manage', 'finance.manage', 'products.manage',
      'reports.read', 'dashboard.read', 'settings.read'
    ]
  },
  {
    name: 'Manager',
    description: 'Management access with team and reporting capabilities',
    isSystem: true,
    permissions: [
      'users.read', 'finance.read', 'finance.update', 'products.read', 'products.update',
      'reports.read', 'reports.create', 'dashboard.read'
    ]
  },
  {
    name: 'User',
    description: 'Standard user access with basic features',
    isSystem: true,
    permissions: [
      'finance.read', 'finance.create', 'finance.update', 'products.read',
      'reports.read', 'dashboard.read'
    ]
  },
  {
    name: 'Viewer',
    description: 'Read-only access to most features',
    isSystem: true,
    permissions: [
      'finance.read', 'products.read', 'reports.read', 'dashboard.read'
    ]
  }
];

/**
 * Seed permissions in the database
 */
export async function seedPermissions(): Promise<void> {
  try {
    console.log('Seeding permissions...');

    for (const permissionData of defaultPermissions) {
      const existingPermission = await Permission.findByResourceAndAction(
        permissionData.resource,
        permissionData.action
      );

      if (!existingPermission) {
        await Permission.create(permissionData);
        console.log(`Created permission: ${permissionData.name}`);
      } else {
        console.log(`Permission already exists: ${permissionData.name}`);
      }
    }

    console.log('Permissions seeding completed');
  } catch (error) {
    console.error('Error seeding permissions:', error);
    throw error;
  }
}

/**
 * Seed roles in the database
 */
export async function seedRoles(): Promise<void> {
  try {
    console.log('Seeding roles...');

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findByName(roleData.name);

      if (!existingRole) {
        // Get permission IDs for this role
        const permissionIds = [];
        for (const permissionName of roleData.permissions) {
          const [resource, action] = permissionName.split('.');
          const permission = await Permission.findByResourceAndAction(resource, action);
          if (permission) {
            permissionIds.push(permission._id);
          }
        }

        await Role.create({
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissions: permissionIds
        });

        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
      }
    }

    console.log('Roles seeding completed');
  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  }
}

/**
 * Main seeder function to initialize RBAC system
 * Only runs if RBAC hasn't been seeded before
 */
export async function seedRBAC(): Promise<void> {
  try {
    // Check if RBAC is already seeded
    const isSeeded = await SystemConfig.isRBACSeeded();
    
    if (isSeeded) {
      console.log('RBAC system already initialized, skipping seeding');
      return;
    }

    console.log('Starting RBAC seeding...');

    await seedPermissions();
    await seedRoles();

    // Mark RBAC as seeded
    await SystemConfig.markRBACSeeded();

    console.log('RBAC seeding completed successfully');
  } catch (error) {
    console.error('Error in RBAC seeding:', error);
    throw error;
  }
}

/**
 * Get default role ID by name
 */
export async function getDefaultRoleId(roleName: string): Promise<mongoose.Types.ObjectId | null> {
  try {
    const role = await Role.findByName(roleName);
    return role ? (role._id as mongoose.Types.ObjectId) : null;
  } catch (error) {
    console.error(`Error getting role ID for ${roleName}:`, error);
    return null;
  }
}