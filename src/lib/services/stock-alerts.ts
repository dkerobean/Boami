import { connectDB } from '@/lib/database/mongoose-connection';
import mongoose from 'mongoose';

export interface StockAlert {
  _id?: string;
  productId: string;
  productName: string;
  sku: string;
  alertType: 'low_stock' | 'out_of_stock' | 'critical_low' | 'high_demand';
  priority: 'critical' | 'high' | 'medium' | 'low';
  currentStock: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date;
  lastUpdated: Date;
  triggeredCount?: number;
  lastTriggered?: Date;
  notificationChannels?: string[];
  isActive?: boolean;
}

export interface StockAlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  active: number;
  acknowledged: number;
  resolved: number;
  outOfStock: number;
  lowStock: number;
}

export interface StockAlertFilters {
  search?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'active' | 'acknowledged' | 'resolved';
  alertType?: 'low_stock' | 'out_of_stock' | 'critical_low' | 'high_demand';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'priority' | 'productName' | 'currentStock';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Stock Alerts Service
 * Handles real-time stock monitoring and alert generation
 */
export class StockAlertsService {
  
  /**
   * Get alert priority based on stock level percentage
   */
  private static getAlertPriority(currentStock: number, threshold: number): 'critical' | 'high' | 'medium' | 'low' {
    if (currentStock === 0) return 'critical';
    
    const percentage = (currentStock / threshold) * 100;
    
    if (percentage <= 25) return 'critical';
    if (percentage <= 50) return 'high';
    if (percentage <= 75) return 'medium';
    return 'low';
  }

  /**
   * Get alert type based on stock conditions
   */
  private static getAlertType(currentStock: number, threshold: number): 'low_stock' | 'out_of_stock' | 'critical_low' {
    if (currentStock === 0) return 'out_of_stock';
    if (currentStock <= threshold * 0.25) return 'critical_low';
    return 'low_stock';
  }

  /**
   * Generate alerts from current product stock levels
   */
  static async generateAlertsFromProducts(): Promise<StockAlert[]> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Find products that need alerts (stock <= threshold or out of stock)
      const productsNeedingAlerts = await db.collection('products').find({
        $or: [
          { qty: 0 }, // Out of stock
          { $expr: { $lte: ['$qty', '$lowStockThreshold'] } } // Low stock
        ],
        status: 'publish' // Only check published products
      }).toArray();

      const alerts: StockAlert[] = [];

      for (const product of productsNeedingAlerts) {
        const currentStock = product.qty || 0;
        const threshold = product.lowStockThreshold || 5;
        
        // Check if alert already exists and is active
        const existingAlert = await db.collection('stockalerts').findOne({
          productId: product._id.toString(),
          status: { $in: ['active', 'acknowledged'] }
        });

        // Only create new alert if none exists or if stock situation changed
        if (!existingAlert) {
          const alertType = this.getAlertType(currentStock, threshold);
          const priority = this.getAlertPriority(currentStock, threshold);

          const alert: StockAlert = {
            productId: product._id.toString(),
            productName: product.title,
            sku: product.sku,
            alertType,
            priority,
            currentStock,
            threshold,
            status: 'active',
            createdAt: new Date(),
            lastUpdated: new Date(),
            triggeredCount: 1,
            lastTriggered: new Date(),
            notificationChannels: ['dashboard'],
            isActive: true
          };

          alerts.push(alert);
        } else {
          // Update existing alert with current stock info
          await db.collection('stockalerts').updateOne(
            { _id: existingAlert._id },
            {
              $set: {
                currentStock,
                lastUpdated: new Date(),
                lastTriggered: new Date()
              },
              $inc: { triggeredCount: 1 }
            }
          );
        }
      }

      // Insert new alerts
      if (alerts.length > 0) {
        await db.collection('stockalerts').insertMany(alerts);
      }

      // Auto-resolve alerts for products that are back in stock
      await this.autoResolveAlerts();

