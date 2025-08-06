import mongoose, { Schema, Document } from 'mongoose';

export interface IImportJob extends Document {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'income' | 'expense';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  progress: {
    percentage: number;
    estimatedTimeRemaining?: number;
  };
  results: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  importErrors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
  userId: string;
  
  // Additional metadata
  originalFileName?: string;
  mapping?: Record<string, string>;
  options?: {
    updateExisting?: boolean;
    createCategories?: boolean;
    createVendors?: boolean;
    skipInvalidRows?: boolean;
    dateFormat?: string;
  };
}

const ImportJobSchema = new Schema<IImportJob>({
  jobId: { 
    type: String, 
    required: true, 
    unique: true
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  type: { 
    type: String, 
    required: true,
    enum: ['income', 'expense'] 
  },
  totalRows: { 
    type: Number, 
    required: true,
    min: 0 
  },
  processedRows: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  successfulRows: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  failedRows: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  progress: {
    percentage: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 100 
    },
    estimatedTimeRemaining: { 
      type: Number,
      min: 0 
    }
  },
  results: {
    created: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    updated: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    skipped: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    failed: { 
      type: Number, 
      default: 0,
      min: 0 
    }
  },
  importErrors: [{
    row: { 
      type: Number, 
      required: true,
      min: 1 
    },
    field: { 
      type: String, 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    }
  }],
  warnings: [{
    row: { 
      type: Number, 
      required: true,
      min: 1 
    },
    field: { 
      type: String, 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  completedAt: { 
    type: Date 
  },
  userId: { 
    type: String, 
    required: true
  },
  
  // Additional metadata
  originalFileName: { 
    type: String 
  },
  mapping: {
    type: Schema.Types.Mixed
  },
  options: {
    updateExisting: { 
      type: Boolean, 
      default: false 
    },
    createCategories: { 
      type: Boolean, 
      default: true 
    },
    createVendors: { 
      type: Boolean, 
      default: true 
    },
    skipInvalidRows: { 
      type: Boolean, 
      default: true 
    },
    dateFormat: { 
      type: String 
    }
  }
}, {
  timestamps: true,
  collection: 'import_jobs'
});

// Compound indexes for better query performance
ImportJobSchema.index({ userId: 1, createdAt: -1 }); // User's recent jobs
ImportJobSchema.index({ userId: 1, status: 1 }); // User's active jobs
ImportJobSchema.index({ status: 1, createdAt: 1 }); // Cleanup old jobs

// Auto-expire completed/failed jobs after 7 days
ImportJobSchema.index(
  { completedAt: 1 }, 
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
    partialFilterExpression: { 
      status: { $in: ['completed', 'failed'] } 
    }
  }
);

// Virtual for calculated progress percentage
ImportJobSchema.virtual('calculatedProgress').get(function() {
  if (this.totalRows === 0) return 0;
  return Math.round((this.processedRows / this.totalRows) * 100);
});

// Methods
ImportJobSchema.methods.updateProgress = function() {
  this.progress.percentage = this.calculatedProgress;
  return this.save();
};

ImportJobSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.percentage = 100;
  return this.save();
};

ImportJobSchema.methods.markFailed = function(error?: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  if (error) {
    this.importErrors.push({
      row: 0,
      field: 'general',
      message: error
    });
  }
  return this.save();
};

// Static methods
ImportJobSchema.statics.findUserJobs = function(userId: string, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

ImportJobSchema.statics.findActiveJobs = function(userId?: string) {
  const query = { status: { $in: ['pending', 'processing'] } };
  if (userId) {
    (query as any).userId = userId;
  }
  return this.find(query).lean();
};

ImportJobSchema.statics.cleanupOldJobs = function(maxAgeHours = 24) {
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  return this.deleteMany({
    status: { $in: ['completed', 'failed'] },
    completedAt: { $lt: cutoffTime }
  });
};

const ImportJob = mongoose.models.ImportJob || mongoose.model<IImportJob>('ImportJob', ImportJobSchema);

export default ImportJob;