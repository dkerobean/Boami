import { NextRequest, NextResponse } from 'next/server';
import { EcommerceDashboardService } from '@/lib/services/ecommerce-dashboard';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    const userId = authResult.user.id || authResult.user.userId;

    // Get payment gateway statistics
    const paymentStats = await EcommerceDashboardService.getPaymentGatewayStats(userId);

    return NextResponse.json({
      success: true,
      data: paymentStats
    });

  } catch (error) {
    console.error('Payment stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment statistics'
      },
      { status: 500 }
    );
  }
}