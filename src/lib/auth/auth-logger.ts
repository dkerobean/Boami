/**
 * Authentication Logging and Monitoring
 * Comprehensive logging system for authentication events and security monitoring
 */

import { getLoggingConfig } from './auth-config';

// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Authentication event types
export type AuthEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'token_refresh'
  | 'token_expired'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'email_verification'
  | 'account_locked'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'permission_denied'
  | 'session_expired'
  | 'multi_tab_login'
  | 'api_access'
  | 'security_violation';

// Authentication log entry interface
export interface AuthLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  eventType: AuthEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  resource?: string;
  method?: string;
  statusCode?: number;
  message: string;
  metadata?: Record<string, any>;
  risk?: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
}

// Security metrics interface
export interface SecurityMetrics {
  totalLogins: number;
  failedLogins: number;
  successfulLogins: number;
  uniqueUsers: number;
  suspiciousActivities: number;
  rateLimitViolations: number;
  tokenRefreshes: number;
  sessionExpirations: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// Alert configuration
export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    failedLoginsPerMinute: number;
    suspiciousActivitiesPerHour: number;
    rateLimitViolationsPerHour: number;
    uniqueFailedLoginsPerUser: number;
  };
  notifications: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
}

/**
 * Authentication Logger Class
 */
export class AuthLogger {
  private static instance: AuthLogger;
  private logs: AuthLogEntry[] = [];
  private metrics: Map<string, number> = new Map();
  private alertConfig: AlertConfig;
  private isInitialized = false;

  private constructor() {
    this.alertConfig = {
      enabled: true,
      thresholds: {
        failedLoginsPerMinute: 10,
        suspiciousActivitiesPerHour: 5,
        rateLimitViolationsPerHour: 20,
        uniqueFailedLoginsPerUser: 5,
      },
      notifications: {},
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthLogger {
    if (!AuthLogger.instance) {
      AuthLogger.instance = new AuthLogger();
    }
    return AuthLogger.instance;
  }

  /**
   * Initialize logger
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Load existing logs from storage
    this.loadLogsFromStorage();

    // Set up periodic cleanup
    this.setupCleanup();

    // Set up metrics calculation
    this.setupMetricsCalculation();

    this.isInitialized = true;
    console.log('AuthLogger initialized');
  }

  /**
   * Log authentication event
   */
  log(
    level: LogLevel,
    eventType: AuthEventType,
    message: string,
    metadata?: Partial<AuthLogEntry>
  ): void {
    const config = getLoggingConfig();

    // Check if logging is enabled and level is appropriate
    if (!config.enabled || !this.shouldLog(level, eventType)) {
      re   }

    const logEntry: AuthLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      eventType,
      message,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      ...metadata,
    };

    // Add risk assessment
    logEntry.risk = this.assessRisk(logEntry);

    // Store log entry
    this.logs.push(logEntry);

    // Update metrics
    this.updateMetrics(logEntry);

    // Check for alerts
    this.checkAlerts(logEntry);

    // Persist to storage
    this.persistToStorage(logEntry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(logEntry);
    }

    // Send to external services in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalServices(logEntry);
    }
  }

  /**
   * Log successful login
   */
  logLoginSuccess(userId: string, email: string, metadata?: Record<string, any>): void {
    this.log('info', 'login_success', `User ${email} logged in successfully`, {
      userId,
      email,
      metadata,
    });
  }

  /**
   * Log failed login attempt
   */
  logLoginFailure(email: string, reason: string, metadata?: Record<string, any>): void {
    this.log('warn', 'login_failure', `Login failed for ${email}: ${reason}`, {
      email,
      metadata: { ...metadata, failureReason: reason },
    });
  }

  /**
   * Log logout event
   */
  logLogout(userId: string, email: string, metadata?: Record<string, any>): void {
    this.log('info', 'logout', `User ${email} logged out`, {
      userId,
      email,
      metadata,
    });
  }

