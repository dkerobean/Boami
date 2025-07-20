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

    // Get sales data
    const salesData = await EcommerceDashboardService.getSalesData();

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