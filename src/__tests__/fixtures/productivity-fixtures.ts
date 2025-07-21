/**
 * Test fixtures for productivity features
 * Provides consistent test data across all test suites
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface TestNote {
  _id?: string;
  title: string;
  content: string;
  color: 'info' | 'error' | 'warning' | 'success' | 'primary';
  isDeleted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  color?: string;
  location?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestKanbanBoard {
  _id?: string;
  name: string;
  description?: string;
  columns: Array<{
    id: string;
    name: string;
    order: number;
  }>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestKanbanTask {
  _id?: string;
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
 * Test users for different scenarios
 */
export const TestUsers: Record<string, TestUser> = {
  alice: {
    id: 'user-alice-123',
    email: 'alice@example.com',
    name: 'Alice Johnson'
  },
  bob: {
    id: 'user-bob-456',
    email: 'bob@example.com',
    name: 'Bob Smith'
  },
  charlie: {
    id: 'user-charlie-789',
    email: 'charlie@example.com',
    name: 'Charlie Brown'
  }
};

/**
 * Sample notes for testing
 */
export const createTestNotes = (userId: string): TestNote[] => [
  {
    _id: 'note-1',
    title: 'Project Planning',
    content: 'Initial project planning and requirements gathering. Need to define scope, timeline, and resources.',
    color: 'primary',
    isDeleted: false,
    userId,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  },
  {
    _id: 'note-2',
    title: 'Meeting Notes - Team Sync',
    content: 'Weekly team synchronization meeting:\n- Discussed current sprint progress\n- Identified blockers\n- Planned next week activities',
    color: 'info',
    isDeleted: false,
    userId,
    createdAt: new Date('2024-01-02T14:30:00Z'),
    updatedAt: new Date('2024-01-02T14:30:00Z')
  },
  {
    _id: 'note-3',
    title: 'Important Reminders',
    content: 'Things to remember:\n- Submit monthly report by Friday\n- Review code changes\n- Update documentation',
    color: 'warning',
    isDeleted: false,
    userId,
    createdAt: new Date('2024-01-03T09:15:00Z'),
    updatedAt: new Date('2024-01-03T09:15:00Z')
  },
  {
    _id: 'note-4',
    title: 'Completed Tasks',
    content: 'Successfully completed:\n- API endpoint implementation\n- Unit test coverage\n- Code review process',
    color: 'success',
    isDeleted: false,
    userId,
    createdAt: new Date('2024-01-04T16:45:00Z'),
    updatedAt: new Date('2024-01-04T16:45:00Z')
  },
  {
    _id: 'note-5',
    title: 'Deleted Note',
    content: 'This note has been deleted',
    color: 'error',
    isDeleted: true,
    userId,
    createdAt: new Date('2024-01-05T11:20:00Z'),
    updatedAt: new Date('2024-01-05T12:00:00Z')
  }
];

/**
 * Sample calendar events for testing
 */
export const createTestCalendarEvents = (userId: string): TestCalendarEvent[] => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return [
    {
      _id: 'event-1',
      title: 'Team Standup',
      description: 'Daily team synchronization meeting',
      startDate: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000), // 9 AM tomorrow
      endDate: new Date(tomorrow.getTime() + 9.5 * 60 * 60 * 1000), // 9:30 AM tomorrow
      isAllDay: false,
      color: '#1976d2',
      location: 'Conference Room A',
      userId,
      createdAt: now,
      updatedAt: now
    },
    {
      _id: 'event-2',
      title: 'Project Review',
      description: 'Monthly project review and planning session',
      startDate: new Date(nextWeek.getTime() + 14 * 60 * 60 * 1000), // 2 PM next week
      endDate: new Date(nextWeek.getTime() + 16 * 60 * 60 * 1000), // 4 PM next week
      isAllDay: false,
      color: '#ed6c02',
      location: 'Conference Room B',
      userId,
      createdAt: now,
      updatedAt: now
    },
    {
      _id: 'event-3',
      title: 'All Day Workshop',
      description: 'Full day training workshop on new technologies',
      startDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days after next week
      endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000), // Same day
      isAllDay: true,
      color: '#2e7d32',
      location: 'Training Center',
      userId,
      createdAt: now,
      updatedAt: now
    },
    {
      _id: 'event-4',
      title: 'Past Meeting',
      description: 'This meeting already happened',
      startDate: new Date(lastWeek.getTime() + 10 * 60 * 60 * 1000), // 10 AM last week
      endDate: new Date(lastWeek.getTime() + 11 * 60 * 60 * 1000), // 11 AM last week
      isAllDay: false,
      color: '#9c27b0',
      userId,
      createdAt: lastWeek,
      updatedAt: lastWeek
    }
  ];
};

