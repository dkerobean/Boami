import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Product interface for e-commerce platform with WordPress integration
 * Enhanced with WooCommerce synchronization capabilities
 */
export interface IProduct {
  title: string;
  description: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  discount: number;
  salesPrice: number;
  sku?: string;
  category: string[];
  subcategory?: string[];
  brand?: string;
  gender?: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  virtual: boolean;
  downloadable: boolean;
  
  // Inventory management
  stock: boolean;
  qty: number;
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  manageStock: boolean;
  backordersAllowed: boolean;
  lowStockThreshold?: number;
  
  // Physical properties
  weight?: number;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  
  // Media and presentation
  photo: string;
  gallery?: string[];
  colors: string[];
  tags: string[];
  
  // Ratings and reviews
  rating: number;
  averageRating?: number;
  ratingCount?: number;
  reviewsAllowed: boolean;
  
  // Relations
  related: boolean;
  relatedIds?: string[];
  upsellIds?: string[];
  crossSellIds?: string[];
  variations?: string[]; // References to ProductVariation documents
  
  // SEO and metadata
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  
  // WordPress/WooCommerce integration
  wordpress?: {
    id: number;
    sourceUrl: string;
    slug: string;
    lastSync: Date;
    syncStatus: 'synced' | 'pending' | 'error' | 'never';
    errorMessage?: string;
    dateCreated: Date;
    dateModified: Date;
    totalSales: number;
  };
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Product document interface extending Mongoose Document
 */
export interface IProductDocument extends IProduct, Document {
  calculateDiscountPrice(): number;
  isInStock(): boolean;
  needsRestocking(): boolean;
  getWordPressUrl(): string | null;
  markAsSynced(): Promise<void>;
  markSyncError(error: string): Promise<void>;
}

/**
 * Product model interface with static methods
 */
export interface IProductModel extends Model<IProductDocument> {
  findByWordPressId(wpId: number): Promise<IProductDocument | null>;
  findBySku(sku: string): Promise<IProductDocument | null>;
  findWordPressProducts(): Promise<IProductDocument[]>;
  findOutOfStock(): Promise<IProductDocument[]>;
  findLowStock(): Promise<IProductDocument[]>;
  findPendingSync(): Promise<IProductDocument[]>;
}

/**
 * Product schema definition with validation and middleware
 */
const productSchema = new Schema<IProductDocument, IProductModel>({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [200, 'Product title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive']
  },
  regularPrice: {
    type: Number,
    min: [0, 'Regular price must be positive']
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price must be positive']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  salesPrice: {
    type: Number,
    min: [0, 'Sales price must be positive']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined values
    trim: true,
    uppercase: true,
    index: true
  },
  category: [{
    type: String,
    required: true,
    trim: true
  }],
  subcategory: [{
    type: String,
    trim: true
  }],
  brand: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unisex', 'kids'],
    default: 'unisex'
  },
  type: {
    type: String,
    enum: ['simple', 'variable', 'grouped', 'external'],
    default: 'simple'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'private', 'publish'],
    default: 'publish'
  },
  featured: {
    type: Boolean,
    default: false
  },
  virtual: {
    type: Boolean,
    default: false
  },
  downloadable: {
    type: Boolean,
    default: false
  },
  
  // Inventory fields
  stock: {
    type: Boolean,
    default: true
  },
  qty: {
    type: Number,
    default: 0,
    min: [0, 'Quantity cannot be negative']
  },
  stockStatus: {
    type: String,
    enum: ['instock', 'outofstock', 'onbackorder'],
    default: 'instock'
  },
  manageStock: {
    type: Boolean,
    default: true
  },
  backordersAllowed: {
    type: Boolean,
    default: false
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: [0, 'Low stock threshold cannot be negative']
  },
  
  // Physical properties
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: { type: String, default: '' },
    width: { type: String, default: '' },
    height: { type: String, default: '' }
  },
  
  // Media
  photo: {
    type: String,
    required: [true, 'Product photo is required']
  },
  gallery: [{
    type: String
  }],
  colors: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  
  // Ratings
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Average rating cannot be negative'],
    max: [5, 'Average rating cannot exceed 5']
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: [0, 'Rating count cannot be negative']
  },
  reviewsAllowed: {
    type: Boolean,
    default: true
  },
  
  // Relations
  related: {
    type: Boolean,
    default: false
  },
  relatedIds: [{
    type: String
  }],
  upsellIds: [{
    type: String
  }],
  crossSellIds: [{
    type: String
  }],
  variations: [{
    type: Schema.Types.ObjectId,
    ref: 'ProductVariation'
  }],
  
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    index: true
  },
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  // WordPress integration
  wordpress: {
    id: {
      type: Number,
      unique: true,
      sparse: true,
      index: true
    },
    sourceUrl: String,
    slug: String,
    lastSync: Date,
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'error', 'never'],
      default: 'never'
    },
    errorMessage: String,
    dateCreated: Date,
    dateModified: Date,
    totalSales: {
      type: Number,
      default: 0
    }
  },
  
  // Audit fields
  createdBy: String,
  updatedBy: String
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance - removed duplicates that are already in schema definitions
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ status: 1, featured: -1, createdAt: -1 });
productSchema.index({ 'wordpress.syncStatus': 1 });
productSchema.index({ stockStatus: 1, qty: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

/**
 * Pre-save middleware to generate slug from title if not provided
 */
productSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Update sales price based on discount
  if (this.discount > 0 && this.regularPrice) {
    this.salesPrice = this.regularPrice * (1 - this.discount / 100);
  } else {
    this.salesPrice = this.price;
  }
  
  // Update stock status based on quantity
  if (this.manageStock) {
    if (this.qty <= 0) {
      this.stockStatus = this.backordersAllowed ? 'onbackorder' : 'outofstock';
      this.stock = false;
    } else {
      this.stockStatus = 'instock';
      this.stock = true;
    }
  }
  
  next();
});

