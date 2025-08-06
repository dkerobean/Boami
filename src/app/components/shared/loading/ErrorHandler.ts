/**
 * Error handling and timeout management for the loading system
 */

import React from 'react';
import { LoadingConfig } from './types';
import { logLoadingEvent } from './utils';

export interface LoadingError {
  type: 'timeout' | 'navigation' | 'animation' | 'configuration' | 'unknown';
  message: string;
  timestamp: number;
  context?: any;
}

export interface ErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: LoadingError) => void;
  onTimeout?: () => void;
  onRecovery?: () => void;
}

/**
 * Error Handler class for managing loading system errors
 */
export class LoadingErrorHandler {
  private static instance: LoadingErrorHandler;
  private errors: LoadingError[] = [];
  private retryCount: number = 0;
  private options: ErrorHandlerOptions;

  private constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: ErrorHandlerOptions): LoadingErrorHandler {
    if (!LoadingErrorHandler.instance) {
      LoadingErrorHandler.instance = new LoadingErrorHandler(options);
    }
    return LoadingErrorHandler.instance;
  }

  /**
   * Handle loading timeout
   */
  public handleTimeout(config: LoadingConfig, startTime: number): void {
    const error: LoadingError = {
      type: 'timeout',
      message: `Loading timeout exceeded after ${config.maxDisplayTime}ms`,
      timestamp: Date.now(),
      context: {
        startTime,
        maxDisplayTime: config.maxDisplayTime,
        actualDuration: Date.now() - startTime,
      },
    };

    this.recordError(error);
    logLoadingEvent('Loading timeout handled', error);

    // Execute timeout callback
    if (this.options.onTimeout) {
      try {
        this.options.onTimeout();
      } catch (callbackError) {
        this.handleError('unknown', 'Timeout callback failed', { callbackError });
      }
    }

    // Attempt recovery
    this.attemptRecovery();
  }

  /**
   * Handle navigation errors
   */
  public handleNavigationError(error: any, route?: string): void {
    const loadingError: LoadingError = {
      type: 'navigation',
      message: `Navigation error: ${error.message || 'Unknown navigation error'}`,
      timestamp: Date.now(),
      context: {
        route,
        error: error.toString(),
        stack: error.stack,
      },
    };

    this.recordError(loadingError);
    logLoadingEvent('Navigation error handled', loadingError);

    // Attempt recovery
    this.attemptRecovery();
  }

  /**
   * Handle animation errors
   */
  public handleAnimationError(error: any, animationType?: string): void {
    const loadingError: LoadingError = {
      type: 'animation',
      message: `Animation error: ${error.message || 'Animation failed'}`,
      timestamp: Date.now(),
      context: {
        animationType,
        error: error.toString(),
        stack: error.stack,
      },
    };

    this.recordError(loadingError);
    logLoadingEvent('Animation error handled', loadingError);

    // Fallback to simple animation
    this.fallbackToSimpleAnimation();
  }

  /**
   * Handle configuration errors
   */
  public handleConfigurationError(error: any, config?: any): void {
    const loadingError: LoadingError = {
      type: 'configuration',
      message: `Configuration error: ${error.message || 'Invalid configuration'}`,
      timestamp: Date.now(),
      context: {
        config,
        error: error.toString(),
      },
    };

    this.recordError(loadingError);
    logLoadingEvent('Configuration error handled', loadingError);

    // Reset to default configuration
    this.resetToDefaultConfig();
  }

  /**
   * Handle generic errors
   */
  public handleError(type: LoadingError['type'], message: string, context?: any): void {
    const error: LoadingError = {
      type,
      message,
      timestamp: Date.now(),
      context,
    };

    this.recordError(error);
    logLoadingEvent('Generic error handled', error);

    // Execute error callback
    if (this.options.onError) {
      try {
        this.options.onError(error);
      } catch (callbackError) {
        console.error('[LoadingErrorHandler] Error callback failed:', callbackError);
      }
    }
  }

  /**
   * Get error history
   */
  public getErrors(): LoadingError[] {
    return [...this.errors];
  }

  /**
   * Get recent errors (last 10)
   */
  public getRecentErrors(): LoadingError[] {
    return this.errors.slice(-10);
  }

  /**
   * Clear error history
   */
  public clearErrors(): void {
    this.errors = [];
    this.retryCount = 0;
    logLoadingEvent('Error history cleared');
  }

  /**
   * Check if system is in error state
   */
  public isInErrorState(): boolean {
    const recentErrors = this.getRecentErrors();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Consider in error state if more than 3 errors in last 5 minutes
    return recentErrors.filter(error => error.timestamp > fiveMinutesAgo).length > 3;
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    recent: number;
    recoveryAttempts: number;
  } {
    const byType: Record<string, number> = {};
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType,
      recent: this.errors.filter(error => error.timestamp > fiveMinutesAgo).length,
      recoveryAttempts: this.retryCount,
    };
  }

  /**
   * Create timeout manager
   */
  public createTimeoutManager(config: LoadingConfig, startTime: number): {
    timeoutId: NodeJS.Timeout;
    cancel: () => void;
  } {
    const timeoutId = setTimeout(() => {
      this.handleTimeout(config, startTime);
    }, config.maxDisplayTime || 5000);

    return {
      timeoutId,
      cancel: () => clearTimeout(timeoutId),
    };
  }

  /**
   * Wrap async operations with error handling
   */
  public async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorType: LoadingError['type'] = 'unknown',
    context?: any
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      const errorString = error instanceof Error ? error.toString() : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      
      this.handleError(errorType, errorMessage, {
        ...context,
        error: errorString,
        stack,
      });
      return null;
    }
  }

  /**
   * Record error in history
   */
  private recordError(error: LoadingError): void {
    this.errors.push(error);

    // Keep only last 100 errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  /**
   * Attempt system recovery
   */
  private attemptRecovery(): void {
    if (this.retryCount >= (this.options.maxRetries || 3)) {
      logLoadingEvent('Max recovery attempts reached, giving up');
      return;
    }

    this.retryCount++;
    logLoadingEvent('Attempting system recovery', { attempt: this.retryCount });

    setTimeout(() => {
      try {
        // Execute recovery callback
        if (this.options.onRecovery) {
          this.options.onRecovery();
        }

        logLoadingEvent('Recovery attempt completed', { attempt: this.retryCount });
      } catch (error) {
        this.handleError('unknown', 'Recovery attempt failed', { error });
      }
    }, this.options.retryDelay || 1000);
  }

  /**
   * Fallback to simple animation when complex animations fail
   */
  private fallbackToSimpleAnimation(): void {
    logLoadingEvent('Falling back to simple animation');

    // This would typically trigger a configuration update to use circular animation
    // Implementation depends on how the system is structured
    try {
      // Emit event or call callback to switch to simple animation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('loading-fallback-animation', {
          detail: { animationType: 'circular' }
        }));
      }
    } catch (error) {
      console.error('[LoadingErrorHandler] Failed to fallback to simple animation:', error);
    }
  }

  /**
   * Reset to default configuration when config errors occur
   */
  private resetToDefaultConfig(): void {
    logLoadingEvent('Resetting to default configuration');

    try {
      // Emit event to reset configuration
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('loading-reset-config'));
      }
    } catch (error) {
      console.error('[LoadingErrorHandler] Failed to reset configuration:', error);
    }
  }
}

/**
 * Global error boundary for loading system
 */
export const withLoadingErrorBoundary = <T extends {}>(
  Component: React.ComponentType<T>
): React.ComponentType<T> => {
  const WrappedComponent = (props: T) => {
    const errorHandler = LoadingErrorHandler.getInstance();

    React.useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        if (event.filename?.includes('loading') || event.message?.includes('loading')) {
          errorHandler.handleError('unknown', event.message, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          });
        }
      };

      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, [errorHandler]);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withLoadingErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};