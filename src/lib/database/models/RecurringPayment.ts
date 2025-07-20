import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Recurring Payment interface for financial tracking system
 * Manages automated recurring income and expense payments
 */
export interface IRecurringPayment {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextDueDate: Date;
  isActive: boolean;
  categoryId?: string; // Reference to IncomeCategory or ExpenseCategory
  vendorId?: string; // Reference to Vendor (for expenses)
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recurring Payment document interface extending Mongoose Document
 */
export interface IRecurringPaymentDocument extends IRecurringPayment, Document {
  isOwnedBy(userId: string): boolean;
  isDue(): boolean;
  isExpired(): boolean;
  calculateNextDueDate(): Date;
  updateNextDueDate(): Promise<void>;
  getFormattedAmount(): string;
  getFrequencyText(): string;
}

/**
 * Recurring Payment model interface with static methods
 */
export interface IRecurringPaymentModel extends Model<IRecurringPaymentDocument> {
  findByUser(userId: string): Promise<IRecurringPaymentDocument[]>;
  findActiveByUser(userId: string): Promise<IRecurringPaymentDocument[]>;
  findDuePayments(userId?: string): Promise<IRecurringPaymentDocument[]>;
  findByType(type: 'income' | 'expense', userId: string): Promise<IRecurringPaymentDocument[]>;
  findByCategory(categoryId: string, userId: string): Promise<IRecurringPaymentDocument[]>;
  findByVendor(vendorId: string, userId: string): Promise<IRecurringPaymentDocument[]>;
}

/**
 * Recurring Payment schema definition with validation and middleware
 */
const recurringPaymentSchema = new Schema<IRecurringPaymentDocument, IRecurringPaymentModel>({
  type: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: {
      values: ['income', 'expense'],
      message: 'Type must be either income or expense'
    }
  },
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
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: {
      values: ['daily', 'weekly', 'monthly', 'yearly'],
      message: 'Frequency must be daily, weekly, monthly, or yearly'
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(value: Date | null) {
        if (value && this.startDate) {
          return value > this.startDate;
        }
        return true;
      },
      message: 'End date must be after start date'
    }
  },
  nextDueDate: {
    type: Date,
    required: [true, 'Next due date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  categoryId: {
    type: String,
    default: null,
    index: true
  },
  vendorId: {
    type: String,
    default: null,
    index: true,
    validate: {
      validator: function(value: string | null) {
        // Vendor is only allowed for expenses
        if (value && this.type !== 'expense') {
          return false;
        }
        return true;
      },
      message: 'Vendor can only be specified for expense payments'
    }
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
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
recurringPaymentSchema.index({ userId: 1, type: 1 });
recurringPaymentSchema.index({ userId: 1, isActive: 1 });
recurringPaymentSchema.index({ nextDueDate: 1, isActive: 1 });
recurringPaymentSchema.index({ userId: 1, categoryId: 1 });
recurringPaymentSchema.index({ userId: 1, vendorId: 1 });

// Text index for search functionality
recurringPaymentSchema.index({ description: 'text' });

/**
 * Pre-save middleware for data validation and calculation
 */
recurringPaymentSchema.pre('save', function(next) {
  // Round amount to 2 decimal places
  this.amount = Math.round(this.amount * 100) / 100;

  // Calculate next due date if not provided or if start date changed
  if (!this.nextDueDate || this.isModified('startDate') || this.isModified('frequency')) {
    this.nextDueDate = this.calculateNextDueDate();
  }

  // Validate category/vendor requirements
  if (this.type === 'expense' && !this.categoryId && !this.vendorId) {
    return next(new Error('Expense payments must have either a category or vendor'));
  }

  if (this.type === 'income' && !this.categoryId) {
    return next(new Error('Income payments must have a category'));
  }

  next();
});

/**
 * Instance method to check ownership
 */
recurringPaymentSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to check if payment is due
 */
recurringPaymentSchema.methods.isDue = function(): boolean {
  return this.isActive && this.nextDueDate <= new Date();
};

/**
 * Instance method to check if payment is expired
 */
recurringPaymentSchema.methods.isExpired = function(): boolean {
  return this.endDate ? this.endDate < new Date() : false;
};

/**
 * Instance method to calculate next due date
 */
recurringPaymentSchema.methods.calculateNextDueDate = function(): Date {
  const baseDate = this.nextDueDate || this.startDate;
  const nextDate = new Date(baseDate);

  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};

/**
 * Instance method to update next due date
 */
recurringPaymentSchema.methods.updateNextDueDate = async function(): Promise<void> {
  this.nextDueDate = this.calculateNextDueDate();
  await this.save();
};

/**
 * Instance method to get formatted amount
 */
recurringPaymentSchema.methods.getFormattedAmount = function(): string {
  return `$${this.amount.toFixed(2)}`;
};

/**
 * Instance method to get frequency text
 */
recurringPaymentSchema.methods.getFrequencyText = function(): string {
  const frequencyMap: { [key: string]: string } = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly'
  };
  return frequencyMap[this.frequency] || 'Unknown';
};

/**
 * Static method to find recurring payments by user
 */
recurringPaymentSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId: userId }).sort({ nextDueDate: 1 });
};

/**
 * Static method to find active recurring payments by user
 */
recurringPaymentSchema.statics.findActiveByUser = function(userId: string) {
  return this.find({
    userId: userId,
    isActive: true
  }).sort({ nextDueDate: 1 });
};

/**
 * Static method to find due payments
 */
recurringPaymentSchema.statics.findDuePayments = function(userId?: string) {
  const query: any = {
    isActive: true,
    nextDueDate: { $lte: new Date() }
  };

  if (userId) {
    query.userId = userId;
  }

  return this.find(query).sort({ nextDueDate: 1 });
};

/**
 * Static method to find payments by type
 */
recurringPaymentSchema.statics.findByType = function(type: 'income' | 'expense', userId: string) {
  return this.find({
    type: type,
    userId: userId
  }).sort({ nextDueDate: 1 });
};

/**
 * Static method to find payments by category
 */
recurringPaymentSchema.statics.findByCategory = function(categoryId: string, userId: string) {
  return this.find({
    categoryId: categoryId,
    userId: userId
  }).sort({ nextDueDate: 1 });
};

/**
 * Static method to find payments by vendor
 */
recurringPaymentSchema.statics.findByVendor = function(vendorId: string, userId: string) {
  return this.find({
    vendorId: vendorId,
    userId: userId
  }).sort({ nextDueDate: 1 });
};

// Prevent model re-compilation during development
const RecurringPayment = (mongoose.models.RecurringPayment ||
  mongoose.model<IRecurringPaymentDocument, IRecurringPaymentModel>('RecurringPayment', recurringPaymentSchema)) as IRecurringPaymentModel;

export default RecurringPayment;
export { RecurringPayment };