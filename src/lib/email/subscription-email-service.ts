import React from 'react';
import { ResendClient } from '@/lib/email/resend-client';
import { IEmailResult } from '@/lib/email/sender';
import { SubscriptionWelcomeEmail, SubscriptionWelcomeEmailProps } from '@/lib/email/templates/subscription-welcome';
import { SubscriptionRenewalReminderEmail, SubscriptionRenewalReminderEmailProps } from '@/lib/email/templates/subscription-renewal-reminder';
import { SubscriptionCancelledEmail, SubscriptionCancelledEmailProps } from '@/lib/email/templates/subscription-cancelled';
import { PaymentFailedEmail, PaymentFailedEmailProps } from '@/lib/email/templates/payment-failed';
import { SubscriptionExpiredEmail, SubscriptionExpiredEmailProps } from '@/lib/email/templates/subscription-expired';

/**
 * Subscription email service for handling all subscription-related email notifications
 */
export class SubscriptionEmailService {

  /**
   * Send subscription welcome email
   */
  static async sendSubscriptionWelcome(
    email: string,
    props: SubscriptionWelcomeEmailProps
  ): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Subscriptions'),
        to: [email],
        subject: ResendClient.formatSubject(`Welcome to ${props.planName}!`),
        react: SubscriptionWelcomeEmail(props) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `subscription-welcome-${Date.now()}`,
          'X-Subscription-Event': 'welcome'
        }
      });

      if (error) {
        console.error('Failed to send subscription welcome email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send subscription welcome email'
        };
      }

      console.log(`✅ Subscription welcome email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending subscription welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send subscription renewal reminder email
   */
  static async sendRenewalReminder(
    email: string,
    props: SubscriptionRenewalReminderEmailProps
  ): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Billing'),
        to: [email],
        subject: ResendClient.formatSubject('Your subscription renews soon'),
        react: SubscriptionRenewalReminderEmail(props) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `renewal-reminder-${Date.now()}`,
          'X-Subscription-Event': 'renewal-reminder'
        }
      });

      if (error) {
        console.error('Failed to send renewal reminder email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send renewal reminder email'
        };
      }

      console.log(`✅ Renewal reminder email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending renewal reminder email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send subscription cancelled email
   */
  static async sendSubscriptionCancelled(
    email: string,
    props: SubscriptionCancelledEmailProps
  ): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Subscriptions'),
        to: [email],
        subject: ResendClient.formatSubject('Subscription Cancelled'),
        react: SubscriptionCancelledEmail(props) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `subscription-cancelled-${Date.now()}`,
          'X-Subscription-Event': 'cancelled'
        }
      });

      if (error) {
        console.error('Failed to send subscription cancelled email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send subscription cancelled email'
        };
      }

      console.log(`✅ Subscription cancelled email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending subscription cancelled email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send payment failed email
   */
  static async sendPaymentFailed(
    email: string,
    props: PaymentFailedEmailProps
  ): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Billing'),
        to: [email],
        subject: ResendClient.formatSubject('Payment Failed - Action Required'),
        react: PaymentFailedEmail(props) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `payment-failed-${Date.now()}`,
          'X-Subscription-Event': 'payment-failed',
          'X-Priority': 'high'
        }
      });

      if (error) {
        console.error('Failed to send payment failed email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send payment failed email'
        };
      }

      console.log(`✅ Payment failed email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending payment failed email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send subscription expired email
   */
  static async sendSubscriptionExpired(
    email: string,
    props: SubscriptionExpiredEmailProps
  ): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Subscriptions'),
        to: [email],
        subject: ResendClient.formatSubject('Subscription Expired'),
        react: SubscriptionExpiredEmail(props) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `subscription-expired-${Date.now()}`,
          'X-Subscription-Event': 'expired'
        }
      });

      if (error) {
        console.error('Failed to send subscription expired email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send subscription expired email'
        };
      }

      console.log(`✅ Subscription expired email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending subscription expired email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send subscription renewed confirmation email
   */
  static async sendSubscriptionRenewed(
    email: string,
    firstName: string,
    planName: string,
    amount: number,
    currency: string,
    nextBillingDate: string,
    appUrl: string
  ): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981; font-size: 28px; margin-bottom: 10px;">
                  ✅ Subscription Renewed Successfully
                </h1>
                <p style="font-size: 16px; color: #666; margin: 0;">
                  Your ${planName} subscription has been renewed
                </p>
              </div>

              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Hi ${firstName},
                </p>

                <p style="font-size: 16px; margin-bottom: 20px;">
                  Great news! Your <strong>${planName}</strong> subscription has been successfully renewed. Your payment has been processed and your premium features remain active.
                </p>

                <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #10b981;">
                  <h3 style="color: #10b981; font-size: 18px; margin-bottom: 15px; margin-top: 0;">
                    Renewal Details
                  </h3>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span><strong>Plan:</strong></span>
                    <span>${planName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span><strong>Amount Charged:</strong></span>
                    <span>${currency.toUpperCase()} ${amount.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span><strong>Next Billing Date:</strong></span>
                    <span style="color: #10b981; font-weight: bold;">${nextBillingDate}</span>
                  </div>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                  <a href="${appUrl}/dashboard" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                    Access Your Dashboard
                  </a>
                </div>

                <p style="font-size: 16px; margin-bottom: 10px;">
                  Thank you for continuing to be a valued subscriber!
                </p>

                <p style="font-size: 16px; margin: 0;">
                  Best regards,<br />
                  <strong>The Boami Team</strong>
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
                <p>This email confirms your subscription renewal.</p>
                <p><a href="${appUrl}/unsubscribe" style="color: #999;">Unsubscribe from billing emails</a></p>
              </div>
            </div>
          </body>
        </html>
      `;

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Billing'),
        to: [email],
        subject: ResendClient.formatSubject('Subscription Renewed Successfully'),
        html: htmlContent,
        headers: {
          'X-Entity-Ref-ID': `subscription-renewed-${Date.now()}`,
          'X-Subscription-Event': 'renewed'
        }
      });

      if (error) {
        console.error('Failed to send subscription renewed email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send subscription renewed email'
        };
      }

      console.log(`✅ Subscription renewed email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending subscription renewed email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send batch subscription emails with rate limiting
   */
  static async sendBatchEmails(
    emailRequests: Array<{
      email: string;
      type: 'welcome' | 'renewal-reminder' | 'cancelled' | 'payment-failed' | 'expired' | 'renewed';
      props: any;
    }>,
    batchSize: number = 10,
    delayMs: number = 1000
  ): Promise<IEmailResult[]> {
    const results: IEmailResult[] = [];

    // Process emails in batches to respect rate limits
    for (let i = 0; i < emailRequests.length; i += batchSize) {
      const batch = emailRequests.slice(i, i + batchSize);

      const batchPromises = batch.map(async (request) => {
        switch (request.type) {
          case 'welcome':
            return this.sendSubscriptionWelcome(request.email, request.props);
          case 'renewal-reminder':
            return this.sendRenewalReminder(request.email, request.props);
          case 'cancelled':
            return this.sendSubscriptionCancelled(request.email, request.props);
          case 'payment-failed':
            return this.sendPaymentFailed(request.email, request.props);
          case 'expired':
            return this.sendSubscriptionExpired(request.email, request.props);
          case 'renewed':
            return this.sendSubscriptionRenewed(
              request.email,
              request.props.firstName,
              request.props.planName,
              request.props.amount,
              request.props.currency,
              request.props.nextBillingDate,
              request.props.appUrl
            );
          default:
            return {
              success: false,
              error: 'Unknown email type'
            };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < emailRequests.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Test subscription email functionality
   */
  static async sendTestSubscriptionEmail(email: string): Promise<IEmailResult> {
    try {
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();
      const timestamp = new Date().toISOString();

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e40af;">Subscription Email Service Test</h1>
              <p>This is a test email from the Boami subscription email service.</p>
              <p><strong>Timestamp:</strong> ${timestamp}</p>
              <p>If you received this email, the subscription email service is working correctly.</p>
              <p>Best regards,<br>Boami Subscription System</p>
            </div>
          </body>
        </html>
      `;

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Test'),
        to: [email],
        subject: ResendClient.formatSubject('Subscription Email Service Test'),
        html: htmlContent,
        headers: {
          'X-Entity-Ref-ID': `subscription-test-${Date.now()}`,
          'X-Subscription-Event': 'test'
        }
      });

      if (error) {
        console.error('Failed to send test subscription email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send test subscription email'
        };
      }

      console.log(`✅ Test subscription email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending test subscription email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}