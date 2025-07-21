import React from 'react';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { TypographyProps } from '@mui/material/Typography';

// Hero Headline Component
const HeroHeadline = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
  marginBottom: theme.spacing(2),

  [theme.breakpoints.down('md')]: {
    textAlign: 'center',
  },
}));

// Section Headline Component
const SectionHeadline = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
  marginBottom: theme.spacing(2),
  textAlign: 'center',
}));

// Feature Title Component
const FeatureTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
  lineHeight: 1.3,
  marginBottom: theme.spacing(1),
}));

// Body Text Large Component
const BodyLarge = styled(Typography)(({ theme }) => ({
  fontSize: '1.125rem',
  lineHeight: 1.6,
  fontWeight: 400,
  color: theme.palette.text.secondary,

  [theme.breakpoints.down('md')]: {
    fontSize: '1rem',
  },
}));

// Caption Text Component
const CaptionText = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  lineHeight: 1.4,
  fontWeight: 400,
  color: theme.palette.text.secondary,
}));

// Overline Text Component (for labels)
const OverlineText = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  lineHeight: 1.4,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(1),
}));

// Gradient Text Component
const GradientText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  fontWeight: 'inherit',
}));

// Export individual components
export {
  HeroHeadline,
  SectionHeadline,
  FeatureTitle,
  BodyLarge,
  CaptionText,
  OverlineText,
  GradientText,
};

// Main Typography component with variants
interface CustomTypographyProps extends TypographyProps {
  variant?:
    | 'heroHeadline'
    | 'sectionHeadline'
    | 'featureTitle'
    | 'bodyLarge'
    | 'caption'
    | 'overline'
    | 'gradient'
    | TypographyProps['variant'];
}

const CustomTypography: React.FC<CustomTypographyProps> = ({
  variant,
  children,
  ...props
}) => {
  switch (variant) {
    case 'heroHeadline':
      return <HeroHeadline {...props}>{children}</HeroHeadline>;
    case 'sectionHeadline':
      return <SectionHeadline {...props}>{children}</SectionHeadline>;
    case 'featureTitle':
      return <FeatureTitle {...props}>{children}</FeatureTitle>;
    case 'bodyLarge':
      return <BodyLarge {...props}>{children}</BodyLarge>;
    case 'caption':
      return <CaptionText {...props}>{children}</CaptionText>;
    case 'overline':
      return <OverlineText {...props}>{children}</OverlineText>;
    case 'gradient':
      return <GradientText {...props}>{children}</GradientText>;
    default:
      return <Typography variant={variant} {...props}>{children}</Typography>;
  }
};

export default CustomTypography;