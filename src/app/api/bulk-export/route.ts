import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exportService } from '@/lib/services/exportService';

// Validation schemas
const createExportJobSchema = z.object({
  type: z.enum(['products', 'sales', 'expenses', 'financial-summary']),
  format: z.enum(['csv', 'excel', 'json']),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  category: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  sortBy: z.enum(['createdAt', 'fileName', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});


/**
 * GET /api/bulk-export
 * Retrieves export jobs with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validatedQuery = querySchema.parse(queryParams);
    
    // Get all export jobs from the service
    let allJobs = exportService.getAllExportJobs();
    
    // Apply filters
    let filteredJobs = allJobs.filter(job => {
      let matches = true;
      
      // Status filter
      if (validatedQuery.status) {
        matches = matches && job.status === validatedQuery.status;
      }
      
      return matches;
    });
    
    // Apply sorting
    filteredJobs.sort((a, b) => {
      const { sortBy, sortOrder } = validatedQuery;
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'fileName':
          aValue = a.fileName.toLowerCase();
          bValue = b.fileName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });
    
    // Apply pagination
    const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
    const endIndex = startIndex + validatedQuery.limit;
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
    
    // Calculate statistics
    const statistics = {
      total: filteredJobs.length,
      pending: filteredJobs.filter(j => j.status === 'pending').length,
      processing: filteredJobs.filter(j => j.status === 'processing').length,
      completed: filteredJobs.filter(j => j.status === 'completed').length,
      failed: filteredJobs.filter(j => j.status === 'failed').length,
    };
    
    return NextResponse.json({
      success: true,
      data: paginatedJobs,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: filteredJobs.length,
        totalPages: Math.ceil(filteredJobs.length / validatedQuery.limit),
        hasNextPage: endIndex < filteredJobs.length,
        hasPreviousPage: validatedQuery.page > 1,
      },
      statistics,
    });
    
  } catch (error) {
    console.error('Error fetching export jobs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch export jobs',
    }, { status: 500 });
  }
}

/**
 * POST /api/bulk-export
 * Creates a new export job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createExportJobSchema.parse(body);
    
    // Create the export job using the service
    const newExportJob = await exportService.createExportJob(
      validatedData.type,
      validatedData.format,
      {
        dateRange: validatedData.dateRange,
        category: validatedData.category,
      }
    );
    
    return NextResponse.json({
      success: true,
      data: newExportJob,
      message: 'Export job created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating export job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create export job',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/bulk-export
 * Cancels or deletes export jobs
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobIds } = body;
    
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Job IDs array is required',
      }, { status: 400 });
    }
    
    const deletedJobs: string[] = [];
    const cancelledJobs: string[] = [];
    
    for (const jobId of jobIds) {
      const job = exportService.getExportJob(jobId);
      if (!job) continue;
      
      if (['pending', 'processing'].includes(job.status)) {
        // For now, we'll just delete pending/processing jobs
        // In a real implementation, you'd properly cancel running jobs
        const deleted = await exportService.deleteExportJob(jobId);
        if (deleted) cancelledJobs.push(jobId);
      } else if (['completed', 'failed'].includes(job.status)) {
        const deleted = await exportService.deleteExportJob(jobId);
        if (deleted) deletedJobs.push(jobId);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${cancelledJobs.length} jobs cancelled, ${deletedJobs.length} jobs deleted`,
      cancelled: cancelledJobs,
      deleted: deletedJobs,
    });
    
  } catch (error) {
    console.error('Error managing export jobs:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to manage export jobs',
    }, { status: 500 });
  }
}