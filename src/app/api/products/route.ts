import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Product from '@/lib/database/models/Product';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/products - Get products for invoice creation
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const stockStatus = searchParams.get('stockStatus') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    let query: any = { status: 'publish' };

    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add category filter
    if (category && category !== 'All') {
      query.category = { $in: [category] };
    }

    // Add stock status filter
    if (stockStatus === 'In Stock') {
      query.stock = true;
      query.qty = { $gt: 0 };
    } else if (stockStatus === 'Out of Stock') {
      query.$or = [
        { stock: false },
        { qty: { $lte: 0 } }
      ];
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('title description price salePrice discount salesPrice sku category stock qty photo colors rating')
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    // Transform products for SaleForm compatibility
    const transformedProducts = products.map(product => ({
      _id: product._id.toString(),
      title: product.title,
      description: product.description,
      price: product.salesPrice || product.price,
      qty: product.qty || 0,
      sku: product.sku || `SKU-${product._id}`,
      manageStock: true, // Assume all products manage stock unless specified otherwise
      stockStatus: product.stock && product.qty > 0 ? 'instock' : (product.qty === 0 ? 'outofstock' : 'onbackorder'),
      category: product.category,
      photo: product.photo,
      colors: product.colors,
      rating: product.rating
    }));

    // Get unique categories for filtering
    const categories = await Product.distinct('category', { status: 'publish' });

    return NextResponse.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      categories: ['All', ...categories]
    }, { status: 200 });

  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve products' } },
      { status: 500 }
    );
  }
}