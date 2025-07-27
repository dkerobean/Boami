import { NextRequest, NextResponse } from 'next/server';
import { JWTManager } from '@/lib/auth/jwt';

/**
 * GET /api/auth-test - Test authentication status and token info
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🧪 [Auth Test] Testing authentication...');
    
    const currentUser = JWTManager.getCurrentUser();
    const accessToken = JWTManager.getAccessTokenFromCookies();
    const refreshToken = JWTManager.getRefreshTokenFromCookies();
    
    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: !!currentUser,
        user: currentUser,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length,
        refreshTokenLength: refreshToken?.length
      }
    }, { status: 200 });
  } catch (error) {
    console.error('💥 [Auth Test] Error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}