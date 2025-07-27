import React from 'react';

export interface SubscriptionRenewalReminderEmailProps {
  firstName: string;
  planName: string;
  planPrice: number;
  currency: string;
  billingPeriod: string;
  renewalDate: string;
  appUrl: string;
}

export const SubscriptionRenewalReminderEmail: React.FC<SubscriptionRenewalReminderEmailProps> = ({
  firstName,
  planName,
  planPrice,
  currency,
  billingPeriod,
  renewalDate,
  appUrl
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your subscription renews soon</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', margin: 0, padding: 0 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f9f9f9' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#1e40af', fontSize: '28px', marginBottom: '10px' }}>
              🔔 Subscription Renewal Reminder
            </h1>
            <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
              Your {planName} plan renews soon
            </p>
          </div>

          {/* Main Content */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Hi {firstName},
            </p>

            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              This is a friendly reminder that your <strong>{planName}</strong> subscription will automatically renew on <strong>{renewalDate}</strong>.
            </p>

            {/* Renewal Details */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '6px', marginBottom: '25px' }}>
              <h3 style={{ color: '#1e40af', fontSize: '18px', marginBottom: '15px', marginTop: 0 }}>
                Renewal Details
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Plan:</strong></span>
                <span>{planName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Amount:</strong></span>
                <span>{currency.toUpperCase()} {planPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Billing Period:</strong></span>
                <span>{billingPeriod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Renewal Date:</strong></span>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{renewalDate}</span>
              </div>
            </div>

            <p style={{ fontSize: '16px', marginBottom: '25px' }}>
              Your payment method will be automatically charged unless you cancel your subscription before the renewal date.
            </p>

            {/* Action Buttons */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <a
                href={`${appUrl}/dashboard/subscription`}
                style={{
                  backgroundColor: '#1e40af',
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
                Manage Subscription
              </a>
              <a
                href={`${appUrl}/dashboard/billing`}
                style={{
                  backgroundColor: '#6b7280',
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

            <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ fontSize: '14px', margin: 0, color: '#92400e' }}>
                <strong>Note:</strong> If you wish to cancel your subscription, please do so at least 24 hours before the renewal date to avoid being charged.
              </p>
            </div>

            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              Thank you for being a valued subscriber!
            </p>

            <p style={{ fontSize: '16px', margin: 0 }}>
              Best regards,<br />
              <strong>The Boami Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#999' }}>
            <p>
              This is an automated reminder about your subscription renewal.
            </p>
            <p>
              <a href={`${appUrl}/unsubscribe`} style={{ color: '#999' }}>
                Unsubscribe from renewal reminders
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};