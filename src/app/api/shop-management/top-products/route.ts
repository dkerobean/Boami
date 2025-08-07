import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import mongoose from 'mongoose';

interface TopProduct {
  _id: string;
  productId: string;
  name: string;
  sku: string;
  image?: string;
  salesCount: number;
  revenue: number;
  currentStock: number;
  price: number;
  category: string[];
}

/**
 * GET /api/shop-management/top-products
 * Get top performing products based on various metrics
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const metric = searchParams.get('metric') || 'sales'; // sales, revenue, stock

    let topProducts: TopProduct[] = [];

    try {
      // Try to get data from sales collection first
      const salesAggregation = await db.collection('sales')
        .aggregate([
          {
            $group: {
              _id: '$productId',
              salesCount: { $sum: '$quantity' },
              revenue: { $sum: '$total' },
              productName: { $first: '$productName' }
            }
          },
          {
            $sort: metric === 'revenue' ? { revenue: -1 } : { salesCount: -1 }
          },
          {
            $limit: limit
          }
        ])
        .toArray();

      // Get additional product details for sales data
      for (const sale of salesAggregation) {
        const product = await db.collection('products').findOne({
          _id: new mongoose.Types.ObjectId(sale._id)
        });

        if (product) {
          topProducts.push({
            _id: product._id.toString(),
            productId: product._id.toString(),
            name: product.title,
            sku: product.sku,
            image: product.photo,
            salesCount: sale.salesCount || 0,
            revenue: sale.revenue || 0,
            currentStock: product.qty || 0,
            price: product.price || 0,
            category: product.category || []
          });
        }
      }

    } catch (salesError) {
      console.log('Sales collection not available, using fallback method');
    }

    // If no sales data available, get products sorted by other metrics
    if (topProducts.length === 0) {
      let sortCriteria: any = {};
      
      switch (metric) {
        case 'stock':
          sortCriteria = { qty: -1 };
          break;
        case 'recent':
          sortCriteria = { createdAt: -1 };
          break;
        case 'price':
          sortCriteria = { price: -1 };
          break;
        default:
          sortCriteria = { createdAt: -1 }; // Default to most recent
      }

      const products = await db.collection('products')
        .find({ status: 'publish' })
        .sort(sortCriteria)
        .limit(limit)
        .toArray();

      topProducts = products.map(product => ({
        _id: product._id.toString(),
        productId: product._id.toString(),
        name: product.title,
        sku: product.sku,
        image: product.photo,
        salesCount: 0, // No sales data available
        revenue: 0,
        currentStock: product.qty || 0,
        price: product.price || 0,
        category: product.category || []
      }));
    }

    // Get inventory statistics
    const inventoryStats = await Promise.all([
      db.collection('products').countDocuments({ qty: { $gt: 0 } }),
      db.collection('products').countDocuments({ qty: 0 }),
      db.collection('products').countDocuments({ qty: { $lte: 10 } })
    ]);

    const response = {
      topProducts,
      metrics: {
        inStock: inventoryStats[0],
        outOfStock: inventoryStats[1],
        lowStock: inventoryStats[2]
      },
      meta: {
        sortedBy: metric,
        limit,
        hasRealSalesData: topProducts.some(p => p.salesCount > 0)
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Top products API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch top products'
      },
      { status: 500 }
    );
  }
}