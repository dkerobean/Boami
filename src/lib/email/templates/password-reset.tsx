import * as React from 'react';

/**
 * Props interface for the password reset email template
 */
export interface PasswordResetEmailProps {
  firstName: string;
  resetCode: string;
  expiryMinutes?: number;
  appUrl?: string;
}

/**
 * Email template for password reset with 4-digit verification codes
 * Follows professional email design principles with inline CSS
 */
export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  firstName,
  resetCode,
  expiryMinutes = 5,
  appUrl = 'http://localhost:3000'
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#f6f9fc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <table 
          role="presentation" 
          cellSpacing={0} 
          cellPadding={0} 
          border={0} 
          width="100%" 
          style={{ backgroundColor: '#f6f9fc' }}
        >
          <tr>
            <td align="center" style={{ padding: '40px 0' }}>
              <table 
                role="presentation" 
                cellSpacing={0} 
                cellPadding={0} 
                border={0} 
                width={600} 
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  maxWidth: '600px',
                  width: '100%'
                }}
              >
                {/* Header */}
                <tr>
                  <td style={{
                    padding: '40px 40px 20px 40px',
                    textAlign: 'center',
                    borderBottom: '1px solid #e6ebf1'
                  }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: '#1a365d',
                      marginBottom: '8px'
                    }}>
                      Boami
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#64748b'
                    }}>
                      E-commerce Management Platform
                    </div>
                  </td>
                </tr>

                {/* Main Content */}
                <tr>
                  <td style={{ padding: '40px' }}>
                    <h1 style={{
                      margin: '0 0 24px 0',
                      fontSize: '24px',
                      fontWeight: '600',
                      color: '#dc2626',
                      textAlign: 'center'
                    }}>
                      Reset Your Password
                    </h1>

                    <p style={{
                      margin: '0 0 24px 0',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#334155'
                    }}>
                      Hi {firstName},
                    </p>

                    <p style={{
                      margin: '0 0 32px 0',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#334155'
                    }}>
                      We received a request to reset the password for your Boami account. If you made this request, please use the verification code below to proceed with resetting your password.
                    </p>

                    {/* Reset Code Box */}
                    <div style={{
                      backgroundColor: '#fef2f2',
                      border: '2px solid #fecaca',
                      borderRadius: '8px',
                      padding: '32px',
                      textAlign: 'center',
                      margin: '32px 0'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#dc2626',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Your Password Reset Code
                      </div>
                      
                      <div style={{
                        fontSize: '48px',
                        fontWeight: 'bold',
                        color: '#dc2626',
                        fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                        letterSpacing: '8px',
                        marginBottom: '12px'
                      }}>
                        {resetCode}
                      </div>
                      
                      <div style={{
                        fontSize: '14px',
                        color: '#dc2626'
                      }}>
                        This code expires in {expiryMinutes} minutes
                      </div>
                    </div>

                    <p style={{
                      margin: '0 0 24px 0',
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#334155'
                    }}>
                      Enter this code on the password reset page to create a new password for your account. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                    </p>

                    {/* Call to Action Button */}
                    <div style={{ textAlign: 'center', margin: '32px 0' }}>
                      <a 
                        href={`${appUrl}/auth/auth1/reset-password`}
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          fontSize: '16px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        Reset Password
                      </a>
                    </div>

                    {/* Security Alert */}
                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '16px',
                      marginTop: '32px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '8px'
                      }}>
                        🚨 Security Alert
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#92400e',
                        lineHeight: '20px'
                      }}>
                        If you didn't request this password reset, someone may be trying to access your account. Please contact our support team immediately and consider updating your security settings.
                      </div>
                    </div>

                    {/* Additional Security Information */}
                    <div style={{
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '16px',
                      marginTop: '16px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#475569',
                        marginBottom: '8px'
                      }}>
                        🔒 Security Tips
                      </div>
                      <ul style={{
                        fontSize: '14px',
                        color: '#475569',
                        lineHeight: '20px',
                        margin: '0',
                        paddingLeft: '20px'
                      }}>
                        <li>Never share your reset code with anyone</li>
                        <li>Choose a strong, unique password</li>
                        <li>Enable two-factor authentication if available</li>
                        <li>Log out of all devices after resetting your password</li>
                      </ul>
                    </div>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{
                    padding: '32px 40px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e6ebf1',
                    borderRadius: '0 0 8px 8px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#64748b',
                      textAlign: 'center',
                      lineHeight: '20px'
                    }}>
                      <p style={{ margin: '0 0 8px 0' }}>
                        This password reset request was sent by Boami E-commerce Management Platform
                      </p>
                      <p style={{ margin: '0 0 8px 0' }}>
                        If you have any concerns about account security, please contact our support team immediately.
                      </p>
                      <p style={{ margin: '0 0 16px 0' }}>
                        For your security, this email was automatically generated and cannot receive replies.
                      </p>
                      <div style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '16px',
                        fontSize: '12px',
                        color: '#94a3b8'
                      }}>
                        © 2024 Boami. All rights reserved.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
};