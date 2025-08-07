import { NextRequest, NextResponse } from 'next/server';
import { EcommerceDashboardService } from '@/lib/services/ecommerce-dashboard';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Dashboard stats API called');

    // Authenticate the request
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    console.log('✅ User authenticated:', authResult.user.email);

    // Get dashboard statistics
    const stats = await EcommerceDashboardService.getDashboardStats(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard statistics'
      },
      { status: 500 }
    );
  }
}