import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';
import { seedDashboardData, clearUserDashboardData } from '@/lib/database/seeders/dashboard-seeder';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Dashboard seeding API called');

    // Authenticate the request
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    const userId = authResult.user.id || authResult.user.userId;
    const userEmail = authResult.user.email;

    console.log('✅ User authenticated:', userEmail);

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { clearFirst = false } = body;

    // Clear existing data if requested
    if (clearFirst) {
      await clearUserDashboardData(userId);
    }

    // Seed dashboard data
    const result = await seedDashboardData({
      userId,
      userEmail
    });

    console.log('🎉 Dashboard seeding completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Dashboard data seeded successfully',
      data: result.data
    });

  } catch (error) {
    console.error('❌ Dashboard seeding API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Dashboard data clearing API called');

    // Authenticate the request
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    const userId = authResult.user.id || authResult.user.userId;
    const userEmail = authResult.user.email;

    console.log('✅ User authenticated:', userEmail);

    // Clear dashboard data
    await clearUserDashboardData(userId);

    console.log('🎉 Dashboard data cleared successfully');

    return NextResponse.json({
      success: true,
      message: 'Dashboard data cleared successfully'
    });

  } catch (error) {
    console.error('❌ Dashboard clearing API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}