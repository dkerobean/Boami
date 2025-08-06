import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import KanbanTask from '@/lib/database/models/KanbanTask';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/productivity/kanban/tasks
 * Retrieves kanban tasks for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 items
    const boardId = searchParams.get('boardId');
    const columnId = searchParams.get('columnId');
    const taskProperty = searchParams.get('taskProperty');
    const search = searchParams.get('search');

    let tasks;
    let total;

    if (search) {
      // Use text search
      tasks = await KanbanTask.searchTasks(search, authResult.userId);
      total = tasks.length;

      // Apply pagination to search results
      const skip = (page - 1) * limit;
      tasks = tasks.slice(skip, skip + limit);
    } else if (boardId && columnId) {
      // Get tasks for specific board and column
      tasks = await KanbanTask.findByColumn(boardId, columnId, authResult.userId);
      total = tasks.length;
    } else if (boardId) {
      // Get tasks for specific board
      tasks = await KanbanTask.findByBoard(boardId, authResult.userId);
      total = tasks.length;
    } else if (taskProperty) {
      // Get tasks by property
      tasks = await KanbanTask.findByProperty(taskProperty, authResult.userId);
      total = tasks.length;
    } else {
      // Regular query with pagination
      const skip = (page - 1) * limit;
      [tasks, total] = await Promise.all([
        KanbanTask.find({ userId: authResult.userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        KanbanTask.countDocuments({ userId: authResult.userId })
      ]);
    }

    // Get summary statistics
    const totalTasks = await KanbanTask.getTotalByUser(authResult.userId);
    let boardTaskCount = 0;
    if (boardId) {
      boardTaskCount = await KanbanTask.getTotalByBoard(boardId, authResult.userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalTasks,
          boardTaskCount,
          count: total
        }
      }
    });

  } catch (error) {
    console.error('Kanban tasks GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve kanban tasks' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/kanban/tasks
 * Creates a new kanban task
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { title, description, taskImage, date, taskProperty, boardId, columnId, order } = body;

    // Validate required fields
    if (!title || !boardId || !columnId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title, board ID, and column ID are required' } },
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

    // Verify board exists and belongs to user
    const board = await KanbanBoard.findOne({
      _id: boardId,
      userId: authResult.userId
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board not found or does not belong to user' } },
        { status: 400 }
      );
    }

    // Verify column exists in board
    const column = board.getColumn(columnId);
    if (!column) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Column not found in board' } },
        { status: 400 }
      );
    }

    // Validate task image URL if provided
    if (taskImage && !/^(\/|https?:\/\/)/.test(taskImage.trim())) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Task image must be a valid URL or path' } },
        { status: 400 }
      );
    }

    // Determine order if not provided
    let taskOrder = order;
    if (taskOrder === undefined) {
      // Get the highest order in the column and add 1
      const lastTask = await KanbanTask.findOne({
        userId: authResult.userId,
        boardId: boardId,
        columnId: columnId
      }).sort({ order: -1 });

      taskOrder = lastTask ? lastTask.order + 1 : 0;
    }

    // Create task
    const taskData = {
      title: title.trim(),
      description: description?.trim() || null,
      taskImage: taskImage?.trim() || null,
      date: date?.trim() || null,
      taskProperty: taskProperty?.trim() || null,
      boardId: boardId,
      columnId: columnId,
      order: taskOrder,
      userId: authResult.userId
    };

    const task = new KanbanTask(taskData);
    const savedTask = await task.save();

    return NextResponse.json({
      success: true,
      data: {
        task: savedTask.toJSON()
      },
      message: 'Kanban task created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Kanban tasks POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create kanban task' } },
      { status: 500 }
    );
  }
}