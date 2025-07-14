import mongoose from 'mongoose';
import Product from '../database/models/Product';
import ProductVariant from '../database/models/ProductVariant';
import StockAlert from '../database/models/StockAlert';
import InventoryLog from '../database/models/InventoryLog';

/**
 * Stock Alerts Utility
 * Manages stock alerts with MongoDB Change Streams and notification system
 */

export interface AlertNotificationSettings {
  email: {
    enabled: boolean;
    recipients: string[];
    template: string;
    cooldownMinutes: number;
  };
  sms: {
    enabled: boolean;
    recipients: string[];
    cooldownMinutes: number;
  };
  push: {
    enabled: boolean;
    cooldownMinutes: number;
  };
  dashboard: {
    enabled: boolean;
    showBadgeCount: boolean;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    stockLevel?: {
      operator: 'lte' | 'gte' | 'eq';
      value: number;
      useThreshold?: boolean; // Use product's low stock threshold instead of fixed value
    };
    stockChange?: {
      operator: 'decrease' | 'increase';
      percentage?: number;
      timeframe?: number; // minutes
    };
    productTypes?: string[];
    categories?: string[];
    brands?: string[];
  };
  actions: {
    createAlert: boolean;
    alertType: 'low_stock' | 'out_of_stock' | 'high_demand' | 'restock_needed' | 'overstock';
    priority: 'low' | 'medium' | 'high' | 'critical';
    notifications: AlertNotificationSettings;
    autoResolve?: {
      enabled: boolean;
      threshold?: number;
    };
  };
}

export class StockAlertsManager {
  private static changeStream: any | null = null;
  private static alertRules: AlertRule[] = [];
  private static isInitialized = false;

  /**
   * Initialize the stock alerts system
   */
  static async initialize(alertRules: AlertRule[] = []): Promise<void> {
    if (this.isInitialized) {
      console.log('Stock alerts system already initialized');
      return;
    }

    try {
      this.alertRules = alertRules.length > 0 ? alertRules : this.getDefaultAlertRules();
      
      // Initialize change streams
      await this.initializeChangeStreams();
      
      // Cleanup old alerts
      await this.cleanupOldAlerts();
      
      this.isInitialized = true;
      console.log('Stock alerts system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize stock alerts system:', error);
      throw error;
    }
  }

  /**
   * Initialize MongoDB Change Streams for real-time monitoring
   */
  private static async initializeChangeStreams(): Promise<void> {
    try {
      // Monitor Product collection for stock changes
      const productChangeStream = Product.watch([
        {
          $match: {
            $or: [
              { 'fullDocument.qty': { $exists: true } },
              { 'updateDescription.updatedFields.qty': { $exists: true } },
              { 'updateDescription.updatedFields.stockStatus': { $exists: true } }
            ]
          }
        }
      ]);

      productChangeStream.on('change', async (change) => {
        await this.handleProductStockChange(change);
      });

      // Monitor ProductVariant collection for stock changes
      const variantChangeStream = ProductVariant.watch([
        {
          $match: {
            $or: [
              { 'fullDocument.inventory.quantity': { $exists: true } },
              { 'updateDescription.updatedFields.inventory.quantity': { $exists: true } },
              { 'updateDescription.updatedFields.inventory.available': { $exists: true } }
            ]
          }
        }
      ]);

      variantChangeStream.on('change', async (change) => {
        await this.handleVariantStockChange(change);
      });

      console.log('Change streams initialized for stock monitoring');
    } catch (error) {
      console.error('Failed to initialize change streams:', error);
      // Don't throw here - the system can work without real-time monitoring
    }
  }

  /**
   * Handle product stock changes
   */
  private static async handleProductStockChange(change: any): Promise<void> {
    try {
      if (change.operationType !== 'update') return;

      const productId = change.documentKey._id;
      const updatedFields = change.updateDescription?.updatedFields || {};

      // Check if stock-related fields changed
      if ('qty' in updatedFields || 'stockStatus' in updatedFields) {
        const product = await Product.findById(productId);
        if (!product) return;

        const sku = (product as any).sku || (product as any).inventory?.sku;
        if (!sku) return;

        await this.evaluateStockRules(sku, (product as any).qty, 'product', {
          productId: product.id,
          productTitle: (product as any).title,
          category: (product as any).category,
          brand: (product as any).brand,
          threshold: (product as any).lowStockThreshold || 5
        });
      }
    } catch (error) {
      console.error('Error handling product stock change:', error);
    }
  }

