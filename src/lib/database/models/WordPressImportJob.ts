import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * WordPress Import Job interface for tracking product import operations
 * Handles progress tracking, error logging, and job status management
 */
export interface IWordPressImportJob {
  connectionId: string; // Reference to WordPressConnection
  jobId: string; // Unique job identifier
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Progress tracking
  progress: {
    total: number;
    processed: number;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    currentStep: string;
    percentage: number;
  };
  
  // Import configuration
  filters: {
    categories?: string[];
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    includeVariations: boolean;
    includeImages: boolean;
    updateExisting: boolean;
    pageSize: number;
  };
  
  // Results and logging
  results: {
    newProducts: string[]; // Product IDs created
    updatedProducts: string[]; // Product IDs updated
    skippedProducts: string[]; // Product IDs skipped
    failedProducts: {
      wordpressId: number;
      sku?: string;
      name: string;
      error: string;
    }[];
  };
  
  // Error tracking
  importErrors: {
    timestamp: Date;
    level: 'warning' | 'error' | 'critical';
    message: string;
    productId?: number;
    context?: any;
  }[];
  
  // Timing information
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
  averageProcessingTime?: number;
  
  // Metadata
  triggeredBy: 'manual' | 'auto' | 'schedule';
  userId: string; // User who triggered the import
  notes?: string;
  retryCount: number;
  maxRetries: number;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WordPress Import Job document interface extending Mongoose Document
 */
export interface IWordPressImportJobDocument extends IWordPressImportJob, Document {
  updateProgress(update: Partial<IWordPressImportJob['progress']>): Promise<void>;
  addError(error: { level: 'warning' | 'error' | 'critical'; message: string; productId?: number; context?: any }): Promise<void>;
  markCompleted(): Promise<void>;
  markFailed(error: string): Promise<void>;
  canRetry(): boolean;
  getElapsedTime(): number;
  getEstimatedTimeRemaining(): number;
  calculateProgress(): void;
}

/**
 * WordPress Import Job model interface with static methods
 */
export interface IWordPressImportJobModel extends Model<IWordPressImportJobDocument> {
  findActiveJobs(): Promise<IWordPressImportJobDocument[]>;
  findByJobId(jobId: string): Promise<IWordPressImportJobDocument | null>;
  findRecentJobs(limit?: number): Promise<IWordPressImportJobDocument[]>;
  findFailedJobs(): Promise<IWordPressImportJobDocument[]>;
  createJob(data: Partial<IWordPressImportJob>): Promise<IWordPressImportJobDocument>;
}

/**
 * WordPress Import Job schema definition
 */
const wordPressImportJobSchema = new Schema<IWordPressImportJobDocument, IWordPressImportJobModel>({
  connectionId: {
    type: String,
    required: [true, 'Connection ID is required'],
    ref: 'WordPressConnection'
  },
  jobId: {
    type: String,
    required: [true, 'Job ID is required'],
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  progress: {
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative']
    },
    processed: {
      type: Number,
      default: 0,
      min: [0, 'Processed cannot be negative']
    },
    imported: {
      type: Number,
      default: 0,
      min: [0, 'Imported cannot be negative']
    },
    updated: {
      type: Number,
      default: 0,
      min: [0, 'Updated cannot be negative']
    },
    skipped: {
      type: Number,
      default: 0,
      min: [0, 'Skipped cannot be negative']
    },
    failed: {
      type: Number,
      default: 0,
      min: [0, 'Failed cannot be negative']
    },
    currentStep: {
      type: String,
      default: 'Initializing'
    },
    percentage: {
      type: Number,
      default: 0,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100']
    }
  },
  
  filters: {
    categories: [String],
    status: [String],
    dateFrom: Date,
    dateTo: Date,
    includeVariations: {
      type: Boolean,
      default: true
    },
    includeImages: {
      type: Boolean,
      default: true
    },
    updateExisting: {
      type: Boolean,
      default: true
    },
    pageSize: {
      type: Number,
      default: 50,
      min: [1, 'Page size must be at least 1'],
      max: [100, 'Page size cannot exceed 100']
    }
  },
  
  results: {
    newProducts: [{
      type: String
    }],
    updatedProducts: [{
      type: String
    }],
    skippedProducts: [{
      type: String
    }],
    failedProducts: [{
      wordpressId: {
        type: Number,
        required: true
      },
      sku: String,
      name: {
        type: String,
        required: true
      },
      error: {
        type: String,
        required: true
      }
    }]
  },
  
  importErrors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['warning', 'error', 'critical'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    productId: Number,
    context: Schema.Types.Mixed
  }],
  
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date,
  estimatedTimeRemaining: Number,
  averageProcessingTime: Number,
  
  triggeredBy: {
    type: String,
    enum: ['manual', 'auto', 'schedule'],
    default: 'manual'
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  notes: String,
  retryCount: {
    type: Number,
    default: 0,
    min: [0, 'Retry count cannot be negative']
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: [0, 'Max retries cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance
wordPressImportJobSchema.index({ connectionId: 1, status: 1 });
wordPressImportJobSchema.index({ userId: 1, startedAt: -1 });
wordPressImportJobSchema.index({ status: 1, startedAt: -1 });
wordPressImportJobSchema.index({ triggeredBy: 1, startedAt: -1 });

/**
 * Pre-save middleware to calculate progress percentage
 */
wordPressImportJobSchema.pre('save', function(next) {
  this.calculateProgress();
  next();
});

/**
 * Instance method to update progress
 */
wordPressImportJobSchema.methods.updateProgress = async function(update: Partial<IWordPressImportJob['progress']>): Promise<void> {
  Object.assign(this.progress, update);
  
  // Calculate estimated time remaining
  if (this.progress.processed > 0 && this.progress.total > 0) {
    const elapsedTime = this.getElapsedTime();
    const averageTime = elapsedTime / this.progress.processed;
    const remainingItems = this.progress.total - this.progress.processed;
    this.estimatedTimeRemaining = remainingItems * averageTime;
    this.averageProcessingTime = averageTime;
  }
  
  await this.save();
};

/**
 * Instance method to add error
 */
wordPressImportJobSchema.methods.addError = async function(error: { level: 'warning' | 'error' | 'critical'; message: string; productId?: number; context?: any }): Promise<void> {
  this.importErrors.push({
    ...error,
    timestamp: new Date()
  });
  
  // Auto-fail job if too many critical errors
  const criticalErrors = this.importErrors.filter((e: any) => e.level === 'critical').length;
  if (criticalErrors >= 5) {
    await this.markFailed('Too many critical errors occurred during import');
  } else {
    await this.save();
  }
};

/**
 * Instance method to mark job as completed
 */
wordPressImportJobSchema.methods.markCompleted = async function(): Promise<void> {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.percentage = 100;
  this.progress.currentStep = 'Completed';
  this.estimatedTimeRemaining = 0;
  await this.save();
};

/**
 * Instance method to mark job as failed
 */
wordPressImportJobSchema.methods.markFailed = async function(error: string): Promise<void> {
  this.status = 'failed';
  this.completedAt = new Date();
  this.progress.currentStep = 'Failed';
  this.estimatedTimeRemaining = 0;
  
  await this.addError({
    level: 'critical',
    message: error
  });
};

/**
 * Instance method to check if job can be retried
 */
wordPressImportJobSchema.methods.canRetry = function(): boolean {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

/**
 * Instance method to get elapsed time in milliseconds
 */
wordPressImportJobSchema.methods.getElapsedTime = function(): number {
  const endTime = this.completedAt || new Date();
  return endTime.getTime() - this.startedAt.getTime();
};

/**
 * Instance method to get estimated time remaining
 */
wordPressImportJobSchema.methods.getEstimatedTimeRemaining = function(): number {
  return this.estimatedTimeRemaining || 0;
};

/**
 * Instance method to calculate progress percentage
 */
wordPressImportJobSchema.methods.calculateProgress = function(): void {
  if (this.progress.total > 0) {
    this.progress.percentage = Math.round((this.progress.processed / this.progress.total) * 100);
  } else {
    this.progress.percentage = 0;
  }
};

/**
 * Static method to find active jobs
 */
wordPressImportJobSchema.statics.findActiveJobs = function() {
  return this.find({ 
    status: { $in: ['pending', 'processing'] } 
  }).sort({ startedAt: -1 });
};

/**
 * Static method to find job by ID
 */
wordPressImportJobSchema.statics.findByJobId = function(jobId: string) {
  return this.findOne({ jobId });
};

/**
 * Static method to find recent jobs
 */
wordPressImportJobSchema.statics.findRecentJobs = function(limit: number = 20) {
  return this.find()
    .sort({ startedAt: -1 })
    .limit(limit);
};

/**
 * Static method to find failed jobs that can be retried
 */
wordPressImportJobSchema.statics.findFailedJobs = function() {
  return this.find({ 
    status: 'failed',
    $expr: { $lt: ['$retryCount', '$maxRetries'] }
  }).sort({ startedAt: -1 });
};

/**
 * Static method to create a new job with generated ID
 */
wordPressImportJobSchema.statics.createJob = function(data: Partial<IWordPressImportJob>) {
  const jobId = `wp-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return this.create({
    ...data,
    jobId,
    startedAt: new Date()
  });
};

// Prevent model re-compilation during development
const WordPressImportJob = (mongoose.models.WordPressImportJob || 
  mongoose.model<IWordPressImportJobDocument, IWordPressImportJobModel>('WordPressImportJob', wordPressImportJobSchema)) as IWordPressImportJobModel;

export default WordPressImportJob;
export { WordPressImportJob };