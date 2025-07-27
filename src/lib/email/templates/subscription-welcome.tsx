import React from 'react';

export interface SubscriptionWelcomeEmailProps {
  firstName: string;
  planName: string;
  planPrice: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  appUrl: string;
}

export const SubscriptionWelcomeEmail: React.FC<SubscriptionWelcomeEmailProps> = ({
  firstName,
  planName,
  planPrice,
  currency,
  billingPeriod,
  features,
  appUrl
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to {planName}!</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', margin: 0, padding: 0 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f9f9f9' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#1e40af', fontSize: '28px', marginBottom: '10px' }}>
              🎉 Welcome to {planName}!
            </h1>
            <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
              Your subscription is now active
            </p>
          </div>

          {/* Main Content */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Hi {firstName},
            </p>

            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Thank you for subscribing to our <strong>{planName}</strong> plan! Your payment has been processed successfully, and you now have access to all premium features.
            </p>

            {/* Subscription Details */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '6px', marginBottom: '25px' }}>
              <h3 style={{ color: '#1e40af', fontSize: '18px', marginBottom: '15px', marginTop: 0 }}>
                Subscription Details
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Plan:</strong></span>
                <span>{planName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Price:</strong></span>
                <span>{currency.toUpperCase()} {planPrice.toFixed(2)} / {billingPeriod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Status:</strong></span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span>
              </div>
            </div>

            {/* Features */}
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: '#1e40af', fontSize: '18px', marginBottom: '15px' }}>
                What's Included:
              </h3>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {features.map((feature, index) => (
                  <li key={index} style={{ marginBottom: '8px', fontSize: '15px' }}>
                    ✅ {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Call to Action */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <a
                href={`${appUrl}/dashboard`}
                style={{
                  backgroundColor: '#1e40af',
                  color: 'white',
                  padding: '12px 30px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Access Your Dashboard
              </a>
            </div>

            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              You can manage your subscription, view billing history, and update your payment method anytime from your account settings.
            </p>

            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              If you have any questions or need assistance, our support team is here to help.
            </p>

            <p style={{ fontSize: '16px', margin: 0 }}>
              Best regards,<br />
              <strong>The Boami Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#999' }}>
            <p>
              This email was sent to confirm your subscription to {planName}.
            </p>
            <p>
              <a href={`${appUrl}/unsubscribe`} style={{ color: '#999' }}>
                Unsubscribe from marketing emails
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};