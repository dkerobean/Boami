import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User, Role, Invitation } from '@/lib/database/models';
import { PermissionService } from '@/lib/services/permission.service';

/**
 * Get user statistics
 * GET /api/users/stats
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await PermissionService.checkPermission(
      session.user.id,
      'users',
      'read'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user counts by status
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      disabledUsers,
      verifiedUsers,
      unverifiedUsers,
      recentUsers,
      usersByRole,
      pendingInvitations,
      expiredInvitations
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'disabled' }),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ isEmailVerified: false }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      User.aggregate([
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleInfo'
          }
        },
        {
          $unwind: '$roleInfo'
        },
        {
          $group: {
            _id: '$roleInfo.name',
            count: { $sum: 1 },
            roleId: { $first: '$roleInfo._id' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      Invitation.countDocuments({ status: 'pending' }),
      Invitation.countDocuments({ status: 'expired' })
    ]);

    // Get recent activity (last 7 days)
    const recentActivity = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get login activity (users who logged in recently)
    const recentLogins = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        pendingUsers,
        disabledUsers,
        verifiedUsers,
        unverifiedUsers,
        recentUsers,
        recentLogins
      },
      usersByRole: usersByRole.map(role => ({
        roleName: role._id,
        roleId: role.roleId,
        count: role.count
      })),
      invitations: {
        pending: pendingInvitations,
        expired: expiredInvitations
      },
      recentActivity: recentActivity.map(activity => ({
        date: activity._id,
        newUsers: activity.count
      })),
      percentages: {
        activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        verifiedPercentage: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
        pendingPercentage: totalUsers > 0 ? Math.round((pendingUsers / totalUsers) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}