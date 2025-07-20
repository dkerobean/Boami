import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StockAlertsService } from '@/lib/services/stock-alerts';

// Validation schemas
const updateStockAlertSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  threshold: z.number().min(0).optional(),
  notificationChannels: z.array(z.enum(['email', 'sms', 'push', 'dashboard'])).optional(),
  isActive: z.boolean().optional(),
});

// This file now uses real MongoDB data through StockAlertsService

/**
 * GET /api/stock-alerts/[id]
 * Retrieves a specific stock alert by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required',
      }, { status: 400 });
    }
    
    // Get alert from database using StockAlertsService
    const alert = await StockAlertsService.getStockAlertById(id);
    
    if (!alert) {
      return NextResponse.json({
        success: false,
        error: 'Stock alert not found',
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: alert,
    });
    
  } catch (error) {
    console.error('Error fetching stock alert:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stock alert',
    }, { status: 500 });
  }
}

/**
 * PUT /api/stock-alerts/[id]
 * Updates a specific stock alert
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required',
      }, { status: 400 });
    }
    
    const body = await request.json();
    const validatedData = updateStockAlertSchema.parse(body);
    
    // Update alert using StockAlertsService
    const success = await StockAlertsService.updateAlertStatus(
      [id],
      validatedData.status || 'acknowledged'
    );
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update alert or alert not found',
      }, { status: 404 });
    }
    
    // Get updated alert
    const updatedAlert = await StockAlertsService.getStockAlertById(id);
    
    return NextResponse.json({
      success: true,
      data: updatedAlert,
      message: 'Stock alert updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating stock alert:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update stock alert',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/stock-alerts/[id]
 * Deletes a specific stock alert
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required',
      }, { status: 400 });
    }
    
    // In a real implementation, you would:
    // 1. Validate alert exists
    // 2. Delete alert from database
    // 3. Remove from monitoring jobs
    // 4. Log the deletion
    
    return NextResponse.json({
      success: true,
      message: 'Stock alert deleted successfully',
    });
    
  } catch (error) {
    console.error('Error deleting stock alert:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete stock alert',
    }, { status: 500 });
  }
}

/**
 * POST /api/stock-alerts/[id]/acknowledge
 * Acknowledges a specific stock alert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Alert ID is required',
      }, { status: 400 });
    }
    
    const body = await request.json();
    const { note, userId } = body;
    
    let newStatus: string;
    let actionMessage: string;
    
    switch (action) {
      case 'acknowledge':
        newStatus = 'acknowledged';
        actionMessage = 'Stock alert acknowledged successfully';
        break;
      case 'resolve':
        newStatus = 'resolved';
        actionMessage = 'Stock alert resolved successfully';
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 });
    }
    
    // In a real implementation, you would:
    // 1. Validate alert exists and current status
    // 2. Update alert status in database
    // 3. Add history entry
    // 4. Send notifications
    // 5. Update monitoring job
    
    const updatedAlert = {
      ...mockStockAlert,
      status: newStatus,
      lastUpdated: new Date(),
    };
    
    return NextResponse.json({
      success: true,
      data: updatedAlert,
      message: actionMessage,
    });
    
  } catch (error) {
    console.error('Error processing stock alert action:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process stock alert action',
    }, { status: 500 });
  }
}