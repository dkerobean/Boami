/**
 * Webhook monitoring and logging system
 * Provides comprehensive monitoring, alerting, and analytics for webhook processing
 */

export interface WebhookEvent {
  id: string;
  timestamp: Date;
  event: string;
  status: 'received' | 'processing' | 'success' | 'failed' | 'retry';
  processingTime?: number;
  error?: string;
  payload?: any;
  metadata?: Record<string, any>;
}

export interface WebhookMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  successRate: number;
  eventsByType: Record<string, number>;
  errorsByType: Record<string, number>;
  recentEvents: WebhookEvent[];
}

/**
 * Webhook monitoring service
 */
export class WebhookMonitor {
  private events: WebhookEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory
  private alertThresholds = {
    failureRate: 0.1, // Alert if failure rate > 10%
    consecutiveFailures: 5,
    processingTime: 10000 // Alert if processing time > 10 seconds
  };

  /**
   * Record webhook event
   */
  recordEvent(event: Omit<WebhookEvent, 'timestamp'>): void {
    const webhookEvent: WebhookEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(webhookEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Check for alerts
    this.checkAlerts(webhookEvent);

    // Log event
    this.logEvent(webhookEvent);
  }

  /**
   * Get webhook metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): WebhookMetrics {
    let filteredEvents = this.events;

    if (timeRange) {
      filteredEvents = this.events.filter(event =>
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    const totalEvents = filteredEvents.length;
    const successfulEvents = filteredEvents.filter(e => e.status === 'success').length;
    const failedEvents = filteredEvents.filter(e => e.status === 'failed').length;

    const processingTimes = filteredEvents
      .filter(e => e.processingTime)
      .map(e => e.processingTime!);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 100;

    // Group events by type
    const eventsByType: Record<string, number> = {};
    filteredEvents.forEach(event => {
      eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;
    });

    // Group errors by type
    const errorsByType: Record<string, number> = {};
    filteredEvents
      .filter(event => event.status === 'failed' && event.error)
      .forEach(event => {
        const errorType = this.categorizeError(event.error!);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      averageProcessingTime,
      successRate,
      eventsByType,
      errorsByType,
      recentEvents: filteredEvents.slice(-10) // Last 10 events
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    lastEvent?: Date;
    uptime: number;
  } {
    const recentEvents = this.events.slice(-100); // Last 100 events
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (recentEvents.length === 0) {
      return {
        status: 'healthy',
        issues: [],
        uptime: 100
      };
    }

    // Check failure rate
    const failedCount = recentEvents.filter(e => e.status === 'failed').length;
    const failureRate = failedCount / recentEvents.length;

    if (failureRate > this.alertThresholds.failureRate) {
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
      status = failureRate > 0.25 ? 'critical' : 'degraded';
    }

    // Check consecutive failures
    let consecutiveFailures = 0;
    for (let i = recentEvents.length - 1; i >= 0; i--) {
      if (recentEvents[i].status === 'failed') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
      issues.push(`${consecutiveFailures} consecutive failures`);
      status = consecutiveFailures >= 10 ? 'critical' : 'degraded';
    }

    // Check processing time
    const recentProcessingTimes = recentEvents
      .filter(e => e.processingTime)
      .map(e => e.processingTime!)
      .slice(-10);

    if (recentProcessingTimes.length > 0) {
      const avgProcessingTime = recentProcessingTimes.reduce((sum, time) => sum + time, 0) / recentProcessingTimes.length;

      if (avgProcessingTime > this.alertThresholds.processingTime) {
        issues.push(`Slow processing: ${avgProcessingTime.toFixed(0)}ms average`);
        status = status === 'healthy' ? 'degraded' : status;
      }
    }

    const uptime = ((recentEvents.length - failedCount) / recentEvents.length) * 100;

    return {
      status,
      issues,
      lastEvent: recentEvents[recentEvents.length - 1]?.timestamp,
      uptime
    };
  }

  /**
   * Get webhook analytics for dashboard
   */
  getAnalytics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): any {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const periodEvents = this.events.filter(event => event.timestamp >= startTime);

    // Group events by time intervals
    const intervals = this.groupEventsByInterval(periodEvents, period);

    // Calculate trends
    const trends = this.calculateTrends(intervals);

    return {
      period,
      intervals,
      trends,
      summary: this.getMetrics({ start: startTime, end: now })
    };
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(event: WebhookEvent): void {
    // Check processing time alert
    if (event.processingTime && event.processingTime > this.alertThresholds.processingTime) {
      this.sendAlert('slow_processing', {
        event: event.event,
        processingTime: event.processingTime,
        threshold: this.alertThresholds.processingTime
      });
    }

    // Check consecutive failures
    if (event.status === 'failed') {
      const recentEvents = this.events.slice(-this.alertThresholds.consecutiveFailures);
      const allFailed = recentEvents.every(e => e.status === 'failed');

      if (allFailed && recentEvents.length === this.alertThresholds.consecutiveFailures) {
        this.sendAlert('consecutive_failures', {
          count: this.alertThresholds.consecutiveFailures,
          lastError: event.error
        });
      }
    }
  }

  /**
   * Send alert notification
   */
  private sendAlert(type: string, data: any): void {
    const alert = {
      type,
      timestamp: new Date(),
      data,
      severity: this.getAlertSeverity(type)
    };

    console.error('Webhook Alert:', alert);

    // In production, send to alerting system:
    // - Slack/Teams notification
    // - Email alert
    // - PagerDuty incident
    // - Monitoring dashboard
  }

  /**
   * Get alert severity
   */
  private getAlertSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      slow_processing: 'medium',
      consecutive_failures: 'high',
      high_failure_rate: 'critical'
    };

