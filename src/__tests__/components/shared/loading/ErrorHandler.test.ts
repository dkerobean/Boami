import { LoadingErrorHandler } from '@/app/components/shared/loading/ErrorHandler';
import { DEFAULT_LOADING_CONFIG } from '@/app/components/shared/loading/constants';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

describe('LoadingErrorHandler', () => {
  let errorHandler: LoadingErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset singleton instance
    (LoadingErrorHandler as any).instance = undefined;
    errorHandler = LoadingErrorHandler.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
    errorHandler.clearErrors();
  });

  it('should be a singleton', () => {
    const instance1 = LoadingErrorHandler.getInstance();
    const instance2 = LoadingErrorHandler.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should handle timeout errors', () => {
    const config = { ...DEFAULT_LOADING_CONFIG, maxDisplayTime: 1000 };
    const startTime = Date.now() - 1500;

    errorHandler.handleTimeout(config, startTime);

    const errors = errorHandler.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('timeout');
    expect(errors[0].message).toContain('Loading timeout exceeded');
  });

  it('should handle navigation errors', () => {
    const navigationError = new Error('Navigation failed');
    const route = '/test-route';

    errorHandler.handleNavigationError(navigationError, route);

    const errors = errorHandler.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('navigation');
    expect(errors[0].context.route).toBe(route);
  });

  it('should handle animation errors', () => {
    const animationError = new Error('Animation failed');
    const animationType = 'dots';

    errorHandler.handleAnimationError(animationError, animationType);

    const errors = errorHandler.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('animation');
    expect(errors[0].context.animationType).toBe(animationType);
  });

  it('should handle configuration errors', () => {
    const configError = new Error('Invalid configuration');
    const config = { invalidField: 'invalid' };

    errorHandler.handleConfigurationError(configError, config);

    const errors = errorHandler.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('configuration');
    expect(errors[0].context.config).toBe(config);
  });

  it('should handle generic errors', () => {
    const message = 'Generic error occurred';
    const context = { additional: 'info' };

    errorHandler.handleError('unknown', message, context);

    const errors = errorHandler.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('unknown');
    expect(errors[0].message).toBe(message);
    expect(errors[0].context).toBe(context);
  });

  it('should execute error callback when provided', () => {
    const onError = jest.fn();
    const handlerWithCallback = LoadingErrorHandler.getInstance({ onError });

    handlerWithCallback.handleError('unknown', 'Test error');

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'unknown',
        message: 'Test error',
      })
    );
  });

  it('should execute timeout callback when provided', () => {
    const onTimeout = jest.fn();
    const handlerWithCallback = LoadingErrorHandler.getInstance({ onTimeout });

    const config = { ...DEFAULT_LOADING_CONFIG, maxDisplayTime: 1000 };
    handlerWithCallback.handleTimeout(config, Date.now() - 1500);

    expect(onTimeout).toHaveBeenCalled();
  });

  it('should get recent errors correctly', () => {
    // Add multiple errors
    for (let i = 0; i < 15; i++) {
      errorHandler.handleError('unknown', `Error ${i}`);
    }

    const recentErrors = errorHandler.getRecentErrors();
    expect(recentErrors).toHaveLength(10); // Should return last 10
    expect(recentErrors[9].message).toBe('Error 14'); // Last error
  });

  it('should clear errors', () => {
    errorHandler.handleError('unknown', 'Test error');
    expect(errorHandler.getErrors()).toHaveLength(1);

    errorHandler.clearErrors();
    expect(errorHandler.getErrors()).toHaveLength(0);
  });

  it('should detect error state correctly', () => {
    expect(errorHandler.isInErrorState()).toBe(false);

    // Add multiple recent errors
    for (let i = 0; i < 5; i++) {
      errorHandler.handleError('unknown', `Error ${i}`);
    }

    expect(errorHandler.isInErrorState()).toBe(true);
  });

  it('should provide error statistics', () => {
    errorHandler.handleError('timeout', 'Timeout 1');
    errorHandler.handleError('timeout', 'Timeout 2');
    errorHandler.handleError('navigation', 'Navigation error');

    const stats = errorHandler.getErrorStats();
    expect(stats.total).toBe(3);
    expect(stats.byType.timeout).toBe(2);
    expect(stats.byType.navigation).toBe(1);
    expect(stats.recent).toBe(3);
  });

  it('should create timeout manager', () => {
    const config = { ...DEFAULT_LOADING_CONFIG, maxDisplayTime: 1000 };
    const startTime = Date.now();

    const timeoutManager = errorHandler.createTimeoutManager(config, startTime);

    expect(timeoutManager.timeoutId).toBeDefined();
    expect(typeof timeoutManager.cancel).toBe('function');

    // Cancel timeout
    timeoutManager.cancel();
  });

  it('should handle async operations with error handling', async () => {
    const successOperation = async () => 'success';
    const failingOperation = async () => {
      throw new Error('Operation failed');
    };

    const result1 = await errorHandler.withErrorHandling(successOperation);
    expect(result1).toBe('success');

    const result2 = await errorHandler.withErrorHandling(failingOperation);
    expect(result2).toBeNull();
    expect(errorHandler.getErrors()).toHaveLength(1);
  });

  it('should limit error history to prevent memory issues', () => {
    // Add more than 100 errors
    for (let i = 0; i < 150; i++) {
      errorHandler.handleError('unknown', `Error ${i}`);
    }

    const errors = errorHandler.getErrors();
    expect(errors.length).toBeLessThanOrEqual(100);

    // Should keep the most recent errors
    expect(errors[errors.length - 1].message).toBe('Error 149');
  });

  it('should attempt recovery with retry logic', () => {
    const onRecovery = jest.fn();
    const handlerWithRecovery = LoadingErrorHandler.getInstance({
      onRecovery,
      maxRetries: 2,
      retryDelay: 100
    });

    const config = { ...DEFAULT_LOADING_CONFIG, maxDisplayTime: 1000 };
    handlerWithRecovery.handleTimeout(config, Date.now() - 1500);

    // Fast forward to trigger recovery
    jest.advanceTimersByTime(100);

    expect(onRecovery).toHaveBeenCalled();
  });

  it('should stop recovery attempts after max retries', () => {
    const onRecovery = jest.fn();
    const handlerWithRecovery = LoadingErrorHandler.getInstance({
      onRecovery,
      maxRetries: 1,
      retryDelay: 100
    });

    // Trigger multiple errors to exceed retry limit
    const config = { ...DEFAULT_LOADING_CONFIG, maxDisplayTime: 1000 };
    handlerWithRecovery.handleTimeout(config, Date.now() - 1500);
    handlerWithRecovery.handleTimeout(config, Date.now() - 1500);

    jest.advanceTimersByTime(200);

    // Should only attempt recovery once due to maxRetries: 1
    expect(onRecovery).toHaveBeenCalledTimes(1);
  });

  it('should fallback to simple animation on animation errors', () => {
    const animationError = new Error('Complex animation failed');
    errorHandler.handleAnimationError(animationError, 'complex');

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'loading-fallback-animation',
        detail: { animationType: 'circular' }
      })
    );
  });

  it('should reset configuration on configuration errors', () => {
    const configError = new Error('Invalid config');
    errorHandler.handleConfigurationError(configError);

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'loading-reset-config'
      })
    );
  });

  it('should handle callback errors gracefully', () => {
    const faultyCallback = jest.fn(() => {
      throw new Error('Callback error');
    });

    const handlerWithFaultyCallback = LoadingErrorHandler.getInstance({
      onError: faultyCallback
    });

    // Should not throw error
    handlerWithFaultyCallback.handleError('unknown', 'Test error');

    expect(faultyCallback).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error callback failed')
    );
  });

  it('should handle recovery callback errors gracefully', () => {
    const faultyRecovery = jest.fn(() => {
      throw new Error('Recovery error');
    });

    const handlerWithFaultyRecovery = LoadingErrorHandler.getInstance({
      onRecovery: faultyRecovery,
      retryDelay: 100
    });

    const config = { ...DEFAULT_LOADING_CONFIG, maxDisplayTime: 1000 };
    handlerWithFaultyRecovery.handleTimeout(config, Date.now() - 1500);

    jest.advanceTimersByTime(100);

    expect(faultyRecovery).toHaveBeenCalled();
    // Should handle the recovery error
    const errors = handlerWithFaultyRecovery.getErrors();
    expect(errors.some(error => error.message.includes('Recovery attempt failed'))).toBe(true);
  });

  it('should handle window event dispatch errors gracefully', () => {
    mockDispatchEvent.mockImplementation(() => {
      throw new Error('Event dispatch failed');
    });

    const animationError = new Error('Animation failed');

    // Should not throw error
    expect(() => {
      errorHandler.handleAnimationError(animationError, 'dots');
    }).not.toThrow();

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fallback to simple animation')
    );
  });
});

// Cleanup mocks
afterAll(() => {
  mockConsoleLog.mockRestore();
  mockConsoleError.mockRestore();
});