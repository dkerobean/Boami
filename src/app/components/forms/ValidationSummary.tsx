"use client";
import React from 'react';
import { Alert, Box, Typography, List, ListItem, ListItemIcon, ListItemText, Collapse, IconButton } from '@mui/material';
import { IconAlertTriangle, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface ValidationError {
  field: string;
  message: string;
  section?: string;
  label?: string;
}

interface ValidationSummaryProps {
  errors: ValidationError[];
  show: boolean;
  onFieldClick?: (fieldName: string) => void;
  collapsible?: boolean;
}

/**
 * ValidationSummary component displays form validation errors in a prominent alert
 * Provides clickable links to navigate to invalid fields
 */
const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  show,
  onFieldClick,
  collapsible = true
}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  if (!show || errors.length === 0) {
    return null;
  }

  const handleFieldClick = (fieldName: string) => {
    if (onFieldClick) {
      onFieldClick(fieldName);
    } else {
      // Default behavior: scroll to field
      const element = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Focus the element if it's an input
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
        }
      }
    }
  };

  const groupedErrors = errors.reduce((groups, error) => {
    const section = error.section || 'Other';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(error);
    return groups;
  }, {} as Record<string, ValidationError[]>);

  return (
    <Alert 
      severity="error" 
      sx={{ 
        mb: 3,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
      icon={<IconAlertTriangle size={24} />}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" width="100%">
        <Box flex={1}>
          <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
            Please fix {errors.length} error{errors.length > 1 ? 's' : ''} below:
          </Typography>
          
          <Collapse in={!collapsed} timeout="auto">
            <Box>
              {Object.entries(groupedErrors).map(([section, sectionErrors]) => (
                <Box key={section} sx={{ mb: 1 }}>
                  {Object.keys(groupedErrors).length > 1 && (
                    <Typography variant="subtitle2" color="error.dark" sx={{ mb: 0.5 }}>
                      {section}:
                    </Typography>
                  )}
                  <List dense disablePadding>
                    {sectionErrors.map((error, index) => (
                      <ListItem 
                        key={`${error.field}-${index}`}
                        disablePadding
                        sx={{ 
                          py: 0.25,
                          cursor: 'pointer',
                          borderRadius: 1,
                          '&:hover': {
                            backgroundColor: 'error.lighter',
                          }
                        }}
                        onClick={() => handleFieldClick(error.field)}
                      >
                        <ListItemIcon sx={{ minWidth: 24 }}>
                          <Box 
                            sx={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              backgroundColor: 'error.main' 
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="body2" color="error.main">
                              <strong>{error.label || error.field}:</strong> {error.message}
                            </Typography>
                          }
                          sx={{ margin: 0 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
        
        {collapsible && (
          <IconButton 
            size="small" 
            onClick={() => setCollapsed(!collapsed)}
            sx={{ ml: 1, mt: -0.5 }}
          >
            {collapsed ? <IconChevronDown size={20} /> : <IconChevronUp size={20} />}
          </IconButton>
        )}
      </Box>
    </Alert>
  );
};

/**
 * Helper function to convert Formik errors to ValidationError format
 */
export const formatFormikErrors = (
  errors: Record<string, any>, 
  fieldLabels: Record<string, string> = {},
  sectionMap: Record<string, string> = {}
): ValidationError[] => {
  const validationErrors: ValidationError[] = [];

  const processErrors = (errorsObj: any, prefix = '') => {
    Object.entries(errorsObj).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        validationErrors.push({
          field: fieldName,
          message: value,
          label: fieldLabels[fieldName] || fieldLabels[key] || key,
          section: sectionMap[fieldName] || sectionMap[key] || 'General'
        });
      } else if (typeof value === 'object' && value !== null) {
        processErrors(value, fieldName);
      }
    });
  };

  processErrors(errors);
  return validationErrors;
};

/**
 * Helper function to scroll to and focus first invalid field
 */
export const focusFirstInvalidField = (errors: Record<string, any>, formRef?: React.RefObject<HTMLFormElement>) => {
  const firstErrorField = Object.keys(errors)[0];
  if (!firstErrorField) return;

  const selector = `[name="${firstErrorField}"], #${firstErrorField}`;
  const element = formRef?.current?.querySelector(selector) || document.querySelector(selector);
  
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Small delay to ensure scrolling completes before focusing
    setTimeout(() => {
      if (element instanceof HTMLInputElement || 
          element instanceof HTMLTextAreaElement || 
          element instanceof HTMLSelectElement) {
        element.focus();
      }
    }, 300);
  }
};

export default ValidationSummary;