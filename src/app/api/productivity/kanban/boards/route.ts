import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import KanbanTask from '@/lib/database/models/KanbanTask';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';

/**
 * GET /api/productivity/kanban/boards
 * Retrieves kanban boards for the authenticated user
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    const includeTasks = searchParams.get('includeTasks') === 'true';
    const search = searchParams.get('search');

    let boards;
    let total;

    if (search) {
      // Use text search
      boards = await KanbanBoard.searchBoards(search, authResult.user.id);
      total = boards.length;

      // Apply pagination to search results
      const skip = (page - 1) * limit;
      boards = boards.slice(skip, skip + limit);
    } else {
      // Regular query with pagination
      const skip = (page - 1) * limit;
      [boards, total] = await Promise.all([
        KanbanBoard.find({ userId: authResult.user.id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        KanbanBoard.countDocuments({ userId: authResult.user.id })
      ]);
    }

    // If includeTasks is true, fetch tasks for each board
    if (includeTasks && boards.length > 0) {
      const boardIds = boards.map(board => (board._id as any).toString());
      const tasks = await KanbanTask.find({
        userId: authResult.user.id,
        boardId: { $in: boardIds }
      }).sort({ columnId: 1, order: 1 }).lean();

      // Group tasks by board and column
      const tasksByBoard = tasks.reduce((acc: any, task: any) => {
        if (!acc[task.boardId]) {
          acc[task.boardId] = {};
        }
        if (!acc[task.boardId][task.columnId]) {
          acc[task.boardId][task.columnId] = [];
        }
        acc[task.boardId][task.columnId].push(task);
        return acc;
      }, {});

      // Add tasks to boards
      boards = boards.map((board: any) => {
        const boardTasks = tasksByBoard[(board._id as any).toString()] || {};
        const columnsWithTasks = board.columns.map((column: any) => ({
          ...column,
          tasks: boardTasks[column.id] || []
        }));

        return {
          ...board,
          columns: columnsWithTasks
        };
      });
    }

    // Get summary statistics
    const totalBoards = await KanbanBoard.getTotalByUser(authResult.user.id);
    const totalTasks = await KanbanTask.getTotalByUser(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: {
        boards,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalBoards,
          totalTasks,
          count: total
        }
      }
    });

  } catch (error) {
    console.error('Kanban boards GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve kanban boards' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/kanban/boards
 * Creates a new kanban board
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
    const { name, description, columns, useDefaults } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board name is required' } },
        { status: 400 }
      );
    }

    // Validate name
    if (name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board name cannot be empty' } },
        { status: 400 }
      );
    }

    // Check if user wants default board or custom columns
    if (useDefaults || !columns) {
      // Create board with default columns
      const board = await KanbanBoard.createDefaultBoard(authResult.user.id, name.trim());

      if (description) {
        board.description = description.trim();
        await board.save();
      }

      return NextResponse.json({
        success: true,
        data: {
          board: board.toJSON()
        },
        message: 'Kanban board created successfully with default columns'
      }, { status: 201 });
    } else {
      // Create board with custom columns
      if (!Array.isArray(columns) || columns.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one column is required' } },
          { status: 400 }
        );
      }

      // Validate columns
      const processedColumns = columns.map((col: any, index: number) => {
        if (!col.name || col.name.trim().length === 0) {
          throw new Error(`Column ${index + 1} name cannot be empty`);
        }
        return {
          id: col.id || new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
          name: col.name.trim(),
          order: index
        };
      });

      // Create board
      const boardData = {
        name: name.trim(),
        description: description?.trim() || null,
        columns: processedColumns,
        userId: authResult.user.id
      };

      const board = new KanbanBoard(boardData);
      const savedBoard = await board.save();

      return NextResponse.json({
        success: true,
        data: {
          board: savedBoard.toJSON()
        },
        message: 'Kanban board created successfully'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Kanban boards POST error:', error);

    // Handle validation errors
    if (error instanceof Error && (error.message.includes('validation') || error.message.includes('Column'))) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create kanban board' } },
      { status: 500 }
    );
  }
}