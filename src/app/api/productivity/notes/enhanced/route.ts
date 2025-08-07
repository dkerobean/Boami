import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import Note from '@/lib/database/models/Note';
import {
  withProductivityAuth,
  hasPermission,
  requirePermission,
  ProductivityAuthResult
} from '@/lib/auth/productivity-auth';
import {
  createSuccessResponse,
  ProductivityValidator,
  handleProductivityError
} from '@/lib/utils/productivity-error-handler';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Enhanced Notes API with comprehensive authentication and permissions
 * GET /api/productivity/notes/enhanced
 */
async function handleGetNotes(request: NextRequest, authResult: ProductivityAuthResult) {
  await connectDB();

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const color = searchParams.get('color');
  const includeDeleted = searchParams.get('includeDeleted') === 'true';
  const search = searchParams.get('search');
  const includeShared = searchParams.get('includeShared') === 'true';

  // Check permissions for advanced features
  if (includeDeleted && !hasPermission(authResult, 'admin')) {
    requirePermission(authResult, 'admin'); // This will throw if user doesn't have permission
  }

  if (includeShared && !hasPermission(authResult, 'premium_features')) {
    requirePermission(authResult, 'premium_features');
  }

  // Build query
  const query: any = { userId: authResult.userId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  if (color) {
    query.color = color;
  }

  let notes;
  let total;

  if (search) {
    // Advanced search for premium users
    if (hasPermission(authResult, 'advanced_search')) {
      notes = await Note.searchNotes(search, authResult.userId!);
    } else {
      // Basic search for regular users
      notes = await Note.find({
        ...query,
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).limit(limit);
    }
    total = notes.length;
  } else {
    // Regular query with pagination
    const skip = (page - 1) * limit;
    [notes, total] = await Promise.all([
      Note.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(query)
    ]);
  }

  // Get summary statistics
  const totalActive = await Note.countDocuments({
    userId: authResult.userId,
    isDeleted: false
  });

  // Add premium features for eligible users
  const responseData: any = {
    notes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    summary: {
      totalActive,
      count: total
    },
    user: {
      permissions: authResult.permissions,
      features: authResult.features
    }
  };

  // Add analytics for admin users
  if (hasPermission(authResult, 'admin')) {
    const analytics = await Note.aggregate([
      { $match: { userId: authResult.userId } },
      {
        $group: {
          _id: '$color',
          count: { $sum: 1 }
        }
      }
    ]);
    responseData.analytics = analytics;
  }

  return createSuccessResponse(responseData, undefined, authResult.requestId);
}

/**
 * Enhanced Notes API with comprehensive authentication and permissions
 * POST /api/productivity/notes/enhanced
 */
async function handleCreateNote(request: NextRequest, authResult: ProductivityAuthResult) {
  await connectDB();

  // Check write permission
  requirePermission(authResult, 'write');

  // Parse request body
  const body = await request.json();
  const { title, content, color, tags, isPrivate } = body;

  // Validate using the new validation utilities
  ProductivityValidator.validateRequiredString(title, 'Title', 200);
  ProductivityValidator.validateRequiredString(content, 'Content', 5000);

  if (color) {
    const validColors = ['info', 'error', 'warning', 'success', 'primary'];
    ProductivityValidator.validateEnum(color, 'Color', validColors, false);
  }

  // Premium features
  if (tags && !hasPermission(authResult, 'premium_features')) {
    requirePermission(authResult, 'premium_features');
  }

  if (isPrivate && !hasPermission(authResult, 'premium_features')) {
    requirePermission(authResult, 'premium_features');
  }

  // Create note
  const noteData: any = {
    title: title.trim(),
    content: content.trim(),
    color: color || 'info',
    userId: authResult.userId
  };

  // Add premium fields if user has access
  if (hasPermission(authResult, 'premium_features')) {
    if (tags) noteData.tags = tags;
    if (typeof isPrivate === 'boolean') noteData.isPrivate = isPrivate;
  }

  const note = new Note(noteData);
  const savedNote = await note.save();

  return createSuccessResponse({
    note: savedNote.toJSON(),
    message: 'Note created successfully',
    features: {
      tagsEnabled: hasPermission(authResult, 'premium_features'),
      privacyEnabled: hasPermission(authResult, 'premium_features')
    }
  }, 'Note created successfully', authResult.requestId);
}

// Export the wrapped handlers
export const GET = withProductivityAuth(handleGetNotes, 'notes');
export const POST = withProductivityAuth(handleCreateNote, 'notes');