import {
  validatePagination,
  createPaginationResult,
  generatePaginationCacheKey,
  ProductivityQueryBuilder,
  PerformanceMonitor,
  BatchOperations
} from '@/lib/utils/productivity-performance';
import { CacheManager } from '@/lib/utils/productivity-cache';

// Mock model for testing
const mockModel = {
  find: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
  bulkWrite: jest.fn()
};

describe('Productivity Performance Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CacheManager.clearAll();
  });

  describe('validatePagination', () => {
    it('should validate and normalize pagination options', () => {
      const result = validatePagination({
        page: '2' as any,
        limit: '25' as any,
        sortBy: 'title',
        sortOrder: 'asc'
      });

      expect(result).toEqual({
        page: 2,
        limit: 25,
        sortBy: 'title',
        sortOrder: 'asc'
      });
    });

    it('should apply defaults for missing options', () => {
      const result = validatePagination({});

      expect(result).toEqual({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should enforce limits on page and limit values', () => {
      const result = validatePagination({
        page: -5,
        limit: 200
      });

      expect(result.page).toBe(1); // Minimum page is 1
      expect(result.limit).toBe(100); // Maximum limit is 100
    });
  });

  describe('createPaginationResult', () => {
    it('should create correct pagination result', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 25;
      const options = { page: 2, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };

      const result = createPaginationResult(data, total, options);

      expect(result).toEqual({
        data,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          pages: 3,
          hasNext: true,
          hasPrev: true
        }
      });
    });

    it('should handle first page correctly', () => {
      const data = [{ id: 1 }];
      const total = 5;
      const options = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };

      const result = createPaginationResult(data, total, options);

      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.pages).toBe(1);
    });
  });

  describe('generatePaginationCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const userId = 'user123';
      const options = { page: 1, limit: 10, sortBy: 'title', sortOrder: 'asc' as const };
      const filters = { color: 'blue', isDeleted: false };

      const key = generatePaginationCacheKey(userId, options, filters);

      expect(key).toEqual({
        page: 1,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
        color: 'blue',
        isDeleted: false
      });
    });
  });

  describe('ProductivityQueryBuilder', () => {
    let queryBuilder: ProductivityQueryBuilder<any>;

    beforeEach(() => {
      queryBuilder = new ProductivityQueryBuilder(mockModel);
    });

    it('should build query with user filter', () => {
      queryBuilder.forUser('user123');

      expect(queryBuilder['query']).toEqual({ userId: 'user123' });
    });

    it('should add where conditions', () => {
      queryBuilder
        .forUser('user123')
        .where({ color: 'blue', isDeleted: false });

      expect(queryBuilder['query']).toEqual({
        userId: 'user123',
        color: 'blue',
        isDeleted: false
      });
    });

    it('should set sorting options', () => {
      queryBuilder.sort('title', 'asc');

      expect(queryBuilder['sortOptions']).toEqual({ title: 1 });
    });

    it('should execute paginated query', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      mockModel.exec.mockResolvedValue(mockData);
      mockModel.countDocuments.mockResolvedValue(25);

      const result = await queryBuilder
        .forUser('user123')
        .paginate({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.data).toEqual(mockData);
      expect(result.pagination.total).toBe(25);
      expect(mockModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockModel.skip).toHaveBeenCalledWith(0);
      expect(mockModel.limit).toHaveBeenCalledWith(10);
    });

    it('should execute query without pagination', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      mockModel.exec.mockResolvedValue(mockData);

      const result = await queryBuilder
        .forUser('user123')
        .select('title content')
        .lean()
        .exec();

      expect(result).toEqual(mockData);
      expect(mockModel.select).toHaveBeenCalledWith('title content');
      expect(mockModel.lean).toHaveBeenCalled();
    });

    it('should get count of documents', async () => {
      mockModel.countDocuments.mockResolvedValue(42);

      const count = await queryBuilder
        .forUser('user123')
        .where({ isDeleted: false })
        .count();

      expect(count).toBe(42);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user123',
        isDeleted: false
      });
    });
  });

  describe('PerformanceMonitor', () => {
    it('should time operations correctly', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      const { result, duration } = await PerformanceMonitor.time('test-op', operation);

      expect(result).toBe('result');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(operation).toHaveBeenCalled();
    });

    it('should start and end timers', () => {
      PerformanceMonitor.start('test-timer');

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }

      const duration = PerformanceMonitor.end('test-timer');
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should return 0 for non-existent timer', () => {
      const duration = PerformanceMonitor.end('non-existent');
      expect(duration).toBe(0);
    });

    it('should log slow queries', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      PerformanceMonitor.logSlowQuery('slow-query', 2000, 1000);

      expect(consoleSpy).toHaveBeenCalledWith('Slow query detected: slow-query took 2000ms');

      consoleSpy.mockRestore();
    });

    it('should not log fast queries', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      PerformanceMonitor.logSlowQuery('fast-query', 500, 1000);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('BatchOperations', () => {
    it('should batch create documents', async () => {
      const documents = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      mockModel.insertMany.mockResolvedValue(documents.slice(0, 100));

      const result = await BatchOperations.batchCreate(mockModel, documents, 100);

      expect(mockModel.insertMany).toHaveBeenCalledTimes(3); // 250 / 100 = 3 batches
      expect(result).toHaveLength(300); // 3 batches * 100 results each
    });

    it('should batch update documents', async () => {
      const updates = Array.from({ length: 150 }, (_, i) => ({
        filter: { id: i },
        update: { name: `Updated ${i}` }
      }));

      mockModel.bulkWrite.mockResolvedValue({ modifiedCount: 100 });

      const totalModified = await BatchOperations.batchUpdate(mockModel, updates, 100);

      expect(mockModel.bulkWrite).toHaveBeenCalledTimes(2); // 150 / 100 = 2 batches
      expect(totalModified).toBe(200); // 2 batches * 100 modified each
    });

    it('should batch delete documents', async () => {
      const filters = Array.from({ length: 75 }, (_, i) => ({ id: i }));

      mockModel.bulkWrite.mockResolvedValue({ deletedCount: 50 });

      const totalDeleted = await BatchOperations.batchDelete(mockModel, filters, 50);

      expect(mockModel.bulkWrite).toHaveBeenCalledTimes(2); // 75 / 50 = 2 batches
      expect(totalDeleted).toBe(100); // 2 batches * 50 deleted each
    });
  });
});

