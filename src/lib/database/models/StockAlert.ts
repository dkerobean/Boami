import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Stock Alert interface for managing inventory alerts
 * Handles low stock, out of stock, and high demand notifications
 */
export interface IStockAlert {
  productId?: string; // Reference to Product (for simple products)
  variantId?: string; // Reference to ProductVariant (for variable products)
  sku: string; // SKU for easy identification
  
  alertType: 'low_stock' | 'out_of_stock' | 'high_demand' | 'restock_needed' | 'overstock';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Stock information
  threshold: number; // The threshold that triggered this alert
  currentStock: number; // Current stock level when alert was created
  recommendedAction?: string; // Suggested action to take
  
  // Alert status and tracking
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  
  // Notification tracking
  notificationsSent: {
    email: Date[];
    sms: Date[];
    push: Date[];
    dashboard: Date[];
  };
  
  // Alert metadata
  message: string; // Human-readable alert message
  severity: number; // 1-10 severity score
  estimatedImpact?: {
    potentialLostSales: number;
    affectedOrders: number;
    revenueAtRisk: number;
  };
  
  // Resolution tracking
  acknowledgedAt?: Date;
  acknowledgedBy?: string; // User ID who acknowledged
  resolvedAt?: Date;
  resolvedBy?: string; // User ID who resolved
  resolutionNotes?: string;
  
  // Auto-resolution
  autoResolve: boolean; // Whether this alert can be auto-resolved
  autoResolveThreshold?: number; // Stock level to auto-resolve at
  
  // Recurrence prevention
  suppressUntil?: Date; // Don't create similar alerts until this date
  suppressSimilar: boolean; // Suppress similar alerts for a period
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stock Alert document interface extending Mongoose Document
 */
export interface IStockAlertDocument extends IStockAlert, Document {
  acknowledge(userId: string, notes?: string): Promise<void>;
  resolve(userId: string, notes?: string): Promise<void>;
  dismiss(userId: string, reason?: string): Promise<void>;
  addNotification(type: 'email' | 'sms' | 'push' | 'dashboard'): Promise<void>;
  shouldAutoResolve(currentStock: number): boolean;
  calculateSeverity(): number;
  isExpired(): boolean;
  canSendNotification(type: 'email' | 'sms' | 'push'): boolean;
}

/**
 * Stock Alert model interface with static methods
 */
export interface IStockAlertModel extends Model<IStockAlertDocument> {
  findActiveAlerts(): Promise<IStockAlertDocument[]>;
  findBySku(sku: string): Promise<IStockAlertDocument[]>;
  findByProduct(productId: string): Promise<IStockAlertDocument[]>;
  findByVariant(variantId: string): Promise<IStockAlertDocument[]>;
  findCriticalAlerts(): Promise<IStockAlertDocument[]>;
  findPendingNotifications(): Promise<IStockAlertDocument[]>;
  createAlert(data: Partial<IStockAlert>): Promise<IStockAlertDocument>;
  autoResolveAlerts(sku: string, currentStock: number): Promise<number>;
  cleanupOldAlerts(olderThanDays: number): Promise<number>;
}

/**
 * Stock Alert schema definition
 */
const stockAlertSchema = new Schema<IStockAlertDocument, IStockAlertModel>({
  productId: {
    type: String,
    ref: 'Product',
    index: true,
    sparse: true
  },
  variantId: {
    type: String,
    ref: 'ProductVariant',
    index: true,
    sparse: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  
  alertType: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'high_demand', 'restock_needed', 'overstock'],
    required: [true, 'Alert type is required'],
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, 'Priority is required'],
    index: true
  },
  
