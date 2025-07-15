'use client';

import React from 'react';
import { Box, Typography, FormHelperText } from '@mui/material';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/material.css';

interface PhoneInputComponentProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
}

const PhoneInputComponent: React.FC<PhoneInputComponentProps> = ({
  value,
  onChange,
  onBlur,
  error = false,
  helperText,
  disabled = false,
  placeholder = "Enter phone number",
}) => {
  return (
    <Box>
      <PhoneInput
        country={'us'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={{
          name: 'phone',
          required: false,
          autoFocus: false,
        }}
        containerStyle={{
          width: '100%',
        }}
        inputStyle={{
          width: '100%',
          height: '56px',
          fontSize: '16px',
          paddingLeft: '48px',
          border: error ? '2px solid #d32f2f' : '1px solid #c4c4c4',
          borderRadius: '4px',
          outline: 'none',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          color: disabled ? '#999' : '#000',
        }}
        buttonStyle={{
          border: error ? '2px solid #d32f2f' : '1px solid #c4c4c4',
          borderRight: 'none',
          borderRadius: '4px 0 0 4px',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
        }}
        dropdownStyle={{
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 9999,
        }}
        searchStyle={{
          margin: '0',
          width: '97%',
          height: '30px',
        }}
        enableSearch={true}
        disableSearchIcon={true}
        searchPlaceholder="Search countries..."
        specialLabel=""
      />
      {helperText && (
        <FormHelperText error={error} sx={{ ml: 1.75, mt: 0.5 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

export default PhoneInputComponent;