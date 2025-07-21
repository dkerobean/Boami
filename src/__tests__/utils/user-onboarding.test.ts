import {
  initializeUserProductivityData,
  createDefaultKanbanBoard,
  getOnboardingRecommendations,
  generateOnboardingChecklist,
  generateWelcomeMessage,
  shouldShowOnboarding,
  OnboardingPreferences
} from '@/lib/utils/user-onboarding';
import {
  seedProductivityData,
  hasExistingProductivityData
} from '@/lib/database/seeders/productivity-seeder';

// Mock the seeder functions
jest.mock('@/lib/database/seeders/productivity-seeder');
const mockSeedProductivityData = seedProductivityData as jest.MockedFunction<typeof seedProductivityData>;
const mockHasExistingProductivityData = hasExistingProductivityData as jest.MockedFunction<typeof hasExistingProductivityData>;

describe('User Onboarding', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeUserProductivityData', () => {
    it('should initialize productivity data for new user', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: false,
        hasEvents: false,
        hasBoards: false,
        total: 0
      });

      mockSeedProductivityData.mockResolvedValue({
        success: true,
        message: 'Data seeded successfully',
        data: {
          notesCreated: 5,
          eventsCreated: 3,
          boardsCreated: 2,
          tasksCreated: 8
        }
      });

      const preferences: OnboardingPreferences = {
        sampleDataSize: 'standard'
      };

      const result = await initializeUserProductivityData(testUserId, preferences);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User productivity data initialized successfully');
      expect(result.seedingResult).toBeDefined();
      expect(result.skipped).toBeUndefined();

      expect(mockHasExistingProductivityData).toHaveBeenCalledWith(testUserId);
      expect(mockSeedProductivityData).toHaveBeenCalledWith({
        userId: testUserId,
        includeNotes: true,
        includeCalendar: true,
        includeKanban: true,
        sampleDataSize: 'standard'
      });
    });

    it('should skip initialization if user already has data', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: true,
        hasEvents: false,
        hasBoards: true,
        total: 5
      });

      const result = await initializeUserProductivityData(testUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User onboarding skipped - productivity data already exists');
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('User already has 5 productivity items');

      expect(mockSeedProductivityData).not.toHaveBeenCalled();
    });

    it('should initialize even with existing data when skipIfDataExists is false', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: true,
        hasEvents: false,
        hasBoards: false,
        total: 2
      });

      mockSeedProductivityData.mockResolvedValue({
        success: true,
        message: 'Data seeded successfully',
        data: {
          notesCreated: 3,
          eventsCreated: 2,
          boardsCreated: 1,
          tasksCreated: 4
        }
      });

      const preferences: OnboardingPreferences = {
        skipIfDataExists: false
      };

      const result = await initializeUserProductivityData(testUserId, preferences);

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(mockSeedProductivityData).toHaveBeenCalled();
    });

    it('should handle seeding failure', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: false,
        hasEvents: false,
        hasBoards: false,
        total: 0
      });

      mockSeedProductivityData.mockResolvedValue({
        success: false,
        message: 'Seeding failed',
        data: {
          notesCreated: 0,
          eventsCreated: 0,
          boardsCreated: 0,
          tasksCreated: 0
        },
        errors: ['Database error']
      });

      const result = await initializeUserProductivityData(testUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User productivity data initialization failed');
      expect(result.seedingResult?.success).toBe(false);
    });

    it('should handle unexpected errors', async () => {
      mockHasExistingProductivityData.mockRejectedValue(new Error('Database connection failed'));

      const result = await initializeUserProductivityData(testUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to initialize user productivity data');
      expect(result.reason).toBe('Database connection failed');
    });
  });

  describe('createDefaultKanbanBoard', () => {
    it('should create default Kanban board successfully', async () => {
      mockSeedProductivityData.mockResolvedValue({
        success: true,
        message: 'Kanban board created',
        data: {
          notesCreated: 0,
          eventsCreated: 0,
          boardsCreated: 1,
          tasksCreated: 2
        }
      });

      const result = await createDefaultKanbanBoard(testUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Default Kanban board created successfully');

      expect(mockSeedProductivityData).toHaveBeenCalledWith({
        userId: testUserId,
        includeNotes: false,
        includeCalendar: false,
        includeKanban: true,
        sampleDataSize: 'minimal'
      });
    });

    it('should handle Kanban board creation failure', async () => {
      mockSeedProductivityData.mockResolvedValue({
        success: false,
        message: 'Failed to create board',
        data: {
          notesCreated: 0,
          eventsCreated: 0,
          boardsCreated: 0,
          tasksCreated: 0
        }
      });

      const result = await createDefaultKanbanBoard(testUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create default Kanban board');
    });
  });

  describe('getOnboardingRecommendations', () => {
    it('should provide recommendations for new user', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: false,
        hasEvents: false,
        hasBoards: false,
        total: 0
      });

      const result = await getOnboardingRecommendations(testUserId);

      expect(result.shouldOnboard).toBe(true);
      expect(result.recommendations).toContain('Create your first note to capture important thoughts and ideas');
      expect(result.recommendations).toContain('Add calendar events to keep track of meetings and deadlines');
      expect(result.recommendations).toContain('Set up a Kanban board to organize your tasks and projects');
      expect(result.recommendations).toContain('Consider seeding sample data to explore all productivity features');
      expect(result.existingData.total).toBe(0);
    });

    it('should provide specific recommendations based on existing data', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: true,
        hasEvents: false,
        hasBoards: true,
        total: 3
      });

      const result = await getOnboardingRecommendations(testUserId);

      expect(result.shouldOnboard).toBe(false);
      expect(result.recommendations).not.toContain('Create your first note to capture important thoughts and ideas');
      expect(result.recommendations).toContain('Add calendar events to keep track of meetings and deadlines');
      expect(result.recommendations).not.toContain('Set up a Kanban board to organize your tasks and projects');
      expect(result.recommendations).not.toContain('Consider seeding sample data to explore all productivity features');
    });

    it('should handle errors gracefully', async () => {
      mockHasExistingProductivityData.mockRejectedValue(new Error('Database error'));

      const result = await getOnboardingRecommendations(testUserId);

      expect(result.shouldOnboard).toBe(false);
      expect(result.recommendations).toContain('Unable to load recommendations at this time');
      expect(result.existingData.total).toBe(0);
    });
  });

  describe('generateOnboardingChecklist', () => {
    it('should generate checklist for new user', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: false,
        hasEvents: false,
        hasBoards: false,
        total: 0
      });

      const result = await generateOnboardingChecklist(testUserId);

      expect(result.totalSteps).toBe(5);
      expect(result.completedSteps).toBe(0);
      expect(result.completionPercentage).toBe(0);

      const noteStep = result.steps.find(step => step.id === 'create-first-note');
      expect(noteStep?.completed).toBe(false);
      expect(noteStep?.title).toBe('Create Your First Note');
    });

    it('should generate checklist for user with some data', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: true,
        hasEvents: true,
        hasBoards: false,
        total: 8 // More than 5, so "explore features" should be completed
      });

      const result = await generateOnboardingChecklist(testUserId);

      expect(result.completedSteps).toBe(3); // notes, events, and explore features
      expect(result.completionPercentage).toBe(60); // 3/5 = 60%

      const noteStep = result.steps.find(step => step.id === 'create-first-note');
      const eventStep = result.steps.find(step => step.id === 'schedule-first-event');
      const boardStep = result.steps.find(step => step.id === 'create-kanban-board');
      const exploreStep = result.steps.find(step => step.id === 'explore-features');

      expect(noteStep?.completed).toBe(true);
      expect(eventStep?.completed).toBe(true);
      expect(boardStep?.completed).toBe(false);
      expect(exploreStep?.completed).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockHasExistingProductivityData.mockRejectedValue(new Error('Database error'));

      const result = await generateOnboardingChecklist(testUserId);

      expect(result.steps).toHaveLength(0);
      expect(result.completedSteps).toBe(0);
      expect(result.totalSteps).toBe(0);
      expect(result.completionPercentage).toBe(0);
    });
  });

  describe('generateWelcomeMessage', () => {
    it('should generate welcome message with user name', () => {
      const result = generateWelcomeMessage('John');

      expect(result.title).toBe('Welcome to Productivity Features, John!');
      expect(result.message).toContain('We\'re excited to help you stay organized');
      expect(result.tips).toContain('Start with Notes to capture quick thoughts and ideas');
      expect(result.tips).toContain('Use Calendar to keep track of important dates and meetings');
      expect(result.tips).toContain('Create Kanban boards to organize projects and tasks visually');
    });

    it('should generate welcome message without user name', () => {
      const result = generateWelcomeMessage();

      expect(result.title).toBe('Welcome to Productivity Features, there!');
      expect(result.message).toContain('We\'re excited to help you stay organized');
      expect(result.tips.length).toBeGreaterThan(0);
    });
  });

  describe('shouldShowOnboarding', () => {
    it('should return true for new user', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: false,
        hasEvents: false,
        hasBoards: false,
        total: 0
      });

      const result = await shouldShowOnboarding(testUserId);

      expect(result).toBe(true);
    });

    it('should return false for user with existing data', async () => {
      mockHasExistingProductivityData.mockResolvedValue({
        hasNotes: true,
        hasEvents: false,
        hasBoards: false,
        total: 2
      });

      const result = await shouldShowOnboarding(testUserId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockHasExistingProductivityData.mockRejectedValue(new Error('Database error'));

      const result = await shouldShowOnboarding(testUserId);

      expect(result).toBe(false);
    });
  });
});