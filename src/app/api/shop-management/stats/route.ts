import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import mongoose from 'mongoose';

/**
 * GET /api/shop-management/stats
 * Get real-time shop statistics using MongoDB operations
 */
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

    // Get total products count
    const totalProducts = await db.collection('products').countDocuments();

    // Get published products count
    const publishedProducts = await db.collection('products').countDocuments({
      status: 'publish'
    });

    // Get out of stock products
    const outOfStockProducts = await db.collection('products').countDocuments({
      qty: 0
    });

    // Get low stock products (qty <= lowStockThreshold or qty <= 5)
    const lowStockProducts = await db.collection('products').countDocuments({
      $or: [
        { qty: { $lte: 5 } },
        { $expr: { $lte: ['$qty', '$lowStockThreshold'] } }
      ]
    });

    // Get active stock alerts count
    const activeAlerts = await db.collection('stockalerts').countDocuments({
      status: 'active'
    });

    // Get recent activities count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = await db.collection('inventorylogs').countDocuments({
      createdAt: { $gte: yesterday }
    });

    const stats = {
      totalProducts,
      publishedProducts,
      outOfStockProducts,
      lowStockProducts,
      activeAlerts,
      recentActivities,
      lastUpdated: new Date().toISOString()
    };

    console.log('Shop management stats:', stats);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Shop management stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch shop management statistics'
      },
      { status: 500 }
    );
  }
}