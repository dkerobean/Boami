/**
 * Email templates for subscription-related notifications
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SubscriptionEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  planPrice: string;
  currency: string;
  billingPeriod: string;
  nextBillingDate?: string;
  subscriptionId: string;
  supportUrl: string;
  manageSubscriptionUrl: string;
  companyName: string;
  companyLogo?: string;
}

export interface PaymentEmailData extends SubscriptionEmailData {
  paymentAmount: string;
Date: string;
  paymentMethod: string;
  transactionId: string;
  invoiceUrl?: string;
}

export interface RenewalReminderData extends SubscriptionEmailData {
  daysUntilRenewal: number;
  renewalAmount: string;
  updatePaymentUrl: string;
}

export interface CancellationData extends SubscriptionEmailData {
  cancellationDate: string;
  accessExpiryDate: string;
  cancellationReason?: string;
  reactivateUrl: string;
}

export class SubscriptionEmailTemplates {
  private static getBaseTemplate(content: string, data: SubscriptionEmailData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 0;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .button.secondary {
            background-color: #6c757d;
        }
        .button.secondary:hover {
            background-color: #545b62;
        }
        .info-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .success-box {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .warning-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .error-box {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .subscription-details {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .detail-label {
            font-weight: 600;
            color: #495057;
        }
        .detail-value {
            color: #212529;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${data.companyLogo ? `<img src="${data.companyLogo}" alt="${data.companyName}" class="logo">` : ''}
            <h1>${data.companyName}</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>
                Need help? <a href="${data.supportUrl}">Contact our support team</a><br>
                <a href="${data.manageSubscriptionUrl}">Manage your subscription</a>
            </p>
            <p>
                This email was sent to ${data.userEmail}<br>
                © ${new Date().getFullYear()} ${data.companyName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  public static subscriptionConfirmation(data: SubscriptionEmailData): EmailTemplate {
    const content = `
      <h2>Welcome to ${data.planName}! 🎉</h2>
      <p>Hi ${data.userName},</p>
      <p>Thank you for subscribing to our ${data.planName} plan. Your subscription is now active and you have access to all the premium features included in your plan.</p>

      <div class="subscription-details success-box">
        <h3>Subscription Details</h3>
        <div class="detail-row">
          <span class="detail-label">Plan:</span>
          <span class="detail-value">${data.planName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Price:</span>
          <span class="detail-value">${data.planPrice} ${data.currency}/${data.billingPeriod}</span>
        </div>
        ${data.nextBillingDate ? `
        <div class="detail-row">
          <span class="detail-label">Next Billing Date:</span>
          <span class="detail-value">${data.nextBillingDate}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Subscription ID:</span>
          <span class="detail-value">${data.subscriptionId}</span>
        </div>
      </div>

      <p>You can now enjoy all the benefits of your ${data.planName} subscription. If you have any questions or need assistance, our support team is here to help.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.manageSubscriptionUrl}" class="button">Manage Subscription</a>
      </div>

      <p>Thank you for choosing ${data.companyName}!</p>
    `;

    const text = `
Welcome to ${data.planName}!

Hi ${data.userName},

Thank you for subscribing to our ${data.planName} plan. Your subscription is now active.

Subscription Details:
- Plan: ${data.planName}
- Price: ${data.planPrice} ${data.currency}/${data.billingPeriod}
${data.nextBillingDate ? `- Next Billing Date: ${data.nextBillingDate}` : ''}
- Subscription ID: ${data.subscriptionId}

Manage your subscription: ${data.manageSubscriptionUrl}

Thank you for choosing ${data.companyName}!
    `;

    return {
      subject: `Welcome to ${data.planName} - Subscription Confirmed`,
      html: this.getBaseTemplate(content, data),
      text
    };
  }

  public static paymentSuccess(data: PaymentEmailData): EmailTemplate {
    const content = `
      <h2>Payment Successful ✅</h2>
      <p>Hi ${data.userName},</p>
      <p>We've successfully processed your payment for your ${data.planName} subscription. Thank you for your continued trust in ${data.companyName}.</p>

      <div class="subscription-details success-box">
        <h3>Payment Details</h3>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${data.paymentAmount} ${data.currency}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Date:</span>
          <span class="detail-value">${data.paymentDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${data.paymentMethod}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${data.transactionId}</span>
        </div>
        ${data.nextBillingDate ? `
        <div class="detail-row">
          <span class="detail-label">Next Billing Date:</span>
          <span class="detail-value">${data.nextBillingDate}</span>
        </div>
        ` : ''}
      </div>

      <p>Your ${data.planName} subscription remains active and you continue to have access to all premium features.</p>

      <div style="text-align: center; margin: 30px 0;">
        ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" class="button">Download Invoice</a>` : ''}
        <a href="${data.manageSubscriptionUrl}" class="button secondary">Manage Subscription</a>
      </div>
    `;

    const text = `
Payment Successful

Hi ${data.userName},

We've successfully processed your payment for your ${data.planName} subscription.

Payment Details:
- Amount: ${data.paymentAmount} ${data.currency}
- Payment Date: ${data.paymentDate}
- Payment Method: ${data.paymentMethod}
- Transaction ID: ${data.transactionId}
${data.nextBillingDate ? `- Next Billing Date: ${data.nextBillingDate}` : ''}

${data.invoiceUrl ? `Download Invoice: ${data.invoiceUrl}` : ''}
Manage Subscription: ${data.manageSubscriptionUrl}

Thank you for choosing ${data.companyName}!
    `;

    return {
      subject: `Payment Confirmation - ${data.planName} Subscription`,
      html: this.getBaseTemplate(content, data),
      text
    };
  }

  public static paymentFailed(data: PaymentEmailData): EmailTemplate {
    const content = `
      <h2>Payment Failed ⚠️</h2>
      <p>Hi ${data.userName},</p>
      <p>We were unable to process your payment for your ${data.planName} subscription. This might be due to insufficient funds, an expired card, or a temporary issue with your payment method.</p>

      <div class="subscription-details error-box">
        <h3>Failed Payment Details</h3>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${data.paymentAmount} ${data.currency}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Attempted Date:</span>
          <span class="detail-value">${data.paymentDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${data.paymentMethod}</span>
        </div>
      </div>

      <p><strong>What happens next?</strong></p>
      <ul>
        <li>Your subscription remains active for now</li>
        <li>We'll retry the payment in a few days</li>
        <li>Please update your payment method to avoid service interruption</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.manageSubscriptionUrl}" class="button">Update Payment Method</a>
      </div>

      <p>If you need assistance, please don't hesitate to contact our support team.</p>
    `;

    const text = `
Payment Failed

Hi ${data.userName},

We were unable to process your payment for your ${data.planName} subscription.

Failed Payment Details:
- Amount: ${data.paymentAmount} ${data.currency}
- Attempted Date: ${data.paymentDate}
- Payment Method: ${data.paymentMethod}

What happens next?
- Your subscription remains active for now
- We'll retry the payment in a few days
- Please update your payment method to avoid service interruption

Update Payment Method: ${data.manageSubscriptionUrl}

If you need assistance, please contact our support team: ${data.supportUrl}
    `;

    return {
      subject: `Payment Failed - Action Required for ${data.planName} Subscription`,
      html: this.getBaseTemplate(content, data),
      text
    };
  }

  public static renewalReminder(data: RenewalReminderData): EmailTemplate {
    const content = `
      <h2>Subscription Renewal Reminder 📅</h2>
      <p>Hi ${data.userName},</p>
      <p>This is a friendly reminder that your ${data.planName} subscription will renew in ${data.daysUntilRenewal} day${data.daysUntilRenewal !== 1 ? 's' : ''}.</p>

      <div class="subscription-details info-box">
        <h3>Renewal Details</h3>
        <div class="detail-row">
          <span class="detail-label">Plan:</span>
          <span class="detail-value">${data.planName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Renewal Amount:</span>
          <span class="detail-value">${data.renewalAmount} ${data.currency}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Renewal Date:</span>
          <span class="detail-value">${data.nextBillingDate}</span>
        </div>
      </div>

      <p>Your subscription will automatically renew using your current payment method. If you need to update your payment information or make changes to your subscription, you can do so anytime.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.manageSubscriptionUrl}" class="button">Manage Subscription</a>
        <a href="${data.updatePaymentUrl}" class="button secondary">Update Payment Method</a>
      </div>

      <p>Thank you for being a valued ${data.companyName} subscriber!</p>
    `;

    const text = `
Subscription Renewal Reminder

Hi ${data.userName},

Your ${data.planName} subscription will renew in ${data.daysUntilRenewal} day${data.daysUntilRenewal !== 1 ? 's' : ''}.

Renewal Details:
- Plan: ${data.planName}
- Renewal Amount: ${data.renewalAmount} ${data.currency}
- Renewal Date: ${data.nextBillingDate}

Your subscription will automatically renew using your current payment method.

Manage Subscription: ${data.manageSubscriptionUrl}
Update Payment Method: ${data.updatePaymentUrl}

Thank you for being a valued ${data.companyName} subscriber!
    `;

    return {
      subject: `Subscription Renewal Reminder - ${data.planName} (${data.daysUntilRenewal} day${data.daysUntilRenewal !== 1 ? 's' : ''} remaining)`,
      html: this.getBaseTemplate(content, data),
      text
    };
  }

  public static subscriptionCancelled(data: CancellationData): EmailTemplate {
    const content = `
      <h2>Subscription Cancelled</h2>
      <p>Hi ${data.userName},</p>
      <p>We've processed your request to cancel your ${data.planName} subscription. We're sorry to see you go!</p>

      <div class="subscription-details warning-box">
        <h3>Cancellation Details</h3>
        <div class="detail-row">
          <span class="detail-label">Plan:</span>
          <span class="detail-value">${data.planName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cancellation Date:</span>
          <span class="detail-value">${data.cancellationDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Access Until:</span>
          <span class="detail-value">${data.accessExpiryDate}</span>
        </div>
        ${data.cancellationReason ? `
        <div class="detail-row">
          <span class="detail-label">Reason:</span>
          <span class="detail-value">${data.cancellationReason}</span>
        </div>
        ` : ''}
      </div>

      <p><strong>What happens now?</strong></p>
      <ul>
        <li>You'll continue to have access to all premium features until ${data.accessExpiryDate}</li>
        <li>No further charges will be made to your account</li>
        <li>You can reactivate your subscription anytime before ${data.accessExpiryDate}</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.reactivateUrl}" class="button">Reactivate Subscription</a>
      </div>

      <p>If you cancelled by mistake or would like to provide feedback about your experience, please don't hesitate to contact our support team.</p>

      <p>Thank you for being part of the ${data.companyName} community. We hope to see you again soon!</p>
    `;

    const text = `
Subscription Cancelled

Hi ${data.userName},

We've processed your request to cancel your ${data.planName} subscription.

Cancellation Details:
- Plan: ${data.planName}
- Cancellation Date: ${data.cancellationDate}
- Access Until: ${data.accessExpiryDate}
${data.cancellationReason ? `- Reason: ${data.cancellationReason}` : ''}

What happens now?
- You'll continue to have access until ${data.accessExpiryDate}
- No further charges will be made
- You can reactivate anytime before ${data.accessExpiryDate}

Reactivate Subscription: ${data.reactivateUrl}

Thank you for being part of the ${data.companyName} community.
    `;

    return {
      subject: `Subscription Cancelled - ${data.planName}`,
      html: this.getBaseTemplate(content, data),
      text
    };
  }

  public static subscriptionExpired(data: SubscriptionEmailData): EmailTemplate {
    const content = `
      <h2>Subscription Expired</h2>
      <p>Hi ${data.userName},</p>
      <p>Your ${data.planName} subscription has expired. You no longer have access to premium features, but your account and data remain safe.</p>

      <div class="subscription-details warning-box">
        <h3>Expired Subscription</h3>
        <div class="detail-row">
          <span class="detail-label">Plan:</span>
          <span class="detail-value">${data.planName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Expired On:</span>
          <span class="detail-value">${new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <p><strong>What you can do:</strong></p>
      <ul>
        <li>Renew your subscription to restore full access</li>
        <li>Choose a different plan that better fits your needs</li>
        <li>Continue using our free features</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.manageSubscriptionUrl}" class="button">Renew Subscription</a>
      </div>

      <p>We'd love to have you back as a premium subscriber. If you have any questions or need assistance choosing a plan, our support team is here to help.</p>
    `;

    const text = `
Subscription Expired

Hi ${data.userName},

Your ${data.planName} subscription has expired. You no longer have access to premium features.

Expired Subscription:
- Plan: ${data.planName}
- Expired On: ${new Date().toLocaleDateString()}

What you can do:
- Renew your subscription to restore full access
- Choose a different plan that better fits your needs
- Continue using our free features

Renew Subscription: ${data.manageSubscriptionUrl}

We'd love to have you back as a premium subscriber.
    `;

    return {
      subject: `Subscription Expired - ${data.planName}`,
      html: this.getBaseTemplate(content, data),
      text
    };
  }
}