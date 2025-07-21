"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ValidationResult,
  FieldValidationResult,
  NoteValidator,
  CalendarEventValidator,
  KanbanValidator
} from '@/lib/utils/productivity-validation';

/**
 * Hook for real-time validation with debouncing
 */
export function useRealTimeValidation<T>(
  data: T,
  validator: (data: T) => ValidationResult,
  debounceMs: number = 300
) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: []
  });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      try {
        const result = validator(data);
        setValidationResult(result);
      } catch (error) {
        console.error('Validation error:', error);
        setValidationResult({
          isValid: false,
          errors: ['Validation failed due to an unexpected error']
        });
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, validator, debounceMs]);

  return { validationResult, isValidating };
}

/**
 * Hook for field-level validation
 */
export function useFieldValidation(
  value: any,
  validator: (value: any) => FieldValidationResult,
  debounceMs: number = 300
) {
  const [validationResult, setValidationResult] = useState<FieldValidationResult>({
    isValid: true
  });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      try {
        const result = validator(value);
        setValidationResult(result);
      } catch (error) {
        console.error('Field validation error:', error);
        setValidationResult({
          isValid: false,
          error: 'Validation failed'
        });
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, validator, debounceMs]);

  return { validationResult, isValidating };
}

/**
 * Hook for Note validation
 */
export function useNoteValidation(noteData: {
  title?: string;
  content?: string;
  color?: string;
}, debounceMs: number = 300) {
  const validator = useCallback((data: typeof noteData) => {
    return NoteValidator.validateNote(data);
  }, []);

  return useRealTimeValidation(noteData, validator, debounceMs);
}

/**
 * Hook for Calendar Event validation
 */
export function useCalendarEventValidation(eventData: {
  title?: string;
  description?: string;
  location?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isAllDay?: boolean;
}, debounceMs: number = 300) {
  const validator = useCallback((data: typeof eventData) => {
    return CalendarEventValidator.validateEvent(data);
  }, []);

  return useRealTimeValidation(eventData, validator, debounceMs);
}

/**
 * Hook for Kanban Task validation
 */
export function useKanbanTaskValidation(taskData: {
  title?: string;
  description?: string;
  taskImage?: string;
  date?: string;
  taskProperty?: string;
}, debounceMs: number = 300) {
  const validator = useCallback((data: typeof taskData) => {
    return KanbanValidator.validateTask(data);
  }, []);

  return useRealTimeValidation(taskData, validator, debounceMs);
}

/**
 * Hook for form submission validation
 */
export function useFormValidation<T>(
  formData: T,
  validator: (data: T) => ValidationResult,
  onValidationChange?: (isValid: boolean) => void
) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: []
  });
  const [hasValidated, setHasValidated] = useState(false);

  const validateForm = useCallback(() => {
    try {
      const result = validator(formData);
      setValidationResult(result);
      setHasValidated(true);

      if (onValidationChange) {
        onValidationChange(result.isValid);
      }

      return result;
    } catch (error) {
      console.error('Form validation error:', error);
      const errorResult = {
        isValid: false,
        errors: ['Form validation failed due to an unexpected error']
      };
      setValidationResult(errorResult);
      setHasValidated(true);

      if (onValidationChange) {
        onValidationChange(false);
      }

      return errorResult;
    }
  }, [formData, validator, onValidationChange]);

  const clearValidation = useCallback(() => {
    setValidationResult({ isValid: true, errors: [] });
    setHasValidated(false);
  }, []);

  // Memoize the current validation state
  const isValid = useMemo(() => validationResult.isValid, [validationResult.isValid]);
  const errors = useMemo(() => validationResult.errors, [validationResult.errors]);
  const warnings = useMemo(() => validationResult.warnings, [validationResult.warnings]);

  return {
    validationResult,
    isValid,
    errors,
    warnings,
    hasValidated,
    validateForm,
    clearValidation
  };
}

/**
 * Hook for managing validation state across multiple fields
 */
export function useMultiFieldValidation() {
  const [fieldValidations, setFieldValidations] = useState<Record<string, FieldValidationResult>>({});

  const updateFieldValidation = useCallback((fieldName: string, result: FieldValidationResult) => {
    setFieldValidations(prev => ({
      ...prev,
      [fieldName]: result
    }));
  }, []);

  const clearFieldValidation = useCallback((fieldName: string) => {
    setFieldValidations(prev => {
      const { [fieldName]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllValidations = useCallback(() => {
    setFieldValidations({});
  }, []);

  const isFormValid = useMemo(() => {
    return Object.values(fieldValidations).every(result => result.isValid);
  }, [fieldValidations]);

  const formErrors = useMemo(() => {
    return Object.entries(fieldValidations)
      .filter(([_, result]) => !result.isValid && result.error)
      .map(([fieldName, result]) => `${fieldName}: ${result.error}`);
  }, [fieldValidations]);

  const formWarnings = useMemo(() => {
    return Object.entries(fieldValidations)
      .filter(([_, result]) => result.warning)
      .map(([fieldName, result]) => `${fieldName}: ${result.warning}`);
  }, [fieldValidations]);

  return {
    fieldValidations,
    updateFieldValidation,
    clearFieldValidation,
    clearAllValidations,
    isFormValid,
    formErrors,
    formWarnings
  };
}

/**
 * Hook for validation with async operations (e.g., server-side validation)
 */
export function useAsyncValidation<T>(
  data: T,
  asyncValidator: (data: T) => Promise<ValidationResult>,
  debounceMs: number = 500
) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationId, setValidationId] = useState(0);

  useEffect(() => {
    const currentValidationId = validationId + 1;
    setValidationId(currentValidationId);
    setIsValidating(true);

    const timeoutId = setTimeout(async () => {
      try {
        const result = await asyncValidator(data);

        // Only update if this is still the latest validation
        if (currentValidationId === validationId) {
          setValidationResult(result);
        }
      } catch (error) {
        console.error('Async validation error:', error);
        if (currentValidationId === validationId) {
          setValidationResult({
            isValid: false,
            errors: ['Validation failed due to a server error']
          });
        }
      } finally {
        if (currentValidationId === validationId) {
          setIsValidating(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, asyncValidator, debounceMs, validationId]);

  return { validationResult, isValidating };
}