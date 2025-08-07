import { SubscriptionAnalyticsService } from '../services/SubscriptionAnalyticsService';
import { DatabaseOptimization } from './database-optimization';
import { SubscriptionCache } from '../cache/subscription-cache';
import RedisClient from '../cache/redis-client';
import { SubscriptionLogger } from './subscription-logger';

/**
 * Subscription system monitoring and alerting
 */
export class SubscriptionMonitor {
  private static alertThresholds = {
    churnRate: 10, // Alert if churn rate > 10%
    failedPaymentRate: 5, // Alert if failed payment rate > 5%
    responseTime: 1000, // Alert if response time > 1000ms
    errorRate: 2, // Alert if error rate > 2%
    cacheHitRate: 80 // Alert if cache hit rate < 80%
  };

  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static alertHistory: any[] = [];

  /**
   * Start monitoring system
   */
  static startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log(`🔍 Starting subscription system monitoring (every ${intervalMinutes} minutes)`);

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMinutes * 60 * 1000);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring system
   */
  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Subscription system monitoring stopped');
    }
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<any> {
    const healthReport = {
      timestamp: new Date(),
      overall: { healthy: true, score: 100 },
      components: {
        database: { healthy: true, responseTime: 0, issues: [] },
        cache: { healthy: true, responseTime: 0, hitRate: 0, issues: [] },
        subscriptions: { healthy: true, metrics: {}, issues: [] },
        payments: { healthy: true, metrics: {}, issues: [] }
      },
      alerts: [] as any[],
      recommendations: []
    };

    try {
      // Check database health
      await this.checkDatabaseHealth(healthReport);

      // Check cache health
      await this.checkCacheHealth(healthReport);

      // Check subscription metrics
      await this.checkSubscriptionHealth(healthReport);

      // Check payment processing
      await this.checkPaymentHealth(healthReport);

      // Calculate overall health score
      this.calculateOverallHealth(healthReport);

      // Generate alerts if needed
      await this.processAlerts(healthReport);

      // Log health status
      await this.logHealthStatus(healthReport);

      return healthReport;
    } catch (error) {
      console.error('Health check failed:', error);
      healthReport.overall.healthy = false;
      healthReport.overall.score = 0;
      healthReport.alerts.push({
        type: 'critical',
        message: 'Health check system failure',
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });

      return healthReport;
    }
  }

  /**
   * Check database health
   */
  private static async checkDatabaseHealth(report: any): Promise<void> {
    const startTime = Date.now();

    try {
      const dbHealth = await DatabaseOptimization.performHealthCheck();
      const responseTime = Date.now() - startTime;

      report.components.database.responseTime = responseTime;
      report.components.database.healthy = dbHealth.isConnected;

      if (!dbHealth.isConnected) {
        report.components.database.issues.push('Database connection failed');
        report.alerts.push({
          type: 'critical',
          message: 'Database connection lost',
          component: 'database'
        });
      }

      if (responseTime > this.alertThresholds.responseTime) {
        report.components.database.issues.push(`Slow database response: ${responseTime}ms`);
        report.alerts.push({
          type: 'warning',
          message: `Database response time high: ${responseTime}ms`,
          component: 'database'
        });
      }

      // Check for slow queries
      const slowQueries = await DatabaseOptimization.getSlowQueries();
      if (slowQueries.length > 5) {
        report.components.database.issues.push(`${slowQueries.length} slow queries detected`);
        report.recommendations.push('Review and optimize slow database queries');
      }

    } catch (error) {
      report.components.database.healthy = false;
      report.components.database.issues.push(`Database check failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
    }
  }

  /**
   * Check cache health
   */
  private static async checkCacheHealth(report: any): Promise<void> {
    const startTime = Date.now();

    try {
      const cacheConnected = await RedisClient.testConnection();
      const responseTime = Date.now() - startTime;

      report.components.cache.responseTime = responseTime;
      report.components.cache.healthy = cacheConnected;

      if (!cacheConnected) {
        report.components.cache.issues.push('Cache connection failed');
        report.alerts.push({
          type: 'warning',
          message: 'Cache system unavailable - performance may be degraded',
          component: 'cache'
        });
      } else {
        // Get cache statistics
        const cacheStats = await SubscriptionCache.getCacheStats();
        if (cacheStats) {
          const totalKeys = cacheStats.total || 0;
          report.components.cache.totalKeys = totalKeys;

          if (totalKeys === 0) {
            report.recommendations.push('Consider warming up the cache for better performance');
          }
        }

        // Check Redis info
        const redisInfo = await RedisClient.getInfo();
        if (redisInfo && redisInfo.memory) {
          const memoryUsage = parseInt(redisInfo.memory.used_memory || '0');
          const maxMemory = parseInt(redisInfo.memory.maxmemory || '0');

          if (maxMemory > 0 && memoryUsage / maxMemory > 0.8) {
            report.components.cache.issues.push('High cache memory usage');
            report.alerts.push({
              type: 'warning',
              message: 'Cache memory usage above 80%',
              component: 'cache'
            });
          }
        }
      }

    } catch (error) {
      report.components.cache.healthy = false;
      report.components.cache.issues.push(`Cache check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check subscription system health
   */
  private static async checkSubscriptionHealth(report: any): Promise<void> {
    try {
      // Get subscription metrics
      const metricsResult = await SubscriptionAnalyticsService.getSubscriptionMetrics('24h');

      if (metricsResult.success) {
        const metrics = metricsResult.metrics;
        report.components.subscriptions.metrics = metrics.overview;

        // Check churn rate
        if (metrics.overview.churnRate > this.alertThresholds.churnRate) {
          report.components.subscriptions.issues.push(`High churn rate: ${metrics.overview.churnRate}%`);
          report.alerts.push({
            type: 'warning',
            message: `Churn rate above threshold: ${metrics.overview.churnRate}%`,
            component: 'subscriptions'
          });
        }

        // Check for negative growth
        if (metrics.overview.growthRate < -5) {
          report.components.subscriptions.issues.push(`Negative growth rate: ${metrics.overview.growthRate}%`);
          report.alerts.push({
            type: 'warning',
            message: `Subscription growth rate is negative: ${metrics.overview.growthRate}%`,
            component: 'subscriptions'
          });
        }

        // Check for subscription processing issues
        const alerts = await SubscriptionAnalyticsService.getSubscriptionAlerts();
        if (alerts.success && alerts.alerts.length > 0) {
          report.components.subscriptions.issues.push(`${alerts.alerts.length} active alerts`);
          report.alerts.push(...alerts.alerts.map((alert: any) => ({
            ...alert,
            component: 'subscriptions'
          })));
        }
      } else {
        report.components.subscriptions.healthy = false;
        report.components.subscriptions.issues.push('Failed to get subscription metrics');
      }

    } catch (error) {
      report.components.subscriptions.healthy = false;
      report.components.subscriptions.issues.push(`Subscription check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check payment processing health
   */
  private static async checkPaymentHealth(report: any): Promise<void> {
    try {
      // Get payment metrics
      const paymentResult = await SubscriptionAnalyticsService.getPaymentMetrics('24h');

      if (paymentResult.success) {
        const metrics = paymentResult.metrics;
        report.components.payments.metrics = metrics;

        // Calculate failure rate
        const totalPayments = metrics.paymentStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
        const failedPayments = metrics.paymentStats
          .filter((stat: any) => stat.status === 'failed')
          .reduce((sum: number, stat: any) => sum + stat.count, 0);

        const failureRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;

        if (failureRate > this.alertThresholds.failedPaymentRate) {
          report.components.payments.issues.push(`High payment failure rate: ${failureRate.toFixed(2)}%`);
          report.alerts.push({
            type: 'warning',
            message: `Payment failure rate above threshold: ${failureRate.toFixed(2)}%`,
            component: 'payments'
          });
        }

        // Check processing times
        if (metrics.processingTimes && metrics.processingTimes.average > 30000) { // 30 seconds
          report.components.payments.issues.push(`Slow payment processing: ${metrics.processingTimes.average}ms`);
          report.recommendations.push('Investigate payment processing delays');
        }

        // Check for common failure reasons
        if (metrics.failureReasons.length > 0) {
          const topFailure = metrics.failureReasons[0];
          if (topFailure.count > 5) {
            report.recommendations.push(`Address common payment failure: ${topFailure.reason}`);
          }
        }
      } else {
        report.components.payments.healthy = false;
        report.components.payments.issues.push('Failed to get payment metrics');
      }

    } catch (error) {
      report.components.payments.healthy = false;
      report.components.payments.issues.push(`Payment check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate overall health score
   */
  private static calculateOverallHealth(report: any): void {
    let score = 100;
    let healthyComponents = 0;
    let totalComponents = 0;

    // Check each component
    Object.values(report.components).forEach((component: any) => {
      totalComponents++;
      if (component.healthy) {
        healthyComponents++;
      } else {
        score -= 25; // Each failed component reduces score by 25
      }

      // Reduce score for issues
      score -= component.issues.length * 5;
    });

    // Reduce score for alerts
    report.alerts.forEach((alert: any) => {
      switch (alert.type) {
        case 'critical':
          score -= 20;
          break;
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 10;
          break;
        default:
          score -= 5;
      }
    });

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    report.overall.healthy = score >= 70 && healthyComponents === totalComponents;
    report.overall.score = score;
    report.overall.healthyComponents = healthyComponents;
    report.overall.totalComponents = totalComponents;
  }

  /**
   * Process and store alerts
   */
  private static async processAlerts(report: any): Promise<void> {
    const newAlerts = report.alerts.filter((alert: any) =>
      !this.alertHistory.some(existing =>
        existing.message === alert.message &&
        existing.component === alert.component &&
        Date.now() - existing.timestamp < 60 * 60 * 1000 // Don't repeat alerts within 1 hour
      )
    );

    // Add new alerts to history
    newAlerts.forEach((alert: any) => {
      alert.timestamp = Date.now();
      this.alertHistory.push(alert);
    });

    // Clean old alerts (keep last 100)
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }

    // Log critical alerts
    newAlerts.forEach(async (alert: any) => {
      if (alert.type === 'critical' || alert.type === 'error') {
        await SubscriptionLogger.logSecurityActivity(
          'system_alert',
          {
            alertType: alert.type,
            message: alert.message,
            component: alert.component
          },
          { severity: alert.type === 'critical' ? 'critical' : 'error' }
        );
      }
    });
  }

  /**
   * Log health status
   */
  private static async logHealthStatus(report: any): Promise<void> {
    const logLevel = report.overall.healthy ? 'info' : 'warning';
    const message = `System health check: ${report.overall.score}/100 (${report.overall.healthyComponents}/${report.overall.totalComponents} components healthy)`;

    if (logLevel === 'info') {
      console.log(`✅ ${message}`);
    } else {
      console.warn(`⚠️ ${message}`);
    }

    // Log detailed issues if any
    if (report.alerts.length > 0) {
      console.warn(`🚨 Active alerts: ${report.alerts.length}`);
      report.alerts.forEach((alert: any) => {
        console.warn(`  - ${alert.type.toUpperCase()}: ${alert.message}`);
      });
    }

    // Log to audit system
    await SubscriptionLogger.logAccessActivity(
      'health_check',
      {
        score: report.overall.score,
        healthy: report.overall.healthy,
        alertCount: report.alerts.length,
        issueCount: Object.values(report.components).reduce((sum: number, comp: any) => sum + comp.issues.length, 0)
      },
      { severity: logLevel as any }
    );
  }

  /**
   * Get monitoring status
   */
  static getMonitoringStatus(): any {
    return {
      isRunning: this.monitoringInterval !== null,
      alertHistory: this.alertHistory.slice(-10), // Last 10 alerts
      thresholds: this.alertThresholds
    };
  }

  /**
   * Update alert thresholds
   */
  static updateThresholds(newThresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('📊 Alert thresholds updated:', this.alertThresholds);
  }

  /**
   * Get health report
   */
  static async getHealthReport(): Promise<any> {
    return await this.performHealthCheck();
  }

  /**
   * Clear alert history
   */
  static clearAlertHistory(): void {
    this.alertHistory = [];
    console.log('🗑️ Alert history cleared');
  }
}