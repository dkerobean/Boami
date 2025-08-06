import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Permission interface defining the structure of permissions
 */
export interface IPermission {
  name: string;
  resource: string; // e.g., 'users', 'products', 'finance'
  action: string; // e.g., 'create', 'read', 'update', 'delete'
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission document interface extending Mongoose Document
 */
export interface IPermissionDocument extends IPermission, Document {}

/**
 * Permission model interface with static methods
 */
export interface IPermissionModel extends Model<IPermissionDocument> {
  findByResource(resource: string): Promise<IPermissionDocument[]>;
  findByAction(action: string): Promise<IPermissionDocument[]>;
  findByResourceAndAction(resource: string, action: string): Promise<IPermissionDocument | null>;
}

/**
 * Permission schema definition
 */
const permissionSchema = new Schema<IPermissionDocument, IPermissionModel>({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Permission name cannot exceed 100 characters']
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true,
    lowercase: true,
    maxlength: [50, 'Resource cannot exceed 50 characters']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    lowercase: true,
    enum: {
      values: ['create', 'read', 'update', 'delete', 'manage'],
      message: 'Action must be create, read, update, delete, or manage'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
permissionSchema.index({ resource: 1 });
permissionSchema.index({ action: 1 });
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

/**
 * Static method to find permissions by resource
 */
permissionSchema.statics.findByResource = function(resource: string) {
  return this.find({ resource: resource.toLowerCase() });
};

/**
 * Static method to find permissions by action
 */
permissionSchema.statics.findByAction = function(action: string) {
  return this.find({ action: action.toLowerCase() });
};

/**
 * Static method to find permission by resource and action
 */
permissionSchema.statics.findByResourceAndAction = function(resource: string, action: string) {
  return this.findOne({
    resource: resource.toLowerCase(),
    action: action.toLowerCase()
  });
};

// Prevent model re-compilation during development
const Permission = (mongoose.models.Permission ||
  mongoose.model<IPermissionDocument, IPermissionModel>('Permission', permissionSchema)) as IPermissionModel;

export default Permission;
export { Permission };