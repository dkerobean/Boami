import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { styled } from '@mui/material/styles';
import { SxProps, Theme } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s ease-in-out',

  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    borderColor: theme.palette.primary.light,
  },

  '&.featured': {
    border: `2px solid ${theme.palette.primary.main}`,
    position: 'relative',
    transform: 'scale(1.02)',
    zIndex: 1,

    '&:hover': {
      transform: 'scale(1.02) translateY(-4px)',
    },
  },

  '&.compact': {
    padding: theme.spacing(2),
  },

  '&.elevated': {
    boxShadow: theme.shadows[4],
  },
}));

const StyledCardContent = styled(CardContent)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(3),

  '&:last-child': {
    paddingBottom: theme.spacing(3),
  },

  '&.compact': {
    padding: theme.spacing(2),

    '&:last-child': {
      paddingBottom: theme.spacing(2),
    },
  },
}));

interface ResponsiveCardProps {
  children: React.ReactNode;
  featured?: boolean;
  compact?: boolean;
  elevated?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
  onClick?: () => void;
}

const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  featured = false,
  compact = false,
  elevated = false,
  sx,
  className,
  onClick,
}) => {
  const cardClasses = [
    featured && 'featured',
    compact && 'compact',
    elevated && 'elevated',
    className,
  ].filter(Boolean).join(' ');

  return (
    <StyledCard
      className={cardClasses}
      sx={sx}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <StyledCardContent className={compact ? 'compact' : ''}>
        {children}
      </StyledCardContent>
    </StyledCard>
  );
};

export default ResponsiveCard;