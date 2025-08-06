import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import KanbanTask from '@/lib/database/models/KanbanTask';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/productivity/kanban/boards/[id]
 * Retrieves a specific kanban board by ID
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
    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('includeTasks') === 'true';

    // Find board by ID and verify ownership
    const board = await KanbanBoard.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kanban board not found' } },
        { status: 404 }
      );
    }

    let boardData = board.toJSON();

    // If includeTasks is true, fetch tasks for the board
    if (includeTasks) {
      const tasks = await KanbanTask.find({
        userId: authResult.userId,
        boardId: id
      }).sort({ columnId: 1, order: 1 }).lean();

      // Group tasks by column
      const tasksByColumn = tasks.reduce((acc: any, task: any) => {
        if (!acc[task.columnId]) {
          acc[task.columnId] = [];
        }
        acc[task.columnId].push(task);
        return acc;
      }, {});

      // Add tasks to columns
      boardData.columns = boardData.columns.map((column: any) => ({
        ...column,
        tasks: tasksByColumn[column.id] || []
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        board: boardData
      }
    });

  } catch (error) {
    console.error('Kanban board GET error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid board ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve kanban board' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/productivity/kanban/boards/[id]
 * Updates a specific kanban board
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

    // Find board by ID and verify ownership
    const existingBoard = await KanbanBoard.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!existingBoard) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kanban board not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, columns } = body;

    // Validate fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board name cannot be empty' } },
          { status: 400 }
        );
      }
      existingBoard.name = name.trim();
    }

    if (description !== undefined) {
      existingBoard.description = description?.trim() || null;
    }

    if (columns !== undefined) {
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

      // Check if any columns were removed and delete associated tasks
      const oldColumnIds = existingBoard.columns.map(col => col.id);
      const newColumnIds = processedColumns.map(col => col.id);
      const removedColumnIds = oldColumnIds.filter(id => !newColumnIds.includes(id));

      if (removedColumnIds.length > 0) {
        // Delete tasks from removed columns
        await KanbanTask.deleteMany({
          userId: authResult.userId,
          boardId: id,
          columnId: { $in: removedColumnIds }
        });
      }

      existingBoard.columns = processedColumns;
    }

    const updatedBoard = await existingBoard.save();

    return NextResponse.json({
      success: true,
      data: {
        board: updatedBoard.toJSON()
      },
      message: 'Kanban board updated successfully'
    });

  } catch (error) {
    console.error('Kanban board PUT error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid board ID format' } },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error instanceof Error && (error.message.includes('validation') || error.message.includes('Column'))) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update kanban board' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/productivity/kanban/boards/[id]
 * Deletes a specific kanban board and all its tasks
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

    // Find board by ID and verify ownership
    const board = await KanbanBoard.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kanban board not found' } },
        { status: 404 }
      );
    }

    // Delete all tasks associated with this board
    const deletedTasksCount = await KanbanTask.deleteByBoard(id, authResult.userId);

    // Delete the board
    await KanbanBoard.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Kanban board and ${deletedTasksCount} associated tasks deleted successfully`
    });

  } catch (error) {
    console.error('Kanban board DELETE error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid board ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete kanban board' } },
      { status: 500 }
    );
  }
}