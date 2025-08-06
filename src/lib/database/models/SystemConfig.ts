import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * System Configuration interface
 */
export interface ISystemConfig extends Document {
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Static methods interface
 */
export interface ISystemConfigStatics {
  getConfig(key: string): Promise<any>;
  setConfig(key: string, value: any, description?: string): Promise<ISystemConfig>;
  isRBACSeeded(): Promise<boolean>;
  markRBACSeeded(): Promise<void>;
}

/**
 * System Configuration model interface
 */
export interface ISystemConfigModel extends Model<ISystemConfig>, ISystemConfigStatics {}

/**
 * System Configuration Schema
 */
const SystemConfigSchema = new Schema<ISystemConfig>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Update the updatedAt field before saving
 */
SystemConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Static method to get config value by key
 */
SystemConfigSchema.statics.getConfig = async function(key: string) {
  const config = await this.findOne({ key });
  return config ? config.value : null;
};

/**
 * Static method to set config value
 */
SystemConfigSchema.statics.setConfig = async function(key: string, value: any, description?: string) {
  return await this.findOneAndUpdate(
    { key },
    { value, description, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

/**
 * Static method to check if RBAC is seeded
 */
SystemConfigSchema.statics.isRBACSeeded = async function(): Promise<boolean> {
  const config = await (this as ISystemConfigModel).getConfig('rbac_seeded');
  return config === true;
};

/**
 * Static method to mark RBAC as seeded
 */
SystemConfigSchema.statics.markRBACSeeded = async function(): Promise<void> {
  await (this as ISystemConfigModel).setConfig('rbac_seeded', true, 'RBAC system has been initialized');
};

const SystemConfig = (mongoose.models.SystemConfig || mongoose.model<ISystemConfig, ISystemConfigModel>('SystemConfig', SystemConfigSchema)) as ISystemConfigModel;

export default SystemConfig;