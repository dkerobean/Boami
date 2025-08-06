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

    const userId = authResult.user.id;

    // Get recent transactions
    const transactions = await EcommerceDashboardService.getRecentTransactions(userId);

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