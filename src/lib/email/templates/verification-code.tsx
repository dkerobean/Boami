import * as React from 'react';

/**
 * Props interface for the email verification template
 */
export interface VerificationCodeEmailProps {
  firstName: string;
  verificationCode: string;
  expiryMinutes?: number;
  appUrl?: string;
}

/**
 * Email template for 4-digit verification codes
 * Follows professional email design principles with inline CSS
 */
export const VerificationCodeEmail: React.FC<VerificationCodeEmailProps> = ({
  firstName,
  verificationCode,
  expiryMinutes = 5,
  appUrl = 'http://localhost:3000'
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email Address</title>
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
                      color: '#1a365d',
                      textAlign: 'center'
                    }}>
                      Verify Your Email Address
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
                      Thank you for registering with Boami! To complete your account setup and ensure the security of your account, please verify your email address using the verification code below.
                    </p>

                    {/* Verification Code Box */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '32px',
                      textAlign: 'center',
                      margin: '32px 0'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#64748b',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Your Verification Code
                      </div>
                      
                      <div style={{
                        fontSize: '48px',
                        fontWeight: 'bold',
                        color: '#1e40af',
                        fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                        letterSpacing: '8px',
                        marginBottom: '12px'
                      }}>
                        {verificationCode}
                      </div>
                      
                      <div style={{
                        fontSize: '14px',
                        color: '#64748b'
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
                      Enter this code on the verification page to activate your account. If you didn't create an account with Boami, please ignore this email.
                    </p>

                    {/* Call to Action Button */}
                    <div style={{ textAlign: 'center', margin: '32px 0' }}>
                      <a 
                        href={`${appUrl}/auth/auth1/verify-email`}
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#1e40af',
                          color: '#ffffff',
                          fontSize: '16px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        Verify Email Address
                      </a>
                    </div>

                    {/* Security Note */}
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
                        🔒 Security Notice
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#92400e',
                        lineHeight: '20px'
                      }}>
                        For your security, never share this verification code with anyone. Boami will never ask for your verification code via phone or email.
                      </div>
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
                        This email was sent by Boami E-commerce Management Platform
                      </p>
                      <p style={{ margin: '0 0 16px 0' }}>
                        If you have any questions, please contact our support team.
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