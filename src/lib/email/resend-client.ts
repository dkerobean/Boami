import { Resend } from 'resend';

/**
 * Resend email client configuration and management
 * Handles email service initialization and error handling
 */
export class ResendClient {
  private static instance: Resend | null = null;

  /**
   * Validates Resend configuration
   * @throws {Error} If API key is missing or invalid
   */
  private static validateConfig(): void {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    if (!apiKey.startsWith('re_')) {
      throw new Error('Invalid Resend API key format. API key should start with "re_"');
    }
  }

  /**
   * Gets or creates the Resend client instance
   * @returns Resend - Configured Resend client
   * @throws {Error} If configuration is invalid
   */
  static getClient(): Resend {
    if (!this.instance) {
      this.validateConfig();
      this.instance = new Resend(process.env.RESEND_API_KEY!);
      console.log('✅ Resend email client initialized');
    }
    
    return this.instance;
  }

  /**
   * Tests the email service connection
   * @returns Promise<boolean> - Whether connection is successful
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      
      // Try to get domains (this requires a valid API key)
      await client.domains.list();
      
      console.log('✅ Resend connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Resend connection test failed:', error);
      return false;
    }
  }

  /**
   * Gets the verified sender email address
   * @returns string - Sender email address
   */
  static getSenderEmail(): string {
    const senderEmail = process.env.RESEND_SENDER_EMAIL || 'noreply@resend.dev';
    return senderEmail;
  }

  /**
   * Gets the application URL for email links
   * @returns string - Application URL
   */
  static getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  /**
   * Validates email address format
   * @param email - Email address to validate
   * @returns boolean - Whether email is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Gets rate limiting information for Resend
   * @returns object - Rate limiting information
   */
  static getRateLimits(): {
    freeDaily: number;
    freeMonthly: number;
    description: string;
  } {
    return {
      freeDaily: 100, // Free tier allows 100 emails per day
      freeMonthly: 3000, // Free tier allows 3000 emails per month
      description: 'Resend free tier limits. Consider upgrading for higher limits.'
    };
  }

  /**
   * Formats the sender name and email
   * @param name - Sender name
   * @param email - Sender email (optional, uses default if not provided)
   * @returns string - Formatted sender string
   */
  static formatSender(name: string, email?: string): string {
    const senderEmail = email || this.getSenderEmail();
    return `${name} <${senderEmail}>`;
  }

  /**
   * Creates a standardized email subject prefix
   * @param subject - Base subject
   * @returns string - Formatted subject with app name
   */
  static formatSubject(subject: string): string {
    const appName = 'Boami';
    return `[${appName}] ${subject}`;
  }

  /**
   * Resets the client instance (useful for testing or config changes)
   */
  static resetClient(): void {
    this.instance = null;
  }

  /**
   * Gets client status information
   * @returns object - Status information
   */
  static getStatus(): {
    initialized: boolean;
    configValid: boolean;
    senderEmail: string;
    appUrl: string;
  } {
    let configValid = false;
    
    try {
      this.validateConfig();
      configValid = true;
    } catch (error) {
      configValid = false;
    }

    return {
      initialized: this.instance !== null,
      configValid,
      senderEmail: this.getSenderEmail(),
      appUrl: this.getAppUrl()
    };
  }
}