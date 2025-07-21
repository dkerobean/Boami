import {
  MCPError,
  MCPNotesUtility,
  MCPCalendarEventsUtility,
  MCPKanbanBoardsUtility,
  MCPKanbanTasksUtility,
  MCPProductivityManager
} from '@/lib/utils/mongodb-mcp-integration';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import Note from '@/lib/database/models/Note';
import CalendarEvent from '@/lib/database/models/CalendarEvent';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import KanbanTask from '@/lib/database/models/KanbanTask';

// Mock database connection
jest.mock('@/lib/database/mongoose-connection');
const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;

// Mock models
jest.mock('@/lib/database/models/Note');
jest.mock('@/lib/database/models/CalendarEvent');
jest.mock('@/lib/database/models/KanbanBoard');
jest.mock('@/lib/database/models/KanbanTask');

const mockNote = Note as jest.Mocked<typeof Note>;
const mockCalendarEvent = CalendarEvent as jest.Mocked<typeof CalendarEvent>;
const mockKanbanBoard = KanbanBoard as jest.Mocked<typeof KanbanBoard>;
const mockKanbanTask = KanbanTask as jest.Mocked<typeof KanbanTask>;

describe('MongoDB MCP Integration', () => {
  const testUserId = 'mcp-test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  describe('MCPError', () => {
    it('should create MCP error with correct properties', () => {
      const error = new MCPError('Test error', 'TEST_ERROR', 400, { detail: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('MCPError');
    });

    it('should use default status code', () => {
      const error = new MCPError('Test error', 'TEST_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('MCPNotesUtility', () => {
    let notesUtility: MCPNotesUtility;

    beforeEach(() => {
      notesUtility = new MCPNotesUtility();
    });

    describe('findNotes', () => {
      it('should find notes successfully', async () => {
        const mockNotes = [
          { _id: 'note1', title: 'Test Note 1', userId: testUserId },
          { _id: 'note2', title: 'Test Note 2', userId: testUserId }
        ];

        mockNote.find = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          populate: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockNotes)
        });

        const result = await notesUtility.findNotes({}, { userId: testUserId });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockNotes);
        expect(result.metadata?.operation).toBe('findNotes');
        expect(result.metadata?.userId).toBe(testUserId);
      });

      it('should handle database connection errors', async () => {
        mockConnectToDatabase.mockRejectedValue(new Error('Connection failed'));

        const result = await notesUtility.findNotes({}, { userId: testUserId });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('CONNECTION_ERROR');
        expect(result.error?.message).toBe('Failed to connect to database');
      });
    });

    describe('createNote', () => {
      it('should create note successfully', async () => {
        const noteData = {
          title: 'New Note',
          content: 'Note content',
          color: 'info'
        };

        const mockSavedNote = {
          _id: 'new-note-id',
          ...noteData,
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        };

        mockNote.mockImplementation(() => mockSavedNote as any);

        const result = await notesUtility.createNote(noteData, testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSavedNote);
        expect(mockSavedNote.save).toHaveBeenCalled();
      });

      it('should handle validation errors', async () => {
        const noteData = { title: '', content: 'Content' };

        mockNote.mockImplementation(() => ({
          save: jest.fn().mockRejectedValue(new Error('Validation failed'))
        }) as any);

        const result = await notesUtility.createNote(noteData, testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('updateNote', () => {
      it('should update note successfully', async () => {
        const mockNote = {
          _id: 'note-id',
          title: 'Original Title',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        };

        Note.findById = jest.fn().mockResolvedValue(mockNote);

        const updateData = { title: 'Updated Title' };
        const result = await notesUtility.updateNote('note-id', updateData, testUserId);

        expect(result.success).toBe(true);
        expect(mockNote.title).toBe('Updated Title');
        expect(mockNote.save).toHaveBeenCalled();
      });

      it('should handle ownership validation', async () => {
        const mockNote = {
          _id: 'note-id',
          title: 'Note',
          userId: 'other-user'
        };

        Note.findById = jest.fn().mockResolvedValue(mockNote);

        const result = await notesUtility.updateNote('note-id', { title: 'Updated' }, testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('FORBIDDEN');
      });

      it('should handle non-existent note', async () => {
        Note.findById = jest.fn().mockResolvedValue(null);

        const result = await notesUtility.updateNote('non-existent', { title: 'Updated' }, testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
      });
    });

    describe('deleteNote', () => {
      it('should soft delete note by default', async () => {
        const mockNote = {
          _id: 'note-id',
          userId: testUserId,
          isDeleted: false,
          save: jest.fn().mockResolvedValue(true)
        };

        Note.findById = jest.fn().mockResolvedValue(mockNote);

        const result = await notesUtility.deleteNote('note-id', testUserId);

        expect(result.success).toBe(true);
        expect(mockNote.isDeleted).toBe(true);
        expect(mockNote.save).toHaveBeenCalled();
        expect(result.data?.message).toBe('Note moved to trash');
      });

      it('should permanently delete when requested', async () => {
        const mockNote = {
          _id: 'note-id',
          userId: testUserId
        };

        Note.findById = jest.fn().mockResolvedValue(mockNote);
        Note.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

        const result = await notesUtility.deleteNote('note-id', testUserId, true);

        expect(result.success).toBe(true);
        expect(Note.deleteOne).toHaveBeenCalledWith({ _id: 'note-id' });
        expect(result.data?.message).toBe('Note permanently deleted');
      });
    });

    describe('searchNotes', () => {
      it('should search notes successfully', async () => {
        const mockSearchResults = [
          { _id: 'note1', title: 'Search Result 1' }
        ];

        mockNote.searchNotes = jest.fn().mockResolvedValue(mockSearchResults);

        const result = await notesUtility.searchNotes('search query', testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSearchResults);
        expect(mockNote.searchNotes).toHaveBeenCalledWith('search query', testUserId);
      });
    });

    describe('getNotesStats', () => {
      it('should get notes statistics successfully', async () => {
        const mockStats = {
          total: 10,
          active: 8,
          deleted: 2,
          colorStats: { info: 5, warning: 3 }
        };

        mockNote.aggregate = jest.fn().mockResolvedValue([mockStats]);

        const result = await notesUtility.getNotesStats(testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
      });

      it('should handle empty statistics', async () => {
        mockNote.aggregate = jest.fn().mockResolvedValue([]);

        const result = await notesUtility.getNotesStats(testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ total: 0, active: 0, deleted: 0, colorStats: {} });
      });
    });
  });

  describe('MCPCalendarEventsUtility', () => {
    let eventsUtility: MCPCalendarEventsUtility;

    beforeEach(() => {
      eventsUtility = new MCPCalendarEventsUtility();
    });

    describe('findEventsByDateRange', () => {
      it('should find events by date range successfully', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const mockEvents = [
          { _id: 'event1', title: 'Event 1', startDate, endDate }
        ];

        mockCalendarEvent.findByDateRange = jest.fn().mockResolvedValue(mockEvents);

        const result = await eventsUtility.findEventsByDateRange(startDate, endDate, testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockEvents);
        expect(mockCalendarEvent.findByDateRange).toHaveBeenCalledWith(startDate, endDate, testUserId);
      });
    });

    describe('getUpcomingEvents', () => {
      it('should get upcoming events successfully', async () => {
        const mockEvents = [
          { _id: 'event1', title: 'Upcoming Event 1' },
          { _id: 'event2', title: 'Upcoming Event 2' }
        ];

        mockCalendarEvent.findUpcoming = jest.fn().mockResolvedValue(mockEvents);

        const result = await eventsUtility.getUpcomingEvents(testUserId, 5);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockEvents);
        expect(mockCalendarEvent.findUpcoming).toHaveBeenCalledWith(testUserId, 5);
      });
    });

    describe('getEventsStats', () => {
      it('should get events statistics successfully', async () => {
        const mockStats = {
          total: 15,
          upcoming: 5,
          past: 10,
          allDay: 3,
          withLocation: 8
        };

        mockCalendarEvent.aggregate = jest.fn().mockResolvedValue([mockStats]);

        const result = await eventsUtility.getEventsStats(testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
      });
    });
  });

  describe('MCPKanbanBoardsUtility', () => {
    let boardsUtility: MCPKanbanBoardsUtility;

    beforeEach(() => {
      boardsUtility = new MCPKanbanBoardsUtility();
    });

    describe('createDefaultBoard', () => {
      it('should create default board successfully', async () => {
        const mockBoard = {
          _id: 'board-id',
          name: 'My Board',
          columns: [
            { id: 'col1', name: 'Todo', order: 0 },
            { id: 'col2', name: 'Done', order: 1 }
          ],
          userId: testUserId
        };

        mockKanbanBoard.createDefaultBoard = jest.fn().mockResolvedValue(mockBoard);

        const result = await boardsUtility.createDefaultBoard(testUserId, 'My Board');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBoard);
        expect(mockKanbanBoard.createDefaultBoard).toHaveBeenCalledWith(testUserId, 'My Board');
      });
    });

    describe('deleteBoard', () => {
      it('should delete board and associated tasks', async () => {
        const mockBoard = {
          _id: 'board-id',
          userId: testUserId
        };

        mockKanbanBoard.findById = jest.fn().mockResolvedValue(mockBoard);
        mockKanbanTask.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
        mockKanbanBoard.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

        const result = await boardsUtility.deleteBoard('board-id', testUserId);

        expect(result.success).toBe(true);
        expect(mockKanbanTask.deleteMany).toHaveBeenCalledWith({ boardId: 'board-id', userId: testUserId });
        expect(mockKanbanBoard.deleteOne).toHaveBeenCalledWith({ _id: 'board-id' });
        expect(result.data?.message).toBe('Board and all associated tasks deleted successfully');
      });
    });

    describe('getBoardsWithTasks', () => {
      it('should get boards with tasks using aggregation', async () => {
        const mockBoardsWithTasks = [
          {
            _id: 'board1',
            name: 'Board 1',
            tasks: [
              { _id: 'task1', title: 'Task 1' },
              { _id: 'task2', title: 'Task 2' }
            ]
          }
        ];

        mockKanbanBoard.aggregate = jest.fn().mockResolvedValue(mockBoardsWithTasks);

        const result = await boardsUtility.getBoardsWithTasks(testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBoardsWithTasks);
      });
    });
  });

  describe('MCPKanbanTasksUtility', () => {
    let tasksUtility: MCPKanbanTasksUtility;

    beforeEach(() => {
      tasksUtility = new MCPKanbanTasksUtility();
    });

    describe('createTask', () => {
      it('should create task successfully', async () => {
        const mockBoard = {
          _id: 'board-id',
          userId: testUserId,
          columns: [
            { id: 'col1', name: 'Todo', order: 0 }
          ]
        };

        const taskData = {
          title: 'New Task',
          description: 'Task description',
          boardId: 'board-id',
          columnId: 'col1'
        };

        const mockSavedTask = {
          _id: 'task-id',
          ...taskData,
          userId: testUserId,
          order: 0,
          save: jest.fn().mockResolvedValue(true)
        };

        mockKanbanBoard.findById = jest.fn().mockResolvedValue(mockBoard);
        mockKanbanTask.findByColumn = jest.fn().mockResolvedValue([]);
        mockKanbanTask.mockImplementation(() => mockSavedTask as any);

        const result = await tasksUtility.createTask(taskData, testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSavedTask);
        expect(mockSavedTask.save).toHaveBeenCalled();
      });

      it('should handle board access validation', async () => {
        const taskData = {
          title: 'New Task',
          boardId: 'board-id',
          columnId: 'col1'
        };

        mockKanbanBoard.findById = jest.fn().mockResolvedValue(null);

        const result = await tasksUtility.createTask(taskData, testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('BOARD_ACCESS_DENIED');
      });

      it('should handle column validation', async () => {
        const mockBoard = {
          _id: 'board-id',
          userId: testUserId,
          columns: [
            { id: 'col1', name: 'Todo', order: 0 }
          ]
        };

        const taskData = {
          title: 'New Task',
          boardId: 'board-id',
          columnId: 'invalid-column'
        };

        mockKanbanBoard.findById = jest.fn().mockResolvedValue(mockBoard);

        const result = await tasksUtility.createTask(taskData, testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('COLUMN_NOT_FOUND');
      });
    });

    describe('moveTask', () => {
      it('should move task successfully', async () => {
        mockKanbanTask.moveTask = jest.fn().mockResolvedValue(true);

        const result = await tasksUtility.moveTask('task-id', 'new-column', 1, testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(mockKanbanTask.moveTask).toHaveBeenCalledWith('task-id', 'new-column', 1, testUserId);
      });
    });

    describe('getTasksStats', () => {
      it('should get tasks statistics successfully', async () => {
        const mockStats = {
          total: 20,
          columnStats: { 'col1': 10, 'col2': 10 },
          propertyStats: { 'Development': 15, 'Design': 5 }
        };

        mockKanbanTask.aggregate = jest.fn().mockResolvedValue([mockStats]);

        const result = await tasksUtility.getTasksStats(testUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
      });

      it('should filter by board when provided', async () => {
        const mockStats = { total: 5, columnStats: {}, propertyStats: {} };
        mockKanbanTask.aggregate = jest.fn().mockResolvedValue([mockStats]);

        const result = await tasksUtility.getTasksStats(testUserId, 'board-id');

        expect(result.success).toBe(true);
        expect(mockKanbanTask.aggregate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              $match: { userId: testUserId, boardId: 'board-id' }
            })
          ])
        );
      });
    });
  });

  describe('MCPProductivityManager', () => {
    let manager: MCPProductivityManager;

    beforeEach(() => {
      manager = new MCPProductivityManager();
    });

    describe('getProductivityStats', () => {
      it('should get comprehensive productivity statistics', async () => {
        // Mock individual utility responses
        manager.notes.getNotesStats = jest.fn().mockResolvedValue({
          success: true,
          data: { total: 10, active: 8, deleted: 2 }
        });

        manager.events.getEventsStats = jest.fn().mockResolvedValue({
          success: true,
          data: { total: 5, upcoming: 3, past: 2 }
        });

        manager.boards.findBoards = jest.fn().mockResolvedValue({
          success: true,
          data: [{ _id: 'board1' }, { _id: 'board2' }]
        });

        manager.tasks.getTasksStats = jest.fn().mockResolvedValue({
          success: true,
          data: { total: 15, columnStats: {} }
        });

        const result = await manager.getProductivityStats(testUserId);

        expect(result.success).toBe(true);
        expect(result.data?.notes).toEqual({ total: 10, active: 8, deleted: 2 });
        expect(result.data?.events).toEqual({ total: 5, upcoming: 3, past: 2 });
        expect(result.data?.boards).toEqual({ total: 2 });
        expect(result.data?.tasks).toEqual({ total: 15, columnStats: {} });
        expect(result.data?.summary.totalItems).toBe(32); // 10 + 5 + 2 + 15
      });

      it('should handle errors in getting statistics', async () => {
        mockConnectToDatabase.mockRejectedValue(new Error('Connection failed'));

        const result = await manager.getProductivityStats(testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STATS_ERROR');
      });
    });

    describe('searchAll', () => {
      it('should search across all productivity features', async () => {
        const mockNotesResults = [{ _id: 'note1', title: 'Search Note' }];
        const mockEventsResults = [{ _id: 'event1', title: 'Search Event' }];
        const mockBoardsResults = [{ _id: 'board1', name: 'Search Board' }];
        const mockTasksResults = [{ _id: 'task1', title: 'Search Task' }];

        manager.notes.searchNotes = jest.fn().mockResolvedValue({
          success: true,
          data: mockNotesResults
        });

        mockCalendarEvent.searchEvents = jest.fn().mockResolvedValue(mockEventsResults);
        mockKanbanBoard.searchBoards = jest.fn().mockResolvedValue(mockBoardsResults);
        mockKanbanTask.searchTasks = jest.fn().mockResolvedValue(mockTasksResults);

        const result = await manager.searchAll('search query', testUserId);

        expect(result.success).toBe(true);
        expect(result.data?.notes).toEqual(mockNotesResults);
        expect(result.data?.events).toEqual(mockEventsResults);
        expect(result.data?.boards).toEqual(mockBoardsResults);
        expect(result.data?.tasks).toEqual(mockTasksResults);
        expect(result.data?.summary.totalResults).toBe(4);
        expect(result.data?.summary.query).toBe('search query');
      });

      it('should handle search errors', async () => {
        mockConnectToDatabase.mockRejectedValue(new Error('Connection failed'));

        const result = await manager.searchAll('search query', testUserId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SEARCH_ERROR');
      });
    });
  });
});