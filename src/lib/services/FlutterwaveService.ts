import Flutterwave from 'flutterwave-node-v3';
import crypto from 'crypto';

/**
 * Flutterwave payment configuration interface
 */
export interface FlutterwaveConfig {
  public_key: string;
  secret_key: string;
  secret_hash?: string;
  environment: 'sandbox' | 'production';
}

/**
 * Payment initialization data interface
 */
export interface PaymentInitData {
  tx_ref: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    phone_number?: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  payment_plan?: string;
  callback_url?: string;
  redirect_url?: string;
  payment_options?: string;
  meta?: Record<string, any>;
}

/**
 * Payment verification response interface
 */
export interface PaymentVerificationResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
    card?: {
      first_6digits: string;
      last_4digits: string;
      issuer: string;
      country: string;
      type: string;
      expiry: string;
    };
  };
}

/**
 * Webhook payload interface
 */
export interface WebhookPayload {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
      name: string;
      phone_number?: string;
    };
    created_at: string;
  };
}

/**
 * Flutterwave service class for handling payment operations
 * Provides secure payment processing with proper error handling
 */
export class FlutterwaveService {
  private flw: any;
  private config: FlutterwaveConfig;

  constructor(config?: Partial<FlutterwaveConfig>) {
    this.config = {
      public_key: config?.public_key || process.env.FLUTTERWAVE_PUBLIC_KEY || '',
      secret_key: config?.secret_key || process.env.FLUTTERWAVE_SECRET_KEY || '',
      secret_hash: config?.secret_hash || process.env.FLUTTERWAVE_SECRET_HASH || '',
      environment: config?.environment || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox')
    };

    if (!this.config.public_key || !this.config.secret_key) {
      throw new Error('Flutterwave API keys are required');
    }

    this.flw = new Flutterwave({
      public_key: this.config.public_key,
      secret_key: this.config.secret_key
    });
  }

