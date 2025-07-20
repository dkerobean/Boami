/**
 * Comprehensive Validation System
 * Provides client-side validation with real-time feedback
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  phone?: boolean;
  currency?: boolean;
  integer?: boolean;
  positive?: boolean;
  custom?: (value: any) => string | null;
  customAsync?: (value: any) => Promise<string | null>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstError?: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

export class Validator {
  private static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static urlRegex = /^https?:\/\/.+\..+/;
  private static phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  private static currencyRegex = /^\d+(\.\d{1,2})?$/;

  /**
   * Validate a single field
   */
  static validateField(value: any, rules: ValidationRule): FieldValidationResult {
    // Handle required validation
    if (rules.required && this.isEmpty(value)) {
      return { isValid: false, error: 'This field is required' };
    }

    // If field is empty and not required, it's valid
    if (this.isEmpty(value) && !rules.required) {
      return { isValid: true };
    }

    const stringValue = String(value).trim();
    const numericValue = Number(value);

    // String length validations
    if (rules.minLength && stringValue.length < rules.minLength) {
      return {
        isValid: false,
        error: `Must be at least ${rules.minLength} characters long`
      };
    }

    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return {
        isValid: false,
        error: `Must not exceed ${rules.maxLength} characters`
      };
    }

    // Numeric validations
    if (rules.min !== undefined && numericValue < rules.min) {
      return {
        isValid: false,
        error: `Must be at least ${rules.min}`
      };
    }

    if (rules.max !== undefined && numericValue > rules.max) {
      return {
        isValid: false,
        error: `Must not exceed ${rules.max}`
      };
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return {
        isValid: false,
        error: 'Invalid format'
      };
    }

    // Email validation
    if (rules.email && !this.emailRegex.test(stringValue)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      };
    }

    // URL validation
    if (rules.url && !this.urlRegex.test(stringValue)) {
      return {
        isValid: false,
        error: 'Please enter a valid URL (include http:// or https://)'
      };
    }

    // Phone validation
    if (rules.phone && !this.phoneRegex.test(stringValue.replace(/[\s\-\(\)]/g, ''))) {
      return {
        isValid: false,
        error: 'Please enter a valid phone number'
      };
    }

    // Currency validation
    if (rules.currency && !this.currencyRegex.test(stringValue)) {
      return {
        isValid: false,
        error: 'Please enter a valid amount (e.g., 123.45)'
      };
    }

    // Integer validation
    if (rules.integer && !Number.isInteger(numericValue)) {
      return {
        isValid: false,
        error: 'Must be a whole number'
      };
    }

    // Positive number validation
    if (rules.positive && numericValue <= 0) {
      return {
        isValid: false,
        error: 'Must be a positive number'
      };
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return { isValid: false, error: customError };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate multiple fields
   */
  static validateFields(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const fieldValue = data[fieldName];
      const result = this.validateField(fieldValue, fieldRules);

      if (!result.isValid && result.error) {
        errors[fieldName] = result.error;
      }
    }

    const isValid = Object.keys(errors).length === 0;
    const firstError = isValid ? undefined : Object.values(errors)[0];

    return { isValid, errors, firstError };
  }

  /**
   * Validate fields with async rules
   */
  static async validateFieldsAsync(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): Promise<ValidationResult> {
    const errors: Record<string, string> = {};
    const asyncValidations: Promise<void>[] = [];

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const fieldValue = data[fieldName];

      // First run synchronous validation
      const syncResult = this.validateField(fieldValue, fieldRules);
      if (!syncResult.isValid && syncResult.error) {
        errors[fieldName] = syncResult.error;
        continue; // Skip async validation if sync validation failed
      }

      // Run async validation if present
      if (fieldRules.customAsync) {
        const asyncValidation = fieldRules.customAsync(fieldValue).then(error => {
          if (error) {
            errors[fieldName] = error;
          }
        });
        asyncValidations.push(asyncValidation);
      }
    }

    // Wait for all async validations to complete
    await Promise.all(asyncValidations);

    const isValid = Object.keys(errors).length === 0;
    const firstError = isValid ? undefined : Object.values(errors)[0];

    return { isValid, errors, firstError };
  }

  /**
   * Check if value is empty
   */
  private static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Financial-specific validation rules
   */
  static financial = {
    amount: {
      required: true,
      positive: true,
      currency: true,
      max: 999999.99
    },

    description: {
      required: true,
      minLength: 3,
      maxLength: 255
    },

    categoryId: {
      required: true,
      custom: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Please select a category';
        }
        return null;
      }
    },

    vendorName: {
      required: true,
      minLength: 2,
      maxLength: 100
    },

    vendorEmail: {
      email: true,
      maxLength: 100
    },

    vendorPhone: {
      phone: true,
      maxLength: 20
    },

    vendorWebsite: {
      url: true,
      maxLength: 100
    },

    productQuantity: {
      required: true,
      integer: true,
      positive: true,
      max: 10000
    },

    recurringFrequency: {
      required: true,
      custom: (value: string) => {
        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        if (!validFrequencies.includes(value)) {
          return 'Please select a valid frequency';
        }
        return null;
      }
    }
  };

  /**
   * Create async validator for unique checks
   */
  static createUniqueValidator(
    checkFunction: (value: string) => Promise<boolean>,
    errorMessage: string = 'This value already exists'
  ) {
    return async (value: string): Promise<string | null> => {
      if (!value || value.trim() === '') return null;

      try {
        const isUnique = await checkFunction(value);
        return isUnique ? null : errorMessage;
      } catch (error) {
        // If check fails, assume it's unique to avoid blocking user
        return null;
      }
    };
  }

  /**
   * Create conditional validator
   */
  static createConditionalValidator(
    condition: (data: any) => boolean,
    rules: ValidationRule
  ) {
    return {
      custom: (value: any, data?: any) => {
        if (!condition(data)) return null;

        const result = this.validateField(value, rules);
        return result.error || null;
      }
    };
  }

  /**
   * Validate income data
   */
  static validateIncome(data: any): ValidationResult {
    return this.validateFields(data, {
      amount: this.financial.amount,
      description: this.financial.description,
      categoryId: this.financial.categoryId,
      date: { required: true }
    });
  }

  /**
   * Validate expense data
   */
  static validateExpense(data: any): ValidationResult {
    return this.validateFields(data, {
      amount: this.financial.amount,
      description: this.financial.description,
      categoryId: this.financial.categoryId,
      date: { required: true }
    });
  }

  /**
   * Validate sale data
   */
  static validateSale(data: any): ValidationResult {
    return this.validateFields(data, {
      productId: { required: true },
      quantity: this.financial.productQuantity,
      unitPrice: this.financial.amount,
      date: { required: true }
    });
  }

  /**
   * Validate category data
   */
  static validateCategory(data: any): ValidationResult {
    return this.validateFields(data, {
      name: {
        required: true,
        minLength: 2,
        maxLength: 50
      },
      type: {
        required: true,
        custom: (value: string) => {
          if (!['income', 'expense'].includes(value)) {
            return 'Type must be either income or expense';
          }
          return null;
        }
      },
      description: {
        maxLength: 200
      }
    });
  }

  /**
   * Validate vendor data
   */
  static validateVendor(data: any): ValidationResult {
    return this.validateFields(data, {
      name: this.financial.vendorName,
      email: this.financial.vendorEmail,
      phone: this.financial.vendorPhone,
      website: this.financial.vendorWebsite,
      address: { maxLength: 200 },
      contactPerson: { maxLength: 100 },
      notes: { maxLength: 500 }
    });
  }

  /**
   * Validate recurring payment data
   */
  static validateRecurringPayment(data: any): ValidationResult {
    return this.validateFields(data, {
      type: {
        required: true,
        custom: (value: string) => {
          if (!['income', 'expense'].includes(value)) {
            return 'Type must be either income or expense';
          }
          return null;
        }
      },
      amount: this.financial.amount,
      description: this.financial.description,
      frequency: this.financial.recurringFrequency,
      startDate: { required: true },
      categoryId: this.financial.categoryId
    });
  }
}

export default Validator;