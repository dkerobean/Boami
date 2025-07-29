import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Sale interface for financial tracking system
 * Manages sales records with product relationships and inventory tracking
 */
export interface ISale {
  productId: string; // Reference to Product
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: Date;
  notes?: string;
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sale document interface extending Mongoose Document
 */
export interface ISaleDocument extends ISale, Document {
  isOwnedBy(userId: string): boolean;
  calculateTotal(): number;
  getFormattedTotal(): string;
  getFormattedUnitPrice(): string;
}

/**
 * Sale model interface with static methods
 */
export interface ISaleModel extends Model<ISaleDocument> {
  findByUser(userId: string, limit?: number): Promise<ISaleDocument[]>;
  findByProduct(productId: string, userId: string): Promise<ISaleDocument[]>;
  findByDateRange(startDate: Date, endDate: Date, userId: string): Promise<ISaleDocument[]>;
  getTotalSalesByUser(userId: string): Promise<number>;
  getTotalSalesByProduct(productId: string, userId: string): Promise<number>;
  getTotalSalesByDateRange(startDate: Date, endDate: Date, userId: string): Promise<number>;
  getQuantitySoldByProduct(productId: string, userId: string): Promise<number>;
  getSalesAnalytics(userId: string): Promise<any>;
}

/**
 * Sale schema definition with validation and middleware
 */
const saleSchema = new Schema<ISaleDocument, ISaleModel>({
  productId: {
    type: String,
    required: [true, 'Product ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value > 0;
      },
      message: 'Quantity must be a positive integer'
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0.01, 'Unit price must be greater than 0'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value > 0;
      },
      message: 'Unit price must be a valid positive number'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0.01, 'Total amount must be greater than 0']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(value: Date) {
        return value <= new Date();
      },
      message: 'Date cannot be in the future'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: null
  },
  userId: {
    type: String,
    required: [true, 'User ID is required']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      // Format monetary values to 2 decimal places
      ret.unitPrice = parseFloat(ret.unitPrice.toFixed(2));
      ret.totalAmount = parseFloat(ret.totalAmount.toFixed(2));
      return ret;
    }
  }
});

// Compound indexes for efficient queries
saleSchema.index({ userId: 1, date: -1 });
saleSchema.index({ userId: 1, productId: 1 });
saleSchema.index({ productId: 1, date: -1 });

// Text index for search functionality
saleSchema.index({ notes: 'text' });

/**
 * Pre-save middleware for data validation and calculation
 */
saleSchema.pre('save', function(next) {
  // Round monetary values to 2 decimal places
  this.unitPrice = Math.round(this.unitPrice * 100) / 100;

  // Calculate and validate total amount
  const calculatedTotal = Math.round(this.quantity * this.unitPrice * 100) / 100;

  // Allow small rounding differences (within 1 cent)
  if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
    this.totalAmount = calculatedTotal;
  }

  // Set default date to current date if not provided
  if (!this.date) {
    this.date = new Date();
  }

  next();
});

/**
 * Instance method to check ownership
 */
saleSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to calculate total amount
 */
saleSchema.methods.calculateTotal = function(): number {
  return Math.round(this.quantity * this.unitPrice * 100) / 100;
};

/**
 * Instance method to get formatted total amount
 */
saleSchema.methods.getFormattedTotal = function(): string {
  return `$${this.totalAmount.toFixed(2)}`;
};

/**
 * Instance method to get formatted unit price
 */
saleSchema.methods.getFormattedUnitPrice = function(): string {
  return `$${this.unitPrice.toFixed(2)}`;
};

/**
 * Static method to find sales by user
 */
saleSchema.statics.findByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId: userId })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find sales by product
 */
saleSchema.statics.findByProduct = function(productId: string, userId: string) {
  return this.find({
    productId: productId,
    userId: userId
  }).sort({ date: -1 });
};

/**
 * Static method to find sales by date range
 */
saleSchema.statics.findByDateRange = function(startDate: Date, endDate: Date, userId: string) {
  return this.find({
    userId: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

/**
 * Static method to get total sales amount by user
 */
saleSchema.statics.getTotalSalesByUser = async function(userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: userId } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total sales by product
 */
saleSchema.statics.getTotalSalesByProduct = async function(productId: string, userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { productId: productId, userId: userId } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total sales by date range
 */
saleSchema.statics.getTotalSalesByDateRange = async function(startDate: Date, endDate: Date, userId: string): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        userId: userId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get quantity sold by product
 */
saleSchema.statics.getQuantitySoldByProduct = async function(productId: string, userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { productId: productId, userId: userId } },
    { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
  ]);

  return result.length > 0 ? result[0].totalQuantity : 0;
};

/**
 * Static method to get sales analytics
 */
saleSchema.statics.getSalesAnalytics = async function(userId: string) {
  const analytics = await this.aggregate([
    { $match: { userId: userId } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalQuantity: { $sum: '$quantity' },
        averageSaleAmount: { $avg: '$totalAmount' },
        totalTransactions: { $sum: 1 }
      }
    }
  ]);

  if (analytics.length === 0) {
    return {
      totalSales: 0,
      totalQuantity: 0,
      averageSaleAmount: 0,
      totalTransactions: 0
    };
  }

  const result = analytics[0];
  return {
    totalSales: Math.round(result.totalSales * 100) / 100,
    totalQuantity: result.totalQuantity,
    averageSaleAmount: Math.round(result.averageSaleAmount * 100) / 100,
    totalTransactions: result.totalTransactions
  };
};

// Prevent model re-compilation during development
const Sale = (mongoose.models.Sale ||
  mongoose.model<ISaleDocument, ISaleModel>('Sale', saleSchema)) as ISaleModel;

export default Sale;
export { Sale };