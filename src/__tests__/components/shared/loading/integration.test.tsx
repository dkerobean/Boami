import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LoadingProvider } from '@/app/components/shared/loading/LoadingProvider';
import { useLoading } from '@/hooks/useLoading';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

const theme = createTheme();

// Test component that uses the loading system
const TestApp: React.FC = () => {
  const { isLoading, startLoading, stopLoading } = useLoading();

  return (
    <div>
      <div data-testid="app-content">
        <h1>Test Application</h1>
        <p>Loading status: {isLoading ? 'loading' : 'ready'}</p>
        <button data-testid="start-loading" onClick={startLoading}>
          Start Loading
        </button>
        <button data-testid="stop-loading" onClick={stopLoading}>
          Stop Loading
        </button>
      </div>
    </div>
  );
};

describe('Loading System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should integrate LoadingProvider with LoadingOverlay', () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    // App content should be visible
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByText('Loading status: ready')).toBeInTheDocument();

    // Loading overlay should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show overlay when loading starts', async () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');

    // Start loading
    act(() => {
      startButton.click();
    });

    // Loading status should update
    expect(screen.getByText('Loading status: loading')).toBeInTheDocument();

    // Loading overlay should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Should have accessibility attributes
    expect(screen.getByLabelText('Page loading')).toBeInTheDocument();
  });

  it('should hide overlay when loading stops', async () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const stopButton = screen.getByTestId('stop-loading');

    // Start loading
    act(() => {
      startButton.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Stop loading
    act(() => {
      stopButton.click();
    });

    // Loading status should update
    expect(screen.getByText('Loading status: ready')).toBeInTheDocument();

    // Overlay should start hiding (but may still be visible due to animation)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Overlay should be completely hidden
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should handle custom configuration', async () => {
    const customConfig = {
      animationType: 'dots' as const,
      showText: true,
      customText: 'Please wait...',
      minDisplayTime: 300,
    };

    render(
      <ThemeProvider theme={theme}>
        <LoadingProvider config={customConfig}>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const stopButton = screen.getByTestId('stop-loading');

    // Start loading
    act(() => {
      startButton.click();
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Try to stop loading immediately
    act(() => {
      stopButton.click();
    });

    // Should still be loading due to minimum display time
    expect(screen.getByText('Loading status: loading')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Fast forward past minimum display time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should now be stopped
    await waitFor(() => {
      expect(screen.getByText('Loading status: ready')).toBeInTheDocument();
    });
  });

  it('should maintain app functionality while loading', async () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');

    // Start loading
    act(() => {
      startButton.click();
    });

    // App content should still be accessible
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByText('Test Application')).toBeInTheDocument();

    // Loading overlay should be on top
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should handle multiple rapid loading state changes', async () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const stopButton = screen.getByTestId('stop-loading');

    // Rapid state changes
    act(() => {
      startButton.click();
    });
    act(() => {
      stopButton.click();
    });
    act(() => {
      startButton.click();
    });
    act(() => {
      stopButton.click();
    });

    // Should handle rapid changes gracefully
    expect(screen.getByTestId('app-content')).toBeInTheDocument();

    // Final state should be not loading
    expect(screen.getByText('Loading status: ready')).toBeInTheDocument();
  });

  it('should work with different theme modes', () => {
    const darkTheme = createTheme({ palette: { mode: 'dark' } });

    render(
      <ThemeProvider theme={darkTheme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');

    act(() => {
      startButton.click();
    });

    // Should work with dark theme
    expect(screen.getByText('Loading status: loading')).toBeInTheDocument();
  });

  it('should cleanup properly on unmount', () => {
    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <LoadingProvider>
          <TestApp />
        </LoadingProvider>
      </ThemeProvider>
    );

    const startButton = screen.getByTestId('start-loading');

    act(() => {
      startButton.click();
    });

    // Unmount while loading
    unmount();

    // Should not cause any errors
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });
});

// Cleanup mocks
afterAll(() => {
  mockConsoleLog.mockRestore();
});