import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const validateDataSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  fieldMapping: z.record(z.string(), z.string()),
  options: z.object({
    strict: z.boolean().default(false),
    requireAllFields: z.boolean().default(false),
    validateUniqueness: z.boolean().default(true),
  }).optional(),
});

// Product field validation rules
const FIELD_VALIDATORS = {
  name: {
    required: true,
    validate: (value: any) => {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return 'Product name is required';
      }
      if (value.length > 255) {
        return 'Product name must be less than 255 characters';
      }
      return null;
    },
  },
  sku: {
    required: true,
    validate: (value: any) => {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return 'SKU is required';
      }
      if (!/^[A-Z0-9-_]+$/i.test(value)) {
        return 'SKU can only contain letters, numbers, hyphens, and underscores';
      }
      if (value.length > 100) {
        return 'SKU must be less than 100 characters';
      }
      return null;
    },
  },
  price: {
    required: true,
    validate: (value: any) => {
      if (!value) {
        return 'Price is required';
      }
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        return 'Price must be a valid positive number';
      }
      if (numValue > 999999.99) {
        return 'Price cannot exceed 999,999.99';
      }
      return null;
    },
  },
  category: {
    required: false,
    validate: (value: any) => {
      if (value && (typeof value !== 'string' || value.length > 100)) {
        return 'Category must be a string less than 100 characters';
      }
      return null;
    },
  },
  description: {
    required: false,
    validate: (value: any) => {
      if (value && (typeof value !== 'string' || value.length > 5000)) {
        return 'Description must be a string less than 5000 characters';
      }
      return null;
    },
  },
  stock_quantity: {
    required: false,
    validate: (value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
          return 'Stock quantity must be a valid non-negative integer';
        }
        if (numValue > 999999) {
          return 'Stock quantity cannot exceed 999,999';
        }
      }
      return null;
    },
  },
  weight: {
    required: false,
    validate: (value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          return 'Weight must be a valid non-negative number';
        }
        if (numValue > 999999) {
          return 'Weight cannot exceed 999,999';
        }
      }
      return null;
    },
  },
  brand: {
    required: false,
    validate: (value: any) => {
      if (value && (typeof value !== 'string' || value.length > 100)) {
        return 'Brand must be a string less than 100 characters';
      }
      return null;
    },
  },
  tags: {
    required: false,
    validate: (value: any) => {
      if (value && typeof value === 'string') {
        const tags = value.split(',').map(tag => tag.trim());
        if (tags.length > 20) {
          return 'Maximum 20 tags allowed';
        }
        const invalidTags = tags.filter(tag => tag.length > 50);
        if (invalidTags.length > 0) {
          return 'Each tag must be less than 50 characters';
        }
      }
      return null;
    },
  },
  image_url: {
    required: false,
    validate: (value: any) => {
      if (value && typeof value === 'string') {
        try {
          new URL(value);
          if (!value.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return 'Image URL must end with a valid image extension (jpg, jpeg, png, gif, webp)';
          }
        } catch {
          return 'Image URL must be a valid URL';
        }
      }
      return null;
    },
  },
  status: {
    required: false,
    validate: (value: any) => {
      if (value && !['active', 'draft', 'archived'].includes(value)) {
        return 'Status must be one of: active, draft, archived';
      }
      return null;
    },
  },
  featured: {
    required: false,
    validate: (value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        const boolValue = value.toString().toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
          return 'Featured must be a boolean value (true/false, 1/0, yes/no)';
        }
      }
      return null;
    },
  },
  sale_price: {
    required: false,
    validate: (value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          return 'Sale price must be a valid positive number';
        }
        if (numValue > 999999.99) {
          return 'Sale price cannot exceed 999,999.99';
        }
      }
      return null;
    },
  },
  barcode: {
    required: false,
    validate: (value: any) => {
      if (value && (typeof value !== 'string' || value.length > 50)) {
        return 'Barcode must be a string less than 50 characters';
      }
      return null;
    },
  },
};

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  fieldStats: {
    [field: string]: {
      total: number;
      valid: number;
      invalid: number;
      empty: number;
    };
  };
}

