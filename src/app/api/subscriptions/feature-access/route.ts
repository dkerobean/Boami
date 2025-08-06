import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { connectToDatabase } from '@/lib/database/connection';
import { createFeatureAccessError, ERROR_CODES } from '@/lib/errors/SubscriptionErrors';
import { subscriptionLogger, LogCategory } from '@/lib/utils/subscription-logger';
import { handleApiError } from '@/lib/utils/error-recovery';
import { recordError } from '@/lib/utils/error-monitoring';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    subscriptionLogger.info('Feature access check started', LogCategory.FEATURE_ACCESS);

    await connectToDatabase();

    const body = await request.json();
    userId = body.userId;
    const feature = body.feature;

    if (!userId || !feature) {
      const error = createFeatureAccessError(
        'Invalid request: Missing required fields',
        ERROR_CODES.INVALID_REQUEST,
        feature,
        undefined,
        undefined,
        userId
      );

      subscriptionLogger.warn('Feature access check failed: Missing required fields', LogCategory.FEATURE_ACCESS, {
        userId,
        metadata: { feature, missingFields: !userId ? 'userId' : 'feature' }
      });

      recordError(error, { userId, feature, endpoint: '/api/subscriptions/feature-access' });

      return NextResponse.json(handleApiError(error), { status: 400 });
    }

    const subscriptionService = new SubscriptionService();
    const hasAccess = await subscriptionService.checkFeatureAccess(userId, feature);

    const duration = Date.now() - startTime;

    if (!hasAccess) {
      subscriptionLogger.logFeatureAccessDenied(userId, feature);
    }

    subscriptionLogger.logPerformanceMetric('feature_access_check', duration, {
      userId,
      feature,
      hasAccess
    });

    subscriptionLogger.info('Feature access check completed', LogCategory.FEATURE_ACCESS, {
      userId,
      duration,
      metadata: { feature, hasAccess }
    });

    return NextResponse.json({
      success: true,
      hasAccess,
      feature,
      userId
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    subscriptionLogger.error('Feature access check error', error, LogCategory.FEATURE_ACCESS, {
      userId,
      duration,
      metadata: { endpoint: '/api/subscriptions/feature-access' }
    });

    recordError(error, { userId, endpoint: '/api/subscriptions/feature-access', duration });

    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}