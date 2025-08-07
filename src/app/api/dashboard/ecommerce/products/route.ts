import { NextRequest, NextResponse } from 'next/server';
import { EcommerceDashboardService } from '@/lib/services/ecommerce-dashboard';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    const userId = authResult.user.id;

    // Get product performance data
    const products = await EcommerceDashboardService.getProductPerformance(userId);

    return NextResponse.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Product performance API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product performance data'
      },
      { status: 500 }
    );
  }
}