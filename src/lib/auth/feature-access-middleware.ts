import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { connectToDatabase } from '@/lib/database/connection';

export interface FeatureAccessOptions {
  feature: string;
  redirectTo?: string;
  returnJson?: boolean;
}

export async function withFeatureAccess(
  request: NextRequest,
  options: FeatureAccessOptions,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get the user token
    const token = await getToken({ req: request });

    if (!token || !token.sub) {
      if (options.returnJson) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Connect to database
    await connectToDatabase();

    // Check feature access
    const subscriptionService = new SubscriptionService();
    const hasAccess = await subscriptionService.checkFeatureAccess(token.sub, options.feature);

    if (!hasAccess) {
      if (options.returnJson) {
        return NextResponse.json(
          {
            success: false,
            error: 'Feature access denied',
            feature: options.feature,
            upgradeRequired: true
          },
          { status: 403 }
        );
      }

      const redirectUrl = options.redirectTo || `/subscription/plans?feature=${encodeURIComponent(options.feature)}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // User has access, proceed with the handler
    return await handler(request);

  } catch (error: any) {
    console.error('Feature access middleware error:', error);

    if (options.returnJson) {
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL('/error', request.url));
  }
}

// Higher-order function to create feature-protected API routes
export function createFeatureProtectedRoute(
  feature: string,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    return withFeatureAccess(
      request,
      { feature, returnJson: true },
      handler
    );
  };
}

// Middleware for protecting page routes
export function createFeatureProtectedPage(
  feature: string,
  redirectTo?: string
) {
  return async (request: NextRequest) => {
    const token = await getToken({ req: request });

    if (!token || !token.sub) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    try {
      await connectToDatabase();
      const subscriptionService = new SubscriptionService();
      const hasAccess = await subscriptionService.checkFeatureAccess(token.sub, feature);

      if (!hasAccess) {
        const upgradeUrl = redirectTo || `/subscription/plans?feature=${encodeURIComponent(feature)}`;
        return NextResponse.redirect(new URL(upgradeUrl, request.url));
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return NextResponse.redirect(new URL('/error', request.url));
    }
  };
}