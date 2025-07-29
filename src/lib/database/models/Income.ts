import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Income interface for financial tracking system
 * Manages income records with category relationships and user ownership
 */
export interface IIncome {
  amount: number;
  description: string;
  date: Date;
  categoryId: string; // Reference to IncomeCategory
  saleId?: string; // Optional reference to Sale
  isRecurring: boolean;
  recurringPaymentId?: string; // Reference to RecurringPayment
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Income document interface extending Mongoose Document
 */
export interface IIncomeDocument extends IIncome, Document {
  isOwnedBy(userId: string): boolean;
  isFromSale(): boolean;
  isFromRecurring(): boolean;
  getFormattedAmount(): string;
}

/**
 * Income model interface with static methods
 */
export interface IIncomeModel extends Model<IIncomeDocument> {
  findByUser(userId: string, limit?: number): Promise<IIncomeDocument[]>;
  findByCategory(categoryId: string, userId: string): Promise<IIncomeDocument[]>;
  findByDateRange(startDate: Date, endDate: Date, userId: string): Promise<IIncomeDocument[]>;
  getTotalByUser(userId: string): Promise<number>;
  getTotalByCategory(categoryId: string, userId: string): Promise<number>;
  getTotalByDateRange(startDate: Date, endDate: Date, userId: string): Promise<number>;
  findRecurringIncome(userId: string): Promise<IIncomeDocument[]>;
  findSalesIncome(userId: string): Promise<IIncomeDocument[]>;
}

/**
 * Income schema definition with validation and middleware
 */
const incomeSchema = new Schema<IIncomeDocument, IIncomeModel>({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value > 0;
      },
      message: 'Amount must be a valid positive number'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
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
  categoryId: {
    type: String,
    required: [true, 'Category ID is required']
  },
  saleId: {
    type: String,
    default: null
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPaymentId: {
    type: String,
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
      // Format amount to 2 decimal places
      ret.amount = parseFloat(ret.amount.toFixed(2));
      return ret;
    }
  }
});

// Compound indexes for efficient queries
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, categoryId: 1 });
incomeSchema.index({ userId: 1, isRecurring: 1 });
incomeSchema.index({ userId: 1, saleId: 1 });

// Text index for search functionality
incomeSchema.index({ description: 'text' });

/**
 * Pre-save middleware for data validation and formatting
 */
incomeSchema.pre('save', function(next) {
  // Round amount to 2 decimal places
  this.amount = Math.round(this.amount * 100) / 100;

  // Set default date to current date if not provided
  if (!this.date) {
    this.date = new Date();
  }

  next();
});

/**
 * Instance method to check ownership
 */
incomeSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to check if income is from a sale
 */
incomeSchema.methods.isFromSale = function(): boolean {
  return !!this.saleId;
};

/**
 * Instance method to check if income is from recurring payment
 */
incomeSchema.methods.isFromRecurring = function(): boolean {
  return this.isRecurring && !!this.recurringPaymentId;
};

/**
 * Instance method to get formatted amount
 */
incomeSchema.methods.getFormattedAmount = function(): string {
  return `$${this.amount.toFixed(2)}`;
};

/**
 * Static method to find income records by user
 */
incomeSchema.statics.findByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId: userId })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find income by category
 */
incomeSchema.statics.findByCategory = function(categoryId: string, userId: string) {
  return this.find({
    categoryId: categoryId,
    userId: userId
  }).sort({ date: -1 });
};

/**
 * Static method to find income by date range
 */
incomeSchema.statics.findByDateRange = function(startDate: Date, endDate: Date, userId: string) {
  return this.find({
    userId: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

/**
 * Static method to get total income by user
 */
incomeSchema.statics.getTotalByUser = async function(userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total income by category
 */
incomeSchema.statics.getTotalByCategory = async function(categoryId: string, userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { categoryId: categoryId, userId: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total income by date range
 */
incomeSchema.statics.getTotalByDateRange = async function(startDate: Date, endDate: Date, userId: string): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        userId: userId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to find recurring income
 */
incomeSchema.statics.findRecurringIncome = function(userId: string) {
  return this.find({
    userId: userId,
    isRecurring: true
  }).sort({ date: -1 });
};

/**
 * Static method to find sales-based income
 */
incomeSchema.statics.findSalesIncome = function(userId: string) {
  return this.find({
    userId: userId,
    saleId: { $ne: null }
  }).sort({ date: -1 });
};

// Prevent model re-compilation during development
const Income = (mongoose.models.Income ||
  mongoose.model<IIncomeDocument, IIncomeModel>('Income', incomeSchema)) as IIncomeModel;

export default Income;
export { Income };