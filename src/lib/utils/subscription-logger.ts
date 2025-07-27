import { connectToDatabase } from '../database/mongoose-connection';
import mongoose from 'mongoose';

/**
 * Audit log entry interface
 */
interface IAuditLog {
  userId?: string;
  subscriptionId?: string;
  transactionId?: string;
  action: string;
  resource: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'subscription' | 'payment' | 'security' | 'access';
}

/**
 * Audit log schema
 */
const auditLogSchema = new mongoose.Schema<IAuditLog>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  category: {
    type: String,
    enum: ['subscription', 'payment', 'security', 'access'],
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ subscriptionId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// TTL index to automatically delete old logs after 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

/**
 * Subscription audit logger
 */
export class SubscriptionLogger {

  /**
   * Log subscription-related activities
   */
  static async logSubscriptionActivity(
    action: string,
    details: any,
    options: {
      userId?: string;
      subscriptionId?: string;
      transactionId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    } = {}
  ) {
    try {
      await connectToDatabase();

      const logEntry = new AuditLog({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        transactionId: options.transactionId,
        action,
        resource: 'subscription',
        details: this.sanitizeDetails(details),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        severity: options.severity || 'info',
        category: 'subscription',
        timestamp: new Date()
      });

      await logEntry.save();

      // Also log to console for immediate visibility
      console.log(`[SUBSCRIPTION AUDIT] ${action}:`, {
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        severity: options.severity || 'info',
        details: this.sanitizeDetails(details)
      });

    } catch (error) {
      console.error('Failed to log subscription activity:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log payment-related activities
   */
  static async logPaymentActivity(
    action: string,
    details: any,
    options: {
      userId?: string;
      subscriptionId?: string;
      transactionId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    } = {}
  ) {
    try {
      await connectToDatabase();

      const logEntry = new AuditLog({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        transactionId: options.transactionId,
        action,
        resource: 'payment',
        details: this.sanitizeDetails(details),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        severity: options.severity || 'info',
        category: 'payment',
        timestamp: new Date()
      });

      await logEntry.save();

      // Also log to console for immediate visibility
      console.log(`[PAYMENT AUDIT] ${action}:`, {
        userId: options.userId,
        transactionId: options.transactionId,
        severity: options.severity || 'info',
        details: this.sanitizeDetails(details)
      });

    } catch (error) {
      console.error('Failed to log payment activity:', error);
    }
  }

  /**
   * Log security-related activities
   */
  static async logSecurityActivity(
    action: string,
    details: any,
    options: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    } = {}
  ) {
    try {
      await connectToDatabase();

      const logEntry = new AuditLog({
        userId: options.userId,
        action,
        resource: 'security',
        details: this.sanitizeDetails(details),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        severity: options.severity || 'warning',
        category: 'security',
        timestamp: new Date()
      });

      await logEntry.save();

      // Log security events to console with higher visibility
      console.warn(`[SECURITY AUDIT] ${action}:`, {
        userId: options.userId,
        ipAddress: options.ipAddress,
        severity: options.severity || 'warning',
        details: this.sanitizeDetails(details)
      });

    } catch (error) {
      console.error('Failed to log security activity:', error);
    }
  }

  /**
   * Log access control activities
   */
  static async logAccessActivity(
    action: string,
    details: any,
    options: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    } = {}
  ) {
    try {
      await connectToDatabase();

      const logEntry = new AuditLog({
        userId: options.userId,
        action,
        resource: 'access',
        details: this.sanitizeDetails(details),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        severity: options.severity || 'info',
        category: 'access',
        timestamp: new Date()
      });

      await logEntry.save();

      console.log(`[ACCESS AUDIT] ${action}:`, {
        userId: options.userId,
        severity: options.severity || 'info',
        details: this.sanitizeDetails(details)
      });

    } catch (error) {
      console.error('Failed to log access activity:', error);
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters: {
    userId?: string;
    subscriptionId?: string;
    category?: string;
    action?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      await connectToDatabase();

      const query: any = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.subscriptionId) query.subscriptionId = filters.subscriptionId;
      if (filters.category) query.category = filters.category;
      if (filters.action) query.action = new RegExp(filters.action, 'i');
      if (filters.severity) query.severity = filters.severity;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(offset)
          .populate('userId', 'firstName lastName email')
          .populate('subscriptionId', 'planId status')
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      };

    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get security alerts (high severity logs)
   */
  static async getSecurityAlerts(limit: number = 50) {
    try {
      await connectToDatabase();

      const alerts = await AuditLog.find({
        $or: [
          { severity: 'critical' },
          { severity: 'error', category: 'security' },
          { action: /failed|unauthorized|suspicious/i }
        ]
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean();

      return alerts;

    } catch (error) {
      console.error('Failed to get security alerts:', error);
      throw error;
    }
  }

  /**
   * Sanitize details to remove sensitive information
   */
  private static sanitizeDetails(details: any): any {
    if (!details) return details;

    const sanitized = JSON.parse(JSON.stringify(details));

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'cardNumber',
      'cvv',
      'accountNumber',
      'routingNumber',
      'ssn',
      'taxId',
      'apiKey',
      'secretKey',
      'token'
    ];

    const sanitizeObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Clean up old audit logs (manual cleanup)
   */
  static async cleanupOldLogs(olderThanDays: number = 730) { // 2 years default
    try {
      await connectToDatabase();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} old audit logs`);
      return result.deletedCount;

    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(days: number = 30) {
    try {
      await connectToDatabase();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              severity: '$severity'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            severities: {
              $push: {
                severity: '$_id.severity',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        }
      ]);

      return stats;

    } catch (error) {
      console.error('Failed to get audit stats:', error);
      throw error;
    }
  }
}

export { AuditLog };