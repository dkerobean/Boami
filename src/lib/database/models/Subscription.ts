import mongoose, { Document, Schema, Model, Types } from 'mongoose';

/**
 * Subscription status enum
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due';

/**
 * Subscription interface matching the Mongoose schema
 */
export interface ISubscription {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  flutterwaveSubscriptionId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription document interface extending Mongoose Document
 */
export interface ISubscriptionDocument extends ISubscription, Document {
  isActive(): boolean;
  isExpired(): boolean;
  isPastDue(): boolean;
  daysUntilExpiry(): number;
  cancel(immediately?: boolean): Promise<void>;
  renew(periodEnd: Date): Promise<void>;
  upgrade(newPlanId: Types.ObjectId): Promise<void>;
  downgrade(newPlanId: Types.ObjectId): Promise<void>;
}

/**
 * Subscription model interface with static methods
 */
export interface ISubscriptionModel extends Model<ISubscriptionDocument> {
  findByUserId(userId: Types.ObjectId): Promise<ISubscriptionDocument | null>;
  findActiveSubscriptions(): Promise<ISubscriptionDocument[]>;
  findExpiredSubscriptions(): Promise<ISubscriptionDocument[]>;
  findExpiringSubscriptions(days: number): Promise<ISubscriptionDocument[]>;
  findByFlutterwaveId(flutterwaveId: string): Promise<ISubscriptionDocument | null>;
}

/**
 * Subscription schema definition with validation and middleware
 */
const subscriptionSchema = new Schema<ISubscriptionDocument, ISubscriptionModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: [true, 'Plan ID is required']
  },
  flutterwaveSubscriptionId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'cancelled', 'expired', 'pending', 'past_due'],
      message: 'Status must be one of: active, cancelled, expired, pending, past_due'
    },
    default: 'pending'
  },
  currentPeriodStart: {
    type: Date,
    required: [true, 'Current period start is required']
  },
  currentPeriodEnd: {
    type: Date,
    required: [true, 'Current period end is required']
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  trialEnd: {
    type: Date,
    default: null
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

// Ensure one active subscription per user
subscriptionSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

/**
 * Instance method to check if subscription is active
 * @returns boolean - Whether subscription is active
 */
subscriptionSchema.methods.isActive = function(): boolean {
  return this.status === 'active' && new Date() < this.currentPeriodEnd;
};

/**
 * Instance method to check if subscription is expired
 * @returns boolean - Whether subscription is expired
 */
subscriptionSchema.methods.isExpired = function(): boolean {
  return new Date() > this.currentPeriodEnd;
};

/**
 * Instance method to check if subscription is past due
 * @returns boolean - Whether subscription is past due
 */
subscriptionSchema.methods.isPastDue = function(): boolean {
  return this.status === 'past_due';
};

/**
 * Instance method to get days until expiry
 * @returns number - Days until expiry (negative if expired)
 */
subscriptionSchema.methods.daysUntilExpiry = function(): number {
  const now = new Date();
  const expiry = this.currentPeriodEnd;
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Instance method to cancel subscription
 * @param immediately - Whether to cancel immediately or at period end
 */
subscriptionSchema.methods.cancel = async function(immediately: boolean = false): Promise<void> {
  if (immediately) {
    this.status = 'cancelled';
    this.currentPeriodEnd = new Date();
  } else {
    this.cancelAtPeriodEnd = true;
  }
  await this.save();
};

/**
 * Instance method to renew subscription
 * @param periodEnd - New period end date
 */
subscriptionSchema.methods.renew = async function(periodEnd: Date): Promise<void> {
  this.status = 'active';
  this.currentPeriodStart = this.currentPeriodEnd;
  this.currentPeriodEnd = periodEnd;
  this.cancelAtPeriodEnd = false;
  await this.save();
};

/**
 * Instance method to upgrade subscription
 * @param newPlanId - New plan ID
 */
subscriptionSchema.methods.upgrade = async function(newPlanId: Types.ObjectId): Promise<void> {
  this.planId = newPlanId;
  this.metadata.lastUpgrade = new Date();
  await this.save();
};

/**
 * Instance method to downgrade subscription
 * @param newPlanId - New plan ID
 */
subscriptionSchema.methods.downgrade = async function(newPlanId: Types.ObjectId): Promise<void> {
  this.planId = newPlanId;
  this.metadata.lastDowngrade = new Date();
  await this.save();
};

/**
 * Static method to find subscription by user ID
 * @param userId - User ID
 * @returns Promise<ISubscriptionDocument | null> - Subscription document or null
 */
subscriptionSchema.statics.findByUserId = function(userId: Types.ObjectId) {
  return this.findOne({ userId }).populate('planId').populate('userId', 'firstName lastName email');
};

/**
 * Static method to find all active subscriptions
 * @returns Promise<ISubscriptionDocument[]> - Array of active subscriptions
 */
subscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({ status: 'active' })
    .populate('planId')
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find expired subscriptions
 * @returns Promise<ISubscriptionDocument[]> - Array of expired subscriptions
 */
subscriptionSchema.statics.findExpiredSubscriptions = function() {
  return this.find({
    currentPeriodEnd: { $lt: new Date() },
    status: { $in: ['active', 'past_due'] }
  }).populate('planId').populate('userId', 'firstName lastName email');
};

/**
 * Static method to find subscriptions expiring within specified days
 * @param days - Number of days to look ahead
 * @returns Promise<ISubscriptionDocument[]> - Array of expiring subscriptions
 */
subscriptionSchema.statics.findExpiringSubscriptions = function(days: number) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'active',
    currentPeriodEnd: { $lte: futureDate, $gt: new Date() }
  }).populate('planId').populate('userId', 'firstName lastName email');
};

/**
 * Static method to find subscription by Flutterwave ID
 * @param flutterwaveId - Flutterwave subscription ID
 * @returns Promise<ISubscriptionDocument | null> - Subscription document or null
 */
subscriptionSchema.statics.findByFlutterwaveId = function(flutterwaveId: string) {
  return this.findOne({ flutterwaveSubscriptionId: flutterwaveId })
    .populate('planId')
    .populate('userId', 'firstName lastName email');
};

// Pre-save middleware to update expired subscriptions
subscriptionSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Prevent model re-compilation during development
const Subscription = (mongoose.models.Subscription || mongoose.model<ISubscriptionDocument, ISubscriptionModel>('Subscription', subscriptionSchema)) as ISubscriptionModel;

export default Subscription;
export { Subscription };
export type { ISubscription, ISubscriptionDocument, ISubscriptionModel };