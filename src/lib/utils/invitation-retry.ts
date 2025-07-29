interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

export class InvitationRetryManager {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true
  };

  /**
   * Retry an invitation operation with exponential backoff
   */
  static async retryInvitationOperation<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: Error;
    let attempts = 0;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attempts
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt === finalConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, finalConfig);

        console.warn(`Invitation operation failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}), retrying in ${delay}ms:`, lastError.message);

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts
    };
  }

  /**
   * Retry multiple invitation operations in parallel with individual retry logic
   */
  static async retryBatchInvitations<T>(
    operations: Array<{
      id: string;
      operation: () => Promise<T>;
      email?: string;
    }>,
    config: Partial<RetryConfig> = {}
  ): Promise<{
    successful: Array<{ id: string; data: T; attempts: number }>;
    failed: Array<{ id: string; error: Error; attempts: number; email?: string }>;
  }> {
    const results = await Promise.allSettled(
      operations.map(async ({ id, operation, email }) => {
        const result = await this.retryInvitationOperation(operation, config);
        return { id, result, email };
      })
    );

    const successful: Array<{ id: string; data: T; attempts: number }> = [];
    const failed: Array<{ id: string; error: Error; attempts: number; email?: string }> = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { id, result: opResult, email } = result.value;
        if (opResult.success) {
          successful.push({
            id,
            data: opResult.data!,
            attempts: opResult.attempts
          });
        } else {
          failed.push({
            id,
            error: opResult.error!,
            attempts: opResult.attempts,
            email
          });
        }
      } else {
        // This shouldn't happen with our current implementation
        failed.push({
          id: 'unknown',
          error: new Error('Unexpected error in batch processing'),
          attempts: 1
        });
      }
    });

    return { successful, failed };
  }

  /**
   * Retry invitation with circuit breaker pattern
   */
  static async retryWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    // Check if circuit breaker is open
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      return {
        success: false,
        error: new Error('Circuit breaker is open - too many recent failures'),
        attempts: 0
      };
    }

    const result = await this.retryInvitationOperation(operation, config);

    // Update circuit breaker state
    if (result.success) {
      this.recordCircuitBreakerSuccess(circuitBreakerKey);
    } else {
      this.recordCircuitBreakerFailure(circuitBreakerKey);
    }

    return result;
  }

  /**
   * Calculate delay for retry attempt
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    if (!config.exponentialBackoff) {
      return config.baseDelay;
    }

    const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter

    return Math.min(jitteredDelay, config.maxDelay);
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /service unavailable/i,
      /rate limit/i,
      /too many requests/i,
      /internal server error/i,
      /502/,
      /503/,
      /504/
    ];

    const nonRetryablePatterns = [
      /invalid email/i,
      /user already exists/i,
      /role not found/i,
      /permission denied/i,
      /unauthorized/i,
      /forbidden/i,
      /bad request/i,
      /validation/i
    ];

    const errorMessage = error.message;

    // Check non-retryable patterns first
    if (nonRetryablePatterns.some(pattern => pattern.test(errorMessage))) {
      return false;
    }

    // Check retryable patterns
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker implementation
  private static circuitBreakerState: Map<string, {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
  }> = new Map();

  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  private static isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakerState.get(key);
    if (!state) return false;

    if (state.isOpen) {
      // Check if timeout has passed
      if (Date.now() - state.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
        state.isOpen = false;
        state.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private static recordCircuitBreakerSuccess(key: string): void {
    const state = this.circuitBreakerState.get(key);
    if (state) {
      state.failures = 0;
      state.isOpen = false;
    }
  }

  private static recordCircuitBreakerFailure(key: string): void {
    const state = this.circuitBreakerState.get(key) || {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false
    };

    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
    }

    this.circuitBreakerState.set(key, state);
  }

  /**
   * Get retry statistics for monitoring
   */
  static getRetryStats(): {
    circuitBreakers: Array<{
      key: string;
      failures: number;
      isOpen: boolean;
      lastFailureTime: number;
    }>;
  } {
    const circuitBreakers = Array.from(this.circuitBreakerState.entries()).map(
      ([key, state]) => ({
        key,
        failures: state.failures,
        isOpen: state.isOpen,
        lastFailureTime: state.lastFailureTime
      })
    );

    return { circuitBreakers };
  }

  /**
   * Reset circuit breaker state (for testing or manual intervention)
   */
  static resetCircuitBreaker(key: string): void {
    this.circuitBreakerState.delete(key);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAllCircuitBreakers(): void {
    this.circuitBreakerState.clear();
  }
}