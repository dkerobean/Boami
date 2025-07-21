import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Kanban Task interface for productivity system
 * Manages individual tasks within kanban boards with position tracking
 */
export interface IKanbanTask {
  title: string;
  description?: string;
  taskImage?: string;
  date?: string;
  taskProperty?: string;
  boardId: string;
  columnId: string;
  order: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Kanban Task document interface extending Mongoose Document
 */
export interface IKanbanTaskDocument extends IKanbanTask, Document {
  isOwnedBy(userId: string): boolean;
  belongsToBoard(boardId: string): boolean;
  belongsToColumn(columnId: string): boolean;
  moveToColumn(columnId: string, newOrder?: number): void;
  updateOrder(newOrder: number): void;
  hasImage(): boolean;
  getFormattedDate(): string | null;
}

/**
 * Kanban Task model interface with static methods
 */
export interface IKanbanTaskModel extends Model<IKanbanTaskDocument> {
  findByUser(userId: string): Promise<IKanbanTaskDocument[]>;
  findByBoard(boardId: string, userId: string): Promise<IKanbanTaskDocument[]>;
  findByColumn(boardId: string, columnId: string, userId: string): Promise<IKanbanTaskDocument[]>;
  findByProperty(taskProperty: string, userId: string): Promise<IKanbanTaskDocument[]>;
  searchTasks(query: string, userId: string): Promise<IKanbanTaskDocument[]>;
  reorderTasks(boardId: string, columnId: string, taskIds: string[], userId: string): Promise<boolean>;
  moveTask(taskId: string, targetColumnId: string, newOrder: number, userId: string): Promise<boolean>;
  getTotalByUser(userId: string): Promise<number>;
  getTotalByBoard(boardId: string, userId: string): Promise<number>;
  deleteByBoard(boardId: string, userId: string): Promise<number>;
}

/**
 * Kanban Task schema definition with validation and middleware
 */
const kanbanTaskSchema = new Schema<IKanbanTaskDocument, IKanbanTaskModel>({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters'],
    minlength: [1, 'Task title must be at least 1 character']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters'],
    default: null
  },
  taskImage: {
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        if (!value) return true;
        // Basic URL validation for image paths
        return /^(\/|https?:\/\/)/.test(value);
      },
      message: 'Task image must be a valid URL or path'
    },
    default: null
  },
  date: {
    type: String,
    trim: true,
    default: null
  },
  taskProperty: {
    type: String,
    trim: true,
    maxlength: [50, 'Task property cannot exceed 50 characters'],
    default: null
  },
  boardId: {
    type: String,
    required: [true, 'Board ID is required'],
    index: true
  },
  columnId: {
    type: String,
    required: [true, 'Column ID is required'],
    index: true
  },
  order: {
    type: Number,
    required: true,
    min: [0, 'Task order must be non-negative'],
    default: 0
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

// Compound indexes for better query performance
kanbanTaskSchema.index({ userId: 1, boardId: 1 });
kanbanTaskSchema.index({ userId: 1, boardId: 1, columnId: 1 });
kanbanTaskSchema.index({ userId: 1, boardId: 1, columnId: 1, order: 1 });
kanbanTaskSchema.index({ userId: 1, taskProperty: 1 });
kanbanTaskSchema.index({ userId: 1, createdAt: -1 });

// Text index for search functionality
kanbanTaskSchema.index({
  title: 'text',
  description: 'text',
  taskProperty: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    taskProperty: 3
  }
});

/**
 * Pre-save middleware for data validation and formatting
 */
kanbanTaskSchema.pre('save', function(next) {
  // Trim whitespace from string fields
  if (this.title) {
    this.title = this.title.trim();
  }
  if (this.description) {
    this.description = this.description.trim();
  }
  if (this.taskProperty) {
    this.taskProperty = this.taskProperty.trim();
  }
  if (this.taskImage) {
    this.taskImage = this.taskImage.trim();
  }
  if (this.date) {
    this.date = this.date.trim();
  }

  next();
});

/**
 * Instance method to check ownership
 */
kanbanTaskSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to check if task belongs to a specific board
 */
kanbanTaskSchema.methods.belongsToBoard = function(boardId: string): boolean {
  return this.boardId === boardId;
};

/**
 * Instance method to check if task belongs to a specific column
 */
