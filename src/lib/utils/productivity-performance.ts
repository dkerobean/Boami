import { FilterQuery, SortOrder } from 'mongoose';
import { NotesCache, EventsCache, BoardsCache, TasksCache, CountsCache } from './productivity-cache';

/**
 * Performance optimization utilities for productivity features
 */

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface QueryOptimizationOptions {
  useCache?: boolean;
  cacheTtl?: number;
  lean?: boolean;
  select?: string;
  populate?: string | string[];
}

/**
 * Validate and normalize pagination parameters
 */
export function validatePagination(options: Partial<PaginationOptions>): PaginationOptions {
  const page = Math.max(1, parseInt(String(options.page || 1)));
  const limit = Math.min(100, Math.max(1, parseInt(String(options.limit || 10))));
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';

  return { page, limit, sortBy, sortOrder };
}

/**
 * Create pagination result object
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginationResult<T> {
  const pages = Math.ceil(total / options.limit);

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages,
      hasNext: options.page < pages,
      hasPrev: options.page > 1
    }
  };
}

/**
 * Generate cache key for paginated queries
 */
export function generatePaginationCacheKey(
  userId: string,
  options: PaginationOptions,
  filters?: Record<string, any>
): Record<string, any> {
  return {
    page: options.page,
    limit: options.limit,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
    ...filters
  };
}

/**
 * Optimized query builder for productivity models
 */
export class ProductivityQueryBuilder<T> {
  prate model: any;
  private query: FilterQuery<T> = {};
  private sortOptions: Record<string, SortOrder> = {};
  private selectFields?: string;
  private populateFields?: string | string[];
  private isLean = false;

  constructor(model: any) {
    this.model = model;
  }

  /**
   * Add user filter (always required for productivity data)
   */
  forUser(userId: string): this {
    this.query.userId = userId;
    return this;
  }

  /**
   * Add filters to the query
   */
  where(filters: FilterQuery<T>): this {
    Object.assign(this.query, filters);
    return this;
  }

  /**
   * Set sorting options
   */
  sort(field: string, order: 'asc' | 'desc' = 'desc'): this {
    this.sortOptions[field] = order === 'asc' ? 1 : -1;
    return this;
  }

  /**
   * Select specific fields
   */
  select(fields: string): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * Populate related fields
   */
  populate(fields: string | string[]): this {
    this.populateFields = fields;
    return this;
  }

  /**
   * Use lean queries for better performance
   */
  lean(): this {
    this.isLean = true;
    return this;
  }

  /**
   * Execute paginated query
   */
  async paginate(options: PaginationOptions): Promise<PaginationResult<T>> {
    const { page, limit, sortBy, sortOrder } = validatePagination(options);

    // Set default sorting if not specified
    if (Object.keys(this.sortOptions).length === 0) {
      this.sort(sortBy, sortOrder);
    }

    const skip = (page - 1) * limit;

    // Build the query
    let query = this.model.find(this.query);

    if (this.selectFields) {
      query = query.select(this.selectFields);
    }

    if (this.populateFields) {
      if (Array.isArray(this.populateFields)) {
        this.populateFields.forEach(field => {
          query = query.populate(field);
        });
      } else {
        query = query.populate(this.populateFields);
      }
    }

    if (this.isLean) {
      query = query.lean();
    }

    // Execute query with pagination
    const [data, total] = await Promise.all([
      query.sort(this.sortOptions).skip(skip).limit(limit).exec(),
      this.model.countDocuments(this.query)
    ]);

    return createPaginationResult(data, total, { page, limit, sortBy, sortOrder });
  }

  /**
   * Execute query without pagination
   */
  async exec(): Promise<T[]> {
    let query = this.model.find(this.query);

    if (this.selectFields) {
      query = query.select(this.selectFields);
    }

    if (this.populateFields) {
      if (Array.isArray(this.populateFields)) {
        this.populateFields.forEach(field => {
          query = query.populate(field);
        });
      } else {
        query = query.populate(this.populateFields);
      }
    }

    if (this.isLean) {
      query = query.lean();
    }

    if (Object.keys(this.sortOptions).length > 0) {
      query = query.sort(this.sortOptions);
    }

    return query.exec();
  }

  /**
   * Get count of matching documents
   */
  async count(): Promise<number> {
    return this.model.countDocuments(this.query);
  }
}

/**
 * Cached query executor for productivity data
 */
export class CachedProductivityQuery<T> {
  private cacheType: string;
  private queryBuilder: ProductivityQueryBuilder<T>;
  private userId: string;
  private cacheTtl?: number;

