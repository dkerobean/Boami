import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Income Category interface for financial tracking system
 * Manages categorization of income sources with user ownership
 */
export interface IIncomeCategory {
  name: string;
  description?: string;
  isDefault: boolean;
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Income Category document interface extending Mongoose Document
 */
export interface IIncomeCategoryDocument extends IIncomeCategory, Document {
  isOwnedBy(userId: string): boolean;
}

/**
 * Income Category model interface with static methods
 */
export interface IIncomeCategoryModel extends Model<IIncomeCategoryDocument> {
  findByUser(userId: string): Promise<IIncomeCategoryDocument[]>;
  findDefaultCategories(): Promise<IIncomeCategoryDocument[]>;
  findUserCategories(userId: string): Promise<IIncomeCategoryDocument[]>;
  createDefaultCategories(userId: string): Promise<IIncomeCategoryDocument[]>;
  findByNameAndUser(name: string, userId: string): Promise<IIncomeCategoryDocument | null>;
}

/**
 * Income Category schema definition with validation and middleware
 */
const incomeCategorySchema = new Schema<IIncomeCategoryDocument, IIncomeCategoryModel>({
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
    required: [true, 'User ID is required'],
    index: true
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
incomeCategorySchema.index({ name: 1, userId: 1 }, { unique: true });

// Index for efficient user queries
incomeCategorySchema.index({ userId: 1, isDefault: 1 });

/**
 * Pre-save middleware to ensure category name uniqueness per user
 */
incomeCategorySchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isNew) {
    const existingCategory = await (this.constructor as IIncomeCategoryModel)
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
incomeCategorySchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Static method to find all categories for a user (default + custom)
 */
incomeCategorySchema.statics.findByUser = function(userId: string) {
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
incomeCategorySchema.statics.findDefaultCategories = function() {
  return this.find({ isDefault: true }).sort({ name: 1 });
};

/**
 * Static method to find only user-created categories
 */
incomeCategorySchema.statics.findUserCategories = function(userId: string) {
  return this.find({
    userId: userId,
    isDefault: false
  }).sort({ name: 1 });
};

/**
 * Static method to find category by name and user
 */
incomeCategorySchema.statics.findByNameAndUser = function(name: string, userId: string) {
  return this.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    userId: userId
  });
};

/**
 * Static method to create default categories for a new user
 */
incomeCategorySchema.statics.createDefaultCategories = async function(userId: string) {
  const defaultCategories = [
    { name: 'Product Sales', description: 'Revenue from product sales' },
    { name: 'Service Fees', description: 'Income from services provided' },
    { name: 'Commissions', description: 'Commission-based income' },
    { name: 'Other Income', description: 'Miscellaneous income sources' }
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
const IncomeCategory = (mongoose.models.IncomeCategory ||
  mongoose.model<IIncomeCategoryDocument, IIncomeCategoryModel>('IncomeCategory', incomeCategorySchema)) as IIncomeCategoryModel;

export default IncomeCategory;
export { IncomeCategory };