import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import WordPressConnection from '@/lib/database/models/WordPressConnection';
import { WordPressAPI, ProductFilter } from '@/lib/utils/wordpress-api';

// Validation schema for product count filters
const productCountSchema = yup.object({
  connectionId: yup.string().required('Connection ID is required'),
  filters: yup.object({
    status: yup.string().oneOf(['any', 'draft', 'pending', 'private', 'publish']).default('publish'),
    category: yup.string(),
    tag: yup.string(),
    featured: yup.boolean(),
    on_sale: yup.boolean(),
    min_price: yup.string(),
    max_price: yup.string(),
    stock_status: yup.string().oneOf(['instock', 'outofstock', 'onbackorder']),
    search: yup.string(),
    after: yup.string(), // Date filter - products created after this date
    before: yup.string() // Date filter - products created before this date
  }).default({})
});

/**
 * POST /api/wordpress/products/count - Get filtered product count from WordPress connection
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Validate request body
    let validatedData: any;
    try {
      validatedData = await productCountSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: validationError instanceof yup.ValidationError ? validationError.errors : [validationError]
      }, { status: 400 });
    }

    const { connectionId, filters } = validatedData;

    // Find the connection with credentials
    const connection = await WordPressConnection.findById(connectionId)
      .select('+consumerKey +consumerSecret');

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection not found'
      }, { status: 404 });
    }

    // Check if connection is active and tested
    if (!connection.isActive) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection is not active'
      }, { status: 400 });
    }

    if (!connection.testResult?.success) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection has not been successfully tested. Please test the connection first.'
      }, { status: 400 });
    }

    // Create WordPress API instance
    const wpApi = new WordPressAPI({
      siteUrl: connection.siteUrl,
      consumerKey: connection.consumerKey,
      consumerSecret: connection.consumerSecret,
      version: connection.version,
      isWooCommerce: connection.isWooCommerce
    }, {
      timeout: 30000, // 30 second timeout for product counting
      retries: 2
    });

    try {
      // Prepare filters for the WordPress API
      const apiFilters: ProductFilter = {
        ...filters,
        per_page: 1 // We only need the count, not the actual products
      };

      // Get the product count with filters
      const productCount = await wpApi.getProductCount(apiFilters);

      // Get additional statistics for comparison
      const stats = {
        totalProducts: await wpApi.getProductCount({ status: 'any' }),
        publishedProducts: await wpApi.getProductCount({ status: 'publish' }),
        draftProducts: await wpApi.getProductCount({ status: 'draft' }),
        inStockProducts: await wpApi.getProductCount({ stock_status: 'instock' }),
        outOfStockProducts: await wpApi.getProductCount({ stock_status: 'outofstock' }),
        featuredProducts: await wpApi.getProductCount({ featured: true }),
        onSaleProducts: await wpApi.getProductCount({ on_sale: true })
      };

      // Calculate filter impact
      const filterImpact = {
        originalCount: stats.publishedProducts,
        filteredCount: productCount,
        reductionPercentage: stats.publishedProducts > 0 
          ? Math.round(((stats.publishedProducts - productCount) / stats.publishedProducts) * 100)
          : 0,
        filtersApplied: Object.keys(filters).filter(key => filters[key] !== undefined && filters[key] !== '').length
      };

      return NextResponse.json({
        success: true,
        data: {
          count: productCount,
          filters: filters,
          stats,
          filterImpact,
          connectionInfo: {
            id: connection._id,
            name: connection.name,
            siteUrl: connection.siteUrl,
            lastSyncDate: connection.lastSyncDate
          },
          metadata: {
            timestamp: new Date().toISOString(),
            apiVersion: connection.version,
            isWooCommerce: connection.isWooCommerce
          }
        }
      });

    } catch (fetchError: any) {
      console.error('Failed to get product count from WordPress:', fetchError);
      
      let errorMessage = 'Failed to get product count from WordPress';
      
      if (fetchError.response?.status === 401) {
        errorMessage = 'Authentication failed. Please check your consumer key and secret.';
      } else if (fetchError.response?.status === 404) {
        errorMessage = 'Products endpoint not found. Please ensure WooCommerce is installed and REST API is enabled.';
      } else if (fetchError.response?.status === 403) {
        errorMessage = 'Permission denied. Please ensure your consumer key has read permissions.';
      } else if (fetchError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused. Please check if the WordPress site is accessible.';
      } else if (fetchError.code === 'ENOTFOUND') {
        errorMessage = 'Site not found. Please check the site URL.';
      } else if (fetchError.message) {
        errorMessage = `WordPress API error: ${fetchError.message}`;
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          originalError: fetchError.message,
          status: fetchError.response?.status,
          code: fetchError.code,
          filters: filters
        } : undefined
      }, { status: 502 });
    }

  } catch (error) {
    console.error('WordPress product count API error:', error);

    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    // Handle invalid ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid connection ID'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get product count',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : error) : undefined
    }, { status: 500 });
  }
}