  constructor(
    cacheType: string,
    queryBuilder: ProductivityQueryBuilder<T>,
    userId: string,
    cacheTtl?: number
  ) {
    this.cacheType = cacheType;
    this.queryBuilder = queryBuilder;
    this.userId = userId;
    this.cacheTtl = cacheTtl;
  }

  /**
   * Execute paginated query with caching
   */
  async paginate(options: PaginationOptions): Promise<PaginationResult<T>> {
    const cacheKey = generatePaginationCacheKey(this.userId, options);

    // Try cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await this.queryBuilder.paginate(options);

    // Cache result
    this.setCachedResult(cacheKey, result);

    return result;
  }

  /**
   * Execute query with caching
   */
  async exec(): Promise<T[]> {
    const cacheKey = { query: 'exec' };

    // Try cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await this.queryBuilder.exec();

    // Cache result
    this.setCachedResult(cacheKey, result);

    return result;
  }

  /**
   * Get count with caching
   */
  async count(): Promise<number> {
    const cacheKey = { query: 'count' };

    // Try cache first
    const cached = CountsCache.get(this.userId, cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await this.queryBuilder.count();

    // Cache result
    CountsCache.set(this.userId, result, cacheKey);

    return result;
  }

  private getCachedResult(cacheKey: Record<string, any>): any {
    switch (this.cacheType) {
      case 'notes':
        return NotesCache.get(this.userId, cacheKey);
      case 'events':
        return EventsCache.get(this.userId, cacheKey);
      case 'boards':
        return BoardsCache.get(this.userId, cacheKey);
      case 'tasks':
        return TasksCache.get(this.userId, cacheKey);
      default:
        return null;
    }
  }

  private setCachedResult(cacheKey: Record<string, any>, result: any): void {
    switch (this.cacheType) {
      case 'notes':
        NotesCache.set(this.userId, result, cacheKey);
        break;
      case 'events':
        EventsCache.set(this.userId, result, cacheKey);
        break;
      case 'boards':
        BoardsCache.set(this.userId, result, cacheKey);
        break;
      case 'tasks':
        TasksCache.set(this.userId, result, cacheKey);
        break;
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  /**
   * Start timing an operation
   */
  static start(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  /**
   * End timing and get duration
   */
  static end(operationId: string): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);
    return duration;
  }

  /**
   * Time an async operation
   */
  static async time<T>(operationId: string, operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(operationId);
    const result = await operation();
    const duration = this.end(operationId);

    return { result, duration };
  }

  /**
   * Log slow queries (over threshold)
   */
  static logSlowQuery(operationId: string, duration: number, threshold: number = 1000): void {
    if (duration > threshold) {
      console.warn(`Slow query detected: ${operationId} took ${duration}ms`);
    }
  }
}

/**
 * Batch operation utilities for better performance
 */
export class BatchOperations {
  /**
   * Batch create multiple documents
   */
  static async batchCreate<T>(model: any, documents: T[], batchSize: number = 100): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await model.insertMany(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Batch update multiple documents
   */
  static async batchUpdate(
    model: any,
    updates: Array<{ filter: any; update: any }>,
    batchSize: number = 100
  ): Promise<number> {
    let totalModified = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const bulkOps = batch.map(({ filter, update }) => ({
        updateOne: { filter, update }
      }));

      const result = await model.bulkWrite(bulkOps);
      totalModified += result.modifiedCount || 0;
    }

    return totalModified;
  }

  /**
   * Batch delete multiple documents
   */
  static async batchDelete(
    model: any,
    filters: any[],
    batchSize: number = 100
  ): Promise<number> {
    let totalDeleted = 0;

    for (let i = 0; i < filters.length; i += batchSize) {
      const batch = filters.slice(i, i + batchSize);
      const bulkOps = batch.map(filter => ({
        deleteOne: { filter }
      }));

      const result = await model.bulkWrite(bulkOps);
      totalDeleted += result.deletedCount || 0;
    }

    return totalDeleted;
  }
}

/**
 * Database connection optimization utilities
 */
export class ConnectionOptimizer {
  /**
   * Optimize MongoDB connection for productivity workloads
   */
  static getOptimizedConnectionOptions() {
    return {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      readPreference: 'primaryPreferred',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 5000
      }
    };
  }

  /**
   * Get read-optimized connection options for queries
   */
  static getReadOptimizedOptions() {
    return {
      readPreference: 'secondaryPreferred',
      readConcern: { level: 'local' }
    };
  }
}

export {
  ProductivityQueryBuilder,
  CachedProductivityQuery,
  PerformanceMonitor,
  BatchOperations,
  ConnectionOptimizer
};