import { DatabaseOptimization } from './database-optimization';
import { OptimizedSubscriptionService } from '../services/OptimizedSubscriptionService';
import { SubscriptionCache } from '../cache/subscription-cache';
import RedisClient from '../cache/redis-client';
import { connectToDatabase } from '../database/mongoose-connection';

/**
 * System startup utilities for performance optimization
 */
export class SystemStartup {
  private static initialized = false;
  private static config: any = null;

  /**
   * Initialize system on startup
   */
  static async initialize(config?: any): Promise<void> {
    console.log('🚀 Initializing subscription system...');

    try {
      // Store config
      this.config = config;

      // Connect to database
      await this.initializeDatabase();

      // Initialize cache
      await this.initializeCache();

      // Optimize database
      await this.optimizeDatabase();

      // Warm up cache
      await this.warmUpCache();

      // Mark as initialized
      this.initialized = true;

      console.log('✅ Subscription system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize subscription system:', error);
      throw error;
    }
  }

  /**
   * Initbase connection and optimization
   */
  private static async initializeDatabase(): Promise<void> {
    try {
      console.log('🔌 Connecting to database...');
      await connectToDatabase();

      // Optimize connection pool
      DatabaseOptimization.optimizeConnectionPool();

      // Enable query caching
      DatabaseOptimization.enableQueryCaching();

      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize cache system
   */
  private static async initializeCache(): Promise<void> {
    try {
      console.log('🗄️ Initializing cache system...');

      // Test Redis connection
      const isConnected = await RedisClient.testConnection();

      if (isConnected) {
        console.log('✅ Cache system connected');
      } else {
        console.warn('⚠️ Cache system not available - running without cache');
      }
    } catch (error) {
      console.warn('⚠️ Cache initialization failed - running without cache:', error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error));
      // Don't throw error - system can run without cache
    }
  }

  /**
   * Optimize database indexes and queries
   */
  private static async optimizeDatabase(): Promise<void> {
    try {
      console.log('⚡ Optimizing database...');

      // Create optimized indexes
      await DatabaseOptimization.createOptimizedIndexes();

      console.log('✅ Database optimized');
    } catch (error) {
      console.warn('⚠️ Database optimization failed:', error instanceof Error ? error.message : String(error));
      // Don't throw error - system can run without optimization
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  private static async warmUpCache(): Promise<void> {
    try {
      console.log('🔥 Warming up cache...');

      // Check if cache is available
      if (!RedisClient.isRedisConnected()) {
        console.log('⚠️ Cache not available - skipping cache warm-up');
        return;
      }

      // Warm up subscription cache
      await SubscriptionCache.warmUpCache();

      // Preload frequently accessed data
      await OptimizedSubscriptionService.preloadFrequentData();

      console.log('✅ Cache warmed up');
    } catch (error) {
      console.warn('⚠️ Cache warm-up failed:', error instanceof Error ? error.message : String(error));
      // Don't throw error - system can run without cache
    }
  }

  /**
   * Perform health checks
   */
  static async performHealthChecks(): Promise<any> {
    console.log('🏥 Performing health checks...');

    const results = {
      database: { healthy: false, error: null as string | null },
      cache: { healthy: false, error: null as string | null },
      overall: { healthy: false }
    };

    try {
      // Database health check
      const dbHealth = await DatabaseOptimization.performHealthCheck();
      results.database.healthy = dbHealth.isConnected;
      if (!dbHealth.isConnected) {
        results.database.error = dbHealth.error;
      }
    } catch (error) {
      results.database.error = error instanceof Error ? error.message : String(error);
    }

    try {
      // Cache health check
      results.cache.healthy = await RedisClient.testConnection();
    } catch (error) {
      results.cache.error = error instanceof Error ? error.message : String(error);
    }

    // Overall health
    results.overall.healthy = results.database.healthy;

    if (results.overall.healthy) {
      console.log('✅ Health checks passed');
    } else {
      console.warn('⚠️ Health checks failed:', results);
    }

    return results;
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    console.log('🛑 Shutting down subscription system...');

    try {
      // Close Redis connection
      await RedisClient.disconnect();

      // Close database connection
      const mongoose = await import('mongoose');
      await mongoose.connection.close();

      // Mark as not initialized
      this.initialized = false;
      this.config = null;

      console.log('✅ Subscription system shut down gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Setup periodic maintenance tasks
   */
  static setupMaintenanceTasks(): void {
    console.log('🔧 Setting up maintenance tasks...');

    // Cache cleanup every hour
    setInterval(async () => {
      try {
        console.log('🧹 Running cache maintenance...');

        // Get cache stats
        const stats = await SubscriptionCache.getCacheStats();
        console.log('📊 Cache stats:', stats);

        // Clear expired entries (Redis handles this automatically, but we can log it)
        console.log('✅ Cache maintenance completed');
      } catch (error) {
        console.error('❌ Cache maintenance failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Database health check every 30 minutes
    setInterval(async () => {
      try {
        console.log('🏥 Running database health check...');

        const health = await DatabaseOptimization.performHealthCheck();
        if (!health.isConnected) {
          console.error('❌ Database health check failed:', health.error);
        } else {
          console.log('✅ Database health check passed');
        }
      } catch (error) {
        console.error('❌ Database health check failed:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Performance metrics collection every 15 minutes
    setInterval(async () => {
      try {
        console.log('📊 Collecting performance metrics...');

        const metrics = await DatabaseOptimization.getPerformanceMetrics();
        if (metrics) {
          // Log key metrics
          console.log('📊 Performance metrics:', {
            connections: metrics.server?.connections,
            memory: metrics.server?.memory?.resident,
            collections: metrics.database?.collections,
            objects: metrics.database?.objects
          });
        }
      } catch (error) {
        console.error('❌ Performance metrics collection failed:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    console.log('✅ Maintenance tasks set up');
  }

  /**
   * Check if system is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get initialization status and config
   */
  static getStatus(): any {
    return {
      initialized: this.initialized,
      config: this.config,
      timestamp: new Date()
    };
  }

  /**
   * Get system status
   */
  static async getSystemStatus(): Promise<any> {
    try {
      const [healthChecks, cacheStats, dbMetrics] = await Promise.all([
        this.performHealthChecks(),
        SubscriptionCache.getCacheStats().catch(() => null),
        DatabaseOptimization.getPerformanceMetrics().catch(() => null)
      ]);

      return {
        healthy: healthChecks.overall.healthy,
        components: {
          database: healthChecks.database,
          cache: healthChecks.cache
        },
        metrics: {
          cache: cacheStats,
          database: dbMetrics
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Initialize system with error handling
   */
  static async safeInitialize(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      console.error('❌ System initialization failed:', error);

      // Try to initialize with minimal requirements
      try {
        console.log('🔄 Attempting minimal initialization...');
        await connectToDatabase();
        console.log('✅ Minimal initialization successful');
        return true;
      } catch (minimalError) {
        console.error('❌ Minimal initialization failed:', minimalError);
        return false;
      }
    }
  }
}

// Handle process signals for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('📡 Received SIGTERM signal');
    await SystemStartup.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📡 Received SIGINT signal');
    await SystemStartup.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught exception:', error);
    await SystemStartup.shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    await SystemStartup.shutdown();
    process.exit(1);
  });
}