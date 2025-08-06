import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/productivity/notes/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/productivity/notes/[id]/route';
import { connectDB } from '@/lib/database/connection';
import Note from '@/lib/database/models/Note';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { CacheManager } from '@/lib/utils/productivity-cache';

// Mock authentication
jest.mock('@/lib/auth/api-auth');
const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

// Mock database connection
jest.mock('@/lib/database/connection');
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

// Mock Note model
jest.mock('@/lib/database/models/Note');
const mockNote = Note as jest.Mocked<typeof Note>;

describe('Notes API Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockRequestId = 'req-123';

  beforeEach(() => {
    jest.clearAllMocks();
    CacheManager.clearAll();

    // Setup default mocks
    mockConnectDB.mockResolvedValue(undefined);
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: mockUserId
    });
  });

  describe('GET /api/productivity/notes', () => {
    const mockNotes = [
      {
        _id: 'note1',
        title: 'Test Note 1',
        content: 'Content 1',
        color: 'info',
        isDeleted: false,
        userId: mockUserId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        _id: 'note2',
        title: 'Test Note 2',
        content: 'Content 2',
        color: 'success',
        isDeleted: false,
        userId: mockUserId,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      }
    ];

    beforeEach(() => {
      // Mock Note model methods
      mockNote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockNotes)
            })
          })
        })
      });
      mockNote.countDocuments = jest.fn().mockResolvedValue(2);
      mockNote.getTotalByUser = jest.fn().mockResolvedValue(2);
    });

    it('should return paginated notes successfully', async () => {
      const request = new NextRequest('http://localhost/api/productivity/notes?page=1&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.notes).toHaveLength(2);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
      expect(data.data.summary.totalActive).toBe(2);
    });

    it('should handle color filtering', async () => {
      const filteredNotes = [mockNotes[1]]; // Only success color
      mockNote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(filteredNotes)
            })
          })
        })
      });
      mockNote.countDocuments = jest.fn().mockResolvedValue(1);
