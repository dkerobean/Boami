/**
 * Flutterwave configuration and environment setup
 * Centralizes all Flutterwave-related configuration
 */

export interface FlutterwaveEnvironmentConfig {
  publicKey: string;
  secretKey: string;
  secretHash: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  webhookUrl: string;
  companyLogoUrl: string;
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables(): void {
  const requiredVars = [
    'FLUTTERWAVE_PUBLIC_KEY',
    'FLUTTERWAVE_SECRET_KEY',
    'NEXT_PUBLIC_BASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all Flutterwave configuration is set.'
    );
  }
}

/**
 * Get Flutterwave configuration from environment variables
 */
export function getFlutterwaveConfig(): FlutterwaveEnvironmentConfig {
  // Validate environment variables first
  validateEnvironmentVariables();

  const isProduction = process.env.NODE_ENV === 'production';
  const environment = process.env.FLUTTERWAVE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

  // Warn if using sandbox in production
  if (isProduction && environment === 'sandbox') {
    console.warn('⚠️ WARNING: Using Flutterwave sandbox in production environment');
  }

  return {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY!,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY!,
    secretHash: process.env.FLUTTERWAVE_SECRET_HASH || '',
    environment,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
    webhookUrl: process.env.SUBSCRIPTION_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/api/subscriptions/webhooks/flutterwave`,
    companyLogoUrl: process.env.COMPANY_LOGO_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/images/logos/dark-logo.svg`
  };
}

/**
 * Get client-side Flutterwave configuration (safe for frontend)
 */
export function getClientFlutterwaveConfig() {
  return {
    publicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY,
    environment: process.env.FLUTTERWAVE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    companyLogoUrl: process.env.COMPANY_LOGO_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/images/logos/dark-logo.svg`
  };
}

/**
 * Flutterwave API endpoints configuration
 */
export const FLUTTERWAVE_ENDPOINTS = {
  sandbox: {
    base: 'https://api.flutterwave.com/v3',
    checkout: 'https://checkout.flutterwave.com/v3'
  },
  production: {
    base: 'https://api.flutterwave.com/v3',
    checkout: 'https://checkout.flutterwave.com/v3'
  }
} as const;

/**
 * Default payment configuration
 */
export const DEFAULT_PAYMENT_CONFIG = {
  currency: 'NGN',
  paymentOptions: 'card,mobilemoney,ussd,banktransfer',
  customizations: {
    title: 'BOAMI Subscription',
    description: 'Secure payment for your subscription',
  }
} as const;

/**
 * Supported currencies and their configurations
 */
export const SUPPORTED_CURRENCIES = {
  NGN: {
    name: 'Nigerian Naira',
    symbol: '₦',
    code: 'NGN',
    locale: 'en-NG',
    paymentMethods: ['card', 'account', 'ussd', 'mobilemoney', 'banktransfer']
  },
  USD: {
    name: 'US Dollar',
    symbol: '$',
    code: 'USD',
    locale: 'en-US',
    paymentMethods: ['card']
  },
  GHS: {
    name: 'Ghanaian Cedi',
    symbol: '₵',
    code: 'GHS',
    locale: 'en-GH',
    paymentMethods: ['card', 'mobilemoney']
  },
  KES: {
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    code: 'KES',
    locale: 'en-KE',
    paymentMethods: ['card', 'mobilemoney']
  },
  UGX: {
    name: 'Ugandan Shilling',
    symbol: 'USh',
    code: 'UGX',
    locale: 'en-UG',
    paymentMethods: ['card', 'mobilemoney']
  },
  TZS: {
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    code: 'TZS',
    locale: 'en-TZ',
    paymentMethods: ['card', 'mobilemoney']
  }
} as const;

/**
 * Payment plan intervals supported by Flutterwave
 */
export const PAYMENT_INTERVALS = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  biannually: 'biannually',
  yearly: 'yearly'
} as const;

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  CHARGE_COMPLETED: 'charge.completed',
  TRANSFER_COMPLETED: 'transfer.completed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled'
} as const;

/**
 * Payment status mappings
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

/**
 * Error codes and messages
 */
export const FLUTTERWAVE_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid Flutterwave API credentials'
  },
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    message: 'Payment processing failed'
  },
  WEBHOOK_VERIFICATION_FAILED: {
    code: 'WEBHOOK_VERIFICATION_FAILED',
    message: 'Webhook signature verification failed'
  },
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient funds for transaction'
  },
  CARD_DECLINED: {
    code: 'CARD_DECLINED',
    message: 'Card was declined by issuer'
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error occurred during payment processing'
  }
} as const;

/**
 * Rate limiting configuration for payment endpoints
 */
export const RATE_LIMITS = {
  PAYMENT_INITIALIZATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // 10 payment initializations per 15 minutes per IP
  },
  WEBHOOK_PROCESSING: {
    windowMs: 60 * 1000, // 1 minute
    max: 100 // 100 webhook requests per minute per IP
  },
  PAYMENT_VERIFICATION: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // 30 verification requests per minute per IP
  }
} as const;

/**
 * Timeout configurations
 */
export const TIMEOUTS = {
  PAYMENT_INITIALIZATION: 30000, // 30 seconds
  PAYMENT_VERIFICATION: 15000, // 15 seconds
  WEBHOOK_PROCESSING: 10000 // 10 seconds
} as const;

/**
 * Retry configuration for failed operations
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_FACTOR: 2
} as const;

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  LOG_PAYMENTS: process.env.NODE_ENV !== 'production',
  LOG_WEBHOOKS: true,
  LOG_ERRORS: true,
  MASK_SENSITIVE_DATA: true
} as const;

// Export lazy configuration getter
let flutterwaveConfigInstance: FlutterwaveEnvironmentConfig | null = null;

export const flutterwaveConfig = {
  get instance(): FlutterwaveEnvironmentConfig {
    if (!flutterwaveConfigInstance) {
      flutterwaveConfigInstance = getFlutterwaveConfig();
    }
    return flutterwaveConfigInstance;
  }
};