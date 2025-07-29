import { NextRequest, NextResponse } from 'next/server';
import { migrateUserRoles, rollbackUserRoles, checkMigrationStatus } from '@/lib/database/migrations/migrate-user-roles';
import { connectDB } from '@/lib/database/connection';

/**
 * Run RBAC migration
 * POST /api/admin/migrate-rbac
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { action = 'migrate' } = await request.json();

    let result;
    switch (action) {
      case 'migrate':
        result = await migrateUserRoles();
        break;
      case 'rollback':
        result = await rollbackUserRoles();
        break;
      case 'status':
        result = await checkMigrationStatus();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: migrate, rollback, or status' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Check migration status
 * GET /api/admin/migrate-rbac
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const status = await checkMigrationStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Migration status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}