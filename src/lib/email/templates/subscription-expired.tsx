import React from 'react';

export interface SubscriptionExpiredEmailProps {
  firstName: string;
  planName: string;
  expiredDate: string;
  appUrl: string;
}

export const SubscriptionExpiredEmail: React.FC<SubscriptionExpiredEmailProps> = ({
  firstName,
  planName,
  expiredDate,
  appUrl
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Subscription Expired</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', margin: 0, padding: 0 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f9f9f9' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#dc2626', fontSize: '28px', marginBottom: '10px' }}>
              Subscription Expired
            </h1>
            <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
              Your {planName} subscription has expired
            </p>
          </div>

          {/* Main Content */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Hi {firstName},
            </p>

            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Your <strong>{planName}</strong> subscription expired on <strong>{expiredDate}</strong>. Your account has been switched to our free plan.
            </p>

            {/* What Changed */}
            <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ color: '#dc2626', fontSize: '18px', marginBottom: '15px', marginTop: 0 }}>
                What's Changed
              </h3>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
                <li style={{ marginBottom: '8px' }}>
                  Access to premium features has been suspended
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Your account is now on the free plan
                </li>
                <li style={{ marginBottom: '8px' }}>
                  All your data remains safe and accessible
                </li>
                <li style={{ marginBottom: '0' }}>
                  You can reactivate your subscription anytime
                </li>
              </ul>
            </div>

            {/* Free Plan Features */}
            <div style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #0ea5e9' }}>
              <h4 style={{ color: '#0ea5e9', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                What you can still do with the free plan:
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
                <li style={{ marginBottom: '8px' }}>
                  ✅ Access basic dashboard features
                </li>
                <li style={{ marginBottom: '8px' }}>
                  ✅ Manage up to 10 products
                </li>
                <li style={{ marginBottom: '8px' }}>
                  ✅ View basic analytics
                </li>
                <li style={{ marginBottom: '0' }}>
                  ✅ Export basic reports
                </li>
              </ul>
            </div>

            {/* Reactivation CTA */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>
                Ready to get back to full power? Reactivate your subscription and regain access to all premium features.
              </p>
              <a
                href={`${appUrl}/dashboard/subscription/plans`}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '12px 30px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Reactivate Subscription
              </a>
            </div>

            {/* Special Offer */}
            <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ color: '#92400e', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                🎉 Welcome Back Offer
              </h4>
              <p style={{ fontSize: '14px', margin: 0, color: '#92400e' }}>
                Reactivate within the next 7 days and get <strong>20% off</strong> your first month back!
                Use code <strong>WELCOME20</strong> at checkout.
              </p>
            </div>

            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              We miss having you as a premium subscriber! If you have any questions about reactivating or need help with anything, our support team is here to assist you.
            </p>

            <p style={{ fontSize: '16px', margin: 0 }}>
              Best regards,<br />
              <strong>The Boami Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#999' }}>
            <p>
              This email notifies you about your subscription expiration.
            </p>
            <p>
              <a href={`${appUrl}/unsubscribe`} style={{ color: '#999' }}>
                Unsubscribe from subscription emails
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};