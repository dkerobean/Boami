/**
 * Email template rendering functions
 */

interface InvitationEmailData {
  inviteeEmail: string;
  inviterName: string;
  roleName: string;
  roleDescription: string;
  invitationUrl: string;
  expiresAt: Date;
  customMessage?: string;
  companyName: string;
}

interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  roleName: string;
  roleDescription: string;
  loginUrl: string;
  companyName: string;
}

/**
 * Render invitation email template
 */
export function renderInvitationEmail(data: InvitationEmailData): string {
  const expirationDate = new Date(data.expiresAt).toLocaleDateString();
  const expirationTime = new Date(data.expiresAt).toLocaleTimeString();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited to Join ${data.companyName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .invitation-card {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .role-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .role-info h3 {
          margin: 0 0 8px 0;
          color: #1976d2;
          font-size: 16px;
        }
        .role-info p {
          margin: 0;
          color: #555;
          font-size: 14px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 25px 0;
          transition: transform 0.2s ease;
        }
        .cta-button:hover {
          transform: translateY(-1px);
        }
        .expiry-notice {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 12px;
          border-radius: 4px;
          margin: 20px 0;
          font-size: 14px;
        }
        .custom-message {
          background: #f0f8ff;
          border-left: 4px solid #4a90e2;
          padding: 15px;
          margin: 20px 0;
          font-style: italic;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 5px 0;
          font-size: 12px;
          color: #666;
        }
        .security-note {
          font-size: 12px;
          color: #666;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .cta-button {
            display: block;
            text-align: center;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${data.companyName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You're invited to join our team</p>
        </div>

        <div class="content">
          <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>

          <p><rong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong>.</p>

          ${data.customMessage ? `
            <div class="custom-message">
              <strong>Personal message from ${data.inviterName}:</strong><br>
              "${data.customMessage}"
            </div>
          ` : ''}

          <div class="role-info">
            <h3>Your Role: ${data.roleName}</h3>
            <p>${data.roleDescription}</p>
          </div>

          <p>To accept this invitation and set up your account, click the button below:</p>

          <div style="text-align: center;">
            <a href="${data.invitationUrl}" class="cta-button">Accept Invitation</a>
          </div>

          <div class="expiry-notice">
            <strong>⏰ This invitation expires on ${expirationDate} at ${expirationTime}</strong>
          </div>

          <p>If you're unable to click the button above, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
            ${data.invitationUrl}
          </p>

          <div class="security-note">
            <p><strong>Security Note:</strong> This invitation was sent to ${data.inviteeEmail}. If you didn't expect this invitation, please ignore this email.</p>
          </div>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render welcome email template
 */
export function renderWelcomeEmail(data: WelcomeEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${data.companyName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .welcome-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          padding: 40px 30px;
        }
        .welcome-card {
          background: #f8f9fa;
          border-left: 4px solid #28a745;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .role-info {
          background: #e8f5e8;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .role-info h3 {
          margin: 0 0 8px 0;
          color: #155724;
          font-size: 16px;
        }
        .role-info p {
          margin: 0;
          color: #155724;
          font-size: 14px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 25px 0;
          transition: transform 0.2s ease;
        }
        .cta-button:hover {
          transform: translateY(-1px);
        }
        .features-list {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .features-list h3 {
          margin: 0 0 15px 0;
          color: #333;
        }
        .features-list ul {
          margin: 0;
          padding-left: 20px;
        }
        .features-list li {
          margin: 8px 0;
          color: #555;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 5px 0;
          font-size: 12px;
          color: #666;
        }
        .support-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .cta-button {
            display: block;
            text-align: center;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="welcome-icon">🎉</div>
          <h1>Welcome to ${data.companyName}!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account is ready</p>
        </div>

        <div class="content">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.userName}!</h2>

          <div class="welcome-card">
            <p style="margin: 0; font-size: 16px;">
              <strong>Congratulations!</strong> Your account has been successfully created and you're now part of the ${data.companyName} team.
            </p>
          </div>

          <div class="role-info">
            <h3>Your Role: ${data.roleName}</h3>
            <p>${data.roleDescription}</p>
          </div>

          <p>You can now access the platform with your assigned permissions. Click the button below to sign in:</p>

          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="cta-button">Sign In to Your Account</a>
          </div>

          <div class="features-list">
            <h3>What you can do now:</h3>
            <ul>
              <li>Access your personalized dashboard</li>
              <li>Use features according to your role permissions</li>
              <li>Collaborate with your team members</li>
              <li>Update your profile and preferences</li>
              <li>Get support when you need it</li>
            </ul>
          </div>

          <div class="support-info">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">Need Help?</h3>
            <p style="margin: 0; color: #555;">
              If you have any questions or need assistance getting started, don't hesitate to reach out to our support team or your administrator.
            </p>
          </div>

          <p><strong>Account Details:</strong></p>
          <ul style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
            <li><strong>Email:</strong> ${data.userEmail}</li>
            <li><strong>Role:</strong> ${data.roleName}</li>
            <li><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}