  threshold: {
    type: Number,
    required: [true, 'Threshold is required'],
    min: [0, 'Threshold cannot be negative']
  },
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Current stock cannot be negative']
  },
  recommendedAction: {
    type: String,
    trim: true,
    maxlength: [500, 'Recommended action cannot exceed 500 characters']
  },
  
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active',
    index: true
  },
  
  notificationsSent: {
    email: [{
      type: Date
    }],
    sms: [{
      type: Date
    }],
    push: [{
      type: Date
    }],
    dashboard: [{
      type: Date
    }]
  },
  
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  severity: {
    type: Number,
    min: [1, 'Severity must be between 1 and 10'],
    max: [10, 'Severity must be between 1 and 10'],
    default: 5
  },
  estimatedImpact: {
    potentialLostSales: {
      type: Number,
      default: 0,
      min: [0, 'Potential lost sales cannot be negative']
    },
    affectedOrders: {
      type: Number,
      default: 0,
      min: [0, 'Affected orders cannot be negative']
    },
    revenueAtRisk: {
      type: Number,
      default: 0,
      min: [0, 'Revenue at risk cannot be negative']
    }
  },
  
  acknowledgedAt: Date,
  acknowledgedBy: String,
  resolvedAt: Date,
  resolvedBy: String,
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
  },
  
  autoResolve: {
    type: Boolean,
    default: true
  },
  autoResolveThreshold: {
    type: Number,
    min: [0, 'Auto resolve threshold cannot be negative']
  },
  
  suppressUntil: Date,
  suppressSimilar: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance
stockAlertSchema.index({ sku: 1, status: 1 });
stockAlertSchema.index({ alertType: 1, status: 1 });
stockAlertSchema.index({ priority: 1, status: 1, createdAt: -1 });
stockAlertSchema.index({ status: 1, createdAt: -1 });
stockAlertSchema.index({ productId: 1, status: 1 });
stockAlertSchema.index({ variantId: 1, status: 1 });
stockAlertSchema.index({ severity: -1, status: 1 });
stockAlertSchema.index({ autoResolve: 1, status: 1 });

// TTL index for auto-cleanup of old resolved alerts (90 days)
stockAlertSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Pre-save middleware to calculate severity automatically
 */
stockAlertSchema.pre('save', function(next) {
  if (!this.severity || this.severity === 5) {
    this.severity = this.calculateSeverity();
  }
  next();
});

/**
 * Instance method to acknowledge alert
 */
stockAlertSchema.methods.acknowledge = async function(userId: string, notes?: string): Promise<void> {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();
  this.acknowledgedBy = userId;
  if (notes) {
    this.resolutionNotes = notes;
  }
  await this.save();
};

/**
 * Instance method to resolve alert
 */
stockAlertSchema.methods.resolve = async function(userId: string, notes?: string): Promise<void> {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  if (notes) {
    this.resolutionNotes = notes;
  }
  await this.save();
};

/**
 * Instance method to dismiss alert
 */
stockAlertSchema.methods.dismiss = async function(userId: string, reason?: string): Promise<void> {
  this.status = 'dismissed';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  if (reason) {
    this.resolutionNotes = `Dismissed: ${reason}`;
  }
  await this.save();
};

/**
 * Instance method to add notification record
 */
stockAlertSchema.methods.addNotification = async function(type: 'email' | 'sms' | 'push' | 'dashboard'): Promise<void> {
  this.notificationsSent[type].push(new Date());
  await this.save();
};

/**
 * Instance method to check if alert should auto-resolve
 */
stockAlertSchema.methods.shouldAutoResolve = function(currentStock: number): boolean {
  return this.autoResolve && 
         this.autoResolveThreshold !== undefined && 
         currentStock >= this.autoResolveThreshold &&
         this.status === 'active';
};

/**
 * Instance method to calculate severity score
 */
stockAlertSchema.methods.calculateSeverity = function(): number {
  let severity = 5; // Base severity
  
  // Adjust based on alert type
  switch (this.alertType) {
    case 'out_of_stock':
      severity = 9;
      break;
    case 'low_stock':
      severity = 6;
      break;
    case 'high_demand':
      severity = 7;
      break;
    case 'restock_needed':
      severity = 8;
      break;
    case 'overstock':
      severity = 3;
      break;
  }
  
  // Adjust based on how far below threshold we are
  if (this.threshold > 0) {
    const percentageBelow = (this.threshold - this.currentStock) / this.threshold;
    if (percentageBelow > 0.8) severity = Math.min(10, severity + 2);
    else if (percentageBelow > 0.5) severity = Math.min(10, severity + 1);
  }
  
  // Adjust based on estimated impact
  if (this.estimatedImpact?.revenueAtRisk && this.estimatedImpact.revenueAtRisk > 1000) {
    severity = Math.min(10, severity + 1);
  }
  
  return Math.max(1, Math.min(10, severity));
};

