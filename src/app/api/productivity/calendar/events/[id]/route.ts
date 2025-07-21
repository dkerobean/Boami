import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import CalendarEvent from '@/lib/database/models/CalendarEvent';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/productivity/calendar/events/[id]
 * Retrieves a specific calendar event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = params;

    // Find event by ID and verify ownership
    const event = await CalendarEvent.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Calendar event not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        event: event.toJSON()
      }
    });

  } catch (error) {
    console.error('Calendar event GET error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid event ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve calendar event' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/productivity/calendar/events/[id]
 * Updates a specific calendar event
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = params;

    // Find event by ID and verify ownership
    const existingEvent = await CalendarEvent.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Calendar event not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, startDate, endDate, isAllDay, color, location } = body;

    // Validate fields if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title cannot be empty' } },
          { status: 400 }
        );
      }
      existingEvent.title = title.trim();
    }

    if (description !== undefined) {
      existingEvent.description = description?.trim() || null;
    }

    if (location !== undefined) {
      existingEvent.location = location?.trim() || null;
    }

    if (color !== undefined) {
      if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Color must be a valid hex color (e.g., #1976d2)' } },
          { status: 400 }
        );
      }
      existingEvent.color = color || '#1976d2';
    }

    if (isAllDay !== undefined) {
      if (typeof isAllDay !== 'boolean') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'isAllDay must be a boolean' } },
          { status: 400 }
        );
      }
      existingEvent.isAllDay = isAllDay;
    }

    // Handle date updates
    let newStartDate = existingEvent.startDate;
    let newEndDate = existingEvent.endDate;

    if (startDate !== undefined) {
      newStartDate = new Date(startDate);
      if (isNaN(newStartDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid start date format' } },
          { status: 400 }
        );
      }
    }

    if (endDate !== undefined) {
      newEndDate = new Date(endDate);
      if (isNaN(newEndDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid end date format' } },
          { status: 400 }
        );
      }
    }

    // Validate date relationship
    if (newStartDate >= newEndDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'End date must be after start date' } },
        { status: 400 }
      );
    }

    // Update dates
    existingEvent.startDate = newStartDate;
    existingEvent.endDate = newEndDate;

    const updatedEvent = await existingEvent.save();

    return NextResponse.json({
      success: true,
      data: {
        event: updatedEvent.toJSON()
      },
      message: 'Calendar event updated successfully'
    });

  } catch (error) {
    console.error('Calendar event PUT error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid event ID format' } },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update calendar event' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/productivity/calendar/events/[id]
 * Deletes a specific calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = params;

    // Find event by ID and verify ownership
    const event = await CalendarEvent.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Calendar event not found' } },
        { status: 404 }
      );
    }

    // Delete the event
    await CalendarEvent.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });

  } catch (error) {
    console.error('Calendar event DELETE error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid event ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete calendar event' } },
      { status: 500 }
    );
  }
}