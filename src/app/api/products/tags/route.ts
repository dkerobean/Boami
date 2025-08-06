import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import Product from '@/lib/database/models/Product';

/**
 * GET /api/products/tags
 * Fetch unique tags from all products
 */
export async function GET() {
  try {
    await connectToDatabase();
    
    // Use MongoDB aggregation to get unique tags
    const tagsResult = await Product.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, tag: '$_id' } }
    ]);
    
    const tags = tagsResult.map(item => item.tag).filter(Boolean);
    
    return NextResponse.json({
      success: true,
      data: {
        tags,
        count: tags.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tags',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}