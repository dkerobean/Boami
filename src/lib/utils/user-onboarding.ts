import { connectToDatabase } from '@/lib/database/mongoose-connection';
import { seedProductivityData, hasExistingProductivityData } from '@/lib/database/seeders/productivity-seeder';
import { seedFinancialCategoriesForUser } from '@/lib/database/seeders/financial-seeder';

/**
 * User onboarding utilities for initializing new user data
 */

export interface OnboardingOptions {
  userId: string;
  includeProductivity?: boolean;
  includeFinancial?: boolean;
  productivityDataSize?: 'minimal' | 'standard' | 'extensive';
  skipIfExists?: boolean;
}

export interface OnboardingResult {
  success: boolean;
  message: string;
  data: {
    productivitySeeded: boolean;
    financialSeeded: boolean;
    details: {
      productivity?: {
        notesCreated: number;
        eventsCreated: number;
        boardsCreated: number;
        tasksCreated: number;
      };
      financial?: {
        categoriesCreated: number;
      };
    };
  };
  errors?: string[];
}

/**
 * Initialize data for a new user
 */
export async function initializeNewUser(options: OnboardingOptions): Promise<OnboardingResult> {
  try {
    await connectToDatabase();

    const result: OnboardingResult = {
      success: true,
      message: 'User onboarding completed successfully',
      data: {
        productivitySeeded: false,
        financialSeeded: false,
        details: {}
      }
    };

    const errors: string[] = [];

    // Initialize productivity data
    if (options.includeProductivity !== false) {
      try {
        // Check if user already has productivity data
        const existingProductivityData = await hasExistingProductivityData(options.userId);

        if (!options.skipIfExists || existingProductivityData.total === 0) {
          const productivityResult = await seedProductivityData({
            userId: options.userId,
            includeNotes: true,
            includeCalendar: true,
            includeKanban: true,
            sampleDataSize: options.productivityDataSize || 'minimal'
          });

          if (productivityResult.success) {
            result.data.productivitySeeded = true;
            result.data.details.productivity = productivityResult.data;
          } else {
            errors.push(`Productivity seeding failed: ${productivityResult.message}`);
            if (productivityResult.errors) {
              errors.push(...productivityResult.errors);
            }
          }
        } else {
          result.data.productivitySeeded = false;
          result.data.details.productivity = {
            notesCreated: 0,
            eventsCreated: 0,
            boardsCreated: 0,
            tasksCreated: 0
          };
        }
      } catch (error) {
        errors.push(`Productivity initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Initialize financial data
    if (options.includeFinancial !== false) {
      try {
        const financialResult = await seedFinancialCategoriesForUser(options.userId);

        if (financialResult.success) {
          result.data.financialSeeded = true;
          result.data.details.financial = {
            categoriesCreated: (financialResult.data?.income?.created || 0) + (financialResult.data?.expense?.created || 0)
          };
        } else {
          errors.push(`Financial seeding failed: ${financialResult.message}`);
        }
      } catch (error) {
        errors.push(`Financial initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Handle errors
    if (errors.length > 0) {
      result.success = false;
      result.message = 'User onboarding completed with errors';
      result.errors = errors;
    }

    return result;

  } catch (error) {
    console.error('User onboarding error:', error);
    return {
      success: false,
      message: 'Failed to initialize new user',
      data: {
        productivitySeeded: false,
        financialSeeded: false,
        details: {}
      },
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Create default Kanban board for new users
 */
export async function createDefaultKanbanBoard(userId: string): Promise<{
  success: boolean;
  boardId?: string;
  message: string;
}> {
  try {
    await connectToDatabase();

    const { KanbanBoard } = await import('@/lib/database/models/KanbanBoard');

    // Check if user already has boards
    const existingBoards = await KanbanBoard.countDocuments({ userId });
    if (existingBoards > 0) {
      return {
        success: false,
        message: 'User already has Kanban boards'
      };
    }

    // Create default board
    const board = await KanbanBoard.createDefaultBoard(userId, 'My First Board');

    return {
      success: true,
      boardId: board._id.toString(),
      message: 'Default Kanban board created successfully'
    };

  } catch (error) {
    console.error('Error creating default Kanban board:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create default board'
    };
  }
}

/**
 * Check if user needs onboarding
 */
export async function checkOnboardingStatus(userId: string): Promise<{
  needsOnboarding: boolean;
  hasProductivityData: boolean;
  hasFinancialData: boolean;
  recommendations: string[];
}> {
  try {
    await connectToDatabase();

    // Check productivity data
    const productivityData = await hasExistingProductivityData(userId);

    // Check financial data (simplified check)
    const { IncomeCategory, ExpenseCategory } = await import('@/lib/database/models');
    const [incomeCategories, expenseCategories] = await Promise.all([
      IncomeCategory.countDocuments({ userId }),
      ExpenseCategory.countDocuments({ userId })
    ]);

    const hasFinancialData = incomeCategories > 0 || expenseCategories > 0;
    const hasProductivityData = productivityData.total > 0;

    const recommendations: string[] = [];

    if (!hasProductivityData) {
      recommendations.push('Set up productivity features (Notes, Calendar, Kanban)');
    }

    if (!hasFinancialData) {
      recommendations.push('Initialize financial categories');
    }

    if (!productivityData.hasBoards) {
      recommendations.push('Create your first Kanban board');
    }

    return {
      needsOnboarding: !hasProductivityData || !hasFinancialData,
      hasProductivityData,
      hasFinancialData,
      recommendations
    };

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return {
      needsOnboarding: true,
      hasProductivityData: false,
      hasFinancialData: false,
      recommendations: ['Complete initial setup']
    };
  }
}

/**
 * Get onboarding progress for a user
 */
export async function getOnboardingProgress(userId: string): Promise<{
  completionPercentage: number;
  completedSteps: string[];
  remainingSteps: string[];
  nextRecommendedAction: string;
}> {
  try {
    const status = await checkOnboardingStatus(userId);

    const allSteps = [
      'productivity_setup',
      'financial_setup',
      'first_note',
      'first_event',
      'first_kanban_board'
    ];

    const completedSteps: string[] = [];
    const remainingSteps: string[] = [];

    // Check each step
    if (status.hasProductivityData) {
      completedSteps.push('productivity_setup');
    } else {
      remainingSteps.push('productivity_setup');
    }

    if (status.hasFinancialData) {
      completedSteps.push('financial_setup');
    } else {
      remainingSteps.push('financial_setup');
    }

    // Check specific productivity features
    const productivityData = await hasExistingProductivityData(userId);

    if (productivityData.hasNotes) {
      completedSteps.push('first_note');
    } else {
      remainingSteps.push('first_note');
    }

    if (productivityData.hasEvents) {
      completedSteps.push('first_event');
    } else {
      remainingSteps.push('first_event');
    }

    if (productivityData.hasBoards) {
      completedSteps.push('first_kanban_board');
    } else {
      remainingSteps.push('first_kanban_board');
    }

    const completionPercentage = Math.round((completedSteps.length / allSteps.length) * 100);

    // Determine next recommended action
    let nextRecommendedAction = 'Setup complete!';
    if (remainingSteps.length > 0) {
      const stepMessages = {
        'productivity_setup': 'Initialize productivity features',
        'financial_setup': 'Set up financial categories',
        'first_note': 'Create your first note',
        'first_event': 'Add your first calendar event',
        'first_kanban_board': 'Create your first Kanban board'
      };
      nextRecommendedAction = stepMessages[remainingSteps[0] as keyof typeof stepMessages] || 'Continue setup';
    }

    return {
      completionPercentage,
      completedSteps,
      remainingSteps,
      nextRecommendedAction
    };

  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    return {
      completionPercentage: 0,
      completedSteps: [],
      remainingSteps: ['productivity_setup', 'financial_setup'],
      nextRecommendedAction: 'Complete initial setup'
    };
  }
}