import React from 'react';
import { render, screen, act } from '@testing-library/react';
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

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Test component that uses the useLoading hook
const TestComponent: React.FC = () => {
  const { isLoading, startLoading, stopLoading, setConfig } = useLoading();

  return (
    <div>
      <div data-testid="loading-status">{isLoading ? 'loading' : 'not-loading'}</div>
      <button data-testid="start-loading" onClick={startLoading}>
        Start Loading
      </button>
      <button data-testid="stop-loading" onClick={stopLoading}>
        Stop Loading
      </button>
      <button
        data-testid="update-config"
        onClick={() => setConfig({ animationType: 'dots' })}
      >
        Update Config
      </button>
      <button
        data-testid="invalid-config"
        onClick={() => setConfig({ minDisplayTime: -100 })}
      >
        Invalid Config
      </button>
    </div>
  );
};

describe('useLoading Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide loading state and control methods', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('start-loading')).toBeInTheDocument();
    expect(screen.getByTestId('stop-loading')).toBeInTheDocument();
    expect(screen.getByTestId('update-config')).toBeInTheDocument();
  });

  it('should start loading when startLoading is called', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const statusElement = screen.getByTestId('loading-status');

    expect(statusElement).toHaveTextContent('not-loading');

    act(() => {
      startButton.click();
    });

    expect(statusElement).toHaveTextContent('loading');
  });

  it('should stop loading when stopLoading is called', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const stopButton = screen.getByTestId('stop-loading');
    const statusElement = screen.getByTestId('loading-status');

    // Start loading first
    act(() => {
      startButton.click();
    });
    expect(statusElement).toHaveTextContent('loading');

    // Then stop loading
    act(() => {
      stopButton.click();
    });
    expect(statusElement).toHaveTextContent('not-loading');
  });

  it('should update configuration when setConfig is called with valid config', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const updateButton = screen.getByTestId('update-config');

    act(() => {
      updateButton.click();
    });

    // Should not throw error and should log the update
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[Loading System] Configuration updated',
      { animationType: 'dots' }
    );
  });

  it('should warn and ignore invalid configuration', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const invalidButton = screen.getByTestId('invalid-config');

    act(() => {
      invalidButton.click();
    });

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[useLoading] Invalid configuration provided, ignoring update'
    );
  });

  it('should log manual loading events', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const stopButton = screen.getByTestId('stop-loading');

    act(() => {
      startButton.click();
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[Loading System] Manual loading started'
    );

    act(() => {
      stopButton.click();
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[Loading System] Manual loading stopped'
    );
  });

  it('should throw error when used outside LoadingProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoadingContext must be used within a LoadingProvider');

    consoleSpy.mockRestore();
  });

  it('should maintain consistent state across multiple hook calls', () => {
    const MultipleHookComponent: React.FC = () => {
      const hook1 = useLoading();
      const hook2 = useLoading();

      return (
        <div>
          <div data-testid="status1">{hook1.isLoading ? 'loading' : 'not-loading'}</div>
          <div data-testid="status2">{hook2.isLoading ? 'loading' : 'not-loading'}</div>
          <button data-testid="start1" onClick={hook1.startLoading}>Start 1</button>
          <button data-testid="start2" onClick={hook2.startLoading}>Start 2</button>
        </div>
      );
    };

    render(
      <LoadingProvider>
        <MultipleHookComponent />
      </LoadingProvider>
    );

    const status1 = screen.getByTestId('status1');
    const status2 = screen.getByTestId('status2');
    const start1 = screen.getByTestId('start1');

    expect(status1).toHaveTextContent('not-loading');
    expect(status2).toHaveTextContent('not-loading');

    act(() => {
      start1.click();
    });

    // Both should show loading since they share the same context
    expect(status1).toHaveTextContent('loading');
    expect(status2).toHaveTextContent('loading');
  });
});

// Cleanup mocks
afterAll(() => {
  mockConsoleLog.mockRestore();
  mockConsoleWarn.mockRestore();
});