/**
 * Productivity data caching utilities for improved performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

/**
 * Simple in-memory cache for productivity data
 */
class ProductivityCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };

  // Default TTL values (in milliseconds)
  private readonly DEFAULT_TTL = {
    notes: 5 * 60 * 1000,        // 5 minutes
    events: 10 * 60 * 1000,      // 10 minutes
    boards: 15 * 60 * 1000,      // 15 minutes
    tasks: 5 * 60 * 1000,        // 5 minutes
    search: 2 * 60 * 1000,       // 2 minutes
    counts: 30 * 60 * 1000       // 30 minutes
  };

  /**
   * Generate cache key for productivity data
   */
  private generateKey(type: string, userId: string, params?: Record<string, any>): string {
    const baseKey = `${type}:${userId}`;
    if (!params) return baseKey;

    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return `${baseKey}:${sortedParams}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get data from cache
   */
  get<T>(type: string, userId: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(type, userId, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.deletes++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set data in cache
   */
  set<T>(type: string, userId: string, data: T, params?: Record<string, any>, customTtl?: number): void {
    const key = this.generateKey(type, userId, params);
    const ttl = customTtl || this.DEFAULT_TTL[type as keyof typeof this.DEFAULT_TTL] || this.DEFAULT_TTL.notes;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    const wasNew = !this.cache.has(key);
    this.cache.set(key, entry);

    this.stats.sets++;
    if (wasNew) {
      this.stats.size++;
    }
  }

  /**
   * Delete specific cache entry
   */
  delete(type: string, userId: string, params?: Record<string, any>): boolean {
    const key = this.generateKey(type, userId, params);
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.stats.deletes++;
      this.stats.size--;
    }

    return deleted;
  }

  /**
   * Invalidate all cache entries for a user
   */
  invalidateUser(userId: string): number {
    let deletedCount = 0;

    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(`:${userId}`)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    this.stats.size -= deletedCount;

    return deletedCount;
  }

  /**
   * Invalidate cache entries by type for a user
   */
  invalidateUserType(type: string, userId: string): number {
    let deletedCount = 0;
    const prefix = `${type}:${userId}`;

    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    this.stats.size -= deletedCount;

    return deletedCount;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let deletedCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    this.stats.size -= deletedCount;

    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get cache size in entries
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
const productivityCache = new ProductivityCache();

/**
 * Cache wrapper functions for specific productivity data types
 */

export const NotesCache = {
  get: (userId: string, params?: Record<string, any>) =>
    productivityCache.get('notes', userId, params),

  set: (userId: string, data: any, params?: Record<string, any>) =>
    productivityCache.set('notes', userId, data, params),

  invalidate: (userId: string) =>
    productivityCache.invalidateUserType('notes', userId),

  delete: (userId: string, params?: Record<string, any>) =>
    productivityCache.delete('notes', userId, params)
};

export const EventsCache = {
  get: (userId: string, params?: Record<string, any>) =>
    productivityCache.get('events', userId, params),

  set: (userId: string, data: any, params?: Record<string, any>) =>
    productivityCache.set('events', userId, data, params),

  invalidate: (userId: string) =>
    productivityCache.invalidateUserType('events', userId),

  delete: (userId: string, params?: Record<string, any>) =>
    productivityCache.delete('events', userId, params)
};

export const BoardsCache = {
  get: (userId: string, params?: Record<string, any>) =>
    productivityCache.get('boards', userId, params),

  set: (userId: string, data: any, params?: Record<string, any>) =>
    productivityCache.set('boards', userId, data, params),

  invalidate: (userId: string) =>
    productivityCache.invalidateUserType('boards', userId),

  delete: (userId: string, params?: Record<string, any>) =>
    productivityCache.delete('boards', userId, params)
};

export const TasksCache = {
  get: (userId: string, params?: Record<string, any>) =>
    productivityCache.get('tasks', userId, params),

  set: (userId: string, data: any, params?: Record<string, any>) =>
    productivityCache.set('tasks', userId, data, params),

  invalidate: (userId: string) =>
    productivityCache.invalidateUserType('tasks', userId),

  delete: (userId: string, params?: Record<string, any>) =>
    productivityCache.delete('tasks', userId, params)
};

export const SearchCache = {
  get: (userId: string, params?: Record<string, any>) =>
    productivityCache.get('search', userId, params),

  set: (userId: string, data: any, params?: Record<string, any>) =>
    productivityCache.set('search', userId, data, params),

  invalidate: (userId: string) =>
    productivityCache.invalidateUserType('search', userId),

  delete: (userId: string, params?: Record<string, any>) =>
    productivityCache.delete('search', userId, params)
};

export const CountsCache = {
  get: (userId: string, params?: Record<string, any>) =>
    productivityCache.get('counts', userId, params),

  set: (userId: string, data: any, params?: Record<string, any>) =>
    productivityCache.set('counts', userId, data, params),

  invalidate: (userId: string) =>
    productivityCache.invalidateUserType('counts', userId),

  delete: (userId: string, params?: Record<string, any>) =>
    productivityCache.delete('counts', userId, params)
};

/**
 * Cache management utilities
 */
export const CacheManager = {
  /**
   * Get cache statistics
   */
  getStats: () => productivityCache.getStats(),

  /**
   * Clear expired entries
   */
  clearExpired: () => productivityCache.clearExpired(),

  /**
   * Clear all cache
   */
  clearAll: () => productivityCache.clear(),

  /**
   * Invalidate all cache for a user
   */
  invalidateUser: (userId: string) => productivityCache.invalidateUser(userId),

  /**
   * Get cache size
   */
  getSize: () => productivityCache.size(),

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanup: (intervalMs: number = 5 * 60 * 1000) => {
    return setInterval(() => {
      const deleted = productivityCache.clearExpired();
      if (deleted > 0) {
        console.log(`Cache cleanup: removed ${deleted} expired entries`);
      }
    }, intervalMs);
  }
};

/**
 * Cache decorator for async functions
 */
export function withCache<T extends any[], R>(
  cacheType: string,
  keyGenerator: (...args: T) => { userId: string; params?: Record<string, any> },
  ttl?: number
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: T): Promise<R> {
      const { userId, params } = keyGenerator(...args);

      // Try to get from cache first
      const cached = productivityCache.get<R>(cacheType, userId, params);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);

      // Cache the result
      productivityCache.set(cacheType, userId, result, params, ttl);

      return result;
    };
  };
}

export default productivityCache;