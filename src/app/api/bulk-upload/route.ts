import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const createImportJobSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(1, 'File size is required'),
  totalRows: z.number().min(1, 'Total rows is required'),
  fieldMapping: z.record(z.string(), z.string()),
  options: z.object({
    updateExisting: z.boolean().default(false),
    createCategories: z.boolean().default(false),
    skipInvalidRows: z.boolean().default(true),
    notifyOnCompletion: z.boolean().default(true),
  }).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  sortBy: z.enum(['createdAt', 'fileName', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Mock data for development
const mockImportJobs = [
  {
    id: 'import_1',
    fileName: 'products_2024.csv',
    fileSize: 2048576,
    status: 'completed',
    totalRows: 150,
    processedRows: 150,
    successfulRows: 142,
    failedRows: 8,
    results: {
      created: 135,
      updated: 7,
      skipped: 5,
      failed: 3,
    },
    fieldMapping: {
      'Product Name': 'name',
      'SKU': 'sku',
      'Price': 'price',
      'Category': 'category',
      'Stock': 'stock_quantity',
    },
    createdAt: new Date('2024-01-15T10:30:00Z'),
    completedAt: new Date('2024-01-15T10:35:00Z'),
    createdBy: 'user_123',
    errors: [
      {
        row: 25,
        field: 'price',
        message: 'Invalid price format',
      },
      {
        row: 67,
        field: 'sku',
        message: 'SKU already exists',
      },
    ],
  },
  {
    id: 'import_2',
    fileName: 'inventory_update.csv',
    fileSize: 1024768,
    status: 'processing',
    totalRows: 89,
    processedRows: 45,
    successfulRows: 42,
    failedRows: 3,
    results: {
      created: 20,
      updated: 22,
      skipped: 2,
      failed: 1,
    },
    fieldMapping: {
      'Name': 'name',
      'Code': 'sku',
      'Cost': 'price',
      'Quantity': 'stock_quantity',
    },
    createdAt: new Date('2024-01-15T11:00:00Z'),
    completedAt: null,
    createdBy: 'user_456',
    errors: [],
  },
];

/**
 * GET /api/bulk-upload
 * Retrieves import jobs with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validatedQuery = querySchema.parse(queryParams);
    
    // Apply filters
    let filteredJobs = mockImportJobs.filter(job => {
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
    console.error('Error fetching import jobs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch import jobs',
    }, { status: 500 });
  }
}

/**
 * POST /api/bulk-upload
 * Creates a new import job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createImportJobSchema.parse(body);
    
    // In a real implementation, you would:
    // 1. Store the import job in the database
    // 2. Queue the job for processing
    // 3. Start the import process
    // 4. Return the job ID
    
    const newImportJob = {
      id: `import_${Date.now()}`,
      ...validatedData,
      status: 'pending' as const,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      results: {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      createdAt: new Date(),
      completedAt: null,
      createdBy: 'current_user', // Would be from auth context
      errors: [],
    };
    
    // Simulate processing delay
    setTimeout(() => {
      console.log(`Starting import job ${newImportJob.id}`);
      // Here you would trigger the actual import process
    }, 1000);
    
    return NextResponse.json({
      success: true,
      data: newImportJob,
      message: 'Import job created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating import job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create import job',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/bulk-upload
 * Cancels or deletes import jobs
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
    
    // In a real implementation, you would:
    // 1. Validate all job IDs exist
    // 2. Check if jobs can be cancelled/deleted
    // 3. Cancel running jobs
    // 4. Delete job records
    // 5. Clean up uploaded files
    
    const cancelledJobs = jobIds.filter(id => {
      // Only allow cancellation of pending/processing jobs
      const job = mockImportJobs.find(j => j.id === id);
      return job && ['pending', 'processing'].includes(job.status);
    });
    
    const deletedJobs = jobIds.filter(id => {
      // Only allow deletion of completed/failed jobs
      const job = mockImportJobs.find(j => j.id === id);
      return job && ['completed', 'failed'].includes(job.status);
    });
    
    return NextResponse.json({
      success: true,
      message: `${cancelledJobs.length} jobs cancelled, ${deletedJobs.length} jobs deleted`,
      cancelled: cancelledJobs,
      deleted: deletedJobs,
    });
    
  } catch (error) {
    console.error('Error managing import jobs:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to manage import jobs',
    }, { status: 500 });
  }
}