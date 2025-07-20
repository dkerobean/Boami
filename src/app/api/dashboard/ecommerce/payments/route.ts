import { NextRequest, NextResponse } from 'next/server';
import { EcommerceDashboardService } from '@/lib/services/ecommerce-dashboard';
import { authenticateRequest } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error?.message || 'Authentication required'
        },
        { status: 401 }
      );
    }

    // Get payment gateway statistics
    const paymentStats = await EcommerceDashboardService.getPaymentGatewayStats();

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