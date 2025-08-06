import { NextRequest, NextResponse } from 'next/server';
import { cronScheduler } from '@/lib/utils/cron-scheduler';
import { SystemStartup } from '@/lib/utils/system-startup';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/admin/cron
 * Get cron scheduler status and job information
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can access this endpoint

    // Get scheduler status
    const schedulerStats = cronScheduler.getStats();
    const allJobs = cronScheduler.getAllJobsStatus();
    const systemStatus = await SystemStartup.getSystemStatus();

    return NextResponse.json({
      success: true,
      data: {
        scheduler: {
          isRunning: schedulerStats.isRunning,
          stats: schedulerStats
        },
        jobs: allJobs,
        system: systemStatus
      }
    });

  } catch (error) {
    console.error('Cron status error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get cron status' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cron
 * Control cron scheduler and jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    // TODO: Add admin role check here

    // Parse request body
    const body = await request.json();
    const { action, jobId, schedule, enabled } = body;

    let result;

    switch (action) {
      case 'start':
        cronScheduler.start();
        result = { message: 'Cron scheduler started' };
        break;

      case 'stop':
        cronScheduler.stop();
        result = { message: 'Cron scheduler stopped' };
        break;

      case 'force-run':
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Job ID is required for force-run' } },
            { status: 400 }
          );
        }
        result = await cronScheduler.forceRun(jobId);
        break;

      case 'enable-job':
        if (!jobId || enabled === undefined) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Job ID and enabled status are required' } },
            { status: 400 }
          );
        }
        cronScheduler.setJobEnabled(jobId, enabled);
        result = { message: `Job ${jobId} ${enabled ? 'enabled' : 'disabled'}` };
        break;

      case 'update-schedule':
        if (!jobId || !schedule) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Job ID and schedule are required' } },
            { status: 400 }
          );
        }
        cronScheduler.updateJobSchedule(jobId, schedule);
        result = { message: `Job ${jobId} schedule updated to ${schedule}` };
        break;

      case 'system-init':
        await SystemStartup.initialize();
        result = { message: 'System services initialized' };
        break;

      case 'system-shutdown':
        await SystemStartup.shutdown();
        result = { message: 'System services shut down' };
        break;

      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Action completed successfully'
    });

  } catch (error) {
    console.error('Cron control error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONTROL_ERROR',
          message: 'Failed to execute cron action',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}