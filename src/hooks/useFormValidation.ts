/**
 * Form Validation Hook
 * Provides real-time form validation with error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { Validator, ValidationRule, ValidationResult } from '@/lib/utils/validation';
import { ErrorHandler } from '@/lib/utils/error-handler';

export interface UseFormValidationOptions {
  initialValues?: Record<string, any>;
  validationRules: Record<string, ValidationRule>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: Record<string, any>) => Promise<void> | void;
  onError?: (error: any) => void;
}

export interface UseFormValidationReturn {
  // Form state
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;

  // Form actions
  setValue: (field: string, value: any) => void;
  setValues: (values: Record<string, any>) => void;
  setError: (field: string, error: string) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  setTouched: (field: string, touched?: boolean) => void;
  setFieldTouched: (field: string, touched?: boolean) => void;

  // Validation actions
  validateField: (field: string) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;

  // Utility actions
  reset: () => void;
  resetField: (field: string) => void;

  // Event handlers
  handleChange: (field: string) => (e: React.ChangeEvent<any>) => void;
  handleBlur: (field: string) => (e: React.FocusEvent<any>) => void;

  // Helper functions
  getFieldProps: (field: string) => {
    value: any;
    onChange: (e: React.ChangeEvent<any>) => void;
    onBlur: (e: React.FocusEvent<any>) => void;
    error: boolean;
    helperText: string;
  };
}

export function useFormValidation(options: UseFormValidationOptions): UseFormValidationReturn {
  const {
    initialValues = {},
    validationRules,
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
    onError
  } = options;

  // Form state
  const [values, setValuesState] = useState<Record<string, any>>(initialValues);
  const [errors, setErrorsState] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state
  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  // Validate a single field
  const validateField = useCallback(async (field: string): Promise<boolean> => {
    const fieldRules = validationRules[field];
    if (!fieldRules) return true;

    const fieldValue = values[field];

    try {
      // Run synchronous validation
      const syncResult = Validator.validateField(fieldValue, fieldRules);

      if (!syncResult.isValid && syncResult.error) {
        setErrorsState(prev => ({ ...prev, [field]: syncResult.error! }));
        return false;
      }

      // Run async validation if present
      if (fieldRules.customAsync) {
        const asyncError = await fieldRules.customAsync(fieldValue);
        if (asyncError) {
          setErrorsState(prev => ({ ...prev, [field]: asyncError }));
          return false;
        }
      }

      // Clear error if validation passed
      setErrorsState(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      return true;
    } catch (error) {
      const errorMessage = ErrorHandler.getUserMessage(error);
      setErrorsState(prev => ({ ...prev, [field]: errorMessage }));
      return false;
    }
  }, [values, validationRules]);

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Validator.validateFieldsAsync(values, validationRules);
      setErrorsState(result.errors);
      return result.isValid;
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        ErrorHandler.handleError(error, {
          component: 'useFormValidation',
          action: 'validateForm'
        });
      }
      return false;
    }
  }, [values, validationRules, onError]);

  // Set single field value
  const setValue = useCallback((field: string, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));

    // Validate on change if enabled
    if (validateOnChange && touched[field]) {
      // Use setTimeout to ensure state is updated before validation
      setTimeout(() => validateField(field), 0);
    }
  }, [validateOnChange, touched, validateField]);

  // Set multiple values
  const setValues = useCallback((newValues: Record<string, any>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  // Set single field error
  const setError = useCallback((field: string, error: string) => {
    setErrorsState(prev => ({ ...prev, [field]: error }));
  }, []);

  // Set multiple errors
  const setErrors = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(prev => ({ ...prev, ...newErrors }));
  }, []);

  // Clear single field error
  const clearError = useCallback((field: string) => {
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  // Set field as touched
  const setTouched = useCallback((field: string, isTouched: boolean = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  // Alias for setTouched
  const setFieldTouched = setTouched;

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const allTouched = Object.keys(validationRules).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouchedState(allTouched);

    setIsSubmitting(true);

    try {
      // Validate form
      const isFormValid = await validateForm();

      if (!isFormValid) {
        setIsSubmitting(false);
        return;
      }

      // Call onSubmit if provided
      if (onSubmit) {
        await onSubmit(values);
      }
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        ErrorHandler.handleError(error, {
          component: 'useFormValidation',
          action: 'handleSubmit'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validationRules, validateForm, onSubmit, onError, values]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Reset single field
  const resetField = useCallback((field: string) => {
    setValuesState(prev => ({ ...prev, [field]: initialValues[field] }));
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setTouchedState(prev => ({ ...prev, [field]: false }));
  }, [initialValues]);

  // Handle input change
  const handleChange = useCallback((field: string) => {
    return (e: React.ChangeEvent<any>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setValue(field, value);
    };
  }, [setValue]);

  // Handle input blur
  const handleBlur = useCallback((field: string) => {
    return (e: React.FocusEvent<any>) => {
      setTouched(field, true);

      if (validateOnBlur) {
        validateField(field);
      }
    };
  }, [setTouched, validateOnBlur, validateField]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((field: string) => {
    return {
      value: values[field] || '',
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      error: touched[field] && !!errors[field],
      helperText: touched[field] ? errors[field] || '' : ''
    };
  }, [values, handleChange, handleBlur, touched, errors]);

  // Update values when initialValues change
  useEffect(() => {
    setValuesState(initialValues);
  }, [initialValues]);

  return {
    // Form state
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,

    // Form actions
    setValue,
    setValues,
    setError,
    setErrors,
    clearError,
    clearErrors,
    setTouched,
    setFieldTouched,

    // Validation actions
    validateField,
    validateForm,
    handleSubmit,

    // Utility actions
    reset,
    resetField,

    // Event handlers
    handleChange,
    handleBlur,

    // Helper functions
    getFieldProps
  };
}

export default useFormValidation;