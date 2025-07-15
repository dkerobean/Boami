'use client'
import React from 'react';
import { styled } from '@mui/material/styles';
import { Typography } from '@mui/material';

const CustomFormLabel = styled((props: any) => (
  <Typography
    variant="subtitle1"
    fontWeight={600}
    {...props}
    component="label"
    htmlFor={props.htmlFor}
  />
))(({ theme, error }) => ({
  marginBottom: '5px',
  marginTop: '25px',
  display: 'block',
  transition: 'color 0.2s ease-in-out',
  // Enhanced styling for error state
  ...(error && {
    color: theme.palette.error.main,
    fontWeight: 700,
  }),
  // Enhanced styling for required fields
  '& .required-asterisk': {
    color: theme.palette.error.main,
    fontSize: '1.1em',
    marginLeft: '2px',
    fontWeight: 'bold',
  },
}));

export default CustomFormLabel;
