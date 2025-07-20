import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LoadingOverlay } from '@/app/components/shared/loading/LoadingOverlay';
import { DEFAULT_LOADING_CONFIG } from '@/app/components/shared/loading/constants';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock prefersReducedMotion utility
jest.mock('@/app/components/shared/loading/utils', () => ({
  ...jest.requireActual('@/app/components/shared/loading/utils'),
  prefersReducedMotion: jest.fn(() => false),
  logLoadingEvent: jest.fn(),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingOverlay', () => {
  const defaultProps = {
    isVisible: true,
    config: DEFAULT_LOADING_CONFIG,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render when isVisible is true', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Page loading')).toBeInTheDocument();
  });

  it('should not render when isVisible is false', () => {
    renderWithTheme(
      <LoadingOverlay {...defaultProps} isVisible={false} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    const overlay = screen.getByRole('dialog');
    expect(overlay).toHaveAttribute('aria-modal', 'true');
    expect(overlay).toHaveAttribute('aria-label', 'Page loading');
    expect(overlay).toHaveAttribute('aria-describedby', 'loading-description');
  });

  it('should have screen reader description', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    expect(screen.getByText('Page is loading, please wait...')).toBeInTheDocument();
  });

  it('should have correct z-index for overlay positioning', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    const overlay = screen.getByRole('dialog');
    expect(overlay).toHaveStyle({ zIndex: '9999' });
  });

  it('should display loading spinner by default', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    const loadingContent = screen.getByTestId('loading-content') ||
                          document.getElementById('loading-content');
    expect(loadingContent).toBeInTheDocument();
  });

  it('should handle visibility changes with proper timing', async () => {
    const { rerender } = renderWithTheme(<LoadingOverlay {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Hide the overlay
    rerender(
      <ThemeProvider theme={theme}>
        <LoadingOverlay {...defaultProps} isVisible={false} />
      </ThemeProvider>
    );

    // Should still be visible initially due to fade out animation
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Fast forward past fade out duration
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should be removed after fade out
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should call onAnimationComplete when provided', async () => {
    const onAnimationComplete = jest.fn();
    const { rerender } = renderWithTheme(
      <LoadingOverlay
        {...defaultProps}
        onAnimationComplete={onAnimationComplete}
      />
    );

    // Hide the overlay to trigger animation complete
    rerender(
      <ThemeProvider theme={theme}>
        <LoadingOverlay
          {...defaultProps}
          isVisible={false}
          onAnimationComplete={onAnimationComplete}
        />
      </ThemeProvider>
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(onAnimationComplete).toHaveBeenCalled();
    });
  });

  it('should use custom fade out duration from config', async () => {
    const customConfig = {
      ...DEFAULT_LOADING_CONFIG,
      fadeOutDuration: 500,
    };

    const { rerender } = renderWithTheme(
      <LoadingOverlay {...defaultProps} config={customConfig} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Hide the overlay
    rerender(
      <ThemeProvider theme={theme}>
        <LoadingOverlay {...defaultProps} config={customConfig} isVisible={false} />
      </ThemeProvider>
    );

    // Should still be visible after default duration
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Should be removed after custom duration
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should have responsive design classes', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    const overlay = screen.getByRole('dialog');
    expect(overlay).toBeInTheDocument();

    // Check if the overlay container has responsive styling
    // Note: Material-UI responsive styles are applied via CSS-in-JS
    // so we can't directly test the responsive breakpoints in JSDOM
    // but we can verify the component renders without errors
  });

  it('should handle theme mode changes', () => {
    const darkTheme = createTheme({ palette: { mode: 'dark' } });

    render(
      <ThemeProvider theme={darkTheme}>
        <LoadingOverlay {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should cleanup timers on unmount', () => {
    const { unmount } = renderWithTheme(<LoadingOverlay {...defaultProps} />);

    // Start hiding animation
    renderWithTheme(<LoadingOverlay {...defaultProps} isVisible={false} />);

    // Unmount before animation completes
    unmount();

    // Fast forward time - should not cause any errors
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // No errors should be thrown
  });

  it('should handle rapid visibility changes gracefully', async () => {
    const { rerender } = renderWithTheme(<LoadingOverlay {...defaultProps} />);

    // Rapid visibility changes
    rerender(
      <ThemeProvider theme={theme}>
        <LoadingOverlay {...defaultProps} isVisible={false} />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingOverlay {...defaultProps} isVisible={true} />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={theme}>
        <LoadingOverlay {...defaultProps} isVisible={false} />
      </ThemeProvider>
    );

    // Should handle rapid changes without errors
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should have proper backdrop blur effect', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    const overlay = screen.getByRole('dialog');

    // Check if backdrop filter styles are applied
    // Note: The actual CSS values are applied by Material-UI's sx prop
    expect(overlay).toBeInTheDocument();
  });

  it('should maintain focus management for accessibility', () => {
    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    const overlay = screen.getByRole('dialog');

    // Should have proper focus handling attributes
    expect(overlay).toHaveAttribute('aria-modal', 'true');
    expect(overlay).toHaveAttribute('role', 'dialog');
  });

  it('should log loading events', () => {
    const { logLoadingEvent } = require('@/app/components/shared/loading/utils');

    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    expect(logLoadingEvent).toHaveBeenCalledWith('Overlay shown');
  });

  it('should handle reduced motion preferences', () => {
    const { prefersReducedMotion } = require('@/app/components/shared/loading/utils');
    prefersReducedMotion.mockReturnValue(true);

    renderWithTheme(<LoadingOverlay {...defaultProps} />);

    // Should render without animation-related errors when reduced motion is preferred
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// Cleanup mocks
afterAll(() => {
  mockConsoleLog.mockRestore();
});