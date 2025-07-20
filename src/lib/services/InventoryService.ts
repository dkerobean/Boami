import { connectDB } from '@/lib/database/mongoose-connection';
import Product from '@/lib/database/models/Product';
import Sale from '@/lib/database/models/Sale';

/**
 * Inventory Service
 * Handles stock management, validation, and inventory operations
 */

export interface InventoryValidationResult {
  isValid: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  message: string;
}

export interface InventoryUpdateResult {
  success: boolean;
  previousQuantity: number;
  newQuantity: number;
  stockStatus: string;
  message: string;
}

export interface StockAlert {
  productId: string;
  productTitle: string;
  currentQuantity: number;
  lowStockThreshold: number;
  stockStatus: string;
  alertType: 'low_stock' | 'out_of_stock';
}

export class InventoryService {
  /**
   * Validates if sufficient inventory is available for a sale
   */
  static async validateInventoryForSale(
    productId: string,
    requestedQuantity: number
  ): Promise<InventoryValidationResult> {
    try {
      await connectDB();

      const product = await Product.findById(productId);
      if (!product) {
        return {
          isValid: false,
          availableQuantity: 0,
          requestedQuantity,
          message: 'Product not found'
        };
      }

      if (!product.manageStock) {
        return {
          isValid: true,
          availableQuantity: Infinity,
          requestedQuantity,
          message: 'Stock management disabled for this product'
        };
      }

      const isValid = product.qty >= requestedQuantity;

      return {
        isValid,
        availableQuantity: product.qty,
        requestedQuantity,
        message: isValid
          ? 'Sufficient inventory available'
          : `Insufficient inventory. Available: ${pt.qty}, Requested: ${requestedQuantity}`
      };

    } catch (error) {
      console.error('Inventory validation error:', error);
      return {
        isValid: false,
        availableQuantity: 0,
        requestedQuantity,
        message: 'Error validating inventory'
      };
    }
  }

  /**
   * Updates product inventory after a sale
   */
  static async updateInventoryForSale(
    productId: string,
    soldQuantity: number
  ): Promise<InventoryUpdateResult> {
    try {
      await connectDB();

      const product = await Product.findById(productId);
      if (!product) {
        return {
          success: false,
          previousQuantity: 0,
          newQuantity: 0,
          stockStatus: 'unknown',
          message: 'Product not found'
        };
      }

      if (!product.manageStock) {
        return {
          success: true,
          previousQuantity: product.qty,
          newQuantity: product.qty,
          stockStatus: product.stockStatus,
          message: 'Stock management disabled - no inventory update needed'
        };
      }

      const previousQuantity = product.qty;
      product.qty = Math.max(0, product.qty - soldQuantity);

      // Update stock status based on new quantity
      if (product.qty <= 0) {
        product.stockStatus = product.backordersAllowed ? 'onbackorder' : 'outofstock';
        product.stock = false;
      } else if (product.qty <= product.lowStockThreshold) {
        product.stockStatus = 'instock'; // Still in stock but low
        product.stock = true;
      } else {
        product.stockStatus = 'instock';
        product.stock = true;
      }

      await product.save();

      return {
        success: true,
        previousQuantity,
        newQuantity: product.qty,
        stockStatus: product.stockStatus,
        message: `Inventory updated: ${previousQuantity} → ${product.qty}`
      };

    } catch (error) {
      console.error('Inventory update error:', error);
      return {
        success: false,
        previousQuantity: 0,
        newQuantity: 0,
        stockStatus: 'error',
        message: 'Error updating inventory'
      };
    }
  }

  /**
   * Restores inventory when a sale is cancelled/deleted
   */
  static async restoreInventoryFromSale(
    productId: string,
    restoredQuantity: number
  ): Promise<InventoryUpdateResult> {
    try {
      await connectDB();

      const product = await Product.findById(productId);
      if (!product) {
        return {
          success: false,
          previousQuantity: 0,
          newQuantity: 0,
          stockStatus: 'unknown',
          message: 'Product not found'
        };
      }

      if (!product.manageStock) {
        return {
          success: true,
          previousQuantity: product.qty,
          newQuantity: product.qty,
          stockStatus: product.stockStatus,
          message: 'Stock management disabled - no inventory restoration needed'
        };
      }

      const previousQuantity = product.qty;
      product.qty += restoredQuantity;

      // Update stock status based on restored quantity
      if (product.qty > 0) {
        product.stockStatus = 'instock';
        product.stock = true;
      }

      await product.save();

      return {
        success: true,
        previousQuantity,
        newQuantity: product.qty,
        stockStatus: product.stockStatus,
        message: `Inventory restored: ${previousQuantity} → ${product.qty}`
      };

    } catch (error) {
      console.error('Inventory restoration error:', error);
      return {
        success: false,
        previousQuantity: 0,
        newQuantity: 0,
        stockStatus: 'error',
        message: 'Error restoring inventory'
      };
    }
  }

