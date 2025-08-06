import { Resend } from 'resend';
import { EMAIL_CONFIG } from './config';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface BulkEmailData extends EmailData {
  id: string; // Unique identifier for tracking
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  messageId?: string;
}

export interface BulkEmailResult {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  totalSent: number;
  totalFailed: number;
}

class ResendService {
  private resend: Resend;
  private rateLimitQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lastEmailTime = 0;
  private emailCount = 0;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(apiKey);
  }

  /**
   * Send a single email
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      await this.enforceRateLimit();

      const result = await this.resend.emails.send({
        from: emailData.from || `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        reply_to: emailData.replyTo || EMAIL_CONFIG.REPLY_TO,
        headers: {
          'X-Entity-Ref-ID': this.generateTrackingId(),
          ...emailData.headers
        }
      });

      return {
        success: true,
        id: result.data?.id,
        messageId: result.data?.id
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBulkEmails(emails: BulkEmailData[]): Promise<BulkEmailResult> {
    const results: BulkEmailResult['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process emails in batches to respect rate limits
    const batches = this.chunkArray(emails, EMAIL_CONFIG.BATCH_SIZE);

    for (const batch of batches) {
      const batchPromises = batch.map(async (email) => {
        const result = await this.sendEmail(email);
        return {
          id: email.id,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Count successes and failures
      batchResults.forEach(result => {
        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
        }
      });

      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(1000); // 1 second delay between batches
      }
    }

    return {
      success: totalFailed === 0,
      results,
      totalSent,
      totalFailed
    };
  }

  /**
   * Validate email template
   */
  validateEmailTemplate(template: { subject: string; html: string; text: string }): boolean {
    if (!template.subject || template.subject.trim().length === 0) {
      return false;
    }
    if (!template.html || template.html.trim().length === 0) {
      return false;
    }
    if (!template.text || template.text.trim().length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Get email delivery status (if supported by Resend)
   */
  async getEmailStatus(emailId: string): Promise<any> {
    try {
      // Note: This would depend on Resend's API capabilities
      // For now, we'll return a placeholder
      return { id: emailId, status: 'unknown' };
    } catch (error) {
      console.error('Failed to get email status:', error);
      return null;
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter if more than a minute has passed
    if (now - this.lastEmailTime > oneMinute) {
      this.emailCount = 0;
      this.lastEmailTime = now;
    }

    // If we've hit the rate limit, wait
    if (this.emailCount >= EMAIL_CONFIG.RATE_LIMIT) {
      const waitTime = oneMinute - (now - this.lastEmailTime);
      await this.delay(waitTime);
      this.emailCount = 0;
      this.lastEmailTime = Date.now();
    }

    this.emailCount++;
  }

  /**
   * Generate unique tracking ID
   */
  private generateTrackingId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<boolean> {
    try {
      const testResult = await this.sendEmail({
        to: EMAIL_CONFIG.FROM_EMAIL,
        subject: 'Resend Configuration Test',
        html: '<p>This is a test email to verify Resend configuration.</p>',
        text: 'This is a test email to verify Resend configuration.'
      });
      return testResult.success;
    } catch (error) {
      console.error('Resend configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const resendService = new ResendService();
export default ResendService;