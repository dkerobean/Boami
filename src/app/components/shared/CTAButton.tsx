import React from 'react';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { ButtonProps } from '@mui/material/Button';
import { CTAButton as CTAButtonProps } from '@/types/landing-page';

const StyledCTAButton = styled(Button)<ButtonProps>(({ theme, variant, size }) => ({
  padding: size === 'large' ? '16px 48px' : size === 'small' ? '8px 24px' : '12px 36px',
  fontSize: size === 'large' ? '18px' : size === 'small' ? '14px' : '16px',
  fontWeight: 600,
  borderRadius: theme.spacing(1),
  textTransform: 'none',
  boxShadow: variant === 'contained' ? theme.shadows[2] : 'none',
  transition: 'all 0.3s ease-in-out',

  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: variant === 'contained' ? theme.shadows[4] : theme.shadows[1],
  },

  '&:active': {
    transform: 'translateY(0)',
  },

  // Primary variant styles
  ...(variant === 'contained' && {
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    '&:hover': {
      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
    },
  }),

  // Outlined variant styles
  ...(variant === 'outlined' && {
    borderWidth: '2px',
    '&:hover': {
      borderWidth: '2px',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
  }),
}));

interface CTAButtonComponentProps extends Omit<CTAButtonProps, 'text'> {
  children: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const CTAButton: React.FC<CTAButtonComponentProps> = ({
  children,
  href,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  onClick,
  fullWidth = false,
  disabled = false,
  loading = false,
  ...props
}) => {
  const buttonProps = {
    variant,
    color,
    size,
    fullWidth,
    disabled: disabled || loading,
    onClick,
    ...props,
  };

  if (href) {
    return (
      <StyledCTAButton
        {...buttonProps}
        component="a"
        href={href}
      >
        {loading ? 'Loading...' : children}
      </StyledCTAButton>
    );
  }

  return (
    <StyledCTAButton {...buttonProps}>
      {loading ? 'Loading...' : children}
    </StyledCTAButton>
  );
};

export default CTAButton;