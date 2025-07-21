import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import KanbanTask from '@/lib/database/models/KanbanTask';
import KanbanBoard from '@/lib/database/models/KanbanBoard';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/productivity/kanban/tasks/[id]
 * Retrieves a specific kanban task by ID
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

    // Find task by ID and verify ownership
    const task = await KanbanTask.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kanban task not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        task: task.toJSON()
      }
    });

  } catch (error) {
    console.error('Kanban task GET error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid task ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve kanban task' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/productivity/kanban/tasks/[id]
 * Updates a specific kanban task (including moving between columns)
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

    // Find task by ID and verify ownership
    const existingTask = await KanbanTask.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kanban task not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, taskImage, date, taskProperty, columnId, order } = body;

    // Validate fields if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title cannot be empty' } },
          { status: 400 }
        );
      }
      existingTask.title = title.trim();
    }

    if (description !== undefined) {
      existingTask.description = description?.trim() || null;
    }

    if (taskImage !== undefined) {
      if (taskImage && !/^(\/|https?:\/\/)/.test(taskImage.trim())) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Task image must be a valid URL or path' } },
          { status: 400 }
        );
      }
      existingTask.taskImage = taskImage?.trim() || null;
    }

    if (date !== undefined) {
      existingTask.date = date?.trim() || null;
    }

    if (taskProperty !== undefined) {
      existingTask.taskProperty = taskProperty?.trim() || null;
    }

    // Handle column move
    if (columnId !== undefined && columnId !== existingTask.columnId) {
      // Verify the new column exists in the board
      const board = await KanbanBoard.findOne({
        _id: existingTask.boardId,
        userId: authResult.userId
      });

      if (!board) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board not found' } },
          { status: 400 }
        );
      }

      const column = board.getColumn(columnId);
      if (!column) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Column not found in board' } },
          { status: 400 }
        );
      }

      // Move task to new column
      const newOrder = order !== undefined ? order : 0;

      // Use the static method to move the task
      const moveSuccess = await KanbanTask.moveTask(id, columnId, newOrder, authResult.userId);

      if (!moveSuccess) {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to move task to new column' } },
          { status: 500 }
        );
      }

      // Refresh the task to get updated values
      const updatedTask = await KanbanTask.findById(id);

      return NextResponse.json({
        success: true,
        data: {
          task: updatedTask?.toJSON()
        },
        message: 'Kanban task moved and updated successfully'
      });
    } else if (order !== undefined && order !== existingTask.order) {
      // Just reorder within the same column
      existingTask.order = order;
    }

    const updatedTask = await existingTask.save();

    return NextResponse.json({
      success: true,
      data: {
        task: updatedTask.toJSON()
      },
      message: 'Kanban task updated successfully'
    });

  } catch (error) {
    console.error('Kanban task PUT error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid task ID format' } },
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
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update kanban task' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/productivity/kanban/tasks/[id]
 * Deletes a specific kanban task
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

    // Find task by ID and verify ownership
    const task = await KanbanTask.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kanban task not found' } },
        { status: 404 }
      );
    }

    // Store task info for response
    const taskInfo = {
      boardId: task.boardId,
      columnId: task.columnId,
      order: task.order
    };

    // Delete the task
    await KanbanTask.findByIdAndDelete(id);

    // Reorder remaining tasks in the column
    await KanbanTask.updateMany(
      {
        userId: authResult.userId,
        boardId: taskInfo.boardId,
        columnId: taskInfo.columnId,
        order: { $gt: taskInfo.order }
      },
      {
        $inc: { order: -1 }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Kanban task deleted successfully'
    });

  } catch (error) {
    console.error('Kanban task DELETE error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid task ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete kanban task' } },
      { status: 500 }
    );
  }
}