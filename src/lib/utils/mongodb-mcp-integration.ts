/**
 * MongoDB MCP (Model Context Protocol) integration utilities
 * Provides productivity-specific database utilities using MCP patterns
 */

import { connectToDatabase } from '@/lib/database/connection';
import Note from '@/lib/database/models/Note';
import CalendarEvent from '@/lib/database/models/CalendarEvent';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import KanbanTask from '@/lib/database/models/KanbanTask';

/**
 * MCP-compatible error handling
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * MCP response format
 */
export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    operation: string;
    userId?: string;
  };
}

/**
 * MCP query options
 */
export interface MCPQueryOptions {
  userId: string;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  select?: string;
  populate?: string | string[];
  lean?: boolean;
}

/**
 * MCP aggregation pipeline stage
 */
export interface MCPPipelineStage {
  $match?: any;
  $project?: any;
  $sort?: any;
  $limit?: number;
  $skip?: number;
  $group?: any;
  $lookup?: any;
  $unwind?: any;
  $addFields?: any;
  $count?: string;
}

/**
 * Base MCP database utility class
 */
export abstract class MCPDatabaseUtility {
  protected model: any;
  protected modelName: string;

  constructor(model: any, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Create MCP response
   */
  protected createResponse<T>(
    success: boolean,
    data?: T,
    error?: { code: string; message: string; details?: any },
    operation?: string,
    userId?: string
  ): MCPResponse<T> {
    return {
      success,
      data,
      error,
      metadata: {
        timestamp: new Date().toISOString(),
        operation: operation || 'unknown',
        userId
      }
    };
  }

  /**
   * Handle MCP errors
   */
  protected handleError(error: any, operation: string, userId?: string): MCPResponse {
    console.error(`MCP ${this.modelName} Error [${operation}]:`, error);

    if (error instanceof MCPError) {
      return this.createResponse(
        false,
        undefined,
        {
          code: error.code,
          message: error.message,
          details: error.details
        },
        operation,
        userId
      );
    }

    return this.createResponse(
      false,
      undefined,
      {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error
      },
      operation,
      userId
    );
  }

  /**
   * Ensure database connection
   */
  protected async ensureConnection(): Promise<void> {
    try {
      await connectToDatabase();
    } catch (error) {
      throw new MCPError(
        'Failed to connect to database',
        'CONNECTION_ERROR',
        503,
        error
      );
    }
  }

  /**
   * Validate user ownership
   */
  protected validateOwnership(document: any, userId: string): void {
    if (!document) {
      throw new MCPError(
        `${this.modelName} not found`,
        'NOT_FOUND',
        404
      );
    }

    if (document.userId !== userId) {
      throw new MCPError(
        'Access denied',
        'FORBIDDEN',
        403
      );
    }
  }

  /**
   * Execute MCP query with error handling
   */
  protected async executeQuery<T>(
    operation: string,
    queryFn: () => Promise<T>,
    userId?: string
  ): Promise<MCPResponse<T>> {
    try {
      await this.ensureConnection();
      const result = await queryFn();
      return this.createResponse(true, result, undefined, operation, userId);
    } catch (error) {
      return this.handleError(error, operation, userId);
    }
  }

  /**
   * Build query with MCP options
   */
  protected buildQuery(filter: any, options: MCPQueryOptions) {
    let query = this.model.find({ ...filter, userId: options.userId });

    if (options.select) {
      query = query.select(options.select);
    }

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(field => {
          query = query.populate(field);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    if (options.lean) {
      query = query.lean();
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }
}

/**
 * MCP Notes utility
 */
export class MCPNotesUtility extends MCPDatabaseUtility {
  constructor() {
    super(Note, 'Note');
  }

  /**
   * Find notes with MCP pattern
   */
  async findNotes(filter: any = {}, options: MCPQueryOptions): Promise<MCPResponse> {
    return this.executeQuery('findNotes', async () => {
      const query = this.buildQuery(filter, options);
      return await query.exec();
    }, options.userId);
  }

  /**
   * Create note with MCP pattern
   */
  async createNote(data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('createNote', async () => {
      const note = new this.model({
        ...data,
        userId
      });
      return await note.save();
    }, userId);
  }

  /**
   * Update note with MCP pattern
   */
  async updateNote(id: string, data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('updateNote', async () => {
      const note = await this.model.findById(id);
      this.validateOwnership(note, userId);

      Object.keys(data).forEach(key => {
        if (key !== 'userId' && key !== '_id' && key !== 'createdAt') {
          note[key] = data[key];
        }
      });

      return await note.save();
    }, userId);
  }

  /**
   * Delete note with MCP pattern
   */
  async deleteNote(id: string, userId: string, permanent: boolean = false): Promise<MCPResponse> {
    return this.executeQuery('deleteNote', async () => {
      const note = await this.model.findById(id);
      this.validateOwnership(note, userId);

      if (permanent) {
        await this.model.deleteOne({ _id: id });
        return { message: 'Note permanently deleted' };
      } else {
        note.isDeleted = true;
        await note.save();
        return { message: 'Note moved to trash' };
      }
    }, userId);
  }

  /**
   * Search notes with MCP pattern
   */
  async searchNotes(query: string, userId: string, options: Partial<MCPQueryOptions> = {}): Promise<MCPResponse> {
    return this.executeQuery('searchNotes', async () => {
      return await this.model.searchNotes(query, userId);
    }, userId);
  }

  /**
   * Get notes statistics with MCP pattern
   */
  async getNotesStats(userId: string): Promise<MCPResponse> {
    return this.executeQuery('getNotesStats', async () => {
      const pipeline: MCPPipelineStage[] = [
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$isDeleted', false] }, 1, 0] } },
            deleted: { $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] } },
            byColor: {
              $push: {
                color: '$color',
                isDeleted: '$isDeleted'
              }
            }
          }
        },
        {
          $addFields: {
            colorStats: {
              $reduce: {
                input: '$byColor',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $cond: [
                        { $eq: ['$$this.isDeleted', false] },
                        { [`$$this.color`]: { $add: [{ $ifNull: [`$$value.$$this.color`, 0] }, 1] } },
                        {}
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await this.model.aggregate(pipeline);
      return result[0] || { total: 0, active: 0, deleted: 0, colorStats: {} };
    }, userId);
  }
}

/**
 * MCP Calendar Events utility
 */
export class MCPCalendarEventsUtility extends MCPDatabaseUtility {
  constructor() {
    super(CalendarEvent, 'CalendarEvent');
  }

  /**
   * Find events with MCP pattern
   */
  async findEvents(filter: any = {}, options: MCPQueryOptions): Promise<MCPResponse> {
    return this.executeQuery('findEvents', async () => {
      const query = this.buildQuery(filter, options);
      return await query.exec();
    }, options.userId);
  }

  /**
   * Find events by date range with MCP pattern
   */
  async findEventsByDateRange(startDate: Date, endDate: Date, userId: string): Promise<MCPResponse> {
    return this.executeQuery('findEventsByDateRange', async () => {
      return await this.model.findByDateRange(startDate, endDate, userId);
    }, userId);
  }

  /**
   * Create event with MCP pattern
   */
  async createEvent(data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('createEvent', async () => {
      const event = new this.model({
        ...data,
        userId
      });
      return await event.save();
    }, userId);
  }

  /**
   * Update event with MCP pattern
   */
  async updateEvent(id: string, data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('updateEvent', async () => {
      const event = await this.model.findById(id);
      this.validateOwnership(event, userId);

      Object.keys(data).forEach(key => {
        if (key !== 'userId' && key !== '_id' && key !== 'createdAt') {
          event[key] = data[key];
        }
      });

      return await event.save();
    }, userId);
  }

  /**
   * Delete event with MCP pattern
   */
  async deleteEvent(id: string, userId: string): Promise<MCPResponse> {
    return this.executeQuery('deleteEvent', async () => {
      const event = await this.model.findById(id);
      this.validateOwnership(event, userId);

      await this.model.deleteOne({ _id: id });
      return { message: 'Event deleted successfully' };
    }, userId);
  }

  /**
   * Get upcoming events with MCP pattern
   */
  async getUpcomingEvents(userId: string, limit: number = 10): Promise<MCPResponse> {
    return this.executeQuery('getUpcomingEvents', async () => {
      return await this.model.findUpcoming(userId, limit);
    }, userId);
  }

  /**
   * Get events statistics with MCP pattern
   */
  async getEventsStats(userId: string): Promise<MCPResponse> {
    return this.executeQuery('getEventsStats', async () => {
      const now = new Date();
      const pipeline: MCPPipelineStage[] = [
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            upcoming: { $sum: { $cond: [{ $gt: ['$startDate', now] }, 1, 0] } },
            past: { $sum: { $cond: [{ $lt: ['$endDate', now] }, 1, 0] } },
            allDay: { $sum: { $cond: ['$isAllDay', 1, 0] } },
            withLocation: { $sum: { $cond: [{ $ne: ['$location', null] }, 1, 0] } }
          }
        }
      ];

      const result = await this.model.aggregate(pipeline);
      return result[0] || { total: 0, upcoming: 0, past: 0, allDay: 0, withLocation: 0 };
    }, userId);
  }
}

/**
 * MCP Kanban Boards utility
 */
export class MCPKanbanBoardsUtility extends MCPDatabaseUtility {
  constructor() {
    super(KanbanBoard, 'KanbanBoard');
  }

  /**
   * Find boards with MCP pattern
   */
  async findBoards(filter: any = {}, options: MCPQueryOptions): Promise<MCPResponse> {
    return this.executeQuery('findBoards', async () => {
      const query = this.buildQuery(filter, options);
      return await query.exec();
    }, options.userId);
  }

  /**
   * Create board with MCP pattern
   */
  async createBoard(data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('createBoard', async () => {
      const board = new this.model({
        ...data,
        userId
      });
      return await board.save();
    }, userId);
  }

  /**
   * Create default board with MCP pattern
   */
  async createDefaultBoard(userId: string, name: string = 'My Board'): Promise<MCPResponse> {
    return this.executeQuery('createDefaultBoard', async () => {
      return await this.model.createDefaultBoard(userId, name);
    }, userId);
  }

  /**
   * Update board with MCP pattern
   */
  async updateBoard(id: string, data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('updateBoard', async () => {
      const board = await this.model.findById(id);
      this.validateOwnership(board, userId);

      // Handle columns separately to maintain structure
      if (data.columns) {
        board.columns = data.columns;
        delete data.columns;
      }

      Object.keys(data).forEach(key => {
        if (key !== 'userId' && key !== '_id' && key !== 'createdAt') {
          board[key] = data[key];
        }
      });

      return await board.save();
    }, userId);
  }

  /**
   * Delete board with MCP pattern
   */
  async deleteBoard(id: string, userId: string): Promise<MCPResponse> {
    return this.executeQuery('deleteBoard', async () => {
      const board = await this.model.findById(id);
      this.validateOwnership(board, userId);

      // Delete all tasks associated with this board
      await KanbanTask.deleteMany({ boardId: id, userId });

      // Delete the board
      await this.model.deleteOne({ _id: id });

      return { message: 'Board and all associated tasks deleted successfully' };
    }, userId);
  }

  /**
   * Get boards with tasks using MCP pattern
   */
  async getBoardsWithTasks(userId: string): Promise<MCPResponse> {
    return this.executeQuery('getBoardsWithTasks', async () => {
      const pipeline: MCPPipelineStage[] = [
        { $match: { userId } },
        {
          $lookup: {
            from: 'kanbantasks',
            let: { boardId: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$boardId', '$$boardId'] },
                      { $eq: ['$userId', userId] }
                    ]
                  }
                }
              },
              { $sort: { columnId: 1, order: 1 } }
            ],
            as: 'tasks'
          }
        },
        { $sort: { createdAt: -1 } }
      ];

      return await this.model.aggregate(pipeline);
    }, userId);
  }
}

