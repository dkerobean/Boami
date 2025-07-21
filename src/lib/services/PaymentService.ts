import { Types } from 'mongoose';
import { Transaction, Subscription, Plan, User } from '../database/models';
import { FlutterwaveService, WebhookPayload } from './FlutterwaveService';
import { validateWebhookPayload } from '../utils/payment-utils';
import { connectDB } from '../database/mongoose-connection';

/**
 * Payment processing service
 * Handles payment verification, webhook processing, and transaction management
 */
export class PaymentService {
  private flutterwaveService: FlutterwaveService;

  constructor() {
    this.flutterwaveService = new FlutterwaveService();
  }

  /**
   * Verify a payment transaction
   * @param transactionId - Flutterwave transaction ID
   * @returns Promise<any> - Verification result
   */
  async verifyPayment(transactionId: string): Promise<any> {
    await connectDB();

    try {
      // Verify with Flutterwave
      const verificationResponse = await this.flutterwaveService.verifyPayment(transactionId);

      if (verificationResponse.status !== 'success') {
        throw new Error('Payment verification failed');
      }

      const paymentData = verificationResponse.data;

      // Find the transaction in our database
      const transaction = await Transaction.findByFlutterwaveId(transactionId.toString());
      if (!transaction) {
        throw new Error('Transaction not found in database');
      }

      // Update transaction status based on payment status
      if (paymentData.status === 'successful') {
        await transaction.markAsSuccessful(new Date(paymentData.created_at));

        // Process successful payment
        await this.processSuccessfulPayment(transaction);

        return {
          success: true,
          transaction,
          paymentData
        };
      } else {
        await transaction.markAsFailed(`Payment status: ${paymentData.status}`);

        return {
          success: false,
          transaction,
          paymentData,
          error: `Payment failed with status: ${paymentData.status}`
        };
      }

    } catch (error: any) {
      console.error('Payment verification error:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Process webhook from Flutterwave
   * @param payload - Raw webhook payload
   * @param signature - Webhook signature
   * @returns Promise<any> - Processing result
   */
  async processWebhook(payload: string, signature: string): Promise<any> {
    await connectDB();

    try {
      // Verify webhook signature
      if (!this.flutterwaveService.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const webhookData = JSON.parse(payload);

      // Validate webhook payload structure
      if (!validateWebhookPayload(webhookData)) {
        throw new Error('Invalid webhook payload structure');
      }

      const processedWebhook = this.flutterwaveService.processWebhook(webhookData);

      // Handle different webhook events
      switch (processedWebhook.event) {
        case 'charge.completed':
          return await this.handleChargeCompleted(processedWebhook);

        case 'subscription.cancelled':
          return await this.handleSubscriptionCancelled(processedWebhook);

        default:
          console.log(`Unhandled webhook event: ${processedWebhook.event}`);
          return { success: true, message: 'Event acknowledged but not processed' };
      }

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Handle charge completed webhook
   * @param webhookData - Processed webhook data
   * @returns Promise<any> - Processing result
   */
  private async handleChargeCompleted(webhookData: WebhookPayload): Promise<any> {
    try {
      const { data } = webhookData;

      // Find transaction by Flutterwave ID or reference
      let transaction = await Transaction.findByFlutterwaveId(data.id.toString());
      if (!transaction) {
        transaction = await Transaction.findByReference(data.tx_ref);
      }

      if (!transaction) {
        console.warn(`Transaction not found for webhook: ${data.id} / ${data.tx_ref}`);
        return { success: false, error: 'Transaction not found' };
      }

      // Check if already processed to avoid duplicate processing
      if (transaction.isSuccessful()) {
        return { success: true, message: 'Transaction already processed' };
      }

      // Update transaction status
      if (data.status === 'successful') {
        await transaction.markAsSuccessful(new Date(data.created_at));
        await this.processSuccessfulPayment(transaction);
        return { success: true, message: 'Payment processed successfully' };
      } else {
        await transaction.markAsFailed(`Webhook status: ${data.status}`);
        return { success: false, error: `Payment failed: ${data.status}` };
      }

    } catch (error: any) {
      console.error('Charge completed webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle subscription cancelled webhook
   * @param webhookData - Processed webhook data
   * @returns Promise<any> - Processing result
   */
  private async handleSubscriptionCancelled(webhookData: WebhookPayload): Promise<any> {
    try {
      const { data } = webhookData;

      // Find subscription by Flutterwave subscription ID
      const subscription = await Subscription.findByFlutterwaveId(data.id.toString());
      if (!subscription) {
        console.warn(`Subscription not found for webhook: ${data.id}`);
        return { success: false, error: 'Subscription not found' };
      }

      // Cancel the subscription
      await subscription.cancel(true);

      return { success: true, message: 'Subscription cancelled successfully' };

    } catch (error: any) {
      console.error('Subscription cancelled webhook error:', error);
      throw error;
    }
  }

  /**
   * Process successful payment and update subscription
   * @param transaction - Transaction document
   */
  private async processSuccessfulPayment(transaction: any): Promise<void> {
    try {
      if (!transaction.subscriptionId) {
        console.warn('Transaction has no associated subscription');
        return;
      }

      const subscription = await Subscription.findById(transaction.subscriptionId);
      if (!subscription) {
        console.warn(`Subscription not found: ${transaction.subscriptionId}`);
        return;
      }

      // Update subscription based on transaction type
      switch (transaction.type) {
        case 'subscription':
          // Activate new subscription
          subscription.status = 'active';
          await subscription.save();
          break;

        case 'upgrade':
        case 'downgrade':
          // Apply plan change
          const newPlanId = transaction.metadata.newPlanId;
          if (newPlanId) {
            subscription.planId = new Types.ObjectId(newPlanId);
            subscription.status = 'active';
            await subscription.save();
          }
          break;

        case 'renewal':
          // Renew subscription
          const paymentMethod = subscription.metadata.paymentMethod || 'monthly';
          const newPeriodEnd = paymentMethod === 'annual'
            ? new Date(subscription.currentPeriodEnd.getFullYear() + 1, subscription.currentPeriodEnd.getMonth(), subscription.currentPeriodEnd.getDate())
            : new Date(subscription.currentPeriodEnd.getFullYear(), subscription.currentPeriodEnd.getMonth() + 1, subscription.currentPeriodEnd.getDate());

          await subscription.renew(newPeriodEnd);
          break;
      }

      console.log(`Successfully processed ${transaction.type} payment for subscription ${subscription._id}`);

    } catch (error: any) {
      console.error('Process successful payment error:', error);
      throw error;
    }
  }

  /**
   * Refund a transaction
   * @param transactionId - Transaction ID
   * @param amount - Refund amount (optional, defaults to full amount)
   * @returns Promise<any> - Refund result
   */
  async refundTransaction(transactionId: string, amount?: number): Promise<any> {
    await connectDB();

    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!transaction.isSuccessful()) {
        throw new Error('Cannot refund unsuccessful transaction');
      }

      const refundAmount = amount || transaction.amount;

      // Process refund with Flutterwave (if they support it)
      // For now, we'll just mark it as refunded in our system
      await transaction.refund(refundAmount);

      // If it's a subscription payment, handle subscription cancellation
      if (transaction.subscriptionId && transaction.type === 'subscription') {
        const subscription = await Subscription.findById(transaction.subscriptionId);
        if (subscription) {
          await subscription.cancel(true);
        }
      }

      return {
        success: true,
        transaction,
        refundAmount
      };

    } catch (error: any) {
      console.error('Transaction refund error:', error);
      throw new Error(`Transaction refund failed: ${error.message}`);
    }
  }

  /**
   * Get payment analytics
   * @param startDate - Start date for analytics
   * @param endDate - End date for analytics
   * @returns Promise<any> - Payment analytics
   */
  async getPaymentAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    await connectDB();

    try {
      const [
        totalRevenue,
        successfulTransactions,
        failedTransactions,
        revenueByPeriod,
        paymentMethodStats
      ] = await Promise.all([
        Transaction.getTotalRevenue(startDate, endDate),
        Transaction.countDocuments({
          status: 'successful',
          ...(startDate && endDate && {
            processedAt: { $gte: startDate, $lte: endDate }
          })
        }),
        Transaction.countDocuments({
          status: 'failed',
          ...(startDate && endDate && {
            createdAt: { $gte: startDate, $lte: endDate }
          })
        }),
        Transaction.getRevenueByPeriod('month'),
        Transaction.aggregate([
          {
            $match: {
              status: 'successful',
              ...(startDate && endDate && {
                processedAt: { $gte: startDate, $lte: endDate }
              })
            }
          },
          {
            $group: {
              _id: '$paymentMethod',
              count: { $sum: 1 },
              revenue: { $sum: '$amount' }
            }
          }
        ])
      ]);

      const totalTransactions = successfulTransactions + failedTransactions;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      return {
        overview: {
          totalRevenue,
          successfulTransactions,
          failedTransactions,
          totalTransactions,
          successRate
        },
        revenueByPeriod,
        paymentMethodStats
      };

    } catch (error: any) {
      console.error('Payment analytics error:', error);
      throw new Error(`Failed to get payment analytics: ${error.message}`);
    }
  }

  /**
   * Retry failed payment
   * @param transactionId - Transaction ID
   * @returns Promise<any> - Retry result
   */
  async retryFailedPayment(transactionId: string): Promise<any> {
    await connectDB();

    try {
      const transaction = await Transaction.findById(transactionId).populate('userId');
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!transaction.isFailed()) {
        throw new Error('Transaction is not in failed state');
      }

      const user = transaction.userId as any;

      // Generate new transaction reference
      const txRef = `retry_${transaction.flutterwaveReference}_${Date.now()}`;

      // Initialize new payment
      const paymentData = {
        tx_ref: txRef,
        amount: transaction.amount,
        currency: transaction.currency,
        customer: {
          email: user.email,
          name: user.getFullName(),
          phone: user.phone
        },
        customizations: {
          title: 'Payment Retry',
          description: transaction.description || 'Retry payment',
          logo: process.env.COMPANY_LOGO_URL
        },
        meta: {
          originalTransactionId: transaction._id.toString(),
          retryAttempt: true
        }
      };

      const paymentResponse = await this.flutterwaveService.initializePayment(paymentData);

      // Create new transaction record for retry
      const retryTransaction = await Transaction.create({
        userId: transaction.userId,
        subscriptionId: transaction.subscriptionId,
        flutterwaveTransactionId: paymentResponse.data.id.toString(),
        flutterwaveReference: txRef,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'pending',
        type: transaction.type,
        description: `Retry: ${transaction.description}`,
        customerEmail: transaction.customerEmail,
        customerPhone: transaction.customerPhone,
        metadata: {
          ...transaction.metadata,
          originalTransactionId: transaction._id.toString(),
          retryAttempt: true
        }
      });

      return {
        success: true,
        retryTransaction,
        paymentLink: paymentResponse.payment_link
      };

    } catch (error: any) {
      console.error('Retry payment error:', error);
      throw new Error(`Failed to retry payment: ${error.message}`);
    }
  }

  /**
   * Get transaction history for a user
   * @param userId - User ID
   * @param limit - Number of transactions to return
   * @param offset - Offset for pagination
   * @returns Promise<any[]> - Transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    await connectDB();

    try {
      return await Transaction.find({ userId: new Types.ObjectId(userId) })
        .populate('subscriptionId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

    } catch (error: any) {
      console.error('Get transaction history error:', error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default PaymentService;