import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Note from '@/lib/database/models/Note';
import { authenticateRequest } from '@/lib/auth/api-auth';
import {
  handleProductivityError,
  createSuccessResponse,
  createErrorResponse,
  ProductivityErrorCode,
  ProductivityValidator,
  generateRequestId
} from '@/lib/utils/productivity-error-handler';
import {
  ProductivityQueryBuilder,
  CachedProductivityQuery,
  validatePagination,
  PerformanceMonitor
} from '@/lib/utils/productivity-performance';
import { NotesCache } from '@/lib/utils/productivity-cache';

/**
 * GET /api/productivity/notes
 * Retrieves notes for the authenticated user
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return createErrorResponse(
        ProductivityErrorCode.UNAUTHORIZED,
        'Authentication required',
        401,
        undefined,
        requestId
      );
    }

    await connectDB();

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const paginationOptions = validatePagination({
      page: searchParams.get('page'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    });

    const color = searchParams.get('color');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const search = searchParams.get('search');

    // Start performance monitoring
    PerformanceMonitor.start(`notes-query-${requestId}`);

    let result;

    if (search) {
      // Use cached search with performance monitoring
      const cacheKey = { search, includeDeleted, color };
      const cached = NotesCache.get(authResult.userId, cacheKey);

      if (cached) {
        // Apply pagination to cached search results
        const skip = (paginationOptions.page - 1) * paginationOptions.limit;
        const paginatedData = cached.slice(skip, skip + paginationOptions.limit);

        result = {
          data: paginatedData,
          pagination: {
            page: paginationOptions.page,
            limit: paginationOptions.limit,
            total: cached.length,
            pages: Math.ceil(cached.length / paginationOptions.limit)
          }
        };
      } else {
        // Execute search query
        const searchResults = await Note.searchNotes(search, authResult.userId);

        // Filter by color and deleted status if needed
        let filteredResults = searchResults;
        if (!includeDeleted) {
          filteredResults = filteredResults.filter(note => !note.isDeleted);
        }
        if (color) {
          filteredResults = filteredResults.filter(note => note.color === color);
        }

        // Cache the search results
        NotesCache.set(authResult.userId, filteredResults, cacheKey);

        // Apply pagination
        const skip = (paginationOptions.page - 1) * paginationOptions.limit;
        const paginatedData = filteredResults.slice(skip, skip + paginationOptions.limit);

        result = {
          data: paginatedData,
          pagination: {
            page: paginationOptions.page,
            limit: paginationOptions.limit,
            total: filteredResults.length,
            pages: Math.ceil(filteredResults.length / paginationOptions.limit)
          }
        };
      }
    } else {
      // Use optimized query builder with caching
      const queryBuilder = new ProductivityQueryBuilder(Note)
        .forUser(authResult.userId)
        .lean();

      // Add filters
      if (!includeDeleted) {
        queryBuilder.where({ isDeleted: false });
      }
      if (color) {
        queryBuilder.where({ color });
      }

      // Use cached query for better performance
      const cachedQuery = new CachedProductivityQuery(
        'notes',
        queryBuilder,
        authResult.userId
      );

      result = await cachedQuery.paginate(paginationOptions);
    }

    // Get summary statistics with caching
    const totalActive = await new CachedProductivityQuery(
      'notes',
      new ProductivityQueryBuilder(Note).forUser(authResult.userId).where({ isDeleted: false }),
      authResult.userId
    ).count();

    // End performance monitoring
    const queryDuration = PerformanceMonitor.end(`notes-query-${requestId}`);
    PerformanceMonitor.logSlowQuery(`notes-query-${requestId}`, queryDuration, 500);

    return createSuccessResponse({
      notes: result.data,
      pagination: result.pagination,
      summary: {
        totalActive,
        count: result.pagination.total
      }
    }, undefined, requestId);

  } catch (error) {
    return handleProductivityError(error, requestId);
  }
}

/**
 * POST /api/productivity/notes
 * Creates a new note
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Verify authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.userId) {
      return createErrorResponse(
        ProductivityErrorCode.UNAUTHORIZED,
        'Authentication required',
        401,
        undefined,
        requestId
      );
    }

    await connectDB();

    // Parse request body
    const body = await request.json();
    const { title, content, color } = body;

    // Validate using the new validation utilities
    ProductivityValidator.validateRequiredString(title, 'Title', 200);
    ProductivityValidator.validateRequiredString(content, 'Content', 5000);

    if (color) {
      const validColors = ['info', 'error', 'warning', 'success', 'primary'];
      ProductivityValidator.validateEnum(color, 'Color', validColors, false);
    }

    // Create note
    const noteData = {
      title: title.trim(),
      content: content.trim(),
      color: color || 'info',
      userId: authResult.userId
    };

    const note = new Note(noteData);
    const savedNote = await note.save();

    // Invalidate cache for this user since we added a new note
    NotesCache.invalidate(authResult.userId);

    return createSuccessResponse({
      note: savedNote.toJSON()
    }, 'Note created successfully', requestId);

  } catch (error) {
    return handleProductivityError(error, requestId);
  }
}