  /**
   * Log token refresh
   */
  logTokenRefresh(userId: string, email: string, metadata?: Record<string, any>): void {
    this.log('debug', 'token_refresh', `Token refreshed for user ${email}`, {
      userId,
      email,
      metadata,
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    description: string,
    userId?: string,
    email?: string,
    metadata?: Record<string, any>
  ): void {
    this.log('error', 'suspicious_activity', `Suspicious activity detected: ${description}`, {
      userId,
      email,
      metadata,
    });
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(
    resource: string,
    method: string,
    userId?: string,
    email?: string,
    metadata?: Record<string, any>
  ): void {
    this.log('warn', 'unauthorized_access', `Unauthorized access to ${method} ${resource}`, {
      userId,
      email,
      resource,
      method,
      metadata,
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    identifier: string,
    resource: string,
    metadata?: Record<string, any>
  ): void {
    this.log('warn', 'rate_limit_exceeded', `Rate limit exceeded for ${identifier} on ${resource}`, {
      metadata: { ...metadata, identifier, resource },
    });
  }

  /**
   * Get logs with filtering options
   */
  getLogs(options: {
    level?: LogLevel;
    eventType?: AuthEventType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): AuthLogEntry[] {
    let filteredLogs = [...this.logs];

    // Apply filters
    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }

    if (options.eventType) {
      filteredLogs = filteredLogs.filter(log => log.eventType === options.eventType);
    }

    if (options.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === options.userId);
    }

    if (options.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
    const start = timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = timeRange?.end || new Date();

    const logsInRange = this.logs.filter(
      log => log.timestamp >= start && log.timestamp <= end
    );

    const totalLogins = logsInRange.filter(
      log => log.eventType === 'login_success' || log.eventType === 'login_failure'
    ).length;

    const failedLogins = logsInRange.filter(
      log => log.eventType === 'login_failure'
    ).length;

    const successfulLogins = logsInRange.filter(
      log => log.eventType === 'login_success'
    ).length;

    const uniqueUsers = new Set(
      logsInRange
        .filter(log => log.userId)
        .map(log => log.userId)
    ).size;

    const suspiciousActivities = logsInRange.filter(
      log => log.eventType === 'suspicious_activity'
    ).length;

    const rateLimitViolations = logsInRange.filter(
      log => log.eventType === 'rate_limit_exceeded'
    ).length;

    const tokenRefreshes = logsInRange.filter(
      log => log.eventType === 'token_refresh'
    ).length;

    const sessionExpirations = logsInRange.filter(
      log => log.eventType === 'session_expired'
    ).length;

    return {
      totalLogins,
      failedLogins,
      successfulLogins,
      uniqueUsers,
      suspiciousActivities,
      rateLimitViolations,
      tokenRefreshes,
      sessionExpirations,
      timeRange: { start, end },
    };
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear old logs
   */
  clearOldLogs(olderThan: Date): void {
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > olderThan);
    const removedCount = initialCount - this.logs.length;

    console.log(`Cleared ${removedCount} old log entries`);
    this.persistAllToStorage();
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Check if should log based on configuration
   */
  private shouldLog(level: LogLevel, eventType: AuthEventType): boolean {
    const config = getLoggingConfig();

    // Check level
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevelPriority = levelPriority[config.level];
    const logLevelPriority = levelPriority[level];

    if (logLevelPriority < configLevelPriority) {
      return false;
    }

    // Check event type
    const eventTypeMap: Record<AuthEventType, keyof typeof config.events> = {
      login_success: 'login',
      login_failure: 'login',
      logout: 'logout',
      token_refresh: 'refresh',
      token_expired: 'errors',
      password_reset_request: 'security',
      password_reset_success: 'security',
      email_verification: 'security',
      account_locked: 'security',
      suspicious_activity: 'security',
      rate_limit_exceeded: 'security',
      unauthorized_access: 'security',
      permission_denied: 'security',
      session_expired: 'errors',
      multi_tab_login: 'login',
      api_access: 'login',
      security_violation: 'security',
    };

    const configKey = eventTypeMap[eventType];
    return config.events[configKey] || false;
  }

  /**
   * Assess risk level of log entry
   */
  private assessRisk(logEntry: AuthLogEntry): 'low' | 'medium' | 'high' | 'critical' {
    switch (logEntry.eventType) {
      case 'suspicious_activity':
      case 'security_violation':
        return 'critical';

      case 'unauthorized_access':
      case 'account_locked':
      case 'rate_limit_exceeded':
        return 'high';

      case 'login_failure':
      case 'permission_denied':
        return 'medium';

      default:
        return 'low';
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(logEntry: AuthLogEntry): void {
    const key = `${logEntry.eventType}_${logEntry.level}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  /**
   * Check for alerts
   */
  private checkAlerts(logEntry: AuthLogEntry): void {
    if (!this.alertConfig.enabled) return;

    // Check failed login threshold
    if (logEntry.eventType === 'login_failure') {
      this.checkFailedLoginThreshold();
    }

    // Check suspicious activity threshold
    if (logEntry.eventType === 'suspicious_activity') {
      this.checkSuspiciousActivityThreshold();
    }

    // Check rate limit violations
    if (logEntry.eventType === 'rate_limit_exceeded') {
      this.checkRateLimitThreshold();
    }
  }

  /**
   * Check failed login threshold
   */
  private checkFailedLoginThreshold(): void {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentFailedLogins = this.logs.filter(
      log => log.eventType === 'login_failure' && log.timestamp > oneMinuteAgo
    ).length;

    if (recentFailedLogins >= this.alertConfig.thresholds.failedLoginsPerMinute) {
      this.sendAlert('HIGH_FAILED_LOGIN_RATE', {
        count: recentFailedLogins,
        threshold: this.alertConfig.thresholds.failedLoginsPerMinute,
        timeWindow: '1 minute',
      });
    }
  }

  /**
   * Check suspicious activity threshold
   */
  private checkSuspiciousActivityThreshold(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSuspiciousActivities = this.logs.filter(
      log => log.eventType === 'suspicious_activity' && log.timestamp > oneHourAgo
    ).length;

    if (recentSuspiciousActivities >= this.alertConfig.thresholds.suspiciousActivitiesPerHour) {
      this.sendAlert('HIGH_SUSPICIOUS_ACTIVITY', {
        count: recentSuspiciousActivities,
        threshold: this.alertConfig.thresholds.suspiciousActivitiesPerHour,
        timeWindow: '1 hour',
      });
    }
  }

  /**
   * Check rate limit threshold
   */
  private checkRateLimitThreshold(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRateLimitViolations = this.logs.filter(
      log => log.eventType === 'rate_limit_exceeded' && log.timestamp > oneHourAgo
    ).length;

    if (recentRateLimitViolations >= this.alertConfig.thresholds.rateLimitViolationsPerHour) {
      this.sendAlert('HIGH_RATE_LIMIT_VIOLATIONS', {
        count: recentRateLimitViolations,
        threshold: this.alertConfig.thresholds.rateLimitViolationsPerHour,
        timeWindow: '1 hour',
      });
    }
  }

  /**
   * Send alert
   */
  private sendAlert(alertType: string, data: any): void {
    console.warn(`SECURITY ALERT: ${alertType}`, data);

    // In production, send to monitoring services
    if (process.env.NODE_ENV === 'production') {
      // Send email, webhook, Slack notification, etc.
      this.sendAlertNotification(alertType, data);
    }
  }

  /**
   * Send alert notification
   */
  private sendAlertNotification(alertType: string, data: any): void {
    // Implementation for external alert services
    // This would integrate with email services, Slack, PagerDuty, etc.
    console.log('Sending alert notification:', alertType, data);
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(): string {
    if (typeof window !== 'undefined') {
      // Client-side, IP not directly available
      return 'client';
    }
    // Server-side would extract from request headers
    return 'server';
  }

  /**
   * Get user agent
   */
  private getUserAgent(): string {
    if (typeof window !== 'undefined') {
      return navigator.userAgent;
    }
    return 'server';
  }

  /**
   * Console log for development
   */
  private consoleLog(logEntry: AuthLogEntry): void {
    const color = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[37m',
    }[logEntry.level];

    console.log(
      `${color}[AUTH ${logEntry.level.toUpperCase()}]\x1b[0m ${logEntry.timestamp.toISOString()} - ${logEntry.eventType}: ${logEntry.message}`
    );
  }

  /**
   * Send to external services
   */
  private sendToExternalServices(logEntry: AuthLogEntry): void {
    // Implementation for external logging services
    // This would integrate with services like DataDog, New Relic, etc.
  }

  /**
   * Load logs from storage
   */
  private loadLogsFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedLogs = localStorage.getItem('auth_logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  /**
   * Persist log to storage
   */
  private persistToStorage(logEntry: AuthLogEntry): void {
    if (typeof window === 'undefined') return;

    try {
      // Keep only recent logs in storage (last 1000 entries)
      const recentLogs = this.logs.slice(-1000);
      localStorage.setItem('auth_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to persist log to storage:', error);
    }
  }

  /**
   * Persist all logs to storage
   */
  private persistAllToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('auth_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist all logs to storage:', error);
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanup(): void {
    // Clean up old logs every hour
    setInterval(() => {
      const config = getLoggingConfig();
      const cutoffDate = new Date(Date.now() - config.retention.days * 24 * 60 * 60 * 1000);
      this.clearOldLogs(cutoffDate);
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Setup metrics calculation
   */
  private setupMetricsCalculation(): void {
    // Recalculate metrics every 5 minutes
    setInterval(() => {
      this.recalculateMetrics();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Recalculate metrics
   */
  private recalculateMetrics(): void {
    this.metrics.clear();
    this.logs.forEach(log => this.updateMetrics(log));
  }

  /**
   * Export logs to CSV format
   */
  private exportToCSV(): string {
    const headers = [
      'ID',
      'Timestamp',
      'Level',
      'Event Type',
      'User ID',
      'Email',
      'IP Address',
      'User Agent',
      'Message',
      'Risk',
    ];

    const rows = this.logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.level,
      log.eventType,
      log.userId || '',
      log.email || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.message,
      log.risk || '',
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

/**
 * Convenience functions for logging
 */
export const authLogger = AuthLogger.getInstance();

export const logAuthEvent = (
  level: LogLevel,
  eventType: AuthEventType,
  message: string,
  metadata?: Partial<AuthLogEntry>
) => {
  authLogger.log(level, eventType, message, metadata);
};

export const logLoginSuccess = (userId: string, email: string, metadata?: Record<string, any>) => {
  authLogger.logLoginSuccess(userId, email, metadata);
};

export const logLoginFailure = (email: string, reason: string, metadata?: Record<string, any>) => {
  authLogger.logLoginFailure(email, reason, metadata);
};

export const logLogout = (userId: string, email: string, metadata?: Record<string, any>) => {
  authLogger.logLogout(userId, email, metadata);
};

export const logSuspiciousActivity = (
  description: string,
  userId?: string,
  email?: string,
  metadata?: Record<string, any>
) => {
  authLogger.logSuspiciousActivity(description, userId, email, metadata);
};

export default AuthLogger;