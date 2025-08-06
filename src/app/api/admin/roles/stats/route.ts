import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Role, Permission } from '@/lib/database/models';

/**
 * GET /api/admin/roles/stats
 * Get role statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get role counts
    const totalRoles = await Role.countDocuments();
    const customRoles = await Role.countDocuments({ isSystemRole: false });
    const systemRoles = await Role.countDocuments({ isSystemRole: true });

    // Get total permissions count
    const totalPermissions = await Permission.countDocuments();

    const stats = {
      overview: {
        totalRoles,
        customRoles,
        systemRoles,
        totalPermissions
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Get role stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch role statistics'
      },
      { status: 500 }
    );
  }
}