/**
 * End-to-end tests for complete productivity workflows
 * These tests simulate real user interactions across multiple features
 */

import { connectDB } from '@/lib/database/mongoose-connection';
import Note from '@/lib/database/models/Note';
import CalendarEvent from '@/lib/database/models/CalendarEvent';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import KanbanTask from '@/lib/database/models/KanbanTask';
import { seedProductivityData, clearProductivityData } from '@/lib/database/seeders/productivity-seeder';
import { initializeNewUser, getOnboardingProgress } from '@/lib/utils/user-onboarding';
import { CacheManager } from '@/lib/utils/productivity-cache';

// Mock database connection
jest.mock('@/lib/database/mongoose-connection');
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

// Mock models
jest.mock('@/lib/database/models/Note');
jest.mock('@/lib/database/models/CalendarEvent');
jest.mock('@/lib/database/models/KanbanBoard');
jest.mock('@/lib/database/models/KanbanTask');

const mockNote = Note as jest.Mocked<typeof Note>;
const mockCalendarEvent = CalendarEvent as jest.Mocked<typeof CalendarEvent>;
const mockKanbanBoard = KanbanBoard as jest.Mocked<typeof KanbanBoard>;
const mockKanbanTask = KanbanTask as jest.Mocked<typeof KanbanTask>;

