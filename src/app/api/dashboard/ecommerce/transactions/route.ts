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

    // Get recent transactions
    const transactions = await EcommerceDashboardService.getRecentTransactions();

    return NextResponse.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transaction data'
      },
      { status: 500 }
    );
  }
}