/**
 * Sample kanban boards for testing
 */
export const createTestKanbanBoards = (userId: string): TestKanbanBoard[] => [
  {
    _id: 'board-1',
    name: 'Development Project',
    description: 'Track development tasks and progress',
    columns: [
      { id: 'col-1', name: 'Backlog', order: 0 },
      { id: 'col-2', name: 'Todo', order: 1 },
      { id: 'col-3', name: 'In Progress', order: 2 },
      { id: 'col-4', name: 'Review', order: 3 },
      { id: 'col-5', name: 'Done', order: 4 }
    ],
    userId,
    createdAt: new Date('2024-01-01T08:00:00Z'),
    updatedAt: new Date('2024-01-01T08:00:00Z')
  },
  {
    _id: 'board-2',
    name: 'Marketing Campaign',
    description: 'Plan and execute marketing activities',
    columns: [
      { id: 'col-6', name: 'Ideas', order: 0 },
      { id: 'col-7', name: 'Planning', order: 1 },
      { id: 'col-8', name: 'Execution', order: 2 },
      { id: 'col-9', name: 'Review', order: 3 }
    ],
    userId,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z')
  }
];

/**
 * Sample kanban tasks for testing
 */
export const createTestKanbanTasks = (userId: string, boards: TestKanbanBoard[]): TestKanbanTask[] => [
  // Tasks for Development Project board
  {
    _id: 'task-1',
    title: 'Design Database Schema',
    description: 'Create ERD and define table structures',
    boardId: boards[0]._id!,
    columnId: 'col-5', // Done
    order: 0,
    taskProperty: 'Database',
    date: '2024-01-01',
    userId,
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T09:00:00Z')
  },
  {
    _id: 'task-2',
    title: 'Implement User Authentication',
    description: 'Set up login, registration, and JWT handling',
    boardId: boards[0]._id!,
    columnId: 'col-3', // In Progress
    order: 0,
    taskProperty: 'Backend',
    date: '2024-01-05',
    userId,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z')
  },
  {
    _id: 'task-3',
    title: 'Create API Documentation',
    description: 'Document all REST endpoints with examples',
    boardId: boards[0]._id!,
    columnId: 'col-2', // Todo
    order: 0,
    taskProperty: 'Documentation',
    date: '2024-01-10',
    userId,
    createdAt: new Date('2024-01-03T11:00:00Z'),
    updatedAt: new Date('2024-01-03T11:00:00Z')
  },
  {
    _id: 'task-4',
    title: 'Frontend Component Library',
    description: 'Build reusable React components',
    boardId: boards[0]._id!,
    columnId: 'col-1', // Backlog
    order: 0,
    taskProperty: 'Frontend',
    userId,
    createdAt: new Date('2024-01-04T12:00:00Z'),
    updatedAt: new Date('2024-01-04T12:00:00Z')
  },
  // Tasks for Marketing Campaign board
  {
    _id: 'task-5',
    title: 'Social Media Strategy',
    description: 'Develop comprehensive social media plan',
    boardId: boards[1]._id!,
    columnId: 'col-7', // Planning
    order: 0,
    taskProperty: 'Strategy',
    date: '2024-01-15',
    userId,
    createdAt: new Date('2024-01-05T13:00:00Z'),
    updatedAt: new Date('2024-01-05T13:00:00Z')
  },
  {
    _id: 'task-6',
    title: 'Content Calendar',
    description: 'Create monthly content schedule',
    boardId: boards[1]._id!,
    columnId: 'col-6', // Ideas
    order: 0,
    taskProperty: 'Content',
    userId,
    createdAt: new Date('2024-01-06T14:00:00Z'),
    updatedAt: new Date('2024-01-06T14:00:00Z')
  }
];

/**
 * Create complete test dataset for a user
 */
export const createTestDataset = (userId: string) => {
  const notes = createTestNotes(userId);
  const events = createTestCalendarEvents(userId);
  const boards = createTestKanbanBoards(userId);
  const tasks = createTestKanbanTasks(userId, boards);

  return {
    notes,
    events,
    boards,
    tasks
  };
};

/**
 * Mock model factory for creating test doubles
 */
