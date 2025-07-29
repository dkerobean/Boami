import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Inventory Log interface for tracking all inventory changes
 * Provides complete audit trail for stock movements
 */
export interface IInventoryLog {
  productId?: string; // Reference to Product (for simple products)
  variantId?: string; // Reference to ProductVariant (for variable products)
  sku: string; // SKU for easy identification
  
  // Change details
  type: 'adjustment' | 'sale' | 'return' | 'damage' | 'restock' | 'reservation' | 'release' | 'import';
  quantityBefore: number;
  quantityChange: number; // Positive for increase, negative for decrease
  quantityAfter: number;
  
  // Reference information
  orderId?: string; // If related to an order
  importJobId?: string; // If related to a bulk import
  userId: string; // Who made the change
  reason?: string; // Optional reason for manual adjustments
  
  // Metadata
  source: 'manual' | 'order' | 'import' | 'api' | 'system' | 'wordpress_sync';
  location?: string; // Warehouse or location identifier
  batchNumber?: string; // For batch tracking
  
  // Additional context
  metadata?: {
    orderNumber?: string;
    customerEmail?: string;
    importBatch?: string;
    notes?: string;
    [key: string]: any;
  };
  
  createdAt: Date;
}

/**
 * Inventory Log document interface extending Mongoose Document
 */
export interface IInventoryLogDocument extends IInventoryLog, Document {
  getRelatedProduct(): Promise<any>;
  getRelatedVariant(): Promise<any>;
  isStockIncrease(): boolean;
  isStockDecrease(): boolean;
}

/**
 * Inventory Log model interface with static methods
 */
export interface IInventoryLogModel extends Model<IInventoryLogDocument> {
  findBySku(sku: string, limit?: number): Promise<IInventoryLogDocument[]>;
  findByProduct(productId: string, limit?: number): Promise<IInventoryLogDocument[]>;
  findByVariant(variantId: string, limit?: number): Promise<IInventoryLogDocument[]>;
  findByType(type: string, limit?: number): Promise<IInventoryLogDocument[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<IInventoryLogDocument[]>;
  findByUser(userId: string, limit?: number): Promise<IInventoryLogDocument[]>;
  createLog(data: Partial<IInventoryLog>): Promise<IInventoryLogDocument>;
  getInventoryReport(filters: any): Promise<any>;
}

/**
 * Inventory Log schema definition
 */
const inventoryLogSchema = new Schema<IInventoryLogDocument, IInventoryLogModel>({
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
    uppercase: true
  },
  
  type: {
    type: String,
    enum: ['adjustment', 'sale', 'return', 'damage', 'restock', 'reservation', 'release', 'import'],
    required: [true, 'Type is required'],
    index: true
  },
  quantityBefore: {
    type: Number,
    required: [true, 'Quantity before is required'],
    min: [0, 'Quantity before cannot be negative']
  },
  quantityChange: {
    type: Number,
    required: [true, 'Quantity change is required']
  },
  quantityAfter: {
    type: Number,
    required: [true, 'Quantity after is required'],
    min: [0, 'Quantity after cannot be negative']
  },
  
  orderId: {
    type: String,
    sparse: true
  },
  importJobId: {
    type: String,
    sparse: true
  },
  userId: {
    type: String,
    required: [true, 'User ID is required']
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  
  source: {
    type: String,
    enum: ['manual', 'order', 'import', 'api', 'system', 'wordpress_sync'],
    required: [true, 'Source is required'],
    index: true
  },
  location: {
    type: String,
    trim: true,
    default: 'default'
  },
  batchNumber: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
  toJSON: { 
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance
inventoryLogSchema.index({ sku: 1, createdAt: -1 });
inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ variantId: 1, createdAt: -1 });
inventoryLogSchema.index({ type: 1, createdAt: -1 });
inventoryLogSchema.index({ source: 1, createdAt: -1 });
inventoryLogSchema.index({ userId: 1, createdAt: -1 });
inventoryLogSchema.index({ orderId: 1 });
inventoryLogSchema.index({ importJobId: 1 });
inventoryLogSchema.index({ createdAt: -1 }); // For general date-based queries

// Compound indexes for common queries
inventoryLogSchema.index({ sku: 1, type: 1, createdAt: -1 });
inventoryLogSchema.index({ source: 1, type: 1, createdAt: -1 });

/**
 * Instance method to get related product
 */
inventoryLogSchema.methods.getRelatedProduct = async function() {
  if (this.productId) {
    const Product = mongoose.model('Product');
    return await Product.findById(this.productId);
  }
  return null;
};

/**
 * Instance method to get related variant
 */
inventoryLogSchema.methods.getRelatedVariant = async function() {
  if (this.variantId) {
    const ProductVariant = mongoose.model('ProductVariant');
    return await ProductVariant.findById(this.variantId);
  }
  return null;
};

/**
 * Instance method to check if this is a stock increase
 */
inventoryLogSchema.methods.isStockIncrease = function(): boolean {
  return this.quantityChange > 0;
};

/**
 * Instance method to check if this is a stock decrease
 */
inventoryLogSchema.methods.isStockDecrease = function(): boolean {
  return this.quantityChange < 0;
};

/**
 * Static method to find logs by SKU
 */
inventoryLogSchema.statics.findBySku = function(sku: string, limit: number = 50) {
  return this.find({ sku: sku.toUpperCase() })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find logs by product
 */
inventoryLogSchema.statics.findByProduct = function(productId: string, limit: number = 50) {
  return this.find({ productId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find logs by variant
 */
inventoryLogSchema.statics.findByVariant = function(variantId: string, limit: number = 50) {
  return this.find({ variantId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find logs by type
 */
inventoryLogSchema.statics.findByType = function(type: string, limit: number = 100) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find logs by date range
 */
inventoryLogSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

/**
 * Static method to find logs by user
 */
inventoryLogSchema.statics.findByUser = function(userId: string, limit: number = 100) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to create a new log entry
 */
inventoryLogSchema.statics.createLog = function(data: Partial<IInventoryLog>) {
  return this.create({
    ...data,
    createdAt: new Date()
  });
};

/**
 * Static method to generate inventory report
 */
inventoryLogSchema.statics.getInventoryReport = async function(filters: any = {}) {
  const pipeline = [];
  
  // Match stage based on filters
  const matchStage: any = {};
  if (filters.startDate && filters.endDate) {
    matchStage.createdAt = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }
  if (filters.type) {
    matchStage.type = filters.type;
  }
  if (filters.source) {
    matchStage.source = filters.source;
  }
  if (filters.sku) {
    matchStage.sku = filters.sku;
  }
  
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }
  
  // Group by type and calculate totals
  pipeline.push({
    $group: {
      _id: {
        type: '$type',
        source: '$source'
      },
      totalQuantityChange: { $sum: '$quantityChange' },
      totalTransactions: { $sum: 1 },
      avgQuantityChange: { $avg: '$quantityChange' },
      minDate: { $min: '$createdAt' },
      maxDate: { $max: '$createdAt' }
    }
  });
  
  // Sort by total transactions
  pipeline.push({
    $sort: { totalTransactions: -1 }
  });
  
  return await this.aggregate(pipeline as any);
};

// Prevent model re-compilation during development
const InventoryLog = (mongoose.models.InventoryLog || 
  mongoose.model<IInventoryLogDocument, IInventoryLogModel>('InventoryLog', inventoryLogSchema)) as IInventoryLogModel;

export default InventoryLog;
export { InventoryLog };