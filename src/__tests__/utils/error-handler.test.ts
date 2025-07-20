import { ErrorHandler } from '@/lib/utils/error-handler';
import { NotificationSystem } from '@/lib/utils/notification-system';

// Mock the notification system
jest.mock('@/lib/utils/notification-system', () => ({
  NotificationSystem: {
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn()
  }
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Parsing', () => {
    it('should handle string errors', () => {
      const result = ErrorHandler.handleError('Test error message');

      expect(result.code).toBe('SYSTEM_UNEXPECTED_ERROR');
      expect(result.message).toBe('Test error message');
      expect(result.userMessage).toBe('Test error message');
      expect(result.severity).toBe('medium');
      expect(result.category).toBe('system');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = ErrorHandler.handleError(error);

      expect(result.code).toBe('SYSTEM_UNEXPECTED_ERROR');
      expect(result.message).toBe('Test error');
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
      expect(result.severity).toBe('medium');
      expect(result.category).toBe('system');
    });

    it('should handle errors with specific codes', () => {
      const error = new Error('Validation failed');
      (error as any).code = 'VALIDATION_REQUIRED_FIELD';

      const result = ErrorHandler.handleError(error);

      expect(result.code).toBe('VALIDATION_REQUIRED_FIELD');
      expect(result.message).toBe('Required field is missing');
      expect(result.userMessage).toBe('Please fill in all required fields');
      expect(result.severity).toBe('low');
      expect(result.category).toBe('validation');
    });

    it('should handle network errors', () => {
      const error = new Error('fetch failed');
      const result = ErrorHandler.handleError(error);

      expect(result.code).toBe('NETWORK_CONNECTION_FAILED');
      expect(result.category).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      const result = ErrorHandler.handleError(error);

      expect(result.code).toBe('NETWORK_TIMEOUT');
      expect(result.category).toBe('network');
      expect(result.retryable).toBe(true);
    });
  });

  describe('API Error Handling', () => {
    it('should handle 400 Bad Request', () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid input',
            userMessage: 'Please check your input'
          }
        }
      };

      const result = ErrorHandler.handleError(apiError);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.userMessage).toBe('Please check your input');
      expect(result.severity).toBe('low');
      expect(result.category).toBe('validation');
    });

    it('should handle 401 Unauthorized', () => {
      const apiError = {
        response: {
          status: 401,
          data: {}
        }
      };

      const result = ErrorHandler.handleError(apiError);

      expect(result.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(result.category).toBe('authentication');
    });

    it('should handle 403 Forbidden', () => {
      const apiError = {
        response: {
          status: 403,
          data: {}
        }
      };

      const result = ErrorHandler.handleError(apiError);

      expect(result.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      expect(result.category).toBe('authorization');
    });

    it('should handle 404 Not Found', () => {
      const apiError = {
        response: {
          status: 404,
          data: {}
        }
      };

      const result = ErrorHandler.handleError(apiError);

      expect(result.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.userMessage).toBe('The requested item was not found');
    });

    it('should handle 409 Conflict', () => {
      const apiError = {
        response: {
          status: 409,
          data: {}
        }
      };

      const result = ErrorHandler.handleError(apiError);

      expect(result.code).toBe('BUSINESS_DUPLICATE_ENTRY');
      expect(result.category).toBe('business');
    });

    it('should handle 500 Internal Server Error', () => {
      const apiError = {
        response: {
          status: 500,
          data: {}
        }
      };

      const result = ErrorHandler.handleError(apiError);

      expect(result.code).toBe('NETWORK_SERVER_ERROR');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Notification Integration', () => {
    it('should show warning notification for low severity errors', () => {
      const error = ErrorHandler.createError('VALIDATION_REQUIRED_FIELD');
      ErrorHandler.handleError(error);

      expect(NotificationSystem.warning).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Please fill in all required fields'
      });
    });

    it('should show error notification for medium severity errors', () => {
      const error = ErrorHandler.createError('AUTH_INVALID_CREDENTIALS');
      ErrorHandler.handleError(error);

      expect(NotificationSystem.error).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Invalid username or password'
      });
    });

    it('should show persistent error notification for high severity errors', () => {
      const error = ErrorHandler.createError('SYSTEM_DATABASE_ERROR');
      ErrorHandler.handleError(error);

      expect(NotificationSystem.error).toHaveBeenCalledWith({
        title: 'System Error',
        message: 'A system error occurred. Please try again.',
        persistent: true
      });
    });

    it('should use custom message when provided', () => {
      const error = ErrorHandler.createError('VALIDATION_REQUIRED_FIELD');
      ErrorHandler.handleError(error, undefined, 'Custom error message');

      expect(NotificationSystem.warning).toHaveBeenCalledWith({
        title: 'Validation Error',
        message: 'Custom error message'
      });
    });
  });

  describe('Utility Methods', () => {
    it('should create custom errors with codes', () => {
      const error = ErrorHandler.createError('VALIDATION_REQUIRED_FIELD', 'Custom message');

      expect(error.message).toBe('Custom message');
      expect((error as any).code).toBe('VALIDATION_REQUIRED_FIELD');
    });

    it('should check if error is retryable', () => {
      const retryableError = ErrorHandler.createError('NETWORK_CONNECTION_FAILED');
      const nonRetryableError = ErrorHandler.createError('VALIDATION_REQUIRED_FIELD');

      expect(ErrorHandler.isRetryable(retryableError)).toBe(true);
      expect(ErrorHandler.isRetryable(nonRetryableError)).toBe(false);
    });

    it('should check if error is recoverable', () => {
      const recoverableError = ErrorHandler.createError('VALIDATION_REQUIRED_FIELD');
      const nonRecoverableError = ErrorHandler.createError('AUTH_INSUFFICIENT_PERMISSIONS');

      expect(ErrorHandler.isRecoverable(recoverableError)).toBe(true);
      expect(ErrorHandler.isRecoverable(nonRecoverableError)).toBe(false);
    });

    it('should get user-friendly error messages', () => {
      const error = ErrorHandler.createError('VALIDATION_REQUIRED_FIELD');
      const userMessage = ErrorHandler.getUserMessage(error);

      expect(userMessage).toBe('Please fill in all required fields');
    });
  });

  describe('Specialized Error Handlers', () => {
    it('should handle API errors with context', () => {
      const apiError = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        }
      };

      const result = ErrorHandler.handleApiError(apiError, {
        component: 'TestComponent',
        action: 'testAction'
      });

      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle validation errors', () => {
      const validationErrors = {
        email: 'Invalid email format',
        password: 'Password too short'
      };

      ErrorHandler.handleValidationError(validationErrors, {
        component: 'LoginForm'
      });

      expect(NotificationSystem.warning).toHaveBeenCalledTimes(2);
      expect(NotificationSystem.warning).toHaveBeenCalledWith({
        title: 'email Error',
        message: 'Invalid email format'
      });
      expect(NotificationSystem.warning).toHaveBeenCalledWith({
        title: 'password Error',
        message: 'Password too short'
      });
    });

    it('should handle network errors with context', () => {
      const networkError = new Error('Network connection failed');

      const result = ErrorHandler.handleNetworkError(networkError, {
        component: 'DataFetcher'
      });

      expect(result.code).toBe('NETWORK_CONNECTION_FAILED');
      expect(result.category).toBe('network');
    });
  });
});