/**
 * Instance method to calculate discount price
 */
productSchema.methods.calculateDiscountPrice = function(): number {
  if (this.salePrice && this.salePrice < this.price) {
    return this.salePrice;
  }
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
};

/**
 * Instance method to check if product is in stock
 */
productSchema.methods.isInStock = function(): boolean {
  return this.stock && this.stockStatus === 'instock';
};

/**
 * Instance method to check if product needs restocking
 */
productSchema.methods.needsRestocking = function(): boolean {
  return this.manageStock && this.qty <= this.lowStockThreshold;
};

/**
 * Instance method to get WordPress URL
 */
productSchema.methods.getWordPressUrl = function(): string | null {
  if (this.wordpress?.sourceUrl && this.wordpress?.slug) {
    return `${this.wordpress.sourceUrl}/product/${this.wordpress.slug}`;
  }
  return null;
};

/**
 * Instance method to mark as synced with WordPress
 */
productSchema.methods.markAsSynced = async function(): Promise<void> {
  if (this.wordpress) {
    this.wordpress.syncStatus = 'synced';
    this.wordpress.lastSync = new Date();
    this.wordpress.errorMessage = undefined;
    await this.save();
  }
};

/**
 * Instance method to mark sync error
 */
productSchema.methods.markSyncError = async function(error: string): Promise<void> {
  if (this.wordpress) {
    this.wordpress.syncStatus = 'error';
    this.wordpress.errorMessage = error;
    this.wordpress.lastSync = new Date();
    await this.save();
  }
};

/**
 * Static method to find product by WordPress ID
 */
productSchema.statics.findByWordPressId = function(wpId: number) {
  return this.findOne({ 'wordpress.id': wpId });
};

/**
 * Static method to find product by SKU
 */
productSchema.statics.findBySku = function(sku: string) {
  return this.findOne({ sku: sku.toUpperCase() });
};

/**
 * Static method to find all WordPress-imported products
 */
productSchema.statics.findWordPressProducts = function() {
  return this.find({ 'wordpress.id': { $exists: true } })
    .sort({ 'wordpress.lastSync': -1 });
};

/**
 * Static method to find out of stock products
 */
productSchema.statics.findOutOfStock = function() {
  return this.find({ 
    stockStatus: 'outofstock',
    status: 'publish' 
  }).sort({ updatedAt: -1 });
};

/**
 * Static method to find low stock products
 */
productSchema.statics.findLowStock = function() {
  return this.find({
    manageStock: true,
    stockStatus: 'instock',
    $expr: { $lte: ['$qty', '$lowStockThreshold'] }
  }).sort({ qty: 1 });
};

/**
 * Static method to find products pending sync
 */
productSchema.statics.findPendingSync = function() {
  return this.find({ 
    'wordpress.syncStatus': 'pending' 
  }).sort({ 'wordpress.lastSync': 1 });
};

// Prevent model re-compilation during development
const Product = (mongoose.models.Product || 
  mongoose.model<IProductDocument, IProductModel>('Product', productSchema)) as IProductModel;

export default Product;
export { Product };