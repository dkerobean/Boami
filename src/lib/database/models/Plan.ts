import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Feature configuration interface for subscription plans
 * Allows flexible feature control without code changes
 */
export interface IFeatureConfig {
  [featureName: string]: {
    enabled: boolean;
    limit?: number;
    description: string;
  };
}

/**
 * Plan interface matching the Mongoose schema
 * Defines subscription plan structure with configurable features
 */
export interface IPlan {
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  currency: string;
  features: IFeatureConfig;
  flutterwavePlanId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plan document interface extending Mongoose Document
 */
export interface IPlanDocument extends IPlan, Document {
  hasFeature(featureName: string): boolean;
  getFeatureLimit(featureName: string): number | null;
  getMonthlyPrice(): number;
  getAnnualPrice(): number;
  getAnnualDiscount(): number;
}

/**
 * Plan model interface with static methods
 */
export interface IPlanModel extends Model<IPlanDocument> {
  findActivePlans(): Promise<IPlanDocument[]>;
  findByName(name: string): Promise<IPlanDocument | null>;
  findByFlutterwavePlanId(planId: string): Promise<IPlanDocument | null>;
}

/**
 * Plan schema definition with validation and middleware
 */
const planSchema = new Schema<IPlanDocument, IPlanModel>({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Plan name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    trim: true,
    maxlength: [500, 'Plan description cannot exceed 500 characters']
  },
  price: {
    monthly: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: [0, 'Monthly price cannot be negative']
    },
    annual: {
      type: Number,
      required: [true, 'Annual price is required'],
      min: [0, 'Annual price cannot be negative']
    }
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
  features: {
    type: Schema.Types.Mixed,
    required: [true, 'Features configuration is required'],
    default: {}
  },
  flutterwavePlanId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Sort order cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
planSchema.index({ isActive: 1, sortOrder: 1 });
planSchema.index({ name: 1 });
planSchema.index({ flutterwavePlanId: 1 });

/**
 * Instance method to check if plan has a specific feature
 * @param featureName - Name of the feature to check
 * @returns boolean - Whether the feature is enabled
 */
planSchema.methods.hasFeature = function(featureName: string): boolean {
  return this.features[featureName]?.enabled === true;
};

/**
 * Instance method to get feature limit
 * @param featureName - Name of the feature
 * @returns number | null - Feature limit or null if no limit
 */
planSchema.methods.getFeatureLimit = function(featureName: string): number | null {
  const feature = this.features[featureName];
  return feature?.limit || null;
};

/**
 * Instance method to get monthly price
 * @returns number - Monthly price
 */
planSchema.methods.getMonthlyPrice = function(): number {
  return this.price.monthly;
};

/**
 * Instance method to get annual price
 * @returns number - Annual price
 */
planSchema.methods.getAnnualPrice = function(): number {
  return this.price.annual;
};

/**
 * Instance method to calculate annual discount percentage
 * @returns number - Discount percentage
 */
planSchema.methods.getAnnualDiscount = function(): number {
  const monthlyTotal = this.price.monthly * 12;
  const annualPrice = this.price.annual;
  return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
};

/**
 * Static method to find all active plans
 * @returns Promise<IPlanDocument[]> - Array of active plans sorted by sortOrder
 */
planSchema.statics.findActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

/**
 * Static method to find plan by name
 * @param name - Plan name
 * @returns Promise<IPlanDocument | null> - Plan document or null
 */
planSchema.statics.findByName = function(name: string) {
  return this.findOne({ name, isActive: true });
};

/**
 * Static method to find plan by Flutterwave plan ID
 * @param planId - Flutterwave plan ID
 * @returns Promise<IPlanDocument | null> - Plan document or null
 */
planSchema.statics.findByFlutterwavePlanId = function(planId: string) {
  return this.findOne({ flutterwavePlanId: planId, isActive: true });
};

// Prevent model re-compilation during development
const Plan = (mongoose.models.Plan || mongoose.model<IPlanDocument, IPlanModel>('Plan', planSchema)) as IPlanModel;

export default Plan;
export { Plan };