  /**
   * Initialize a payment transaction
   * @param paymentData - Payment initialization data
   * @returns Promise<any> - Payment initialization response
   */
  async initializePayment(paymentData: PaymentInitData): Promise<any> {
    try {
      const payload = {
        ...paymentData,
        tx_ref: paymentData.tx_ref || this.generateTransactionReference(),
        callback_url: paymentData.callback_url || `${process.env.NEXT_PUBLIC_BASE_URL}/api/subscriptions/callback`,
        redirect_url: paymentData.redirect_url || `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success`,
        payment_options: paymentData.payment_options || 'card,mobilemoney,ussd,banktransfer'
      };

      const response = await this.flw.Charge.card(payload);

      if (response.status === 'success') {
        return {
          success: true,
          data: response.data,
          payment_link: response.data.link
        };
      } else {
        throw new Error(response.message || 'Payment initialization failed');
      }
    } catch (error: any) {
      console.error('Flutterwave payment initialization error:', error);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  /**
   * Verify a payment transaction
   * @param transactionId - Transaction ID to verify
   * @returns Promise<PaymentVerificationResponse> - Verification response
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await this.flw.Transaction.verify({ id: transactionId });

      if (response.status === 'success') {
        return response;
      } else {
        throw new Error(response.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Flutterwave payment verification error:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Verify payment by transaction reference
   * @param txRef - Transaction reference
   * @returns Promise<PaymentVerificationResponse> - Verification response
   */
  async verifyPaymentByReference(txRef: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await this.flw.Transaction.verify({ tx_ref: txRef });

      if (response.status === 'success') {
        return response;
      } else {
        throw new Error(response.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Flutterwave payment verification by reference error:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Create a payment plan for recurring payments
   * @param planData - Payment plan data
   * @returns Promise<any> - Payment plan creation response
   */
  async createPaymentPlan(planData: {
    amount: number;
    name: string;
    interval: string;
    duration?: number;
    currency?: string;
  }): Promise<any> {
    try {
      const payload = {
        amount: planData.amount,
        name: planData.name,
        interval: planData.interval,
        duration: planData.duration || 0, // 0 means indefinite
        currency: planData.currency || 'NGN'
      };

      const response = await this.flw.PaymentPlan.create(payload);

      if (response.status === 'success') {
        return response;
      } else {
        throw new Error(response.message || 'Payment plan creation failed');
      }
    } catch (error: any) {
      console.error('Flutterwave payment plan creation error:', error);
      throw new Error(`Payment plan creation failed: ${error.message}`);
    }
  }

  /**
   * Get all payment plans
   * @returns Promise<any> - Payment plans response
   */
  async getPaymentPlans(): Promise<any> {
    try {
      const response = await this.flw.PaymentPlan.get_all();

      if (response.status === 'success') {
        return response;
      } else {
        throw new Error(response.message || 'Failed to fetch payment plans');
      }
    } catch (error: any) {
      console.error('Flutterwave get payment plans error:', error);
      throw new Error(`Failed to fetch payment plans: ${error.message}`);
    }
  }

  /**
   * Cancel a payment plan
   * @param planId - Payment plan ID
   * @returns Promise<any> - Cancellation response
   */
  async cancelPaymentPlan(planId: string): Promise<any> {
    try {
      const response = await this.flw.PaymentPlan.cancel({ id: planId });

      if (response.status === 'success') {
        return response;
      } else {
        throw new Error(response.message || 'Payment plan cancellation failed');
      }
    } catch (error: any) {
      console.error('Flutterwave payment plan cancellation error:', error);
      throw new Error(`Payment plan cancellation failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param payload - Webhook payload
   * @param signature - Webhook signature from headers
   * @returns boolean - Whether signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.secret_hash) {
      console.warn('Webhook secret hash not configured');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.secret_hash)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook payload
   * @param payload - Webhook payload
   * @returns WebhookPayload - Processed webhook data
   */
  processWebhook(payload: any): WebhookPayload {
    return {
      event: payload.event || 'charge.completed',
      data: {
        id: payload.data.id,
        tx_ref: payload.data.tx_ref,
        flw_ref: payload.data.flw_ref,
        amount: payload.data.amount,
        currency: payload.data.currency,
        status: payload.data.status,
        customer: {
          email: payload.data.customer.email,
          name: payload.data.customer.name,
          phone_number: payload.data.customer.phone_number
        },
        created_at: payload.data.created_at
      }
    };
  }

  /**
   * Generate a unique transaction reference
   * @param prefix - Optional prefix for the reference
   * @returns string - Unique transaction reference
   */
  generateTransactionReference(prefix: string = 'BOAMI'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Format amount for Flutterwave (remove decimals for NGN)
   * @param amount - Amount to format
   * @param currency - Currency code
   * @returns number - Formatted amount
   */
  formatAmount(amount: number, currency: string = 'NGN'): number {
    // Flutterwave expects amounts in kobo for NGN (multiply by 100)
    // For other currencies, check their documentation
    switch (currency.toUpperCase()) {
      case 'NGN':
        return Math.round(amount * 100);
      case 'USD':
      case 'EUR':
      case 'GBP':
        return Math.round(amount * 100);
      default:
        return amount;
    }
  }

  /**
   * Convert amount from Flutterwave format to display format
   * @param amount - Amount from Flutterwave
   * @param currency - Currency code
   * @returns number - Display amount
   */
  parseAmount(amount: number, currency: string = 'NGN'): number {
    switch (currency.toUpperCase()) {
      case 'NGN':
      case 'USD':
      case 'EUR':
      case 'GBP':
        return amount / 100;
      default:
        return amount;
    }
  }

  /**
   * Get supported currencies
   * @returns string[] - Array of supported currency codes
   */
  getSupportedCurrencies(): string[] {
    return ['NGN', 'USD', 'GHS', 'KES', 'UGX', 'TZS', 'EUR', 'GBP'];
  }

  /**
   * Get payment methods for a currency
   * @param currency - Currency code
   * @returns string[] - Array of supported payment methods
   */
  getPaymentMethods(currency: string = 'NGN'): string[] {
    const commonMethods = ['card'];

    switch (currency.toUpperCase()) {
      case 'NGN':
        return [...commonMethods, 'account', 'ussd', 'mobilemoney', 'banktransfer'];
      case 'GHS':
        return [...commonMethods, 'mobilemoney'];
      case 'KES':
      case 'UGX':
      case 'TZS':
        return [...commonMethods, 'mobilemoney'];
      default:
        return commonMethods;
    }
  }
}

// Export singleton instance
export const flutterwaveService = new FlutterwaveService();
export default FlutterwaveService;