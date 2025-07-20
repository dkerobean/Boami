/**
 * Real-time Inventory Manager
 * Handles real-time inventory updates during sales processing
 */

import { InventoryService } from '../services/InventoryService';
import { NotificationSystem } from './notification-system';
import RealTimeSync from './real-time-sync';

export interface InventoryUpdate {
  productId: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  change: number;
  reason: string;
  timestamp: number;
}

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock';
  timestamp: number;
}

export class InventoryManager {
  private static stockAlerts = new Map<string, StockAlert>();
  private static inventoryUpdates: InventoryUpdate[] = [];
  private static maxHistorySize = 100;

  /**
   * Process sale with real-time inventory updates
   */
  static async processSaleWithInventoryUpdate(
    saleData: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      userId: string;
    }
  ): Promise<{ success: boolean; inventoryUpdate?: InventoryUpdate; error?: string }> {
    try {
      // First validate stock availability
      const stockValidation = await InventoryService.validateStock(
        saleData.productId,
        saleData.quantity
      );

      if (!stockValidation.isValid) {
        NotificationSystem.error({
          title: 'Insufficient Stock',
          message: stockValidation.message
        });
        return { success: false, error: stockValidation.message };
      }

      // Create optimistic inventory update
      const optimisticUpdate: InventoryUpdate = {
        productId: saleData.productId,
        productName: saleData.productName,
        previousQuantity: stockValidation.availableQuantity,
        newQuantity: stockValidation.availableQuantity - saleData.quantity,
        change: -saleData.quantity,
        reason: `Sale: ${saleData.quantity} units`,
        timestamp: Date.now()
      };

      // Apply optimistic update immediately
      this.addInventoryUpdate(optimisticUpdate);
      this.notifyInventoryChange(optimisticUpdate);

      // Perform actual inventory update
      const inventoryResult = await InventoryService.updateInventory(
        saleData.productId,
        -saleData.quantity,
        `Sale: ${saleData.quantity} units`,
        saleData.userId,
        `sale-${Date.now()}`
      );

      if (!inventoryResult.success) {
        // Rollback optimistic update
        this.rollbackInventoryUpdate(optimisticUpdate);
        NotificationSystem.error({
          title: 'Inventory Update Failed',
          message: inventoryResult.message
        });
        return { success: false, error: inventoryResult.message };
      }

      // Update with actual result
      const actualUpdate: InventoryUpdate = {
        ...optimisticUpdate,
        newQuantity: inventoryResult.newQuantity,
        timestamp: Date.now()
      };

      this.updateInventoryRecord(optimisticUpdate, actualUpdate);
      this.notifyInventoryChange(actualUpdate);

      // Check for stock alerts
      await this.checkStockAlerts(saleData.productId, saleData.productName, inventoryResult.newQuantity);

      // Show success notification
      NotificationSystem.financial.saleCreated(
        saleData.quantity * saleData.unitPrice,
        saleData.quantity
      );

      NotificationSystem.financial.inventoryUpdated(
        saleData.productName,
        inventoryResult.newQuantity
      );

      return { success: true, inventoryUpdate: actualUpdate };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      NotificationSystem.error({
        title: 'Sale Processing Failed',
        message: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Reverse sale and restore inventory
   */
  static async reverseSaleWithInventoryRestore(
    saleData: {
      productId: string;
      productName: string;
      quantity: number;
      userId: string;
    }
  ): Promise<{ success: boolean; inventoryUpdate?: InventoryUpdate; error?: string }> {
    try {
      // Perform inventory restoration
      const inventoryResult = await InventoryService.updateInventory(
        saleData.productId,
        saleData.quantity, // Positive to restore inventory
        `Sale reversal: ${saleData.quantity} units`,
        saleData.userId,
        `sale-reversal-${Date.now()}`
      );

      if (!inventoryResult.success) {
        NotificationSystem.error({
          title: 'Inventory Restoration Failed',
          message: inventoryResult.message
        });
        return { success: false, error: inventoryResult.message };
      }

      // Create inventory update record
      const inventoryUpdate: InventoryUpdate = {
        productId: saleData.productId,
        productName: saleData.productName,
        previousQuantity: inventoryResult.previousQuantity,
        newQuantity: inventoryResult.newQuantity,
        change: saleData.quantity,
        reason: `Sale reversal: ${saleData.quantity} units`,
        timestamp: Date.now()
      };

      this.addInventoryUpdate(inventoryUpdate);
      this.notifyInventoryChange(inventoryUpdate);

      // Clear any stock alerts for this product if stock is now sufficient
      this.clearStockAlert(saleData.productId);

      // Show success notification
      NotificationSystem.financial.saleDeleted();
      NotificationSystem.financial.inventoryUpdated(
        saleData.productName,
        inventoryResult.newQuantity
      );

      return { success: true, inventoryUpdate };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      NotificationSystem.error({
        title: 'Sale Reversal Failed',
        message: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check for stock alerts and notify users
   */
  static async checkStockAlerts(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number = 10
  ): Promise<void> {
    const alertKey = `${productId}-stock-alert`;

    if (currentStock <= 0) {
      // Out of stock alert
      const alert: StockAlert = {
        productId,
        productName,
        currentStock,
        threshold,
        alertType: 'out_of_stock',
        timestamp: Date.now()
      };

      this.stockAlerts.set(alertKey, alert);
      NotificationSystem.financial.stockOutWarning(productName);

      // Notify subscribers
      RealTimeSync.notify('stock_alerts', {
        type: 'out_of_stock',
        alert
      });

    } else if (currentStock <= threshold) {
      // Low stock alert
      const alert: StockAlert = {
        productId,
        productName,
        currentStock,
        threshold,
        alertType: 'low_stock',
        timestamp: Date.now()
      };

      this.stockAlerts.set(alertKey, alert);
      NotificationSystem.financial.lowStockWarning(productName, currentStock);

      // Notify subscribers
      RealTimeSync.notify('stock_alerts', {
        type: 'low_stock',
        alert
      });
    } else {
      // Clear any existing alerts for this product
      this.clearStockAlert(productId);
    }
  }

  /**
   * Clear stock alert for a product
   */
  static clearStockAlert(productId: string): void {
    const alertKey = `${productId}-stock-alert`;
    if (this.stockAlerts.has(alertKey)) {
      this.stockAlerts.delete(alertKey);

      // Notify subscribers
      RealTimeSync.notify('stock_alerts', {
        type: 'alert_cleared',
        productId
      });
    }
  }

  /**
   * Get all active stock alerts
   */
  static getStockAlerts(): StockAlert[] {
    return Array.from(this.stockAlerts.values());
  }

  /**
   * Add inventory update to history
   */
  private static addInventoryUpdate(update: InventoryUpdate): void {
    this.inventoryUpdates.unshift(update);

    // Keep only the most recent updates
    if (this.inventoryUpdates.length > this.maxHistorySize) {
      this.inventoryUpdates = this.inventoryUpdates.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Update existing inventory record
   */
  private static updateInventoryRecord(
    originalUpdate: InventoryUpdate,
    actualUpdate: InventoryUpdate
  ): void {
    const index = this.inventoryUpdates.findIndex(
      update => update.productId === originalUpdate.productId &&
                update.timestamp === originalUpdate.timestamp
    );

    if (index !== -1) {
      this.inventoryUpdates[index] = actualUpdate;
    }
  }

  /**
   * Rollback optimistic inventory update
   */
  private static rollbackInventoryUpdate(update: InventoryUpdate): void {
    const index = this.inventoryUpdates.findIndex(
      u => u.productId === update.productId && u.timestamp === update.timestamp
    );

    if (index !== -1) {
      this.inventoryUpdates.splice(index, 1);
    }

    // Notify subscribers of rollback
    RealTimeSync.notify('inventory_updates', {
      type: 'rollback',
      update
    });
  }

  /**
   * Notify subscribers of inventory changes
   */
  private static notifyInventoryChange(update: InventoryUpdate): void {
    RealTimeSync.notify('inventory_updates', {
      type: 'update',
      update
    });
  }

  /**
   * Get inventory update history
   */
  static getInventoryHistory(productId?: string): InventoryUpdate[] {
    if (productId) {
      return this.inventoryUpdates.filter(update => update.productId === productId);
    }
    return [...this.inventoryUpdates];
  }

  /**
   * Clear inventory history
   */
  static clearInventoryHistory(): void {
    this.inventoryUpdates = [];
  }

  /**
   * Subscribe to inventory updates
   */
  static subscribeToInventoryUpdates(callback: (data: any) => void): () => void {
    return RealTimeSync.subscribe('inventory_updates', callback);
  }

  /**
   * Subscribe to stock alerts
   */
  static subscribeToStockAlerts(callback: (data: any) => void): () => void {
    return RealTimeSync.subscribe('stock_alerts', callback);
  }

  /**
   * Get inventory statistics for a date range
   */
  static async getInventoryStats(dateFrom?: Date, dateTo?: Date): Promise<any> {
    // This is a placeholder implementation
    // In a real application, this would query the database for comprehensive stats
    return {
      totalProducts: 0,
      totalValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      movements: {
        inbound: 0,
        outbound: 0,
        adjustments: 0
      }
    };
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(limit: number = 20): Promise<any[]> {
    // This is a placeholder implementation
    // In a real application, this would query products with low stock
    return [];
  }

  /**
   * Validate inventory operation
   */
  static validateInventoryOperation(transaction: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!transaction.sku) {
      errors.push('SKU is required');
    }

    if (!transaction.type) {
      errors.push('Transaction type is required');
    }

    if (transaction.quantity === 0) {
      errors.push('Quantity cannot be zero');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Update inventory for a single transaction
   */
  static async updateInventory(transaction: any): Promise<{ success: boolean; newQuantity?: number; error?: string }> {
    try {
      // This is a placeholder implementation
      // In a real application, this would update the actual inventory
      return {
        success: true,
        newQuantity: 100 // Placeholder value
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Bulk update inventory
   */
  static async bulkUpdateInventory(transactions: any[]): Promise<{ success: boolean; results: any[] }> {
    const results = transactions.map(transaction => ({
      success: true,
      sku: transaction.sku,
      newQuantity: 100 // Placeholder value
    }));

    return {
      success: true,
      results
    };
  }

  /**
   * Release expired reservations
   */
  static async releaseExpiredReservations(): Promise<number> {
    // This is a placeholder implementation
    // In a real application, this would release expired inventory reservations
    return 0;
  }
}

export default InventoryManager;