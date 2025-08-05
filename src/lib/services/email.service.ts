import nodemailer from 'nodemailer';
import { renderInvitationEmail, renderWelcomeEmail } from '../templates/email-templates';

/**
 * Email Service for sending various types of emails
 */
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Send invitation email
   */
  static async sendInvitationEmail(
    invitation: any,
    customMessage?: string
  ): Promise<boolean> {
    try {
      const transporter = this.getTransporter();

      const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${invitation.token}`;

      const emailHtml = renderInvitationEmail({
        inviteeEmail: invitation.email,
        inviterName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
        roleName: invitation.role.name,
        roleDescription: invitation.role.description,
        invitationUrl,
        expiresAt: invitation.expiresAt,
        customMessage,
        companyName: process.env.COMPANY_NAME || 'Your Company'
      });

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Your Company'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: invitation.email,
        subject: `You're invited to join ${process.env.COMPANY_NAME || 'our platform'}`,
        html: emailHtml,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Invitation email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after invitation acceptance
   */
  static async sendWelcomeEmail(user: any, role: any): Promise<boolean> {
    try {
      const transporter = this.getTransporter();

      const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

      const emailHtml = renderWelcomeEmail({
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        roleName: role.name,
        roleDescription: role.description,
        loginUrl,
        companyName: process.env.COMPANY_NAME || 'Your Company'
      });

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Your Company'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Welcome to ${process.env.COMPANY_NAME || 'our platform'}!`,
        html: emailHtml,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string
  ): Promise<boolean> {
    try {
      const transporter = this.getTransporter();

      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${process.env.COMPANY_NAME || 'Your Company'}</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${userName},</p>
              <p>You requested a password reset for your account. Click the button below to reset your password:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Your Company'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: emailHtml,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send notification email to admin about new user registration
   */
  static async sendNewUserNotification(
    adminEmail: string,
    newUser: any,
    inviter: any
  ): Promise<boolean> {
    try {
      const transporter = this.getTransporter();

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New User Registration</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .user-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${process.env.COMPANY_NAME || 'Your Company'}</h1>
            </div>
            <div class="content">
              <h2>New User Registration</h2>
              <p>A new user has accepted an invitation and joined the platform.</p>

              <div class="user-info">
                <h3>User Details:</h3>
                <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
                <p><strong>Email:</strong> ${newUser.email}</p>
                <p><strong>Role:</strong> ${newUser.role.name}</p>
                <p><strong>Invited by:</strong> ${inviter.firstName} ${inviter.lastName} (${inviter.email})</p>
                <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>

              <p>The user now has access to the platform with their assigned role permissions.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Your Company'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: 'New User Registration Notification',
        html: emailHtml,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('New user notification email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending new user notification email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  static async testEmailConfiguration(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
}