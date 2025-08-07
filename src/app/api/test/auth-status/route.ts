import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

/**
 * Test endpoint to check authentication status
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Auth status test called');

    const authResult = await authenticateApiRequest(request);

    if (!authResult.success || !authResult.user) {
      console.log('❌ No authentication found');
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    console.log('✅ Authentication successful');

    const { response, status } = createApiResponse(true, {
      authenticated: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        role: authResult.user.role?.name || 'No role'
      },
      message: 'Authentication successful'
    });

    return NextResponse.json(response, { status });

  } catch (error: any) {
    console.error('🚨 Auth test error:', error);
    const { response, status } = createApiResponse(
      false,
      null,
      { code: 'TEST_ERROR', message: error.message },
      500
    );
    return NextResponse.json(response, { status });
  }
}