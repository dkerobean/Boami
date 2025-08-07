import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

/**
 * Test endpoint to check if NextAuth is configured correctly
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      success: true,
      message: 'NextAuth configuration is working',
      hasSession: !!session,
      session: session ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        }
      } : null
    });
  } catch (error: any) {
    console.error('NextAuth test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'NextAuth configuration error'
    }, { status: 500 });
  }
}