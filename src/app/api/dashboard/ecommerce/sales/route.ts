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

    // Get sales data
    const salesData = await EcommerceDashboardService.getSalesData(userId);

    return NextResponse.json({
      success: true,
      data: salesData
    });

  } catch (error) {
    console.error('Sales data API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sales data'
      },
      { status: 500 }
    );
  }
}