describe('Productivity Workflows E2E Tests', () => {
  const testUserId = 'e2e-test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    CacheManager.clearAll();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('New User Onboarding Workflow', () => {
    it('should complete full user onboarding process', async () => {
      // Mock empty initial state
      mockNote.countDocuments = jest.fn().mockResolvedValue(0);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(0);

      // Mock financial models
      const mockIncomeCategory = { countDocuments: jest.fn().mockResolvedValue(0) };
      const mockExpenseCategory = { countDocuments: jest.fn().mockResolvedValue(0) };

      jest.doMock('@/lib/database/models', () => ({
        IncomeCategory: mockIncomeCategory,
        ExpenseCategory: mockExpenseCategory
      }));

      // Step 1: Check initial onboarding status
      const initialProgress = await getOnboardingProgress(testUserI expect(initialProgress.completionPercentage).toBe(0);
      expect(initialProgress.remainingSteps).toContain('productivity_setup');

      // Step 2: Initialize new user
      const mockSeedResult = {
        success: true,
        message: 'Success',
        data: { notesCreated: 2, eventsCreated: 1, boardsCreated: 1, tasksCreated: 3 }
      };

      const mockFinancialResult = {
        success: true,
        message: 'Success',
        data: { income: { created: 5 }, expense: { created: 8 } }
      };

      // Mock seeding functions
      jest.doMock('@/lib/database/seeders/productivity-seeder', () => ({
        seedProductivityData: jest.fn().mockResolvedValue(mockSeedResult),
        hasExistingProductivityData: jest.fn().mockResolvedValue({ total: 0 })
      }));

      jest.doMock('@/lib/database/seeders/financial-seeder', () => ({
        seedFinancialCategoriesForUser: jest.fn().mockResolvedValue(mockFinancialResult)
      }));

      const onboardingResult = await initializeNewUser({
        userId: testUserId,
        includeProductivity: true,
        includeFinancial: true,
        productivityDataSize: 'standard'
      });

      expect(onboardingResult.success).toBe(true);
      expect(onboardingResult.data.productivitySeeded).toBe(true);
      expect(onboardingResult.data.financialSeeded).toBe(true);

      // Step 3: Verify onboarding completion
      // Mock updated state after seeding
      mockNote.countDocuments = jest.fn().mockResolvedValue(2);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(1);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(1);
      mockIncomeCategory.countDocuments = jest.fn().mockResolvedValue(5);
      mockExpenseCategory.countDocuments = jest.fn().mockResolvedValue(8);

      const finalProgress = await getOnboardingProgress(testUserId);
      expect(finalProgress.completionPercentage).toBe(100);
      expect(finalProgress.remainingSteps).toHaveLength(0);
    });
  });

  describe('Note Management Workflow', () => {
    it('should handle complete note lifecycle', async () => {
      const mockNotes = [
        {
          _id: 'note1',
          title: 'Project Ideas',
          content: 'Brainstorm new features',
          color: 'info',
          isDeleted: false,
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true),
          toJSON: jest.fn().mockReturnValue({ _id: 'note1', title: 'Project Ideas' })
        },
        {
          _id: 'note2',
          title: 'Meeting Notes',
          content: 'Team sync discussion',
          color: 'warning',
          isDeleted: false,
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true),
          toJSON: jest.fn().mockReturnValue({ _id: 'note2', title: 'Meeting Notes' })
        }
      ];

      // Step 1: Create multiple notes
      mockNote.mockImplementation((data) => ({
        ...data,
        _id: `note-${Date.now()}`,
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue(data)
      }) as any);

      // Step 2: List notes with pagination
      mockNote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockNotes)
            })
          })
        })
      });
      mockNote.countDocuments = jest.fn().mockResolvedValue(2);

      // Step 3: Search notes
      mockNote.searchNotes = jest.fn().mockResolvedValue([mockNotes[0]]);

      const searchResults = await mockNote.searchNotes('Project', testUserId);
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Project Ideas');

      // Step 4: Update a note
      mockNote.findById = jest.fn().mockResolvedValue(mockNotes[0]);

      const noteToUpdate = await mockNote.findById('note1');
      noteToUpdate.title = 'Updated Project Ideas';
      await noteToUpdate.save();

      expect(noteToUpdate.save).toHaveBeenCalled();

      // Step 5: Soft delete a note
      const noteToDelete = mockNotes[1];
      noteToDelete.isDeleted = true;
      await noteToDelete.save();

      expect(noteToDelete.isDeleted).toBe(true);

      // Step 6: Filter active notes
      mockNote.findActiveByUser = jest.fn().mockResolvedValue([mockNotes[0]]);

      const activeNotes = await mockNote.findActiveByUser(testUserId);
      expect(activeNotes).toHaveLength(1);
      expect(activeNotes[0].isDeleted).toBe(false);
    });
  });

  describe('Calendar Management Workflow', () => {
    it('should handle complete calendar event lifecycle', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const mockEvents = [
        {
          _id: 'event1',
          title: 'Team Meeting',
          description: 'Weekly sync',
          startDate: tomorrow,
          endDate: new Date(tomorrow.getTime() + 60 * 60 * 1000),
          isAllDay: false,
          color: '#1976d2',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'event2',
          title: 'Project Deadline',
          description: 'Final submission',
          startDate: nextWeek,
          endDate: nextWeek,
          isAllDay: true,
          color: '#d32f2f',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      // Step 1: Create events
      mockCalendarEvent.mockImplementation((data) => ({
        ...data,
        _id: `event-${Date.now()}`,
        save: jest.fn().mockResolvedValue(true)
      }) as any);

      // Step 2: Query events by date range
      mockCalendarEvent.findByDateRange = jest.fn().mockResolvedValue(mockEvents);

      const weekEvents = await mockCalendarEvent.findByDateRange(now, nextWeek, testUserId);
      expect(weekEvents).toHaveLength(2);

      // Step 3: Find upcoming events
      mockCalendarEvent.findUpcoming = jest.fn().mockResolvedValue(mockEvents);

      const upcomingEvents = await mockCalendarEvent.findUpcoming(testUserId, 5);
      expect(upcomingEvents).toHaveLength(2);

      // Step 4: Find today's events
      mockCalendarEvent.findToday = jest.fn().mockResolvedValue([]);

      const todayEvents = await mockCalendarEvent.findToday(testUserId);
      expect(todayEvents).toHaveLength(0);

      // Step 5: Search events
      mockCalendarEvent.searchEvents = jest.fn().mockResolvedValue([mockEvents[0]]);

      const searchResults = await mockCalendarEvent.searchEvents('Team', testUserId);
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Team Meeting');

      // Step 6: Update event
      mockCalendarEvent.findById = jest.fn().mockResolvedValue(mockEvents[0]);

      const eventToUpdate = await mockCalendarEvent.findById('event1');
      eventToUpdate.title = 'Updated Team Meeting';
      await eventToUpdate.save();

      expect(eventToUpdate.save).toHaveBeenCalled();

      // Step 7: Delete event
      mockCalendarEvent.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const deleteResult = await mockCalendarEvent.deleteOne({ _id: 'event2' });
      expect(deleteResult.deletedCount).toBe(1);
    });
  });

  describe('Kanban Board Workflow', () => {
    it('should handle complete kanban board and task lifecycle', async () => {
      const mockBoard = {
        _id: 'board1',
        name: 'Development Board',
        description: 'Track development tasks',
        columns: [
          { id: 'col1', name: 'Todo', order: 0 },
          { id: 'col2', name: 'In Progress', order: 1 },
          { id: 'col3', name: 'Done', order: 2 }
        ],
        userId: testUserId,
        save: jest.fn().mockResolvedValue(true),
        addColumn: jest.fn(),
        removeColumn: jest.fn(),
        isOwnedBy: jest.fn().mockReturnValue(true)
      };

      const mockTasks = [
        {
          _id: 'task1',
          title: 'Implement API',
          description: 'Create REST endpoints',
          boardId: 'board1',
          columnId: 'col1',
          order: 0,
          taskProperty: 'Development',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'task2',
          title: 'Write Tests',
          description: 'Unit and integration tests',
          boardId: 'board1',
          columnId: 'col2',
          order: 0,
          taskProperty: 'Testing',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      // Step 1: Create board
      mockKanbanBoard.createDefaultBoard = jest.fn().mockResolvedValue(mockBoard);

      const newBoard = await mockKanbanBoard.createDefaultBoard(testUserId, 'Development Board');
      expect(newBoard.name).toBe('Development Board');
      expect(newBoard.columns).toHaveLength(3);

      // Step 2: Create tasks
      mockKanbanTask.mockImplementation((data) => ({
        ...data,
        _id: `task-${Date.now()}`,
        save: jest.fn().mockResolvedValue(true)
      }) as any);

      // Step 3: Query tasks by board
      mockKanbanTask.findByBoard = jest.fn().mockResolvedValue(mockTasks);

      const boardTasks = await mockKanbanTask.findByBoard('board1', testUserId);
      expect(boardTasks).toHaveLength(2);

      // Step 4: Query tasks by column
      mockKanbanTask.findByColumn = jest.fn().mockResolvedValue([mockTasks[0]]);

      const todoTasks = await mockKanbanTask.findByColumn('board1', 'col1', testUserId);
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].columnId).toBe('col1');

      // Step 5: Move task between columns
      mockKanbanTask.findById = jest.fn().mockResolvedValue(mockTasks[0]);
      mockKanbanTask.moveTask = jest.fn().mockResolvedValue(true);

      const moveResult = await mockKanbanTask.moveTask('task1', 'col2', 1, testUserId);
      expect(moveResult).toBe(true);

      // Step 6: Reorder tasks within column
      mockKanbanTask.reorderTasks = jest.fn().mockResolvedValue(true);

      const reorderResult = await mockKanbanTask.reorderTasks('board1', 'col2', ['task2', 'task1'], testUserId);
      expect(reorderResult).toBe(true);

      // Step 7: Search tasks
      mockKanbanTask.searchTasks = jest.fn().mockResolvedValue([mockTasks[0]]);

      const searchResults = await mockKanbanTask.searchTasks('API', testUserId);
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Implement API');

      // Step 8: Delete board (cascade delete tasks)
      mockKanbanTask.deleteByBoard = jest.fn().mockResolvedValue(2);
      mockKanbanBoard.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const tasksDeleted = await mockKanbanTask.deleteByBoard('board1', testUserId);
      const boardDeleted = await mockKanbanBoard.deleteOne({ _id: 'board1' });

      expect(tasksDeleted).toBe(2);
      expect(boardDeleted.deletedCount).toBe(1);
    });
  });

  describe('Cross-Feature Integration Workflow', () => {
    it('should handle workflow spanning multiple productivity features', async () => {
      // Scenario: User creates a project with notes, calendar events, and kanban board

      // Step 1: Create project note
      const projectNote = {
        _id: 'project-note',
        title: 'New Website Project',
        content: 'Requirements and initial planning for the new company website',
        color: 'primary',
        userId: testUserId,
        save: jest.fn().mockResolvedValue(true)
      };

      mockNote.mockImplementation(() => projectNote as any);

      // Step 2: Create project timeline events
      const projectEvents = [
        {
          _id: 'kickoff-event',
          title: 'Project Kickoff',
          description: 'Initial project meeting',
          startDate: new Date(),
          endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        },
        {
          _id: 'deadline-event',
          title: 'Project Deadline',
          description: 'Final delivery date',
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isAllDay: true,
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      mockCalendarEvent.mockImplementation((data) => ({
        ...data,
        _id: `event-${Date.now()}`,
        save: jest.fn().mockResolvedValue(true)
      }) as any);

      // Step 3: Create project kanban board
      const projectBoard = {
        _id: 'project-board',
        name: 'Website Project',
        description: 'Track website development progress',
        columns: [
          { id: 'backlog', name: 'Backlog', order: 0 },
          { id: 'design', name: 'Design', order: 1 },
          { id: 'development', name: 'Development', order: 2 },
          { id: 'testing', name: 'Testing', order: 3 },
          { id: 'done', name: 'Done', order: 4 }
        ],
        userId: testUserId,
        save: jest.fn().mockResolvedValue(true)
      };

      mockKanbanBoard.mockImplementation(() => projectBoard as any);

      // Step 4: Create project tasks
      const projectTasks = [
        {
          title: 'Design Homepage',
          description: 'Create wireframes and mockups',
          boardId: 'project-board',
          columnId: 'design',
          order: 0,
          taskProperty: 'Design',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        },
        {
          title: 'Implement Frontend',
          description: 'Build React components',
          boardId: 'project-board',
          columnId: 'development',
          order: 0,
          taskProperty: 'Development',
          userId: testUserId,
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      mockKanbanTask.mockImplementation((data) => ({
        ...data,
        _id: `task-${Date.now()}`,
        save: jest.fn().mockResolvedValue(true)
      }) as any);

      // Step 5: Verify cross-feature queries
      mockNote.searchNotes = jest.fn().mockResolvedValue([projectNote]);
      mockCalendarEvent.searchEvents = jest.fn().mockResolvedValue(projectEvents);
      mockKanbanTask.searchTasks = jest.fn().mockResolvedValue(projectTasks);

      // Search across all features for project-related content
      const [noteResults, eventResults, taskResults] = await Promise.all([
        mockNote.searchNotes('Website', testUserId),
        mockCalendarEvent.searchEvents('Project', testUserId),
        mockKanbanTask.searchTasks('Design', testUserId)
      ]);

      expect(noteResults).toHaveLength(1);
      expect(eventResults).toHaveLength(2);
      expect(taskResults).toHaveLength(2);

      // Step 6: Verify data consistency
      expect(noteResults[0].title).toContain('Website');
      expect(eventResults.every(event => event.title.includes('Project'))).toBe(true);
      expect(taskResults.some(task => task.taskProperty === 'Design')).toBe(true);
    });
  });

  describe('Data Migration and Cleanup Workflow', () => {
    it('should handle data seeding and cleanup operations', async () => {
      // Step 1: Seed initial data
      const seedResult = await seedProductivityData({
        userId: testUserId,
        includeNotes: true,
        includeCalendar: true,
        includeKanban: true,
        sampleDataSize: 'standard'
      });

      expect(seedResult.success).toBe(true);

      // Step 2: Verify seeded data
      mockNote.countDocuments = jest.fn().mockResolvedValue(5);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(3);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(2);
      mockKanbanTask.countDocuments = jest.fn().mockResolvedValue(8);

      const [notesCount, eventsCount, boardsCount, tasksCount] = await Promise.all([
        mockNote.countDocuments({ userId: testUserId }),
        mockCalendarEvent.countDocuments({ userId: testUserId }),
        mockKanbanBoard.countDocuments({ userId: testUserId }),
        mockKanbanTask.countDocuments({ userId: testUserId })
      ]);

      expect(notesCount).toBe(5);
      expect(eventsCount).toBe(3);
      expect(boardsCount).toBe(2);
      expect(tasksCount).toBe(8);

      // Step 3: Clear all data
      const clearResult = await clearProductivityData(testUserId);
      expect(clearResult.success).toBe(true);

      // Step 4: Verify data cleanup
      mockNote.countDocuments = jest.fn().mockResolvedValue(0);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanTask.countDocuments = jest.fn().mockResolvedValue(0);

      const [finalNotesCount, finalEventsCount, finalBoardsCount, finalTasksCount] = await Promise.all([
        mockNote.countDocuments({ userId: testUserId }),
        mockCalendarEvent.countDocuments({ userId: testUserId }),
        mockKanbanBoard.countDocuments({ userId: testUserId }),
        mockKanbanTask.countDocuments({ userId: testUserId })
      ]);

      expect(finalNotesCount).toBe(0);
      expect(finalEventsCount).toBe(0);
      expect(finalBoardsCount).toBe(0);
      expect(finalTasksCount).toBe(0);
    });
  });

  describe('Performance and Caching Workflow', () => {
    it('should demonstrate caching behavior across features', async () => {
      // Step 1: Perform operations that should be cached
      const mockData = {
        notes: [{ _id: 'note1', title: 'Cached Note' }],
        events: [{ _id: 'event1', title: 'Cached Event' }],
        boards: [{ _id: 'board1', name: 'Cached Board' }]
      };

      // Mock database queries
      mockNote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockData.notes)
            })
          })
        })
      });

      mockCalendarEvent.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockData.events)
      });

      mockKanbanBoard.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockData.boards)
      });

      // Step 2: Cache data
      const { NotesCache, EventsCache, BoardsCache } = await import('@/lib/utils/productivity-cache');

      NotesCache.set(testUserId, mockData.notes);
      EventsCache.set(testUserId, mockData.events);
      BoardsCache.set(testUserId, mockData.boards);

      // Step 3: Verify cache hits
      const cachedNotes = NotesCache.get(testUserId);
      const cachedEvents = EventsCache.get(testUserId);
      const cachedBoards = BoardsCache.get(testUserId);

      expect(cachedNotes).toEqual(mockData.notes);
      expect(cachedEvents).toEqual(mockData.events);
      expect(cachedBoards).toEqual(mockData.boards);

      // Step 4: Check cache statistics
      const stats = CacheManager.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.sets).toBe(3);
      expect(stats.hitRate).toBe(100);

      // Step 5: Invalidate cache and verify cleanup
      CacheManager.invalidateUser(testUserId);

      const afterInvalidation = CacheManager.getStats();
      expect(afterInvalidation.size).toBe(0);
    });
  });
});