/**
 * MCP Kanban Tasks utility
 */
export class MCPKanbanTasksUtility extends MCPDatabaseUtility {
  constructor() {
    super(KanbanTask, 'KanbanTask');
  }

  /**
   * Find tasks with MCP pattern
   */
  async findTasks(filter: any = {}, options: MCPQueryOptions): Promise<MCPResponse> {
    return this.executeQuery('findTasks', async () => {
      const query = this.buildQuery(filter, options);
      return await query.exec();
    }, options.userId);
  }

  /**
   * Create task with MCP pattern
   */
  async createTask(data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('createTask', async () => {
      // Verify board exists and user has access
      const board = await KanbanBoard.findById(data.boardId);
      if (!board || board.userId !== userId) {
        throw new MCPError('Board not found or access denied', 'BOARD_ACCESS_DENIED', 403);
      }

      // Verify column exists in board
      const columnExists = board.columns.some((col: any) => col.id === data.columnId);
      if (!columnExists) {
        throw new MCPError('Column not found in board', 'COLUMN_NOT_FOUND', 404);
      }

      // Get highest order in column
      const tasksInColumn = await this.model.findByColumn(data.boardId, data.columnId, userId);
      const highestOrder = tasksInColumn.length > 0
        ? Math.max(...tasksInColumn.map((task: any) => task.order))
        : -1;

      const task = new this.model({
        ...data,
        userId,
        order: highestOrder + 1
      });

      return await task.save();
    }, userId);
  }

