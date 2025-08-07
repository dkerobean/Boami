import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { preferenceManager } from '@/lib/notifications/preference-manager';
import { connectToDatabase } from '@/lib/database/connection';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session (you may need to adjust this based on your auth setup)
    const userId = (session.user as any).id || session.user.email;

    const preferences = await preferenceManager.getUserPreferences(userId);

    if (!preferences) {
      // Create default preferences if they don't exist
      const newPreferences = await preferenceManager.createDefaultPreferences(userId);
      return NextResponse.json(newPreferences);
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || session.user.email;
    const updates = await request.json();

    const updatedPreferences = await preferenceManager.updateUserPreferences(userId, updates);

    if (!updatedPreferences) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}