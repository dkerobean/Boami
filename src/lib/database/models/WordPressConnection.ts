import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * WordPress Connection interface for storing WooCommerce API configurations
 * Handles multiple WordPress/WooCommerce sites with secure credential storage
 */
export interface IWordPressConnection {
  name: string;
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version: string;
  isWooCommerce: boolean;
  isActive: boolean;
  lastTestDate?: Date;
  lastSyncDate?: Date;
  testResult?: {
    success: boolean;
    message: string;
    responseTime?: number;
    testedAt: Date;
  };
  syncSettings: {
    autoSync: boolean;
    syncInterval: number; // in minutes
    syncCategories: boolean;
    syncImages: boolean;
    syncVariations: boolean;
    importOnlyPublished: boolean;
    updateExisting: boolean;
    lastAutoSync?: Date;
  };
  importStats: {
    totalProducts: number;
    lastImportCount: number;
    lastImportDate?: Date;
    totalSynced: number;
    totalErrors: number;
  };
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * WordPress Connection document interface extending Mongoose Document
 */
export interface IWordPressConnectionDocument extends IWordPressConnection, Document {
  testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }>;
  getApiUrl(endpoint?: string): string;
  updateTestResult(result: { success: boolean; message: string; responseTime?: number }): Promise<void>;
  updateSyncStats(stats: { imported: number; synced: number; errors: number }): Promise<void>;
  isReadyForSync(): boolean;
}

/**
 * WordPress Connection model interface with static methods
 */
export interface IWordPressConnectionModel extends Model<IWordPressConnectionDocument> {
  findActiveConnections(): Promise<IWordPressConnectionDocument[]>;
  findByUrl(siteUrl: string): Promise<IWordPressConnectionDocument | null>;
  findReadyForAutoSync(): Promise<IWordPressConnectionDocument[]>;
}

/**
 * WordPress Connection schema definition
 */
const wordPressConnectionSchema = new Schema<IWordPressConnectionDocument, IWordPressConnectionModel>({
  name: {
    type: String,
    required: [true, 'Connection name is required'],
    trim: true,
    maxlength: [100, 'Connection name cannot exceed 100 characters']
  },
  siteUrl: {
    type: String,
    required: [true, 'Site URL is required'],
    trim: true,
    unique: true,
    validate: {
      validator: function(url: string) {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please enter a valid URL'
    }
  },
  consumerKey: {
    type: String,
    required: [true, 'Consumer key is required'],
    trim: true,
    select: false // Don't include in queries by default for security
  },
  consumerSecret: {
    type: String,
    required: [true, 'Consumer secret is required'],
    trim: true,
    select: false // Don't include in queries by default for security
  },
  version: {
    type: String,
    default: 'wc/v3',
    enum: ['wc/v3', 'wc/v2', 'wc/v1', 'wp/v2'],
    required: true
  },
  isWooCommerce: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTestDate: Date,
  lastSyncDate: Date,
  testResult: {
    success: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'Not tested'
    },
    responseTime: Number,
    testedAt: Date
  },
  syncSettings: {
    autoSync: {
      type: Boolean,
      default: false
    },
    syncInterval: {
      type: Number,
      default: 60, // 1 hour in minutes
      min: [5, 'Sync interval cannot be less than 5 minutes'],
      max: [1440, 'Sync interval cannot exceed 24 hours']
    },
    syncCategories: {
      type: Boolean,
      default: true
    },
    syncImages: {
      type: Boolean,
      default: true
    },
    syncVariations: {
      type: Boolean,
      default: true
    },
    importOnlyPublished: {
      type: Boolean,
      default: true
    },
    updateExisting: {
      type: Boolean,
      default: true
    },
    lastAutoSync: Date
  },
  importStats: {
    totalProducts: {
      type: Number,
      default: 0,
      min: [0, 'Total products cannot be negative']
    },
    lastImportCount: {
      type: Number,
      default: 0,
      min: [0, 'Last import count cannot be negative']
    },
    lastImportDate: Date,
    totalSynced: {
      type: Number,
      default: 0,
      min: [0, 'Total synced cannot be negative']
    },
    totalErrors: {
      type: Number,
      default: 0,
      min: [0, 'Total errors cannot be negative']
    }
  },
  createdBy: {
    type: String,
    required: [true, 'Created by user ID is required']
  },
  updatedBy: String
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete (ret as any).__v;
      delete (ret as any).consumerKey;
      delete (ret as any).consumerSecret;
      return ret;
    }
  }
});

