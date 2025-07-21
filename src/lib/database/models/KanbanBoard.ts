import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Kanban Column interface for board structure
 */
export interface IKanbanColumn {
  id: string;
  name: string;
  order: number;
}

/**
 * Kanban Board interface for productivity system
 * Manages user kanban boards with embedded column structure
 */
export interface IKanbanBoard {
  name: string;
  description?: string;
  columns: IKanbanColumn[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Kanban Board document interface extending Mongoose Document
 */
export interface IKanbanBoardDocument extends IKanbanBoard, Document {
  isOwnedBy(userId: string): boolean;
  addColumn(name: string): IKanbanColumn;
  removeColumn(columnId: string): boolean;
  updateColumn(columnId: string, name: string): boolean;
  reorderColumns(columnIds: string[]): boolean;
  getColumn(columnId: string): IKanbanColumn | null;
  getColumnCount(): number;
}

/**
 * Kanban Board model interface with static methods
 */
export interface IKanbanBoardModel extends Model<IKanbanBoardDocument> {
  findByUser(userId: string): Promise<IKanbanBoardDocument[]>;
  findWithTasks(userId: string): Promise<any[]>;
  createDefaultBoard(userId: string, name?: string): Promise<IKanbanBoardDocument>;
  searchBoards(query: string, userId: string): Promise<IKanbanBoardDocument[]>;
  getTotalByUser(userId: string): Promise<number>;
}

/**
 * Column schema for embedded documents
 */
const columnSchema = new Schema<IKanbanColumn>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Column name is required'],
    trim: true,
    maxlength: [50, 'Column name cannot exceed 50 characters']
  },
  order: {
    type: Number,
    required: true,
    min: [0, 'Column order must be non-negative']
  }
}, { _id: false });

/**
 * Kanban Board schema definition with validation and middleware
 */
const kanbanBoardSchema = new Schema<IKanbanBoardDocument, IKanbanBoardModel>({
  name: {
    type: String,
    required: [true, 'Board name is required'],
    trim: true,
    maxlength: [100, 'Board name cannot exceed 100 characters'],
    minlength: [1, 'Board name must be at least 1 character']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: null
  },
  columns: {
    type: [columnSchema],
    default: [],
    validate: {
      validator: function(columns: IKanbanColumn[]) {
        // Check for unique column IDs
        const ids = columns.map(col => col.id);
        return ids.length === new Set(ids).size;
      },
      message: 'Column IDs must be unique'
    }
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
kanbanBoardSchema.index({ userId: 1, createdAt: -1 });
kanbanBoardSchema.index({ userId: 1, name: 1 });

// Text index for search functionality
kanbanBoardSchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  }
});

/**
 * Pre-save middleware for data validation and formatting
 */
kanbanBoardSchema.pre('save', function(next) {
  // Trim whitespace from string fields
  if (this.name) {
    this.name = this.name.trim();
  }
  if (this.description) {
    this.description = this.description.trim();
  }

  // Sort columns by order
  this.columns.sort((a, b) => a.order - b.order);

  // Ensure column orders are sequential starting from 0
  this.columns.forEach((column, index) => {
    column.order = index;
  });

  next();
});

/**
 * Instance method to check ownership
 */
kanbanBoardSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to add a new column
 */
kanbanBoardSchema.methods.addColumn = function(name: string): IKanbanColumn {
  const newColumn: IKanbanColumn = {
    id: new mongoose.Types.ObjectId().toString(),
    name: name.trim(),
    order: this.columns.length
  };

  this.columns.push(newColumn);
  return newColumn;
};

/**
 * Instance method to remove a column
 */
kanbanBoardSchema.methods.removeColumn = function(columnId: string): boolean {
  const initialLength = this.columns.length;
  this.columns = this.columns.filter(col => col.id !== columnId);

  // Reorder remaining columns
  this.columns.forEach((column, index) => {
    column.order = index;
  });

  return this.columns.length < initialLength;
};

/**
 * Instance method to update a column name
 */
kanbanBoardSchema.methods.updateColumn = function(columnId: string, name: string): boolean {
  const column = this.columns.find(col => col.id === columnId);
  if (column) {
    column.name = name.trim();
    return true;
  }
  return false;
};

/**
 * Instance method to reorder columns
 */
kanbanBoardSchema.methods.reorderColumns = function(columnIds: string[]): boolean {
  if (columnIds.length !== this.columns.length) {
    return false;
  }

  const reorderedColumns: IKanbanColumn[] = [];

  for (let i = 0; i < columnIds.length; i++) {
    const column = this.columns.find(col => col.id === columnIds[i]);
    if (!column) {
      return false;
    }
    column.order = i;
    reorderedColumns.push(column);
  }

  this.columns = reorderedColumns;
  return true;
};

/**
 * Instance method to get a specific column
 */
kanbanBoardSchema.methods.getColumn = function(columnId: string): IKanbanColumn | null {
  return this.columns.find(col => col.id === columnId) || null;
};

/**
 * Instance method to get column count
 */
kanbanBoardSchema.methods.getColumnCount = function(): number {
  return this.columns.length;
};

/**
 * Static method to find boards by user
 */
kanbanBoardSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId: userId }).sort({ createdAt: -1 });
};

/**
 * Static method to find boards with their tasks (requires aggregation with KanbanTask)
 */
kanbanBoardSchema.statics.findWithTasks = async function(userId: string) {
  // This will be implemented when we have the KanbanTask model
  // For now, return boards without tasks
  return this.findByUser(userId);
};

/**
 * Static method to create a default board with standard columns
 */
kanbanBoardSchema.statics.createDefaultBoard = async function(userId: string, name: string = 'My Board'): Promise<IKanbanBoardDocument> {
  const board = new this({
    name: name,
    description: 'Default kanban board',
    userId: userId,
    columns: [
      { id: new mongoose.Types.ObjectId().toString(), name: 'Todo', order: 0 },
      { id: new mongoose.Types.ObjectId().toString(), name: 'In Progress', order: 1 },
      { id: new mongoose.Types.ObjectId().toString(), name: 'Review', order: 2 },
      { id: new mongoose.Types.ObjectId().toString(), name: 'Done', order: 3 }
    ]
  });

  return board.save();
};

/**
 * Static method to search boards by text
 */
kanbanBoardSchema.statics.searchBoards = function(query: string, userId: string) {
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
 * Static method to get total count of boards by user
 */
kanbanBoardSchema.statics.getTotalByUser = async function(userId: string): Promise<number> {
  return this.countDocuments({ userId: userId });
};

// Prevent model re-compilation during development
const KanbanBoard = (mongoose.models.KanbanBoard ||
  mongoose.model<IKanbanBoardDocument, IKanbanBoardModel>('KanbanBoard', kanbanBoardSchema)) as IKanbanBoardModel;

export default KanbanBoard;
export { KanbanBoard };