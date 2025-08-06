import {
  seedProductivityData,
  hasExistingProductivityData,
  clearProductivityData,
  SeedingOptions
} from '@/lib/database/seeders/productivity-seeder';
import { connectDB } from '@/lib/database/connection';
import Note from '@/lib/database/models/Note';
import CalendarEvent from '@/lib/database/models/CalendarEvent';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import KanbanTask from '@/lib/database/models/KanbanTask';

// Mock the database connection
jest.mock('@/lib/database/connection');
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

// Mock the models
jest.mock('@/lib/database/models/Note');
jest.mock('@/lib/database/models/CalendarEvent');
jest.mock('@/lib/database/models/KanbanBoard');
jest.mock('@/lib/database/models/KanbanTask');

const mockNote = Note as jest.Mocked<typeof Note>;
const mockCalendarEvent = CalendarEvent as jest.Mocked<typeof CalendarEvent>;
const mockKanbanBoard = KanbanBoard as jest.Mocked<typeof KanbanBoard>;
const mockKanbanTask = KanbanTask as jest.Mocked<typeof KanbanTask>;

describe('Productivity Seeder', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('seedProductivityData', () => {
    it('should seed all productivity data with standard size', async () => {
      // Mock successful insertions
      mockNote.insertMany = jest.fn().mockResolvedValue([{}, {}, {}, {}, {}]); // 5 notes
      mockCalendarEvent.insertMany = jest.fn().mockResolvedValue([{}, {}, {}]); // 3 events
      mockKanbanBoard.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'board1' })
        .mockResolvedValueOnce({ _id: 'board2' });
      mockKanbanTask.insertMany = jest.fn()
        .mockResolvedValueOnce([{}, {}]) // 2 tasks for board1
        .mockResolvedValueOnce([{}, {}, {}]); // 3 tasks for board2

      const options: SeedingOptions = {
        userId: testUserId,
        sampleDataSize: 'standard'
      };

      const result = await seedProductivityData(options);

      expect(result.success).toBe(true);
      expect(result.data.notesCreated).toBe(5);
      expect(result.data.eventsCreated).toBe(3);
      expect(result.data.boardsCreated).toBe(2);
      expect(result.data.tasksCreated).toBe(5);
      expect(mockConnectDB).toHaveBeenCalled();
    });

    it('should seed only notes when other features are disabled', async () => {
      mockNote.insertMany = jest.fn().mockResolvedValue([{}, {}]); // 2 notes

      const options: SeedingOptions = {
        userId: testUserId,
        includeNotes: true,
        includeCalendar: false,
        includeKanban: false,
        sampleDataSize: 'minimal'
      };

      const result = await seedProductivityData(options);

      expect(result.success).toBe(true);
      expect(result.data.notesCreated).toBe(2);
      expect(result.data.eventsCreated).toBe(0);
      expect(result.data.boardsCreated).toBe(0);
      expect(result.data.tasksCreated).toBe(0);
 expect(mockNote.insertMany).toHaveBeenCalled();
      expect(mockCalendarEvent.insertMany).not.toHaveBeenCalled();
      expect(mockKanbanBoard.create).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      mockNote.insertMany = jest.fn().mockResolvedValue([{}, {}]); // 2 notes
      mockCalendarEvent.insertMany = jest.fn().mockRejectedValue(new Error('Calendar error'));
      mockKanbanBoard.create = jest.fn().mockResolvedValue({ _id: 'board1' });
      mockKanbanTask.insertMany = jest.fn().mockResolvedValue([{}]); // 1 task

      const options: SeedingOptions = {
        userId: testUserId,
        sampleDataSize: 'standard'
      };

      const result = await seedProductivityData(options);

      expect(result.success).toBe(false);
      expect(result.data.notesCreated).toBe(2);
      expect(result.data.eventsCreated).toBe(0);
      expect(result.data.boardsCreated).toBe(1);
      expect(result.data.tasksCreated).toBe(1);
      expect(result.errors).toContain('Calendar seeding failed: Calendar error');
    });

    it('should handle complete failure', async () => {
      mockConnectDB.mockRejectedValue(new Error('Database connection failed'));

      const options: SeedingOptions = {
        userId: testUserId
      };

      const result = await seedProductivityData(options);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to seed productivity data');
      expect(result.errors).toContain('Database connection failed');
    });

    it('should seed different amounts based on size preference', async () => {
      // Test minimal size
      mockNote.insertMany = jest.fn().mockResolvedValue([{}, {}]); // 2 notes for minimal
      mockCalendarEvent.insertMany = jest.fn().mockResolvedValue([{}]); // 1 event for minimal
      mockKanbanBoard.create = jest.fn().mockResolvedValue({ _id: 'board1' });
      mockKanbanTask.insertMany = jest.fn().mockResolvedValue([{}, {}]); // 2 tasks for minimal

      const minimalOptions: SeedingOptions = {
        userId: testUserId,
        sampleDataSize: 'minimal'
      };

      const result = await seedProductivityData(minimalOptions);

      expect(result.success).toBe(true);
      expect(result.data.notesCreated).toBe(2);
      expect(result.data.eventsCreated).toBe(1);
      expect(result.data.boardsCreated).toBe(1);
      expect(result.data.tasksCreated).toBe(2);
    });
  });

  describe('hasExistingProductivityData', () => {
    it('should return correct counts for existing data', async () => {
      mockNote.countDocuments = jest.fn().mockResolvedValue(5);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(3);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await hasExistingProductivityData(testUserId);

      expect(result.hasNotes).toBe(true);
      expect(result.hasEvents).toBe(true);
      expect(result.hasBoards).toBe(true);
      expect(result.total).toBe(10);
      expect(mockNote.countDocuments).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockCalendarEvent.countDocuments).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockKanbanBoard.countDocuments).toHaveBeenCalledWith({ userId: testUserId });
    });

    it('should return false for all when no data exists', async () => {
      mockNote.countDocuments = jest.fn().mockResolvedValue(0);
      mockCalendarEvent.countDocuments = jest.fn().mockResolvedValue(0);
      mockKanbanBoard.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await hasExistingProductivityData(testUserId);

      expect(result.hasNotes).toBe(false);
      expect(result.hasEvents).toBe(false);
      expect(result.hasBoards).toBe(false);
      expect(result.total).toBe(0);
    });
  });

  describe('clearProductivityData', () => {
    it('should clear all productivity data successfully', async () => {
      mockNote.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
      mockCalendarEvent.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });
      mockKanbanTask.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 8 });
      mockKanbanBoard.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });

      const result = await clearProductivityData(testUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Productivity data cleared successfully');
      expect(result.data.notesCreated).toBe(-5);
      expect(result.data.eventsCreated).toBe(-3);
      expect(result.data.tasksCreated).toBe(-8);
      expect(result.data.boardsCreated).toBe(-2);

      expect(mockNote.deleteMany).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockCalendarEvent.deleteMany).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockKanbanTask.deleteMany).toHaveBeenCalledWith({ userId: testUserId });
      expect(mockKanbanBoard.deleteMany).toHaveBeenCalledWith({ userId: testUserId });
    });

    it('should handle clear operation failure', async () => {
      mockConnectDB.mockRejectedValue(new Error('Database connection failed'));

      const result = await clearProductivityData(testUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to clear productivity data');
      expect(result.errors).toContain('Database connection failed');
    });
  });

  describe('Sample Data Generation', () => {
    it('should generate appropriate sample data for different sizes', async () => {
      // Test that different sizes generate different amounts of data
      mockNote.insertMany = jest.fn()
        .mockResolvedValueOnce([{}, {}]) // minimal: 2 notes
        .mockResolvedValueOnce([{}, {}, {}, {}, {}]) // standard: 5 notes
        .mockResolvedValueOnce(new Array(9).fill({})); // extensive: 9 notes

      // Test minimal
      await seedProductivityData({ userId: testUserId, sampleDataSize: 'minimal', includeCalendar: false, includeKanban: false });
      expect(mockNote.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Welcome to Notes!' }),
          expect.objectContaining({ title: 'Getting Started' })
        ])
      );

      // Test standard
      await seedProductivityData({ userId: testUserId, sampleDataSize: 'standard', includeCalendar: false, includeKanban: false });
      expect(mockNote.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Welcome to Notes!' }),
          expect.objectContaining({ title: 'Project Ideas' }),
          expect.objectContaining({ title: 'Meeting Notes' })
        ])
      );

      // Test extensive
      await seedProductivityData({ userId: testUserId, sampleDataSize: 'extensive', includeCalendar: false, includeKanban: false });
      expect(mockNote.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Learning Resources' }),
          expect.objectContaining({ title: 'Code Snippets' }),
          expect.objectContaining({ title: 'Travel Plans' })
        ])
      );
    });
  });
});