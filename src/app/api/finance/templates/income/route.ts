import { NextRequest, NextResponse } from 'next/server';
import { TemplateService } from '@/lib/services/templateService';

/**
 * GET /api/finance/templates/income
 * Download income import template CSV file
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeInstructions = searchParams.get('instructions') !== 'false';
    
    // Generate income template
    const template = TemplateService.generateIncomeTemplate();
    
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
      const fieldExamples = TemplateService.generateFieldExamples('income');
      const validationRules = TemplateService.getValidationRules('income');
      const quickStartGuide = TemplateService.getQuickStartGuide('income');
      
      return NextResponse.json({
        success: true,
        data: {
          template,
          fieldExamples,
          validationRules,
          quickStartGuide,
          helpDocument: TemplateService.generateHelpDocument('income')
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
    console.error('Income template generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEMPLATE_GENERATION_ERROR',
        message: 'Failed to generate income template'
      }
    }, { status: 500 });
  }
}

/**
 * OPTIONS /api/finance/templates/income
 * Returns available template options and metadata
 */
export async function OPTIONS(request: NextRequest) {
  try {
    const template = TemplateService.generateIncomeTemplate();
    const validationRules = TemplateService.getValidationRules('income');
    
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
    console.error('Income template options error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEMPLATE_OPTIONS_ERROR',
        message: 'Failed to get income template options'
      }
    }, { status: 500 });
  }
}