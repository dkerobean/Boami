import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LoadingContextProvider, useLoadingContext } from '@/app/components/shared/loading/LoadingContext';
import { DEFAULT_LOADING_CONFIG } from '@/app/components/shared/loading/constants';

// Test component that uses the loading context
const TestComponent: React.FC = () => {
  const { isLoading, setLoading, config, updateConfig } = useLoadingContext();

  return (
    <div>
      <div data-testid="loading-status">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="animation-type">{config.animationType}</div>
      <button
        data-testid="start-loading"
        onClick={() => setLoading(true)}
      >
        Start Loading
      </button>
      <button
        data-testid="stop-loading"
        onClick={() => setLoading(false)}
      >
        Stop Loading
      </button>
      <button
        data-testid="update-config"
        onClick={() => updateConfig({ animationType: 'dots' })}
      >
        Update Config
      </button>
    </div>
  );
};

describe('LoadingContext', () => {
  it('should provide default loading state', () => {
    render(
      <LoadingContextProvider>
        <TestComponent />
      </LoadingContextProvider>
    );

    expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('animation-type')).toHaveTextContent(DEFAULT_LOADING_CONFIG.animationType);
  });

  it('should update loading state when setLoading is called', () => {
    render(
      <LoadingContextProvider>
        <TestComponent />
      </LoadingContextProvider>
    );

    const startButton = screen.getByTestId('start-loading');
    const stopButton = screen.getByTestId('stop-loading');
    const statusElement = screen.getByTestId('loading-status');

    // Start loading
    act(() => {
      startButton.click();
    });
    expect(statusElement).toHaveTextContent('loading');

    // Stop loading
    act(() => {
      stopButton.click();
    });
    expect(statusElement).toHaveTextContent('not-loading');
  });

  it('should update configuration when updateConfig is called', () => {
    render(
      <LoadingContextProvider>
        <TestComponent />
      </LoadingContextProvider>
    );

    const updateButton = screen.getByTestId('update-config');
    const animationTypeElement = screen.getByTestId('animation-type');

    expect(animationTypeElement).toHaveTextContent('circular');

    act(() => {
      updateButton.click();
    });

    expect(animationTypeElement).toHaveTextContent('dots');
  });

  it('should merge initial config with defaults', () => {
    const customConfig = { animationType: 'linear' as const, showText: true };

    render(
      <LoadingContextProvider config={customConfig}>
        <TestComponent />
      </LoadingContextProvider>
    );

    expect(screen.getByTestId('animation-type')).toHaveTextContent('linear');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoadingContext must be used within a LoadingProvider');

    consoleSpy.mockRestore();
  });
});