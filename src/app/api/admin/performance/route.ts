import { NextRequest, NextResponse } from 'next/server';
import { DatabaseOptimization } from '@/lib/utils/database-optimization';
import { OptimizedSubscriptionService } from '@/lib/services/OptimizedSubscriptionService';
import { SubscriptionCache } from '@/lib/cache/subscription-cache';
import RedisClient from '@/lib/cache/redis-client';
import { verifyJWT } from '@/lib/auth/jwt';
import { User } from '@/lib/database/models';

/**
 * GET /api/admin/performance
 * Get system performance metrics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'overview';

    let result;

    switch (metric) {
      case 'database':
        result = await getDatabaseMetrics();
        break;

      case 'cache':
        result = await getCacheMetrics();
        break;

      case 'queries':
        result = await getQueryMetrics();
        break;

      case 'health':
        result = await getHealthMetrics();
        break;

      case 'overview':
      default:
        result = await getOverviewMetrics();
        break;
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Performance metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/performance
 * Perform performance operations (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, options = {} } = body;

    let result;

    switch (action) {
      case 'warm-cache':
        result = await OptimizedSubscriptionService.warmUpCache();
        break;

      case 'clear-cache':
        await SubscriptionCache.clearAllCache();
        result = { success: true, message: 'Cache cleared successfully' };
        break;

      case 'optimize-indexes':
        await DatabaseOptimization.createOptimizedIndexes();
        result = { success: true, message: 'Database indexes optimized' };
        break;

      case 'analyze-query':
        if (!options.collection || !options.query) {
          return NextResponse.json(
            { success: false, error: 'Collection and query are required' },
            { status: 400 }
          );
        }
        result = await DatabaseOptimization.analyzeQueryPerformance(
          options.collection,
          options.query
        );
        break;

      case 'preload-data':
        await OptimizedSubscriptionService.preloadFrequentData();
        result = { success: true, message: 'Frequent data preloaded' };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Performance operation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform operation' },
      { status: 500 }
    );
  }
}

/**
 * Get overview performance metrics
 */
async function getOverviewMetrics(): Promise<any> {
  const [dbMetrics, cacheMetrics, healthMetrics] = await Promise.all([
    getDatabaseMetrics(),
    getCacheMetrics(),
    getHealthMetrics()
  ]);

  return {
    database: dbMetrics,
    cache: cacheMetrics,
    health: healthMetrics,
    timestamp: new Date()
  };
}

/**
 * Get database performance metrics
 */
async function getDatabaseMetrics(): Promise<any> {
  try {
    const [performanceMetrics, healthCheck, slowQueries] = await Promise.all([
      DatabaseOptimization.getPerformanceMetrics(),
      DatabaseOptimization.performHealthCheck(),
      DatabaseOptimization.getSlowQueries()
    ]);

    return {
      performance: performanceMetrics,
      health: healthCheck,
      slowQueries: slowQueries.slice(0, 10), // Last 10 slow queries
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting database metrics:', error);
    return {
      error: (error as Error).message,
      timestamp: new Date()
    };
  }
}

/**
 * Get cache performance metrics
 */
async function getCacheMetrics(): Promise<any> {
  try {
    const [cacheStats, redisInfo, redisConnected] = await Promise.all([
      SubscriptionCache.getCacheStats(),
      RedisClient.getInfo(),
      RedisClient.testConnection()
    ]);

    return {
      stats: cacheStats,
      redis: {
        connected: redisConnected,
        info: redisInfo
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting cache metrics:', error);
    return {
      error: (error as Error).message,
      timestamp: new Date()
    };
  }
}

/**
 * Get query performance metrics
 */
async function getQueryMetrics(): Promise<any> {
  try {
    // Analyze common subscription queries
    const commonQueries = [
      {
        name: 'Active subscriptions by user',
        collection: 'subscriptions',
        query: { userId: 'sample', isActive: true }
      },
      {
        name: 'Subscriptions by status',
        collection: 'subscriptions',
        query: { status: 'active' }
      },
      {
        name: 'Transactions by user',
        collection: 'transactions',
        query: { userId: 'sample', status: 'successful' }
      }
    ];

    const queryAnalysis = await Promise.all(
      commonQueries.map(async (q) => {
        try {
          const analysis = await DatabaseOptimization.analyzeQueryPerformance(
            q.collection,
            q.query
          );
          return {
            name: q.name,
            collection: q.collection,
            query: q.query,
            analysis
          };
        } catch (error) {
          return {
            name: q.name,
            collection: q.collection,
            query: q.query,
            error: (error as Error).message
          };
        }
      })
    );

    return {
      commonQueries: queryAnalysis,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting query metrics:', error);
    return {
      error: (error as Error).message,
      timestamp: new Date()
    };
  }
}

/**
 * Get system health metrics
 */
async function getHealthMetrics(): Promise<any> {
  try {
    const startTime = Date.now();

    // Test database connection
    const dbHealthStart = Date.now();
    const dbHealth = await DatabaseOptimization.performHealthCheck();
    const dbResponseTime = Date.now() - dbHealthStart;

    // Test cache connection
    const cacheHealthStart = Date.now();
    const cacheHealth = await RedisClient.testConnection();
    const cacheResponseTime = Date.now() - cacheHealthStart;

    // Test subscription service
    const serviceHealthStart = Date.now();
    const serviceHealth = await testSubscriptionService();
    const serviceResponseTime = Date.now() - serviceHealthStart;

    const totalResponseTime = Date.now() - startTime;

    return {
      overall: {
        healthy: dbHealth.isConnected && cacheHealth && serviceHealth.success,
        responseTime: totalResponseTime
      },
      database: {
        healthy: dbHealth.isConnected,
        responseTime: dbResponseTime,
        details: dbHealth
      },
      cache: {
        healthy: cacheHealth,
        responseTime: cacheResponseTime
      },
      service: {
        healthy: serviceHealth.success,
        responseTime: serviceResponseTime,
        details: serviceHealth
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting health metrics:', error);
    return {
      overall: {
        healthy: false,
        error: (error as Error).message
      },
      timestamp: new Date()
    };
  }
}

/**
 * Test subscription service health
 */
async function testSubscriptionService(): Promise<any> {
  try {
    // Test cache metrics
    const cacheMetrics = await OptimizedSubscriptionService.getCacheMetrics();

    return {
      success: true,
      cacheMetrics: cacheMetrics.success ? cacheMetrics.metrics : null
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Verify admin authentication
 */
async function verifyAdminAuth(request: NextRequest): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  userId?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
        status: 401
      };
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJWT(token);

    if (!decoded || !decoded.userId) {
      return {
        success: false,
        error: 'Invalid token',
        status: 401
      };
    }

    // Check if user is admin
    const user = await User.findById(decoded.userId).populate('role');

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      };
    }

    if ((user.role as any)?.name !== 'admin') {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      };
    }

    return {
      success: true,
      userId: (user._id as any).toString()
    };

  } catch (error) {
    console.error('Admin auth verification error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 401
    };
  }
}