/**
 * Instance method to check if alert is expired
 */
stockAlertSchema.methods.isExpired = function(): boolean {
  if (this.suppressUntil) {
    return new Date() < this.suppressUntil;
  }
  return false;
};

/**
 * Instance method to check if notification can be sent
 */
stockAlertSchema.methods.canSendNotification = function(type: 'email' | 'sms' | 'push'): boolean {
  const lastNotification = this.notificationsSent[type]?.slice(-1)[0];
  if (!lastNotification) return true;
  
  // Don't send same type of notification more than once per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastNotification < oneHourAgo;
};

/**
 * Static method to find active alerts
 */
stockAlertSchema.statics.findActiveAlerts = function() {
  return this.find({ status: 'active' })
    .sort({ severity: -1, createdAt: -1 });
};

/**
 * Static method to find alerts by SKU
 */
stockAlertSchema.statics.findBySku = function(sku: string) {
  return this.find({ sku: sku.toUpperCase() })
    .sort({ createdAt: -1 });
};

/**
 * Static method to find alerts by product
 */
stockAlertSchema.statics.findByProduct = function(productId: string) {
  return this.find({ productId })
    .sort({ severity: -1, createdAt: -1 });
};

/**
 * Static method to find alerts by variant
 */
stockAlertSchema.statics.findByVariant = function(variantId: string) {
  return this.find({ variantId })
    .sort({ severity: -1, createdAt: -1 });
};

/**
 * Static method to find critical alerts
 */
stockAlertSchema.statics.findCriticalAlerts = function() {
  return this.find({ 
    status: 'active',
    $or: [
      { priority: 'critical' },
      { severity: { $gte: 8 } }
    ]
  }).sort({ severity: -1, createdAt: -1 });
};

/**
 * Static method to find alerts pending notifications
 */
stockAlertSchema.statics.findPendingNotifications = function() {
  return this.find({
    status: 'active',
    $or: [
      { 'notificationsSent.email': { $size: 0 } },
      { 'notificationsSent.dashboard': { $size: 0 } }
    ]
  }).sort({ severity: -1, createdAt: 1 });
};

/**
 * Static method to create a new alert
 */
stockAlertSchema.statics.createAlert = function(data: Partial<IStockAlert>) {
  // Generate message if not provided
  if (!data.message) {
    const stockStatus = data.currentStock === 0 ? 'out of stock' : `low stock (${data.currentStock} remaining)`;
    data.message = `Product ${data.sku} is ${stockStatus}. Threshold: ${data.threshold}`;
  }
  
  // Set recommended action if not provided
  if (!data.recommendedAction) {
    switch (data.alertType) {
      case 'out_of_stock':
        data.recommendedAction = 'Restock immediately to prevent lost sales';
        break;
      case 'low_stock':
        data.recommendedAction = 'Consider restocking soon to avoid stockout';
        break;
      case 'high_demand':
        data.recommendedAction = 'Increase stock levels to meet demand';
        break;
      default:
        data.recommendedAction = 'Review inventory levels and take appropriate action';
    }
  }
  
  return this.create(data);
};

/**
 * Static method to auto-resolve alerts based on current stock
 */
stockAlertSchema.statics.autoResolveAlerts = async function(sku: string, currentStock: number): Promise<number> {
  const alerts = await this.find({
    sku: sku.toUpperCase(),
    status: 'active',
    autoResolve: true,
    autoResolveThreshold: { $lte: currentStock }
  });
  
  let resolvedCount = 0;
  for (const alert of alerts) {
    await alert.resolve('system', `Auto-resolved: stock level (${currentStock}) reached threshold (${alert.autoResolveThreshold})`);
    resolvedCount++;
  }
  
  return resolvedCount;
};

/**
 * Static method to cleanup old alerts
 */
stockAlertSchema.statics.cleanupOldAlerts = async function(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    status: { $in: ['resolved', 'dismissed'] },
    resolvedAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount || 0;
};

// Prevent model re-compilation during development
const StockAlert = (mongoose.models.StockAlert || 
  mongoose.model<IStockAlertDocument, IStockAlertModel>('StockAlert', stockAlertSchema)) as IStockAlertModel;

export default StockAlert;
export { StockAlert };