  /**
   * Gets products with low stock or out of stock
   */
  static async getStockAlerts(): Promise<StockAlert[]> {
    try {
      await connectDB();

      // Find products that are out of stock or low stock
      const products = await Product.find({
        manageStock: true,
        $or: [
          { stockStatus: 'outofstock' },
          {
            stockStatus: 'instock',
            $expr: { $lte: ['$qty', '$lowStockThreshold'] }
          }
        ]
      }).lean();

      return products.map(product => ({
        productId: product._id.toString(),
        productTitle: product.title,
        currentQuantity: product.qty,
        lowStockThreshold: product.lowStockThreshold || 0,
        stockStatus: product.stockStatus,
        alertType: product.stockStatus === 'outofstock' ? 'out_of_stock' : 'low_stock'
      }));

    } catch (error) {
      console.error('Stock alerts error:', error);
      return [];
    }
  }

  /**
   * Gets inventory analytics for a specific product
   */
  static async getProductInventoryAnalytics(productId: string) {
    try {
      await connectDB();

      const [product, salesData] = await Promise.all([
        Product.findById(productId).lean(),
        Sale.aggregate([
          { $match: { productId: productId } },
          {
            $group: {
              _id: null,
              totalSold: { $sum: '$quantity' },
              totalRevenue: { $sum: '$totalAmount' },
              averagePrice: { $avg: '$unitPrice' },
              salesCount: { $sum: 1 },
              lastSaleDate: { $max: '$date' }
            }
          }
        ])
      ]);

      if (!product) {
        return null;
      }

      const sales = salesData.length > 0 ? salesData[0] : {
        totalSold: 0,
        totalRevenue: 0,
        averagePrice: 0,
        salesCount: 0,
        lastSaleDate: null
      };

      return {
        product: {
          id: product._id,
          title: product.title,
          currentStock: product.qty,
          stockStatus: product.stockStatus,
          lowStockThreshold: product.lowStockThreshold,
          manageStock: product.manageStock
        },
        sales: {
          totalQuantitySold: sales.totalSold,
          totalRevenue: Math.round(sales.totalRevenue * 100) / 100,
          averageUnitPrice: Math.round(sales.averagePrice * 100) / 100,
          totalSales: sales.salesCount,
          lastSaleDate: sales.lastSaleDate
        },
        alerts: {
          isLowStock: product.manageStock && product.qty <= product.lowStockThreshold,
          isOutOfStock: product.stockStatus === 'outofstock',
          needsRestocking: product.manageStock && product.qty <= product.lowStockThreshold
        }
      };

    } catch (error) {
      console.error('Product inventory analytics error:', error);
      return null;
    }
  }

  /**
   * Bulk updates inventory for multiple products
   */
  static async bulkUpdateInventory(updates: Array<{
    productId: string;
    newQuantity: number;
    reason?: string;
  }>) {
    try {
      await connectDB();

      const results = [];

      for (const update of updates) {
        try {
          const product = await Product.findById(update.productId);
          if (!product) {
            results.push({
              productId: update.productId,
              success: false,
              message: 'Product not found'
            });
            continue;
          }

          if (!product.manageStock) {
            results.push({
              productId: update.productId,
              success: true,
              message: 'Stock management disabled',
              previousQuantity: product.qty,
              newQuantity: product.qty
            });
            continue;
          }

          const previousQuantity = product.qty;
          product.qty = Math.max(0, update.newQuantity);

          // Update stock status
          if (product.qty <= 0) {
            product.stockStatus = product.backordersAllowed ? 'onbackorder' : 'outofstock';
            product.stock = false;
          } else {
            product.stockStatus = 'instock';
            product.stock = true;
          }

          await product.save();

          results.push({
            productId: update.productId,
            success: true,
            message: `Updated: ${previousQuantity} → ${product.qty}`,
            previousQuantity,
            newQuantity: product.qty,
            stockStatus: product.stockStatus,
            reason: update.reason
          });

        } catch (error) {
          results.push({
            productId: update.productId,
            success: false,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      return {
        success: true,
        totalUpdates: updates.length,
        successfulUpdates: results.filter(r => r.success).length,
        failedUpdates: results.filter(r => !r.success).length,
        results
      };

    } catch (error) {
      console.error('Bulk inventory update error:', error);
      return {
        success: false,
        message: 'Bulk update failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}