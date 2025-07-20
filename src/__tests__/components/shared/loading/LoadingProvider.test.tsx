import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingProvider } from '@/app/components/shared/loading/LoadingProvider';
import { useLoadingContext } from '@/app/components/shared/loading/LoadingContext';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Test component that uses the loading context
const TestComponent: React.FC = () => {
  const { isLoading, setLoading, config } = useLoadingContext();

  return (
    <div>
      <div data-testid="loading-status">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="animation-type">{config.animationType}</div>
      <div data-testid="min-display-time">{config.minDisplayTime}</div>
      <button
        data-testid="manual-start"
        onClick={() => setLoading(true)}
      >
        Start Loading
      </button>
      <button
        data-testid="manual-stop"
        onClick={() => setLoading(false)}
      >
        Stop Loading
      </button>
    </div>
  );
};

describe('LoadingProvider', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/');

    // Mock window methods
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render children and provide loading context', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('animation-type')).toHaveTextContent('circular');
  });

  it('should use custom configuration when provided', () => {
    const customConfig = {
      animationType: 'dots' as const,
      minDisplayTime: 300,
      showText: true,
    };

    render(
      <LoadingProvider config={customConfig}>
        <TestComponent />
      </LoadingProvider>
    );

    expect(screen.getByTestId('animation-type')).toHaveTextContent('dots');
    expect(screen.getByTestId('min-display-time')).toHaveTextContent('300');
  });

  it('should handle manual loading state changes', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const startButton = screen.getByTestId('manual-start');
    const stopButton = screen.getByTestId('manual-stop');
    const statusElement = screen.getByTestId('loading-status');

    // Start loading manually
    act(() => {
      startButton.click();
    });
    expect(statusElement).toHaveTextContent('loading');

    // Stop loading manually
    act(() => {
      stopButton.click();
    });
    expect(statusElement).toHaveTextContent('not-loading');
  });

  it('should detect pathname changes and trigger loading', async () => {
    const { rerender } = render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const statusElement = screen.getByTestId('loading-status');
    expect(statusElement).toHaveTextContent('not-loading');

    // Simulate pathname change
    (usePathname as jest.Mock).mockReturnValue('/new-page');

    rerender(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    // Should start loading
    await waitFor(() => {
      expect(statusElement).toHaveTextContent('loading');
    });

    // Should stop loading after a short delay
    await waitFor(() => {
      expect(statusElement).toHaveTextContent('not-loading');
    }, { timeout: 200 });
  });

  it('should register browser navigation event listeners', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should validate configuration and warn on invalid config', () => {
    const invalidConfig = {
      minDisplayTime: -100, // Invalid negative value
    };

    render(
      <LoadingProvider config={invalidConfig}>
        <TestComponent />
      </LoadingProvider>
    );

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[LoadingProvider] Invalid configuration provided, using defaults'
    );
  });

  it('should handle minimum display time correctly', async () => {
    jest.useFakeTimers();

    const config = { minDisplayTime: 500 };

    render(
      <LoadingProvider config={config}>
        <TestComponent />
      </LoadingProvider>
    );

    const startButton = screen.getByTestId('manual-start');
    const stopButton = screen.getByTestId('manual-stop');
    const statusElement = screen.getByTestId('loading-status');

    // Start loading
    act(() => {
      startButton.click();
    });
    expect(statusElement).toHaveTextContent('loading');

    // Try to stop loading immediately
    act(() => {
      stopButton.click();
    });

    // Should still be loading due to minimum display time
    expect(statusElement).toHaveTextContent('loading');

    // Fast forward past minimum display time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now should be stopped
    await waitFor(() => {
      expect(statusElement).toHaveTextContent('not-loading');
    });

    jest.useRealTimers();
  });

  it('should handle maximum display time timeout', async () => {
    jest.useFakeTimers();

    const config = { maxDisplayTime: 1000 };

    render(
      <LoadingProvider config={config}>
        <TestComponent />
      </LoadingProvider>
    );

    const startButton = screen.getByTestId('manual-start');
    const statusElement = screen.getByTestId('loading-status');

    // Start loading
    act(() => {
      startButton.click();
    });
    expect(statusElement).toHaveTextContent('loading');

    // Fast forward past maximum display time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should automatically stop loading
    await waitFor(() => {
      expect(statusElement).toHaveTextContent('not-loading');
    });

    jest.useRealTimers();
  });

  it('should prevent duplicate loading states during navigation', async () => {
    const { rerender } = render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    // Simulate rapid pathname changes
    (usePathname as jest.Mock).mockReturnValue('/page1');
    rerender(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    (usePathname as jest.Mock).mockReturnValue('/page2');
    rerender(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    (usePathname as jest.Mock).mockReturnValue('/page3');
    rerender(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    // Should handle rapid changes gracefully without errors
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toBeInTheDocument();
    });
  });
});

// Cleanup mocks
afterAll(() => {
  mockConsoleLog.mockRestore();
  mockConsoleWarn.mockRestore();
});