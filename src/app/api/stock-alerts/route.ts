import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

// Mock data for development
const mockStockAlerts = [
  {
    id: '1',
    productId: 'prod_001',
    productName: 'Premium Wireless Headphones',
    sku: 'WH-001',
    alertType: 'low_stock',
    priority: 'critical',
    currentStock: 2,
    threshold: 10,
    status: 'active',
    notificationChannels: ['email', 'dashboard'],
    isActive: true,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    lastUpdated: new Date('2024-01-15T10:30:00Z'),
    triggeredCount: 3,
    lastTriggered: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: '2',
    productId: 'prod_002',
    productName: 'Bluetooth Speaker',
    sku: 'SPK-002',
    alertType: 'out_of_stock',
    priority: 'critical',
    currentStock: 0,
    threshold: 5,
    status: 'active',
    notificationChannels: ['email', 'sms', 'dashboard'],
    isActive: true,
    createdAt: new Date('2024-01-14T09:15:00Z'),
    lastUpdated: new Date('2024-01-14T09:15:00Z'),
    triggeredCount: 1,
    lastTriggered: new Date('2024-01-14T09:15:00Z'),
  },
  {
    id: '3',
    productId: 'prod_003',
    productName: 'Smartphone Case',
    sku: 'SC-003',
    alertType: 'low_stock',
    priority: 'high',
    currentStock: 8,
    threshold: 15,
    status: 'acknowledged',
    notificationChannels: ['email', 'dashboard'],
    isActive: true,
    createdAt: new Date('2024-01-13T14:20:00Z'),
    lastUpdated: new Date('2024-01-13T16:45:00Z'),
    triggeredCount: 2,
    lastTriggered: new Date('2024-01-13T16:45:00Z'),
  },
];

/**
 * GET /api/stock-alerts
 * Retrieves stock alerts with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validatedQuery = querySchema.parse(queryParams);
    
    // Apply filters
    let filteredAlerts = mockStockAlerts.filter(alert => {
      let matches = true;
      
      // Search filter
      if (validatedQuery.search) {
        const searchTerm = validatedQuery.search.toLowerCase();
        matches = matches && (
          alert.productName.toLowerCase().includes(searchTerm) ||
          alert.sku.toLowerCase().includes(searchTerm)
        );
      }
      
      // Priority filter
      if (validatedQuery.priority) {
        matches = matches && alert.priority === validatedQuery.priority;
      }
      
      // Status filter
      if (validatedQuery.status) {
        matches = matches && alert.status === validatedQuery.status;
      }
      
      // Alert type filter
      if (validatedQuery.alertType) {
        matches = matches && alert.alertType === validatedQuery.alertType;
      }
      
      return matches;
    });
    
    // Apply sorting
    filteredAlerts.sort((a, b) => {
      const { sortBy, sortOrder } = validatedQuery;
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'priority':
          const priorityOrder: { [key: string]: number } = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'productName':
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });
    
    // Apply pagination
    const startIndex = (validatedQuery.page - 1) * validatedQuery.limit;
    const endIndex = startIndex + validatedQuery.limit;
    const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);
    
    // Calculate statistics
    const statistics = {
      total: filteredAlerts.length,
      critical: filteredAlerts.filter(a => a.priority === 'critical' && a.status === 'active').length,
      high: filteredAlerts.filter(a => a.priority === 'high' && a.status === 'active').length,
      medium: filteredAlerts.filter(a => a.priority === 'medium' && a.status === 'active').length,
      low: filteredAlerts.filter(a => a.priority === 'low' && a.status === 'active').length,
      active: filteredAlerts.filter(a => a.status === 'active').length,
      acknowledged: filteredAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: filteredAlerts.filter(a => a.status === 'resolved').length,
    };
    
    return NextResponse.json({
      success: true,
      data: paginatedAlerts,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: filteredAlerts.length,
        totalPages: Math.ceil(filteredAlerts.length / validatedQuery.limit),
        hasNextPage: endIndex < filteredAlerts.length,
        hasPreviousPage: validatedQuery.page > 1,
      },
      statistics,
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
    const validatedData = createStockAlertSchema.parse(body);
    
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
    
    const validatedUpdateData = updateStockAlertSchema.parse(updateData);
    
    // In a real implementation, you would:
    // 1. Validate all alert IDs exist
    // 2. Update alerts in database
    // 3. Log the changes
    // 4. Send notifications if needed
    
    const updatedAlerts = alertIds.map(id => ({
      id,
      ...validatedUpdateData,
      lastUpdated: new Date(),
    }));
    
    return NextResponse.json({
      success: true,
      data: updatedAlerts,
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
    
    // In a real implementation, you would:
    // 1. Validate all alert IDs exist
    // 2. Delete alerts from database
    // 3. Remove from monitoring jobs
    // 4. Log the deletion
    
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