import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Product variant interface for size, color, etc.
 */
export interface IProductVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  stock: number;
  isActive: boolean;
}

/**
 * Product interface for e-commerce platform
 */
export interface IProduct {
  _id?: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  basePrice: number;
  variants: IProductVariant[];
  images: string[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  totalStock: number;
  rating: {
    average: number;
    count: number;
  };
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product document interface with instance methods
 */
export interface IProductDocument extends IProduct, Document {
  calculateTotalStock(): number;
  updateRating(newRating: number): Promise<void>;
  addVariant(variant: IProductVariant): Promise<void>;
  removeVariant(sku: string): Promise<void>;
}

/**
 * Product model interface with static methods
 */
export interface IProductModel extends Model<IProductDocument> {
  findByCategory(category: string): Promise<IProductDocument[]>;
  findFeatured(): Promise<IProductDocument[]>;
  findInStock(): Promise<IProductDocument[]>;
  searchProducts(query: string): Promise<IProductDocument[]>;
}

/**
 * Product variant schema
 */
const productVariantSchema = new Schema<IProductVariant>({
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  size: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Variant price is required'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * Main product schema definition
 */
const productSchema = new Schema<IProductDocument, IProductModel>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    lowercase: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Base price cannot be negative']
  },
  variants: {
    type: [productVariantSchema],
    validate: {
      validator: function(variants: IProductVariant[]) {
        return variants.length > 0;
      },
      message: 'At least one product variant is required'
    }
  },
  images: [{
    type: String,
    required: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  totalStock: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'variants.sku': 1 });

/**
 * Pre-save middleware to calculate total stock
 * Reason: Keep totalStock in sync with variant stocks for faster queries
 */
productSchema.pre('save', function(next) {
  this.totalStock = this.calculateTotalStock();
  next();
});

/**
 * Instance method to calculate total stock across all variants
 * @returns number - Total stock quantity
 */
productSchema.methods.calculateTotalStock = function(): number {
  return this.variants.reduce((total: number, variant: IProductVariant) => {
    return total + (variant.isActive ? variant.stock : 0);
  }, 0);
};

/**
 * Instance method to update product rating
 * @param newRating - New rating value (1-5)
 */
productSchema.methods.updateRating = async function(newRating: number): Promise<void> {
  const currentCount = this.rating.count;
  const currentAverage = this.rating.average;
  
  // Calculate new average using incremental formula
  const newCount = currentCount + 1;
  const newAverage = ((currentAverage * currentCount) + newRating) / newCount;
  
  this.rating.average = Math.round(newAverage * 10) / 10; // Round to 1 decimal
  this.rating.count = newCount;
  
  await this.save();
};

/**
 * Instance method to add a new variant
 * @param variant - New product variant to add
 */
productSchema.methods.addVariant = async function(variant: IProductVariant): Promise<void> {
  // Check if SKU already exists
  const existingVariant = this.variants.find((v: IProductVariant) => v.sku === variant.sku);
  if (existingVariant) {
    throw new Error(`Variant with SKU ${variant.sku} already exists`);
  }
  
  this.variants.push(variant);
  await this.save();
};

/**
 * Instance method to remove a variant by SKU
 * @param sku - SKU of the variant to remove
 */
productSchema.methods.removeVariant = async function(sku: string): Promise<void> {
  const variantIndex = this.variants.findIndex((v: IProductVariant) => v.sku === sku);
  if (variantIndex === -1) {
    throw new Error(`Variant with SKU ${sku} not found`);
  }
  
  this.variants.splice(variantIndex, 1);
  
  // Ensure at least one variant remains
  if (this.variants.length === 0) {
    throw new Error('Cannot remove last variant. Product must have at least one variant.');
  }
  
  await this.save();
};

/**
 * Static method to find products by category
 * @param category - Product category
 * @returns Promise<IProductDocument[]> - Products in the category
 */
productSchema.statics.findByCategory = function(category: string) {
  return this.find({ 
    category: category.toLowerCase(), 
    isActive: true 
  }).sort({ createdAt: -1 });
};

/**
 * Static method to find featured products
 * @returns Promise<IProductDocument[]> - Featured products
 */
productSchema.statics.findFeatured = function() {
  return this.find({ 
    isFeatured: true, 
    isActive: true 
  }).sort({ 'rating.average': -1 });
};

/**
 * Static method to find products in stock
 * @returns Promise<IProductDocument[]> - Products with available stock
 */
productSchema.statics.findInStock = function() {
  return this.find({ 
    totalStock: { $gt: 0 }, 
    isActive: true 
  }).sort({ totalStock: -1 });
};

/**
 * Static method to search products by text
 * @param query - Search query string
 * @returns Promise<IProductDocument[]> - Matching products
 */
productSchema.statics.searchProducts = function(query: string) {
  return this.find({
    $text: { $search: query },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

// Virtual for product URL slug
productSchema.virtual('slug').get(function() {
  return this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
});

// Prevent model re-compilation during development
const Product = (mongoose.models.Product || mongoose.model<IProductDocument, IProductModel>('Product', productSchema)) as IProductModel;

export default Product;