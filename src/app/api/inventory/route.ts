import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import Product from '@/lib/database/models/Product';
import ProductVariant from '@/lib/database/models/ProductVariant';
import InventoryLog from '@/lib/database/models/InventoryLog';
import StockAlert from '@/lib/database/models/StockAlert';
import { InventoryManager } from '@/lib/utils/inventory-manager';

const inventoryUpdateSchema = yup.object({
  sku: yup.string().required('SKU is required'),
  type: yup.string()
    .oneOf(['adjustment', 'sale', 'return', 'damage', 'restock', 'reservation', 'release'])
    .required('Transaction type is required'),
  quantity: yup.number().required('Quantity is required').test(
    'non-zero',
    'Quantity cannot be zero',
    value => value !== 0
  ),
  reason: yup.string().max(500),
  orderId: yup.string(),
  source: yup.string().oneOf(['manual', 'order', 'import', 'api', 'system']).default('manual'),
  metadata: yup.object().default({})
});

const bulkInventoryUpdateSchema = yup.object({
  transactions: yup.array().of(inventoryUpdateSchema).min(1, 'At least one transaction is required')
});

const inventoryStatsSchema = yup.object({
  dateFrom: yup.date(),
  dateTo: yup.date(),
  category: yup.array().of(yup.string()),
  brand: yup.array().of(yup.string())
});

/**
 * GET /api/inventory - Get inventory statistics and data
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Parse array parameters
    ['category', 'brand'].forEach(key => {
      if (params[key] && typeof params[key] === 'string') {
        (params as any)[key] = (params[key] as string).split(',');
      }
    });

    // Parse date parameters
    if (params.dateFrom) {
      (params as any).dateFrom = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      (params as any).dateTo = new Date(params.dateTo);
    }

    const validatedParams = await inventoryStatsSchema.validate(params);

    // Get inventory statistics
    const stats = await InventoryManager.getInventoryStats(
      validatedParams.dateFrom,
      validatedParams.dateTo
    );

    // Get low stock items
    const lowStockItems = await InventoryManager.getLowStockItems(20);

    // Get recent inventory logs
    const recentLogs = await InventoryLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get active stock alerts
    const activeAlerts = await StockAlert.findActiveAlerts();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        lowStockItems,
        recentLogs,
        activeAlerts
      }
    });

  } catch (error) {
    console.error('Inventory GET error:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inventory data'
    }, { status: 500 });
  }
}

/**
 * POST /api/inventory - Update inventory
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    
    // Check if this is a bulk update or single update
    if (Array.isArray(body.transactions)) {
      return await handleBulkInventoryUpdate(body);
    } else {
      return await handleSingleInventoryUpdate(body);
    }

  } catch (error) {
    console.error('Inventory POST error:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory'
    }, { status: 500 });
  }
}

/**
 * Handle single inventory update
 */
async function handleSingleInventoryUpdate(body: any) {
  const validatedData = await inventoryUpdateSchema.validate(body);

  // Validate the transaction
  const inventoryTransaction = {
    ...validatedData,
    type: validatedData.type as 'adjustment' | 'sale' | 'return' | 'damage' | 'restock' | 'reservation' | 'release',
    source: validatedData.source as 'manual' | 'order' | 'import' | 'api' | 'system',
    userId: 'system' // TODO: Get from JWT token
  };

  const validation = InventoryManager.validateInventoryOperation(inventoryTransaction);

  if (!validation.valid) {
    return NextResponse.json({
      success: false,
      error: 'Invalid inventory operation',
      details: validation.errors
    }, { status: 400 });
  }

  // Execute the inventory update
  const result = await InventoryManager.updateInventory(inventoryTransaction);

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: result.error
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Inventory updated successfully',
    data: {
      sku: validatedData.sku,
      newQuantity: result.newQuantity,
      type: validatedData.type,
      quantityChange: validatedData.quantity
    }
  });
}

/**
 * Handle bulk inventory update
 */