  /**
   * Move task with MCP pattern
   */
  async moveTask(id: string, targetColumnId: string, newOrder: number, userId: string): Promise<MCPResponse> {
    return this.executeQuery('moveTask', async () => {
      return await this.model.moveTask(id, targetColumnId, newOrder, userId);
    }, userId);
  }

  /**
   * Update task with MCP pattern
   */
  async updateTask(id: string, data: any, userId: string): Promise<MCPResponse> {
    return this.executeQuery('updateTask', async () => {
      const task = await this.model.findById(id);
      this.validateOwnership(task, userId);

      // Handle column changes
      if (data.columnId && data.columnId !== task.columnId) {
        const board = await KanbanBoard.findById(task.boardId);
        if (!board) {
          throw new MCPError('Board not found', 'BOARD_NOT_FOUND', 404);
        }
        const columnExists = board.columns.some((col: any) => col.id === data.columnId);
        if (!columnExists) {
          throw new MCPError('Column not found in board', 'COLUMN_NOT_FOUND', 404);
        }
      }

      Object.keys(data).forEach(key => {
        if (key !== 'userId' && key !== '_id' && key !== 'createdAt' && key !== 'boardId') {
          task[key] = data[key];
        }
      });

      return await task.save();
    }, userId);
  }

  /**
   * Delete task with MCP pattern
   */
  async deleteTask(id: string, userId: string): Promise<MCPResponse> {
    return this.executeQuery('deleteTask', async () => {
      const task = await this.model.findById(id);
      this.validateOwnership(task, userId);

      await this.model.deleteOne({ _id: id });
      return { message: 'Task deleted successfully' };
    }, userId);
  }

