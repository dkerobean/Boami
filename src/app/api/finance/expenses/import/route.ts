import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { FinanceImportService } from '@/lib/services/financeImportService';

// Basic validation functions to replace Zod
function validateImportRequest(body: any): { success: boolean; data?: any; error?: any } {
  if (!body || typeof body !== 'object') {
    return { success: false, error: { message: 'Invalid request body' } };
  }

  if (!Array.isArray(body.data)) {
    return { success: false, error: { message: 'Data must be an array' } };
  }

  if (!body.mapping || typeof body.mapping !== 'object') {
    return { success: false, error: { message: 'Mapping must be an object' } };
  }

  const options = {
    updateExisting: body.options?.updateExisting || false,
    createCategories: body.options?.createCategories !== false,
    createVendors: body.options?.createVendors !== false,
    skipInvalidRows: body.options?.skipInvalidRows !== false,
    dateFormat: body.options?.dateFormat,
  };

  return {
    success: true,
    data: {
      data: body.data,
      mapping: body.mapping,
      options
    }
  };
}

function validateValidationRequest(body: any): { success: boolean; data?: any; error?: any } {
  if (!body || typeof body !== 'object') {
    return { success: false, error: { message: 'Invalid request body' } };
  }

  if (!Array.isArray(body.data)) {
    return { success: false, error: { message: 'Data must be an array' } };
  }

  if (!body.mapping || typeof body.mapping !== 'object') {
    return { success: false, error: { message: 'Mapping must be an object' } };
  }

  return {
    success: true,
    data: {
      data: body.data,
      mapping: body.mapping
    }
  };
}

/**
 * POST /api/finance/expenses/import
 * Start an expense import job
 */
export async function POST(request: NextRequest) {
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

    await connectDB();

    const body = await request.json();
    const requestValidation = validateImportRequest(body);

    if (!requestValidation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: requestValidation.error
        }
      }, { status: 400 });
    }

    const validatedData = requestValidation.data;

    const { data, mapping, options } = validatedData;

    // Validate data structure
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No data provided for import'
        }
      }, { status: 400 });
    }

    // Validate mapping has required fields
    const mappedFields = Object.values(mapping);
    const requiredFields = ['amount', 'description'];

    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required field mappings: ${missingFields.join(', ')}`
        }
      }, { status: 400 });
    }

    // For expenses, check if at least category OR vendor is mapped
    const hasCategory = mappedFields.includes('category');
    const hasVendor = mappedFields.includes('vendor');

    if (!hasCategory && !hasVendor && !options.createCategories && !options.createVendors) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Expenses require either category or vendor mapping, or enable auto-creation'
        }
      }, { status: 400 });
    }

    // Validate data before starting import
    const validation = FinanceImportService.validateData(data, mapping, 'expense');

    if (!validation.isValid && !options.skipInvalidRows) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data validation failed',
          details: validation.errors
        }
      }, { status: 400 });
    }

    // Start import job
    const jobId = await FinanceImportService.startImportJob(
      data,
      mapping,
      'expense',
      authResult.userId,
      options
    );

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        totalRows: data.length,
        validation: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      },
      message: 'Expense import job started successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Expense import error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to start expense import',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

/**
 * PUT /api/finance/expenses/import
 * Validate expense data before import
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 [Expense Validation] Starting validation...');
    
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      console.log('❌ [Expense Validation] Authentication failed');
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 });
    }
    
    console.log('✅ [Expense Validation] Authentication successful, userId:', authResult.userId);

    await connectDB();

    const body = await request.json();
    console.log('📝 [Expense Validation] Request body received, data rows:', body.data?.length);
    console.log('Validation request body:', JSON.stringify(body, null, 2));
    
    const requestValidation = validateValidationRequest(body);
    console.log('Validation result:', requestValidation);

    if (!requestValidation.success) {
      console.error('Validation failed:', requestValidation.error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: requestValidation.error
        }
      }, { status: 400 });
    }

    const { data, mapping } = requestValidation.data;

    // Validate data structure
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No data provided for validation'
        }
      }, { status: 400 });
    }

    // Perform validation
    console.log('🔍 [Expense Validation] Running data validation...');
    console.log('📊 [Expense Validation] Mapping:', mapping);
    console.log('📊 [Expense Validation] Sample data row:', data[0]);
    
    const dataValidation = FinanceImportService.validateData(data, mapping, 'expense');
    console.log('✅ [Expense Validation] Validation completed:', {
      isValid: dataValidation.isValid,
      errorCount: dataValidation.errors.length,
      warningCount: dataValidation.warnings.length
    });

    // Get sample data for preview
    const sampleData = data.slice(0, 10).map((row, index) => {
      const processed: any = {
        rowNumber: index + 2,
        originalData: row
      };

      // Extract mapped fields
      Object.keys(mapping).forEach(csvColumn => {
        const systemField = mapping[csvColumn];
        const value = row[csvColumn];

        switch (systemField) {
          case 'amount':
            processed.amount = parseFloat(value?.toString().replace(/[$,\s]/g, '') || '0');
            break;
          case 'description':
            processed.description = value?.toString().trim();
            break;
          case 'date':
            if (value && value.toString().trim()) {
              const dateValue = new Date(value);
              processed.date = !isNaN(dateValue.getTime()) ? dateValue.toISOString().split('T')[0] : '';
            } else {
              processed.date = '';
            }
            break;
          case 'recurring':
            const recStr = value?.toString().toLowerCase().trim();
            processed.isRecurring = ['true', 'yes', '1', 'y', 'on'].includes(recStr || '');
            break;
          default:
            processed[systemField] = value;
        }
      });

      return processed;
    });

    return NextResponse.json({
      success: true,
      data: {
        validation: dataValidation,
        sampleData,
        summary: {
          totalRows: data.length,
          validRows: data.length - dataValidation.errors.length,
          invalidRows: dataValidation.errors.length,
          warnings: dataValidation.warnings.length
        }
      }
    });

  } catch (error) {
    console.error('❌ [Expense Validation] Critical error occurred:', error);
    console.error('❌ [Expense Validation] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate expense data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}