    return severityMap[type] || 'medium';
  }

  /**
   * Categorize error for analytics
   */
  private categorizeError(error: string): string {
    if (error.includes('signature')) return 'signature_verification';
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('network')) return 'network';
    if (error.includes('database')) return 'database';
    if (error.includes('validation')) return 'validation';
    if (error.includes('authentication')) return 'authentication';
    return 'unknown';
  }

  /**
   * Log webhook event
   */
  private logEvent(event: WebhookEvent): void {
    const logLevel = event.status === 'failed' ? 'error' : 'info';
    const logData = {
      webhookId: event.id,
      event: event.event,
      status: event.status,
      processingTime: event.processingTime,
      error: event.error
    };

    if (logLevel === 'error') {
      console.error('Webhook Event:', logData);
    } else {
      console.log('Webhook Event:', logData);
    }

    // In production, send to logging service:
    // - CloudWatch Logs
    // - DataDog
    // - Splunk
    // - ELK Stack
  }

  /**
   * Group events by time intervals
   */
  private groupEventsByInterval(events: WebhookEvent[], period: string): any[] {
    const intervals: any[] = [];
    const intervalMs = this.getIntervalMs(period);

    if (events.length === 0) return intervals;

    const startTime = events[0].timestamp.getTime();
    const endTime = events[events.length - 1].timestamp.getTime();

    for (let time = startTime; time <= endTime; time += intervalMs) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + intervalMs);

      const intervalEvents = events.filter(event =>
        event.timestamp >= intervalStart && event.timestamp < intervalEnd
      );

      intervals.push({
        start: intervalStart,
        end: intervalEnd,
        total: intervalEvents.length,
        successful: intervalEvents.filter(e => e.status === 'success').length,
        failed: intervalEvents.filter(e => e.status === 'failed').length,
        averageProcessingTime: this.calculateAverageProcessingTime(intervalEvents)
      });
    }

    return intervals;
  }

  /**
   * Get interval milliseconds based on period
   */
  private getIntervalMs(period: string): number {
    switch (period) {
      case 'hour': return 5 * 60 * 1000; // 5 minutes
      case 'day': return 60 * 60 * 1000; // 1 hour
      case 'week': return 24 * 60 * 60 * 1000; // 1 day
      case 'month': return 24 * 60 * 60 * 1000; // 1 day
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Calculate average processing time for events
   */
  private calculateAverageProcessingTime(events: WebhookEvent[]): number {
    const processingTimes = events
      .filter(e => e.processingTime)
      .map(e => e.processingTime!);

    return processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;
  }

  /**
   * Calculate trends from intervals
   */
  private calculateTrends(intervals: any[]): any {
    if (intervals.length < 2) {
      return {
        volume: 'stable',
        successRate: 'stable',
        processingTime: 'stable'
      };
    }

    const recent = intervals.slice(-5); // Last 5 intervals
    const previous = intervals.slice(-10, -5); // Previous 5 intervals

    const recentAvg = {
      volume: recent.reduce((sum, i) => sum + i.total, 0) / recent.length,
      successRate: recent.reduce((sum, i) => sum + (i.successful / (i.total || 1)), 0) / recent.length,
      processingTime: recent.reduce((sum, i) => sum + i.averageProcessingTime, 0) / recent.length
    };

    const previousAvg = {
      volume: previous.reduce((sum, i) => sum + i.total, 0) / previous.length,
      successRate: previous.reduce((sum, i) => sum + (i.successful / (i.total || 1)), 0) / previous.length,
      processingTime: previous.reduce((sum, i) => sum + i.averageProcessingTime, 0) / previous.length
    };

    return {
      volume: this.getTrend(recentAvg.volume, previousAvg.volume),
      successRate: this.getTrend(recentAvg.successRate, previousAvg.successRate),
      processingTime: this.getTrend(previousAvg.processingTime, recentAvg.processingTime) // Inverted for processing time
    };
  }

  /**
   * Get trend direction
   */
  private getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const threshold = 0.1; // 10% change threshold
    const change = (current - previous) / (previous || 1);

    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'stable';
  }

  /**
   * Clear old events (for memory management)
   */
  clearOldEvents(olderThan: Date): void {
    this.events = this.events.filter(event => event.timestamp > olderThan);
  }

  /**
   * Export events for analysis
   */
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'id', 'event', 'status', 'processingTime', 'error'];
      const rows = this.events.map(event => [
        event.timestamp.toISOString(),
        event.id,
        event.event,
        event.status,
        event.processingTime || '',
        event.error || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.events, null, 2);
  }
}

// Export singleton instance
export const webhookMonitor = new WebhookMonitor();