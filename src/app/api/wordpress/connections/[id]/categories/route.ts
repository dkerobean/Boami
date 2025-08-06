import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import WordPressConnection from '@/lib/database/models/WordPressConnection';
import { WordPressAPI } from '@/lib/utils/wordpress-api';

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/wordpress/connections/[id]/categories - Fetch categories from WordPress connection
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Connection ID is required'
      }, { status: 400 });
    }

    // Find the connection with credentials
    const connection = await WordPressConnection.findById(id)
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
      isWooCommerce: connection.isWooCommerce,
      isActive: true
    }, {
      timeout: 30000, // 30 second timeout for category fetching
      retries: 2
    });

    try {
      // Fetch categories from WordPress
      const categories = await wpApi.getCategories();

      // Transform categories to include hierarchy information
      const transformedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        count: category.count || 0,
        parent: category.parent || 0,
        image: category.image || null,
        menuOrder: category.menu_order || 0,
        display: category.display || 'default'
      }));

      // Build category hierarchy
      const categoryHierarchy = buildCategoryHierarchy(transformedCategories);

      // Get additional statistics
      const stats = {
        totalCategories: transformedCategories.length,
        topLevelCategories: transformedCategories.filter(cat => cat.parent === 0).length,
        categoriesWithProducts: transformedCategories.filter(cat => cat.count > 0).length,
        totalProductsInCategories: transformedCategories.reduce((sum, cat) => sum + cat.count, 0)
      };

      return NextResponse.json({
        success: true,
        data: {
          categories: transformedCategories,
          hierarchy: categoryHierarchy,
          stats,
          connectionInfo: {
            id: connection._id,
            name: connection.name,
            siteUrl: connection.siteUrl,
            lastSyncDate: connection.lastSyncDate
          }
        }
      });

    } catch (fetchError: any) {
      console.error('Failed to fetch categories from WordPress:', fetchError);
      
      let errorMessage = 'Failed to fetch categories from WordPress';
      
      if (fetchError.response?.status === 401) {
        errorMessage = 'Authentication failed. Please check your consumer key and secret.';
      } else if (fetchError.response?.status === 404) {
        errorMessage = 'Categories endpoint not found. Please ensure WooCommerce is installed and REST API is enabled.';
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
          code: fetchError.code
        } : undefined
      }, { status: 502 });
    }

  } catch (error) {
    console.error('WordPress categories API error:', error);

    // Handle invalid ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid connection ID'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch categories',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : error) : undefined
    }, { status: 500 });
  }
}

/**
 * Helper function to build category hierarchy
 */
function buildCategoryHierarchy(categories: any[]): any[] {
  const categoryMap = new Map();
  const hierarchy: any[] = [];

  // Create a map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, {
      ...category,
      children: []
    });
  });

  // Build the hierarchy
  categories.forEach(category => {
    const categoryWithChildren = categoryMap.get(category.id);
    
    if (category.parent === 0) {
      // Top-level category
      hierarchy.push(categoryWithChildren);
    } else {
      // Child category
      const parent = categoryMap.get(category.parent);
      if (parent) {
        parent.children.push(categoryWithChildren);
      } else {
        // Parent not found, treat as top-level
        hierarchy.push(categoryWithChildren);
      }
    }
  });

  // Sort categories by name within each level
  const sortCategories = (cats: any[]) => {
    cats.sort((a, b) => a.name.localeCompare(b.name));
    cats.forEach(cat => {
      if (cat.children && cat.children.length > 0) {
        sortCategories(cat.children);
      }
    });
  };

  sortCategories(hierarchy);

  return hierarchy;
}