kanbanTaskSchema.methods.belongsToColumn = function(columnId: string): boolean {
  return this.columnId === columnId;
};

/**
 * Instance method to move task to a different column
 */
kanbanTaskSchema.methods.moveToColumn = function(columnId: string, newOrder?: number): void {
  this.columnId = columnId;
  if (newOrder !== undefined) {
    this.order = newOrder;
  }
};

/**
 * Instance method to update task order
 */
kanbanTaskSchema.methods.updateOrder = function(newOrder: number): void {
  this.order = newOrder;
};

/**
 * Instance method to check if task has an image
 */
kanbanTaskSchema.methods.hasImage = function(): boolean {
  return !!this.taskImage;
};

/**
 * Instance method to get formatted date
 */
kanbanTaskSchema.methods.getFormattedDate = function(): string | null {
  return this.date || null;
};

/**
 * Static method to find tasks by user
 */
kanbanTaskSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId: userId }).sort({ createdAt: -1 });
};

/**
 * Static method to find tasks by board
 */
kanbanTaskSchema.statics.findByBoard = function(boardId: string, userId: string) {
  return this.find({
    userId: userId,
    boardId: boardId
  }).sort({ columnId: 1, order: 1 });
};

/**
 * Static method to find tasks by column
 */
kanbanTaskSchema.statics.findByColumn = function(boardId: string, columnId: string, userId: string) {
  return this.find({
    userId: userId,
    boardId: boardId,
    columnId: columnId
  }).sort({ order: 1 });
};

/**
 * Static method to find tasks by property
 */
kanbanTaskSchema.statics.findByProperty = function(taskProperty: string, userId: string) {
  return this.find({
    userId: userId,
    taskProperty: taskProperty
  }).sort({ createdAt: -1 });
};

/**
 * Static method to search tasks by text
 */
kanbanTaskSchema.statics.searchTasks = function(query: string, userId: string) {
  return this.find({
    $and: [
      { userId: userId },
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
 * Static method to reorder tasks within a column
 */
kanbanTaskSchema.statics.reorderTasks = async function(
  boardId: string,
  columnId: string,
  taskIds: string[],
  userId: string
): Promise<boolean> {
  try {
    const bulkOps = taskIds.map((taskId, index) => ({
      updateOne: {
        filter: {
          _id: taskId,
          userId: userId,
          boardId: boardId,
          columnId: columnId
        },
        update: { order: index }
      }
    }));

    const result = await this.bulkWrite(bulkOps);
    return result.modifiedCount === taskIds.length;
  } catch (error) {
    return false;
  }
};

/**
 * Static method to move a task to a different column
 */
kanbanTaskSchema.statics.moveTask = async function(
  taskId: string,
  targetColumnId: string,
  newOrder: number,
  userId: string
): Promise<boolean> {
  try {
    const task = await this.findOne({
      _id: taskId,
      userId: userId
    });

    if (!task) {
      return false;
    }

    // Update the task's column and order
    task.columnId = targetColumnId;
    task.order = newOrder;
    await task.save();

    // Reorder other tasks in the target column
    await this.updateMany(
      {
        userId: userId,
        boardId: task.boardId,
        columnId: targetColumnId,
        _id: { $ne: taskId },
        order: { $gte: newOrder }
      },
      {
        $inc: { order: 1 }
      }
    );

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Static method to get total count of tasks by user
 */
kanbanTaskSchema.statics.getTotalByUser = async function(userId: string): Promise<number> {
  return this.countDocuments({ userId: userId });
};

/**
 * Static method to get total count of tasks by board
 */
kanbanTaskSchema.statics.getTotalByBoard = async function(boardId: string, userId: string): Promise<number> {
  return this.countDocuments({
    userId: userId,
    boardId: boardId
  });
};

/**
 * Static method to delete all tasks for a board (cascade delete)
 */
kanbanTaskSchema.statics.deleteByBoard = async function(boardId: string, userId: string): Promise<number> {
  const result = await this.deleteMany({
    userId: userId,
    boardId: boardId
  });
  return result.deletedCount || 0;
};

// Prevent model re-compilation during development
const KanbanTask = (mongoose.models.KanbanTask ||
  mongoose.model<IKanbanTaskDocument, IKanbanTaskModel>('KanbanTask', kanbanTaskSchema)) as IKanbanTaskModel;

export default KanbanTask;
export { KanbanTask };