import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import Note from '@/lib/database/models/Note';
import { authenticateRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/productivity/notes/[id]
 * Retrieves a specific note by ID
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    // Find note by ID and verify ownership
    const note = await Note.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        note: note.toJSON()
      }
    });

  } catch (error) {
    console.error('Note GET error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid note ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve note' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/productivity/notes/[id]
 * Updates a specific note
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

    // Find note by ID and verify ownership
    const existingNote = await Note.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!existingNote) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, content, color, isDeleted } = body;

    // Validate fields if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title cannot be empty' } },
          { status: 400 }
        );
      }
      existingNote.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Content cannot be empty' } },
          { status: 400 }
        );
      }
      existingNote.content = content.trim();
    }

    if (color !== undefined) {
      const validColors = ['info', 'error', 'warning', 'success', 'primary'];
      if (!validColors.includes(color)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid color. Must be one of: ' + validColors.join(', ') } },
          { status: 400 }
        );
      }
      existingNote.color = color;
    }

    if (isDeleted !== undefined) {
      if (typeof isDeleted !== 'boolean') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'isDeleted must be a boolean' } },
          { status: 400 }
        );
      }
      existingNote.isDeleted = isDeleted;
    }

    const updatedNote = await existingNote.save();

    return NextResponse.json({
      success: true,
      data: {
        note: updatedNote.toJSON()
      },
      message: 'Note updated successfully'
    });

  } catch (error) {
    console.error('Note PUT error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid note ID format' } },
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
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update note' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/productivity/notes/[id]
 * Soft deletes a specific note
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

    // Parse query parameters to check for hard delete
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Find note by ID and verify ownership
    const note = await Note.findOne({
      _id: id,
      userId: authResult.userId
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Note not found' } },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Permanently delete the note
      await Note.findByIdAndDelete(id);

      return NextResponse.json({
        success: true,
        message: 'Note permanently deleted'
      });
    } else {
      // Soft delete the note
      await note.softDelete();

      return NextResponse.json({
        success: true,
        data: {
          note: note.toJSON()
        },
        message: 'Note moved to trash'
      });
    }

  } catch (error) {
    console.error('Note DELETE error:', error);

    // Handle invalid ObjectId
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid note ID format' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete note' } },
      { status: 500 }
    );
  }
}