import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Expense interface for financial tracking system
 * Manages expense records with category and vendor relationships and user ownership
 */
export interface IExpense {
  amount: number;
  description: string;
  date: Date;
  categoryId?: string; // Reference to ExpenseCategory
  vendorId?: string; // Reference to Vendor
  isRecurring: boolean;
  recurringPaymentId?: string; // Reference to RecurringPayment
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Expense document interface extending Mongoose Document
 */
export interface IExpenseDocument extends IExpense, Document {
  isOwnedBy(userId: string): boolean;
  hasCategory(): boolean;
  hasVendor(): boolean;
  isFromRecurring(): boolean;
  getFormattedAmount(): string;
}

/**
 * Expense model interface with static methods
 */
export interface IExpenseModel extends Model<IExpenseDocument> {
  findByUser(userId: string, limit?: number): Promise<IExpenseDocument[]>;
  findByCategory(categoryId: string, userId: string): Promise<IExpenseDocument[]>;
  findByVendor(vendorId: string, userId: string): Promise<IExpenseDocument[]>;
  findByDateRange(startDate: Date, endDate: Date, userId: string): Promise<IExpenseDocument[]>;
  getTotalByUser(userId: string): Promise<number>;
  getTotalByCategory(categoryId: string, userId: string): Promise<number>;
  getTotalByVendor(vendorId: string, userId: string): Promise<number>;
  getTotalByDateRange(startDate: Date, endDate: Date, userId: string): Promise<number>;
  findRecurringExpenses(userId: string): Promise<IExpenseDocument[]>;
}

/**
 * Expense schema definition with validation and middleware
 */
const expenseSchema = new Schema<IExpenseDocument, IExpenseModel>({
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
    default: null
  },
  vendorId: {
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
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, categoryId: 1 });
expenseSchema.index({ userId: 1, vendorId: 1 });
expenseSchema.index({ userId: 1, isRecurring: 1 });

// Text index for search functionality
expenseSchema.index({ description: 'text' });

/**
 * Pre-save middleware for data validation and formatting
 */
expenseSchema.pre('save', function(next) {
  // Round amount to 2 decimal places
  this.amount = Math.round(this.amount * 100) / 100;

  // Set default date to current date if not provided
  if (!this.date) {
    this.date = new Date();
  }

  // Validate that at least category or vendor is provided
  if (!this.categoryId && !this.vendorId) {
    return next(new Error('Either category or vendor must be specified'));
  }

  next();
});

/**
 * Instance method to check ownership
 */
expenseSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to check if expense has category
 */
expenseSchema.methods.hasCategory = function(): boolean {
  return !!this.categoryId;
};

/**
 * Instance method to check if expense has vendor
 */
expenseSchema.methods.hasVendor = function(): boolean {
  return !!this.vendorId;
};

/**
 * Instance method to check if expense is from recurring payment
 */
expenseSchema.methods.isFromRecurring = function(): boolean {
  return this.isRecurring && !!this.recurringPaymentId;
};

/**
 * Instance method to get formatted amount
 */
expenseSchema.methods.getFormattedAmount = function(): string {
  return `$${this.amount.toFixed(2)}`;
};

/**
 * Static method to find expense records by user
 */
expenseSchema.statics.findByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId: userId })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to find expenses by category
 */
expenseSchema.statics.findByCategory = function(categoryId: string, userId: string) {
  return this.find({
    categoryId: categoryId,
    userId: userId
  }).sort({ date: -1 });
};

/**
 * Static method to find expenses by vendor
 */
expenseSchema.statics.findByVendor = function(vendorId: string, userId: string) {
  return this.find({
    vendorId: vendorId,
    userId: userId
  }).sort({ date: -1 });
};

/**
 * Static method to find expenses by date range
 */
expenseSchema.statics.findByDateRange = function(startDate: Date, endDate: Date, userId: string) {
  return this.find({
    userId: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

/**
 * Static method to get total expenses by user
 */
expenseSchema.statics.getTotalByUser = async function(userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total expenses by category
 */
expenseSchema.statics.getTotalByCategory = async function(categoryId: string, userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { categoryId: categoryId, userId: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total expenses by vendor
 */
expenseSchema.statics.getTotalByVendor = async function(vendorId: string, userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { vendorId: vendorId, userId: userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result.length > 0 ? Math.round(result[0].total * 100) / 100 : 0;
};

/**
 * Static method to get total expenses by date range
 */
expenseSchema.statics.getTotalByDateRange = async function(startDate: Date, endDate: Date, userId: string): Promise<number> {
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
 * Static method to find recurring expenses
 */
expenseSchema.statics.findRecurringExpenses = function(userId: string) {
  return this.find({
    userId: userId,
    isRecurring: true
  }).sort({ date: -1 });
};

// Prevent model re-compilation during development
const Expense = (mongoose.models.Expense ||
  mongoose.model<IExpenseDocument, IExpenseModel>('Expense', expenseSchema)) as IExpenseModel;

export default Expense;
export { Expense };