st request = new NextRequest('http://localhost/api/productivity/notes?color=success');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.notes).toHaveLength(1);
      expect(data.data.notes[0].color).toBe('success');
    });

    it('should handle search queries', async () => {
      mockNote.searchNotes = jest.fn().mockResolvedValue([mockNotes[0]]);

      const request = new NextRequest('http://localhost/api/productivity/notes?search=Test Note 1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.notes).toHaveLength(1);
      expect(mockNote.searchNotes).toHaveBeenCalledWith('Test Note 1', mockUserId);
    });

    it('should handle pagination parameters', async () => {
      const request = new NextRequest('http://localhost/api/productivity/notes?page=2&limit=5&sortBy=title&sortOrder=asc');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        userId: null
      });

      const request = new NextRequest('http://localhost/api/productivity/notes');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle database errors gracefully', async () => {
      mockNote.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost/api/productivity/notes');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/productivity/notes', () => {
    const mockSavedNote = {
      _id: 'new-note-id',
      title: 'New Note',
      content: 'New content',
      color: 'info',
      isDeleted: false,
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      toJSON: jest.fn().mockReturnValue({
        _id: 'new-note-id',
        title: 'New Note',
        content: 'New content',
        color: 'info',
        userId: mockUserId
      })
    };

    beforeEach(() => {
      // Mock Note constructor and save method
      mockNote.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedNote)
      }) as any);
    });

    it('should create a new note successfully', async () => {
      const noteData = {
        title: 'New Note',
        content: 'This is a new note content',
        color: 'info'
      };

      const request = new NextRequest('http://localhost/api/productivity/notes', {
        method: 'POST',
        body: JSON.stringify(noteData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.note.title).toBe('New Note');
      expect(data.message).toBe('Note created successfully');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: '', // Empty title
        content: 'Content'
      };

      const request = new NextRequest('http://localhost/api/productivity/notes', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate color enum', async () => {
      const invalidData = {
        title: 'Test Note',
        content: 'Content',
        color: 'invalid-color'
      };

      const request = new NextRequest('http://localhost/api/productivity/notes', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle content length validation', async () => {
      const invalidData = {
        title: 'Test Note',
        content: 'x'.repeat(5001) // Exceeds max length
      };

      const request = new NextRequest('http://localhost/api/productivity/notes', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        success: false,
        userId: null
      });

      const request = new NextRequest('http://localhost/api/productivity/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', content: 'Content' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/productivity/notes/[id]', () => {
    const mockNote = {
      _id: 'note-123',
      title: 'Test Note',
      content: 'Test content',
      color: 'info',
      isDeleted: false,
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return a specific note', async () => {
      Note.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockNote)
      });

      const request = new NextRequest('http://localhost/api/productivity/notes/note-123');

      const response = await GET_BY_ID(request, { params: { id: 'note-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.note._id).toBe('note-123');
    });

    it('should return 404 for non-existent note', async () => {
      Note.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const request = new NextRequest('http://localhost/api/productivity/notes/non-existent');

      const response = await GET_BY_ID(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 for notes owned by other users', async () => {
      const otherUserNote = { ...mockNote, userId: 'other-user' };
      Note.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(otherUserNote)
      });

      const request = new NextRequest('http://localhost/api/productivity/notes/note-123');

      const response = await GET_BY_ID(request, { params: { id: 'note-123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/productivity/notes/[id]', () => {
    const mockNote = {
      _id: 'note-123',
      title: 'Test Note',
      content: 'Test content',
      color: 'info',
      isDeleted: false,
      userId: mockUserId,
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        _id: 'note-123',
        title: 'Updated Note',
        content: 'Updated content'
      })
    };

    it('should update a note successfully', async () => {
      Note.findById = jest.fn().mockResolvedValue(mockNote);

      const updateData = {
        title: 'Updated Note',
        content: 'Updated content'
      };

      const request = new NextRequest('http://localhost/api/productivity/notes/note-123', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request, { params: { id: 'note-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockNote.save).toHaveBeenCalled();
    });

    it('should return 404 for non-existent note', async () => {
      Note.findById = jest.fn().mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/productivity/notes/non-existent', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' })
      });

      const response = await PUT(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/productivity/notes/[id]', () => {
    const mockNote = {
      _id: 'note-123',
      title: 'Test Note',
      isDeleted: false,
      userId: mockUserId,
      save: jest.fn().mockResolvedValue(true)
    };

    it('should soft delete a note by default', async () => {
      Note.findById = jest.fn().mockResolvedValue(mockNote);

      const request = new NextRequest('http://localhost/api/productivity/notes/note-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'note-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockNote.isDeleted).toBe(true);
      expect(mockNote.save).toHaveBeenCalled();
    });

    it('should permanently delete when requested', async () => {
      Note.findById = jest.fn().mockResolvedValue(mockNote);
      Note.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const request = new NextRequest('http://localhost/api/productivity/notes/note-123?permanent=true', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'note-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Note.deleteOne).toHaveBeenCalledWith({ _id: 'note-123' });
    });

    it('should return 404 for non-existent note', async () => {
      Note.findById = jest.fn().mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/productivity/notes/non-existent', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('Performance and Caching', () => {
    it('should use cache for repeated requests', async () => {
      const mockNotes = [{ _id: 'note1', title: 'Cached Note' }];

      mockNote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockNotes)
            })
          })
        })
      });
      mockNote.countDocuments = jest.fn().mockResolvedValue(1);
      mockNote.getTotalByUser = jest.fn().mockResolvedValue(1);

      const request1 = new NextRequest('http://localhost/api/productivity/notes?page=1&limit=10');
      const request2 = new NextRequest('http://localhost/api/productivity/notes?page=1&limit=10');

      // First request
      await GET(request1);

      // Second request should use cache
      await GET(request2);

      // The database query should only be called once due to caching
      expect(mockNote.find).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after creating a note', async () => {
      const mockSavedNote = {
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ _id: 'new-note' })
      };

      mockNote.mockImplementation(() => mockSavedNote as any);

      const request = new NextRequest('http://localhost/api/productivity/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Note',
          content: 'Content'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Cache should be invalidated after creating a note
      const stats = CacheManager.getStats();
      expect(stats.size).toBe(0); // Cache should be cleared
    });
  });
});