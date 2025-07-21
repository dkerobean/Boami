import { NextRequest } from 'next/server';
import {
  authenticateProductivityRequest,
  withProductivityAuth,
  hasPermission,
  requirePermission,
  checkResourceOwnership,
  requireResourceOwnership,
  validateApiKey
} from '@/lib/auth/productivity-auth';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { ProductivityError, ProductivityErrorCode } from '@/lib/utils/productivity-error-handler';

// Mock the base authentication
jest.mock('@/lib/auth/api-auth');
const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;

// Mock the error handler utilities
jest.mock('@/lib/utils/productivity-error-handler', () => ({
  ...jest.requireActual('@/lib/utils/productivity-error-handler'),
  generateRequestId: jest.fn(() => 'test-request-id'),
  createErrorResponse: jest.fn(() => new Response('Error', { status: 401 }))
}));

describe('authenticateProductivityRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate successfully with basic user', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: 'user123',
      user: { userId: 'user123', role: 'user' }
    });

    const request = new NextRequest('http://localhost/api/test');
    const result = await authenticateProductivityRequest(request);

    expect(result.success).toBe(true);
    expect(result.userId).toBe('user123');
    expect(result.permissions).toContain('read');
    expect(result.permissions).toContain('write');
    expect(result.features).toContain('notes');
    expect(result.features).toContain('calendar');
    expect(result.features).toContain('kanban');
  });

  it('should authenticate successfully with admin user', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: 'admin123',
      user: { userId: 'admin123', role: 'admin' }
    });

    const request = new NextRequest('http://localhost/api/test');
    const result = await authenticateProductivityRequest(request);

    expect(result.success).toBe(true);
    expect(result.permissions).toContain('admin');
    expect(result.permissions).toContain('delete');
    expect(result.permissions).toContain('manage_users');
    expect(result.features).toContain('user_management');
    expect(result.features).toContain('analytics');
  });

  it('should authenticate successfully with premium user', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: 'premium123',
      user: { userId: 'premium123', role: 'premium' }
    });

    const request = new NextRequest('http://localhost/api/test');
    const result = await authenticateProductivityRequest(request);

    expect(result.success).toBe(true);
    expect(result.permissions).toContain('premium_features');
    expect(result.permissions).toContain('export');
    expect(result.permissions).toContain('advanced_search');
    expect(result.features).toContain('advanced_kanban');
    expect(result.features).toContain('calendar_sync');
  });

  it('should fail authentication when base auth fails', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expired' }
    });

    const request = new NextRequest('http://localhost/api/test');
    const result = await authenticateProductivityRequest(request);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(result.error?.message).toBe('Authentication required for productivity features');
  });

  it('should check feature access when required', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: 'user123',
      user: { userId: 'user123', role: 'user' }
    });

    const request = new NextRequest('http://localhost/api/test');
    const result = await authenticateProductivityRequest(request, 'notes');

    expect(result.success).toBe(true);
  });

  it('should handle authentication errors gracefully', async () => {
    mockAuthenticateRequest.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost/api/test');
    const result = await authenticateProductivityRequest(request);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('AUTH_ERROR');
  });
});

describe('withProductivityAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handler when authentication succeeds', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: 'user123',
      user: { userId: 'user123', role: 'user' }
    });

    const mockHandler = jest.fn().mockResolvedValue(new Response('Success'));
    const wrappedHandler = withProductivityAuth(mockHandler);

    const request = new NextRequest('http://localhost/api/test');
    const response = await wrappedHandler(request);

    expect(mockHandler).toHaveBeenCalled();
    expect(response).toBeInstanceOf(Response);
  });

  it('should return error response when authentication fails', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expired' }
    });

    const mockHandler = jest.fn();
    const wrappedHandler = withProductivityAuth(mockHandler);

    const request = new NextRequest('http://localhost/api/test');
    const response = await wrappedHandler(request);

    expect(mockHandler).not.toHaveBeenCalled();
    expect(response).toBeInstanceOf(Response);
  });

  it('should handle ProductivityError from handler', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      success: true,
      userId: 'user123',
      user: { userId: 'user123', role: 'user' }
    });

    const mockHandler = jest.fn().mockRejectedValue(
      new ProductivityError(ProductivityErrorCode.VALIDATION_ERROR, 'Invalid data', 400)
    );
    const wrappedHandler = withProductivityAuth(mockHandler);

    const request = new NextRequest('http://localhost/api/test');
    const response = await wrappedHandler(request);

    expect(response).toBeInstanceOf(Response);
  });
});

describe('hasPermission', () => {
  it('should return true when user has permission', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write', 'admin']
    };

    expect(hasPermission(authResult, 'read')).toBe(true);
    expect(hasPermission(authResult, 'admin')).toBe(true);
  });

  it('should return false when user does not have permission', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    expect(hasPermission(authResult, 'admin')).toBe(false);
    expect(hasPermission(authResult, 'delete')).toBe(false);
  });

  it('should return false when permissions are undefined', () => {
    const authResult = {
      success: true,
      userId: 'user123'
    };

    expect(hasPermission(authResult, 'read')).toBe(false);
  });
});

describe('requirePermission', () => {
  it('should not throw when user has permission', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write', 'admin']
    };

    expect(() => requirePermission(authResult, 'read')).not.toThrow();
    expect(() => requirePermission(authResult, 'admin')).not.toThrow();
  });

  it('should throw ProductivityError when user lacks permission', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    expect(() => requirePermission(authResult, 'admin')).toThrow(ProductivityError);
    expect(() => requirePermission(authResult, 'delete')).toThrow(ProductivityError);
  });
});

describe('checkResourceOwnership', () => {
  it('should return true when user owns resource', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    expect(checkResourceOwnership(authResult, 'user123')).toBe(true);
  });

  it('should return false when user does not own resource', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    expect(checkResourceOwnership(authResult, 'user456')).toBe(false);
  });

  it('should return true when user is admin and admin access is allowed', () => {
    const authResult = {
      success: true,
      userId: 'admin123',
      permissions: ['read', 'write', 'admin']
    };

    expect(checkResourceOwnership(authResult, 'user456', true)).toBe(true);
  });

  it('should return false when user is admin but admin access is not allowed', () => {
    const authResult = {
      success: true,
      userId: 'admin123',
      permissions: ['read', 'write', 'admin']
    };

    expect(checkResourceOwnership(authResult, 'user456', false)).toBe(false);
  });
});

describe('requireResourceOwnership', () => {
  it('should not throw when user owns resource', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    expect(() => requireResourceOwnership(authResult, 'user123')).not.toThrow();
  });

  it('should throw ProductivityError when user does not own resource', () => {
    const authResult = {
      success: true,
      userId: 'user123',
      permissions: ['read', 'write']
    };

    expect(() => requireResourceOwnership(authResult, 'user456')).toThrow(ProductivityError);
  });

  it('should not throw when admin accesses resource', () => {
    const authResult = {
      success: true,
      userId: 'admin123',
      permissions: ['read', 'write', 'admin']
    };

    expect(() => requireResourceOwnership(authResult, 'user456')).not.toThrow();
  });
});

describe('validateApiKey', () => {
  it('should validate correct API key format', async () => {
    const result = await validateApiKey('pk_test12345678');

    expect(result.success).toBe(true);
    expect(result.userId).toBe('api-user-12345678');
    expect(result.permissions).toContain('read');
    expect(result.permissions).toContain('write');
  });

  it('should reject invalid API key format', async () => {
    const result = await validateApiKey('invalid-key');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_API_KEY');
  });

  it('should reject empty API key', async () => {
    const result = await validateApiKey('');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_API_KEY');
  });
});