/**
 * Template Service for generating CSV import templates
 * Provides standardized templates for income and expense imports
 */

export interface TemplateData {
  headers: string[];
  sampleRows: any[][];
  filename: string;
  description: string;
}

export class TemplateService {
  /**
   * Generate income import template
   */
  static generateIncomeTemplate(): TemplateData {
    const headers = [
      'Date',
      'Description', 
      'Amount',
      'Category',
      'Recurring'
    ];

    const sampleRows = [
      [
        '2024-01-15',
        'Freelance Web Development Project',
        '2500.00',
        'Consulting',
        'No'
      ],
      [
        '2024-01-20',
        'Investment Dividend Payment',
        '450.75',
        'Investments',
        'Yes'
      ],
      [
        '2024-01-25',
        'Monthly Salary',
        '5000.00',
        'Employment',
        'No'
      ],
      [
        '2024-01-28',
        'Rental Income - Downtown Property',
        '1800.00',
        'Real Estate',
        'Yes'
      ],
      [
        '2024-01-30',
        'Online Course Sales',
        '750.50',
        'Business',
        'No'
      ],
      [
        '2024-02-01',
        'Royalty Payment',
        '125.00',
        'Royalties',
        'Yes'
      ]
    ];

    return {
      headers,
      sampleRows,
      filename: 'income_import_template.csv',
      description: 'Template for importing income records'
    };
  }

  /**
   * Generate expense import template
   */
  static generateExpenseTemplate(): TemplateData {
    const headers = [
      'Date',
      'Description',
      'Amount', 
      'Category',
      'Vendor',
      'Recurring'
    ];

    const sampleRows = [
      [
        '2024-01-10',
        'Office Supplies - Pens, Paper, Stapler',
        '89.99',
        'Office Expenses',
        'Staples',
        'No'
      ],
      [
        '2024-01-15',
        'Monthly Office Rent',
        '2000.00',
        'Rent',
        'Property Management LLC',
        'Yes'
      ],
      [
        '2024-01-18',
        'Client Business Lunch',
        '125.75',
        'Meals & Entertainment',
        'Downtown Bistro',
        'No'
      ],
      [
        '2024-01-20',
        'Internet Service - Monthly',
        '79.99',
        'Utilities',
        'Internet Provider Inc',
        'Yes'
      ],
      [
        '2024-01-22',
        'Marketing Campaign - Google Ads',
        '350.00',
        'Marketing',
        'Google',
        'No'
      ],
      [
        '2024-01-25',
        'Software Subscription - Adobe Creative',
        '52.99',
        'Software',
        'Adobe',
        'Yes'
      ],
      [
        '2024-01-28',
        'Business Travel - Flight to Conference',
        '425.00',
        'Travel',
        'Delta Airlines',
        'No'
      ],
      [
        '2024-01-30',
        'Equipment Purchase - Monitor',
        '299.99',
        'Equipment',
        'Best Buy',
        'No'
      ]
    ];

    return {
      headers,
      sampleRows,
      filename: 'expense_import_template.csv',
      description: 'Template for importing expense records'
    };
  }

  /**
   * Convert template data to CSV string
   */
  static templateToCSV(template: TemplateData, includeInstructions: boolean = true): string {
    const lines: string[] = [];
    
    if (includeInstructions) {
      lines.push('# BOAMI Financial Data Import Template');
      lines.push(`# ${template.description}`);
      lines.push('#');
      lines.push('# INSTRUCTIONS:');
      lines.push('# 1. Replace the sample data below with your actual financial records');
      lines.push('# 2. Keep the header row (first non-comment line) unchanged');
      lines.push('# 3. Date format: YYYY-MM-DD (e.g., 2024-01-15)');
      lines.push('# 4. Amount format: Numbers only, no currency symbols (e.g., 1234.56)');
      lines.push('# 5. Recurring: Use "Yes" or "No" (case insensitive)');
      lines.push('#');
      lines.push('# FIELD DESCRIPTIONS:');
      lines.push('# - Date: Transaction date (required)');
      lines.push('# - Description: Brief description of the transaction (required)');
      lines.push('# - Amount: Transaction amount in USD (required, positive numbers only)');
      lines.push('# - Category: Income/Expense category (optional, will create if not exists)');
      
      if (template.filename.includes('expense')) {
        lines.push('# - Vendor: Vendor/supplier name (optional for expenses, will create if not exists)');
      }
      
      lines.push('# - Recurring: Whether this is a recurring transaction (optional)');
      lines.push('#');
      lines.push('# TIPS:');
      lines.push('# - Remove these instruction lines before importing');
      lines.push('# - You can add more rows as needed');
      lines.push('# - Empty rows will be ignored');
      lines.push('# - Special characters in descriptions are allowed');
      lines.push('#');
      lines.push('');
    }

    // Add headers
    lines.push(template.headers.join(','));

    // Add sample data
    template.sampleRows.forEach(row => {
      const csvRow = row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
      lines.push(csvRow.join(','));
    });

    return lines.join('\n');
  }