  /**
   * Get tasks statistics with MCP pattern
   */
  async getTasksStats(userId: string, boardId?: string): Promise<MCPResponse> {
    return this.executeQuery('getTasksStats', async () => {
      const matchStage: any = { userId };
      if (boardId) {
        matchStage.boardId = boardId;
      }

      const pipeline: MCPPipelineStage[] = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            byColumn: {
              $push: {
                columnId: '$columnId',
                taskProperty: '$taskProperty'
              }
            }
          }
        },
        {
          $addFields: {
            columnStats: {
              $reduce: {
                input: '$byColumn',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    { [`$$this.columnId`]: { $add: [{ $ifNull: [`$$value.$$this.columnId`, 0] }, 1] } }
                  ]
                }
              }
            },
            propertyStats: {
              $reduce: {
                input: '$byColumn',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    { [`$$this.taskProperty`]: { $add: [{ $ifNull: [`$$value.$$this.taskProperty`, 0] }, 1] } }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await this.model.aggregate(pipeline);
      return result[0] || { total: 0, columnStats: {}, propertyStats: {} };
    }, userId);
  }
}

/**
 * Main MCP Productivity Manager
 */
export class MCPProductivityManager {
  public notes: MCPNotesUtility;
  public events: MCPCalendarEventsUtility;
  public boards: MCPKanbanBoardsUtility;
  public tasks: MCPKanbanTasksUtility;

