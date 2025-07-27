import React from 'react';

export interface PaymentFailedEmailProps {
  firstName: string;
  planName: string;
  amount: number;
  currency: string;
  failureReason: string;
  retryDate: string;
  gracePeriodEnd: string;
  appUrl: string;
}

export const PaymentFailedEmail: React.FC<PaymentFailedEmailProps> = ({
  firstName,
  planName,
  amount,
  currency,
  failureReason,
  retryDate,
  gracePeriodEnd,
  appUrl
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payment Failed - Action Required</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', margin: 0, padding: 0 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f9f9f9' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#dc2626', fontSize: '28px', marginBottom: '10px' }}>
              ⚠️ Payment Failed
            </h1>
            <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
              Action required for your {planName} subscription
            </p>
          </div>

          {/* Main Content */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Hi {firstName},
            </p>

            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              We were unable to process the payment for your <strong>{planName}</strong> subscription. Your subscription is still active, but action is required to avoid service interruption.
            </p>

            {/* Payment Details */}
            <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ color: '#dc2626', fontSize: '18px', marginBottom: '15px', marginTop: 0 }}>
                Payment Details
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Plan:</strong></span>
                <span>{planName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Amount:</strong></span>
                <span>{currency.toUpperCase()} {amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Failure Reason:</strong></span>
                <span>{failureReason}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Next Retry:</strong></span>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{retryDate}</span>
              </div>
            </div>

            {/* Urgent Action Required */}
            <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ color: '#92400e', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                🚨 Urgent: Action Required
              </h4>
              <p style={{ fontSize: '14px', margin: 0, color: '#92400e' }}>
                Your subscription will be suspended on <strong>{gracePeriodEnd}</strong> if payment is not resolved.
                Please update your payment method or retry the payment to maintain access to premium features.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <a
                href={`${appUrl}/dashboard/billing/retry-payment`}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '12px 25px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginRight: '15px'
                }}
              >
                Retry Payment Now
              </a>
              <a
                href={`${appUrl}/dashboard/billing/payment-methods`}
                style={{
                  backgroundColor: '#1e40af',
                  color: 'white',
                  padding: '12px 25px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Update Payment Method
              </a>
            </div>

            {/* What happens next */}
            <div style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #0ea5e9' }}>
              <h4 style={{ color: '#0ea5e9', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                What happens next?
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
                <li style={{ marginBottom: '8px' }}>
                  We'll automatically retry the payment on <strong>{retryDate}</strong>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  You have until <strong>{gracePeriodEnd}</strong> to resolve the payment issue
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Your premium features remain active during this grace period
                </li>
                <li style={{ marginBottom: '0' }}>
                  If payment isn't resolved, your subscription will be suspended
                </li>
              </ul>
            </div>

            {/* Common Issues */}
            <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <h4 style={{ color: '#374151', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                Common reasons for payment failure:
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#6b7280' }}>
                <li style={{ marginBottom: '5px' }}>Insufficient funds in your account</li>
                <li style={{ marginBottom: '5px' }}>Expired or invalid payment method</li>
                <li style={{ marginBottom: '5px' }}>Bank declined the transaction</li>
                <li style={{ marginBottom: '0' }}>Payment method needs verification</li>
              </ul>
            </div>

            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              If you continue to experience issues, please contact our support team for assistance.
            </p>

            <p style={{ fontSize: '16px', margin: 0 }}>
              Best regards,<br />
              <strong>The Boami Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#999' }}>
            <p>
              This is an important notification about your subscription payment.
            </p>
            <p>
              Need help? Contact us at support@boami.com
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};