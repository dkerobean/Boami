import mongoose from 'mongoose';
import Product from '../database/models/Product';
import ProductVariant from '../database/models/ProductVariant';
import InventoryLog from '../database/models/InventoryLog';
import StockAlert from '../database/models/StockAlert';

/**
 * Inventory Manager Utility
 * Centralized inventory operations with MongoDB transactions and overselling prevention
 */

export interface InventoryTransaction {
  sku: string;
  type: 'adjustment' | 'sale' | 'return' | 'damage' | 'restock' | 'reservation' | 'release';
  quantity: number; // Positive for increase, negative for decrease
  reason?: string;
  userId: string;
  orderId?: string;
  source?: 'manual' | 'order' | 'import' | 'api' | 'system';
  metadata?: { [key: string]: any };
}

export interface StockReservation {
  sku: string;
  quantity: number;
  orderId: string;
  customerId?: string;
  expiresAt?: Date; // Auto-release after this time
}

export interface InventoryStats {
  totalProducts: number;
  totalVariants: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  topMovingItems: Array<{
    sku: string;
    name: string;
    movementCount: number;
    netChange: number;
  }>;
}

export class InventoryManager {
  /**
   * Update inventory with full transaction safety
   */
  static async updateInventory(
    transaction: InventoryTransaction
  ): Promise<{ success: boolean; newQuantity?: number; error?: string }> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Find the product or variant
        const [product, variant] = await Promise.all([
          Product.findBySku(transaction.sku),
          ProductVariant.findBySku(transaction.sku)
        ]);

        if (!product && !variant) {
          throw new Error(`No product or variant found with SKU: ${transaction.sku}`);
        }

        const item = variant || product;
        const isVariant = !!variant;
        
        // Get current inventory quantity
        const currentQuantity = isVariant 
          ? (item as any).inventory.quantity 
          : (item as any).qty;

        // Calculate new quantity
        const newQuantity = Math.max(0, currentQuantity + transaction.quantity);
        
        // Prevent overselling for negative adjustments
        if (transaction.quantity < 0 && Math.abs(transaction.quantity) > currentQuantity) {
          throw new Error(`Insufficient stock. Available: ${currentQuantity}, Requested: ${Math.abs(transaction.quantity)}`);
        }

        // Update the inventory
        if (isVariant) {
          const variantItem = item as any;
          variantItem.inventory.quantity = newQuantity;
          variantItem.updateAvailableQuantity();
          await variantItem.save({ session });
        } else {
          const productItem = item as any;
          productItem.qty = newQuantity;
          // Update stock status
          if (productItem.manageStock) {
            if (newQuantity <= 0) {
              productItem.stockStatus = productItem.backordersAllowed ? 'onbackorder' : 'outofstock';
              productItem.stock = false;
            } else {
              productItem.stockStatus = 'instock';
              productItem.stock = true;
            }
          }
          await productItem.save({ session });
        }

        // Create inventory log
        await InventoryLog.create([{
          productId: isVariant ? undefined : item?.id,
          variantId: isVariant ? item?.id : undefined,
          sku: transaction.sku,
          type: transaction.type,
          quantityBefore: currentQuantity,
          quantityChange: transaction.quantity,
          quantityAfter: newQuantity,
          userId: transaction.userId,
          reason: transaction.reason,
          source: transaction.source || 'manual',
          orderId: transaction.orderId,
          metadata: transaction.metadata || {}
        }], { session });

        // Check for stock alerts
        await this.checkStockAlerts(transaction.sku, newQuantity, session);

