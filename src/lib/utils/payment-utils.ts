import { FlutterwaveService } from '../services/FlutterwaveService';

/**
 * Payment utility functions for subscription system
 * Provides helper functions for payment processing and formatting
 */

/**
 * Generate a unique transaction reference for subscriptions
 * @param userId - User ID
 * @param planId - Plan ID
 * @param type - Transaction type
 * @returns string - Unique transaction reference
 */
export function generateSubscriptionReference(
  userId: string,
  planId: string,
  type: 'subscription' | 'upgrade' | 'downgrade' | 'renewal' = 'subscription'
): string {
  const timestamp = Date.now();
  const userIdShort = userId.slice(-6);
  const planIdShort = planId.slice(-6);
  const typePrefix = type.toUpperCase().slice(0, 3);

  return `BOAMI_${typePrefix}_${userIdShort}_${planIdShort}_${timestamp}`;
}

/**
 * Format currency amount for display
 * @pa- Amount to format
 * @param currency - Currency code
 * @param locale - Locale for formatting
 * @returns string - Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'NGN',
  locale: string = 'en-NG'
): string {
  const currencyMap: Record<string, string> = {
    NGN: 'en-NG',
    USD: 'en-US',
    GHS: 'en-GH',
    KES: 'en-KE',
    UGX: 'en-UG',
    TZS: 'en-TZ',
    EUR: 'en-EU',
    GBP: 'en-GB'
  };

  const localeToUse = currencyMap[currency.toUpperCase()] || locale;

  try {
    return new Intl.NumberFormat(localeToUse, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: currency.toUpperCase() === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency.toUpperCase() === 'NGN' ? 0 : 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbols: Record<string, string> = {
      NGN: '₦',
      USD: '$',
      GHS: '₵',
      KES: 'KSh',
      UGX: 'USh',
      TZS: 'TSh',
      EUR: '€',
      GBP: '£'
    };

    const symbol = symbols[currency.toUpperCase()] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Calculate subscription pricing with discounts
 * @param monthlyPrice - Monthly price
 * @param annualPrice - Annual price
 * @returns object - Pricing calculations
 */
export function calculateSubscriptionPricing(monthlyPrice: number, annualPrice: number) {
  const monthlyTotal = monthlyPrice * 12;
  const annualDiscount = monthlyTotal - annualPrice;
  const discountPercentage = Math.round((annualDiscount / monthlyTotal) * 100);
  const monthlySavings = annualDiscount / 12;

  return {
    monthly: {
      price: monthlyPrice,
      total: monthlyPrice,
      period: 'month'
    },
    annual: {
      price: annualPrice,
      monthlyEquivalent: annualPrice / 12,
      total: annualPrice,
      period: 'year',
      discount: {
        amount: annualDiscount,
        percentage: discountPercentage,
        monthlySavings: monthlySavings
      }
    },
    comparison: {
      annualSavings: annualDiscount,
      discountPercentage: discountPercentage,
      monthsFreeBenefit: Math.floor(annualDiscount / monthlyPrice)
    }
  };
}

/**
 * Calculate prorated amount for subscription changes
 * @param currentPlan - Current plan details
 * @param newPlan - New plan details
 * @param daysRemaining - Days remaining in current period
 * @param totalDaysInPeriod - Total days in billing period
 * @returns object - Prorated calculation
 */
export function calculateProratedAmount(
  currentPlan: { price: number; currency: string },
  newPlan: { price: number; currency: string },
  daysRemaining: number,
  totalDaysInPeriod: number = 30
) {
  if (currentPlan.currency !== newPlan.currency) {
    throw new Error('Currency mismatch in prorated calculation');
  }

  const dailyCurrentRate = currentPlan.price / totalDaysInPeriod;
  const dailyNewRate = newPlan.price / totalDaysInPeriod;

  const currentPlanRefund = dailyCurrentRate * daysRemaining;
  const newPlanCharge = dailyNewRate * daysRemaining;
  const proratedAmount = newPlanCharge - currentPlanRefund;

  return {
    currentPlanRefund: Math.round(currentPlanRefund * 100) / 100,
    newPlanCharge: Math.round(newPlanCharge * 100) / 100,
    proratedAmount: Math.round(proratedAmount * 100) / 100,
    isUpgrade: proratedAmount > 0,
    isDowngrade: proratedAmount < 0,
    currency: currentPlan.currency
  };
}

