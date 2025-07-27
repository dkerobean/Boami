'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  IconCreditCard,
  IconShield,
  IconAlertCircle,
  IconCheck,
  IconCheckbox
} from '@tabler/icons-react';

// Icon components
const CreditCardIcon = IconCreditCard;
const ShieldCheckIcon = IconShield;
const AlertCircleIcon = IconAlertCircle;
const CheckCircleIcon = IconCheck;
import { formatCurrency } from '@/lib/utils/format';

interface Plan {
  id: string;
  name: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: string[];
  trialDays: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  billingPeriod: 'monthly' | 'annual';
  user?: any;
  isUpgrade?: boolean;
  processing?: boolean;
  onSuccess?: (paymentData: any) => void;
  onPaymentSuccess?: (subscriptionId: string) => void;
  onPaymentError?: (error: string) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  plan,
  billingPeriod,
  user,
  isUpgrade = false,
  processing = false,
  onSuccess,
  onPaymentSuccess,
  onPaymentError
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success'>('details');

  // Customer information
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  // Payment information
  const [paymentInfo, setPaymentInfo] = useState({
    paymentMethod: 'card'
  });

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleCustomerInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer information
    if (!customerInfo.email || !customerInfo.firstName || !customerInfo.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plan) return;

    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      // Create subscription
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          billingPeriod,
          paymentMethod: paymentInfo.paymentMethod,
          customerInfo
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();

      if (data.success) {
        // Redirect to Flutterwave payment page
        if (data.data.paymentLink) {
          window.location.href = data.data.paymentLink;
        } else {
          setStep('success');
          if (onPaymentSuccess) {
            onPaymentSuccess(data.data.subscription.id);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to create subscription');
      }
    } catch (err: any) {
      setError(err.message);
      setStep('payment');
      if (onPaymentError) {
        onPaymentError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPrice = () => {
    if (!plan) return 0;
    return billingPeriod === 'monthly' ? plan.price.monthly : plan.price.annual;
  };

  const getSavings = () => {
    if (!plan || billingPeriod === 'monthly') return null;
    const monthlyCost = plan.price.monthly * 12;
    const annualCost = plan.price.annual;
    const savings = monthlyCost - annualCost;
    const savingsPercent = Math.round((savings / monthlyCost) * 100);
    return { amount: savings, percent: savingsPercent };
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'details', label: 'Details', completed: ['payment', 'processing', 'success'].includes(step) },
      { key: 'payment', label: 'Payment', completed: ['processing', 'success'].includes(step) },
      { key: 'processing', label: 'Processing', completed: step === 'success' },
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-6">
        {steps.map((stepItem, index) => (
          <React.Fragment key={stepItem.key}>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepItem.completed
                    ? 'bg-green-500 text-white'
                    : step === stepItem.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepItem.completed ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="ml-2 text-sm font-medium">{stepItem.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-border" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderCustomerDetailsStep = () => (
    <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={customerInfo.firstName}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={customerInfo.lastName}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={customerInfo.email}
          onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={customerInfo.phone}
          onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Continue to Payment
        </Button>
      </div>
    </form>
  );

  const renderPaymentStep = () => (
    <form onSubmit={handlePaymentSubmit} className="space-y-4">
      <div>
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <Select
          value={paymentInfo.paymentMethod}
          onValueChange={(value) => setPaymentInfo(prev => ({ ...prev, paymentMethod: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="card">
              <div className="flex items-center">
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Credit/Debit Card
              </div>
            </SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Security Notice */}
      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <ShieldCheckIcon className="h-4 w-4 text-green-600" />
          <span className="font-medium text-sm">Secure Payment</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your payment information is encrypted and processed securely through Flutterwave.
          We never store your payment details.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={() => setStep('details')}>
          Back
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(getPrice(), plan?.price.currency || 'USD')}`
          )}
        </Button>
      </div>
    </form>
  );

  const renderProcessingStep = () => (
    <div className="text-center py-8">
      <Spinner size="lg" className="mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Processing Your Payment</h3>
      <p className="text-muted-foreground">
        Please wait while we set up your subscription...
      </p>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Subscription Created!</h3>
      <p className="text-muted-foreground mb-6">
        Your subscription has been set up successfully. You can now access all features.
      </p>
      <Button onClick={onClose} className="w-full">
        Get Started
      </Button>
    </div>
  );

  if (!plan) return null;

  const price = getPrice();
  const savings = getSavings();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
        </DialogHeader>

        {/* Plan Summary */}
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium">{plan.name} Plan</h4>
              <p className="text-sm text-muted-foreground capitalize">
                {billingPeriod} billing
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">
                {formatCurrency(price, plan.price.currency)}
              </div>
              <div className="text-sm text-muted-foreground">
                per {billingPeriod === 'monthly' ? 'month' : 'year'}
              </div>
            </div>
          </div>

          {savings && (
            <Badge variant="secondary" className="mb-2">
              Save {formatCurrency(savings.amount, plan.price.currency)} ({savings.percent}%)
            </Badge>
          )}

          {plan.trialDays > 0 && (
            <div className="text-sm text-green-600">
              Includes {plan.trialDays}-day free trial
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        {step !== 'success' && renderStepIndicator()}

        {/* Step Content */}
        {step === 'details' && renderCustomerDetailsStep()}
        {step === 'payment' && renderPaymentStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'success' && renderSuccessStep()}
      </DialogContent>
    </Dialog>
  );
}

export { PaymentModal };
export type { PaymentModalProps };