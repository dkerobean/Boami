import { NotificationType } from '../database/models/NotificationEvent';
import { notificationDb } from './database-operations';

export interface DefaultTemplate {
  name: string;
  type: NotificationType;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'stock-alert',
    type: 'stock_alert',
    subject: '🚨 Low Stock Alert: {{product.title}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc3545; margin: 0;">Low Stock Alert</h2>
        </div>

        <div style="padding: 20px;">
          <p>Hello {{user.firstName}},</p>

          <p>Your product <strong>{{product.title}}</strong> is running low on stock.</p>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">Product Details:</h3>
            <ul style="margin: 0;">
              <li><strong>Product:</strong> {{product.title}}</li>
              <li><strong>SKU:</strong> {{product.sku}}</li>
              <li><strong>Current Stock:</strong> {{product.qty}} units</li>
              <li><strong>Low Stock Threshold:</strong> {{product.lowStockThreshold}} units</li>
            </ul>
          </div>

          <p>Please restock this product to avoid running out of inventory.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/dashboard/products/{{product._id}}"
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Product
            </a>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>This is an automated notification from {{companyName}}.</p>
          <p><a href="{{unsubscribeUrl}}" style="color: #6c757d;">Unsubscribe from stock alerts</a></p>
        </div>
      </div>
    `,
    textTemplate: `
      LOW STOCK ALERT

      Hello {{user.firstName}},

      Your product "{{product.title}}" is running low on stock.

      Product Details:
      - Product: {{product.title}}
      - SKU: {{product.sku}}
      - Current Stock: {{product.qty}} units
      - Low Stock Threshold: {{product.lowStockThreshold}} units

      Please restock this product to avoid running out of inventory.

      View Product: {{baseUrl}}/dashboard/products/{{product._id}}