  /**
   * Generate template with field format examples
   */
  static generateFieldExamples(type: 'income' | 'expense'): Record<string, string[]> {
    const commonExamples = {
      date: [
        '2024-01-15',
        '2024-02-28', 
        '2024-12-31'
      ],
      description: [
        'Freelance consulting payment',
        'Monthly office rent',
        'Client business lunch',
        'Software subscription renewal'
      ],
      amount: [
        '1234.56',
        '89.99',
        '2500.00',
        '15.75'
      ],
      recurring: [
        'Yes',
        'No',
        'true',
        'false'
      ]
    };

    if (type === 'income') {
      return {
        ...commonExamples,
        category: [
          'Consulting',
          'Employment',
          'Investments',
          'Real Estate',
          'Business',
          'Royalties'
        ]
      };
    } else {
      return {
        ...commonExamples,
        category: [
          'Office Expenses',
          'Rent',
          'Meals & Entertainment',
          'Utilities',
          'Marketing',
          'Software',
          'Travel',
          'Equipment'
        ],
        vendor: [
          'Staples',
          'Property Management LLC',
          'Downtown Bistro',
          'Google',
          'Adobe',
          'Delta Airlines'
        ]
      };
    }
  }

  /**
   * Get template validation rules
   */
  static getValidationRules(type: 'income' | 'expense'): Record<string, any> {
    const baseRules = {
      date: {
        required: true,
        format: 'YYYY-MM-DD',
        description: 'Transaction date in ISO format',
        examples: ['2024-01-15', '2024-12-31']
      },
      description: {
        required: true,
        maxLength: 500,
        description: 'Brief description of the transaction',
        examples: ['Monthly rent payment', 'Freelance project fee']
      },
      amount: {
        required: true,
        type: 'number',
        minimum: 0.01,
        description: 'Transaction amount (positive numbers only)',
        examples: ['1234.56', '89.99', '2500.00']
      },
      category: {
        required: false,
        description: 'Category for organizing transactions (will be created if missing)',
        examples: type === 'income' 
          ? ['Consulting', 'Employment', 'Investments']
          : ['Office Expenses', 'Rent', 'Marketing']
      },
      recurring: {
        required: false,
        type: 'boolean',
        description: 'Whether this is a recurring transaction',
        examples: ['Yes', 'No', 'true', 'false']
      }
    };

    if (type === 'expense') {
      (baseRules as any).vendor = {
        required: false,
        description: 'Vendor or supplier name (will be created if missing)',
        examples: ['Staples', 'Google', 'Adobe']
      };
    }

    return baseRules;
  }

  /**
   * Generate a comprehensive help document
   */
  static generateHelpDocument(type: 'income' | 'expense'): string {
    const rules = this.getValidationRules(type);
    const examples = this.generateFieldExamples(type);
    
    const lines = [
      `# ${type.charAt(0).toUpperCase() + type.slice(1)} Import Help Guide`,
      '',
      '## Overview',
      `This guide explains how to prepare your ${type} data for import into BOAMI.`,
      '',
      '## Required File Format',
      '- **File Types**: CSV (.csv), Excel (.xls, .xlsx)',
      '- **File Size**: Maximum 10MB',
      '- **Encoding**: UTF-8 (recommended)',
      '',
      '## Required Fields',
      ''
    ];

    // Add field documentation
    Object.entries(rules).forEach(([field, rule]) => {
      lines.push(`### ${field.charAt(0).toUpperCase() + field.slice(1)}`);
      lines.push(`- **Required**: ${rule.required ? 'Yes' : 'No'}`);
      lines.push(`- **Description**: ${rule.description}`);
      
      if (rule.format) lines.push(`- **Format**: ${rule.format}`);
      if (rule.type) lines.push(`- **Type**: ${rule.type}`);
      if (rule.maxLength) lines.push(`- **Max Length**: ${rule.maxLength} characters`);
      if (rule.minimum) lines.push(`- **Minimum Value**: ${rule.minimum}`);
      
      if (examples[field]) {
        lines.push(`- **Examples**: ${examples[field].join(', ')}`);
      }
      lines.push('');
    });

    lines.push('## Import Process');
    lines.push('1. Download the template file');
    lines.push('2. Replace sample data with your actual records');
    lines.push('3. Save the file as CSV format');
    lines.push('4. Upload using the import feature');
    lines.push('5. Map columns to system fields');
    lines.push('6. Review validation results');
    lines.push('7. Complete the import');
    lines.push('');

    lines.push('## Common Issues & Solutions');
    lines.push('- **Date Format Errors**: Use YYYY-MM-DD format (e.g., 2024-01-15)');
    lines.push('- **Amount Format Errors**: Use numbers only, no currency symbols');
    lines.push('- **Missing Required Fields**: Ensure Date, Description, and Amount are provided');
    lines.push('- **Category Not Found**: Enable "Create Categories" option during import');
    
    if (type === 'expense') {
      lines.push('- **Vendor Not Found**: Enable "Create Vendors" option during import');
    }

    return lines.join('\n');
  }

  /**
   * Get quick start guide
   */
  static getQuickStartGuide(type: 'income' | 'expense'): string[] {
    const steps = [
      '1. Download the template file below',
      '2. Open the template in Excel or Google Sheets',
      '3. Replace the sample data with your actual records',
      '4. Keep the header row unchanged',
      '5. Save as CSV format',
      '6. Use the import feature to upload your file'
    ];

    return steps;
  }
}