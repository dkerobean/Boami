import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { getFreshUserData } from '@/lib/auth/session-utils';

/**
 * POST /api/auth/refresh-session
 * Forces a NextAuth session refresh with fresh user data from database
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Session refresh requested');

    // Get current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No active session found');
      return NextResponse.json({ 
        success: false,
        message: 'No active session' 
      }, { status: 401 });
    }

    console.log('✅ Session found for user:', session.user.email);

    // Get fresh user data from database
    const freshUserData = await getFreshUserData(session.user.email);
    
    if (!freshUserData) {
      return NextResponse.json({ 
        success: false,
        message: 'User not found in database' 
      }, { status: 404 });
    }

    console.log('✅ Fresh user data retrieved');

    // Return success - the actual session refresh happens on the next request
    // due to NextAuth's JWT callback checking for updated user data
    return NextResponse.json({
      success: true,
      message: 'Session refresh triggered',
      user: freshUserData
    }, { status: 200 });

  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Failed to refresh session' 
    }, { status: 500 });
  }
}