// Indexes for better query performance
wordPressConnectionSchema.index({ siteUrl: 1 });
wordPressConnectionSchema.index({ isActive: 1, 'syncSettings.autoSync': 1 });
wordPressConnectionSchema.index({ 'testResult.success': 1, isActive: 1 });
wordPressConnectionSchema.index({ createdBy: 1 });
wordPressConnectionSchema.index({ 'syncSettings.lastAutoSync': 1 });

/**
 * Instance method to test WordPress/WooCommerce connection
 */
wordPressConnectionSchema.methods.testConnection = async function(): Promise<{ success: boolean; message: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    // This would typically make an actual API call to WordPress/WooCommerce
    // For now, we'll simulate the test
    const testUrl = this.getApiUrl('products');
    
    // TODO: Implement actual HTTP request to test the connection
    // const response = await fetch(testUrl, {
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')}`
    //   }
    // });
    
    const responseTime = Date.now() - startTime;
    
    // Simulated success for now
    const result = {
      success: true,
      message: 'Connection successful',
      responseTime
    };
    
    await this.updateTestResult(result);
    return result;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const result = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime
    };
    
    await this.updateTestResult(result);
    return result;
  }
};

/**
 * Instance method to get API URL for endpoints
 */
wordPressConnectionSchema.methods.getApiUrl = function(endpoint: string = ''): string {
  const baseUrl = this.siteUrl.replace(/\/$/, ''); // Remove trailing slash
  const apiPath = this.isWooCommerce ? `/wp-json/${this.version}` : '/wp-json/wp/v2';
  return `${baseUrl}${apiPath}/${endpoint}`.replace(/\/+$/, ''); // Remove trailing slashes
};

/**
 * Instance method to update test result
 */
wordPressConnectionSchema.methods.updateTestResult = async function(result: { success: boolean; message: string; responseTime?: number }): Promise<void> {
  this.testResult = {
    ...result,
    testedAt: new Date()
  };
  this.lastTestDate = new Date();
  await this.save();
};

/**
 * Instance method to update sync statistics
 */
wordPressConnectionSchema.methods.updateSyncStats = async function(stats: { imported: number; synced: number; errors: number }): Promise<void> {
  this.importStats.lastImportCount = stats.imported;
  this.importStats.lastImportDate = new Date();
  this.importStats.totalProducts += stats.imported;
  this.importStats.totalSynced += stats.synced;
  this.importStats.totalErrors += stats.errors;
  this.lastSyncDate = new Date();
  
  if (this.syncSettings.autoSync) {
    this.syncSettings.lastAutoSync = new Date();
  }
  
  await this.save();
};

/**
 * Instance method to check if connection is ready for sync
 */
wordPressConnectionSchema.methods.isReadyForSync = function(): boolean {
  return this.isActive && 
         this.testResult?.success === true &&
         (this.lastTestDate && (Date.now() - this.lastTestDate.getTime()) < 24 * 60 * 60 * 1000); // Tested within 24 hours
};

/**
 * Static method to find active connections
 */
wordPressConnectionSchema.statics.findActiveConnections = function() {
  return this.find({ isActive: true })
    .select('+consumerKey +consumerSecret') // Include credentials for API calls
    .sort({ name: 1 });
};

/**
 * Static method to find connection by URL
 */
wordPressConnectionSchema.statics.findByUrl = function(siteUrl: string) {
  return this.findOne({ siteUrl: siteUrl.replace(/\/$/, '') });
};

/**
 * Static method to find connections ready for auto-sync
 */
wordPressConnectionSchema.statics.findReadyForAutoSync = function() {
  const now = new Date();
  
  return this.find({
    isActive: true,
    'syncSettings.autoSync': true,
    'testResult.success': true,
    $or: [
      { 'syncSettings.lastAutoSync': { $exists: false } },
      {
        'syncSettings.lastAutoSync': {
          $lte: new Date(now.getTime() - 5 * 60 * 1000) // At least 5 minutes ago
        }
      }
    ]
  }).select('+consumerKey +consumerSecret');
};

// Prevent model re-compilation during development
const WordPressConnection = (mongoose.models.WordPressConnection || 
  mongoose.model<IWordPressConnectionDocument, IWordPressConnectionModel>('WordPressConnection', wordPressConnectionSchema)) as IWordPressConnectionModel;

export default WordPressConnection;
export { WordPressConnection };