import {
  seedProductivityData,
  hasExistingProductivityData,
  clearProductivityData
} from '@/lib/database/seeders/productivity-seeder';
import {
  initializeNewUser,
  checkOnboardingStatus,
  getOnboardingProgress,
  createDefaultKanbanBoard
} from '@/lib/utils/user-onboarding';
import { connectToDatabase } from '@/lib/database/connection';
import { Note } from '@/lib/database/models/Note';
import { CalendarEvent } from '@/lib/database/models/CalendarEvent';
import { KanbanBoard } from '@/lib/database/models/KanbanBoard';
import { KanbanTask } from '@/lib/database/models/KanbanTask';

// Mock the database connection
jest.mock('@/lib/database/connection');
const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;

// Mock the models
jest.mock('@/lib/database/models/Note');
jest.mock('@/lib/database/models/CalendarEvent');
jest.mock('@/lib/database/models/KanbanBoard');
jest.mock('@/lib/database/models/KanbanTask');

const mockNote = Note as jest.Mocked<typeof Note>;
const mockCalendarEvent = CalendarEvent as jest.Mocked<typeof CalendarEvent>;
const mockKanbanBoard = KanbanBoard as jest.Mocked<typeof KanbanBoard>;
const mockKanbanTask = KanbanTask as jest.Mocked<typeof KanbanTask>;

describe('Productivity Seeding', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  describe('hasExistingProductivityData', () => {
    it('should return correct counts for existing data', async () => {
      // Mock model counts
      mockNote.countDocuments = jest.fn().mockResolvedValue(5);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(3);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await hasExistingProductivityData(testUserId);

      expect(result).toEqual({
        hasNotes: true,
        hasEvents: true,
        hasBoards: true,
        total: 10
      });

      expect(mockNote.countDocuments).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockCalendarEvent.countDocuments).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockKanbanBoard.countDocuments).toHaveBeenCalledWith({ userId: testUserId });
    });

    it('should return false for empty data', async () => {
      // Mock empty counts
      mockNote.countDocuments = jest.fn().mockResolvedValue(0);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await hasExistingProductivityData(testUserId);

      expect(result).toEqual({
        hasNotes: false,
        hasEvents: false,
        hasBoards: false,
        total: 0
      });
    });
  });

  describe('seedProductivityData', () => {
    beforeEach(() => {
      // Mock successful insertMany operations
      mockNote.insertMany = jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }]);
      mockCalendarEvent.insertMany = jest.fn().mockResolvedValue([{ _id: '1' }]);
      mockKanbanBoard.create = jest.fn().mockResolvedValue({ _id: 'board1' });
      mockKanbanTask.insertMany = jest.fn().mockResolvedValue([{ _id: 'task1' }]);
    });

    it('should seed all productivity data successfully', async () => {
      const options = {
        userId: testUserId,
        includeNotes: true,
        includeCalendar: true,
        includeKanban: true,
        sampleDataSize: 'standard' as const
      };

      const result = await seedProductivityData(options);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Productivity data seeded successfully');
      expect(result.data.notesCreated).toBe(2);
      expect(result.data.eventsCreated).toBe(1);
      expect(result.data.boardsCreated).toBeGreaterThan(0);
      expect(result.data.tasksCreated).toBeGreaterThan(0);
    });

    it('should handle partial seeding when some features are disabled', async () => {
      const options = {
        userId: testUserId,
        includeNotes: true,
        includeCalendar: false,
        includeKanban: false,
        sampleDataSize: 'minimal' as const
      };

      const result= await seedProductivityData(options);

      expect(result.success).toBe(true);
      expect(result.data.notesCreated).toBe(2);
      expect(result.data.eventsCreated).toBe(0);
      expect(result.data.boardsCreated).toBe(0);
      expect(result.data.tasksCreated).toBe(0);
    });

    it('should handle seeding errors gracefully', async () => {
      // Mock an error in notes seeding
      mockNote.insertMany = jest.fn().mockRejectedValue(new Error('Database error'));

      const options = {
        userId: testUserId,
        includeNotes: true,
        includeCalendar: true,
        includeKanban: true,
        sampleDataSize: 'standard' as const
      };

      const result = await seedProductivityData(options);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Productivity data seeding completed with errors');
      expect(result.errors).toContain('Notes seeding failed: Database error');
    });
  });

  describe('clearProductivityData', () => {
    it('should clear all productivity data successfully', async () => {
      // Mock successful deleteMany operations
      mockNote.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
      mockCalendarEvent.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });
      mockKanbanTask.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 8 });
      mockKanbanBoard.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });

      const result = await clearProductivityData(testUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Productivity data cleared successfully');
      expect(result.data.notesCreated).toBe(-5);
      expect(result.data.eventsCreated).toBe(-3);
      expect(result.data.boardsCreated).toBe(-2);
      expect(result.data.tasksCreated).toBe(-8);
    });
  });
});