  /**
   * Handle variant stock changes
   */
  private static async handleVariantStockChange(change: any): Promise<void> {
    try {
      if (change.operationType !== 'update') return;

      const variantId = change.documentKey._id;
      const updatedFields = change.updateDescription?.updatedFields || {};

      // Check if inventory fields changed
      if ('inventory.quantity' in updatedFields || 'inventory.available' in updatedFields) {
        const variant = await ProductVariant.findById(variantId);
        if (!variant) return;

        const product = await Product.findById((variant as any).productId);
        if (!product) return;

        await this.evaluateStockRules((variant as any).sku, (variant as any).inventory.quantity, 'variant', {
          variantId: variant.id,
          productId: (variant as any).productId,
          productTitle: (product as any).title,
          variantAttributes: (variant as any).attributes,
          category: (product as any).category,
          brand: (product as any).brand,
          threshold: (variant as any).inventory.lowStockThreshold || 5
        });
      }
    } catch (error) {
      console.error('Error handling variant stock change:', error);
    }
  }

  /**
   * Evaluate stock rules and create alerts if conditions are met
   */
  private static async evaluateStockRules(
    sku: string,
    currentStock: number,
    itemType: 'product' | 'variant',
    context: any
  ): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const shouldCreateAlert = await this.checkRuleConditions(rule, currentStock, itemType, context);
        
