import { notificationService } from '../notification-service';
import { KanbanTask, User } from '../../database/models';
import { connectToDatabase } from '../../database/mongoose-connection';

export interface TaskNotificationData {
  _id: string;
  title: string;
  description: string;
  date: string;
  taskProperty: string;
  userId?: string;
  assignedTo?: string;
  createdBy?: string;
  status?: string;
  boardId?: string;
  columnId?: string;
}

export class TaskMonitor {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private processedDeadlines = new Set<string>();

  /**
   * Start monitoring task deadlines
   */
  startDeadlineMonitoring(intervalMinutes: number = 60): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkUpcomingDeadlines();
      } catch (error) {
        console.error('Task deadline monitoring error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Task deadline monitoring started (checking every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop monitoring task deadlines
   */
  stopDeadlineMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Task deadline monitoring stopped');
  }

  /**
   * Handle task assignment notification
   */
  async onTaskAssigned(taskData: TaskNotificationData): Promise<void> {
    try {
      await connectToDatabase();

      // Find the assigned user
      let assignedUser;
      if (taskData.assignedTo) {
        if (taskData.assignedTo.includes('@')) {
          assignedUser = await User.findOne({ email: taskData.assignedTo });
        } else {
          assignedUser = await User.findById(taskData.assignedTo);
        }
      } else if (taskData.userId) {
        assignedUser = await User.findById(taskData.userId);
      }

      if (!assignedUser) {
        console.warn(`Assigned user not found for task ${taskData.title}`);
        return;
      }

      // Find who assigned the task
      let assignedBy = 'System';
      if (taskData.createdBy) {
        const creator = await User.findOne({ email: taskData.createdBy });
        if (creator) {
          assignedBy = creator.getFullName();
        }
      }

      await notificationService.triggerNotification({
        type: 'task_assigned',
        userId: assignedUser._id.toString(),
        data: {
          task: {
            ...taskData,
            assignedBy
          }
        },
        priority: 'medium'
      });

      console.log(`Task assignment notification sent to ${assignedUser.email} for task: ${taskData.title}`);
    } catch (error) {
      console.error('Failed to send task assignment notification:', error);
    }
  }

  /**
   * Handle task status change notification
   */
  async onTaskStatusChanged(taskData: TaskNotificationData, oldStatus: string): Promise<void> {
    try {
      await connectToDatabase();

      // Only notify on completion for now
      if (taskData.status !== 'completed' && taskData.status !== 'done') {
        return;
      }

      // Find the task creator to notify them of completion
      let creator;
      if (taskData.createdBy) {
        creator = await User.findOne({ email: taskData.createdBy });
      }

      if (!creator) {
        console.warn(`Task creator not found for task ${taskData.title}`);
        return;
      }

      // Find who completed the task
      let completedBy = 'Unknown';
      if (taskData.userId) {
        const user = await User.findById(taskData.userId);
        if (user) {
          completedBy = user.getFullName();
        }
      }

      await notificationService.triggerNotification({
        type: 'task_completed',
        userId: creator._id.toString(),
        data: {
          task: {
            ...taskData,
            completedBy,
            oldStatus
          }
        },
        priority: 'low'
      });

      console.log(`Task completion notification sent to ${creator.email} for task: ${taskData.title}`);
    } catch (error) {
      console.error('Failed to send task completion notification:', error);
    }
  }

  /**
   * Check for upcoming task deadlines
   */
  async checkUpcomingDeadlines(): Promise<TaskNotificationData[]> {
    try {
      await connectToDatabase();

      // Get tasks due in the next 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingTasks = await KanbanTask.find({
        date: {
          $gte: today.toISOString().split('T')[0],
          $lte: tomorrow.toISOString().split('T')[0]
        }
      });

      const tasksToNotify: TaskNotificationData[] = [];

      for (const task of upcomingTasks) {
        const taskKey = `${task._id}-${task.date}`;

        // Skip if we've already sent a deadline reminder for this task
        if (this.processedDeadlines.has(taskKey)) {
          continue;
        }

        // Find the assigned user
        let assignedUser;
        if (task.userId) {
          assignedUser = await User.findById(task.userId);
        }

        if (!assignedUser) {
          console.warn(`Assigned user not found for task ${task.title}`);
          continue;
        }

        const taskData: TaskNotificationData = {
          _id: task._id.toString(),
          title: task.title,
          description: task.description,
          date: task.date,
          taskProperty: task.taskProperty,
          userId: task.userId,
          boardId: task.boardId,
          columnId: task.columnId
        };

        await notificationService.triggerNotification({
          type: 'task_deadline',
          userId: assignedUser._id.toString(),
          data: { task: taskData },
          priority: 'high'
        });

        tasksToNotify.push(taskData);

        // Mark as processed
        this.processedDeadlines.add(taskKey);

        // Clean up old processed deadlines (keep for 48 hours)
        setTimeout(() => {
          this.processedDeadlines.delete(taskKey);
        }, 48 * 60 * 60 * 1000);

        console.log(`Deadline reminder sent to ${assignedUser.email} for task: ${task.title}`);
      }

      return tasksToNotify;
    } catch (error) {
      console.error('Failed to check upcoming deadlines:', error);
      return [];
    }
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(): Promise<TaskNotificationData[]> {
    try {
      await connectToDatabase();

      const today = new Date().toISOString().split('T')[0];

      const tasks = await KanbanTask.find({ date: today });

      return tasks.map(task => ({
        _id: task._id.toString(),
        title: task.title,
        description: task.description,
        date: task.date,
        taskProperty: task.taskProperty,
        userId: task.userId,
        boardId: task.boardId,
        columnId: task.columnId
      }));
    } catch (error) {
      console.error('Failed to get tasks due today:', error);
      return [];
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<TaskNotificationData[]> {
    try {
      await connectToDatabase();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const tasks = await KanbanTask.find({
        date: { $lt: yesterdayStr }
      });

      return tasks.map(task => ({
        _id: task._id.toString(),
        title: task.title,
        description: task.description,
        date: task.date,
        taskProperty: task.taskProperty,
        userId: task.userId,
        boardId: task.boardId,
        columnId: task.columnId
      }));
    } catch (error) {
      console.error('Failed to get overdue tasks:', error);
      return [];
    }
  }

  /**
   * Send daily task summary to users
   */
  async sendDailyTaskSummary(): Promise<void> {
    try {
      await connectToDatabase();

      // Get all users with tasks
      const users = await User.find({ isActive: true });

      for (const user of users) {
        const userTasks = await KanbanTask.find({ userId: user._id.toString() });

        if (userTasks.length === 0) continue;

        const today = new Date().toISOString().split('T')[0];
        const tasksDueToday = userTasks.filter(task => task.date === today);
        const overdueTasks = userTasks.filter(task => task.date < today);

        if (tasksDueToday.length > 0 || overdueTasks.length > 0) {
          await notificationService.triggerNotification({
            type: 'task_assigned', // Reuse template for summary
            userId: user._id.toString(),
            data: {
              task: {
                title: 'Daily Task Summary',
                description: `You have ${tasksDueToday.length} tasks due today and ${overdueTasks.length} overdue tasks.`,
                date: today,
                taskProperty: 'Summary',
                tasksDueToday: tasksDueToday.length,
                overdueTasks: overdueTasks.length
              }
            },
            priority: 'low'
          });
        }
      }

      console.log('Daily task summaries sent');
    } catch (error) {
      console.error('Failed to send daily task summaries:', error);
    }
  }

  /**
   * Test task notification system
   */
  async testTaskNotification(userId: string, type: 'assigned' | 'deadline' | 'completed'): Promise<void> {
    const testTask: TaskNotificationData = {
      _id: 'test-task-id',
      title: 'Test Task Notification',
      description: 'This is a test task notification',
      date: new Date().toISOString().split('T')[0],
      taskProperty: 'High Priority',
      userId
    };

    let notificationType: 'task_assigned' | 'task_deadline' | 'task_completed';

    switch (type) {
      case 'assigned':
        notificationType = 'task_assigned';
        testTask.assignedBy = 'Test Manager';
        break;
      case 'deadline':
        notificationType = 'task_deadline';
        break;
      case 'completed':
        notificationType = 'task_completed';
        testTask.completedBy = 'Test User';
        break;
    }

    await notificationService.triggerNotification({
      type: notificationType,
      userId,
      data: { task: testTask },
      priority: 'medium'
    });

    console.log(`Test ${type} notification sent to user ${userId}`);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    processedDeadlinesCount: number;
  } {
    return {
      isMonitoring: this.monitoringInterval !== null,
      processedDeadlinesCount: this.processedDeadlines.size
    };
  }
}

// Export singleton instance
export const taskMonitor = new TaskMonitor();
export default TaskMonitor;