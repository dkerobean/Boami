import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Vendor interface for financial tracking system
 * Manages vendor information with user ownership
 */
export interface IVendor {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  userId: string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vendor document interface extending Mongoose Document
 */
export interface IVendorDocument extends IVendor, Document {
  isOwnedBy(userId: string): boolean;
  getContactInfo(): { email?: string; phone?: string; address?: string };
}

/**
 * Vendor model interface with static methods
 */
export interface IVendorModel extends Model<IVendorDocument> {
  findByUser(userId: string): Promise<IVendorDocument[]>;
  findByNameAndUser(name: string, userId: string): Promise<IVendorDocument | null>;
  searchByName(query: string, userId: string): Promise<IVendorDocument[]>;
}

/**
 * Vendor schema definition with validation and middleware
 */
const vendorSchema = new Schema<IVendorDocument, IVendorModel>({
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    maxlength: [200, 'Vendor name cannot exceed 200 characters']
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ],
    default: null
  },
  contactPhone: {
    type: String,
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ],
    default: null
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters'],
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
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
      return ret;
    }
  }
});

// Compound index for user-specific vendor name uniqueness
vendorSchema.index({ name: 1, userId: 1 }, { unique: true });

// Index for efficient user queries
vendorSchema.index({ userId: 1 });

// Text index for search functionality
vendorSchema.index({ name: 'text', contactEmail: 'text', notes: 'text' });

/**
 * Pre-save middleware to ensure vendor name uniqueness per user
 */
vendorSchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isNew) {
    const existingVendor = await (this.constructor as IVendorModel)
      .findByNameAndUser(this.name, this.userId);

    if (existingVendor && existingVendor._id?.toString() !== this._id?.toString()) {
      const error = new Error('Vendor name already exists for this user');
      return next(error);
    }
  }
  next();
});

/**
 * Instance method to check ownership
 */
vendorSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to get contact information
 */
vendorSchema.methods.getContactInfo = function(): { email?: string; phone?: string; address?: string } {
  return {
    email: this.contactEmail || undefined,
    phone: this.contactPhone || undefined,
    address: this.address || undefined
  };
};

/**
 * Static method to find all vendors for a user
 */
vendorSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId: userId }).sort({ name: 1 });
};

/**
 * Static method to find vendor by name and user
 */
vendorSchema.statics.findByNameAndUser = function(name: string, userId: string) {
  return this.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    userId: userId
  });
};

/**
 * Static method to search vendors by name
 */
vendorSchema.statics.searchByName = function(query: string, userId: string) {
  return this.find({
    userId: userId,
    name: { $regex: new RegExp(query, 'i') }
  }).sort({ name: 1 }).limit(10);
};

// Prevent model re-compilation during development
const Vendor = (mongoose.models.Vendor ||
  mongoose.model<IVendorDocument, IVendorModel>('Vendor', vendorSchema)) as IVendorModel;

export default Vendor;
export { Vendor };