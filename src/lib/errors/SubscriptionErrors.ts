/**
 * Custom error classes for subscription and payment-related errors
 */

export class SubscriptionError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly subscriptionId?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    userId?: string,
    subscriptionId?: string
  ) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.userId = userId;
    this.subscriptionId = subscriptionId;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SubscriptionError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      userId: this.userId,
      subscriptionId: this.subscriptionId,
      stack: this.stack
    };
  }
}

export class PaymentError extends SubscriptionError {
  public readonly paymentReference?: string;
  public readonly flutterwaveReference?: string;
  public readonly amount?: number;
  public readonly currency?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    userId?: string,
    paymentReference?: string,
    flutterwaveReference?: string,
    amount?: number,
    currency?: string
  ) {
    super(message, code, statusCode, details, userId);
    this.name = 'PaymentError';
    this.paymentReference = paymentReference;
    this.flutterwaveReference = flutterwaveReference;
    this.amount = amount;
    this.currency = currency;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      paymentReference: this.paymentReference,
      flutterwaveReference: this.flutterwaveReference,
      amount: this.amount,
      currency: this.currency
    };
  }
}

export class WebhookError extends SubscriptionError {
  public readonly webhookId?: string;
  public readonly webhookType?: string;
  public readonly retryCount?: number;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    webhookId?: string,
    webhookType?: string,
    retryCount?: number
  ) {
    super(message, code, statusCode, details);
    this.name = 'WebhookError';
    this.webhookId = webhookId;
    this.webhookType = webhookType;
    this.retryCount = retryCount;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      webhookId: this.webhookId,
      webhookType: this.webhookType,
      retryCount: this.retryCount
    };
  }
}

export class FeatureAccessError extends SubscriptionError {
  public readonly feature?: string;
  public readonly requiredPlan?: string;
  public readonly currentPlan?: string;

  constructor(
    message: string,
    code: string,
    feature?: string,
    requiredPlan?: string,
    currentPlan?: string,
    userId?: string
  ) {
    super(message, code, 403, { feature, requiredPlan, currentPlan }, userId);
    this.name = 'FeatureAccessError';
    this.feature = feature;
    this.requiredPlan = requiredPlan;
    this.currentPlan = currentPlan;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      feature: this.feature,
      requiredPlan: this.requiredPlan,
      currentPlan: this.currentPlan
    };
  }
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Subscription errors
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_ALREADY_EXISTS: 'SUBSCRIPTION_ALREADY_EXISTS',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_INVALID_STATUS: 'SUBSCRIPTION_INVALID_STATUS',
  SUBSCRIPTION_UPDATE_FAILED: 'SUBSCRIPTION_UPDATE_FAILED',
  SUBSCRIPTION_CREATION_FAILED: 'SUBSCRIPTION_CREATION_FAILED',

  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_VERIFICATION_FAILED: 'PAYMENT_VERIFICATION_FAILED',
  PAYMENT_REFERENCE_INVALID: 'PAYMENT_REFERENCE_INVALID',
  PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
  PAYMENT_CURRENCY_MISMATCH: 'PAYMENT_CURRENCY_MISMATCH',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',

  // Webhook errors
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_PAYLOAD_INVALID: 'WEBHOOK_PAYLOAD_INVALID',
  WEBHOOK_PROCESSING_FAILED: 'WEBHOOK_PROCESSING_FAILED',
  WEBHOOK_RETRY_EXCEEDED: 'WEBHOOK_RETRY_EXCEEDED',
  WEBHOOK_DUPLICATE: 'WEBHOOK_DUPLICATE',

  // Feature access errors
  FEATURE_ACCESS_DENIED: 'FEATURE_ACCESS_DENIED',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  PLAN_INACTIVE: 'PLAN_INACTIVE',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',

  // General errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

// Helper functions to create specific errors
export const createSubscriptionError = (
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any,
  userId?: string,
  subscriptionId?: string
) => {
  const statusCode = getStatusCodeForError(code);
  return new SubscriptionError(message, ERROR_CODES[code], statusCode, details, userId, subscriptionId);
};

export const createPaymentError = (
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any,
  userId?: string,
  paymentReference?: string,
  flutterwaveReference?: string,
  amount?: number,
  currency?: string
) => {
  const statusCode = getStatusCodeForError(code);
  return new PaymentError(
    message,
    ERROR_CODES[code],
    statusCode,
    details,
    userId,
    paymentReference,
    flutterwaveReference,
    amount,
    currency
  );
};

export const createWebhookError = (
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any,
  webhookId?: string,
  webhookType?: string,
  retryCount?: number
) => {
  const statusCode = getStatusCodeForError(code);
  return new WebhookError(message, ERROR_CODES[code], statusCode, details, webhookId, webhookType, retryCount);
};

export const createFeatureAccessError = (
  feature: string,
  requiredPlan?: string,
  currentPlan?: string,
  userId?: string
) => {
  const message = `Access denied to feature: ${feature}. ${requiredPlan ? `Requires ${requiredPlan} plan.` : ''}`;
  return new FeatureAccessError(
    message,
    ERROR_CODES.FEATURE_ACCESS_DENIED,
    feature,
    requiredPlan,
    currentPlan,
    userId
  );
};

// Helper function to get appropriate HTTP status code for error
function getStatusCodeForError(code: keyof typeof ERROR_CODES): number {
  const statusCodeMap: Record<string, number> = {
    [ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: 404,
    [ERROR_CODES.PLAN_NOT_FOUND]: 404,
    [ERROR_CODES.SUBSCRIPTION_ALREADY_EXISTS]: 409,
    [ERROR_CODES.PAYMENT_ALREADY_PROCESSED]: 409,
    [ERROR_CODES.WEBHOOK_DUPLICATE]: 409,
    [ERROR_CODES.FEATURE_ACCESS_DENIED]: 403,
    [ERROR_CODES.AUTHORIZATION_FAILED]: 403,
    [ERROR_CODES.AUTHENTICATION_REQUIRED]: 401,
    [ERROR_CODES.INVALID_REQUEST]: 400,
    [ERROR_CODES.PAYMENT_REFERENCE_INVALID]: 400,
    [ERROR_CODES.PAYMENT_AMOUNT_MISMATCH]: 400,
    [ERROR_CODES.PAYMENT_CURRENCY_MISMATCH]: 400,
    [ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: 400,
    [ERROR_CODES.WEBHOOK_PAYLOAD_INVALID]: 400,
    [ERROR_CODES.SUBSCRIPTION_INVALID_STATUS]: 400,
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
    [ERROR_CODES.PAYMENT_TIMEOUT]: 408
  };

  return statusCodeMap[ERROR_CODES[code]] || 500;
}