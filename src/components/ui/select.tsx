import React from 'react';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  SelectProps as MuiSelectProps,
  Box,
} from '@mui/material';

export interface SelectProps extends Omit<MuiSelectProps, 'children'> {
  placeholder?: string;
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ 
  placeholder, 
  children, 
  ...props 
}) => {
  return (
    <FormControl fullWidth size="small">
      <MuiSelect
        displayEmpty
        {...props}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {children}
      </MuiSelect>
    </FormControl>
  );
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return <>{children}</>;
};

export const SelectItem: React.FC<{ 
  value: string; 
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ 
  value, 
  children, 
  disabled 
}) => {
  return (
    <MenuItem value={value} disabled={disabled}>
      {children}
    </MenuItem>
  );
};

export const SelectTrigger: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return <Box>{children}</Box>;
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ 
  placeholder 
}) => {
  return <span>{placeholder}</span>;
};