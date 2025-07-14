import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Product Variant interface for handling product variations (size, color, etc.)
 * Each variant has its own pricing and inventory management
 */
export interface IProductVariant {
  productId: string; // Reference to parent product
  sku: string; // Unique SKU for this variant
  
  // Variant attributes (e.g., Color: Red, Size: Large)
  attributes: {
    name: string; // Attribute name (Color, Size, etc.)
    value: string; // Attribute value (Red, Large, etc.)
  }[];
  
  // Pricing specific to this variant
  pricing: {
    price: number;
    compareAtPrice?: number; // Original price for showing discounts
    costPrice?: number; // For profit calculations
    currency: string;
  };
  
  // Inventory specific to this variant
  inventory: {
    quantity: number;
    reserved: number; // Reserved for pending orders
    available: number; // quantity - reserved (calculated)
    lowStockThreshold: number;
    backordersAllowed: boolean;
  };
  
  // Media specific to variant
  images?: {
    url: string;
    alt: string;
    order: number;
  }[];
  
  // Variant status
  status: 'active' | 'inactive';
  isDefault: boolean; // Default variant for product
  
  // Physical properties (can override product defaults)
  weight?: number;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  
  // WordPress integration
  wordpress?: {
    id: number;
    lastSync: Date;
    syncStatus: 'synced' | 'pending' | 'error' | 'never';
    errorMessage?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product Variant document interface extending Mongoose Document
 */
export interface IProductVariantDocument extends IProductVariant, Document {
  updateAvailableQuantity(): void;
  isInStock(): boolean;
  needsRestocking(): boolean;
  reserveStock(quantity: number): Promise<boolean>;
  releaseStock(quantity: number): Promise<void>;
  adjustStock(quantity: number, reason: string): Promise<void>;
}

/**
 * Product Variant model interface with static methods
 */
export interface IProductVariantModel extends Model<IProductVariantDocument> {
  findByProductId(productId: string): Promise<IProductVariantDocument[]>;
  findBySku(sku: string): Promise<IProductVariantDocument | null>;
  findLowStock(): Promise<IProductVariantDocument[]>;
  findOutOfStock(): Promise<IProductVariantDocument[]>;
  findByAttributes(productId: string, attributes: { name: string; value: string }[]): Promise<IProductVariantDocument | null>;
}

/**
 * Product Variant schema definition
 */
const productVariantSchema = new Schema<IProductVariantDocument, IProductVariantModel>({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    ref: 'Product',
    index: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  
  attributes: [{
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      trim: true
    },
    value: {
      type: String,
      required: [true, 'Attribute value is required'],
      trim: true
    }
  }],
  
  pricing: {
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive']
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price must be positive']
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price must be positive']
    },
    currency: {
      type: String,
      default: 'USD',
      required: true
    }
  },
  
  inventory: {
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative']
    },
    available: {
      type: Number,
      default: 0,
      min: [0, 'Available quantity cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Low stock threshold cannot be negative']
    },
    backordersAllowed: {
      type: Boolean,
      default: false
    }
  },
  
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: { type: String, default: '' },
    width: { type: String, default: '' },
    height: { type: String, default: '' }
  },
  
  wordpress: {
    id: {
      type: Number,
      unique: true,
      sparse: true
    },
    lastSync: Date,
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'error', 'never'],
      default: 'never'
    },
    errorMessage: String
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

// Indexes for better query performance
productVariantSchema.index({ productId: 1, attributes: 1 });
productVariantSchema.index({ sku: 1 });
productVariantSchema.index({ 'inventory.quantity': 1 });
productVariantSchema.index({ productId: 1, isDefault: -1 });
productVariantSchema.index({ status: 1, 'inventory.quantity': 1 });

// Compound index for unique product + attributes combination
productVariantSchema.index({ productId: 1, 'attributes.name': 1, 'attributes.value': 1 }, { unique: true });

/**
 * Pre-save middleware to update available quantity
 */
productVariantSchema.pre('save', function(next) {
  this.updateAvailableQuantity();
  next();
});

/**
 * Instance method to update available quantity
 */
productVariantSchema.methods.updateAvailableQuantity = function(): void {
  this.inventory.available = Math.max(0, this.inventory.quantity - this.inventory.reserved);
};

/**
 * Instance method to check if variant is in stock
 */
productVariantSchema.methods.isInStock = function(): boolean {
  return this.status === 'active' && this.inventory.available > 0;
};

/**
 * Instance method to check if variant needs restocking
 */
productVariantSchema.methods.needsRestocking = function(): boolean {
  return this.inventory.quantity <= this.inventory.lowStockThreshold;
};

/**
 * Instance method to reserve stock
 */
productVariantSchema.methods.reserveStock = async function(quantity: number): Promise<boolean> {
  if (this.inventory.available >= quantity) {
    this.inventory.reserved += quantity;
    this.updateAvailableQuantity();
    await this.save();
    return true;
  }
  return false;
};

/**
 * Instance method to release reserved stock
 */
productVariantSchema.methods.releaseStock = async function(quantity: number): Promise<void> {
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  this.updateAvailableQuantity();
  await this.save();
};

/**
 * Instance method to adjust stock quantity
 */
productVariantSchema.methods.adjustStock = async function(quantity: number, reason: string): Promise<void> {
  const oldQuantity = this.inventory.quantity;
  this.inventory.quantity = Math.max(0, this.inventory.quantity + quantity);
  this.updateAvailableQuantity();
  
  // Log the inventory change (would need InventoryLog model)
  // await InventoryLog.create({
  //   variantId: this._id,
  //   sku: this.sku,
  //   type: 'adjustment',
  //   quantityBefore: oldQuantity,
  //   quantityChange: quantity,
  //   quantityAfter: this.inventory.quantity,
  //   reason: reason,
  //   source: 'manual'
  // });
  
  await this.save();
};

/**
 * Static method to find variants by product ID
 */
productVariantSchema.statics.findByProductId = function(productId: string) {
  return this.find({ productId }).sort({ isDefault: -1, createdAt: 1 });
};

/**
 * Static method to find variant by SKU
 */
productVariantSchema.statics.findBySku = function(sku: string) {
  return this.findOne({ sku: sku.toUpperCase() });
};

/**
 * Static method to find low stock variants
 */
productVariantSchema.statics.findLowStock = function() {
  return this.find({
    status: 'active',
    $expr: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] }
  }).sort({ 'inventory.quantity': 1 });
};

/**
 * Static method to find out of stock variants
 */
productVariantSchema.statics.findOutOfStock = function() {
  return this.find({
    status: 'active',
    'inventory.available': { $lte: 0 }
  }).sort({ updatedAt: -1 });
};

/**
 * Static method to find variant by attributes
 */
productVariantSchema.statics.findByAttributes = function(productId: string, attributes: { name: string; value: string }[]) {
  const query: any = { productId };
  
  // Build query for each attribute
  attributes.forEach((attr, index) => {
    query[`attributes.${index}.name`] = attr.name;
    query[`attributes.${index}.value`] = attr.value;
  });
  
  return this.findOne(query);
};

// Prevent model re-compilation during development
const ProductVariant = (mongoose.models.ProductVariant || 
  mongoose.model<IProductVariantDocument, IProductVariantModel>('ProductVariant', productVariantSchema)) as IProductVariantModel;

export default ProductVariant;
export { ProductVariant };