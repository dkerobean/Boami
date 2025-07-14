import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { CSVProcessor } from '@/lib/utils/csv-processor';

const csvImportSchema = yup.object({
  updateExisting: yup.boolean().default(true),
  skipDuplicates: yup.boolean().default(false),
  generateMissingSKUs: yup.boolean().default(true),
  validateOnly: yup.boolean().default(false)
});

const csvExportSchema = yup.object({
  includeVariants: yup.boolean().default(true),
  includeInventoryLogs: yup.boolean().default(false),
  fields: yup.array().of(yup.string()),
  filters: yup.object({
    category: yup.array().of(yup.string()),
    status: yup.array().of(yup.string()),
    dateFrom: yup.date(),
    dateTo: yup.date()
  }).default({})
});

/**
 * POST /api/products/csv - Import products from CSV
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options = formData.get('options') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'CSV file is required'
      }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({
        success: false,
        error: 'File must be a CSV file'
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size cannot exceed 10MB'
      }, { status: 400 });
    }

    // Parse options
    let validatedOptions = {};
    if (options) {
      try {
        const parsedOptions = JSON.parse(options);
        validatedOptions = await csvImportSchema.validate(parsedOptions);
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid options format'
        }, { status: 400 });
      }
    } else {
      validatedOptions = await csvImportSchema.validate({});
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process CSV import
    const result = await CSVProcessor.processProductImport(
      buffer,
      'system', // TODO: Get user ID from JWT token
      validatedOptions
    );

    // Determine response status based on results
    let status = 200;
    let message = 'CSV import completed successfully';
    
    if (result.failed > 0 && result.created === 0 && result.updated === 0) {
      status = 400;
      message = 'CSV import failed - no products were processed';
    } else if (result.failed > 0) {
      message = `CSV import completed with ${result.failed} errors`;
    }

    return NextResponse.json({
      success: result.failed === 0 || result.created > 0 || result.updated > 0,
      message,
      data: {
        summary: {
          totalRows: result.totalRows,
          processed: result.processed,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          failed: result.failed
        },
        errors: result.errors,
        warnings: result.warnings
      }
    }, { status });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process CSV import'
    }, { status: 500 });
  }
}

/**
 * GET /api/products/csv - Export products to CSV or get template
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'template') {
      // Generate and return CSV template
      const template = CSVProcessor.generateImportTemplate();
      
      return new NextResponse(template, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="product-import-template.csv"'
        }
      });
    }

    // Export products
    await connectToDatabase();

    const params = Object.fromEntries(url.searchParams.entries());
    
    // Parse array parameters
    ['category', 'status'].forEach(key => {
      if (params[key]) {
        (params as any)[key] = params[key].split(',');
      }
    });

    // Parse date parameters
    if (params.dateFrom) {
      (params as any).dateFrom = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      (params as any).dateTo = new Date(params.dateTo);
    }

    // Parse boolean parameters
    ['includeVariants', 'includeInventoryLogs'].forEach(key => {
      if (params[key]) {
        (params as any)[key] = params[key] === 'true';
      }
    });

    const validatedOptions = await csvExportSchema.validate(params);

    // Generate CSV
    const csvContent = await CSVProcessor.exportProductsToCSV(validatedOptions as any);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `products-export-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(csvContent, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('CSV export error:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to export products to CSV'
    }, { status: 500 });
  }
}

/**
 * PUT /api/products/csv - Validate CSV before import
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'CSV file is required'
      }, { status: 400 });
    }

    // Validate file type and size
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({
        success: false,
        error: 'File must be a CSV file'
      }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size cannot exceed 10MB'
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate CSV content only (don't actually import)
    const result = await CSVProcessor.processProductImport(
      buffer,
      'system',
      {
        validateOnly: true,
        updateExisting: true,
        skipDuplicates: false,
        generateMissingSKUs: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'CSV validation completed',
      data: {
        isValid: result.failed === 0,
        summary: {
          totalRows: result.totalRows,
          wouldCreate: result.created,
          wouldUpdate: result.updated,
          wouldSkip: result.skipped,
          validationErrors: result.failed
        },
        errors: result.errors,
        warnings: result.warnings,
        recommendations: generateValidationRecommendations(result)
      }
    });

  } catch (error) {
    console.error('CSV validation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate CSV file'
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on validation results
 */
function generateValidationRecommendations(result: any): string[] {
  const recommendations: string[] = [];

  if (result.failed > 0) {
    recommendations.push(`Fix ${result.failed} validation errors before importing`);
  }

  if (result.warnings.length > 0) {
    recommendations.push(`Review ${result.warnings.length} warnings for potential issues`);
  }

  if (result.created > result.updated) {
    recommendations.push('Mostly new products will be created - consider reviewing categories and pricing');
  }

  if (result.updated > result.created) {
    recommendations.push('Mostly existing products will be updated - verify this is intended');
  }

  const missingSkuErrors = result.errors.filter((error: any) => 
    error.field === 'sku' || error.message.toLowerCase().includes('sku')
  );
  
  if (missingSkuErrors.length > 0) {
    recommendations.push('Enable "Generate Missing SKUs" option to automatically create SKUs for products without them');
  }

  const duplicateErrors = result.errors.filter((error: any) => 
    error.message.toLowerCase().includes('already exists')
  );
  
  if (duplicateErrors.length > 0) {
    recommendations.push('Enable "Update Existing" option to update products with duplicate SKUs instead of skipping them');
  }

  if (recommendations.length === 0) {
    recommendations.push('CSV file looks good! You can proceed with the import.');
  }

  return recommendations;
}