/**
 * POST /api/bulk-upload/validate
 * Validates imported data before processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = validateDataSchema.parse(body);
    
    const { data, fieldMapping, options } = validatedRequest;
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const fieldStats: { [field: string]: any } = {};
    
    // Initialize field stats
    Object.values(fieldMapping).forEach(field => {
      if (field && field !== '') {
        fieldStats[field] = {
          total: 0,
          valid: 0,
          invalid: 0,
          empty: 0,
        };
      }
    });
    
    // Track unique values for uniqueness validation
    const uniqueValues: { [field: string]: Set<string> } = {};
    const duplicateRows: { [field: string]: number[] } = {};
    
    // Validate each row
    data.forEach((row, index) => {
      const rowNumber = index + 1;
      
      // Check each mapped field
      Object.entries(fieldMapping).forEach(([csvField, productField]) => {
        if (!productField || productField === '') return;
        
        const value = row[csvField];
        const validator = FIELD_VALIDATORS[productField as keyof typeof FIELD_VALIDATORS];
        
        if (!validator) return;
        
        fieldStats[productField].total++;
        
        // Check if value is empty
        if (value === undefined || value === null || value === '') {
          fieldStats[productField].empty++;
          
          if (validator.required) {
            errors.push({
              row: rowNumber,
              field: productField,
              message: `${productField} is required`,
              value: value,
            });
            fieldStats[productField].invalid++;
          } else {
            fieldStats[productField].valid++;
          }
          return;
        }
        
        // Validate field value
        const validationError = validator.validate(value);
        if (validationError) {
          errors.push({
            row: rowNumber,
            field: productField,
            message: validationError,
            value: value,
          });
          fieldStats[productField].invalid++;
        } else {
          fieldStats[productField].valid++;
        }
        
        // Check for uniqueness (for certain fields)
        if (options?.validateUniqueness && ['sku', 'barcode'].includes(productField)) {
          const stringValue = String(value).trim();
          if (stringValue) {
            if (!uniqueValues[productField]) {
              uniqueValues[productField] = new Set();
              duplicateRows[productField] = [];
            }
            
            if (uniqueValues[productField].has(stringValue)) {
              duplicateRows[productField].push(rowNumber);
              errors.push({
                row: rowNumber,
                field: productField,
                message: `Duplicate ${productField}: ${stringValue}`,
                value: value,
              });
            } else {
              uniqueValues[productField].add(stringValue);
            }
          }
        }
      });
      
      // Cross-field validation
      const price = parseFloat(row[Object.keys(fieldMapping).find(key => fieldMapping[key] === 'price') || ''] || 0);
      const salePrice = parseFloat(row[Object.keys(fieldMapping).find(key => fieldMapping[key] === 'sale_price') || ''] || 0);
      
      if (price && salePrice && salePrice >= price) {
        warnings.push({
          row: rowNumber,
          field: 'sale_price',
          message: 'Sale price should be less than regular price',
          value: salePrice,
        });
      }
    });
    
    // Create validation summary
    const validationSummary: ValidationSummary = {
      totalRows: data.length,
      validRows: data.length - new Set(errors.map(e => e.row)).size,
      invalidRows: new Set(errors.map(e => e.row)).size,
      errors,
      warnings,
      fieldStats,
    };
    
    // Determine if validation passed
    const validationPassed = errors.length === 0 || (!options?.strict && validationSummary.validRows > 0);
    
    return NextResponse.json({
      success: true,
      data: {
        validationPassed,
        summary: validationSummary,
        recommendations: generateRecommendations(validationSummary),
      },
      message: validationPassed 
        ? 'Validation completed successfully'
        : 'Validation failed - please fix errors before importing',
    });
    
  } catch (error) {
    console.error('Error validating import data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to validate import data',
    }, { status: 500 });
  }
}

function generateRecommendations(summary: ValidationSummary): string[] {
  const recommendations: string[] = [];
  
  if (summary.errors.length > 0) {
    recommendations.push(`Fix ${summary.errors.length} validation errors before importing`);
  }
  
  if (summary.warnings.length > 0) {
    recommendations.push(`Review ${summary.warnings.length} warnings for data quality improvements`);
  }
  
  // Check for high error rates in specific fields
  Object.entries(summary.fieldStats).forEach(([field, stats]) => {
    const errorRate = stats.invalid / stats.total;
    if (errorRate > 0.1) { // More than 10% errors
      recommendations.push(`High error rate in ${field} field (${Math.round(errorRate * 100)}%) - consider reviewing data format`);
    }
    
    const emptyRate = stats.empty / stats.total;
    if (emptyRate > 0.5) { // More than 50% empty
      recommendations.push(`Many empty values in ${field} field (${Math.round(emptyRate * 100)}%) - consider if this field is necessary`);
    }
  });
  
  if (summary.validRows / summary.totalRows < 0.8) {
    recommendations.push('Less than 80% of rows are valid - consider reviewing your data source');
  }
  
  return recommendations;
}