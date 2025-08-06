import { connectDB } from '../mongoose-connection';
import Note from '../models/Note';
import CalendarEvent from '../models/CalendarEvent';
import KanbanBoard from '../models/KanbanBoard';
import KanbanTask from '../models/KanbanTask';
import User from '../models/User';

// Import existing mock data
import NotesData from '../../../app/api/notes/NotesData';
import KanbanData from '../../../app/api/kanban/KanbanData';

/**
 * Migration utility to convert existing mock data to database format
 */
export class ProductivityMigration {

  /**
   * Migrate notes data for a specific user
   */
  static async migrateNotesForUser(userId: string): Promise<number> {
    try {
      await connectDB();

      // Check if user already has notes
      const existingNotes = await Note.countDocuments({ userId });
      if (existingNotes > 0) {
        console.log(`User ${userId} already has ${existingNotes} notes, skipping migration`);
        return 0;
      }

      const notesToMigrate = NotesData.filter(note => !note.deleted).map(note => ({
        title: note.title.substring(0, 200), // Ensure title fits within limit
        content: note.title, // Use title as content since mock data doesn't have separate content
        color: note.color as 'info' | 'error' | 'warning' | 'success' | 'primary',
        isDeleted: false,
        userId: userId,
        createdAt: new Date(note.datef),
        updatedAt: new Date(note.datef)
      }));

      if (notesToMigrate.length > 0) {
        await Note.insertMany(notesToMigrate);
        console.log(`Migrated ${notesToMigrate.length} notes for user ${userId}`);
      }

      return notesToMigrate.length;
    } catch (error) {
      console.error('Error migrating notes:', error);
      throw error;
    }
  }

  /**
   * Migrate kanban data for a specific user
   */
  static async migrateKanbanForUser(userId: string): Promise<{ boards: number; tasks: number }> {
    try {
      await connectDB();

      // Check if user already has boards
      const existingBoards = await KanbanBoard.countDocuments({ userId });
      if (existingBoards > 0) {
        console.log(`User ${userId} already has ${existingBoards} boards, skipping migration`);
        return { boards: 0, tasks: 0 };
      }

      // Create a single board with the mock data structure
      const boardData = {
        name: 'My Project Board',
        description: 'Migrated from existing kanban data',
        userId: userId,
        columns: KanbanData.map((category, index) => ({
          id: category.id,
          name: category.name,
          order: index
        }))
      };

      const board = new KanbanBoard(boardData);
      const savedBoard = await board.save();

      // Migrate tasks
      const tasksToMigrate: any[] = [];

      KanbanData.forEach((category) => {
        category.child.forEach((task, taskIndex) => {
          tasksToMigrate.push({
            title: task.task,
            description: task.taskText || null,
            taskImage: task.taskImage || null,
            date: task.date || null,
            taskProperty: task.taskProperty || null,
            boardId: (savedBoard._id as any).toString(),
            columnId: category.id,
            order: taskIndex,
            userId: userId
          });
        });
      });

      let migratedTasks = 0;
      if (tasksToMigrate.length > 0) {
        await KanbanTask.insertMany(tasksToMigrate);
        migratedTasks = tasksToMigrate.length;
        console.log(`Migrated ${migratedTasks} tasks for user ${userId}`);
      }

      console.log(`Migrated 1 board and ${migratedTasks} tasks for user ${userId}`);
      return { boards: 1, tasks: migratedTasks };
    } catch (error) {
      console.error('Error migrating kanban data:', error);
      throw error;
    }
  }