/**
 * Validate payment amount against plan pricing
 * @param amount - Payment amount
 * @param planPrice - Expected plan price
 * @param tolerance - Tolerance for amount validation (default 1%)
 * @returns boolean - Whether amount is valid
 */
export function validatePaymentAmount(
  amount: number,
  planPrice: number,
  tolerance: number = 0.01
): boolean {
  const difference = Math.abs(amount - planPrice);
  const toleranceAmount = planPrice * tolerance;
  return difference <= toleranceAmount;
}

/**
 * Get payment method display name
 * @param paymentMethod - Payment method code
 * @returns string - Display name
 */
export function getPaymentMethodDisplayName(paymentMethod: string): string {
  const methodNames: Record<string, string> = {
    card: 'Credit/Debit Card',
    account: 'Bank Account',
    ussd: 'USSD',
    mobilemoney: 'Mobile Money',
    banktransfer: 'Bank Transfer',
    qr: 'QR Code',
    mpesa: 'M-Pesa',
    airtel: 'Airtel Money',
    mtn: 'MTN Mobile Money',
    vodafone: 'Vodafone Cash',
    tigo: 'Tigo Cash'
  };

  return methodNames[paymentMethod.toLowerCase()] || paymentMethod;
}

/**
 * Get subscription status display information
 * @param status - Subscription status
 * @returns object - Status display information
 */
export function getSubscriptionStatusDisplay(status: string) {
  const statusMap: Record<string, { label: string; color: string; description: string }> = {
    active: {
      label: 'Active',
      color: 'success',
      description: 'Your subscription is active and all features are available'
    },
    pending: {
      label: 'Pending',
      color: 'warning',
      description: 'Payment is being processed'
    },
    past_due: {
      label: 'Past Due',
      color: 'error',
      description: 'Payment failed, please update your payment method'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'default',
      description: 'Your subscription has been cancelled'
    },
    expired: {
      label: 'Expired',
      color: 'error',
      description: 'Your subscription has expired'
    }
  };

  return statusMap[status] || {
    label: status,
    color: 'default',
    description: 'Unknown status'
  };
}

/**
 * Calculate days until subscription expiry
 * @param expiryDate - Subscription expiry date
 * @returns number - Days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get subscription renewal date
 * @param currentPeriodEnd - Current period end date
 * @param interval - Billing interval ('monthly' or 'annual')
 * @returns Date - Next renewal date
 */
export function getNextRenewalDate(currentPeriodEnd: Date, interval: 'monthly' | 'annual'): Date {
  const renewalDate = new Date(currentPeriodEnd);

  if (interval === 'monthly') {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  } else {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  }

  return renewalDate;
}

/**
 * Format subscription period for display
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns string - Formatted period string
 */
export function formatSubscriptionPeriod(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * Check if subscription is in trial period
 * @param trialEnd - Trial end date
 * @returns boolean - Whether subscription is in trial
 */
export function isInTrialPeriod(trialEnd?: Date): boolean {
  if (!trialEnd) return false;
  return new Date() < new Date(trialEnd);
}

/**
 * Get trial days remaining
 * @param trialEnd - Trial end date
 * @returns number - Days remaining in trial (0 if no trial or expired)
 */
export function getTrialDaysRemaining(trialEnd?: Date): number {
  if (!trialEnd) return 0;
  const daysRemaining = getDaysUntilExpiry(trialEnd);
  return Math.max(0, daysRemaining);
}

/**
 * Validate webhook payload structure
 * @param payload - Webhook payload
 * @returns boolean - Whether payload is valid
 */
export function validateWebhookPayload(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;

  const requiredFields = ['event', 'data'];
  const dataRequiredFields = ['id', 'tx_ref', 'amount', 'currency', 'status'];

  // Check top-level fields
  for (const field of requiredFields) {
    if (!(field in payload)) return false;
  }

  // Check data fields
  for (const field of dataRequiredFields) {
    if (!(field in payload.data)) return false;
  }

  return true;
}

/**
 * Create Flutterwave service instance with environment configuration
 * @returns FlutterwaveService - Configured service instance
 */
export function createFlutterwaveService(): FlutterwaveService {
  return new FlutterwaveService({
    public_key: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secret_key: process.env.FLUTTERWAVE_SECRET_KEY,
    secret_hash: process.env.FLUTTERWAVE_SECRET_HASH,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
  });
}