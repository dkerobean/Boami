import { NextRequest, NextResponse } from 'next/server';
import { TemplateService } from '@/lib/services/templateService';

/**
 * GET /api/finance/templates/expense
 * Download expense import template CSV file
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeInstructions = searchParams.get('instructions') !== 'false';
    
    // Generate expense template
    const template = TemplateService.generateExpenseTemplate();
    
    if (format === 'csv') {
      // Generate CSV content
      const csvContent = TemplateService.templateToCSV(template, includeInstructions);
      
      // Create response with CSV content
      const response = new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${template.filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      return response;
    } else if (format === 'json') {
      // Return template structure as JSON for frontend use
      const fieldExamples = TemplateService.generateFieldExamples('expense');
      const validationRules = TemplateService.getValidationRules('expense');
      const quickStartGuide = TemplateService.getQuickStartGuide('expense');
      
      return NextResponse.json({
        success: true,
        data: {
          template,
          fieldExamples,
          validationRules,
          quickStartGuide,
          helpDocument: TemplateService.generateHelpDocument('expense')
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Unsupported format. Use "csv" or "json".'
        }
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Expense template generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEMPLATE_GENERATION_ERROR',
        message: 'Failed to generate expense template'
      }
    }, { status: 500 });
  }
}

/**
 * OPTIONS /api/finance/templates/expense
 * Returns available template options and metadata
 */
export async function OPTIONS(request: NextRequest) {
  try {
    const template = TemplateService.generateExpenseTemplate();
    const validationRules = TemplateService.getValidationRules('expense');
    
    return NextResponse.json({
      success: true,
      data: {
        templateInfo: {
          filename: template.filename,
          description: template.description,
          headers: template.headers,
          sampleRowCount: template.sampleRows.length
        },
        availableFormats: ['csv', 'json'],
        validationRules,
        downloadOptions: {
          withInstructions: true,
          withoutInstructions: false
        },
        supportedFileTypes: ['.csv', '.xls', '.xlsx'],
        maxFileSize: '10MB',
        requiredFields: Object.entries(validationRules)
          .filter(([_, rule]) => rule.required)
          .map(([field, _]) => field)
      }
    });
    
  } catch (error) {
    console.error('Expense template options error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEMPLATE_OPTIONS_ERROR',
        message: 'Failed to get expense template options'
      }
    }, { status: 500 });
  }
}