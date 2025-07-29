import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { FinanceImportService } from '@/lib/services/financeImportService';

/**
 * GET /api/finance/import/[jobId]
 * Get import job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Job ID is required'
        }
      }, { status: 400 });
    }

    // Get job status
    const jobStatus = await FinanceImportService.getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Import job not found'
        }
      }, { status: 404 });
    }

    // Check if user owns this job
    if (jobStatus.userId !== authResult.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this import job'
        }
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: jobStatus
    });

  } catch (error) {
    console.error('Get import job status error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get import job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

/**
 * DELETE /api/finance/import/[jobId]
 * Cancel import job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Job ID is required'
        }
      }, { status: 400 });
    }

    // Get job status first to check ownership
    const jobStatus = await FinanceImportService.getJobStatus(jobId);

    if (!jobStatus) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Import job not found'
        }
      }, { status: 404 });
    }

    // Check if user owns this job
    if (jobStatus.userId !== authResult.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this import job'
        }
      }, { status: 403 });
    }

    // Cancel the job
    const cancelled = await FinanceImportService.cancelJob(jobId);

    if (!cancelled) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Job cannot be cancelled (may already be completed or failed)'
        }
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: 'Import job cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel import job error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel import job',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}