async function handleBulkInventoryUpdate(body: any) {
  const validatedData = await bulkInventoryUpdateSchema.validate(body);

  // Add user ID to all transactions
  const transactions = validatedData.transactions!.map(transaction => ({
    ...transaction,
    type: transaction.type as 'adjustment' | 'sale' | 'return' | 'damage' | 'restock' | 'reservation' | 'release',
    source: transaction.source as 'manual' | 'order' | 'import' | 'api' | 'system',
    userId: 'system' // TODO: Get from JWT token
  }));

  // Execute bulk update
  const result = await InventoryManager.bulkUpdateInventory(transactions);

  const successCount = result.results.filter(r => r.success).length;
  const failureCount = result.results.length - successCount;

  return NextResponse.json({
    success: result.success,
    message: `Bulk inventory update completed. ${successCount} successful, ${failureCount} failed.`,
    data: {
      totalTransactions: transactions.length,
      successful: successCount,
      failed: failureCount,
      results: result.results
    }
  });
}

/**
 * PUT /api/inventory - Bulk inventory operations
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { operation, filters, data } = body;

    if (!operation) {
      return NextResponse.json({
        success: false,
        error: 'Operation is required'
      }, { status: 400 });
    }

    let result;
    
    switch (operation) {
      case 'adjust_all_stock':
        result = await handleBulkStockAdjustment(filters, data);
        break;
        
      case 'update_thresholds':
        result = await handleBulkThresholdUpdate(filters, data);
        break;
        
      case 'release_expired_reservations':
        const releasedCount = await InventoryManager.releaseExpiredReservations();
        result = {
          success: true,
          message: `Released ${releasedCount} expired reservations`,
          affected: releasedCount
        };
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Bulk inventory operation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform bulk inventory operation'
    }, { status: 500 });
  }
}

/**
 * Handle bulk stock adjustment
 */
async function handleBulkStockAdjustment(filters: any, data: any) {
  const { adjustment, reason } = data;
  
  if (!adjustment || adjustment === 0) {
    throw new Error('Adjustment value is required and cannot be zero');
  }

  // Build query based on filters
  const query: any = {};
  
  if (filters.category && filters.category.length > 0) {
    query.category = { $in: filters.category };
  }
  
  if (filters.brand && filters.brand.length > 0) {
    query.brand = { $in: filters.brand };
  }
  
  if (filters.stockStatus && filters.stockStatus.length > 0) {
    query.stockStatus = { $in: filters.stockStatus };
  }

  // Find matching products
  const products = await Product.find(query).lean();
  
  const transactions = products
    .filter(product => (product as any).sku) // Only products with SKUs
    .map(product => ({
      sku: (product as any).sku,
      type: 'adjustment' as const,
      quantity: adjustment,
      reason: reason || 'Bulk stock adjustment',
      userId: 'system', // TODO: Get from JWT token
      source: 'manual' as const
    }));

  if (transactions.length === 0) {
    return {
      success: true,
      message: 'No products found matching the criteria',
      affected: 0
    };
  }

  const result = await InventoryManager.bulkUpdateInventory(transactions);
  const successCount = result.results.filter(r => r.success).length;

  return {
    success: true,
    message: `Bulk stock adjustment completed. ${successCount} products updated.`,
    affected: successCount,
    details: result.results
  };
}

/**
 * Handle bulk threshold update
 */
async function handleBulkThresholdUpdate(filters: any, data: any) {
  const { lowStockThreshold } = data;
  
  if (!lowStockThreshold || lowStockThreshold < 0) {
    throw new Error('Valid low stock threshold is required');
  }

  // Build query based on filters
  const query: any = {};
  
  if (filters.category && filters.category.length > 0) {
    query.category = { $in: filters.category };
  }
  
  if (filters.brand && filters.brand.length > 0) {
    query.brand = { $in: filters.brand };
  }

  // Update products
  const productResult = await Product.updateMany(
    query,
    { $set: { lowStockThreshold, updatedAt: new Date() } }
  );

  // Update variants
  const variantResult = await ProductVariant.updateMany(
    {}, // You might want to add filters for variants based on their parent products
    { $set: { 'inventory.lowStockThreshold': lowStockThreshold, updatedAt: new Date() } }
  );

  const totalAffected = (productResult.modifiedCount || 0) + (variantResult.modifiedCount || 0);

  return {
    success: true,
    message: `Updated low stock threshold for ${totalAffected} items`,
    affected: totalAffected,
    details: {
      products: productResult.modifiedCount,
      variants: variantResult.modifiedCount
    }
  };
}