export class MockModelFactory {
  static createNoteMock(data: Partial<TestNote> = {}) {
    return {
      _id: data._id || 'mock-note-id',
      title: data.title || 'Mock Note',
      content: data.content || 'Mock content',
      color: data.color || 'info',
      isDeleted: data.isDeleted || false,
      userId: data.userId || 'mock-user-id',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue(data),
      isOwnedBy: jest.fn().mockReturnValue(true),
      softDelete: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue(undefined),
      isActive: jest.fn().mockReturnValue(!data.isDeleted)
    };
  }

  static createEventMock(data: Partial<TestCalendarEvent> = {}) {
    const now = new Date();
    return {
      _id: data._id || 'mock-event-id',
      title: data.title || 'Mock Event',
      description: data.description || 'Mock description',
      startDate: data.startDate || now,
      endDate: data.endDate || new Date(now.getTime() + 60 * 60 * 1000),
      isAllDay: data.isAllDay || false,
      color: data.color || '#1976d2',
      location: data.location,
      userId: data.userId || 'mock-user-id',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue(data),
      isOwnedBy: jest.fn().mockReturnValue(true),
      getDuration: jest.fn().mockReturnValue(60),
      isUpcoming: jest.fn().mockReturnValue(true),
      isPast: jest.fn().mockReturnValue(false),
      isToday: jest.fn().mockReturnValue(false),
      overlaps: jest.fn().mockReturnValue(false)
    };
  }

  static createBoardMock(data: Partial<TestKanbanBoard> = {}) {
    return {
      _id: data._id || 'mock-board-id',
      name: data.name || 'Mock Board',
      description: data.description || 'Mock description',
      columns: data.columns || [
        { id: 'col-1', name: 'Todo', order: 0 },
        { id: 'col-2', name: 'Done', order: 1 }
      ],
      userId: data.userId || 'mock-user-id',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue(data),
      isOwnedBy: jest.fn().mockReturnValue(true),
      addColumn: jest.fn().mockReturnValue({ id: 'new-col', name: 'New Column', order: 2 }),
      removeColumn: jest.fn().mockReturnValue(true),
      updateColumn: jest.fn().mockReturnValue(true),
      reorderColumns: jest.fn().mockReturnValue(true),
      getColumn: jest.fn().mockReturnValue(null),
      getColumnCount: jest.fn().mockReturnValue(2)
    };
  }

  static createTaskMock(data: Partial<TestKanbanTask> = {}) {
    return {
      _id: data._id || 'mock-task-id',
      title: data.title || 'Mock Task',
      description: data.description || 'Mock description',
      taskImage: data.taskImage,
      date: data.date,
      taskProperty: data.taskProperty || 'General',
      boardId: data.boardId || 'mock-board-id',
      columnId: data.columnId || 'mock-column-id',
      order: data.order || 0,
      userId: data.userId || 'mock-user-id',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue(data),
      isOwnedBy: jest.fn().mockReturnValue(true),
      belongsToBoard: jest.fn().mockReturnValue(true),
      belongsToColumn: jest.fn().mockReturnValue(true),
      moveToColumn: jest.fn(),
      updateOrder: jest.fn(),
      hasImage: jest.fn().mockReturnValue(!!data.taskImage),
      getFormattedDate: jest.fn().mockReturnValue(data.date || null)
    };
  }
}

/**
 * Test utilities for common operations
 */
export class TestUtils {
  /**
   * Create a mock NextRequest for testing
   */
  static createMockRequest(url: string, options: RequestInit = {}) {
    return new Request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
  }

  /**
   * Create mock authentication result
   */
  static createMockAuthResult(userId?: string, success: boolean = true) {
    return {
      success,
      userId: success ? (userId || 'mock-user-id') : null
    };
  }

  /**
   * Create mock pagination options
   */
  static createMockPaginationOptions(overrides: any = {}) {
    return {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
      ...overrides
    };
  }

  /**
   * Create mock pagination result
   */
  static createMockPaginationResult<T>(data: T[], total: number, page: number = 1, limit: number = 10) {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Wait for a specified amount of time (for testing async operations)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random date within a range
   */
  static generateRandomDate(start: Date = new Date(2024, 0, 1), end: Date = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

export default {
  TestUsers,
  createTestNotes,
  createTestCalendarEvents,
  createTestKanbanBoards,
  createTestKanbanTasks,
  createTestDataset,
  MockModelFactory,
  TestUtils
};