        return { success: true, newQuantity };
      });
    } catch (error) {
      console.error('Inventory update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Reserve stock for orders
   */
  static async reserveStock(
    reservation: StockReservation
  ): Promise<{ success: boolean; error?: string }> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const variant = await ProductVariant.findBySku(reservation.sku);
        
        if (!variant) {
          throw new Error(`Variant not found with SKU: ${reservation.sku}`);
        }

        // Check if enough stock is available
        if (variant.inventory.available < reservation.quantity) {
          throw new Error(`Insufficient available stock. Available: ${variant.inventory.available}, Requested: ${reservation.quantity}`);
        }

        // Reserve the stock
        const success = await variant.reserveStock(reservation.quantity);
        if (!success) {
          throw new Error('Failed to reserve stock');
        }

        // Create inventory log for reservation
        await InventoryLog.create([{
          variantId: variant.id,
          sku: reservation.sku,
          type: 'reservation',
          quantityBefore: variant.inventory.quantity,
          quantityChange: 0, // Reservation doesn't change total quantity
          quantityAfter: variant.inventory.quantity,
          userId: 'system',
          reason: `Reserved for order ${reservation.orderId}`,
          source: 'order',
          orderId: reservation.orderId,
          metadata: {
            reservedQuantity: reservation.quantity,
            customerId: reservation.customerId,
            expiresAt: reservation.expiresAt
          }
        }], { session });

        return { success: true };
      });
    } catch (error) {
      console.error('Stock reservation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Release reserved stock
   */
  static async releaseStock(
    sku: string,
    quantity: number,
    orderId: string,
    userId: string = 'system'
  ): Promise<{ success: boolean; error?: string }> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const variant = await ProductVariant.findBySku(sku);
        
        if (!variant) {
          throw new Error(`Variant not found with SKU: ${sku}`);
        }

        // Release the stock
        await variant.releaseStock(quantity);

        // Create inventory log for release
        await InventoryLog.create([{
          variantId: variant.id,
          sku: sku,
          type: 'release',
          quantityBefore: variant.inventory.quantity,
          quantityChange: 0, // Release doesn't change total quantity
          quantityAfter: variant.inventory.quantity,
          userId: userId,
          reason: `Released from order ${orderId}`,
          source: 'order',
          orderId: orderId,
          metadata: {
            releasedQuantity: quantity
          }
        }], { session });

        return { success: true };
      });
    } catch (error) {
      console.error('Stock release error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process bulk inventory updates
   */
  static async bulkUpdateInventory(
    transactions: InventoryTransaction[]
  ): Promise<{
    success: boolean;
    results: Array<{ sku: string; success: boolean; newQuantity?: number; error?: string }>;
  }> {
    const results = [];
    
    for (const transaction of transactions) {
      const result = await this.updateInventory(transaction);
      results.push({
        sku: transaction.sku,
        ...result
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount === transactions.length,
      results
    };
  }

  /**
   * Get inventory statistics
   */
  static async getInventoryStats(dateFrom?: Date, dateTo?: Date): Promise<InventoryStats> {
    try {
      const [
        totalProducts,
        totalVariants,
        lowStockProducts,
        outOfStockProducts,
        lowStockVariants,
        outOfStockVariants
      ] = await Promise.all([
        Product.countDocuments({ status: 'publish' }),
        ProductVariant.countDocuments({ status: 'active' }),
        Product.find({ 
          qty: { $lte: 5 }, // Using hardcoded threshold for simplicity
          manageStock: true,
          status: 'publish'
        }).countDocuments(),
        Product.find({ 
          qty: 0,
          manageStock: true,
          status: 'publish'
        }).countDocuments(),
        ProductVariant.find({
          'inventory.quantity': { $lte: 5 }, // Using hardcoded threshold
          status: 'active'
        }).countDocuments(),
        ProductVariant.find({
          'inventory.quantity': 0,
          status: 'active'
        }).countDocuments()
      ]);

      // Calculate total stock value (simplified)
      const productValues = await Product.aggregate([
        { $match: { status: 'publish' } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$price', '$qty'] } } } }
      ]);

      const variantValues = await ProductVariant.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$pricing.price', '$inventory.quantity'] } } } }
      ]);

      const totalStockValue = (productValues[0]?.totalValue || 0) + (variantValues[0]?.totalValue || 0);

      // Get top moving items from logs
      const dateFilter: any = {};
      if (dateFrom || dateTo) {
        dateFilter.createdAt = {};
        if (dateFrom) dateFilter.createdAt.$gte = dateFrom;
        if (dateTo) dateFilter.createdAt.$lte = dateTo;
      }

      const topMovingItems = await InventoryLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$sku',
            movementCount: { $sum: 1 },
            netChange: { $sum: '$quantityChange' },
            totalAbsChange: { $sum: { $abs: '$quantityChange' } }
          }
        },
        { $sort: { totalAbsChange: -1 } },
        { $limit: 10 }
      ]);

      // Enhance with product names
      const enhancedTopMoving = await Promise.all(
        topMovingItems.map(async (item) => {
          const [product, variant] = await Promise.all([
            Product.findOne({ sku: item._id }),
            ProductVariant.findOne({ sku: item._id })
          ]);
          
          return {
            sku: item._id,
            name: product?.title || variant?.attributes?.map(a => a.value).join(' ') || 'Unknown',
            movementCount: item.movementCount,
            netChange: item.netChange
          };
        })
      );

      return {
        totalProducts,
        totalVariants,
        totalStockValue,
        lowStockCount: lowStockProducts + lowStockVariants,
        outOfStockCount: outOfStockProducts + outOfStockVariants,
        topMovingItems: enhancedTopMoving
      };
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      return {
        totalProducts: 0,
        totalVariants: 0,
        totalStockValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        topMovingItems: []
      };
    }
  }

  /**
   * Check and create stock alerts
   */
  private static async checkStockAlerts(
    sku: string, 
    currentStock: number, 
    session: mongoose.ClientSession
  ): Promise<void> {
    try {
      // Find the item to get threshold
      const [product, variant] = await Promise.all([
        Product.findBySku(sku),
        ProductVariant.findBySku(sku)
      ]);

      const item = variant || product;
      if (!item) return;

      const threshold = variant 
        ? (item as any).inventory.lowStockThreshold 
        : (item as any).lowStockThreshold || 5;

      // Auto-resolve existing alerts if stock is restored
      await StockAlert.autoResolveAlerts(sku, currentStock);

      // Check if we need to create new alerts
      let alertType: string | null = null;
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      if (currentStock === 0) {
        alertType = 'out_of_stock';
        priority = 'critical';
      } else if (currentStock <= threshold) {
        alertType = 'low_stock';
        priority = currentStock <= threshold / 2 ? 'high' : 'medium';
      }

      if (alertType) {
        // Check if similar alert already exists
        const existingAlert = await StockAlert.findOne({
          sku: sku,
          alertType: alertType,
          status: 'active'
        });

        if (!existingAlert) {
          await StockAlert.createAlert({
            productId: variant ? undefined : item.id,
            variantId: variant ? item.id : undefined,
            sku: sku,
            alertType: alertType as any,
            priority: priority,
            threshold: threshold,
            currentStock: currentStock,
            autoResolve: true,
            autoResolveThreshold: alertType === 'out_of_stock' ? 1 : threshold + 5
          });
        }
      }
    } catch (error) {
      console.error('Error checking stock alerts:', error);
      // Don't throw here to avoid breaking the main transaction
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(limit: number = 50): Promise<Array<{
    sku: string;
    name: string;
    currentStock: number;
    threshold: number;
    type: 'product' | 'variant';
  }>> {
    try {
      const [lowStockProducts, lowStockVariants] = await Promise.all([
        Product.findLowStock(),
        ProductVariant.findLowStock()
      ]);

      const results = [];

      // Add products
      for (const product of lowStockProducts.slice(0, limit)) {
        results.push({
          sku: (product as any).inventory?.sku || (product as any).sku || 'NO-SKU',
          name: (product as any).title,
          currentStock: (product as any).qty,
          threshold: (product as any).lowStockThreshold || 5,
          type: 'product' as const
        });
      }

      // Add variants
      for (const variant of lowStockVariants.slice(0, limit - results.length)) {
        const product = await Product.findById((variant as any).productId);
        results.push({
          sku: (variant as any).sku,
          name: `${product?.title || 'Unknown'} - ${(variant as any).attributes?.map((a: any) => a.value).join(' ')}`,
          currentStock: (variant as any).inventory.quantity,
          threshold: (variant as any).inventory.lowStockThreshold,
          type: 'variant' as const
        });
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('Error getting low stock items:', error);
      return [];
    }
  }

  /**
   * Auto-release expired reservations
   */
  static async releaseExpiredReservations(): Promise<number> {
    try {
      // This would typically be run as a scheduled job
      // For now, we'll implement basic logic
      
      const expiredLogs = await InventoryLog.find({
        type: 'reservation',
        'metadata.expiresAt': { $lt: new Date() },
        // We'd need to track if reservation was already released
      });

      let releasedCount = 0;
      
      for (const log of expiredLogs) {
        // Check if this reservation was already released
        const releaseLog = await InventoryLog.findOne({
          type: 'release',
          orderId: log.orderId,
          sku: log.sku
        });
        
        if (!releaseLog && log.metadata?.reservedQuantity) {
          const result = await this.releaseStock(
            log.sku,
            log.metadata.reservedQuantity,
            log.orderId || 'expired',
            'system'
          );
          
          if (result.success) {
            releasedCount++;
          }
        }
      }
      
      return releasedCount;
    } catch (error) {
      console.error('Error releasing expired reservations:', error);
      return 0;
    }
  }

  /**
   * Validate inventory operation
   */
  static validateInventoryOperation(transaction: InventoryTransaction): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!transaction.sku || transaction.sku.trim() === '') {
      errors.push('SKU is required');
    }
    
    if (!transaction.type) {
      errors.push('Transaction type is required');
    }
    
    if (transaction.quantity === undefined || transaction.quantity === null) {
      errors.push('Quantity is required');
    }
    
    if (transaction.quantity !== undefined && transaction.quantity === 0) {
      errors.push('Quantity cannot be zero');
    }
    
    if (!transaction.userId || transaction.userId.trim() === '') {
      errors.push('User ID is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}