describe('Performance Benchmarks', () => {
  describe('Cache Performance', () => {
    it('should demonstrate cache hit performance', async () => {
      const userId = 'benchmark-user';
      const testData = Array.from({ length: 1000 }, (_, i) => ({ id: i, title: `Item ${i}` }));

      // First access (cache miss)
      const { duration: missTime } = await PerformanceMonitor.time('cache-miss', async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 50));
        return testData;
      });

      // Cache the data
      const { NotesCache } = await import('@/lib/utils/productivity-cache');
      NotesCache.set(userId, testData);

      // Second access (cache hit)
      const { duration: hitTime } = await PerformanceMonitor.time('cache-hit', async () => {
        return NotesCache.get(userId);
      });

      expect(hitTime).toBeLessThan(missTime);
      expect(hitTime).toBeLessThan(10); // Cache hits should be very fast
    });

    it('should measure cache statistics', () => {
      const { NotesCache, CacheManager } = require('@/lib/utils/productivity-cache');

      // Perform some cache operations
      NotesCache.set('user1', { data: 'test1' });
      NotesCache.set('user2', { data: 'test2' });
      NotesCache.get('user1');
      NotesCache.get('user1'); // Hit
      NotesCache.get('user3'); // Miss

      const stats = CacheManager.getStats();

      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50); // 1 hit out of 2 total accesses
    });
  });

  describe('Query Performance', () => {
    it('should benchmark pagination performance', async () => {
      const queryBuilder = new ProductivityQueryBuilder(mockModel);

      // Mock large dataset
      const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      mockModel.exec.mockResolvedValue(mockData);
      mockModel.countDocuments.mockResolvedValue(10000);

      const { duration } = await PerformanceMonitor.time('pagination-query', async () => {
        return queryBuilder
          .forUser('benchmark-user')
          .where({ isDeleted: false })
          .lean()
          .paginate({ page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      });

      // Pagination should be reasonably fast
      expect(duration).toBeLessThan(100);
    });

    it('should benchmark batch operations', async () => {
      const documents = Array.from({ length: 1000 }, (_, i) => ({ id: i, title: `Doc ${i}` }));
      mockModel.insertMany.mockResolvedValue(documents);

      const { duration } = await PerformanceMonitor.time('batch-create', async () => {
        return BatchOperations.batchCreate(mockModel, documents, 100);
      });

      // Batch operations should be efficient
      expect(duration).toBeLessThan(500);
      expect(mockModel.insertMany).toHaveBeenCalledTimes(10); // 1000 / 100 = 10 batches
    });
  });

  describe('Memory Usage', () => {
    it('should monitor cache memory usage', () => {
      const { NotesCache, CacheManager } = require('@/lib/utils/productivity-cache');

      // Add data to cache
      for (let i = 0; i < 100; i++) {
        NotesCache.set(`user${i}`, {
          data: Array.from({ length: 100 }, (_, j) => ({ id: j, content: `Content ${j}` }))
        });
      }

      const stats = CacheManager.getStats();
      expect(stats.size).toBe(100);

      // Clear expired entries
      const cleared = CacheManager.clearExpired();
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });
});