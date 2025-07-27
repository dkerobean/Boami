import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionEmailService } from '@/lib/email/subscription-email-service';

/**
 * POST /api/email/test-subscription
 * Test subscription email functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type, testData } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let result;

    switch (type) {
      case 'welcome':
        result = await SubscriptionEmailService.sendSubscriptionWelcome(email, {
          firstName: testData?.firstName || 'Test User',
          planName: testData?.planName || 'Premium Plan',
          planPrice: testData?.planPrice || 29.99,
          currency: testData?.currency || 'USD',
          billingPeriod: testData?.billingPeriod || 'monthly',
          features: testData?.features || [
            'Unlimited products',
            'Advanced analytics',
            'Priority support',
            'Custom integrations'
          ],
          appUrl
        });
        break;

      case 'renewal-reminder':
        const renewalDate = new Date();
        renewalDate.setDate(renewalDate.getDate() + 3);

        result = await SubscriptionEmailService.sendRenewalReminder(email, {
          firstName: testData?.firstName || 'Test User',
          planName: testData?.planName || 'Premium Plan',
          planPrice: testData?.planPrice || 29.99,
          currency: testData?.currency || 'USD',
          billingPeriod: testData?.billingPeriod || 'monthly',
          renewalDate: renewalDate.toLocaleDateString(),
          appUrl
        });
        break;

      case 'cancelled':
        const accessEndDate = new Date();
        accessEndDate.setDate(accessEndDate.getDate() + 30);

        result = await SubscriptionEmailService.sendSubscriptionCancelled(email, {
          firstName: testData?.firstName || 'Test User',
          planName: testData?.planName || 'Premium Plan',
          cancellationDate: new Date().toLocaleDateString(),
          accessEndDate: accessEndDate.toLocaleDateString(),
          reason: testData?.reason || 'User requested cancellation',
          appUrl
        });
        break;

      case 'payment-failed':
        const retryDate = new Date();
        retryDate.setDate(retryDate.getDate() + 1);

        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        result = await SubscriptionEmailService.sendPaymentFailed(email, {
          firstName: testData?.firstName || 'Test User',
          planName: testData?.planName || 'Premium Plan',
          amount: testData?.amount || 29.99,
          currency: testData?.currency || 'USD',
          failureReason: testData?.failureReason || 'Insufficient funds',
          retryDate: retryDate.toLocaleDateString(),
          gracePeriodEnd: gracePeriodEnd.toLocaleDateString(),
          appUrl
        });
        break;

      case 'expired':
        result = await SubscriptionEmailService.sendSubscriptionExpired(email, {
          firstName: testData?.firstName || 'Test User',
          planName: testData?.planName || 'Premium Plan',
          expiredDate: new Date().toLocaleDateString(),
          appUrl
        });
        break;

      case 'renewed':
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        result = await SubscriptionEmailService.sendSubscriptionRenewed(
          email,
          testData?.firstName || 'Test User',
          testData?.planName || 'Premium Plan',
          testData?.amount || 29.99,
          testData?.currency || 'USD',
          nextBillingDate.toLocaleDateString(),
          appUrl
        );
        break;

      case 'test':
      default:
        result = await SubscriptionEmailService.sendTestSubscriptionEmail(email);
        break;
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Test ${type || 'subscription'} email sent successfully`
        : `Failed to send test ${type || 'subscription'} email`,
      messageId: result.messageId,
      error: result.error
    });

  } catch (error: any) {
    console.error('Test subscription email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}