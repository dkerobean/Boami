import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import Product from '@/lib/database/models/Product';

/**
 * GET /api/products/categories
 * Fetch unique categories from all products
 */
export async function GET() {
  try {
    await connectToDatabase();
    
    // Use MongoDB aggregation to get unique categories
    const categoriesResult = await Product.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, category: '$_id' } }
    ]);
    
    const categories = categoriesResult.map(item => item.category).filter(Boolean);
    
    return NextResponse.json({
      success: true,
      data: {
        categories,
        count: categories.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}