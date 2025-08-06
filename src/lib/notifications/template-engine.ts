import { notificationDb } from './database-operations';
import { NotificationType } from '../database/models/NotificationEvent';
import { IEmailTemplateDocument } from '../database/models/EmailTemplate';
import { EMAIL_CONFIG } from './config';

export interface TemplateVariables {
  [key: string]: any;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    name: string;
  };
  baseUrl?: string;
  unsubscribeUrl?: string;
  supportEmail?: string;
  companyName?: string;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export class TemplateEngine {

  /**
   * Render a template with variables
   */
  async renderTemplate(templateId: string, variables: TemplateVariables): Promise<RenderedTemplate> {
    const template = await notificationDb.getEmailTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return this.renderTemplateContent(template, variables);
  }

  /**
   * Render template by notification type
   */
  async renderTemplateByType(type: NotificationType, variables: any): Promise<RenderedTemplate> {
    const template = await notificationDb.getEmailTemplateByType(type);
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    return this.renderTemplateContent(template, variables);
  }

  /**
   * Render template content with variables
   */
  private renderTemplateContent(template: IEmailTemplateDocument, variables: TemplateVariables): RenderedTemplate {
    // Add default variables
    const allVariables = {
      ...variables,
      baseUrl: EMAIL_CONFIG.BASE_URL,
      supportEmail: EMAIL_CONFIG.REPLY_TO,
      companyName: EMAIL_CONFIG.FROM_NAME,
      currentYear: new Date().getFullYear(),
      ...this.generateUnsubscribeUrl(variables.user?.email)
    };

    return {
      subject: this.replaceVariables(template.subject, allVariables),
      html: this.replaceVariables(template.htmlTemplate, allVariables),
      text: this.replaceVariables(template.textTemplate, allVariables)
    };
  }

  /**
   * Replace variables in template content
   */
  private replaceVariables(content: string, variables: TemplateVariables): string {
    let result = content;

    // Replace simple variables like {{variableName}}
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      const value = this.getNestedValue(variables, trimmedName);
      return value !== undefined ? String(value) : match;
    });

    // Replace conditional blocks like {{#if condition}}...{{/if}}
    result = this.replaceConditionals(result, variables);

    // Replace loops like {{#each items}}...{{/each}}
    result = this.replaceLoops(result, variables);

    return result;
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Replace conditional blocks
   */
  private replaceConditionals(content: string, variables: TemplateVariables): string {
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return content.replace(conditionalRegex, (match, condition, innerContent) => {
      const conditionValue = this.getNestedValue(variables, condition.trim());
      return conditionValue ? innerContent : '';
    });
  }

  /**
   * Replace loop blocks
   */
  private replaceLoops(content: string, variables: TemplateVariables): string {
    const loopRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return content.replace(loopRegex, (match, arrayPath, innerContent) => {
      const array = this.getNestedValue(variables, arrayPath.trim());
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        const itemVariables = {
          ...variables,
          this: item,
          index,
          first: index === 0,
          last: index === array.length - 1
        };
        return this.replaceVariables(innerContent, itemVariables);
      }).join('');
    });
  }

  /**
   * Generate unsubscribe URL
   */
  private generateUnsubscribeUrl(email?: string): { unsubscribeUrl?: string } {
    if (!email) return {};

    const token = Buffer.from(email).toString('base64');
    return {
      unsubscribeUrl: `${EMAIL_CONFIG.BASE_URL}/api/notifications/unsubscribe?token=${token}`
    };
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: { subject: string; htmlTemplate: string; textTemplate: string }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for required fields
    if (!template.subject?.trim()) {
      errors.push('Subject is required');
    }
    if (!template.htmlTemplate?.trim()) {
      errors.push('HTML template is required');
    }
    if (!template.textTemplate?.trim()) {
      errors.push('Text template is required');
    }

    // Check for unclosed template tags
    const templates = [template.subject, template.htmlTemplate, template.textTemplate];

    templates.forEach((content, index) => {
      if (!content) return;

      const templateName = ['subject', 'HTML', 'text'][index];

      // Check for unclosed {{#if}} blocks
      const ifCount = (content.match(/\{\{#if/g) || []).length;
      const endIfCount = (content.match(/\{\{\/if\}\}/g) || []).length;
      if (ifCount !== endIfCount) {
        errors.push(`Unclosed {{#if}} blocks in ${templateName} template`);
      }

      // Check for unclosed {{#each}} blocks
      const eachCount = (content.match(/\{\{#each/g) || []).length;
      const endEachCount = (content.match(/\{\{\/each\}\}/g) || []).length;
      if (eachCount !== endEachCount) {
        errors.push(`Unclosed {{#each}} blocks in ${templateName} template`);
      }

      // Check for malformed variable syntax
      const malformedVars = content.match(/\{[^{]|[^}]\}/g);
      if (malformedVars) {
        errors.push(`Malformed variable syntax in ${templateName} template`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): string[] {
    const variables = new Set<string>();

    // Extract simple variables {{variableName}}
    const simpleVars = content.match(/\{\{([^#/][^}]*)\}\}/g);
    if (simpleVars) {
      simpleVars.forEach(match => {
        const varName = match.replace(/[{}]/g, '').trim();
        if (!varName.includes(' ')) { // Skip complex expressions
          variables.add(varName);
        }
      });
    }

    // Extract conditional variables {{#if variableName}}
    const conditionalVars = content.match(/\{\{#if\s+([^}]+)\}\}/g);
    if (conditionalVars) {
      conditionalVars.forEach(match => {
        const varName = match.replace(/\{\{#if\s+/, '').replace(/\}\}/, '').trim();
        variables.add(varName);
      });
    }

    // Extract loop variables {{#each arrayName}}
    const loopVars = content.match(/\{\{#each\s+([^}]+)\}\}/g);
    if (loopVars) {
      loopVars.forEach(match => {
        const varName = match.replace(/\{\{#each\s+/, '').replace(/\}\}/, '').trim();
        variables.add(varName);
      });
    }

    return Array.from(variables);
  }

  /**
   * Get all variables from a template
   */
  async getTemplateVariables(templateId: string): Promise<string[]> {
    const template = await notificationDb.getEmailTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const allVariables = new Set<string>();

    // Extract from all template parts
    [template.subject, template.htmlTemplate, template.textTemplate].forEach(content => {
      const vars = this.extractVariables(content);
      vars.forEach(v => allVariables.add(v));
    });

    return Array.from(allVariables);
  }

  /**
   * Test template rendering with sample data
   */
  async testTemplate(templateId: string, sampleData?: TemplateVariables): Promise<{
    success: boolean;
    result?: RenderedTemplate;
    error?: string;
  }> {
    try {
      const defaultSampleData: TemplateVariables = {
        user: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          name: 'John Doe'
        },
        testData: 'This is test data',
        items: [
          { name: 'Item 1', value: 100 },
          { name: 'Item 2', value: 200 }
        ]
      };

      const variables = { ...defaultSampleData, ...sampleData };
      const result = await this.renderTemplate(templateId, variables);

      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine();
export default TemplateEngine;