  /**
   * Create sample calendar events for a user
   */
  static async createSampleCalendarEvents(userId: string): Promise<number> {
    try {
      await connectDB();

      // Check if user already has events
      const existingEvents = await CalendarEvent.countDocuments({ userId });
      if (existingEvents > 0) {
        console.log(`User ${userId} already has ${existingEvents} events, skipping sample creation`);
        return 0;
      }

      const now = new Date();
      const sampleEvents = [
        {
          title: 'Team Meeting',
          description: 'Weekly team sync meeting',
          startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
          isAllDay: false,
          color: '#1976d2',
          location: 'Conference Room A',
          userId: userId
        },
        {
          title: 'Project Deadline',
          description: 'Final submission for Q1 project',
          startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
          endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Next week + 2 hours
          isAllDay: false,
          color: '#f44336',
          userId: userId
        },
        {
          title: 'All Day Workshop',
          description: 'Professional development workshop',
          startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // Two weeks from now
          endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000), // Two weeks + 1 day
          isAllDay: true,
          color: '#4caf50',
          location: 'Training Center',
          userId: userId
        }
      ];

      await CalendarEvent.insertMany(sampleEvents);
      console.log(`Created ${sampleEvents.length} sample calendar events for user ${userId}`);

      return sampleEvents.length;
    } catch (error) {
      console.error('Error creating sample calendar events:', error);
      throw error;
    }
  }

  /**
   * Migrate all productivity data for a specific user
   */
  static async migrateAllForUser(userId: string): Promise<{
    notes: number;
    boards: number;
    tasks: number;
    events: number;
  }> {
    try {
      console.log(`Starting productivity data migration for user ${userId}`);

      const [notesCount, kanbanResult, eventsCount] = await Promise.all([
        this.migrateNotesForUser(userId),
        this.migrateKanbanForUser(userId),
        this.createSampleCalendarEvents(userId)
      ]);

      const result = {
        notes: notesCount,
        boards: kanbanResult.boards,
        tasks: kanbanResult.tasks,
        events: eventsCount
      };

      console.log(`Migration completed for user ${userId}:`, result);
      return result;
    } catch (error) {
      console.error(`Error migrating data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Migrate data for all existing users
   */
  static async migrateAllUsers(): Promise<{
    usersProcessed: number;
    totalNotes: number;
    totalBoards: number;
    totalTasks: number;
    totalEvents: number;
  }> {
    try {
      await connectDB();

      // Get all active users
      const users = await User.find({ isActive: true }).select('_id');
      console.log(`Found ${users.length} active users to migrate`);

      let totalNotes = 0;
      let totalBoards = 0;
      let totalTasks = 0;
      let totalEvents = 0;

      for (const user of users) {
        try {
          const result = await this.migrateAllForUser((user._id as any).toString());
          totalNotes += result.notes;
          totalBoards += result.boards;
          totalTasks += result.tasks;
          totalEvents += result.events;
        } catch (error) {
          console.error(`Failed to migrate data for user ${user._id}:`, error);
          // Continue with other users
        }
      }

      const summary = {
        usersProcessed: users.length,
        totalNotes,
        totalBoards,
        totalTasks,
        totalEvents
      };

      console.log('Migration summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error migrating all users:', error);
      throw error;
    }
  }

  /**
   * Create default productivity data for a new user
   */
  static async initializeNewUser(userId: string): Promise<{
    boards: number;
    events: number;
  }> {
    try {
      console.log(`Initializing productivity data for new user ${userId}`);

      // Create a default board
      const board = await KanbanBoard.createDefaultBoard(userId, 'Getting Started');

      // Add a welcome task
      const welcomeTask = new KanbanTask({
        title: 'Welcome to your Kanban board!',
        description: 'This is your first task. You can edit, move, or delete it.',
        boardId: (board._id as any).toString(),
        columnId: board.columns[0].id, // First column (Todo)
        order: 0,
        userId: userId
      });
      await welcomeTask.save();

      // Create a sample calendar event
      const welcomeEvent = new CalendarEvent({
        title: 'Welcome to Calendar',
        description: 'This is a sample event to get you started',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isAllDay: false,
        color: '#1976d2',
        userId: userId
      });
      await welcomeEvent.save();

      console.log(`Initialized productivity data for user ${userId}`);
      return { boards: 1, events: 1 };
    } catch (error) {
      console.error(`Error initializing data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up all productivity data for a user (for testing)
   */
  static async cleanupUserData(userId: string): Promise<{
    notes: number;
    boards: number;
    tasks: number;
    events: number;
  }> {
    try {
      await connectDB();

      const [notesDeleted, boardsDeleted, tasksDeleted, eventsDeleted] = await Promise.all([
        Note.deleteMany({ userId }),
        KanbanBoard.deleteMany({ userId }),
        KanbanTask.deleteMany({ userId }),
        CalendarEvent.deleteMany({ userId })
      ]);

      const result = {
        notes: notesDeleted.deletedCount || 0,
        boards: boardsDeleted.deletedCount || 0,
        tasks: tasksDeleted.deletedCount || 0,
        events: eventsDeleted.deletedCount || 0
      };

      console.log(`Cleaned up productivity data for user ${userId}:`, result);
      return result;
    } catch (error) {
      console.error(`Error cleaning up data for user ${userId}:`, error);
      throw error;
    }
  }
}

export default ProductivityMigration;