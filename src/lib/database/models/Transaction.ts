import mongoose, { Document, Schema, Model, Types } from 'mongoose';

/**
 * Transaction status enum
 */
export type TransactionStatus = 'pending' | 'successful' | 'failed' | 'cancelled' | 'refunded';

/**
 * Transaction type enum
 */
export type TransactionType = 'subscription' | 'upgrade' | 'downgrade' | 'renewal' | 'refund';

/**
 * Transaction interface matching the Mongoose schema
 */
export interface ITransaction {
  userId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  flutterwaveTransactionId: string;
  flutterwaveReference: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  description?: string;
  paymentMethod?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata: Record<string, any>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction document interface extending Mongoose Document
 */
export interface ITransactionDocument extends ITransaction, Document {
  isSuccessful(): boolean;
  isFailed(): boolean;
  isPending(): boolean;
  markAsSuccessful(processedAt?: Date): Promise<void>;
  markAsFailed(reason?: string): Promise<void>;
  refund(amount?: number): Promise<void>;
}

/**
 * Transaction model interface with static methods
 */
export interface ITransactionModel extends Model<ITransactionDocument> {
  findByUserId(userId: Types.ObjectId): Promise<ITransactionDocument[]>;
  findBySubscriptionId(subscriptionId: Types.ObjectId): Promise<ITransactionDocument[]>;
  findByFlutterwaveId(transactionId: string): Promise<ITransactionDocument | null>;
  findByReference(reference: string): Promise<ITransactionDocument | null>;
  findSuccessfulTransactions(): Promise<ITransactionDocument[]>;
  findFailedTransactions(): Promise<ITransactionDocument[]>;
  getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number>;
  getRevenueByPeriod(period: 'day' | 'week' | 'month' | 'year'): Promise<any[]>;
}

/**
 * Transaction schema definition with validation and middleware
 */
const transactionSchema = new Schema<ITransactionDocument, ITransactionModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  flutterwaveTransactionId: {
    type: String,
    required: [true, 'Flutterwave transaction ID is required'],
    unique: true,
    trim: true
  },
  flutterwaveReference: {
    type: String,
    required: [true, 'Flutterwave reference is required'],
    unique: true,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: {
      values: ['NGN', 'USD', 'GHS', 'KES', 'UGX', 'TZS'],
      message: 'Currency must be one of: NGN, USD, GHS, KES, UGX, TZS'
    },
    default: 'NGN'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'successful', 'failed', 'cancelled', 'refunded'],
      message: 'Status must be one of: pending, successful, failed, cancelled, refunded'
    },
    default: 'pending'
  },
  type: {
    type: String,
    enum: {
      values: ['subscription', 'upgrade', 'downgrade', 'renewal', 'refund'],
      message: 'Type must be one of: subscription, upgrade, downgrade, renewal, refund'
    },
    required: [true, 'Transaction type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  paymentMethod: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

/**
 * Instance method to check if transaction is successful
 * @returns boolean - Whether transaction is successful
 */
transactionSchema.methods.isSuccessful = function(): boolean {
  return this.status === 'successful';
};

/**
 * Instance method to check if transaction failed
 * @returns boolean - Whether transaction failed
 */
transactionSchema.methods.isFailed = function(): boolean {
  return this.status === 'failed';
};

/**
 * Instance method to check if transaction is pending
 * @returns boolean - Whether transaction is pending
 */
transactionSchema.methods.isPending = function(): boolean {
  return this.status === 'pending';
};

/**
 * Instance method to mark transaction as successful
 * @param processedAt - When the transaction was processed
 */
transactionSchema.methods.markAsSuccessful = async function(processedAt?: Date): Promise<void> {
  this.status = 'successful';
  this.processedAt = processedAt || new Date();
  await this.save();
};

/**
 * Instance method to mark transaction as failed
 * @param reason - Failure reason
 */
transactionSchema.methods.markAsFailed = async function(reason?: string): Promise<void> {
  this.status = 'failed';
  this.processedAt = new Date();
  if (reason) {
    this.metadata.failureReason = reason;
  }
  await this.save();
};

/**
 * Instance method to refund transaction
 * @param amount - Refund amount (defaults to full amount)
 */
transactionSchema.methods.refund = async function(amount?: number): Promise<void> {
  this.status = 'refunded';
  this.metadata.refundAmount = amount || this.amount;
  this.metadata.refundedAt = new Date();
  await this.save();
};

/**
 * Static method to find transactions by user ID
 * @param userId - User ID
 * @returns Promise<ITransactionDocument[]> - Array of user transactions
 */
transactionSchema.statics.findByUserId = function(userId: Types.ObjectId) {
  return this.find({ userId })
    .populate('subscriptionId')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find transactions by subscription ID
 * @param subscriptionId - Subscription ID
 * @returns Promise<ITransactionDocument[]> - Array of subscription transactions
 */
transactionSchema.statics.findBySubscriptionId = function(subscriptionId: Types.ObjectId) {
  return this.find({ subscriptionId })
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find transaction by Flutterwave ID
 * @param transactionId - Flutterwave transaction ID
 * @returns Promise<ITransactionDocument | null> - Transaction document or null
 */
transactionSchema.statics.findByFlutterwaveId = function(transactionId: string) {
  return this.findOne({ flutterwaveTransactionId: transactionId })
    .populate('userId', 'firstName lastName email')
    .populate('subscriptionId');
};

/**
 * Static method to find transaction by reference
 * @param reference - Flutterwave reference
 * @returns Promise<ITransactionDocument | null> - Transaction document or null
 */
transactionSchema.statics.findByReference = function(reference: string) {
  return this.findOne({ flutterwaveReference: reference })
    .populate('userId', 'firstName lastName email')
    .populate('subscriptionId');
};

/**
 * Static method to find successful transactions
 * @returns Promise<ITransactionDocument[]> - Array of successful transactions
 */
transactionSchema.statics.findSuccessfulTransactions = function() {
  return this.find({ status: 'successful' })
    .populate('userId', 'firstName lastName email')
    .populate('subscriptionId')
    .sort({ processedAt: -1 });
};

/**
 * Static method to find failed transactions
 * @returns Promise<ITransactionDocument[]> - Array of failed transactions
 */
transactionSchema.statics.findFailedTransactions = function() {
  return this.find({ status: 'failed' })
    .populate('userId', 'firstName lastName email')
    .populate('subscriptionId')
    .sort({ createdAt: -1 });
};

/**
 * Static method to get total revenue
 * @param startDate - Start date for revenue calculation
 * @param endDate - End date for revenue calculation
 * @returns Promise<number> - Total revenue
 */
transactionSchema.statics.getTotalRevenue = async function(startDate?: Date, endDate?: Date): Promise<number> {
  const matchConditions: any = { status: 'successful' };

  if (startDate || endDate) {
    matchConditions.processedAt = {};
    if (startDate) matchConditions.processedAt.$gte = startDate;
    if (endDate) matchConditions.processedAt.$lte = endDate;
  }

  const result = await this.aggregate([
    { $match: matchConditions },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result[0]?.total || 0;
};

/**
 * Static method to get revenue by period
 * @param period - Period for grouping (day, week, month, year)
 * @returns Promise<any[]> - Revenue data grouped by period
 */
transactionSchema.statics.getRevenueByPeriod = function(period: 'day' | 'week' | 'month' | 'year') {
  const groupBy: any = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$processedAt' } },
    week: { $dateToString: { format: '%Y-W%U', date: '$processedAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$processedAt' } },
    year: { $dateToString: { format: '%Y', date: '$processedAt' } }
  };

  return this.aggregate([
    { $match: { status: 'successful', processedAt: { $exists: true } } },
    {
      $group: {
        _id: groupBy[period],
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Prevent model re-compilation during development
const Transaction = (mongoose.models.Transaction || mongoose.model<ITransactionDocument, ITransactionModel>('Transaction', transactionSchema)) as ITransactionModel;

export default Transaction;
export { Transaction };
export type { ITransaction, ITransactionDocument, ITransactionModel };