      return alerts;
    } catch (error) {
      console.error('Error generating alerts from products:', error);
      return [];
    }
  }

  /**
   * Auto-resolve alerts for products that are back in stock above threshold
   */
  private static async autoResolveAlerts(): Promise<void> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Find active alerts
      const activeAlerts = await db.collection('stockalerts').find({
        status: { $in: ['active', 'acknowledged'] }
      }).toArray();

      for (const alert of activeAlerts) {
        // Get current product stock
        const product = await db.collection('products').findOne({
          _id: new mongoose.Types.ObjectId(alert.productId)
        });

        if (product) {
          const currentStock = product.qty || 0;
          const threshold = product.lowStockThreshold || 5;

          // Resolve alert if stock is back above threshold
          if (currentStock > threshold) {
            await db.collection('stockalerts').updateOne(
              { _id: alert._id },
              {
                $set: {
                  status: 'resolved',
                  lastUpdated: new Date(),
                  currentStock
                }
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error auto-resolving alerts:', error);
    }
  }

  /**
   * Get stock alerts with filtering and pagination
   */
  static async getStockAlerts(filters: StockAlertFilters = {}): Promise<{
    alerts: StockAlert[];
    pagination: any;
    statistics: StockAlertStats;
  }> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Generate fresh alerts before fetching
      await this.generateAlertsFromProducts();

      const {
        search,
        priority,
        status,
        alertType,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build match query
      const matchQuery: any = {};

      if (search) {
        matchQuery.$or = [
          { productName: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }

      if (priority) {
        matchQuery.priority = priority;
      }

      if (status) {
        matchQuery.status = status;
      }

      if (alertType) {
        matchQuery.alertType = alertType;
      }

      // Build sort query
      const sortQuery: any = {};
      if (sortBy === 'priority') {
        // Custom priority sorting
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        sortQuery._priorityWeight = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortQuery[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }

      // Get total count for pagination
      const totalCount = await db.collection('stockalerts').countDocuments(matchQuery);

      // Build aggregation pipeline
      const pipeline = [
        { $match: matchQuery }
      ];

      // Add priority weight for sorting if needed
      if (sortBy === 'priority') {
        pipeline.push({
          $addFields: {
            _priorityWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'critical'] }, then: 4 },
                  { case: { $eq: ['$priority', 'high'] }, then: 3 },
                  { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                  { case: { $eq: ['$priority', 'low'] }, then: 1 }
                ],
                default: 0
              }
            }
          }
        });
      }

      pipeline.push(
        { $sort: sortQuery },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      );

      // Remove temporary fields
      if (sortBy === 'priority') {
        pipeline.push({ $unset: '_priorityWeight' });
      }

      const alerts = await db.collection('stockalerts').aggregate(pipeline).toArray();

      // Calculate statistics
      const statistics = await this.getStockAlertStatistics();

      // Pagination info
      const pagination = {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      };

      return {
        alerts: alerts.map(alert => ({
          ...alert,
          _id: alert._id.toString()
        })),
        pagination,
        statistics
      };
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return {
        alerts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        statistics: {
          total: 0, critical: 0, high: 0, medium: 0, low: 0,
          active: 0, acknowledged: 0, resolved: 0, outOfStock: 0, lowStock: 0
        }
      };
    }
  }

  /**
   * Get stock alert statistics
   */
  static async getStockAlertStatistics(): Promise<StockAlertStats> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      const stats = await db.collection('stockalerts').aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            critical: {
              $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] }
            },
            high: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
            },
            medium: {
              $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] }
            },
            low: {
              $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] }
            },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            acknowledged: {
              $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] }
            },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            outOfStock: {
              $sum: { $cond: [{ $eq: ['$alertType', 'out_of_stock'] }, 1, 0] }
            },
            lowStock: {
              $sum: { $cond: [{ $eq: ['$alertType', 'low_stock'] }, 1, 0] }
            }
          }
        }
      ]).toArray();

      const result = stats[0] || {
        total: 0, critical: 0, high: 0, medium: 0, low: 0,
        active: 0, acknowledged: 0, resolved: 0, outOfStock: 0, lowStock: 0
      };

      return result;
    } catch (error) {
      console.error('Error calculating stock alert statistics:', error);
      return {
        total: 0, critical: 0, high: 0, medium: 0, low: 0,
        active: 0, acknowledged: 0, resolved: 0, outOfStock: 0, lowStock: 0
      };
    }
  }

  /**
   * Update stock alert status
   */
  static async updateAlertStatus(
    alertIds: string[],
    status: 'active' | 'acknowledged' | 'resolved',
    userId?: string,
    note?: string
  ): Promise<boolean> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      const objectIds = alertIds.map(id => new mongoose.Types.ObjectId(id));

      await db.collection('stockalerts').updateMany(
        { _id: { $in: objectIds } },
        {
          $set: {
            status,
            lastUpdated: new Date()
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error updating alert status:', error);
      return false;
    }
  }

  /**
   * Get single stock alert by ID
   */
  static async getStockAlertById(alertId: string): Promise<StockAlert | null> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      const alert = await db.collection('stockalerts').findOne({
        _id: new mongoose.Types.ObjectId(alertId)
      });

      if (!alert) return null;

      return {
        ...alert,
        _id: alert._id.toString()
      };
    } catch (error) {
      console.error('Error fetching stock alert by ID:', error);
      return null;
    }
  }

  /**
   * Delete stock alerts
   */
  static async deleteAlerts(alertIds: string[]): Promise<boolean> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      const objectIds = alertIds.map(id => new mongoose.Types.ObjectId(id));

      await db.collection('stockalerts').deleteMany({
        _id: { $in: objectIds }
      });

      return true;
    } catch (error) {
      console.error('Error deleting stock alerts:', error);
      return false;
    }
  }
}