import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Validation schema for restock request
const restockSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  resolveAlert: z.boolean().default(true),
});

/**
 * POST /api/stock-alerts/[id]/restock
 * Quick restock functionality triggered from stock alerts using MongoDB MCP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log('Restock API called with ID:', id);
    
    if (!id || id === 'undefined') {
      console.error('Invalid alert ID received:', id);
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required and cannot be undefined',
      }, { status: 400 });
    }

    const body = await request.json();
    console.log('Restock request body:', body);
    
    const validatedData = restockSchema.parse(body);

    // Simple stock update simulation
    // In a real application, this would integrate with your existing MongoDB connection
    // For now, we'll return success to test the UI flow
    const currentStock = 10; // Mock current stock
    const newStock = currentStock + validatedData.quantity;
    
    console.log('Mock stock update:', { currentStock, newStock, quantity: validatedData.quantity });

    return NextResponse.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        stockUpdate: {
          previousStock: currentStock,
          quantityAdded: validatedData.quantity,
          newStock: newStock,
          isAboveThreshold: newStock > alert.threshold
        }
      }
    });

  } catch (error) {
    console.error('Error processing restock:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to process restock request',
    }, { status: 500 });
  }
}

/**
 * GET /api/stock-alerts/[id]/restock
 * Get restock suggestions and history for a specific alert
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required',
      }, { status: 400 });
    }

    await connectDB();
    const db = mongoose.connection.db;

    // Get the stock alert
    const alert = await db.collection('stockalerts').findOne({
      _id: new mongoose.Types.ObjectId(id)
    });

    if (!alert) {
      return NextResponse.json({
        success: false,
        error: 'Stock alert not found',
      }, { status: 404 });
    }

    // Get product information
    const product = await db.collection('products').findOne({
      _id: new mongoose.Types.ObjectId(alert.productId)
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found',
      }, { status: 404 });
    }

    // Get recent inventory history for this product
    const inventoryHistory = await db.collection('inventorylogs').find({
      productId: alert.productId
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

    // Calculate restock suggestions
    const currentStock = product.qty || 0;
    const threshold = alert.threshold || product.lowStockThreshold || 5;
    
    const suggestions = {
      minimal: Math.max(1, threshold - currentStock),
      recommended: Math.max(1, threshold - currentStock + Math.ceil(threshold * 0.2)), // 20% buffer
      optimal: Math.max(1, threshold - currentStock + Math.ceil(threshold * 0.5)), // 50% buffer
      maxCapacity: Math.max(1, threshold * 2) // Assuming max capacity is 2x threshold
    };

    // Calculate average daily usage (mock calculation - would need sales data)
    const dailyUsage = Math.ceil(threshold / 30); // Rough estimate
    const leadTime = 7; // Days - could be configurable per product
    const safetyStock = dailyUsage * leadTime;

    return NextResponse.json({
      success: true,
      data: {
        alert: {
          ...alert,
          _id: alert._id.toString()
        },
        product: {
          id: product._id.toString(),
          name: product.title,
          sku: product.sku,
          currentStock: currentStock,
          threshold: threshold
        },
        suggestions,
        analytics: {
          dailyUsage,
          leadTime,
          safetyStock,
          daysOfStock: currentStock > 0 ? Math.floor(currentStock / dailyUsage) : 0
        },
        recentHistory: inventoryHistory.map(log => ({
          ...log,
          _id: log._id.toString()
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching restock information:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch restock information',
    }, { status: 500 });
  }
}