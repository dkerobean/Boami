import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import CalendarEvent from '@/lib/database/models/CalendarEvent';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

/**
 * GET /api/productivity/calendar/events
 * Retrieves calendar events for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 items
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const upcoming = searchParams.get('upcoming') === 'true';
    const today = searchParams.get('today') === 'true';
    const search = searchParams.get('search');

    let events;
    let total;

    if (search) {
      // Use text search
      events = await CalendarEvent.searchEvents(search, authResult.user.id);
      total = events.length;

      // Apply pagination to search results
      const skip = (page - 1) * limit;
      events = events.slice(skip, skip + limit);
    } else if (today) {
      // Get today's events
      events = await CalendarEvent.findToday(authResult.user.id);
      total = events.length;
    } else if (upcoming) {
      // Get upcoming events
      const upcomingLimit = limit || 10;
      events = await CalendarEvent.findUpcoming(authResult.user.id, upcomingLimit);
      total = events.length;
    } else if (year && month) {
      // Get events for specific month
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid year or month' } },
          { status: 400 }
        );
      }

      events = await CalendarEvent.findByMonth(yearNum, monthNum, authResult.user.id);
      total = events.length;
    } else if (startDate || endDate) {
      // Get events by date range
      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid start date format' } },
            { status: 400 }
          );
        }
      }

      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid end date format' } },
            { status: 400 }
          );
        }
      }

      if (start && end && start > end) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Start date must be before end date' } },
          { status: 400 }
        );
      }

      // Default to current month if no dates provided
      if (!start && !end) {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (!start) {
        // If only end date provided, start from beginning of that month
        start = new Date(end!.getFullYear(), end!.getMonth(), 1);
      } else if (!end) {
        // If only start date provided, end at end of that month
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      events = await CalendarEvent.findByDateRange(start!, end!, authResult.user.id);
      total = events.length;
    } else {
      // Regular query with pagination
      const skip = (page - 1) * limit;
      [events, total] = await Promise.all([
        CalendarEvent.find({ userId: authResult.user.id })
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CalendarEvent.countDocuments({ userId: authResult.user.id })
      ]);
    }

    // Get summary statistics
    const totalEvents = await CalendarEvent.getTotalByUser(authResult.user.id);
    const upcomingEvents = await CalendarEvent.findUpcoming(authResult.user.id, 5);
    const todayEvents = await CalendarEvent.findToday(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalEvents,
          upcomingCount: upcomingEvents.length,
          todayCount: todayEvents.length,
          count: total
        }
      }
    });

  } catch (error) {
    console.error('Calendar events GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve calendar events' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/calendar/events
 * Creates a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request body
    const body = await request.json();
    const { title, description, startDate, endDate, isAllDay, color, location } = body;

    // Validate required fields
    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title, start date, and end date are required' } },
        { status: 400 }
      );
    }

    // Validate title
    if (title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title cannot be empty' } },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid start date format' } },
        { status: 400 }
      );
    }

    if (isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid end date format' } },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'End date must be after start date' } },
        { status: 400 }
      );
    }

    // Validate color if provided
    if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Color must be a valid hex color (e.g., #1976d2)' } },
        { status: 400 }
      );
    }

    // Create event
    const eventData = {
      title: title.trim(),
      description: description?.trim() || null,
      startDate: start,
      endDate: end,
      isAllDay: Boolean(isAllDay),
      color: color || '#1976d2',
      location: location?.trim() || null,
      userId: authResult.user.id
    };

    const event = new CalendarEvent(eventData);
    const savedEvent = await event.save();

    return NextResponse.json({
      success: true,
      data: {
        event: savedEvent.toJSON()
      },
      message: 'Calendar event created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Calendar events POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create calendar event' } },
      { status: 500 }
    );
  }
}