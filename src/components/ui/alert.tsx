import React from 'react';
import { Alert as MuiAlert, AlertProps as MuiAlertProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export interface AlertProps extends Omit<MuiAlertProps, 'variant'> {
  variant?: 'default' | 'destructive';
}

const StyledAlert = styled(MuiAlert, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant?: 'default' | 'destructive' }>(({ theme, variant }) => ({
  ...(variant === 'destructive' && {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
    '& .MuiAlert-icon': {
      color: theme.palette.error.main,
    },
  }),
}));

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  severity,
  children, 
  ...props 
}) => {
  const muiSeverity = variant === 'destructive' ? 'error' : (severity || 'info');
  
  return (
    <StyledAlert 
      severity={muiSeverity}
      variant={variant as any}
      {...props}
    >
      {children}
    </StyledAlert>
  );
};

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return <span>{children}</span>;
};