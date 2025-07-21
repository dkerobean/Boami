import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { styled } from '@mui/material/styles';
import { SxProps, Theme } from '@mui/material/styles';

const StyledSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',

  '&.primary': {
    backgroundColor: theme.palette.background.default,
  },

  '&.secondary': {
    backgroundColor: theme.palette.grey[50],
  },

  '&.dark': {
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
  },

  '&.gradient': {
    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
    color: theme.palette.primary.contrastText,
  },

  '&.full-height': {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
  },
}));

const StyledContainer = styled(Container)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
}));

interface SectionProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'dark' | 'gradient';
  fullHeight?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  py?: number;
  px?: number;
  sx?: SxProps<Theme>;
  id?: string;
  className?: string;
}

const Section: React.FC<SectionProps> = ({
  children,
  variant = 'primary',
  fullHeight = false,
  maxWidth = 'lg',
  py = 8,
  px,
  sx,
  id,
  className,
}) => {
  const sectionClasses = [
    variant,
    fullHeight && 'full-height',
    className,
  ].filter(Boolean).join(' ');

  return (
    <StyledSection
      component="section"
      className={sectionClasses}
      py={py}
      px={px}
      sx={sx}
      id={id}
    >
      <StyledContainer maxWidth={maxWidth}>
        {children}
      </StyledContainer>
    </StyledSection>
  );
};

export default Section;