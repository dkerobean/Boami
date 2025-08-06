import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { connectToDatabase } from '@/lib/database/connection';
import {
  seedProductivityData,
  hasExistingProductivityData,
  clearProductivityData,
  type SeedingOptions
} from '@/lib/database/seeders/productivity-seeder';

/**
 * POST /api/productivity/seed
 *
 * Seeds productivity data for the authenticated user
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

    // Connect to the database
    await connectToDatabase();

    // Parse request body
    const body = await request.json();

    const {
      includeNotes = true,
      includeCalendar = true,
      includeKanban = true,
      sampleDataSize = 'standard',
      force = false
    } = body;

    // Validate sampleDataSize
    if (!['minimal', 'standard', 'extensive'].includes(sampleDataSize)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid sample data size. Must be 'minimal', 'standard', or 'extensive'" } },
        { status: 400 }
      );
    }

    // Check if user already has data (unless force is true)
    if (!force) {
      const existingData = await hasExistingProductivityData(session.user.id);
      if (existingData.total > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "User already has productivity data. Use force=true to override.",
              existingData
            }
          },
          { status: 409 }
        );
      }
    }

    // Prepare seeding options
    const seedingOptions: SeedingOptions = {
      userId: session.user.id,
      includeNotes,
      includeCalendar,
      includeKanban,
      sampleDataSize
    };

    // If force is true and user has existing data, clear it first
    if (force) {
      const existingData = await hasExistingProductivityData(session.user.id);
      if (existingData.total > 0) {
        await clearProductivityData(session.user.id);
      }
    }

    // Seed the data
    const result = await seedProductivityData(seedingOptions);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message,
          seeded: result.data
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
    console.error("Error seeding productivity data:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to seed productivity data" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/productivity/seed
 *
 * Check if user has existing productivity data
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

    // Connect to the database
    await connectToDatabase();

    // Check existing data
    const existingData = await hasExistingProductivityData(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        existingData,
        needsSeeding: existingData.total === 0
      }
    });

  } catch (error: any) {
    console.error("Error checking productivity data:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to check productivity data" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/productivity/seed
 *
 * Clear all productivity data for the authenticated user
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Clear the data
    const result = await clearProductivityData(session.user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message,
          cleared: {
            notes: Math.abs(result.data.notesCreated),
            events: Math.abs(result.data.eventsCreated),
            boards: Math.abs(result.data.boardsCreated),
            tasks: Math.abs(result.data.tasksCreated)
          }
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
    console.error("Error clearing productivity data:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to clear productivity data" } },
      { status: 500 }
    );
  }
}