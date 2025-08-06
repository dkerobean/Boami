/**
 * Authentication Performance Optimizations
 * Implements caching, request deduplication, and performance monitoring for authentication
 */

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  authChecks: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  tokenRefreshes: number;
  deduplicatedRequests: number;
}

// Request deduplication interface
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Authentication Cache Manager
 */
export class AuthCacheManager {
  private static instance: AuthCacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): AuthCacheManager {
    if (!AuthCacheManager.instance) {
      AuthCacheManager.instance = new AuthCacheManager();
    }
    return AuthCacheManager.instance;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });

    // Enforce cache size limit
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldest();
    }
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
eck if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.expiresAt - now,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to track hits/misses
      entries,
    };
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000); // Every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Request Deduplication Manager
 */
export class RequestDeduplicationManager {
  private static instance: RequestDeduplicationManager;
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private requestTimeout = 30 * 1000; // 30 seconds

  private constructor() {}

  static getInstance(): RequestDeduplicationManager {
    if (!RequestDeduplicationManager.instance) {
      RequestDeduplicationManager.instance = new RequestDeduplicationManager();
    }
    return RequestDeduplicationManager.instance;
  }

  /**
   * Deduplicate request
   */
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Check if request hasn't timed out
      if (Date.now() - pending.timestamp < this.requestTimeout) {
        return pending.promise;
      } else {
        // Remove timed out request
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get pending requests count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

/**
 * Performance Monitor
 */
export class AuthPerformanceMonitor {
  private static instance: AuthPerformanceMonitor;
  private metrics: PerformanceMetrics = {
    authChecks: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    tokenRefreshes: 0,
    deduplicatedRequests: 0,
  };
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 100;

  private constructor() {}

  static getInstance(): AuthPerformanceMonitor {
    if (!AuthPerformanceMonitor.instance) {
      AuthPerformanceMonitor.instance = new AuthPerformanceMonitor();
    }
    return AuthPerformanceMonitor.instance;
  }

  /**
   * Record authentication check
   */
  recordAuthCheck(responseTime: number, fromCache: boolean = false): void {
    this.metrics.authChecks++;

    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    this.recordResponseTime(responseTime);
  }

  /**
   * Record token refresh
   */
  recordTokenRefresh(): void {
    this.metrics.tokenRefreshes++;
  }

  /**
   * Record deduplicated request
   */
  recordDeduplicatedRequest(): void {
    this.metrics.deduplicatedRequests++;
  }

  /**
   * Record response time
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    // Calculate average
    this.metrics.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics & {
    cacheHitRate: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const cacheHitRate = this.metrics.authChecks > 0
      ? (this.metrics.cacheHits / this.metrics.authChecks) * 100
      : 0;

    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      ...this.metrics,
      cacheHitRate,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      authChecks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      tokenRefreshes: 0,
      deduplicatedRequests: 0,
    };
    this.responseTimes = [];
  }
}

/**
 * Optimized Authentication Manager
 */
export class OptimizedAuthManager {
  private cache = AuthCacheManager.getInstance();
  private deduplicator = RequestDeduplicationManager.getInstance();
  private monitor = AuthPerformanceMonitor.getInstance();

  /**
   * Optimized user authentication check
   */
  async checkAuthentication(userId: string): Promise<any> {
    const startTime = Date.now();
    const cacheKey = `auth_check_${userId}`;

    try {
      // Try cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        const responseTime = Date.now() - startTime;
        this.monitor.recordAuthCheck(responseTime, true);
        return cached;
      }

      // Deduplicate concurrent requests
      const result = await this.deduplicator.deduplicate(
        cacheKey,
        async () => {
          // Actual authentication check
          const authResult = await this.performAuthCheck(userId);

          // Cache the result
          this.cache.set(cacheKey, authResult, 5 * 60 * 1000); // 5 minutes

          return authResult;
        }
      );

      const responseTime = Date.now() - startTime;
      this.monitor.recordAuthCheck(responseTime, false);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.monitor.recordAuthCheck(responseTime, false);
      throw error;
    }
  }

  /**
   * Optimized token refresh
   */
  async refreshToken(refreshToken: string): Promise<any> {
    const startTime = Date.now();
    const cacheKey = `token_refresh_${refreshToken.substring(0, 10)}`;

    try {
      // Deduplicate token refresh requests
      const result = await this.deduplicator.deduplicate(
        cacheKey,
        async () => {
          this.monitor.recordTokenRefresh();
          return await this.performTokenRefresh(refreshToken);
        }
      );

      // Cache user data from token
      if (result.user) {
        this.cache.set(`auth_check_${result.user.id}`, result.user, 10 * 60 * 1000);
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch authentication checks
   */
  async batchCheckAuthentication(userIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const uncachedIds: string[] = [];

    // Check cache first
    for (const userId of userIds) {
      const cached = this.cache.get(`auth_check_${userId}`);
      if (cached) {
        results[userId] = cached;
      } else {
        uncachedIds.push(userId);
      }
    }

    // Batch fetch uncached items
    if (uncachedIds.length > 0) {
      const batchResults = await this.performBatchAuthCheck(uncachedIds);

      // Cache and merge results
      for (const [userId, result] of Object.entries(batchResults)) {
        this.cache.set(`auth_check_${userId}`, result, 5 * 60 * 1000);
        results[userId] = result;
      }
    }

    return results;
  }

  /**
   * Preload authentication data
   */
  async preloadAuthData(userIds: string[]): Promise<void> {
    const uncachedIds = userIds.filter(id => !this.cache.has(`auth_check_${id}`));

    if (uncachedIds.length > 0) {
      // Preload in background
      this.performBatchAuthCheck(uncachedIds).then(results => {
        for (const [userId, result] of Object.entries(results)) {
          this.cache.set(`auth_check_${userId}`, result, 5 * 60 * 1000);
        }
      }).catch(error => {
        console.warn('Failed to preload auth data:', error);
      });
    }
  }

  /**
   * Invalidate user cache
   */
  invalidateUserCache(userId: string): void {
    this.cache.delete(`auth_check_${userId}`);
  }

  /**
   * Warm up cache with frequently accessed users
   */
  async warmUpCache(userIds: string[]): Promise<void> {
    await this.batchCheckAuthentication(userIds);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.monitor.getMetrics(),
      cacheStats: this.cache.getStats(),
      pendingRequests: this.deduplicator.getPendingCount(),
    };
  }

  /**
   * Actual authentication check implementation
   */
  private async performAuthCheck(userId: string): Promise<any> {
    // This would be replaced with actual authentication logic
    // For now, simulate an API call
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      id: userId,
      authenticated: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Actual token refresh implementation
   */
  private async performTokenRefresh(refreshToken: string): Promise<any> {
    // This would be replaced with actual token refresh logic
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      user: { id: 'user_id', email: 'user@example.com' },
    };
  }

  /**
   * Batch authentication check implementation
   */
  private async performBatchAuthCheck(userIds: string[]): Promise<Record<string, any>> {
    // This would be replaced with actual batch authentication logic
    await new Promise(resolve => setTimeout(resolve, 150));

    const results: Record<string, any> = {};
    for (const userId of userIds) {
      results[userId] = {
        id: userId,
        authenticated: true,
        timestamp: Date.now(),
      };
    }

    return results;
  }
}

/**
 * Loading State Optimizer
 */
export class LoadingStateOptimizer {
  private loadingStates: Map<string, {
    startTime: number;
    minDisplayTime: number;
    promise: Promise<any>;
  }> = new Map();

  /**
   * Optimize loading state display
   */
  async optimizeLoading<T>(
    key: string,
    promise: Promise<T>,
    minDisplayTime: number = 200
  ): Promise<T> {
    const startTime = Date.now();

    this.loadingStates.set(key, {
      startTime,
      minDisplayTime,
      promise,
    });

    try {
      const result = await promise;

      // Ensure minimum display time
      const elapsed = Date.now() - startTime;
      if (elapsed < minDisplayTime) {
        await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed));
      }

      this.loadingStates.delete(key);
      return result;
    } catch (error) {
      this.loadingStates.delete(key);
      throw error;
    }
  }

  /**
   * Check if loading state should be shown
   */
  shouldShowLoading(key: string): boolean {
    const state = this.loadingStates.get(key);
    if (!state) return false;

    const elapsed = Date.now() - state.startTime;
    return elapsed >= 100; // Show loading after 100ms
  }

  /**
   * Get loading progress
   */
  getLoadingProgress(key: string): number {
    const state = this.loadingStates.get(key);
    if (!state) return 0;

    const elapsed = Date.now() - state.startTime;
    return Math.min(elapsed / state.minDisplayTime, 1);
  }
}

/**
 * Convenience functions and exports
 */
export const authCache = AuthCacheManager.getInstance();
export const requestDeduplicator = RequestDeduplicationManager.getInstance();
export const authPerformanceMonitor = AuthPerformanceMonitor.getInstance();
export const optimizedAuthManager = new OptimizedAuthManager();
export const loadingOptimizer = new LoadingStateOptimizer();

/**
 * Performance optimization utilities
 */
export const AuthPerformanceUtils = {
  /**
   * Debounce function for authentication checks
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout;
    let resolvePromise: (value: ReturnType<T>) => void;
    let rejectPromise: (reason: any) => void;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        clearTimeout(timeoutId);
        resolvePromise = resolve;
        rejectPromise = reject;

        timeoutId = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolvePromise(result);
          } catch (error) {
            rejectPromise(error);
          }
        }, delay);
      });
    };
  },

  /**
   * Throttle function for authentication requests
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    let inThrottle: boolean;
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      if (!inThrottle) {
        const result = func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
        return result;
      }
    };
  },

  /**
   * Memoize authentication results
   */
  memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map();

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = func(...args);
      cache.set(key, result);

      // Clean up cache after 5 minutes
      setTimeout(() => cache.delete(key), 5 * 60 * 1000);

      return result;
    }) as T;
  },
};

export default OptimizedAuthManager;