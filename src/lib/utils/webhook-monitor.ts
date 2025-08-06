import { SubscriptionLogger } from './subscription-logger';
import { SubscriptionCache } from '../cache/subscription-cache';

/**
 * Webhook monitoring andlity service
 */
export class WebhookMonitor {
  private static webhookStats = new Map<string, any>();
  private static failedWebhooks: any[] = [];

  /**
   * Record webhook attempt
   */
  static async recordWebhookAttempt(
    webhookId: string,
    endpoint: string,
    payload: any,
    success: boolean,
    responseTime: number,
    statusCode?: number,
    error?: string
  ): Promise<void> {
    const timestamp = new Date();

    // Update statistics
    const stats = this.webhookStats.get(endpoint) || {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      averageResponseTime: 0,
      lastAttempt: null,
      lastSuccess: null,
      lastFailure: null
    };

    stats.totalAttempts++;
    stats.lastAttempt = timestamp;

    if (success) {
      stats.successfulAttempts++;
      stats.lastSuccess = timestamp;
    } else {
      stats.failedAttempts++;
      stats.lastFailure = timestamp;

      // Record failed webhook for retry
      this.failedWebhooks.push({
        webhookId,
        endpoint,
        payload,
        timestamp,
        statusCode,
        error,
        retryCount: 0
      });
    }

    // Update average response time
    stats.averageResponseTime = (
      (stats.averageResponseTime * (stats.totalAttempts - 1) + responseTime) /
      stats.totalAttempts
    );

    this.webhookStats.set(endpoint, stats);

    // Log webhook attempt
    await SubscriptionLogger.logAccessActivity(
      'webhook_attempt',
      {
        webhookId,
        endpoint,
        success,
        responseTime,
        statusCode,
        error: success ? undefined : error
      },
      {
        severity: success ? 'info' : 'warning'
      }
    );

    // Cache webhook stats
    await SubscriptionCache.setCustomCache(
      `webhook_stats:${endpoint}`,
      stats,
      3600 // 1 hour
    );
  }

  /**
   * Get webhook statistics
   */
  static getWebhookStats(endpoint?: string): any {
    if (endpoint) {
      return this.webhookStats.get(endpoint) || null;
    }

    // Return all stats
    const allStats: any = {};
    this.webhookStats.forEach((stats, endpoint) => {
      allStats[endpoint] = {
        ...stats,
        successRate: stats.totalAttempts > 0 ?
          (stats.successfulAttempts / stats.totalAttempts) * 100 : 0
      };
    });

    return allStats;
  }

  /**
   * Get failed webhooks for retry
   */
  static getFailedWebhooks(maxRetries: number = 3): any[] {
    return this.failedWebhooks.filter(webhook => webhook.retryCount < maxRetries);
  }

