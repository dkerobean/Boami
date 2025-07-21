import { NextRequest } from 'next/server';
import {
  initializeUserProductivityData,
  getOnboardingRecommendations,
  generateOnboardingChecklist,
  generateWelcomeMessage,
  shouldShowOnboarding,
  OnboardingPreferences
} from '@/lib/utils/user-onboarding';
import {
  withProductivityAuth,
  ProductivityAuthResult
} from '@/lib/auth/productivity-auth';
import {
  createSuccessResponse,
  ProductivityError,
  ProductivityErrorCode
} from '@/lib/utils/productivity-error-handler';

/**
 * GET /api/productivity/onboarding
 * Get onboarding status and recommendations for the user
 */
async function handleGetOnboarding(request: NextRequest, authResult: ProductivityAuthResult) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  switch (action) {
    case 'status':
      return await handleOnboardingStatus(authResult);
    case 'checklist':
      return await handleOnboardingChecklist(authResult);
    case 'welcome':
      return await handleWelcomeMessage(authResult);
    default:
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        'Invalid action. Supported actions: status, checklist, welcome',
        400
      );
  }
}

/**
 * POST /api/productivity/onboarding
 * Initialize productivity data for new user
 */
async function handleInitializeOnboarding(request: NextRequest, authResult: ProductivityAuthResult) {
  // Parse request body
  const body = await request.json();
  const preferences: OnboardingPreferences = {
    includeNotes: body.includeNotes ?? true,
    includeCalendar: body.includeCalendar ?? true,
    includeKanban: body.includeKanban ?? true,
    sampleDataSize: body.sampleDataSize || 'standard',
    skipIfDataExists: body.skipIfDataExists ?? true
  };

  // Validate sample data size
  if (preferences.sampleDataSize && !['minimal', 'standard', 'extensive'].includes(preferences.sampleDataSize)) {
    throw new ProductivityError(
      ProductivityErrorCode.VALIDATION_ERROR,
      'Sample data size must be one of: minimal, standard, extensive',
      400
    );
  }

  // Initialize user data
  const result = await initializeUserProductivityData(authResult.userId!, preferences);

  return createSuccessResponse({
    initialized: result.success,
    ...result,
    preferences
  }, result.message, authResult.requestId);
}

/**
 * Handle onboarding status request
 */
async function handleOnboardingStatus(authResult: ProductivityAuthResult) {
  const [shouldOnboard, recommendations] = await Promise.all([
    shouldShowOnboarding(authResult.userId!),
    getOnboardingRecommendations(authResult.userId!)
  ]);

  return createSuccessResponse({
    shouldOnboard,
    ...recommendations,
    user: {
      id: authResult.userId,
      permissions: authResult.permissions,
      features: authResult.features
    }
  }, 'Onboarding status retrieved', authResult.requestId);
}

/**
 * Handle onboarding checklist request
 */
async function handleOnboardingChecklist(authResult: ProductivityAuthResult) {
  const checklist = await generateOnboardingChecklist(authResult.userId!);

  return createSuccessResponse({
    checklist,
    user: {
      id: authResult.userId,
      permissions: authResult.permissions,
      features: authResult.features
    }
  }, 'Onboarding checklist generated', authResult.requestId);
}

/**
 * Handle welcome message request
 */
async function handleWelcomeMessage(authResult: ProductivityAuthResult) {
  // In a real app, you might get the user's name from the user profile
  const userName = authResult.user?.name || authResult.user?.email?.split('@')[0];
  const welcomeMessage = generateWelcomeMessage(userName);

  return createSuccessResponse({
    welcome: welcomeMessage,
    user: {
      id: authResult.userId,
      permissions: authResult.permissions,
      features: authResult.features
    }
  }, 'Welcome message generated', authResult.requestId);
}

// Export the wrapped handlers
export const GET = withProductivityAuth(handleGetOnboarding);
export const POST = withProductivityAuth(handleInitializeOnboarding);