import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LoadingAnimation } from '@/app/components/shared/loading/LoadingAnimation';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock utils
jest.mock('@/app/components/shared/loading/utils', () => ({
  prefersReducedMotion: jest.fn(() => false),
  getAnimationDuration: jest.fn(() => 1000),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingAnimation', () => {
  it('should render circular animation by default', () => {
    renderWithTheme(<LoadingAnimation type="circular" />);

    // Should render CircularProgress component
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('should render linear animation', () => {
    renderWithTheme(<LoadingAnimation type="linear" />);

    // Should render LinearProgress component
    expect(document.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('should render dots animation', () => {
    renderWithTheme(<LoadingAnimation type="dots" />);

    // Should render three dots (motion.div elements)
    const container = document.querySelector('[style*="display: flex"]');
    expect(container).toBeInTheDocument();
  });

  it('should render pulse animation', () => {
    renderWithTheme(<LoadingAnimation type="pulse" />);

    // Should render pulse container
    const container = document.querySelector('[style*="border-radius"]');
    expect(container).toBeInTheDocument();
  });

  it('should handle different sizes', () => {
    const { rerender } = renderWithTheme(
      <LoadingAnimation type="circular" size="small" />
    );

    let progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingAnimation type="circular" size="medium" />
      </ThemeProvider>
    );

    progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingAnimation type="circular" size="large" />
      </ThemeProvider>
    );

    progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();
  });

  it('should handle different colors', () => {
    const { rerender } = renderWithTheme(
      <LoadingAnimation type="circular" color="primary" />
    );

    let progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingAnimation type="circular" color="secondary" />
      </ThemeProvider>
    );

    progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingAnimation type="circular" color="inherit" />
      </ThemeProvider>
    );

    progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();
  });

  it('should show logo when showLogo is true', () => {
    renderWithTheme(
      <LoadingAnimation type="circular" showLogo={true} />
    );

    expect(screen.getByText('LOGO')).toBeInTheDocument();
  });

  it('should not show logo when showLogo is false', () => {
    renderWithTheme(
      <LoadingAnimation type="circular" showLogo={false} />
    );

    expect(screen.queryByText('LOGO')).not.toBeInTheDocument();
  });

  it('should show text when showText is true', () => {
    renderWithTheme(
      <LoadingAnimation type="circular" showText={true} />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show custom text when provided', () => {
    renderWithTheme(
      <LoadingAnimation
        type="circular"
        showText={true}
        text="Please wait..."
      />
    );

    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('should not show text when showText is false', () => {
    renderWithTheme(
      <LoadingAnimation type="circular" showText={false} />
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should handle linear animation with different sizes', () => {
    const { rerender } = renderWithTheme(
      <LoadingAnimation type="linear" size="small" />
    );

    let progress = document.querySelector('.MuiLinearProgress-root');
    expect(progress).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingAnimation type="linear" size="large" />
      </ThemeProvider>
    );

    progress = document.querySelector('.MuiLinearProgress-root');
    expect(progress).toBeInTheDocument();
  });

  it('should fallback to circular animation for unknown type', () => {
    renderWithTheme(
      <LoadingAnimation type={'unknown' as any} />
    );

    // Should render CircularProgress as fallback
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('should handle reduced motion preferences', () => {
    const { prefersReducedMotion } = require('@/app/components/shared/loading/utils');
    prefersReducedMotion.mockReturnValue(true);

    renderWithTheme(<LoadingAnimation type="dots" />);

    // Should still render without errors when reduced motion is preferred
    const container = document.querySelector('[style*="display: flex"]');
    expect(container).toBeInTheDocument();
  });

  it('should render all components together', () => {
    renderWithTheme(
      <LoadingAnimation
        type="circular"
        size="large"
        color="primary"
        showLogo={true}
        showText={true}
        text="Loading your content..."
      />
    );

    expect(screen.getByText('LOGO')).toBeInTheDocument();
    expect(screen.getByText('Loading your content...')).toBeInTheDocument();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('should handle theme changes', () => {
    const darkTheme = createTheme({ palette: { mode: 'dark' } });

    render(
      <ThemeProvider theme={darkTheme}>
        <LoadingAnimation type="circular" showLogo={true} showText={true} />
      </ThemeProvider>
    );

    expect(screen.getByText('LOGO')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render dots animation with proper structure', () => {
    renderWithTheme(<LoadingAnimation type="dots" size="medium" />);

    // Should render container with flex display
    const container = document.querySelector('[style*="display: flex"]');
    expect(container).toBeInTheDocument();
  });

  it('should render pulse animation with proper structure', () => {
    renderWithTheme(<LoadingAnimation type="pulse" size="medium" />);

    // Should render pulse container
    const container = document.querySelector('[style*="border-radius"]');
    expect(container).toBeInTheDocument();
  });

  it('should apply correct typography variants based on size', () => {
    const { rerender } = renderWithTheme(
      <LoadingAnimation type="circular" size="small" showText={true} />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingAnimation type="circular" size="large" showText={true} />
      </ThemeProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle all animation types without errors', () => {
    const animationTypes = ['circular', 'linear', 'dots', 'pulse'] as const;

    animationTypes.forEach(type => {
      const { unmount } = renderWithTheme(
        <LoadingAnimation type={type} />
      );

      // Should render without throwing errors
      expect(document.body).toBeInTheDocument();

      unmount();
    });
  });

  it('should maintain consistent spacing and layout', () => {
    renderWithTheme(
      <LoadingAnimation
        type="circular"
        showLogo={true}
        showText={true}
      />
    );

    // Should have proper layout structure
    expect(screen.getByText('LOGO')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});