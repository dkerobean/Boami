import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import {
  initializeNewUser,
  checkOnboardingStatus,
  getOnboardingProgress,
  createDefaultKanbanBoard,
  type OnboardingOptions
} from '@/lib/utils/user-onboarding';

/**
 * GET /api/user/onboarding
 *
 * Get onboarding status and progress for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeProgress = searchParams.get('includeProgress') === 'true';

    // Get onboarding status
    const status = await checkOnboardingStatus(session.user.id);

    let progress = null;
    if (includeProgress) {
      progress = await getOnboardingProgress(session.user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        progress
      }
    });

  } catch (error: any) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to check onboarding status" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/onboarding
 *
 * Initialize data for a new user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    const {
      includeProductivity = true,
      includeFinancial = true,
      productivityDataSize = 'minimal',
      skipIfExists = true,
      force = false
    } = body;

    // Validate productivityDataSize
    if (!['minimal', 'standard', 'extensive'].includes(productivityDataSize)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid productivity data size. Must be 'minimal', 'standard', or 'extensive'" } },
        { status: 400 }
      );
    }

    // Check if user needs onboarding (unless force is true)
    if (!force) {
      const status = await checkOnboardingStatus(session.user.id);
      if (!status.needsOnboarding) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "User onboarding already completed. Use force=true to re-initialize.",
              status
            }
          },
          { status: 409 }
        );
      }
    }

    // Prepare onboarding options
    const onboardingOptions: OnboardingOptions = {
      userId: session.user.id,
      includeProductivity,
      includeFinancial,
      productivityDataSize,
      skipIfExists: !force
    };

    // Initialize user data
    const result = await initializeNewUser(onboardingOptions);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message,
          initialized: result.data
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.message,
            details: result.errors
          }
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Error initializing user:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to initialize user" } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/onboarding
 *
 * Create specific onboarding items (like default Kanban board)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create_default_board':
        const boardResult = await createDefaultKanbanBoard(session.user.id);

        if (boardResult.success) {
          return NextResponse.json({
            success: true,
            data: {
              message: boardResult.message,
              boardId: boardResult.boardId
            }
          });
        } else {
          return NextResponse.json(
            { success: false, error: { message: boardResult.message } },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: { message: "Invalid action. Supported actions: 'create_default_board'" } },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error("Error performing onboarding action:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to perform onboarding action" } },
      { status: 500 }
    );
  }
}