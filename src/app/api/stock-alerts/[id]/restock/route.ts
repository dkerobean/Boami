import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/database/mongoose-connection';
import mongoose from 'mongoose';

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

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      console.error('Invalid ObjectId format:', id);
      return NextResponse.json({
        success: false,
        error: 'Invalid alert ID format',
      }, { status: 400 });
    }

    const body = await request.json();
    console.log('Restock request body:', body);
    
    const validatedData = restockSchema.parse(body);

    // Connect to MongoDB database
    await connectDB();
    const db = mongoose.connection.db;

    console.log('Processing restock with real MongoDB operations for alert:', id);

    // Step 1: Find the stock alert
    const stockAlert = await db.collection('stockalerts').findOne({
      _id: new mongoose.Types.ObjectId(id)
    });

    if (!stockAlert) {
      return NextResponse.json({
        success: false,
        error: 'Stock alert not found',
      }, { status: 404 });
    }

    console.log('Found stock alert:', stockAlert.productName, 'SKU:', stockAlert.sku);

    // Step 2: Find the associated product
    const product = await db.collection('products').findOne({
      _id: new mongoose.Types.ObjectId(stockAlert.productId)
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found',
      }, { status: 404 });
    }

    console.log('Found product:', product.title, 'Current stock:', product.qty);

    const currentStock = product.qty || 0;
    const newStock = currentStock + validatedData.quantity;
    const threshold = stockAlert.threshold || product.lowStockThreshold || 500;

    console.log('Stock calculation:', { 
      currentStock, 
      newStock, 
      quantity: validatedData.quantity,
      threshold,
      isAboveThreshold: newStock > threshold
    });

    // Step 3: Update product stock
    const updateProductResult = await db.collection('products').updateOne(
      { _id: new mongoose.Types.ObjectId(stockAlert.productId) },
      { 
        $set: { 
          qty: newStock,
          stockStatus: newStock > 0 ? 'instock' : 'outofstock',
          stock: newStock > 0
        } 
      }
    );

    if (updateProductResult.modifiedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update product stock',
      }, { status: 500 });
    }

    console.log('Product stock updated successfully');

    // Step 4: Create inventory log entry
    try {
      await db.collection('inventorylogs').insertOne({
        productId: stockAlert.productId,
        productName: stockAlert.productName,
        sku: stockAlert.sku,
        action: 'restock',
        quantityChange: validatedData.quantity,
        previousQuantity: currentStock,
        newQuantity: newStock,
        reason: validatedData.reason,
        triggeredBy: 'stock_alert',
        alertId: id,
        createdAt: new Date(),
        metadata: {
          threshold: threshold,
          wasAboveThreshold: newStock > threshold
        }
      });
      console.log('Inventory log created successfully');
    } catch (logError) {
      console.warn('Failed to create inventory log:', logError);
      // Continue execution - this is not critical
    }

    // Step 5: Remove or update alert if stock is now above threshold
    let alertRemoved = false;
    
    if (newStock > threshold) {
      console.log('Stock above threshold, removing alert');
      
      const deleteAlertResult = await db.collection('stockalerts').deleteOne({
        _id: new mongoose.Types.ObjectId(id)
      });

      if (deleteAlertResult.deletedCount > 0) {
        alertRemoved = true;
        console.log('Stock alert removed successfully');
      } else {
        console.warn('Failed to delete stock alert');
      }
    } else {
      // Update alert with new current stock
      console.log('Stock still below threshold, updating alert current stock');
      
      await db.collection('stockalerts').updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { 
          $set: { 
            currentStock: newStock,
            lastUpdated: new Date()
          } 
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        stockUpdate: {
          previousStock: currentStock,
          quantityAdded: validatedData.quantity,
          newStock: newStock,
          isAboveThreshold: newStock > threshold,
          alertRemoved: alertRemoved
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