import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import mongoose from 'mongoose';

interface ActivityItem {
  _id: string;
  type: 'product_added' | 'stock_updated' | 'alert_triggered' | 'product_sold' | 'alert_resolved';
  title: string;
  description: string;
  timestamp: Date;
  productId?: string;
  productName?: string;
  metadata?: any;
}

/**
 * GET /api/shop-management/recent-activities
 * Get recent shop activities from various collections
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const activities: ActivityItem[] = [];

    // Get recent inventory logs (restocks, adjustments)
    const recentLogs = await db.collection('inventorylogs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    for (const log of recentLogs) {
      activities.push({
        _id: log._id.toString(),
        type: 'stock_updated',
        title: getStockUpdateTitle(log.action, log.quantityChange),
        description: `${log.productName} (${log.sku}) - ${log.reason}`,
        timestamp: log.createdAt,
        productId: log.productId,
        productName: log.productName,
        metadata: {
          action: log.action,
          quantityChange: log.quantityChange,
          previousQuantity: log.previousQuantity,
          newQuantity: log.newQuantity
        }
      });
    }

    // Get recently added products
    const recentProducts = await db.collection('products')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    for (const product of recentProducts.slice(0, 5)) {
      activities.push({
        _id: product._id.toString(),
        type: 'product_added',
        title: 'New Product Added',
        description: `${product.title} added to inventory`,
        timestamp: product.createdAt,
        productId: product._id.toString(),
        productName: product.title,
        metadata: {
          category: product.category,
          price: product.price,
          initialStock: product.qty
        }
      });
    }

    // Get recent stock alerts
    const recentAlerts = await db.collection('stockalerts')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    for (const alert of recentAlerts.slice(0, 5)) {
      activities.push({
        _id: alert._id.toString(),
        type: 'alert_triggered',
        title: getAlertTitle(alert.alertType, alert.priority),
        description: `${alert.productName} (${alert.sku}) - ${alert.currentStock} units left`,
        timestamp: alert.createdAt,
        productId: alert.productId,
        productName: alert.productName,
        metadata: {
          alertType: alert.alertType,
          priority: alert.priority,
          threshold: alert.threshold,
          currentStock: alert.currentStock
        }
      });
    }

    // Get recent sales (if sales collection exists)
    try {
      const recentSales = await db.collection('sales')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      for (const sale of recentSales) {
        activities.push({
          _id: sale._id.toString(),
          type: 'product_sold',
          title: 'Product Sale',
          description: `${sale.productName || 'Product'} sold - $${sale.total}`,
          timestamp: sale.createdAt,
          productId: sale.productId,
          productName: sale.productName,
          metadata: {
            quantity: sale.quantity,
            total: sale.total,
            customerName: sale.customerName
          }
        });
      }
    } catch (error) {
      console.log('Sales collection not available or empty');
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        total: activities.length,
        hasMore: offset + limit < activities.length
      }
    });

  } catch (error) {
    console.error('Recent activities API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recent activities'
      },
      { status: 500 }
    );
  }
}

function getStockUpdateTitle(action: string, quantityChange: number): string {
  switch (action) {
    case 'restock':
      return `Stock Restocked (+${quantityChange})`;
    case 'adjustment':
      return `Stock Adjusted (${quantityChange > 0 ? '+' : ''}${quantityChange})`;
    case 'sale':
      return `Product Sold (-${Math.abs(quantityChange)})`;
    default:
      return `Stock Updated (${quantityChange > 0 ? '+' : ''}${quantityChange})`;
  }
}

function getAlertTitle(alertType: string, priority: string): string {
  const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1);
  
  switch (alertType) {
    case 'low_stock':
      return `${priorityText} - Low Stock Alert`;
    case 'out_of_stock':
      return `${priorityText} - Out of Stock Alert`;
    case 'critical_low':
      return `Critical - Stock Alert`;
    default:
      return `${priorityText} - Stock Alert`;
  }
}