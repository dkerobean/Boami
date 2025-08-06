import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { User } from '@/lib/database/models';

/**
 * GET /api/admin/users/stats
 * Get user statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingUsers = await User.countDocuments({ isEmailVerified: false });
    const disabledUsers = await User.countDocuments({ isActive: false });

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        pendingUsers,
        disabledUsers,
        recentUsers
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user statistics'
      },
      { status: 500 }
    );
  }
}