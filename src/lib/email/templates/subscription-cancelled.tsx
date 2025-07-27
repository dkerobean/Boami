import React from 'react';

export interface SubscriptionCancelledEmailProps {
  firstName: string;
  planName: string;
  cancellationDate: string;
  accessEndDate: string;
  reason?: string;
  appUrl: string;
}

export const SubscriptionCancelledEmail: React.FC<SubscriptionCancelledEmailProps> = ({
  firstName,
  planName,
  cancellationDate,
  accessEndDate,
  reason,
  appUrl
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Subscription Cancelled</title>
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', margin: 0, padding: 0 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f9f9f9' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#dc2626', fontSize: '28px', marginBottom: '10px' }}>
              Subscription Cancelled
            </h1>
            <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
              Your {planName} subscription has been cancelled
            </p>
          </div>

          {/* Main Content */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Hi {firstName},
            </p>

            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              We're sorry to see you go! Your <strong>{planName}</strong> subscription has been successfully cancelled as requested.
            </p>

            {/* Cancellation Details */}
            <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ color: '#dc2626', fontSize: '18px', marginBottom: '15px', marginTop: 0 }}>
                Cancellation Details
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Plan:</strong></span>
                <span>{planName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span><strong>Cancelled On:</strong></span>
                <span>{cancellationDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: reason ? '10px' : '0' }}>
                <span><strong>Access Until:</strong></span>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{accessEndDate}</span>
              </div>
              {reason && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Reason:</strong></span>
                  <span>{reason}</span>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '6px', marginBottom: '25px', borderLeft: '4px solid #0ea5e9' }}>
              <h4 style={{ color: '#0ea5e9', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                What happens next?
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
                <li style={{ marginBottom: '8px' }}>
                  You'll continue to have access to premium features until <strong>{accessEndDate}</strong>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  No further charges will be made to your payment method
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Your account will automatically switch to the free plan after the access period ends
                </li>
                <li style={{ marginBottom: '0' }}>
                  All your data will be preserved and you can reactivate anytime
                </li>
              </ul>
            </div>

            {/* Reactivation CTA */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>
                Changed your mind? You can reactivate your subscription anytime.
              </p>
              <a
                href={`${appUrl}/dashboard/subscription`}
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

            <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <h4 style={{ color: '#374151', fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>
                We'd love your feedback
              </h4>
              <p style={{ fontSize: '14px', margin: 0, color: '#6b7280' }}>
                Help us improve by letting us know why you cancelled. Your feedback is valuable to us and helps us serve our customers better.
              </p>
              <div style={{ marginTop: '15px' }}>
                <a
                  href={`${appUrl}/feedback?type=cancellation`}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    padding: '8px 20px',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    display: 'inline-block'
                  }}
                >
                  Share Feedback
                </a>
              </div>
            </div>

            <p style={{ fontSize: '16px', marginBottom: '10px' }}>
              Thank you for being part of the Boami community. We hope to serve you again in the future!
            </p>

            <p style={{ fontSize: '16px', margin: 0 }}>
              Best regards,<br />
              <strong>The Boami Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#999' }}>
            <p>
              This email confirms the cancellation of your subscription.
            </p>
            <p>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};