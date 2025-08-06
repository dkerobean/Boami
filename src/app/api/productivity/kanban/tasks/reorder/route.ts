import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import KanbanTask from '@/lib/database/models/KanbanTask';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * POST /api/productivity/kanban/tasks/reorder
 * Reorders tasks within a column or moves tasks between columns
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
    const { boardId, columnId, taskIds, sourceColumnId, targetColumnId, taskId, newOrder } = body;

    // Validate required fields for different operations
    if (taskIds && boardId && columnId) {
      // Bulk reorder within a column
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Task IDs array is required and cannot be empty' } },
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

      // Reorder tasks
      const success = await KanbanTask.reorderTasks(boardId, columnId, taskIds, authResult.userId);

      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder tasks' } },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Tasks reordered successfully'
      });

    } else if (taskId && targetColumnId && newOrder !== undefined) {
      // Move single task to different column
      const success = await KanbanTask.moveTask(taskId, targetColumnId, newOrder, authResult.userId);

      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to move task' } },
          { status: 500 }
        );
      }

      // Get updated task
      const updatedTask = await KanbanTask.findOne({
        _id: taskId,
        userId: authResult.userId
      });

      return NextResponse.json({
        success: true,
        data: {
          task: updatedTask?.toJSON()
        },
        message: 'Task moved successfully'
      });

    } else {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters. Provide either (boardId, columnId, taskIds) for bulk reorder or (taskId, targetColumnId, newOrder) for single task move' } },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Kanban tasks reorder error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder tasks' } },
      { status: 500 }
    );
  }
}