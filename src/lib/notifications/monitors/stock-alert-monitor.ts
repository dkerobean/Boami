import { notificationService } from '../notification-service';
import { Product, User } from '../../database/models';
import { connectToDatabase } from '../../database/mongoose-connection';

export interface LowStockProduct {
  _id: string;
  title: string;
  sku: string;
  qty: number;
  lowStockThreshold: number;
  userId?: string;
  createdBy?: string;
}

export class StockAlertMonitor {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private processedAlerts = new Set<string>(); // Track processed alerts to prevent duplicates

  /**
   * Start monitoring stock levels
   */
  startMonitoring(intervalMinutes: number = 60): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkLowStock();
      } catch (error) {
        console.error('Stock monitoring error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Stock alert monitoring started (checking every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop monitoring stock levels
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Stock alert monitoring stopped');
  }

  /**
   * Check for low stock products
   */
  async checkLowStock(): Promise<LowStockProduct[]> {
    try {
      await connectToDatabase();

      const lowStockProducts = await this.getLowStockProducts();

      if (lowStockProducts.length > 0) {
        console.log(`Found ${lowStockProducts.length} low stock products`);

        // Group products by user for batching
        const productsByUser = this.groupProductsByUser(lowStockProducts);

        // Send notifications for each user
        for (const [userId, products] of Array.from(productsByUser.entries())) {
          await this.sendStockAlerts(userId, products);
        }
      }

      return lowStockProducts;
    } catch (error) {
      console.error('Failed to check low stock:', error);
      return [];
    }
  }

  /**
   * Get products with low stock
   */
  private async getLowStockProducts(): Promise<LowStockProduct[]> {
    const products = await Product.aggregate([
      {
        $match: {
          manageStock: true,
          stock: true,
          $expr: {
            $lte: ['$qty', '$lowStockThreshold']
          }
        }
      },
      {
        $project: {
          title: 1,
          sku: 1,
          qty: 1,
          lowStockThreshold: 1,
          userId: 1,
          createdBy: 1
        }
      }
    ]);

    return products;
  }

  /**
   * Group products by user
   */
  private groupProductsByUser(products: LowStockProduct[]): Map<string, LowStockProduct[]> {
    const productsByUser = new Map<string, LowStockProduct[]>();

    for (const product of products) {
      // Use userId if available, otherwise try to find user by createdBy email
      const userId = product.userId || product.createdBy || 'admin';

      if (!productsByUser.has(userId)) {
        productsByUser.set(userId, []);
      }

      productsByUser.get(userId)!.push(product);
    }

    return productsByUser;
  }

  /**
   * Send stock alerts for a user
   */
  private async sendStockAlerts(userId: string, products: LowStockProduct[]): Promise<void> {
    try {
      // Find user by ID or email
      let user;
      if (userId.includes('@')) {
        user = await User.findOne({ email: userId });
      } else {
        user = await User.findById(userId);
      }

      if (!user) {
        console.warn(`User not found for stock alert: ${userId}`);
        return;
      }

      // Check if we've already sent alerts for these products recently
      const alertKey = `${user._id}-${products.map(p => p._id).sort().join(',')}`;
      if (this.processedAlerts.has(alertKey)) {
        return; // Skip duplicate alert
      }

      if (products.length === 1) {
        // Single product alert
        const product = products[0];
        await notificationService.triggerNotification({
          type: 'stock_alert',
          userId: (user._id as any).toString(),
          data: { product },
          priority: 'high'
        });
      } else {
        // Multiple products - send batch alert
        await notificationService.triggerNotification({
          type: 'stock_alert',
          userId: (user._id as any).toString(),
          data: {
            products,
            batchAlert: true,
            totalProducts: products.length
          },
          priority: 'high'
        });
      }

      // Mark as processed
      this.processedAlerts.add(alertKey);

      // Clean up old processed alerts (keep for 24 hours)
      setTimeout(() => {
        this.processedAlerts.delete(alertKey);
      }, 24 * 60 * 60 * 1000);

      console.log(`Stock alert sent to user ${user.email} for ${products.length} product(s)`);
    } catch (error) {
      console.error(`Failed to send stock alert to user ${userId}:`, error);
    }
  }

  /**
   * Create stock alert for specific product
   */
  async createStockAlert(productId: string): Promise<void> {
    try {
      await connectToDatabase();

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if product is actually low on stock
      if (product.qty > (product.lowStockThreshold || 0)) {
        return; // Not low on stock
      }

      // Find the product owner
      let user;
      if (product.userId) {
        user = await User.findById(product.userId);
      } else if (product.createdBy) {
        user = await User.findOne({ email: product.createdBy });
      }

      if (!user) {
        console.warn(`No user found for product ${product.title}`);
        return;
      }

      await notificationService.triggerNotification({
        type: 'stock_alert',
        userId: user._id.toString(),
        data: { product: product.toObject() },
        priority: 'high'
      });

      console.log(`Manual stock alert created for product ${product.title}`);
    } catch (error) {
      console.error('Failed to create stock alert:', error);
      throw error;
    }
  }

  /**
   * Reset stock alert for product (when restocked)
   */
  async resetStockAlert(productId: string): Promise<void> {
    try {
      // Remove from processed alerts to allow new alerts if stock drops again
      const keysToRemove = Array.from(this.processedAlerts).filter(key =>
        key.includes(productId)
      );

      keysToRemove.forEach(key => {
        this.processedAlerts.delete(key);
      });

      console.log(`Stock alert reset for product ${productId}`);
    } catch (error) {
      console.error('Failed to reset stock alert:', error);
    }
  }

  /**
   * Get current low stock summary
   */
  async getLowStockSummary(): Promise<{
    totalLowStock: number;
    criticalStock: number; // Products with 0 stock
    productsByUser: { [userId: string]: number };
  }> {
    try {
      await connectToDatabase();

      const lowStockProducts = await this.getLowStockProducts();
      const criticalStock = lowStockProducts.filter(p => p.qty === 0).length;

      const productsByUser: { [userId: string]: number } = {};
      lowStockProducts.forEach(product => {
        const userId = product.userId || product.createdBy || 'unknown';
        productsByUser[userId] = (productsByUser[userId] || 0) + 1;
      });

      return {
        totalLowStock: lowStockProducts.length,
        criticalStock,
        productsByUser
      };
    } catch (error) {
      console.error('Failed to get low stock summary:', error);
      return {
        totalLowStock: 0,
        criticalStock: 0,
        productsByUser: {}
      };
    }
  }

  /**
   * Test stock alert system
   */
  async testStockAlert(userId: string): Promise<void> {
    const testProduct = {
      _id: 'test-product-id',
      title: 'Test Product - Low Stock Alert',
      sku: 'TEST-STOCK-001',
      qty: 2,
      lowStockThreshold: 10
    };

    await notificationService.triggerNotification({
      type: 'stock_alert',
      userId,
      data: { product: testProduct },
      priority: 'high'
    });

    console.log(`Test stock alert sent to user ${userId}`);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    processedAlertsCount: number;
  } {
    return {
      isMonitoring: this.monitoringInterval !== null,
      processedAlertsCount: this.processedAlerts.size
    };
  }
}

// Export singleton instance
export const stockAlertMonitor = new StockAlertMonitor();
export default StockAlertMonitor;