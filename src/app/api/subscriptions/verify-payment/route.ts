import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/database/mongoose-connection';
import { FlutterwaveService } from '../../../../lib/services/FlutterwaveService';
import { SubscriptionService } from '../../../../lib/services/SubscriptionService';
import { Subscription, User } from '../../../../lib/database/models';

/**
 * POST /api/subscriptions/verify-payment
 * Verify payment and activate subscription
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { txRef, transactionId, paymentReference, userId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 400 }
      );
    }

    if (!txRef && !transactionId && !paymentReference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction reference, transaction ID, or payment reference is required'
        },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    try {
      // Initialize Flutterwave service
      const flutterwaveService = new FlutterwaveService();

      // Verify payment with Flutterwave
      let paymentVerification;
      
      if (txRef) {
        paymentVerification = await flutterwaveService.verifyPaymentByReference(txRef);
      } else if (transactionId) {
        paymentVerification = await flutterwaveService.verifyPayment(transactionId);
      } else {
        // For legacy payment references, try to find subscription and update status
        const subscription = await Subscription.findOne({
          userId,
          'payment.reference': paymentReference,
          status: { $in: ['pending', 'incomplete'] }
        }).populate('planId');

        if (subscription) {
          // Update subscription status to active
          subscription.status = 'active';
          subscription.payment.status = 'completed';
          subscription.payment.verifiedAt = new Date();
          await subscription.save();

          return NextResponse.json({
            success: true,
            data: {
              subscription: {
                id: subscription._id,
                status: subscription.status,
                planName: subscription.planId?.name,
                planDescription: subscription.planId?.description,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                plan: subscription.planId
              },
              payment: {
                reference: paymentReference,
                status: 'completed',
                verifiedAt: subscription.payment.verifiedAt
              }
            }
          });
        } else {
          throw new Error('No pending subscription found for this payment reference');
        }
      }

      // Check if payment was successful
      if (paymentVerification.status !== 'success' || paymentVerification.data.status !== 'successful') {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment verification failed',
            details: {
              status: paymentVerification.data.status,
              processor_response: paymentVerification.data.processor_response
            }
          },
          { status: 400 }
        );
      }

      // Find the subscription associated with this payment
      const subscription = await Subscription.findOne({
        userId,
        $or: [
          { 'payment.transactionRef': txRef },
          { 'payment.transactionId': transactionId },
          { 'payment.flutterwaveRef': paymentVerification.data.flw_ref }
        ]
      }).populate('planId');

      if (!subscription) {
        return NextResponse.json(
          {
            success: false,
            error: 'No subscription found for this payment'
          },
          { status: 404 }
        );
      }

      // Update subscription status
      subscription.status = 'active';
      subscription.payment.status = 'completed';
      subscription.payment.verifiedAt = new Date();
      subscription.payment.flutterwaveTransactionId = paymentVerification.data.id;
      subscription.payment.flutterwaveRef = paymentVerification.data.flw_ref;
      subscription.payment.amount = paymentVerification.data.amount;
      subscription.payment.currency = paymentVerification.data.currency;

      await subscription.save();

      // Use SubscriptionService to handle post-activation tasks
      const subscriptionService = new SubscriptionService();
      await subscriptionService.activateSubscription(subscription._id.toString());

      return NextResponse.json({
        success: true,
        data: {
          subscription: {
            id: subscription._id,
            status: subscription.status,
            planName: subscription.planId?.name,
            planDescription: subscription.planId?.description,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            plan: subscription.planId
          },
          payment: {
            transactionId: paymentVerification.data.id,
            reference: paymentVerification.data.tx_ref,
            flutterwaveRef: paymentVerification.data.flw_ref,
            amount: paymentVerification.data.amount,
            currency: paymentVerification.data.currency,
            status: 'completed',
            verifiedAt: subscription.payment.verifiedAt
          }
        }
      });

    } catch (flutterwaveError: any) {
      console.error('Flutterwave verification error:', flutterwaveError);
      
      // If Flutterwave verification fails, check if we can still activate based on subscription status
      const subscription = await Subscription.findOne({
        userId,
        status: { $in: ['pending', 'incomplete'] }
      }).populate('planId').sort({ createdAt: -1 });

      if (subscription) {
        // Log the verification attempt failure
        console.warn(`Payment verification failed for user ${userId}, but subscription exists. Manual verification may be required.`);
        
        return NextResponse.json(
          {
            success: false,
            error: 'Payment verification failed. Please contact support if payment was made.',
            details: {
              subscriptionId: subscription._id,
              message: flutterwaveError.message
            }
          },
          { status: 400 }
        );
      }

      throw flutterwaveError;
    }

  } catch (error: any) {
    console.error('Payment verification error:', error);

    // Handle specific error types
    if (error.message.includes('User not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    if (error.message.includes('No subscription found') || error.message.includes('No pending subscription found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No subscription found for this payment'
        },
        { status: 404 }
      );
    }

    if (error.message.includes('Payment verification failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify payment'
      },
      { status: 500 }
    );
  }
}