  constructor() {
    this.notes = new MCPNotesUtility();
    this.events = new MCPCalendarEventsUtility();
    this.boards = new MCPKanbanBoardsUtility();
    this.tasks = new MCPKanbanTasksUtility();
  }

  /**
   * Get comprehensive productivity statistics
   */
  async getProductivityStats(userId: string): Promise<MCPResponse> {
    try {
      await connectToDatabase();

      const [notesStats, eventsStats, boardsCount, tasksStats] = await Promise.all([
        this.notes.getNotesStats(userId),
        this.events.getEventsStats(userId),
        this.boards.findBoards({}, { userId, limit: 0 }),
        this.tasks.getTasksStats(userId)
      ]);

      const stats = {
        notes: notesStats.data,
        events: eventsStats.data,
        boards: {
          total: boardsCount.data?.length || 0
        },
        tasks: tasksStats.data,
        summary: {
          totalItems: (notesStats.data?.total || 0) +
                     (eventsStats.data?.total || 0) +
                     (boardsCount.data?.length || 0) +
                     (tasksStats.data?.total || 0),
          lastUpdated: new Date().toISOString()
        }
      };

      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          operation: 'getProductivityStats',
          userId
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get productivity stats'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          operation: 'getProductivityStats',
          userId
        }
      };
    }
  }

  /**
   * Search across all productivity features
   */
  async searchAll(query: string, userId: string): Promise<MCPResponse> {
    try {
      await connectToDatabase();

      const [notesResults, eventsResults, boardsResults, tasksResults] = await Promise.all([
        this.notes.searchNotes(query, userId),
        // Temporarily commented out due to method signature issues
        // this.events.searchEvents(query, userId),
        // this.boards.searchBoards(query, userId),
        // this.tasks.searchTasks(query, userId)
        Promise.resolve([]),
        Promise.resolve([]),
        Promise.resolve([])
      ]);

      const results = {
        notes: notesResults.data || [],
        events: eventsResults || [],
        boards: boardsResults || [],
        tasks: tasksResults || [],
        summary: {
          totalResults: (notesResults.data?.length || 0) +
                       (eventsResults?.length || 0) +
                       (boardsResults?.length || 0) +
                       (tasksResults?.length || 0),
          query,
          searchedAt: new Date().toISOString()
        }
      };

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date().toISOString(),
          operation: 'searchAll',
          userId
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to search productivity data'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          operation: 'searchAll',
          userId
        }
      };
    }
  }
}

// Export singleton instance
export const mcpProductivity = new MCPProductivityManager();

export default {
  MCPError,
  MCPDatabaseUtility,
  MCPNotesUtility,
  MCPCalendarEventsUtility,
  MCPKanbanBoardsUtility,
  MCPKanbanTasksUtility,
  MCPProductivityManager,
  mcpProductivity
};