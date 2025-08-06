import { connectDB } from '../mongoose-connection';
import Note from '../models/Note';
import CalendarEvent from '../models/CalendarEvent';
import KanbanBoard from '../models/KanbanBoard';
import KanbanTask from '../models/KanbanTask';

/**
 * Productivity data seeder for initializing user data
 */

export interface SeedingOptions {
  userId: string;
  includeNotes?: boolean;
  includeCalendar?: boolean;
  includeKanban?: boolean;
  sampleDataSize?: 'minimal' | 'standard' | 'extensive';
}

export interface SeedingResult {
  success: boolean;
  message: string;
  data: {
    notesCreated: number;
    eventsCreated: number;
    boardsCreated: number;
    tasksCreated: number;
  };
  errors?: string[];
}

/**
 * Seed productivity data for a new user
 */
export async function seedProductivityData(options: SeedingOptions): Promise<SeedingResult> {
  try {
    await connectDB();

    const result: SeedingResult = {
      success: true,
      message: 'Productivity data seeded successfully',
      data: {
        notesCreated: 0,
        eventsCreated: 0,
        boardsCreated: 0,
        tasksCreated: 0
      }
    };

    const errors: string[] = [];

    // Seed Notes
    if (options.includeNotes !== false) {
      try {
        const notesCount = await seedNotes(options.userId, options.sampleDataSize || 'standard');
        result.data.notesCreated = notesCount;
      } catch (error) {
        errors.push(`Notes seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Seed Calendar Events
    if (options.includeCalendar !== false) {
      try {
        const eventsCount = await seedCalendarEvents(options.userId, options.sampleDataSize || 'standard');
        result.data.eventsCreated = eventsCount;
      } catch (error) {
        errors.push(`Calendar seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Seed Kanban Boards and Tasks
    if (options.includeKanban !== false) {
      try {
        const kanbanResult = await seedKanbanData(options.userId, options.sampleDataSize || 'standard');
        result.data.boardsCreated = kanbanResult.boardsCreated;
        result.data.tasksCreated = kanbanResult.tasksCreated;
      } catch (error) {
        errors.push(`Kanban seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      result.success = false;
      result.message = 'Productivity data seeding completed with errors';
      result.errors = errors;
    }

    return result;

  } catch (error) {
    console.error('Productivity seeding error:', error);
    return {
      success: false,
      message: 'Failed to seed productivity data',
      data: {
        notesCreated: 0,
        eventsCreated: 0,
        boardsCreated: 0,
        tasksCreated: 0
      },
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Seed sample notes for a user
 */
async function seedNotes(userId: string, size: 'minimal' | 'standard' | 'extensive'): Promise<number> {
  const sampleNotes = getSampleNotes(size);

  const notes = sampleNotes.map(note => ({
    ...note,
    userId,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
    updatedAt: new Date()
  }));

  const createdNotes = await Note.insertMany(notes);
  return createdNotes.length;
}

/**
 * Seed sample calendar events for a user
 */
async function seedCalendarEvents(userId: string, size: 'minimal' | 'standard' | 'extensive'): Promise<number> {
  const sampleEvents = getSampleCalendarEvents(size);

  const events = sampleEvents.map(event => ({
    ...event,
    userId,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const createdEvents = await CalendarEvent.insertMany(events);
  return createdEvents.length;
}

/**
 * Seed sample kanban boards and tasks for a user
 */
async function seedKanbanData(userId: string, size: 'minimal' | 'standard' | 'extensive'): Promise<{ boardsCreated: number; tasksCreated: number }> {
  const sampleBoards = getSampleKanbanBoards(size);
  let totalTasksCreated = 0;

  const createdBoards = [];

  for (const boardData of sampleBoards) {
    // Create board
    const board = await KanbanBoard.create({
      name: boardData.name,
      description: boardData.description,
      columns: boardData.columns,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    createdBoards.push(board);

    // Create tasks for this board
    if (boardData.tasks && boardData.tasks.length > 0) {
      const tasks = boardData.tasks.map(task => ({
        ...task,
        boardId: (board._id as any).toString(),
        userId,
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random date within last 14 days
        updatedAt: new Date()
      }));

      const createdTasks = await KanbanTask.insertMany(tasks);
      totalTasksCreated += createdTasks.length;
    }
  }

  return {
    boardsCreated: createdBoards.length,
    tasksCreated: totalTasksCreated
  };
}

/**
 * Get sample notes based on size preference
 */
function getSampleNotes(size: 'minimal' | 'standard' | 'extensive') {
  const minimalNotes = [
    {
      title: 'Welcome to Notes!',
      content: 'This is your first note. You can create, edit, and organize your thoughts here.',
      color: 'info'
    },
    {
      title: 'Getting Started',
      content: 'Try creating your own notes to keep track of important information, ideas, and reminders.',
      color: 'success'
    }
  ];

  const standardNotes = [
    ...minimalNotes,
    {
      title: 'Project Ideas',
      content: 'Brainstorm new project ideas:\n- Mobile app for productivity\n- Website redesign\n- API improvements\n- User experience enhancements',
      color: 'warning'
    },
    {
      title: 'Meeting Notes',
      content: 'Team meeting - January 2024:\n- Discussed quarterly goals\n- Reviewed project timeline\n- Assigned action items\n- Next meeting scheduled for next week',
      color: 'primary'
    },
    {
      title: 'Important Reminders',
      content: 'Don\'t forget:\n- Submit monthly report\n- Review code changes\n- Update documentation\n- Schedule team retrospective',
      color: 'error'
    }
  ];

  const extensiveNotes = [
    ...standardNotes,
    {
      title: 'Learning Resources',
      content: 'Useful learning materials:\n- Online courses on React and TypeScript\n- Documentation for Next.js\n- Best practices for API design\n- UI/UX design principles',
      color: 'info'
    },
    {
      title: 'Code Snippets',
      content: 'Useful code snippets:\n```javascript\n// API error handling\ntry {\n  const response = await fetch(\'/api/data\');\n  const data = await response.json();\n} catch (error) {\n  console.error(error);\n}\n```',
      color: 'primary'
    },
    {
      title: 'Book Recommendations',
      content: 'Books to read:\n- Clean Code by Robert Martin\n- The Pragmatic Programmer\n- Design Patterns\n- System Design Interview',
      color: 'success'
    },
    {
      title: 'Travel Plans',
      content: 'Upcoming travel:\n- Conference in San Francisco\n- Team retreat in Austin\n- Vacation planning for summer\n- Check passport expiration',
      color: 'warning'
    }
  ];

  switch (size) {
    case 'minimal':
      return minimalNotes;
    case 'extensive':
      return extensiveNotes;
    default:
      return standardNotes;
  }
}

/**
 * Get sample calendar events based on size preference
 */
function getSampleCalendarEvents(size: 'minimal' | 'standard' | 'extensive') {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const minimalEvents = [
    {
      title: 'Welcome Meeting',
      description: 'Introduction to the productivity features',
      startDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      endDate: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
      isAllDay: false,
      color: '#1976d2'
    }
  ];

  const standardEvents = [
    ...minimalEvents,
    {
      title: 'Team Standup',
      description: 'Daily team synchronization meeting',
      startDate: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000), // 9 AM tomorrow
      endDate: new Date(tomorrow.getTime() + 9.5 * 60 * 60 * 1000), // 9:30 AM tomorrow
      isAllDay: false,
      color: '#2e7d32'
    },
    {
      title: 'Project Review',
      description: 'Monthly project review and planning session',
      startDate: new Date(nextWeek.getTime() + 14 * 60 * 60 * 1000), // 2 PM next week
      endDate: new Date(nextWeek.getTime() + 16 * 60 * 60 * 1000), // 4 PM next week
      isAllDay: false,
      color: '#ed6c02',
      location: 'Conference Room A'
    }
  ];

  const extensiveEvents = [
    ...standardEvents,
    {
      title: 'Code Review Session',
      description: 'Review recent code changes and discuss improvements',
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 10 AM in 3 days
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), // 11 AM in 3 days
      isAllDay: false,
      color: '#9c27b0'
    },
    {
      title: 'Client Presentation',
      description: 'Present project progress to client stakeholders',
      startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 3 PM in 5 days
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 16.5 * 60 * 60 * 1000), // 4:30 PM in 5 days
      isAllDay: false,
      color: '#d32f2f',
      location: 'Client Office'
    },
    {
      title: 'Team Building Event',
      description: 'Annual team building and social event',
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // Same day
      isAllDay: true,
      color: '#388e3c'
    }
  ];

  switch (size) {
    case 'minimal':
      return minimalEvents;
    case 'extensive':
      return extensiveEvents;
    default:
      return standardEvents;
  }
}

/**
 * Get sample kanban boards based on size preference
 */
function getSampleKanbanBoards(size: 'minimal' | 'standard' | 'extensive') {
  const minimalBoards = [
    {
      name: 'Getting Started',
      description: 'Your first Kanban board to help you get organized',
      columns: [
        { id: 'todo', name: 'To Do', order: 0 },
        { id: 'progress', name: 'In Progress', order: 1 },
        { id: 'done', name: 'Done', order: 2 }
      ],
      tasks: [
        {
          title: 'Explore Kanban Features',
          description: 'Learn how to use the Kanban board effectively',
          columnId: 'todo',
          order: 0,
          taskProperty: 'Learning',
          date: new Date().toISOString().split('T')[0]
        },
        {
          title: 'Create Your First Task',
          description: 'Add a new task to get started with project management',
          columnId: 'progress',
          order: 0,
          taskProperty: 'Setup',
          date: new Date().toISOString().split('T')[0]
        }
      ]
    }
  ];

  const standardBoards = [
    ...minimalBoards,
    {
      name: 'Web Development Project',
      description: 'Track progress on the new website development',
      columns: [
        { id: 'backlog', name: 'Backlog', order: 0 },
        { id: 'todo', name: 'To Do', order: 1 },
        { id: 'progress', name: 'In Progress', order: 2 },
        { id: 'review', name: 'Review', order: 3 },
        { id: 'done', name: 'Done', order: 4 }
      ],
      tasks: [
        {
          title: 'Design Homepage Layout',
          description: 'Create wireframes and mockups for the homepage',
          columnId: 'todo',
          order: 0,
          taskProperty: 'Design',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          title: 'Implement User Authentication',
          description: 'Set up login and registration functionality',
          columnId: 'progress',
          order: 0,
          taskProperty: 'Development',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          title: 'Set up Database Schema',
          description: 'Design and implement the database structure',
          columnId: 'done',
          order: 0,
          taskProperty: 'Development',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]
    }
  ];

  const extensiveBoards = [
    ...standardBoards,
    {
      name: 'Marketing Campaign',
      description: 'Plan and execute the Q1 marketing campaign',
      columns: [
        { id: 'ideas', name: 'Ideas', order: 0 },
        { id: 'planning', name: 'Planning', order: 1 },
        { id: 'execution', name: 'Execution', order: 2 },
        { id: 'review', name: 'Review', order: 3 }
      ],
      tasks: [
        {
          title: 'Social Media Strategy',
          description: 'Develop comprehensive social media marketing strategy',
          columnId: 'planning',
          order: 0,
          taskProperty: 'Marketing',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          title: 'Content Calendar',
          description: 'Create monthly content calendar for all platforms',
          columnId: 'ideas',
          order: 0,
          taskProperty: 'Content',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]
    },
    {
      name: 'Personal Tasks',
      description: 'Keep track of personal goals and tasks',
      columns: [
        { id: 'someday', name: 'Someday', order: 0 },
        { id: 'this-week', name: 'This Week', order: 1 },
        { id: 'today', name: 'Today', order: 2 },
        { id: 'completed', name: 'Completed', order: 3 }
      ],
      tasks: [
        {
          title: 'Learn TypeScript',
          description: 'Complete online TypeScript course',
          columnId: 'this-week',
          order: 0,
          taskProperty: 'Learning',
          date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          title: 'Update Resume',
          description: 'Add recent projects and skills to resume',
          columnId: 'today',
          order: 0,
          taskProperty: 'Career',
          date: new Date().toISOString().split('T')[0]
        }
      ]
    }
  ];

  switch (size) {
    case 'minimal':
      return minimalBoards;
    case 'extensive':
      return extensiveBoards;
    default:
      return standardBoards;
  }
}

/**
 * Check if user already has productivity data
 */
export async function hasExistingProductivityData(userId: string): Promise<{
  hasNotes: boolean;
  hasEvents: boolean;
  hasBoards: boolean;
  total: number;
}> {
  await connectDB();

  const [notesCount, eventsCount, boardsCount] = await Promise.all([
    Note.countDocuments({ userId }),
    CalendarEvent.countDocuments({ userId }),
    KanbanBoard.countDocuments({ userId })
  ]);

  return {
    hasNotes: notesCount > 0,
    hasEvents: eventsCount > 0,
    hasBoards: boardsCount > 0,
    total: notesCount + eventsCount + boardsCount
  };
}

/**
 * Clear all productivity data for a user (for testing/reset purposes)
 */
export async function clearProductivityData(userId: string): Promise<SeedingResult> {
  try {
    await connectDB();

    const [notesDeleted, eventsDeleted, tasksDeleted, boardsDeleted] = await Promise.all([
      Note.deleteMany({ userId }),
      CalendarEvent.deleteMany({ userId }),
      KanbanTask.deleteMany({ userId }),
      KanbanBoard.deleteMany({ userId })
    ]);

    return {
      success: true,
      message: 'Productivity data cleared successfully',
      data: {
        notesCreated: -notesDeleted.deletedCount,
        eventsCreated: -eventsDeleted.deletedCount,
        boardsCreated: -boardsDeleted.deletedCount,
        tasksCreated: -tasksDeleted.deletedCount
      }
    };

  } catch (error) {
    console.error('Clear productivity data error:', error);
    return {
      success: false,
      message: 'Failed to clear productivity data',
      data: {
        notesCreated: 0,
        eventsCreated: 0,
        boardsCreated: 0,
        tasksCreated: 0
      },
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}