import mongoose from 'mongoose';
import { User, Role, Permission } from '../models';
import { seedRBAC, getDefaultRoleId } from '../seeders/rbac-seeder';

/**
 * Migration script to convert existing string-based roles to ObjectId references
 * and seed the RBAC system
 */
export async function migrateUserRoles() {
  try {
    console.log('🚀 Starting RBAC migration...');

    // First, seed the RBAC system (roles and permissions)
    await seedRBAC();

    // Get role mappings
    const roleMapping = {
      'admin': await getDefaultRoleId('Admin'),
      'manager': await getDefaultRoleId('Manager'),
      'user': await getDefaultRoleId('User'),
      'viewer': await getDefaultRoleId('Viewer')
    };

    console.log('📋 Role mappings:', roleMapping);

    // Find all users with string-based roles
    const usersToMigrate = await User.find({
      role: { $type: 'string' }
    });

    console.log(`👥 Found ${usersToMigrate.length} users to migrate`);

    // Migrate each user
    for (const user of usersToMigrate) {
      const oldRole = user.role as any; // Cast to any since it's currently a string
      let newRoleId = roleMapping[oldRole as keyof typeof roleMapping];

      // If no mapping found, default to 'User' role
      if (!newRoleId) {
        console.log(`⚠️  Unknown role '${oldRole}' for user ${user.email}, defaulting to 'User'`);
        newRoleId = roleMapping.user;
      }

      if (newRoleId) {
        await User.findByIdAndUpdate(user._id, {
          role: newRoleId,
          status: user.isActive ? 'active' : 'disabled',
          // Set default values for new fields if they don't exist
          ...(user.invitedBy === undefined && { invitedBy: null }),
          ...(user.invitedAt === undefined && { invitedAt: null })
        });

        console.log(`✅ Migrated user ${user.email}: ${oldRole} -> ${newRoleId}`);
      }
    }

    console.log('🎉 RBAC migration completed successfully!');
    return {
      success: true,
      migratedUsers: usersToMigrate.length,
      message: 'RBAC migration completed successfully'
    };

  } catch (error) {
    console.error('❌ RBAC migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    };
  }
}

/**
 * Rollback migration (convert ObjectId roles back to strings)
 * Use this only if you need to rollback the migration
 */
export async function rollbackUserRoles() {
  try {
    console.log('🔄 Starting RBAC rollback...');

    // Get all users with ObjectId roles
    const usersToRollback = await User.find({
      role: { $type: 'objectId' }
    }).populate('role');

    console.log(`👥 Found ${usersToRollback.length} users to rollback`);

    const roleMapping = {
      'Super Admin': 'admin',
      'Admin': 'admin',
      'Manager': 'manager',
      'User': 'user',
      'Viewer': 'user'
    };

    for (const user of usersToRollback) {
      const role = user.role as any;
      const roleName = role?.name;
      const stringRole = roleMapping[roleName as keyof typeof roleMapping] || 'user';

      await User.findByIdAndUpdate(user._id, {
        role: stringRole,
        $unset: {
          status: 1,
          invitedBy: 1,
          invitedAt: 1
        }
      });

      console.log(`✅ Rolled back user ${user.email}: ${roleName} -> ${stringRole}`);
    }

    console.log('🎉 RBAC rollback completed successfully!');
    return {
      success: true,
      rolledBackUsers: usersToRollback.length,
      message: 'RBAC rollback completed successfully'
    };

  } catch (error) {
    console.error('❌ RBAC rollback failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rollback failed'
    };
  }
}

/**
 * Check migration status
 */
export async function checkMigrationStatus() {
  try {
    const [stringRoleUsers, objectIdRoleUsers, totalRoles, totalPermissions] = await Promise.all([
      User.countDocuments({ role: { $type: 'string' } }),
      User.countDocuments({ role: { $type: 'objectId' } }),
      Role.countDocuments(),
      Permission.countDocuments()
    ]);

    return {
      stringRoleUsers,
      objectIdRoleUsers,
      totalRoles,
      totalPermissions,
      migrationNeeded: stringRoleUsers > 0,
      rbacSeeded: totalRoles > 0 && totalPermissions > 0
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return {
      error: error instanceof Error ? error.message : 'Status check failed'
    };
  }
}