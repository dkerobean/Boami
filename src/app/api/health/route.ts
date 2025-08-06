import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { subscriptionLogger } from '@/lib/utils/subscription-logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Basic health check response
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'unknown',
        memory: 'unknown',
        disk: 'unknown'
      },
      responseTime: 0
    };

    // Check database connectivity
    try {
      await connectToDatabase();

      // Simple database query to verify connection
      const mongoose = require('mongoose');
      await mongoose.connection.db.admin().ping();

      health.checks.database = 'healthy';
    } catch (dbError: any) {
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';

      subscriptionLogger.error('Database health check failed', {
        error: dbError.message
      });
    }

    // Check memory usage
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Consider memory unhealthy if heap usage is over 80% of total
      const heapUsagePercent = (memUsageMB.heapUsed / memUsageMB.heapTotal) * 100;

      health.checks.memory = heapUsagePercent > 80 ? 'warning' : 'healthy';

      // Add memory info to response
      (health as any).memory = {
        ...memUsageMB,
        heapUsagePercent: Math.round(heapUsagePercent)
      };

    } catch (memError: any) {
      health.checks.memory = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Check disk space (simplified check)
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      health.checks.disk = 'healthy'; // Simplified - in production you'd check actual disk usage
    } catch (diskError: any) {
      health.checks.disk = 'warning';
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime;

    // Determine overall status
    const unhealthyChecks = Object.values(health.checks).filter(status => status === 'unhealthy');
    const warningChecks = Object.values(health.checks).filter(status => status === 'warning');

    if (unhealthyChecks.length > 0) {
      health.status = 'unhealthy';
    } else if (warningChecks.length > 0) {
      health.status = 'warning';
    }

    // Log health check (only log warnings and errors to avoid spam)
    if (health.status !== 'healthy') {
      subscriptionLogger.warn('Health check status', {
        status: health.status,
        checks: health.checks,
        responseTime: health.responseTime
      });
    }

    // Return appropriate HTTP status code
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'warning' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error: any) {
    subscriptionLogger.error('Health check failed', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    // Quick database connectivity check
    await connectToDatabase();
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}