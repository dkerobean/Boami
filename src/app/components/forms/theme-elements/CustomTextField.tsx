'use client'
import React from 'react';
import { styled } from '@mui/material/styles';
import { TextField } from '@mui/material';

const CustomTextField = styled((props: any) => <TextField {...props} />)(({ theme }) => ({
  '& .MuiOutlinedInput-input::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '0.8',
  },
  '& .MuiOutlinedInput-input.Mui-disabled::-webkit-input-placeholder': {
    color: theme.palette.text.secondary,
    opacity: '1',
  },
  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[200],
  },
  // Enhanced error state styling
  '&.Mui-error': {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: theme.palette.error.main,
        borderWidth: '2px',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.error.dark,
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.error.main,
        borderWidth: '2px',
      },
      // Add subtle background color for error state
      backgroundColor: theme.palette.error.lighter || 'rgba(255, 72, 66, 0.04)',
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.error.main,
      '&.Mui-focused': {
        color: theme.palette.error.main,
      },
    },
  },
  // Enhanced focus states
  '& .MuiOutlinedInput-root': {
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      '& fieldset': {
        borderColor: theme.palette.primary.main,
      },
    },
    '&.Mui-focused': {
      transform: 'scale(1.02)',
      '& fieldset': {
        borderWidth: '2px',
      },
    },
  },
  // Required field indicator
  '& .MuiInputLabel-asterisk': {
    color: theme.palette.error.main,
    fontSize: '1.2em',
  },
}));

export default CustomTextField;
