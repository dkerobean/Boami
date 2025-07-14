import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Email verification codes tracking interface
 * Used for email verification and password reset flows
 */
export interface IVerificationCode {
  userId: string;
  code: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * VerificationCode document interface extending Mongoose Document
 * Includes instance methods that will be available on verification code documents
 */
export interface IVerificationCodeDocument extends IVerificationCode, Document {
  isExpired(): boolean;
  canAttempt(): boolean;
  incrementAttempts(): Promise<void>;
  markAsUsed(): Promise<void>;
}

/**
 * VerificationCode model interface with static methods
 */
export interface IVerificationCodeModel extends Model<IVerificationCodeDocument> {
  findValidCode(userId: string, code: string, type: string): Promise<IVerificationCodeDocument | null>;
  findActiveCodeForUser(userId: string, type: string): Promise<IVerificationCodeDocument | null>;
  createVerificationCode(userId: string, code: string, type: string): Promise<IVerificationCodeDocument>;
  cleanupExpiredCodes(): Promise<void>;
}

/**
 * VerificationCode schema definition with validation and middleware
 * Tracks email verification codes with expiration and rate limiting
 */
const verificationCodeSchema = new Schema<IVerificationCodeDocument, IVerificationCodeModel>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  code: {
    type: String,
    required: [true, 'Verification code is required'],
    length: [4, 'Verification code must be exactly 4 digits'],
    match: [/^\d{4}$/, 'Verification code must be 4 digits']
  },
  type: {
    type: String,
    required: [true, 'Verification type is required'],
    enum: {
      values: ['email_verification', 'password_reset'],
      message: 'Type must be email_verification or password_reset'
    }
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  },
  attempts: {
    type: Number,
    default: 0,
    min: [0, 'Attempts cannot be negative']
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Max attempts must be at least 1']
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance and automatic cleanup
verificationCodeSchema.index({ userId: 1 });
verificationCodeSchema.index({ userId: 1, type: 1 });
verificationCodeSchema.index({ userId: 1, code: 1, type: 1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
verificationCodeSchema.index({ isUsed: 1 });
verificationCodeSchema.index({ createdAt: -1 });

/**
 * Instance method to check if code is expired
 * @returns boolean - Whether the code has expired
 */
verificationCodeSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

/**
 * Instance method to check if more attempts are allowed
 * @returns boolean - Whether more attempts are allowed
 */
verificationCodeSchema.methods.canAttempt = function(): boolean {
  return this.attempts < this.maxAttempts && !this.isUsed && !this.isExpired();
};

/**
 * Instance method to increment attempt count
 * @returns Promise<void>
 */
verificationCodeSchema.methods.incrementAttempts = async function(): Promise<void> {
  this.attempts += 1;
  
  // Mark as used if max attempts reached
  if (this.attempts >= this.maxAttempts) {
    this.isUsed = true;
  }
  
  await this.save();
};

/**
 * Instance method to mark code as used
 * @returns Promise<void>
 */
verificationCodeSchema.methods.markAsUsed = async function(): Promise<void> {
  this.isUsed = true;
  await this.save();
};

/**
 * Static method to find a valid verification code
 * @param userId - User's ID
 * @param code - Verification code
 * @param type - Type of verification
 * @returns Promise<IVerificationCodeDocument | null> - Valid code or null
 */
verificationCodeSchema.statics.findValidCode = function(
  userId: string, 
  code: string, 
  type: string
): Promise<IVerificationCodeDocument | null> {
  return this.findOne({
    userId,
    code,
    type,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Static method to find active code for user
 * @param userId - User's ID
 * @param type - Type of verification
 * @returns Promise<IVerificationCodeDocument | null> - Active code or null
 */
verificationCodeSchema.statics.findActiveCodeForUser = function(
  userId: string, 
  type: string
): Promise<IVerificationCodeDocument | null> {
  return this.findOne({
    userId,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

/**
 * Static method to create a new verification code
 * Invalidates any existing active codes for the same user and type
 * @param userId - User's ID
 * @param code - Verification code
 * @param type - Type of verification
 * @returns Promise<IVerificationCodeDocument> - Created verification code
 */
verificationCodeSchema.statics.createVerificationCode = async function(
  userId: string, 
  code: string, 
  type: string
): Promise<IVerificationCodeDocument> {
  // Mark any existing active codes as used
  await this.updateMany(
    {
      userId,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    },
    {
      $set: { isUsed: true }
    }
  );

  // Create new verification code
  return this.create({
    userId,
    code,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    attempts: 0,
    maxAttempts: 3,
    isUsed: false
  });
};

/**
 * Static method to cleanup expired codes
 * @returns Promise<void>
 */
verificationCodeSchema.statics.cleanupExpiredCodes = async function(): Promise<void> {
  await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete used codes older than 24 hours
    ]
  });
};

// Pre-save middleware to validate expiration time
verificationCodeSchema.pre('save', function(next) {
  // Ensure expiration is in the future
  if (this.isNew && this.expiresAt <= new Date()) {
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Default to 5 minutes
  }
  next();
});

// Prevent model re-compilation during development
const VerificationCode = (mongoose.models.VerificationCode || 
  mongoose.model<IVerificationCodeDocument, IVerificationCodeModel>('VerificationCode', verificationCodeSchema)) as IVerificationCodeModel;

export default VerificationCode;
export { VerificationCode };