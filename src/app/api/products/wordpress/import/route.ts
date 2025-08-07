import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/connection';
import Product from '@/lib/database/models/Product';
import ProductVariant from '@/lib/database/models/ProductVariant';
import WordPressConnection from '@/lib/database/models/WordPressConnection';
import WordPressImportJob from '@/lib/database/models/WordPressImportJob';
import { WordPressAPI } from '@/lib/utils/wordpress-api';
import { SKUGenerator } from '@/lib/utils/sku-generator';
import { InventoryManager } from '@/lib/utils/inventory-manager';
import { WordPressProduct } from '@/app/(dashboard)/types/apps/eCommerce';

const importRequestSchema = yup.object({
  connectionId: yup.string().required('Connection ID is required'),
  filters: yup.object({
    status: yup.array().of(yup.string()).default(['publish']),
    category: yup.array().of(yup.string()),
    featured: yup.boolean(),
    onSale: yup.boolean(),
    minPrice: yup.string(),
    maxPrice: yup.string(),
    stockStatus: yup.array().of(yup.string()),
    dateFrom: yup.date(),
    dateTo: yup.date(),
    includeVariations: yup.boolean().default(true),
    updateExisting: yup.boolean().default(true)
  }).default({}),
  options: yup.object({
    batchSize: yup.number().min(1).max(100).default(50),
    delayBetweenBatches: yup.number().min(100).default(1000),
    generateMissingSKUs: yup.boolean().default(true),
    syncImages: yup.boolean().default(true),
    createCategories: yup.boolean().default(true)
  }).default({})
});

/**
 * POST /api/products/wordpress/import - Start WordPress product import
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const validatedData = await importRequestSchema.validate(body);

    // Find WordPress connection
    const connection = await WordPressConnection.findById(validatedData.connectionId);
    if (!connection) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection not found'
      }, { status: 404 });
    }

    if (!connection.isActive) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection is inactive'
      }, { status: 400 });
    }

    // Test connection before starting import
    const wordpressAPI = new WordPressAPI(connection as any);
    const connectionTest = await wordpressAPI.testConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: `WordPress connection failed: ${connectionTest.message}`
      }, { status: 400 });
    }

    // Create import job
    const importJob = await WordPressImportJob.createJob({
      connectionId: validatedData.connectionId,
      status: 'pending',
      filters: {
        ...validatedData.filters,
        includeVariations: validatedData.filters.includeVariations,
        includeImages: validatedData.options.syncImages,
        updateExisting: validatedData.filters.updateExisting,
        pageSize: validatedData.options.batchSize
      },
      triggeredBy: 'manual',
      userId: 'system', // TODO: Get from JWT token
      notes: 'WordPress product import'
    });

    // Start import process asynchronously
    processWordPressImport(importJob, connection as any, validatedData)
      .catch(error => {
        console.error('WordPress import process error:', error);
        importJob.markFailed(error.message);
      });

    return NextResponse.json({
      success: true,
      message: 'WordPress import started successfully',
      data: {
        jobId: importJob.jobId,
        status: importJob.status,
        progress: importJob.progress
      }
    });

  } catch (error) {
    console.error('WordPress import start error:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to start WordPress import'
    }, { status: 500 });
  }
}

/**
 * GET /api/products/wordpress/import - Get import job status
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      // Return recent import jobs
      const recentJobs = await WordPressImportJob.findRecentJobs(10);
      return NextResponse.json({
        success: true,
        data: recentJobs
      });
    }

    // Find specific job
    const job = await WordPressImportJob.findByJobId(jobId);
    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Import job not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Import job status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get import job status'
    }, { status: 500 });
  }
}

/**
 * Process WordPress import asynchronously
 */
