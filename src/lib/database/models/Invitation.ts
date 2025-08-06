import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import crypto from 'crypto';

/**
 * Invitation interface defining the structure of invitations
 */
export interface IInvitation {
  email: string;
  role: Types.ObjectId; // Reference to Role
  token: string;
  invitedBy: Types.ObjectId; // Reference to User who sent invitation
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invitation document interface extending Mongoose Document
 */
export interface IInvitationDocument extends IInvitation, Document {
  isExpired(): boolean;
  markAsAccepted(): Promise<void>;
  markAsExpired(): Promise<void>;
  generateNewToken(): Promise<void>;
}

/**
 * Invitation model interface with static methods
 */
export interface IInvitationModel extends Model<IInvitationDocument> {
  findByToken(token: string): Promise<IInvitationDocument | null>;
  findByEmail(email: string): Promise<IInvitationDocument | null>;
  findPendingInvitations(): Promise<IInvitationDocument[]>;
  findExpiredInvitations(): Promise<IInvitationDocument[]>;
  createInvitation(email: string, roleId: Types.ObjectId, invitedBy: Types.ObjectId): Promise<IInvitationDocument>;
  cleanupExpiredInvitations(): Promise<number>;
}

/**
 * Invitation schema definition
 */
const invitationSchema = new Schema<IInvitationDocument, IInvitationModel>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  role: {
    type: Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role is required']
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'InvitedBy is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'ExpiresAt is required'],
    index: true
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'expired'],
      message: 'Status must be pending, accepted, or expired'
    },
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
invitationSchema.index({ email: 1 });
invitationSchema.index({ email: 1, status: 1 });

/**
 * Instance method to check if invitation is expired
 */
invitationSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt || this.status === 'expired';
};

/**
 * Instance method to mark invitation as accepted
 */
invitationSchema.methods.markAsAccepted = async function(): Promise<void> {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  await this.save();
};

/**
 * Instance method to mark invitation as expired
 */
invitationSchema.methods.markAsExpired = async function(): Promise<void> {
  this.status = 'expired';
  await this.save();
};

/**
 * Instance method to generate new token
 */
invitationSchema.methods.generateNewToken = async function(): Promise<void> {
  this.token = crypto.randomBytes(32).toString('hex');
  this.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
  this.status = 'pending';
  await this.save();
};

/**
 * Static method to find invitation by token
 */
invitationSchema.statics.findByToken = function(token: string) {
  return this.findOne({ token }).populate('role').populate('invitedBy', 'firstName lastName email');
};

/**
 * Static method to find invitation by email
 */
invitationSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() }).populate('role').populate('invitedBy', 'firstName lastName email');
};

/**
 * Static method to find pending invitations
 */
invitationSchema.statics.findPendingInvitations = function() {
  return this.find({ status: 'pending' })
    .populate('role')
    .populate('invitedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find expired invitations
 */
invitationSchema.statics.findExpiredInvitations = function() {
  return this.find({
    $or: [
      { status: 'expired' },
      { expiresAt: { $lt: new Date() } }
    ]
  }).populate('role').populate('invitedBy', 'firstName lastName email');
};

/**
 * Static method to create new invitation
 */
invitationSchema.statics.createInvitation = async function(
  email: string,
  roleId: Types.ObjectId,
  invitedBy: Types.ObjectId
): Promise<IInvitationDocument> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

  const invitation = new this({
    email: email.toLowerCase(),
    role: roleId,
    token,
    invitedBy,
    expiresAt,
    status: 'pending'
  });

  return await invitation.save();
};

/**
 * Static method to cleanup expired invitations
 */
invitationSchema.statics.cleanupExpiredInvitations = async function(): Promise<number> {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );

  return result.modifiedCount;
};

// Pre-save middleware to auto-expire invitations
invitationSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// Prevent model re-compilation during development
const Invitation = (mongoose.models.Invitation ||
  mongoose.model<IInvitationDocument, IInvitationModel>('Invitation', invitationSchema)) as IInvitationModel;

export default Invitation;
export { Invitation };