      ---
      This is an automated notification from {{companyName}}.
      Unsubscribe: {{unsubscribeUrl}}
    `,
    variables: ['user.firstName', 'product.title', 'product.sku', 'product.qty', 'product.lowStockThreshold', 'product._id']
  },

  {
    name: 'task-assigned',
    type: 'task_assigned',
    subject: '📋 New Task Assigned: {{task.title}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin: 0;">New Task Assigned</h2>
        </div>

        <div style="padding: 20px;">
          <p>Hello {{user.firstName}},</p>

          <p>You have been assigned a new task: <strong>{{task.title}}</strong></p>

          <div style="background: #f5f5f5; border-left: 4px solid #1976d2; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Task Details:</h3>
            <ul style="margin: 0;">
              <li><strong>Title:</strong> {{task.title}}</li>
              <li><strong>Description:</strong> {{task.description}}</li>
              <li><strong>Due Date:</strong> {{task.date}}</li>
              <li><strong>Priority:</strong> {{task.taskProperty}}</li>
              {{#if task.assignedBy}}
              <li><strong>Assigned By:</strong> {{task.assignedBy}}</li>
              {{/if}}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/dashboard/kanban"
               style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Task
            </a>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>This is an automated notification from {{companyName}}.</p>
          <p><a href="{{unsubscribeUrl}}" style="color: #6c757d;">Unsubscribe from task notifications</a></p>
        </div>
      </div>
    `,
    textTemplate: `
      NEW TASK ASSIGNED

      Hello {{user.firstName}},

      You have been assigned a new task: "{{task.title}}"

      Task Details:
      - Title: {{task.title}}
      - Description: {{task.description}}
      - Due Date: {{task.date}}
      - Priority: {{task.taskProperty}}
      {{#if task.assignedBy}}
      - Assigned By: {{task.assignedBy}}
      {{/if}}

      View Task: {{baseUrl}}/dashboard/kanban

      ---
      This is an automated notification from {{companyName}}.
      Unsubscribe: {{unsubscribeUrl}}
    `,
    variables: ['user.firstName', 'task.title', 'task.description', 'task.date', 'task.taskProperty', 'task.assignedBy']
  },

  {
    name: 'invoice-status-changed',
    type: 'invoice_status_changed',
    subject: '💼 Invoice {{invoice.invoiceNumber}} Status Updated',
    htmlTemplate: [
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">',
      '  <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">',
      '    <h2 style="color: #28a745; margin: 0;">Invoice Status Updated</h2>',
      '  </div>',
      '',
      '  <div style="padding: 20px;">',
      '    <p>Hello {{user.firstName}},</p>',
      '',
      '    <p>Invoice <strong>{{invoice.invoiceNumber}}</strong> status has been updated to <strong>{{invoice.status}}</strong>.</p>',
      '',
      '    <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">',
      '      <h3 style="margin-top: 0;">Invoice Details:</h3>',
      '      <ul style="margin: 0;">',
      '        <li><strong>Invoice Number:</strong> {{invoice.invoiceNumber}}</li>',
      '        <li><strong>Status:</strong> {{invoice.status}}</li>',
      '        <li><strong>Amount:</strong> ${{invoice.grandTotal}}</li>',
      '        <li><strong>Client:</strong> {{invoice.billTo}}</li>',
      '        <li><strong>Date:</strong> {{invoice.orderDate}}</li>',
      '      </ul>',
      '    </div>',
      '',
      '    {{#if invoice.status === \'Paid\'}}',
      '    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">',
      '      <p style="margin: 0; color: #155724;"><strong>🎉 Payment Received!</strong> Thank you for your business.</p>',
      '    </div>',
      '    {{/if}}',
      '',
      '    <div style="text-align: center; margin: 30px 0;">',
      '      <a href="{{baseUrl}}/dashboard/invoices/{{invoice._id}}"',
      '         style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">',
      '        View Invoice',
      '      </a>',
      '    </div>',
      '  </div>',
      '',
      '  <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">',
      '    <p>This is an automated notification from {{companyName}}.</p>',
      '    <p><a href="{{unsubscribeUrl}}" style="color: #6c757d;">Unsubscribe from invoice notifications</a></p>',
      '  </div>',
      '</div>'
    ].join('\n'),
    textTemplate: [
      'INVOICE STATUS UPDATED',
      '',
      'Hello {{user.firstName}},',
      '',
      'Invoice {{invoice.invoiceNumber}} status has been updated to {{invoice.status}}.',
      '',
      'Invoice Details:',
      '- Invoice Number: {{invoice.invoiceNumber}}',
      '- Status: {{invoice.status}}',
      '- Amount: ${{invoice.grandTotal}}',
      '- Client: {{invoice.billTo}}',
      '- Date: {{invoice.orderDate}}',
      '',
      '{{#if invoice.status === \'Paid\'}}',
      '🎉 Payment Received! Thank you for your business.',
      '{{/if}}',
      '',
      'View Invoice: {{baseUrl}}/dashboard/invoices/{{invoice._id}}',
      '',
      '---',
      'This is an automated notification from {{companyName}}.',
      'Unsubscribe: {{unsubscribeUrl}}'
    ].join('\n'),
    variables: ['user.firstName', 'invoice.invoiceNumber', 'invoice.status', 'invoice.grandTotal', 'invoice.billTo', 'invoice.orderDate', 'invoice._id']
  },

  {
    name: 'subscription-renewal',
    type: 'subscription_renewal',
    subject: '🔔 Subscription Renewal Reminder',
    htmlTemplate: [
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">',
      '  <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">',
      '    <h2 style="color: #856404; margin: 0;">Subscription Renewal Reminder</h2>',
      '  </div>',
      '',
      '  <div style="padding: 20px;">',
      '    <p>Hello {{user.firstName}},</p>',
      '',
      '    <p>Your {{subscription.planName}} subscription is set to expire in {{daysUntilExpiry}} days.</p>',
      '',
      '    <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">',
      '      <h3 style="margin-top: 0;">Subscription Details:</h3>',
      '      <ul style="margin: 0;">',
      '        <li><strong>Plan:</strong> {{subscription.planName}}</li>',
      '        <li><strong>Expiry Date:</strong> {{subscription.expiryDate}}</li>',
      '        <li><strong>Amount:</strong> ${{subscription.amount}}</li>',
      '      </ul>',
      '    </div>',
      '',
      '    <p>To continue enjoying uninterrupted service, please renew your subscription before it expires.</p>',
      '',
      '    <div style="text-align: center; margin: 30px 0;">',
      '      <a href="{{baseUrl}}/dashboard/subscription"',
      '         style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">',
      '        Renew Subscription',
      '      </a>',
      '    </div>',
      '  </div>',
      '',
      '  <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">',
      '    <p>This is an automated notification from {{companyName}}.</p>',
      '    <p><a href="{{unsubscribeUrl}}" style="color: #6c757d;">Unsubscribe from subscription notifications</a></p>',
      '  </div>',
      '</div>'
    ].join('\n'),
    textTemplate: [
      'SUBSCRIPTION RENEWAL REMINDER',
      '',
      'Hello {{user.firstName}},',
      '',
      'Your {{subscription.planName}} subscription is set to expire in {{daysUntilExpiry}} days.',
      '',
      'Subscription Details:',
      '- Plan: {{subscription.planName}}',
      '- Expiry Date: {{subscription.expiryDate}}',
      '- Amount: ${{subscription.amount}}',
      '',
      'To continue enjoying uninterrupted service, please renew your subscription before it expires.',
      '',
      'Renew Subscription: {{baseUrl}}/dashboard/subscription',
      '',
      '---',
      'This is an automated notification from {{companyName}}.',
      'Unsubscribe: {{unsubscribeUrl}}'
    ].join('\n'),
    variables: ['user.firstName', 'subscription.planName', 'subscription.expiryDate', 'subscription.amount', 'daysUntilExpiry']
  },

  {
    name: 'security-alert',
    type: 'security_alert',
    subject: '🔒 Security Alert: {{alertType}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0;">🔒 Security Alert</h2>
        </div>

        <div style="padding: 20px;">
          <p>Hello {{user.firstName}},</p>

          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #721c24;"><strong>Security Alert:</strong> {{alertMessage}}</p>
          </div>

          <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Alert Details:</h3>
            <ul style="margin: 0;">
              <li><strong>Alert Type:</strong> {{alertType}}</li>
              <li><strong>Time:</strong> {{alertTime}}</li>
              <li><strong>IP Address:</strong> {{ipAddress}}</li>
              {{#if location}}
              <li><strong>Location:</strong> {{location}}</li>
              {{/if}}
            </ul>
          </div>

          <p><strong>What should you do?</strong></p>
          <ul>
            <li>If this was you, no action is required</li>
            <li>If this wasn't you, please change your password immediately</li>
            <li>Review your account activity for any suspicious actions</li>
            <li>Contact support if you need assistance</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{baseUrl}}/dashboard/security"
               style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Security Settings
            </a>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>This is an automated security notification from {{companyName}}.</p>
          <p>For your security, you cannot unsubscribe from security alerts.</p>
        </div>
      </div>
    `,
    textTemplate: `
      SECURITY ALERT

      Hello {{user.firstName}},

      Security Alert: {{alertMessage}}

      Alert Details:
      - Alert Type: {{alertType}}
      - Time: {{alertTime}}
      - IP Address: {{ipAddress}}
      {{#if location}}
      - Location: {{location}}
      {{/if}}

      What should you do?
      - If this was you, no action is required
      - If this wasn't you, please change your password immediately
      - Review your account activity for any suspicious actions
      - Contact support if you need assistance

      Review Security Settings: {{baseUrl}}/dashboard/security

      ---
      This is an automated security notification from {{companyName}}.
      For your security, you cannot unsubscribe from security alerts.
    `,
    variables: ['user.firstName', 'alertType', 'alertMessage', 'alertTime', 'ipAddress', 'location']
  }
];

/**
 * Initialize default templates in the database
 */
export async function initializeDefaultTemplates(): Promise<void> {
  console.log('Initializing default email templates...');

  for (const template of DEFAULT_TEMPLATES) {
    try {
      // Check if template already exists
      const existing = await notificationDb.getEmailTemplateByName(template.name);

      if (!existing) {
        await notificationDb.createEmailTemplate(template);
        console.log(`Created template: ${template.name}`);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    } catch (error) {
      console.error(`Failed to create template ${template.name}:`, error);
    }
  }

  console.log('Default email templates initialization complete');
}

/**
 * Update existing templates with new versions
 */
export async function updateDefaultTemplates(): Promise<void> {
  console.log('Updating default email templates...');

  for (const template of DEFAULT_TEMPLATES) {
    try {
      const existing = await notificationDb.getEmailTemplateByName(template.name);

      if (existing) {
        await notificationDb.updateEmailTemplate((existing._id as any).toString(), {
          subject: template.subject,
          htmlTemplate: template.htmlTemplate,
          textTemplate: template.textTemplate,
          variables: template.variables
        });
        console.log(`Updated template: ${template.name}`);
      }
    } catch (error) {
      console.error(`Failed to update template ${template.name}:`, error);
    }
  }

  console.log('Default email templates update complete');
}