async function processWordPressImport(
  job: any,
  connection: any,
  config: any
): Promise<void> {
  const wordpressAPI = new WordPressAPI(connection);
  
  try {
    // Update job status
    job.status = 'processing';
    job.progress.currentStep = 'Fetching products from WordPress';
    await job.save();

    // Get all products from WordPress
    const products = await wordpressAPI.getAllProducts(
      {
        status: config.filters.status?.join(',') || 'publish',
        category: config.filters.category?.join(','),
        featured: config.filters.featured,
        on_sale: config.filters.onSale,
        min_price: config.filters.minPrice,
        max_price: config.filters.maxPrice,
        stock_status: config.filters.stockStatus?.join(','),
        after: config.filters.dateFrom?.toISOString(),
        before: config.filters.dateTo?.toISOString(),
        per_page: config.options.batchSize || 50
      },
      (progress) => {
        // Update job progress
        job.progress.total = progress.total;
        job.progress.processed = progress.processed;
        job.progress.currentStep = `Fetching products (${progress.processed}/${progress.total})`;
        job.save().catch(console.error);
      }
    );

    // Process products
    job.progress.total = products.length;
    job.progress.processed = 0;
    job.progress.currentStep = 'Processing products';
    await job.save();

    for (let index = 0; index < products.length; index++) {
      const wpProduct = products[index];
      try {
        await processWordPressProduct(wpProduct, job, config);
        job.progress.processed = index + 1;
        job.progress.imported++;
        
        // Update progress every 10 products
        if ((index + 1) % 10 === 0) {
          job.progress.currentStep = `Processed ${index + 1}/${products.length} products`;
          await job.save();
        }

        // Add delay between products to avoid overwhelming the system
        if (config.options.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, config.options.delayBetweenBatches));
        }
        
      } catch (error) {
        console.error(`Error processing WordPress product ${wpProduct.id}:`, error);
        job.progress.failed++;
        await job.addError({
          level: 'error',
          message: `Failed to process product ${wpProduct.name}: ${error instanceof Error ? error.message : error}`,
          productId: wpProduct.id
        });
      }
    }

    // Complete the job
    await job.markCompleted();
    
    // Update connection stats
    await connection.updateSyncStats({
      imported: job.progress.imported,
      synced: job.progress.imported + job.progress.updated,
      errors: job.progress.failed
    });

  } catch (error) {
    console.error('WordPress import process error:', error);
    await job.markFailed(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Process individual WordPress product
 */
async function processWordPressProduct(
  wpProduct: WordPressProduct,
  job: any,
  config: any
): Promise<void> {
  // Check if product already exists
  const existingProduct = await Product.findByWordPressId(wpProduct.id);
  
  if (existingProduct && !config.filters.updateExisting) {
    job.progress.skipped++;
    return;
  }

  // Transform WordPress product to our format
  const productData = transformWordPressProduct(wpProduct, config);

  if (existingProduct) {
    // Update existing product
    await updateExistingProduct(existingProduct, productData, wpProduct, job);
    job.progress.updated++;
  } else {
    // Create new product
    await createNewProduct(productData, wpProduct, job, config);
    job.progress.imported++;
  }
}

/**
 * Transform WordPress product to our product format
 */
function transformWordPressProduct(wpProduct: WordPressProduct, config: any): any {
  const categories = wpProduct.categories?.map(cat => cat.name) || [];
  const tags = wpProduct.tags?.map(tag => tag.name) || [];
  
  return {
    title: wpProduct.name,
    description: wpProduct.description,
    shortDescription: wpProduct.shortDescription,
    price: parseFloat(wpProduct.price) || 0,
    regularPrice: parseFloat(wpProduct.regularPrice) || undefined,
    salePrice: parseFloat(wpProduct.salePrice) || undefined,
    sku: wpProduct.sku,
    category: categories,
    type: wpProduct.type === 'variable' ? 'variable' : 'simple',
    status: wpProduct.status === 'publish' ? 'publish' : 'draft',
    featured: wpProduct.featured,
    virtual: wpProduct.virtual,
    downloadable: wpProduct.downloadable,
    qty: wpProduct.stockQuantity || 0,
    stockStatus: wpProduct.stockStatus,
    manageStock: wpProduct.manageStock,
    backordersAllowed: wpProduct.backordersAllowed,
    weight: parseFloat(wpProduct.weight) || undefined,
    dimensions: wpProduct.dimensions,
    photo: wpProduct.images?.[0]?.src || '',
    gallery: wpProduct.images?.slice(1).map(img => img.src) || [],
    tags: tags,
    wordpress: {
      id: wpProduct.id,
      sourceUrl: '', // Will be set from connection
      slug: wpProduct.slug,
      lastSync: new Date(),
      syncStatus: 'synced',
      dateCreated: new Date(wpProduct.dateCreated),
      dateModified: new Date(wpProduct.dateModified),
      totalSales: wpProduct.totalSales
    }
  };
}

/**
 * Update existing product with WordPress data
 */
async function updateExistingProduct(
  existingProduct: any,
  productData: any,
  wpProduct: WordPressProduct,
  job: any
): Promise<void> {
  // Update product fields
  Object.assign(existingProduct, {
    ...productData,
    updatedAt: new Date()
  });

  await existingProduct.save();

  // Update WordPress sync status
  await existingProduct.markAsSynced();
}

/**
 * Create new product from WordPress data
 */
async function createNewProduct(
  productData: any,
  wpProduct: WordPressProduct,
  job: any,
  config: any
): Promise<void> {
  // Generate SKU if missing and option is enabled
  if (!productData.sku && config.options.generateMissingSKUs) {
    productData.sku = await SKUGenerator.generateProductSKU({
      title: productData.title,
      category: productData.category,
      brand: productData.brand
    });
  }

  // Create product
  const product = new Product({
    ...productData,
    salesPrice: productData.salePrice || productData.price,
    stock: productData.qty > 0,
    rating: 0,
    averageRating: 0,
    ratingCount: 0,
    reviewsAllowed: true,
    related: false,
    relatedIds: [],
    upsellIds: [],
    crossSellIds: [],
    colors: []
  });

  await product.save();

  // Create initial inventory log
  if (productData.qty > 0 && productData.sku) {
    await InventoryManager.updateInventory({
      sku: productData.sku,
      type: 'restock',
      quantity: productData.qty,
      reason: 'WordPress import - initial stock',
      userId: job.userId,
      source: 'import',
      metadata: {
        wordpressProductId: wpProduct.id,
        importJobId: job.jobId
      }
    });
  }

  // Handle variations if this is a variable product
  if (wpProduct.type === 'variable' && wpProduct.variations && wpProduct.variations.length > 0) {
    await createProductVariations(product, wpProduct, job, config);
  }
}

/**
 * Create product variations from WordPress data
 */
async function createProductVariations(
  product: any,
  wpProduct: WordPressProduct,
  job: any,
  config: any
): Promise<void> {
  // This is a simplified version - you'd need to fetch actual variation data
  // from WordPress API for complete implementation
  for (const variationId of wpProduct.variations) {
    try {
      // In a real implementation, you'd fetch the variation details:
      // const variation = await wordpressAPI.getProductVariation(wpProduct.id, variationId);
      
      // For now, create a basic variation structure
      const variantSKU = await SKUGenerator.generateVariantSKU(
        { title: product.title, sku: product.sku },
        { attributes: [{ name: 'Variation', value: `Var-${variationId}` }] }
      );

      const variant = new ProductVariant({
        productId: product._id,
        sku: variantSKU,
        attributes: [{ name: 'Variation', value: `Var-${variationId}` }],
        pricing: {
          price: product.price,
          currency: 'USD'
        },
        inventory: {
          quantity: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: 5,
          backordersAllowed: false
        },
        status: 'active',
        isDefault: false,
        wordpress: {
          id: variationId,
          lastSync: new Date(),
          syncStatus: 'synced'
        }
      });

      await variant.save();
      
    } catch (error) {
      console.error(`Error creating variation ${variationId}:`, error);
      await job.addError({
        level: 'warning',
        message: `Failed to create variation ${variationId}: ${error instanceof Error ? error.message : error}`,
        productId: wpProduct.id
      });
    }
  }
}