import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Note interface for productivity system
 * Manages user notes with color coding and soft delete functionality
 */
export interface INote {
  title: string;
  content: string;
  color: 'info' | 'error' | 'warning' | 'success' | 'primary';
  isDeleted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Note document interface extending Mongoose Document
 */
export interface INoteDocument extends INote, Document {
  isOwnedBy(userId: string): boolean;
  softDelete(): Promise<void>;
  restore(): Promise<void>;
  isActive(): boolean;
}

/**
 * Note model interface with static methods
 */
export interface INoteModel extends Model<INoteDocument> {
  findByUser(userId: string, includeDeleted?: boolean): Promise<INoteDocument[]>;
  findActiveByUser(userId: string): Promise<INoteDocument[]>;
  findDeletedByUser(userId: string): Promise<INoteDocument[]>;
  findByColor(color: string, userId: string): Promise<INoteDocument[]>;
  searchNotes(query: string, userId: string): Promise<INoteDocument[]>;
  getTotalByUser(userId: string): Promise<number>;
}

/**
 * Note schema definition with validation and middleware
 */
const noteSchema = new Schema<INoteDocument, INoteModel>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [1, 'Title must be at least 1 character']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters'],
    minlength: [1, 'Content must be at least 1 character']
  },
  color: {
    type: String,
    enum: {
      values: ['info', 'error', 'warning', 'success', 'primary'],
      message: 'Color must be one of: info, error, warning, success, primary'
    },
    default: 'info'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
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
noteSchema.index({ userId: 1, isDeleted: 1 });
noteSchema.index({ userId: 1, color: 1 });
noteSchema.index({ userId: 1, createdAt: -1 });

// Text index for search functionality
noteSchema.index({
  title: 'text',
  content: 'text'
}, {
  weights: {
    title: 10,
    content: 5
  }
});

/**
 * Pre-save middleware for data validation and formatting
 */
noteSchema.pre('save', function(next) {
  // Trim whitespace from title and content
  if (this.title) {
    this.title = this.title.trim();
  }
  if (this.content) {
    this.content = this.content.trim();
  }

  next();
});

/**
 * Instance method to check ownership
 */
noteSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to soft delete a note
 */
noteSchema.methods.softDelete = async function(): Promise<void> {
  this.isDeleted = true;
  await this.save();
};

/**
 * Instance method to restore a soft deleted note
 */
noteSchema.methods.restore = async function(): Promise<void> {
  this.isDeleted = false;
  await this.save();
};

/**
 * Instance method to check if note is active (not deleted)
 */
noteSchema.methods.isActive = function(): boolean {
  return !this.isDeleted;
};

/**
 * Static method to find notes by user
 */
noteSchema.statics.findByUser = function(userId: string, includeDeleted: boolean = false) {
  const query: any = { userId: userId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method to find active notes by user
 */
noteSchema.statics.findActiveByUser = function(userId: string) {
  return this.find({
    userId: userId,
    isDeleted: false
  }).sort({ createdAt: -1 });
};

/**
 * Static method to find deleted notes by user
 */
noteSchema.statics.findDeletedByUser = function(userId: string) {
  return this.find({
    userId: userId,
    isDeleted: true
  }).sort({ createdAt: -1 });
};

/**
 * Static method to find notes by color
 */
noteSchema.statics.findByColor = function(color: string, userId: string) {
  return this.find({
    userId: userId,
    color: color,
    isDeleted: false
  }).sort({ createdAt: -1 });
};

/**
 * Static method to search notes by text
 */
noteSchema.statics.searchNotes = function(query: string, userId: string) {
  return this.find({
    $and: [
      { userId: userId },
      { isDeleted: false },
      {
        $text: { $search: query }
      }
    ]
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    createdAt: -1
  });
};

/**
 * Static method to get total count of active notes by user
 */
noteSchema.statics.getTotalByUser = async function(userId: string): Promise<number> {
  return this.countDocuments({
    userId: userId,
    isDeleted: false
  });
};

// Prevent model re-compilation during development
const Note = (mongoose.models.Note ||
  mongoose.model<INoteDocument, INoteModel>('Note', noteSchema)) as INoteModel;

export default Note;
export { Note };