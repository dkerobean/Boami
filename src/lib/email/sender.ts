import React from 'react';
import { ResendClient } from '@/lib/email/resend-client';
import { VerificationCodeEmail, VerificationCodeEmailProps } from '@/lib/email/templates/verification-code';
import { PasswordResetEmail, PasswordResetEmailProps } from '@/lib/email/templates/password-reset';

/**
 * Email sending result interface
 */
export interface IEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email sender utility class for handling all email operations
 * Integrates with Resend service and email templates
 */
export class EmailSender {
  
  /**
   * Sends a verification code email to user
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @param verificationCode - 4-digit verification code
   * @param expiryMinutes - Code expiry time in minutes (default: 5)
   * @returns Promise<IEmailResult> - Email sending result
   */
  static async sendVerificationCode(
    email: string,
    firstName: string,
    verificationCode: string,
    expiryMinutes: number = 5
  ): Promise<IEmailResult> {
    try {
      // Validate inputs
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      if (!verificationCode || verificationCode.length !== 4) {
        throw new Error('Invalid verification code format');
      }

      const client = ResendClient.getClient();
      const appUrl = ResendClient.getAppUrl();
      
      const emailProps: VerificationCodeEmailProps = {
        firstName,
        verificationCode,
        expiryMinutes,
        appUrl
      };

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami'),
        to: [email],
        subject: ResendClient.formatSubject('Verify Your Email Address'),
        react: VerificationCodeEmail(emailProps) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `verification-${Date.now()}`,
        }
      });

      if (error) {
        console.error('Failed to send verification email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send verification email'
        };
      }

      console.log(`✅ Verification email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Sends a password reset email to user
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @param resetCode - 4-digit password reset code
   * @param expiryMinutes - Code expiry time in minutes (default: 5)
   * @returns Promise<IEmailResult> - Email sending result
   */
  static async sendPasswordReset(
    email: string,
    firstName: string,
    resetCode: string,
    expiryMinutes: number = 5
  ): Promise<IEmailResult> {
    try {
      // Validate inputs
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      if (!resetCode || resetCode.length !== 4) {
        throw new Error('Invalid reset code format');
      }

      const client = ResendClient.getClient();
      const appUrl = ResendClient.getAppUrl();
      
      const emailProps: PasswordResetEmailProps = {
        firstName,
        resetCode,
        expiryMinutes,
        appUrl
      };

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Security'),
        to: [email],
        subject: ResendClient.formatSubject('Reset Your Password'),
        react: PasswordResetEmail(emailProps) as React.ReactElement,
        headers: {
          'X-Entity-Ref-ID': `password-reset-${Date.now()}`,
        }
      });

      if (error) {
        console.error('Failed to send password reset email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send password reset email'
        };
      }

      console.log(`✅ Password reset email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Sends a welcome email to newly verified users
   * @param email - Recipient email address
   * @param firstName - User's first name
   * @returns Promise<IEmailResult> - Email sending result
   */
  static async sendWelcomeEmail(
    email: string,
    firstName: string
  ): Promise<IEmailResult> {
    try {
      // Validate inputs
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();
      const appUrl = ResendClient.getAppUrl();

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e40af;">Welcome to Boami!</h1>
              <p>Hi ${firstName},</p>
              <p>Thank you for verifying your email address! Your Boami account is now active and ready to use.</p>
              <p>You can now access all features of our e-commerce management platform:</p>
              <ul>
                <li>Product management</li>
                <li>Order tracking</li>
                <li>Customer analytics</li>
                <li>Sales reporting</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/dashboard" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                  Get Started
                </a>
              </div>
              <p>If you have any questions, feel free to contact our support team.</p>
              <p>Best regards,<br>The Boami Team</p>
            </div>
          </body>
        </html>
      `;

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami'),
        to: [email],
        subject: ResendClient.formatSubject('Welcome to Boami!'),
        html: htmlContent,
        headers: {
          'X-Entity-Ref-ID': `welcome-${Date.now()}`,
        }
      });

      if (error) {
        console.error('Failed to send welcome email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send welcome email'
        };
      }

      console.log(`✅ Welcome email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Sends a generic notification email
   * @param email - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - HTML content of the email
   * @param headers - Optional email headers
   * @returns Promise<IEmailResult> - Email sending result
   */
  static async sendNotification(
    email: string,
    subject: string,
    htmlContent: string,
    headers?: Record<string, string>
  ): Promise<IEmailResult> {
    try {
      // Validate inputs
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      if (!subject || !htmlContent) {
        throw new Error('Subject and content are required');
      }

      const client = ResendClient.getClient();

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami'),
        to: [email],
        subject: ResendClient.formatSubject(subject),
        html: htmlContent,
        headers: {
          'X-Entity-Ref-ID': `notification-${Date.now()}`,
          ...headers
        }
      });

      if (error) {
        console.error('Failed to send notification email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send notification email'
        };
      }

      console.log(`✅ Notification email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending notification email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Tests email functionality by sending a test email
   * @param email - Test recipient email address
   * @returns Promise<IEmailResult> - Email sending result
   */
  static async sendTestEmail(email: string): Promise<IEmailResult> {
    try {
      // Validate inputs
      if (!ResendClient.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const client = ResendClient.getClient();
      const timestamp = new Date().toISOString();

      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e40af;">Email Service Test</h1>
              <p>This is a test email from the Boami authentication system.</p>
              <p><strong>Timestamp:</strong> ${timestamp}</p>
              <p>If you received this email, the email service is working correctly.</p>
              <p>Best regards,<br>Boami System</p>
            </div>
          </body>
        </html>
      `;

      const { data, error } = await client.emails.send({
        from: ResendClient.formatSender('Boami Test'),
        to: [email],
        subject: ResendClient.formatSubject('Email Service Test'),
        html: htmlContent,
        headers: {
          'X-Entity-Ref-ID': `test-${Date.now()}`,
        }
      });

      if (error) {
        console.error('Failed to send test email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send test email'
        };
      }

      console.log(`✅ Test email sent to ${email}, messageId: ${data?.id}`);
      return {
        success: true,
        messageId: data?.id
      };

    } catch (error) {
      console.error('Error sending test email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Batch sends emails with rate limiting consideration
   * @param emails - Array of email addresses
   * @param emailType - Type of email to send
   * @param emailData - Data for email generation
   * @param batchSize - Number of emails to send in each batch (default: 10)
   * @param delayMs - Delay between batches in milliseconds (default: 1000)
   * @returns Promise<IEmailResult[]> - Array of email sending results
   */
  static async sendBatch(
    emails: string[],
    emailType: 'verification' | 'password-reset' | 'welcome',
    emailData: any,
    batchSize: number = 10,
    delayMs: number = 1000
  ): Promise<IEmailResult[]> {
    const results: IEmailResult[] = [];
    
    // Process emails in batches to respect rate limits
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        switch (emailType) {
          case 'verification':
            return this.sendVerificationCode(
              email,
              emailData.firstName,
              emailData.verificationCode,
              emailData.expiryMinutes
            );
          case 'password-reset':
            return this.sendPasswordReset(
              email,
              emailData.firstName,
              emailData.resetCode,
              emailData.expiryMinutes
            );
          case 'welcome':
            return this.sendWelcomeEmail(email, emailData.firstName);
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
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}