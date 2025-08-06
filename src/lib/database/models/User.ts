import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User interface matching the Mongoose schema
 * Enhanced with email verification fields for authentication system
 */
export interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  name: string; // Full name computed field
  designation?: string; // Job title/role designation
  role: Types.ObjectId; // Reference to Role document
  status: 'active' | 'pending' | 'disabled';
  invitedBy?: Types.ObjectId; // Reference to User who invited this user
  invitedAt?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  avatar?: string;
  profileImage?: string; // Profile image path/URL
  phone?: string;
  bio?: string;
  company?: string;
  department?: string;
  lastLogin?: Date;
  emailPreferences?: {
    subscriptionConfirmation: boolean;
    paymentNotifications: boolean;
    renewalReminders: boolean;
    cancellationNotifications: boolean;
    marketingEmails: boolean;
    securityAlerts: boolean;
  };
  subscription?: {
    active: boolean;
    subscriptionId?: string;
    planId?: string;
    status?: string;
    updatedAt?: Date;
    cancelledAt?: Date;
    cancelAtPeriodEnd?: boolean;
    renewedAt?: Date;
    expiredAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User document interface extending Mongoose Document
 * Includes instance methods that will be available on user documents
 */
export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
  toJSON(): Partial<IUser>;
  markEmailAsVerified(): Promise<void>;
  getSubscription(): Promise<any>;
  hasActiveSubscription(): Promise<boolean>;
  hasFeatureAccess(feature: string): Promise<boolean>;
  getRole(): Promise<any>;
  hasPermission(resource: string, action: string): Promise<boolean>;
  getUserPermissions(): Promise<any[]>;
}

/**
 * User model interface with static methods
 */
export interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findActiveUsers(): Promise<IUserDocument[]>;
  findVerifiedUsers(): Promise<IUserDocument[]>;
  findUnverifiedUsers(): Promise<IUserDocument[]>;
  findByRole(roleId: Types.ObjectId): Promise<IUserDocument[]>;
  findByStatus(status: 'active' | 'pending' | 'disabled'): Promise<IUserDocument[]>;
  createFromInvitation(email: string, roleId: Types.ObjectId, invitedBy: Types.ObjectId): Promise<IUserDocument>;
}

/**
 * User schema definition with validation and middleware
 * Enhanced for authentication system with email verification
 */
const userSchema = new Schema<IUserDocument, IUserModel>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role is required']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'pending', 'disabled'],
      message: 'Status must be active, pending, or disabled'
    },
    default: 'pending'
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  invitedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters'],
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ],
    default: null
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: null
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    default: null
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters'],
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  emailPreferences: {
    subscriptionConfirmation: {
      type: Boolean,
      default: true
    },
    paymentNotifications: {
      type: Boolean,
      default: true
    },
    renewalReminders: {
      type: Boolean,
      default: true
    },
    cancellationNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: true
    },
    securityAlerts: {
      type: Boolean,
      default: true
    }
  },
  subscription: {
    active: {
      type: Boolean,
      default: false
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'past_due'],
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    renewedAt: {
      type: Date,
      default: null
    },
    expiredAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete (ret as any).password;
      delete (ret as any).__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual field for full name
userSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isEmailVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1, isEmailVerified: 1 });
userSchema.index({ invitedBy: 1 });
userSchema.index({ status: 1, role: 1 });

/**
 * Pre-save middleware to hash passwords
 * Reason: Always hash passwords before saving to database for security
 */
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Instance method to compare passwords
 * @param candidatePassword - Plain text password to compare
 * @returns Promise<boolean> - Whether passwords match
 */
userSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Instance method to get full name
 * @returns string - User's full name
 */
userSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Instance method to mark email as verified
 * @returns Promise<void>
 */
userSchema.methods.markEmailAsVerified = async function(): Promise<void> {
  this.isEmailVerified = true;
  this.emailVerifiedAt = new Date();
  await this.save();
};

/**
 * Static method to find user by email
 * @param email - User's email address
 * @returns Promise<IUserDocument | null> - User document or null
 */
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('role', 'name');
};

