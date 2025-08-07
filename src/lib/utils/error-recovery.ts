/**
 * User-friendly error messages and recovery flows for payment failures
 */

import { SubscriptionError, PaymentError, WebhookError, FeatureAccessError, ERROR_CODES } from '../errors/SubscriptionErrors';
import { subscriptionLogger } from './subscription-logger';

export interface ErrorRecoveryAction {
  type: 'retry' | 'redirect' | 'contact_support' | 'upgrade' | 'login' | 'refresh';
  label: string;
  url?: string;
  data?: Record<string, any>;
  primary?: boolean;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  recoveryActions: ErrorRecoveryAction[];
  technicalDetails?: string;
  errorCode?: string;
  supportReference?: string;
}

class ErrorRecoveryService {
  private generateSupportReference(): string {
    return `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  public handleError(error: Error, context?: Record<string, any>): UserFriendlyError {
    const supportReference = this.generateSupportReference();

    // Log the error with support reference
    subscriptionLogger.error('Error handled by recovery service', {
      error: error.message,
      supportReference,
      ...context
    });

    if (error instanceof PaymentError) {
      return this.handlePaymentError(error, supportReference);
    }

    if (error instanceof SubscriptionError) {
      return this.handleSubscriptionError(error, supportReference);
    }

    if (error instanceof WebhookError) {
      return this.handleWebhookError(error, supportReference);
    }

    if (error instanceof FeatureAccessError) {
      return this.handleFeatureAccessError(error, supportReference);
    }

    // Generic error handling
    return this.handleGenericError(error, supportReference);
  }

  private handlePaymentError(error: PaymentError, supportReference: string): UserFriendlyError {
    const baseActions: ErrorRecoveryAction[] = [
      {
        type: 'contact_support',
        label: 'Contact Support',
        url: '/contact',
        data: { reference: supportReference }
      }
    ];

    switch (error.code) {
      case ERROR_CODES.PAYMENT_FAILED:
        return {
          title: 'Payment Failed',
          message: 'We couldn\'t process your payment. This might be due to insufficient funds, an expired card, or a temporary issue with your payment method.',
          severity: 'error',
          recoveryActions: [
            {
              type: 'retry',
              label: 'Try Again',
              primary: true,
              data: { paymentReference: error.paymentReference }
            },
            {
              type: 'redirect',
              label: 'Update Payment Method',
              url: '/subscription/payment-methods'
            },
            ...baseActions
          ],
          technicalDetails: `Payment reference: ${error.paymentReference}`,
          errorCode: error.code,
          supportReference
        };

      case ERROR_CODES.PAYMENT_VERIFICATION_FAILED:
        return {
          title: 'Payment Verification Failed',
          message: 'We\'re having trouble verifying your payment. Don\'t worry - if the payment went through, we\'ll update your subscription shortly.',
          severity: 'warning',
          recoveryActions: [
            {
              type: 'refresh',
              label: 'Check Status',
              primary: true
            },
            {
              type: 'redirect',
              label: 'View Subscription',
              url: '/subscription/manage'
            },
            ...baseActions
          ],
          technicalDetails: `Flutterwave reference: ${error.flutterwaveReference}`,
          errorCode: error.code,
          supportReference
        };

      case ERROR_CODES.PAYMENT_TIMEOUT:
        return {
          title: 'Payment Timeout',
          message: 'The payment process took too long and timed out. Please try again.',
          severity: 'warning',
          recoveryActions: [
            {
              type: 'retry',
              label: 'Try Again',
              primary: true,
              data: { paymentReference: error.paymentReference }
            },
            ...baseActions
          ],
          errorCode: error.code,
          supportReference
        };

      case ERROR_CODES.PAYMENT_ALREADY_PROCESSED:
        return {
          title: 'Payment Already Processed',
          message: 'This payment has already been processed. Check your subscription status or billing history.',
          severity: 'info',
          recoveryActions: [
            {
              type: 'redirect',
              label: 'View Subscription',
              url: '/subscription/manage',
              primary: true
            },
            {
              type: 'redirect',
              label: 'Billing History',
              url: '/subscription/billing'
            }
          ],
          errorCode: error.code,
          supportReference
        };

      default:
        return {
          title: 'Payment Error',
          message: 'An unexpected error occurred while processing your payment. Please try again or contact support.',
          severity: 'error',
          recoveryActions: [
            {
              type: 'retry',
              label: 'Try Again',
              primary: true
            },
            ...baseActions
          ],
          errorCode: error.code,
          supportReference
        };
    }
  }

  private handleSubscriptionError(error: SubscriptionError, supportReference: string): UserFriendlyError {
    const baseActions: ErrorRecoveryAction[] = [
      {
        type: 'contact_support',
        label: 'Contact Support',
        url: '/contact',
        data: { reference: supportReference }
      }
    ];

    switch (error.code) {
      case ERROR_CODES.SUBSCRIPTION_NOT_FOUND:
        return {
          title: 'Subscription Not Found',
          message: 'We couldn\'t find your subscription. You may need to create a new subscription.',
          severity: 'warning',
          recoveryActions: [
            {
              type: 'redirect',
              label: 'View Plans',
              url: '/subscription/plans',
              primary: true
            },
            {
              type: 'refresh',
              label: 'Refresh Page'
            },
            ...baseActions
          ],
          errorCode: error.code,
          supportReference
        };

      case ERROR_CODES.SUBSCRIPTION_ALREADY_EXISTS:
        return {
          title: 'Subscription Already Exists',
          message: 'You already have an active subscription. You can manage or upgrade your existing subscription.',
          severity: 'info',
          recoveryActions: [
            {
              type: 'redirect',
              label: 'Manage Subscription',
              url: '/subscription/manage',
              primary: true
            },
            {
              type: 'redirect',
              label: 'Upgrade Plan',
              url: '/subscription/plans'
            }
          ],
          errorCode: error.code,
          supportReference
        };

      case ERROR_CODES.SUBSCRIPTION_CANCELLED:
        return {
          title: 'Subscription Cancelled',
          message: 'Your subscription has been cancelled. You can reactivate it or choose a new plan.',
          severity: 'warning',
          recoveryActions: [
            {
              type: 'redirect',
              label: 'Reactivate Subscription',
              url: '/subscription/reactivate',
              primary: true
            },
            {
              type: 'redirect',
              label: 'Choose New Plan',
              url: '/subscription/plans'
            },
            ...baseActions
          ],
          errorCode: error.code,
          supportReference
        };

      case ERROR_CODES.SUBSCRIPTION_EXPIRED:
        return {
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Renew your subscription to continue accessing premium features.',
          severity: 'warning',
          recoveryActions: [
            {
              type: 'redirect',
              label: 'Renew Subscription',
              url: '/subscription/renew',
              primary: true
            },
            {
              type: 'redirect',
              label: 'View Plans',
              url: '/subscription/plans'
            },
            ...baseActions
          ],
          errorCode: error.code,
          supportReference
        };

      default:
        return {
          title: 'Subscription Error',
          message: 'An error occurred with your subscription. Please try again or contact support for assistance.',
          severity: 'error',
          recoveryActions: [
            {
              type: 'refresh',
              label: 'Try Again',
              primary: true
            },
            ...baseActions
          ],
          errorCode: error.code,
          supportReference
        };
    }
  }

  private handleFeatureAccessError(error: FeatureAccessError, supportReference: string): UserFriendlyError {
    return {
      title: 'Feature Not Available',
      message: `The feature "${error.feature}" is not available with your current plan. ${error.requiredPlan ? `Upgrade to ${error.requiredPlan} to access this feature.` : 'Please upgrade your plan to access this feature.'}`,
      severity: 'warning',
      recoveryActions: [
        {
          type: 'upgrade',
          label: error.requiredPlan ? `Upgrade to ${error.requiredPlan}` : 'Upgrade Plan',
          url: '/subscription/plans',
          primary: true,
          data: { feature: error.feature, requiredPlan: error.requiredPlan }
        },
        {
          type: 'redirect',
          label: 'View Current Plan',
          url: '/subscription/manage'
        }
      ],
      errorCode: error.code,
      supportReference
    };
  }

  private handleWebhookError(error: WebhookError, supportReference: string): UserFriendlyError {
    return {
      title: 'Processing Error',
      message: 'We\'re experiencing a temporary issue processing your request. We\'re working to resolve this automatically.',
      severity: 'warning',
      recoveryActions: [
        {
          type: 'refresh',
          label: 'Check Status',
          primary: true
        },
        {
          type: 'contact_support',
          label: 'Contact Support',
          url: '/contact',
          data: { reference: supportReference }
        }
      ],
      technicalDetails: `Webhook ID: ${error.webhookId}`,
      errorCode: error.code,
      supportReference
    };
  }

  private handleGenericError(error: Error, supportReference: string): UserFriendlyError {
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again, and if the problem persists, contact our support team.',
      severity: 'error',
      recoveryActions: [
        {
          type: 'refresh',
          label: 'Try Again',
          primary: true
        },
        {
          type: 'contact_support',
          label: 'Contact Support',
          url: '/contact',
          data: { reference: supportReference }
        }
      ],
      technicalDetails: error.message,
      supportReference
    };
  }

  // Method to get recovery actions for specific error codes
  public getRecoveryActions(errorCode: string): ErrorRecoveryAction[] {
    const actionMap: Record<string, ErrorRecoveryAction[]> = {
      [ERROR_CODES.PAYMENT_FAILED]: [
        { type: 'retry', label: 'Retry Payment', primary: true },
        { type: 'redirect', label: 'Update Payment Method', url: '/subscription/payment-methods' }
      ],
      [ERROR_CODES.FEATURE_ACCESS_DENIED]: [
        { type: 'upgrade', label: 'Upgrade Plan', url: '/subscription/plans', primary: true }
      ],
      [ERROR_CODES.AUTHENTICATION_REQUIRED]: [
        { type: 'login', label: 'Sign In', url: '/auth/auth1/login', primary: true }
      ],
      [ERROR_CODES.SUBSCRIPTION_EXPIRED]: [
        { type: 'redirect', label: 'Renew Subscription', url: '/subscription/renew', primary: true }
      ]
    };

    return actionMap[errorCode] || [
      { type: 'refresh', label: 'Try Again', primary: true },
      { type: 'contact_support', label: 'Contact Support', url: '/contact' }
    ];
  }

  // Method to check if an error is recoverable
  public isRecoverable(error: Error): boolean {
    if (error instanceof PaymentError) {
      return [
        ERROR_CODES.PAYMENT_FAILED,
        ERROR_CODES.PAYMENT_TIMEOUT,
        ERROR_CODES.PAYMENT_VERIFICATION_FAILED
      ].includes(error.code as any);
    }

    if (error instanceof SubscriptionError) {
      return [
        ERROR_CODES.SUBSCRIPTION_EXPIRED,
        ERROR_CODES.SUBSCRIPTION_CANCELLED
      ].includes(error.code as any);
    }

    if (error instanceof FeatureAccessError) {
      return true; // Feature access errors are always recoverable via upgrade
    }

    return false;
  }
}

// Create singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

// Helper function to handle errors in API routes
export const handleApiError = (error: Error, context?: Record<string, any>) => {
  const userFriendlyError = errorRecoveryService.handleError(error, context);

  return {
    success: false,
    error: userFriendlyError.message,
    errorCode: userFriendlyError.errorCode,
    supportReference: userFriendlyError.supportReference,
    recoveryActions: userFriendlyError.recoveryActions,
    severity: userFriendlyError.severity
  };
};

// Helper function to handle errors in React components
export const useErrorRecovery = () => {
  const handleError = (error: Error, context?: Record<string, any>) => {
    return errorRecoveryService.handleError(error, context);
  };

  const isRecoverable = (error: Error) => {
    return errorRecoveryService.isRecoverable(error);
  };

  const getRecoveryActions = (errorCode: string) => {
    return errorRecoveryService.getRecoveryActions(errorCode);
  };

  return {
    handleError,
    isRecoverable,
    getRecoveryActions
  };
};