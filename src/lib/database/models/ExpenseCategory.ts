import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Expense Category interface for financial tracking system
 * Manages categorization of expense sources with user ownership
 */
export interface IExpenseCategory {
  name: string;
  description?: string;
  isDefault: boolean;
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Expense Category document interface extending Mongoose Document
 */
export interface IExpenseCategoryDocument extends IExpenseCategory, Document {
  isOwnedBy(userId: string): boolean;
}

/**
 * Expense Category model interface with static methods
 */
export interface IExpenseCategoryModel extends Model<IExpenseCategoryDocument> {
  findByUser(userId: string): Promise<IExpenseCategoryDocument[]>;
  findDefaultCategories(): Promise<IExpenseCategoryDocument[]>;
  findUserCategories(userId: string): Promise<IExpenseCategoryDocument[]>;
  createDefaultCategories(userId: string): Promise<IExpenseCategoryDocument[]>;
  findByNameAndUser(name: string, userId: string): Promise<IExpenseCategoryDocument | null>;
}

/**
 * Expense Category schema definition with validation and middleware
 */
const expenseCategorySchema = new Schema<IExpenseCategoryDocument, IExpenseCategoryModel>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: null
  },
  isDefault: {
    type: Boolean,
    default: false
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
      return ret;
    }
  }
});

// Compound index for user-specific category name uniqueness
expenseCategorySchema.index({ name: 1, userId: 1 }, { unique: true });

// Index for efficient user queries
expenseCategorySchema.index({ userId: 1, isDefault: 1 });

/**
 * Pre-save middleware to ensure category name uniqueness per user
 */
expenseCategorySchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isNew) {
    const existingCategory = await (this.constructor as IExpenseCategoryModel)
      .findByNameAndUser(this.name, this.userId);

    if (existingCategory && existingCategory._id?.toString() !== this._id?.toString()) {
      const error = new Error('Category name already exists for this user');
      return next(error);
    }
  }
  next();
});

/**
 * Instance method to check ownership
 */
expenseCategorySchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Static method to find all categories for a user (default + custom)
 */
expenseCategorySchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { userId: userId },
      { isDefault: true }
    ]
  }).sort({ isDefault: -1, name: 1 });
};

/**
 * Static method to find only default categories
 */
expenseCategorySchema.statics.findDefaultCategories = function() {
  return this.find({ isDefault: true }).sort({ name: 1 });
};

/**
 * Static method to find only user-created categories
 */
expenseCategorySchema.statics.findUserCategories = function(userId: string) {
  return this.find({
    userId: userId,
    isDefault: false
  }).sort({ name: 1 });
};

/**
 * Static method to find category by name and user
 */
expenseCategorySchema.statics.findByNameAndUser = function(name: string, userId: string) {
  return this.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    userId: userId
  });
};

/**
 * Static method to create default categories for a new user
 */
expenseCategorySchema.statics.createDefaultCategories = async function(userId: string) {
  const defaultCategories = [
    { name: 'Rent', description: 'Monthly rent payments' },
    { name: 'Utilities', description: 'Electricity, water, gas, internet' },
    { name: 'Advertising', description: 'Marketing and promotional expenses' },
    { name: 'Shipping', description: 'Shipping and delivery costs' },
    { name: 'Salaries', description: 'Employee wages and salaries' },
    { name: 'Equipment', description: 'Business equipment and tools' }
  ];

  const categories = [];
  for (const category of defaultCategories) {
    try {
      const newCategory = new this({
        ...category,
        userId: userId,
        isDefault: false // User-specific defaults, not global defaults
      });
      const savedCategory = await newCategory.save();
      categories.push(savedCategory);
    } catch (error) {
      // Skip if category already exists
      console.log(`Category ${category.name} already exists for user ${userId}`);
    }
  }

  return categories;
};

// Prevent model re-compilation during development
const ExpenseCategory = (mongoose.models.ExpenseCategory ||
  mongoose.model<IExpenseCategoryDocument, IExpenseCategoryModel>('ExpenseCategory', expenseCategorySchema)) as IExpenseCategoryModel;

export default ExpenseCategory;
export { ExpenseCategory };