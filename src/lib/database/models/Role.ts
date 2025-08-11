import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { IPermissionDocument, IPermissionModel } from './Permission';

/**
 * Role interface defining the structure of roles
 */
export interface IRole {
  name: string;
  description: string;
  permissions: Types.ObjectId[]; // References to Permission documents
  isSystem: boolean; // Cannot be deleted if true
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role document interface extending Mongoose Document
 */
export interface IRoleDocument extends IRole, Document {
  hasPermission(resource: string, action: string): Promise<boolean>;
  getPermissions(): Promise<IPermissionDocument[]>;
  addPermission(permissionId: Types.ObjectId): Promise<void>;
  removePermission(permissionId: Types.ObjectId): Promise<void>;
}

/**
 * Role model interface with static methods
 */
export interface IRoleModel extends Model<IRoleDocument> {
  findByName(name: string): Promise<IRoleDocument | null>;
  findSystemRoles(): Promise<IRoleDocument[]>;
  findCustomRoles(): Promise<IRoleDocument[]>;
  createWithPermissions(name: string, description: string, permissionIds: Types.ObjectId[]): Promise<IRoleDocument>;
}

/**
 * Role schema definition
 */
const roleSchema = new Schema<IRoleDocument, IRoleModel>({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Role name cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters']
  },
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  }],
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
roleSchema.index({ isSystem: 1 });
roleSchema.index({ createdAt: -1 });

/**
 * Instance method to check if role has specific permission
 */
roleSchema.methods.hasPermission = async function(resource: string, action: string): Promise<boolean> {
  const Permission = mongoose.model('Permission') as IPermissionModel;
  
  console.log(`🔍 Role.hasPermission: Checking ${resource}.${action} for role: ${this.name}`);
  console.log(`📋 Role permissions IDs:`, this.permissions.map((p: Types.ObjectId) => p.toString()));
  
  // First check for exact match
  const exactPermission = await Permission.findByResourceAndAction(resource, action);
  console.log(`🎯 Exact permission ${resource}.${action} found:`, exactPermission ? `ID: ${exactPermission._id}` : 'Not found');
  
  if (exactPermission && this.permissions.some((permId: Types.ObjectId) =>
    permId.toString() === (exactPermission._id as any).toString()
  )) {
    console.log(`✅ Exact match found for ${resource}.${action}`);
    return true;
  }

  // Check for higher-level permissions that imply this action
  // Permission hierarchy: manage > create/read/update/delete > read
  const PERMISSION_HIERARCHY = {
    'manage': ['create', 'read', 'update', 'delete'],
    'update': ['read'],
    'delete': ['read'],
    'create': ['read']
  };

  console.log(`🔄 Checking hierarchy for ${resource}.${action}`);
  
  // Find permissions that imply the requested action
  for (const [higherAction, impliedActions] of Object.entries(PERMISSION_HIERARCHY)) {
    if (impliedActions.includes(action)) {
      console.log(`🎯 Checking if ${resource}.${higherAction} implies ${resource}.${action}`);
      const higherPermission = await Permission.findByResourceAndAction(resource, higherAction);
      console.log(`📝 Higher permission ${resource}.${higherAction} found:`, higherPermission ? `ID: ${higherPermission._id}` : 'Not found');
      
      if (higherPermission && this.permissions.some((permId: Types.ObjectId) =>
        permId.toString() === (higherPermission._id as any).toString()
      )) {
        console.log(`✅ Permission granted: ${resource}.${action} implied by ${resource}.${higherAction}`);
        return true;
      }
    }
  }

  console.log(`❌ Permission denied: ${resource}.${action} not found`);
  return false;
};

/**
 * Instance method to get all permissions for this role
 */
roleSchema.methods.getPermissions = async function(): Promise<IPermissionDocument[]> {
  const Permission = mongoose.model('Permission');
  return await Permission.find({ _id: { $in: this.permissions } });
};

/**
 * Instance method to add permission to role
 */
roleSchema.methods.addPermission = async function(permissionId: Types.ObjectId): Promise<void> {
  if (!this.permissions.includes(permissionId)) {
    this.permissions.push(permissionId);
    await this.save();
  }
};

/**
 * Instance method to remove permission from role
 */
roleSchema.methods.removePermission = async function(permissionId: Types.ObjectId): Promise<void> {
  this.permissions = this.permissions.filter(
    (permId: Types.ObjectId) => permId.toString() !== permissionId.toString()
  );
  await this.save();
};

/**
 * Static method to find role by name
 */
roleSchema.statics.findByName = function(name: string) {
  return this.findOne({ name: name.trim() });
};

/**
 * Static method to find system roles
 */
roleSchema.statics.findSystemRoles = function() {
  return this.find({ isSystem: true }).sort({ name: 1 });
};

/**
 * Static method to find custom roles
 */
roleSchema.statics.findCustomRoles = function() {
  return this.find({ isSystem: false }).sort({ name: 1 });
};

/**
 * Static method to create role with permissions
 */
roleSchema.statics.createWithPermissions = async function(
  name: string,
  description: string,
  permissionIds: Types.ObjectId[]
): Promise<IRoleDocument> {
  const role = new this({
    name: name.trim(),
    description: description.trim(),
    permissions: permissionIds,
    isSystem: false
  });

  return await role.save();
};

// Prevent model re-compilation during development
const Role = (mongoose.models.Role ||
  mongoose.model<IRoleDocument, IRoleModel>('Role', roleSchema)) as IRoleModel;

export default Role;
export { Role };