        if (shouldCreateAlert) {
          await this.createAlertFromRule(rule, sku, currentStock, itemType, context);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Check if rule conditions are met
   */
  private static async checkRuleConditions(
    rule: AlertRule,
    currentStock: number,
    itemType: 'product' | 'variant',
    context: any
  ): Promise<boolean> {
    const conditions = rule.conditions;

    // Check product type filter
    if (conditions.productTypes && conditions.productTypes.length > 0) {
      const productType = context.type || 'simple';
      if (!conditions.productTypes.includes(productType)) {
        return false;
      }
    }

    // Check category filter
    if (conditions.categories && conditions.categories.length > 0) {
      const categories = context.category || [];
      const hasMatchingCategory = conditions.categories.some(cat => 
        categories.includes(cat)
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Check brand filter
    if (conditions.brands && conditions.brands.length > 0) {
      const brand = context.brand;
      if (!brand || !conditions.brands.includes(brand)) {
        return false;
      }
    }

    // Check stock level condition
    if (conditions.stockLevel) {
      const threshold = conditions.stockLevel.useThreshold ? context.threshold : conditions.stockLevel.value;
      
      switch (conditions.stockLevel.operator) {
        case 'lte':
          if (currentStock > threshold) return false;
          break;
        case 'gte':
          if (currentStock < threshold) return false;
          break;
        case 'eq':
          if (currentStock !== threshold) return false;
          break;
      }
    }

    // Check stock change condition
    if (conditions.stockChange) {
      const hasSignificantChange = await this.checkStockChangeCondition(
        context.sku || context.variantId,
        conditions.stockChange,
        currentStock
      );
      if (!hasSignificantChange) return false;
    }

    // Check if similar alert already exists and is active
    const existingAlert = await StockAlert.findOne({
      sku: context.sku || context.variantId,
      alertType: rule.actions.alertType,
      status: 'active'
    });

    if (existingAlert) {
      return false; // Don't create duplicate alerts
    }

    return true;
  }

  /**
   * Check stock change conditions
   */
  private static async checkStockChangeCondition(
    sku: string,
    changeCondition: any,
    currentStock: number
  ): Promise<boolean> {
    try {
      const timeframeMinutes = changeCondition.timeframe || 60;
      const sinceDate = new Date(Date.now() - timeframeMinutes * 60 * 1000);

      const recentLogs = await InventoryLog.find({
        sku: sku,
        createdAt: { $gte: sinceDate }
      }).sort({ createdAt: -1 }).limit(5);

      if (recentLogs.length === 0) return false;

      const totalChange = recentLogs.reduce((sum, log) => sum + log.quantityChange, 0);
      
      if (changeCondition.operator === 'decrease' && totalChange >= 0) {
        return false;
      }
      
      if (changeCondition.operator === 'increase' && totalChange <= 0) {
        return false;
      }

      // Check percentage change if specified
      if (changeCondition.percentage) {
        const oldStock = currentStock - totalChange;
        if (oldStock === 0) return true; // Any change from 0 is significant
        
        const percentageChange = Math.abs(totalChange / oldStock) * 100;
        return percentageChange >= changeCondition.percentage;
      }

      return true;
    } catch (error) {
      console.error('Error checking stock change condition:', error);
      return false;
    }
  }

  /**
   * Create alert from rule
   */
  private static async createAlertFromRule(
    rule: AlertRule,
    sku: string,
    currentStock: number,
    itemType: 'product' | 'variant',
    context: any
  ): Promise<void> {
    try {
      const alertData = {
        productId: itemType === 'product' ? context.productId : undefined,
        variantId: itemType === 'variant' ? context.variantId : undefined,
        sku: sku,
        alertType: rule.actions.alertType,
        priority: rule.actions.priority,
        threshold: context.threshold,
        currentStock: currentStock,
        status: 'active' as const,
        autoResolve: rule.actions.autoResolve?.enabled || true,
        autoResolveThreshold: rule.actions.autoResolve?.threshold,
        suppressSimilar: true,
        notificationsSent: {
          email: [],
          sms: [],
          push: [],
          dashboard: []
        }
      };

      const alert = await StockAlert.createAlert(alertData);

      // Send notifications if configured
      if (rule.actions.notifications) {
        await this.sendAlertNotifications(alert, rule.actions.notifications);
      }

      console.log(`Created ${rule.actions.alertType} alert for SKU: ${sku}`);
    } catch (error) {
      console.error('Error creating alert from rule:', error);
    }
  }

  /**
   * Send alert notifications
   */
  private static async sendAlertNotifications(
    alert: any,
    notificationSettings: AlertNotificationSettings
  ): Promise<void> {
    try {
      // Email notifications
      if (notificationSettings.email.enabled && alert.canSendNotification('email')) {
        await this.sendEmailNotification(alert, notificationSettings.email);
        await alert.addNotification('email');
      }

      // SMS notifications
      if (notificationSettings.sms.enabled && alert.canSendNotification('sms')) {
        await this.sendSMSNotification(alert, notificationSettings.sms);
        await alert.addNotification('sms');
      }

      // Push notifications
      if (notificationSettings.push.enabled && alert.canSendNotification('push')) {
        await this.sendPushNotification(alert);
        await alert.addNotification('push');
      }

      // Dashboard notifications (always enabled)
      await alert.addNotification('dashboard');
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private static async sendEmailNotification(alert: any, emailSettings: any): Promise<void> {
    // TODO: Implement email sending using your preferred email service
    console.log(`Email notification sent for alert: ${alert.message}`);
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private static async sendSMSNotification(alert: any, smsSettings: any): Promise<void> {
    // TODO: Implement SMS sending using your preferred SMS service
    console.log(`SMS notification sent for alert: ${alert.message}`);
  }

  /**
   * Send push notification (placeholder implementation)
   */
  private static async sendPushNotification(alert: any): Promise<void> {
    // TODO: Implement push notifications using your preferred service
    console.log(`Push notification sent for alert: ${alert.message}`);
  }

  /**
   * Get default alert rules
   */
  private static getDefaultAlertRules(): AlertRule[] {
    return [
      {
        id: 'out-of-stock',
        name: 'Out of Stock Alert',
        enabled: true,
        conditions: {
          stockLevel: {
            operator: 'eq',
            value: 0
          }
        },
        actions: {
          createAlert: true,
          alertType: 'out_of_stock',
          priority: 'critical',
          notifications: {
            email: {
              enabled: true,
              recipients: [],
              template: 'out-of-stock',
              cooldownMinutes: 60
            },
            sms: {
              enabled: false,
              recipients: [],
              cooldownMinutes: 60
            },
            push: {
              enabled: true,
              cooldownMinutes: 30
            },
            dashboard: {
              enabled: true,
              showBadgeCount: true
            }
          },
          autoResolve: {
            enabled: true,
            threshold: 1
          }
        }
      },
      {
        id: 'low-stock',
        name: 'Low Stock Alert',
        enabled: true,
        conditions: {
          stockLevel: {
            operator: 'lte',
            value: 0,
            useThreshold: true
          }
        },
        actions: {
          createAlert: true,
          alertType: 'low_stock',
          priority: 'high',
          notifications: {
            email: {
              enabled: true,
              recipients: [],
              template: 'low-stock',
              cooldownMinutes: 240
            },
            sms: {
              enabled: false,
              recipients: [],
              cooldownMinutes: 240
            },
            push: {
              enabled: true,
              cooldownMinutes: 120
            },
            dashboard: {
              enabled: true,
              showBadgeCount: true
            }
          },
          autoResolve: {
            enabled: true
          }
        }
      },
      {
        id: 'high-demand',
        name: 'High Demand Alert',
        enabled: true,
        conditions: {
          stockChange: {
            operator: 'decrease',
            percentage: 50,
            timeframe: 60
          }
        },
        actions: {
          createAlert: true,
          alertType: 'high_demand',
          priority: 'medium',
          notifications: {
            email: {
              enabled: true,
              recipients: [],
              template: 'high-demand',
              cooldownMinutes: 480
            },
            sms: {
              enabled: false,
              recipients: [],
              cooldownMinutes: 480
            },
            push: {
              enabled: false,
              cooldownMinutes: 240
            },
            dashboard: {
              enabled: true,
              showBadgeCount: false
            }
          }
        }
      }
    ];
  }

  /**
   * Process pending alerts and send notifications
   */
  static async processPendingAlerts(): Promise<number> {
    try {
      const pendingAlerts = await StockAlert.findPendingNotifications();
      let processedCount = 0;

      for (const alert of pendingAlerts) {
        // Find matching rule for this alert
        const rule = this.alertRules.find(r => r.actions.alertType === alert.alertType);
        
        if (rule && rule.actions.notifications) {
          await this.sendAlertNotifications(alert, rule.actions.notifications);
          processedCount++;
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error processing pending alerts:', error);
      return 0;
    }
  }

  /**
   * Cleanup old resolved alerts
   */
  static async cleanupOldAlerts(olderThanDays: number = 30): Promise<number> {
    try {
      return await StockAlert.cleanupOldAlerts(olderThanDays);
    } catch (error) {
      console.error('Error cleaning up old alerts:', error);
      return 0;
    }
  }

  /**
   * Get alert statistics
   */
  static async getAlertStats(): Promise<{
    total: number;
    active: number;
    critical: number;
    byType: { [key: string]: number };
    byPriority: { [key: string]: number };
  }> {
    try {
      const [
        totalAlerts,
        activeAlerts,
        criticalAlerts,
        alertsByType,
        alertsByPriority
      ] = await Promise.all([
        StockAlert.countDocuments(),
        StockAlert.countDocuments({ status: 'active' }),
        StockAlert.countDocuments({ status: 'active', priority: 'critical' }),
        StockAlert.aggregate([
          { $group: { _id: '$alertType', count: { $sum: 1 } } }
        ]),
        StockAlert.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
      ]);

      const byType: { [key: string]: number } = {};
      alertsByType.forEach((item: any) => {
        byType[item._id] = item.count;
      });

      const byPriority: { [key: string]: number } = {};
      alertsByPriority.forEach((item: any) => {
        byPriority[item._id] = item.count;
      });

      return {
        total: totalAlerts,
        active: activeAlerts,
        critical: criticalAlerts,
        byType,
        byPriority
      };
    } catch (error) {
      console.error('Error getting alert stats:', error);
      return {
        total: 0,
        active: 0,
        critical: 0,
        byType: {},
        byPriority: {}
      };
    }
  }

  /**
   * Shutdown the alerts system
   */
  static async shutdown(): Promise<void> {
    try {
      if (this.changeStream) {
        await this.changeStream.close();
        this.changeStream = null;
      }
      
      this.isInitialized = false;
      console.log('Stock alerts system shutdown completed');
    } catch (error) {
      console.error('Error shutting down stock alerts system:', error);
    }
  }
}