describe('User Onboarding', () => {
  const testUserId = 'test-user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  describe('checkOnboardingStatus', () => {
    it('should identify user needing onboarding', async () => {
      // Mock empty data
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

      const result = await checkOnboardingStatus(testUserId);

      expect(result.needsOnboarding).toBe(true);
      expect(result.hasProductivityData).toBe(false);
      expect(result.hasFinancialData).toBe(false);
      expect(result.recommendations).toContain('Set up productivity features (Notes, Calendar, Kanban)');
      expect(result.recommendations).toContain('Initialize financial categories');
    });

    it('should identify completed onboarding', async () => {
      // Mock existing data
      mockNote.countDocuments = jest.fn().mockResolvedValue(2);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(1);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(1);

      // Mock financial models with data
      const mockIncomeCategory = { countDocuments: jest.fn().mockResolvedValue(5) };
      const mockExpenseCategory = { countDocuments: jest.fn().mockResolvedValue(8) };

      jest.doMock('@/lib/database/models', () => ({
        IncomeCategory: mockIncomeCategory,
        ExpenseCategory: mockExpenseCategory
      }));

      const result = await checkOnboardingStatus(testUserId);

      expect(result.needsOnboarding).toBe(false);
      expect(result.hasProductivityData).toBe(true);
      expect(result.hasFinancialData).toBe(true);
      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe('getOnboardingProgress', () => {
    it('should calculate correct progress percentage', async () => {
      // Mock partial completion
      mockNote.countDocuments = jest.fn().mockResolvedValue(1);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(1);

      // Mock financial models
      const mockIncomeCategory = { countDocuments: jest.fn().mockResolvedValue(5) };
      const mockExpenseCategory = { countDocuments: jest.fn().mockResolvedValue(0) };

      jest.doMock('@/lib/database/models', () => ({
        IncomeCategory: mockIncomeCategory,
        ExpenseCategory: mockExpenseCategory
      }));

      const result = await getOnboardingProgress(testUserId);

      expect(result.completionPercentage).toBeGreaterThan(0);
      expect(result.completionPercentage).toBeLessThan(100);
      expect(result.completedSteps).toContain('productivity_setup');
      expect(result.completedSteps).toContain('financial_setup');
      expect(result.completedSteps).toContain('first_note');
      expect(result.completedSteps).toContain('first_kanban_board');
      expect(result.remainingSteps).toContain('first_event');
    });
  });

  describe('createDefaultKanbanBoard', () => {
    it('should create default board for new user', async () => {
      // Mock no existing boards
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanBoard.createDefaultBoard = jest.fn().mockResolvedValue({
        _id: 'new-board-id'
      });

      const result = await createDefaultKanbanBoard(testUserId);

      expect(result.success).toBe(true);
      expect(result.boardId).toBe('new-board-id');
      expect(result.message).toBe('Default Kanban board created successfully');
      expect(mockKanbanBoard.createDefaultBoard).toHaveBeenCalledWith(testUserId, 'My First Board');
    });

    it('should not create board if user already has boards', async () => {
      // Mock existing boards
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await createDefaultKanbanBoard(testUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User already has Kanban boards');
      expect(mockKanbanBoard.createDefaultBoard).not.toHaveBeenCalled();
    });
  });

  describe('initializeNewUser', () => {
    it('should initialize all user data successfully', async () => {
      // Mock successful seeding
      const mockSeedProductivityData = jest.fn().mockResolvedValue({
        success: true,
        message: 'Success',
        data: { notesCreated: 2, eventsCreated: 1, boardsCreated: 1, tasksCreated: 3 }
      });

      const mockSeedFinancialCategories = jest.fn().mockResolvedValue({
        success: true,
        message: 'Success',
        data: { income: { created: 5 }, expense: { created: 8 } }
      });

      // Mock the seeding functions
      jest.doMock('@/lib/database/seeders/productivity-seeder', () => ({
        seedProductivityData: mockSeedProductivityData,
        hasExistingProductivityData: jest.fn().mockResolvedValue({ total: 0 })
      }));

      jest.doMock('@/lib/database/seeders/financial-seeder', () => ({
        seedFinancialCategoriesForUser: mockSeedFinancialCategories
      }));

      const options = {
        userId: testUserId,
        includeProductivity: true,
        includeFinancial: true,
        productivityDataSize: 'minimal' as const,
        skipIfExists: true
      };

      const result = await initializeNewUser(options);

      expect(result.success).toBe(true);
      expect(result.data.productivitySeeded).toBe(true);
      expect(result.data.financialSeeded).toBe(true);
      expect(result.data.details.productivity?.notesCreated).toBe(2);
      expect(result.data.details.financial?.categoriesCreated).toBe(13);
    });
  });
});