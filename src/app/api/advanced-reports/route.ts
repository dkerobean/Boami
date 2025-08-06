import { NextRequest, NextResponse } from 'next/server';
import { createFeatureProtectedRoute } from '@/lib/auth/feature-access-middleware';
import { FEATURES } from '@/hooks/useFeatureAccess';
import { connectToDatabase } from '@/lib/database/connection';

/**
 * GET /api/advanced-reports
 * Generates advanced analytics reports - Premium feature
 */
export const GET = createFeatureProtectedRoute(
  FEATURES.ADVANCED_REPORTING,
  async (request: NextRequest) => {
    try {
      await connectToDatabase();

      const { searchParams } = new URL(request.url);
      const reportType = searchParams.get('type') || 'sales';
      const dateRange = searchParams.get('dateRange') || '30d';

      // Mock advanced report data
      const reportData = {
        type: reportType,
        dateRange,
        generatedAt: new Date().toISOString(),
        data: {
          summary: {
            totalRevenue: 125000,
            totalOrders: 450,
            averageOrderValue: 278,
            conversionRate: 3.2,
            customerLifetimeValue: 890
          },
          trends: {
            revenueGrowth: 15.3,
            orderGrowth: 12.8,
            customerGrowth: 8.5
          },
          segments: [
            {
              name: 'Premium Customers',
              revenue: 75000,
              percentage: 60,
              growth: 18.2
            },
            {
              name: 'Regular Customers',
              revenue: 35000,
              percentage: 28,
              growth: 10.5
            },
            {
              name: 'New Customers',
              revenue: 15000,
              percentage: 12,
              growth: 25.8
            }
          ],
          topProducts: [
            {
              name: 'Premium Widget',
              revenue: 45000,
              units: 180,
              margin: 35.5
            },
            {
              name: 'Standard Widget',
              revenue: 32000,
              units: 320,
              margin: 28.2
            }
          ]
        },
        insights: [
          'Premium customers show 18% higher engagement',
          'Mobile conversion rates increased by 12%',
          'Weekend sales peak at 2PM-4PM'
        ]
      };

      return NextResponse.json({
        success: true,
        data: reportData
      });

    } catch (error: any) {
      console.error('Advanced reports error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate advanced report' },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/advanced-reports
 * Creates custom advanced reports - Premium feature
 */
export const POST = createFeatureProtectedRoute(
  FEATURES.ADVANCED_REPORTING,
  async (request: NextRequest) => {
    try {
      await connectToDatabase();

      const body = await request.json();
      const { reportConfig, scheduleConfig } = body;

      // Mock report creation
      const reportId = `report_${Date.now()}`;

      return NextResponse.json({
        success: true,
        data: {
          reportId,
          status: 'scheduled',
          config: reportConfig,
          schedule: scheduleConfig,
          estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        }
      });

    } catch (error: any) {
      console.error('Create advanced report error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create advanced report' },
        { status: 500 }
      );
    }
  }
);