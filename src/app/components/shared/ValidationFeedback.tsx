"use client";
import React from 'react';
import { Alert, AlertTitle, Box, Typography, Chip } from '@mui/material';
import { IconAlertCircle, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { ValidationResult, FieldValidationResult } from '@/lib/utils/productivity-validation';

interface ValidationFeedbackProps {
  validationResult: ValidationResult;
  showSuccess?: boolean;
  compact?: boolean;
}

interface FieldValidationFeedbackProps {
  validationResult: FieldValidationResult;
  showSuccess?: boolean;
  compact?: boolean;
}

/**
 * Component to display validation feedback for forms
 */
export function ValidationFeedback({
  validationResult,
  showSuccess = false,
  compact = false
}: ValidationFeedbackProps) {
  const { isValid, errors, warnings } = validationResult;

  if (isValid && !showSuccess && (!warnings || warnings.length === 0)) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      {/* Success message */}
      {isValid && showSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 1 }}
          icon={<IconCheck size="1rem" />}
        >
          {compact ? (
            <Typography variant="body2">Valid</Typography>
          ) : (
            <>
              <AlertTitle>Valid Input</AlertTitle>
              All fields are valid and ready to submit.
            </>
          )}
        </Alert>
      )}

      {/* Error messages */}
      {errors && errors.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 1 }}
          icon={<IconAlertCircle size="1rem" />}
        >
          {compact ? (
            <Typography variant="body2">
              {errors.length === 1 ? errors[0] : `${errors.length} validation errors`}
            </Typography>
          ) : (
            <>
              <AlertTitle>Validation Errors</AlertTitle>
              {errors.length === 1 ? (
                <Typography variant="body2">{errors[0]}</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {errors.map((error, index) => (
                    <li key={index}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </Box>
              )}
            </>
          )}
        </Alert>
      )}

      {/* Warning messages */}
      {warnings && warnings.length > 0 && (
        <Alert
          severity="warning"
          icon={<IconAlertTriangle size="1rem" />}
        >
          {compact ? (
            <Typography variant="body2">
              {warnings.length === 1 ? warnings[0] : `${warnings.length} warnings`}
            </Typography>
          ) : (
            <>
              <AlertTitle>Warnings</AlertTitle>
              {warnings.length === 1 ? (
                <Typography variant="body2">{warnings[0]}</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {warnings.map((warning, index) => (
                    <li key={index}>
                      <Typography variant="body2">{warning}</Typography>
                    </li>
                  ))}
                </Box>
              )}
            </>
          )}
        </Alert>
      )}
    </Box>
  );
}

/**
 * Component to display validation feedback for individual fields
 */
export function FieldValidationFeedback({
  validationResult,
  showSuccess = false,
  compact = true
}: FieldValidationFeedbackProps) {
  const { isValid, error, warning } = validationResult;

  if (isValid && !showSuccess && !warning) {
    return null;
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      {/* Success indicator */}
      {isValid && showSuccess && !warning && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconCheck size="0.875rem" color="green" />
          <Typography variant="caption" color="success.main">
            Valid
          </Typography>
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconAlertCircle size="0.875rem" color="red" />
          <Typography variant="caption" color="error.main">
            {error}
          </Typography>
        </Box>
      )}

      {/* Warning message */}
      {warning && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconAlertTriangle size="0.875rem" color="orange" />
          <Typography variant="caption" color="warning.main">
            {warning}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/**
 * Validation status chip component
 */
interface ValidationStatusChipProps {
  validationResult: ValidationResult | FieldValidationResult;
  showValid?: boolean;
}

export function ValidationStatusChip({
  validationResult,
  showValid = false
}: ValidationStatusChipProps) {
  const isFieldResult = 'error' in validationResult;
  const isValid = validationResult.isValid;
  const hasErrors = isFieldResult
    ? !!validationResult.error
    : ((validationResult as ValidationResult)?.errors?.length || 0) > 0;
  const hasWarnings = isFieldResult
    ? !!validationResult.warning
    : ((validationResult as ValidationResult)?.warnings?.length || 0) > 0;

  if (isValid && !showValid && !hasWarnings) {
    return null;
  }

  let color: 'success' | 'error' | 'warning' = 'success';
  let label = 'Valid';
  let icon = <IconCheck size="0.75rem" />;

  if (hasErrors) {
    color = 'error';
    label = 'Invalid';
    icon = <IconAlertCircle size="0.75rem" />;
  } else if (hasWarnings) {
    color = 'warning';
    label = 'Warning';
    icon = <IconAlertTriangle size="0.75rem" />;
  }

  return (
    <Chip
      size="small"
      color={color}
      variant="outlined"
      icon={icon}
      label={label}
      sx={{ height: 20, fontSize: '0.75rem' }}
    />
  );
}

export default ValidationFeedback;