/**
 * Static method to find all active users
 * @returns Promise<IUserDocument[]> - Array of active user documents
 */
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

/**
 * Static method to find all verified users
 * @returns Promise<IUserDocument[]> - Array of verified user documents
 */
userSchema.statics.findVerifiedUsers = function() {
  return this.find({ isEmailVerified: true, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Static method to find all unverified users
 * @returns Promise<IUserDocument[]> - Array of unverified user documents
 */
userSchema.statics.findUnverifiedUsers = function() {
  return this.find({ isEmailVerified: false, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Static method to find users by role
 * @param roleId - Role ObjectId
 * @returns Promise<IUserDocument[]> - Array of users with the specified role
 */
userSchema.statics.findByRole = function(roleId: Types.ObjectId) {
  return this.find({ role: roleId }).populate('role').sort({ createdAt: -1 });
};

/**
 * Static method to find users by status
 * @param status - User status
 * @returns Promise<IUserDocument[]> - Array of users with the specified status
 */
userSchema.statics.findByStatus = function(status: 'active' | 'pending' | 'disabled') {
  return this.find({ status }).populate('role').sort({ createdAt: -1 });
};

/**
 * Static method to create user from invitation
 * @param email - User's email
 * @param roleId - Role ObjectId
 * @param invitedBy - ObjectId of user who sent invitation
 * @returns Promise<IUserDocument> - Created user document
 */
userSchema.statics.createFromInvitation = async function(
  email: string,
  roleId: Types.ObjectId,
  invitedBy: Types.ObjectId
): Promise<IUserDocument> {
  const user = new this({
    email: email.toLowerCase(),
    role: roleId,
    status: 'pending',
    invitedBy,
    invitedAt: new Date(),
    isActive: true,
    isEmailVerified: false,
    firstName: '',
    lastName: '',
    password: '' // Will be set during invitation acceptance
  });

  return await user.save();
};

/**
 * Instance method to get user's subscription
 * @returns Promise<any> - User's subscription or null
 */
userSchema.methods.getSubscription = async function(): Promise<any> {
  const Subscription = mongoose.model('Subscription');
  return await Subscription.findOne({ userId: this._id, isActive: true });
};

/**
 * Instance method to check if user has active subscription
 * @returns Promise<boolean> - Whether user has active subscription
 */
userSchema.methods.hasActiveSubscription = async function(): Promise<boolean> {
  const subscription = await this.getSubscription();
  return subscription?.isActive || false;
};

/**
 * Instance method to check if user has access to a specific feature
 * @param feature - Feature name to check
 * @returns Promise<boolean> - Whether user has access to the feature
 */
userSchema.methods.hasFeatureAccess = async function(feature: string): Promise<boolean> {
  const subscription = await this.getSubscription();
  if (!subscription || !subscription.isActive()) {
    return false;
  }

  const Plan = mongoose.model('Plan');
  const plan = await Plan.findById(subscription.planId);
  return plan?.hasFeature(feature) || false;
};

/**
 * Instance method to get user's role
 * @returns Promise<any> - User's role document
 */
userSchema.methods.getRole = async function(): Promise<any> {
  const Role = mongoose.model('Role');
  return await Role.findById(this.role).populate('permissions');
};

/**
 * Instance method to check if user has specific permission
 * @param resource - Resource name (e.g., 'users', 'products')
 * @param action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns Promise<boolean> - Whether user has the permission
 */
userSchema.methods.hasPermission = async function(resource: string, action: string): Promise<boolean> {
  if (this.status !== 'active') return false;

  const role = await this.getRole();
  if (!role) return false;

  return await role.hasPermission(resource, action);
};

/**
 * Instance method to get all user permissions
 * @returns Promise<any[]> - Array of user's permissions
 */
userSchema.methods.getUserPermissions = async function(): Promise<any[]> {
  const role = await this.getRole();
  if (!role) return [];

  return await role.getPermissions();
};

// Prevent model re-compilation during development
const User = (mongoose.models.User || mongoose.model<IUserDocument, IUserModel>('User', userSchema)) as IUserModel;

export default User;
export { User };