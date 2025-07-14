import mongoose, { Document, Schema, Model } from 'mongoose';
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
  role: 'admin' | 'user' | 'manager';
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
}

/**
 * User model interface with static methods
 */
export interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findActiveUsers(): Promise<IUserDocument[]>;
  findVerifiedUsers(): Promise<IUserDocument[]>;
  findUnverifiedUsers(): Promise<IUserDocument[]>;
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
    type: String,
    enum: {
      values: ['admin', 'user', 'manager'],
      message: 'Role must be admin, user, or manager'
    },
    default: 'user'
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
userSchema.index({ isActive: 1 });
userSchema.index({ isEmailVerified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1, isEmailVerified: 1 });

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
  return this.findOne({ email: email.toLowerCase() }).select('+password');
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

// Prevent model re-compilation during development
const User = (mongoose.models.User || mongoose.model<IUserDocument, IUserModel>('User', userSchema)) as IUserModel;

export default User;
export { User };