  /**
   * Retry failed webhooks
   */
  static async retryFailedWebhooks(): Promise<any> {
    const webhooksToRetry = this.getFailedWebhooks();
    const results = [];

    for (const webhook of webhooksToRetry) {
      try {
        const startTime = Date.now();

        // Attempt to resend webhook
        const response = await fetch(webhook.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Retry': 'true',
            'X-Retry-Count': webhook.retryCount.toString()
          },
          body: JSON.stringify(webhook.payload)
        });

        const responseTime = Date.now() - startTime;
        const success = response.ok;

        // Record retry attempt
        await this.recordWebhookAttempt(
          webhook.webhookId,
          webhook.endpoint,
          webhook.payload,
          success,
          responseTime,
          response.status,
          success ? undefined : `Retry failed: ${response.statusText}`
        );

        webhook.retryCount++;

        if (success) {
          // Remove from failed list
          const index = this.failedWebhooks.indexOf(webhook);
          if (index > -1) {
            this.failedWebhooks.splice(index, 1);
          }
        }

        results.push({
          webhookId: webhook.webhookId,
          endpoint: webhook.endpoint,
          success,
          retryCount: webhook.retryCount,
          responseTime
        });

        // Add delay between retries to avoid overwhelming the endpoint
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        webhook.retryCount++;
        results.push({
          webhookId: webhook.webhookId,
          endpoint: webhook.endpoint,
          success: false,
          retryCount: webhook.retryCount,
          error: error.message
        });
      }
    }

    // Clean up webhooks that have exceeded max retries
    this.failedWebhooks = this.failedWebhooks.filter(webhook => webhook.retryCount < 3);

    return {
      attempted: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Monitor webhook health
   */
  static async monitorWebhookHealth(): Promise<any> {
    const healthReport = {
      overall: { healthy: true, issues: [] },
      endpoints: {},
      failedWebhooks: this.failedWebhooks.length,
      recommendations: []
    };

    // Check each endpoint
    this.webhookStats.forEach((stats, endpoint) => {
      const successRate = stats.totalAttempts > 0 ?
        (stats.successfulAttempts / stats.totalAttempts) * 100 : 100;

      const endpointHealth = {
        healthy: true,
        successRate,
        averageResponseTime: stats.averageResponseTime,
        totalAttempts: stats.totalAttempts,
        recentFailures: 0,
        issues: []
      };

      // Check success rate
      if (successRate < 95) {
        endpointHealth.healthy = false;
        endpointHealth.issues.push(`Low success rate: ${successRate.toFixed(2)}%`);
        healthReport.overall.healthy = false;
        healthReport.overall.issues.push(`${endpoint}: Low success rate`);
      }

      // Check response time
      if (stats.averageResponseTime > 5000) { // 5 seconds
        endpointHealth.issues.push(`Slow response time: ${stats.averageResponseTime}ms`);
        healthReport.recommendations.push(`Optimize ${endpoint} response time`);
      }

      // Check for recent failures
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentFailures = this.failedWebhooks.filter(
        webhook => webhook.endpoint === endpoint && webhook.timestamp > oneHourAgo
      ).length;

      endpointHealth.recentFailures = recentFailures;

      if (recentFailures > 5) {
        endpointHealth.healthy = false;
        endpointHealth.issues.push(`${recentFailures} failures in the last hour`);
        healthReport.overall.healthy = false;
        healthReport.overall.issues.push(`${endpoint}: High failure rate`);
      }

      healthReport.endpoints[endpoint] = endpointHealth;
    });

    // Check for stuck webhooks
    if (this.failedWebhooks.length > 50) {
      healthReport.overall.healthy = false;
      healthReport.overall.issues.push('Too many failed webhooks in queue');
      healthReport.recommendations.push('Review webhook endpoints and clear failed queue');
    }

    return healthReport;
  }

  /**
   * Get webhook delivery metrics
   */
  static getDeliveryMetrics(timeframe: string = '24h'): any {
    const now = Date.now();
    let timeframeMs: number;

    switch (timeframe) {
      case '1h':
        timeframeMs = 60 * 60 * 1000;
        break;
      case '24h':
        timeframeMs = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeframeMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeframeMs = 24 * 60 * 60 * 1000;
    }

    const cutoffTime = new Date(now - timeframeMs);

    // Filter failed webhooks by timeframe
    const recentFailures = this.failedWebhooks.filter(
      webhook => webhook.timestamp > cutoffTime
    );

    // Calculate metrics
    let totalAttempts = 0;
    let successfulAttempts = 0;
    let totalResponseTime = 0;

    this.webhookStats.forEach(stats => {
      totalAttempts += stats.totalAttempts;
      successfulAttempts += stats.successfulAttempts;
      totalResponseTime += stats.averageResponseTime * stats.totalAttempts;
    });

    const averageResponseTime = totalAttempts > 0 ? totalResponseTime / totalAttempts : 0;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 100;

    return {
      timeframe,
      totalAttempts,
      successfulAttempts,
      failedAttempts: totalAttempts - successfulAttempts,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      recentFailures: recentFailures.length,
      endpointCount: this.webhookStats.size
    };
  }

  /**
   * Clear webhook statistics
   */
  static clearStats(): void {
    this.webhookStats.clear();
    this.failedWebhooks = [];
    console.log('🗑️ Webhook statistics cleared');
  }

  /**
   * Get webhook retry queue status
   */
  static getRetryQueueStatus(): any {
    const queueByEndpoint = {};

    this.failedWebhooks.forEach(webhook => {
      if (!queueByEndpoint[webhook.endpoint]) {
        queueByEndpoint[webhook.endpoint] = {
          count: 0,
          oldestFailure: webhook.timestamp,
          newestFailure: webhook.timestamp
        };
      }

      const endpointQueue = queueByEndpoint[webhook.endpoint];
      endpointQueue.count++;

      if (webhook.timestamp < endpointQueue.oldestFailure) {
        endpointQueue.oldestFailure = webhook.timestamp;
      }

      if (webhook.timestamp > endpointQueue.newestFailure) {
        endpointQueue.newestFailure = webhook.timestamp;
      }
    });

    return {
      totalFailed: this.failedWebhooks.length,
      byEndpoint: queueByEndpoint,
      retryable: this.getFailedWebhooks().length
    };
  }

  /**
   * Setup automatic retry scheduler
   */
  static setupRetryScheduler(intervalMinutes: number = 15): void {
    setInterval(async () => {
      const failedCount = this.failedWebhooks.length;

      if (failedCount > 0) {
        console.log(`🔄 Retrying ${failedCount} failed webhooks...`);

        const results = await this.retryFailedWebhooks();

        console.log(`✅ Webhook retry completed: ${results.successful}/${results.attempted} successful`);

        if (results.failed > 0) {
          console.warn(`⚠️ ${results.failed} webhooks still failing after retry`);
        }
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Webhook retry scheduler started (every ${intervalMinutes} minutes)`);
  }
}

// Export the main webhook monitor instance
export const webhookMonitor = WebhookMonitor;