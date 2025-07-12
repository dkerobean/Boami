import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User interface matching the Mongoose schema
 * Always define TypeScript interfaces that match Mongoose schemas
 */
export interface IUser {
  _id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'manager';
  isActive: boolean;
  avatar?: string;
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
}

/**
 * User model interface with static methods
 */
export interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findActiveUsers(): Promise<IUserDocument[]>;
}

/**
 * User schema definition with validation and middleware
 * Follows MongoDB best practices for e-commerce applications
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
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

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

// Prevent model re-compilation during development
const User = (mongoose.models.User || mongoose.model<IUserDocument, IUserModel>('User', userSchema)) as IUserModel;

export default User;