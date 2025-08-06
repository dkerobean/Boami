import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Product from '@/lib/database/models/Product';
import { connectToDatabase } from '@/lib/database/connection';

// Import job data schema
const importDataSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  fieldMapping: z.record(z.string(), z.string()),
  options: z.object({
    updateExisting: z.boolean().default(false),
    createCategories: z.boolean().default(false),
    skipInvalidRows: z.boolean().default(true),
  }).optional(),
});

// Helper function to map CSV fields to Product schema (simplified)
function mapRowToProduct(row: Record<string, any>, fieldMapping: Record<string, string>) {
  console.log('Mapping row:', row);
  console.log('Field mapping:', fieldMapping);
  
  const mapped: any = {
    // Set defaults for required fields
    type: 'simple',
    status: 'publish',
    featured: false,
    virtual: false,
    downloadable: false,
    stock: true,
    stockStatus: 'instock',
    manageStock: true,
    backordersAllowed: false,
    lowStockThreshold: 5,
    rating: 0,
    reviewsAllowed: true,
    related: false,
    colors: [],
    tags: [],
    gallery: []
  };
  
  for (const [csvField, dbField] of Object.entries(fieldMapping)) {
    const value = row[csvField];
    console.log(`Mapping ${csvField} -> ${dbField}:`, value);
    
    if (value === undefined || value === null || value === '') {
      console.log(`Skipping empty value for ${csvField}`);
      continue;
    }
    
    switch (dbField) {
      case 'title':
      case 'description':
      case 'sku':
      case 'photo':
        mapped[dbField] = String(value).trim();
        break;
        
      case 'price':
        const priceValue = parseFloat(String(value));
        if (!isNaN(priceValue)) {
          mapped[dbField] = priceValue;
          mapped['salesPrice'] = priceValue; // Also map to salesPrice field for Product schema
        }
        break;
        
      case 'qty':
        const qtyValue = parseFloat(String(value));
        if (!isNaN(qtyValue)) {
          mapped[dbField] = qtyValue;
          mapped['stockQuantity'] = qtyValue; // Also map to stockQuantity field
        }
        break;
        
      case 'category':
        // Handle category as array (required by schema)
        mapped[dbField] = [String(value).trim()];
        break;
        
      default:
        mapped[dbField] = value;
    }
  }
  
  console.log('Mapped product:', mapped);
  return mapped;
}

// Validate product data against schema (simplified)
function validateProduct(productData: any): { isValid: boolean; errors: string[] } {
  console.log('Validating product:', productData);
  const errors: string[] = [];
  
  // Required fields (simplified)
  if (!productData.title || String(productData.title).trim() === '') {
    errors.push('Title is required');
  }
  if (!productData.description || String(productData.description).trim() === '') {
    errors.push('Description is required');
  }
  if (!productData.price || isNaN(productData.price) || productData.price <= 0) {
    errors.push('Valid price (greater than 0) is required');
  }
  if (!productData.photo || String(productData.photo).trim() === '') {
    errors.push('Photo URL is required');
  }
  if (!productData.category || !Array.isArray(productData.category) || productData.category.length === 0) {
    errors.push('At least one category is required');
  }
  
  console.log('Validation errors:', errors);
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * POST /api/bulk-upload/import
 * Processes bulk import data and creates/updates products in MongoDB
 */
export async function POST(request: NextRequest) {
  console.log('Starting bulk import process...');
  
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connected successfully');
    
    const body = await request.json();
    console.log('Request body received:', { 
      dataLength: body.data?.length, 
      fieldMapping: body.fieldMapping,
      options: body.options 
    });
    
    const { data, fieldMapping, options } = importDataSchema.parse(body);
    
    // Debug: Check if fieldMapping is empty
    if (Object.keys(fieldMapping).length === 0) {
      console.error('ERROR: Field mapping is empty! This will cause all validations to fail.');
      console.log('Available CSV fields:', data.length > 0 ? Object.keys(data[0]) : 'No data provided');
      return NextResponse.json({
        success: false,
        error: 'Field mapping is required',
        message: 'Please map your CSV columns to product fields before importing.',
        details: 'The field mapping object is empty. Make sure to complete the field mapping step.'
      }, { status: 400 });
    }
    
    console.log('Field mapping received:', fieldMapping);
    console.log('Number of mapped fields:', Object.keys(fieldMapping).length);
    
    const results = {
      totalRows: data.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ row: number; errors: string[] }>
    };
    
    console.log(`Processing ${data.length} rows...`);
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;
      
      console.log(`Processing row ${rowNumber}:`, row);
      
      try {
        // Map CSV fields to Product schema
        const productData = mapRowToProduct(row, fieldMapping);
        
        // Validate the mapped data
        const validation = validateProduct(productData);
        if (!validation.isValid) {
          console.log(`Validation failed for row ${rowNumber}:`, validation.errors);
          results.errors.push({
            row: rowNumber,
            errors: validation.errors
          });
          results.failed++;
          results.processed++;
          continue;
        }
        
        // Check if product exists (by SKU)
        let existingProduct = null;
        if (productData.sku) {
          console.log(`Checking for existing product with SKU: ${productData.sku}`);
          existingProduct = await Product.findBySku(productData.sku);
        }
        
        if (existingProduct && options?.updateExisting) {
          // Update existing product
          console.log(`Updating existing product: ${existingProduct._id}`);
          Object.assign(existingProduct, productData);
          await existingProduct.save();
          results.updated++;
        } else if (existingProduct && !options?.updateExisting) {
          // Skip existing product
          console.log(`Skipping existing product: ${existingProduct._id}`);
          results.skipped++;
        } else {
          // Create new product
          console.log('Creating new product:', productData.title);
          const newProduct = new Product(productData);
          await newProduct.save();
          console.log('Product created successfully:', newProduct._id);
          results.created++;
        }
        
        results.processed++;
        
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.errors.push({
          row: rowNumber,
          errors: [errorMessage]
        });
        results.failed++;
        results.processed++;
      }
    }
    
    console.log('Import completed. Results:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Bulk import completed',
      results
    });
    
  } catch (error) {
    console.error('Bulk import error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      return NextResponse.json({
        success: false,
        error: 'Invalid import data format',
        details: error.issues,
      }, { status: 400 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Final error message:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process bulk import',
      message: errorMessage
    }, { status: 500 });
  }
}