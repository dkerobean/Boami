import { RETRY_CONFIG } from '../config/flutterwave';

/**
 * Webhook retry mechanism with exponential backoff
 * Handles failed webhook processing with intelligent retry logic
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // Add 50% jitter
  return Math.min(delayWithJitter, options.maxDelay);
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
function defaultRetryCondition(error: any): boolean {
  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Retry on 5xx server errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Don't retry on client errors (4xx) or signature verification failures
  if (error.message?.includes('signature') || error.message?.includes('authentication')) {
    return false;
  }

  // Retry on other errors by default
  return true;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config: Required<RetryOptions> = {
    maxRetries: options.maxRetries ?? RETRY_CONFIG.MAX_RETRIES,
    initialDelay: options.initialDelay ?? RETRY_CONFIG.INITIAL_DELAY,
    maxDelay: options.maxDelay ?? RETRY_CONFIG.MAX_DELAY,
    backoffFactor: options.backoffFactor ?? RETRY_CONFIG.BACKOFF_FACTOR,
    retryCondition: options.retryCondition ?? defaultRetryCondition
  };

  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        result,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt > config.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!config.retryCondition(error)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);
      console.log(`Webhook retry attempt ${attempt}/${config.maxRetries} failed, retrying in ${delay}ms:`, error.message);

      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxRetries + 1,
    totalTime: Date.now() - startTime
  };
}

/**
 * Webhook processing queue for handling failed webhooks
 */
export class WebhookRetryQueue {
  private queue: Array<{
    id: string;
    payload: string;
    signature: string;
    attempts: number;
    nextRetry: Date;
    maxRetries: number;
  }> = [];

  private processing = false;

  /**
   * Add failed webhook to retry queue
   */
  addToQueue(
    id: string,
    payload: string,
    signature: string,
    maxRetries: number = RETRY_CONFIG.MAX_RETRIES
  ): void {
    const existingIndex = this.queue.findIndex(item => item.id === id);

    if (existingIndex >= 0) {
      // Update existing item
      this.queue[existingIndex].attempts++;
      this.queue[existingIndex].nextRetry = new Date(Date.now() + RETRY_CONFIG.INITIAL_DELAY);
    } else {
      // Add new item
      this.queue.push({
        id,
        payload,
        signature,
        attempts: 1,
        nextRetry: new Date(Date.now() + RETRY_CONFIG.INITIAL_DELAY),
        maxRetries
      });
    }

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process retry queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const now = new Date();
      const readyItems = this.queue.filter(item => item.nextRetry <= now);

      if (readyItems.length === 0) {
        // Wait for next item to be ready
        const nextItem = this.queue.reduce((earliest, item) =>
          item.nextRetry < earliest.nextRetry ? item : earliest
        );

        const waitTime = nextItem.nextRetry.getTime() - now.getTime();
        await sleep(Math.max(waitTime, 1000)); // Wait at least 1 second
        continue;
      }

      // Process ready items
      for (const item of readyItems) {
        try {
          const PaymentService = (await import('../services/PaymentService')).PaymentService;
          const paymentService = new PaymentService();

          await paymentService.processWebhook(item.payload, item.signature);

          // Success - remove from queue
          this.removeFromQueue(item.id);
          console.log(`Webhook retry successful for ${item.id} after ${item.attempts} attempts`);

        } catch (error: any) {
          console.error(`Webhook retry failed for ${item.id} (attempt ${item.attempts}):`, error.message);

          if (item.attempts >= item.maxRetries) {
            // Max retries reached - remove from queue and log
            this.removeFromQueue(item.id);
            console.error(`Webhook ${item.id} failed permanently after ${item.attempts} attempts`);

            // In production, send to dead letter queue or alert system
            this.handlePermanentFailure(item, error);
          } else {
            // Schedule next retry
            const delay = calculateDelay(item.attempts, {
              maxRetries: item.maxRetries,
              initialDelay: RETRY_CONFIG.INITIAL_DELAY,
              maxDelay: RETRY_CONFIG.MAX_DELAY,
              backoffFactor: RETRY_CONFIG.BACKOFF_FACTOR,
              retryCondition: defaultRetryCondition
            });

            item.nextRetry = new Date(Date.now() + delay);
          }
        }
      }

      // Small delay between processing batches
      await sleep(100);
    }

    this.processing = false;
  }

  /**
   * Remove item from queue
   */
  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
  }

  /**
   * Handle permanent webhook failure
   */
  private handlePermanentFailure(item: any, error: Error): void {
    // Log to monitoring system
    console.error('Permanent webhook failure:', {
      webhookId: item.id,
      attempts: item.attempts,
      error: error.message,
      payload: item.payload
    });

    // In production:
    // 1. Send to dead letter queue
    // 2. Alert operations team
    // 3. Store in database for manual investigation
    // 4. Send notification to relevant stakeholders
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    processing: boolean;
    nextRetry?: Date;
  } {
    const nextRetry = this.queue.length > 0
      ? this.queue.reduce((earliest, item) =>
          item.nextRetry < earliest.nextRetry ? item : earliest
        ).nextRetry
      : undefined;

    return {
      queueLength: this.queue.length,
      processing: this.processing,
      nextRetry
    };
  }

  /**
   * Clear queue (for testing or emergency)
   */
  clearQueue(): void {
    this.queue = [];
    this.processing = false;
  }
}

// Export singleton instance
export const webhookRetryQueue = new WebhookRetryQueue();

/**
 * Webhook health check utility
 */
export class WebhookHealthChecker {
  private healthStatus = {
    lastSuccessfulWebhook: null as Date | null,
    consecutiveFailures: 0,
    totalProcessed: 0,
    totalFailed: 0
  };

  /**
   * Record successful webhook processing
   */
  recordSuccess(): void {
    this.healthStatus.lastSuccessfulWebhook = new Date();
    this.healthStatus.consecutiveFailures = 0;
    this.healthStatus.totalProcessed++;
  }

  /**
   * Record failed webhook processing
   */
  recordFailure(): void {
    this.healthStatus.consecutiveFailures++;
    this.healthStatus.totalFailed++;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    lastSuccessfulWebhook: Date | null;
    consecutiveFailures: number;
    successRate: number;
    status: string;
  } {
    const total = this.healthStatus.totalProcessed + this.healthStatus.totalFailed;
    const successRate = total > 0 ? (this.healthStatus.totalProcessed / total) * 100 : 100;

    const isHealthy = this.healthStatus.consecutiveFailures < 5 && successRate > 90;

    let status = 'healthy';
    if (this.healthStatus.consecutiveFailures >= 10) {
      status = 'critical';
    } else if (this.healthStatus.consecutiveFailures >= 5 || successRate < 90) {
      status = 'degraded';
    }

    return {
      isHealthy,
      lastSuccessfulWebhook: this.healthStatus.lastSuccessfulWebhook,
      consecutiveFailures: this.healthStatus.consecutiveFailures,
      successRate,
      status
    };
  }

  /**
   * Reset health status
   */
  reset(): void {
    this.healthStatus = {
      lastSuccessfulWebhook: null,
      consecutiveFailures: 0,
      totalProcessed: 0,
      totalFailed: 0
    };
  }
}

// Export singleton instance
export const webhookHealthChecker = new WebhookHealthChecker();