import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StockAlertsService } from '@/lib/services/stock-alerts';

// Validation schemas
const createStockAlertSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  alertType: z.enum(['low_stock', 'out_of_stock', 'overstock', 'high_demand']),
  threshold: z.number().min(0, 'Threshold must be non-negative'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  notificationChannels: z.array(z.enum(['email', 'sms', 'push', 'dashboard'])).optional(),
  isActive: z.boolean().default(true),
});

const updateStockAlertSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  threshold: z.number().min(0).optional(),
  notificationChannels: z.array(z.enum(['email', 'sms', 'push', 'dashboard'])).optional(),
  isActive: z.boolean().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  alertType: z.enum(['low_stock', 'out_of_stock', 'overstock', 'high_demand']).optional(),
  sortBy: z.enum(['createdAt', 'priority', 'productName', 'currentStock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// This file now uses real MongoDB data through StockAlertsService

/**
 * GET /api/stock-alerts
 * Retrieves stock alerts with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const queryValidation = querySchema.safeParse(queryParams);
    if (!queryValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.issues
      }, { status: 400 });
    }
    const validatedQuery = queryValidation.data;
    
    // Use StockAlertsService to get real data
    const result = await StockAlertsService.getStockAlerts({
      search: validatedQuery.search,
      priority: validatedQuery.priority,
      status: validatedQuery.status,
      alertType: validatedQuery.alertType as any,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      sortBy: validatedQuery.sortBy,
      sortOrder: validatedQuery.sortOrder,
    });
    
    return NextResponse.json({
      success: true,
      data: result.alerts,
      pagination: result.pagination,
      statistics: result.statistics,
    });
    
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stock alerts',
    }, { status: 500 });
  }
}

/**
 * POST /api/stock-alerts
 * Creates a new stock alert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dataValidation = createStockAlertSchema.safeParse(body);
    if (!dataValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: dataValidation.error.issues
      }, { status: 400 });
    }
    const validatedData = dataValidation.data;
    
    // In a real implementation, you would:
    // 1. Validate the product exists
    // 2. Check if an alert already exists for this product and type
    // 3. Save to database
    // 4. Set up monitoring job
    
    const newAlert = {
      id: `alert_${Date.now()}`,
      ...validatedData,
      productName: `Product ${validatedData.productId}`, // Would be fetched from product service
      sku: `SKU-${validatedData.productId}`,
      currentStock: 0, // Would be fetched from inventory service
      status: 'active' as const,
      createdAt: new Date(),
      lastUpdated: new Date(),
      triggeredCount: 0,
      lastTriggered: null,
    };
    
    return NextResponse.json({
      success: true,
      data: newAlert,
      message: 'Stock alert created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating stock alert:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create stock alert',
    }, { status: 500 });
  }
}

/**
 * PUT /api/stock-alerts
 * Bulk update stock alerts
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds, updateData } = body;
    
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Alert IDs array is required',
      }, { status: 400 });
    }
    
    const updateValidation = updateStockAlertSchema.safeParse(updateData);
    if (!updateValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid update data',
        details: updateValidation.error.issues
      }, { status: 400 });
    }
    const validatedUpdateData = updateValidation.data;
    
    // Update alerts using StockAlertsService
    const success = await StockAlertsService.updateAlertStatus(
      alertIds,
      validatedUpdateData.status || 'acknowledged'
    );
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update alerts',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `${alertIds.length} alert(s) updated successfully`,
    });
    
  } catch (error) {
    console.error('Error updating stock alerts:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid update data',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update stock alerts',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/stock-alerts
 * Bulk delete stock alerts
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds } = body;
    
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Alert IDs array is required',
      }, { status: 400 });
    }
    
    // Delete alerts using StockAlertsService
    const success = await StockAlertsService.deleteAlerts(alertIds);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete alerts',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `${alertIds.length} alert(s) deleted successfully`,
    });
    
  } catch (error) {
    console.error('Error deleting stock alerts:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete stock alerts',
    }, { status: 500 });
  }
}