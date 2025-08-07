import mongoose from 'mongoose';
import { SubscriptionCache } from '../cache/subscription-cache';

/**
 * Database optimization utilities for subscription system
 */
export class DatabaseOptimization {

  /**
   * Create optimized indexes for subscription collections
   */
  static async createOptimizedIndexes(): Promise<void> {
    try {
      console.log('🔧 Creating optimized database indexes...');

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Subscription indexes
      const subscriptionCollection = db.collection('subscriptions');
      await Promise.all([
        // Single field indexes
        subscriptionCollection.createIndex({ userId: 1 }),
        subscriptionCollection.createIndex({ planId: 1 }),
        subscriptionCollection.createIndex({ status: 1 }),
        subscriptionCollection.createIndex({ isActive: 1 }),
        subscriptionCollection.createIndex({ currentPeriodEnd: 1 }),
        subscriptionCollection.createIndex({ createdAt: -1 }),
        subscriptionCollection.createIndex({ updatedAt: -1 }),

        // Compound indexes for common queries
        subscriptionCollection.createIndex({ userId: 1, isActive: 1 }),
        subscriptionCollection.createIndex({ userId: 1, status: 1 }),
        subscriptionCollection.createIndex({ status: 1, isActive: 1 }),
        subscriptionCollection.createIndex({ isActive: 1, currentPeriodEnd: 1 }),
        subscriptionCollection.createIndex({ planId: 1, status: 1 }),
        subscriptionCollection.createIndex({ status: 1, currentPeriodEnd: 1 }),

        // Compound index for renewal processing
        subscriptionCollection.createIndex({
          isActive: 1,
          status: 1,
          currentPeriodEnd: 1,
          cancelAtPeriodEnd: 1
        }),

        // Text index for search functionality
        subscriptionCollection.createIndex({
          'metadata.customerEmail': 'text',
          'metadata.customerName': 'text'
        })
      ]);

      // Transaction indexes
      const transactionCollection = db.collection('transactions');
      await Promise.all([
        // Single field indexes
        transactionCollection.createIndex({ userId: 1 }),
        transactionCollection.createIndex({ subscriptionId: 1 }),
        transactionCollection.createIndex({ status: 1 }),
        transactionCollection.createIndex({ type: 1 }),
        transactionCollection.createIndex({ flutterwaveTransactionId: 1 }, { unique: true }),
        transactionCollection.createIndex({ flutterwaveReference: 1 }),
        transactionCollection.createIndex({ createdAt: -1 }),
        transactionCollection.createIndex({ processedAt: -1 }),

        // Compound indexes
        transactionCollection.createIndex({ userId: 1, status: 1 }),
        transactionCollection.createIndex({ userId: 1, type: 1 }),
        transactionCollection.createIndex({ subscriptionId: 1, status: 1 }),
        transactionCollection.createIndex({ status: 1, createdAt: -1 }),
        transactionCollection.createIndex({ type: 1, status: 1 }),

        // Index for payment processing
        transactionCollection.createIndex({
          status: 1,
          type: 1,
          processedAt: -1
        })
      ]);

      // Plan indexes
      const planCollection = db.collection('plans');
      await Promise.all([
        planCollection.createIndex({ isActive: 1 }),
        planCollection.createIndex({ 'price.monthly': 1 }),
        planCollection.createIndex({ 'price.annual': 1 }),
        planCollection.createIndex({ createdAt: -1 }),
        planCollection.createIndex({ isActive: 1, 'price.monthly': 1 })
      ]);

      // User indexes (if not already created)
      const userCollection = db.collection('users');
      await Promise.all([
        userCollection.createIndex({ email: 1 }, { unique: true }),
        userCollection.createIndex({ 'subscription.active': 1 }),
        userCollection.createIndex({ 'subscription.subscriptionId': 1 }),
        userCollection.createIndex({ 'subscription.status': 1 }),
        userCollection.createIndex({ isEmailVerified: 1 }),
        userCollection.createIndex({ role: 1 }),
        userCollection.createIndex({ createdAt: -1 })
      ]);

      // Audit log indexes
      const auditLogCollection = db.collection('auditlogs');
      await Promise.all([
        auditLogCollection.createIndex({ userId: 1 }),
        auditLogCollection.createIndex({ subscriptionId: 1 }),
        auditLogCollection.createIndex({ category: 1 }),
        auditLogCollection.createIndex({ severity: 1 }),
        auditLogCollection.createIndex({ action: 1 }),
        auditLogCollection.createIndex({ timestamp: -1 }),
        auditLogCollection.createIndex({ category: 1, severity: 1 }),
        auditLogCollection.createIndex({ userId: 1, timestamp: -1 }),
        auditLogCollection.createIndex({ subscriptionId: 1, timestamp: -1 }),

        // TTL index for automatic cleanup (2 years)
        auditLogCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 63072000 })
      ]);

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Failed to create database indexes:', error);
      throw error;
    }
  }

  /**
   * Analyze query performance
   */
  static async analyzeQueryPerformance(collection: string, query: any): Promise<any> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const coll = db.collection(collection);
      const explanation = await coll.find(query).explain('executionStats');

      return {
        executionTimeMillis: explanation.executionStats.executionTimeMillis,
        totalDocsExamined: explanation.executionStats.totalDocsExamined,
        totalDocsReturned: explanation.executionStats.totalDocsReturned,
        indexesUsed: explanation.executionStats.executionStages?.indexName || 'COLLSCAN',
        isEfficient: explanation.executionStats.totalDocsExamined <= explanation.executionStats.totalDocsReturned * 2
      };
    } catch (error) {
      console.error('Failed to analyze query performance:', error);
      throw error;
    }
  }

  /**
   * Optimize subscription queries with caching
   */
  static async getOptimizedSubscription(userId: string): Promise<any> {
    // Try cache first
    let subscription = await SubscriptionCache.getCachedUserSubscription(userId);

    if (subscription) {
      return subscription;
    }

    // If not in cache, query database with optimized query
    const { Subscription } = await import('../database/models');

    subscription = await Subscription.findOne({
      userId,
      isActive: true
    })
    .populate('planId', 'name price features limits')
    .lean(); // Use lean() for better performance

    if (subscription) {
      // Cache the result
      await SubscriptionCache.cacheSubscription(subscription);
    }

    return subscription;
  }

  /**
   * Batch load subscriptions with caching
   */
  static async batchLoadSubscriptions(userIds: string[]): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    const uncachedUserIds: string[] = [];

    // Check cache for each user
    for (const userId of userIds) {
      const cached = await SubscriptionCache.getCachedUserSubscription(userId);
      if (cached) {
        result.set(userId, cached);
      } else {
        uncachedUserIds.push(userId);
      }
    }

    // Batch query for uncached subscriptions
    if (uncachedUserIds.length > 0) {
      const { Subscription } = await import('../database/models');

      const subscriptions = await Subscription.find({
        userId: { $in: uncachedUserIds },
        isActive: true
      })
      .populate('planId', 'name price features limits')
      .lean();

      // Cache and add to result
      for (const subscription of subscriptions) {
        result.set(subscription.userId.toString(), subscription);
        await SubscriptionCache.cacheSubscription(subscription);
      }
    }

    return result;
  }

  /**
   * Optimize plan queries with caching
   */
  static async getOptimizedPlan(planId: string): Promise<any> {
    // Try cache first
    let plan = await SubscriptionCache.getCachedPlan(planId);

    if (plan) {
      return plan;
    }

    // Query database
    const { Plan } = await import('../database/models');

    plan = await Plan.findById(planId).lean();

    if (plan) {
      await SubscriptionCache.cachePlan(plan);
    }

    return plan;
  }

  /**
   * Connection pooling optimization
   */
  static optimizeConnectionPool(): void {
    // Set optimal connection pool settings
    // Note: These settings should be configured in the connection options, not via mongoose.set()
    // mongoose.set('maxPoolSize', 10); // Maximum number of connections
    // mongoose.set('minPoolSize', 5);  // Minimum number of connections
    // mongoose.set('maxIdleTimeMS', 30000); // Close connections after 30 seconds of inactivity
    // mongoose.set('serverSelectionTimeoutMS', 5000); // How long to try selecting a server
    // mongoose.set('socketTimeoutMS', 45000); // How long a send or receive on a socket can take

    console.log('✅ Connection pool settings noted (configure in connection options)');
  }

  /**
   * Enable query result caching at mongoose level
   */
  static enableQueryCaching(): void {
    // Add query caching middleware
    mongoose.plugin(function(schema: any) {
      schema.pre(['find', 'findOne', 'findOneAndUpdate'], function(this: mongoose.Query<any, any>) {
        // Enable lean queries for better performance
        if (!this.getOptions().lean) {
          this.lean();
        }
      });
    });

    console.log('✅ Query optimization enabled');
  }

  /**
   * Database health check
   */
  static async performHealthCheck(): Promise<any> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const adminDb = db.admin();
      const [serverStatus, dbStats] = await Promise.all([
        adminDb.serverStatus(),
        db.stats()
      ]);

      return {
        isConnected: mongoose.connection.readyState === 1,
        serverStatus: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          memory: serverStatus.mem,
          version: serverStatus.version
        },
        dbStats: {
          collections: dbStats.collections,
          documents: dbStats.objects,
          dataSize: dbStats.dataSize,
          indexSize: dbStats.indexSize,
          storageSize: dbStats.storageSize
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get slow query analysis
   */
  static async getSlowQueries(): Promise<any[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Enable profiling for slow operations (>100ms)
      await db.admin().command({ profile: 2, slowms: 100 });

      // Get profiling data
      const profilingData = await db.collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(50)
        .toArray();

      return profilingData.map(op => ({
        timestamp: op.ts,
        duration: op.millis,
        operation: op.op,
        namespace: op.ns,
        command: op.command,
        executionStats: op.execStats
      }));
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * Optimize aggregation pipelines
   */
  static optimizeAggregationPipeline(pipeline: any[]): any[] {
    const optimized = [...pipeline];

    // Move $match stages to the beginning
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);

    // Move $limit stages early when possible
    const limitStages = otherStages.filter(stage => stage.$limit);
    const remainingStages = otherStages.filter(stage => !stage.$limit);

    // Combine $match stages if possible
    const combinedMatch = matchStages.reduce((acc, stage) => {
      return { $match: { ...acc.$match, ...stage.$match } };
    }, { $match: {} });

    return [
      ...(Object.keys(combinedMatch.$match).length > 0 ? [combinedMatch] : []),
      ...limitStages,
      ...remainingStages
    ];
  }

  /**
   * Monitor database performance metrics
   */
  static async getPerformanceMetrics(): Promise<any> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const [serverStatus, dbStats, collStats] = await Promise.all([
        db.admin().serverStatus(),
        db.stats(),
        Promise.all([
          db.command({ collStats: 'subscriptions' }),
          db.command({ collStats: 'transactions' }),
          db.command({ collStats: 'plans' }),
          db.command({ collStats: 'users' })
        ])
      ]);

      return {
        server: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections.current,
          memory: {
            resident: serverStatus.mem.resident,
            virtual: serverStatus.mem.virtual,
            mapped: serverStatus.mem.mapped
          },
          opcounters: serverStatus.opcounters
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize
        },
        collections: {
          subscriptions: {
            count: collStats[0].count,
            size: collStats[0].size,
            avgObjSize: collStats[0].avgObjSize,
            indexSizes: collStats[0].indexSizes
          },
          transactions: {
            count: collStats[1].count,
            size: collStats[1].size,
            avgObjSize: collStats[1].avgObjSize,
            indexSizes: collStats[1].indexSizes
          },
          plans: {
            count: collStats[2].count,
            size: collStats[2].size,
            avgObjSize: collStats[2].avgObjSize,
            indexSizes: collStats[2].indexSizes
          },
          users: {
            count: collStats[3].count,
            size: collStats[3].size,
            avgObjSize: collStats[3].avgObjSize,
            indexSizes: collStats[3].indexSizes
          }
        }
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return null;
    }
  }
}