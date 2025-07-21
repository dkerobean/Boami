import {
  ProductivityError,
  ProductivityErrorCode,
  createErrorResponse,
  createSuccessResponse,
  handleProductivityError,
  ProductivityValidator
} from '@/lib/utils/productivity-error-handler';

describe('ProductivityError', () => {
  it('should create error with correct properties', () => {
    const error = new ProductivityError(
      ProductivityErrorCode.VALIDATION_ERROR,
      'Test error message',
      400,
      { field: 'test' }
    );

    expect(error.name).toBe('ProductivityError');
    expect(error.code).toBe(ProductivityErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe('Test error message');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'test' });
  });

  it('should default to status code 500', () => {
    const error = new ProductivityError(
      ProductivityErrorCode.INTERNAL_ERROR,
      'Internal error'
    );

    expect(error.statusCode).toBe(500);
  });
});

describe('createErrorResponse', () => {
  it('should create standardized error response', () => {
    const response = createErrorResponse(
      ProductivityErrorCode.VALIDATION_ERROR,
      'Validation failed',
      400,
      { field: 'title' },
      'req_123'
    );

    expect(response.status).toBe(400);

    // Note: In a real test, you'd need to extract the JSON from the NextResponse
    // This is a simplified test focusing on the structure
  });
});

describe('createSuccessResponse', () => {
  it('should create standardized success response', () => {
    const data = { id: 1, name: 'Test' };
    const response = createSuccessResponse(data, 'Success message', 'req_123');

    expect(response.status).toBe(200);
    // Note: In a real test, you'd need to extract the JSON from the NextResponse
  });
});

describe('handleProductivityError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle ProductivityError instances', () => {
    const error = new ProductivityError(
      ProductivityErrorCode.VALIDATION_ERROR,
      'Test validation error',
      400
    );

    const response = handleProductivityError(error, 'req_123');
    expect(response.status).toBe(400);
  });

  it('should handle MongoDB validation errors', () => {
    const mongoError = {
      name: 'ValidationError',
      errors: {
        title: { message: 'Title is required' },
        content: { message: 'Content is required' }
      }
    };

    const response = handleProductivityError(mongoError, 'req_123');
    expect(response.status).toBe(400);
  });

  it('should handle MongoDB cast errors', () => {
    const castError = {
      name: 'CastError',
      path: 'id',
      message: 'Cast to ObjectId failed'
    };

    const response = handleProductivityError(castError, 'req_123');
    expect(response.status).toBe(400);
  });

  it('should handle MongoDB duplicate key errors', () => {
    const duplicateError = {
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'test@example.com' }
    };

    const response = handleProductivityError(duplicateError, 'req_123');
    expect(response.status).toBe(409);
  });

  it('should handle authentication errors', () => {
    const authError = new Error('Authentication required');
    const response = handleProductivityError(authError, 'req_123');
    expect(response.status).toBe(401);
  });

  it('should handle permission errors', () => {
    const permissionError = new Error('Permission denied');
    const response = handleProductivityError(permissionError, 'req_123');
    expect(response.status).toBe(403);
  });

  it('should handle rate limit errors', () => {
    const rateLimitError = new Error('Rate limit exceeded');
    const response = handleProductivityError(rateLimitError, 'req_123');
    expect(response.status).toBe(429);
  });

  it('should default to internal server error', () => {
    const unknownError = new Error('Unknown error');
    const response = handleProductivityError(unknownError, 'req_123');
    expect(response.status).toBe(500);
  });
});

describe('ProductivityValidator', () => {
  describe('validateRequiredString', () => {
    it('should pass for valid string', () => {
      expect(() => {
        ProductivityValidator.validateRequiredString('Valid string', 'field');
      }).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => {
        ProductivityValidator.validateRequiredString('', 'field');
      }).toThrow(ProductivityError);
    });

    it('should throw for whitespace-only string', () => {
      expect(() => {
        ProductivityValidator.validateRequiredString('   ', 'field');
      }).toThrow(ProductivityError);
    });

    it('should throw for non-string value', () => {
      expect(() => {
        ProductivityValidator.validateRequiredString(123, 'field');
      }).toThrow(ProductivityError);
    });

    it('should throw for string exceeding max length', () => {
      expect(() => {
        ProductivityValidator.validateRequiredString('a'.repeat(101), 'field', 100);
      }).toThrow(ProductivityError);
    });
  });

  describe('validateOptionalString', () => {
    it('should pass for undefined value', () => {
      expect(() => {
        ProductivityValidator.validateOptionalString(undefined, 'field');
      }).not.toThrow();
    });

    it('should pass for null value', () => {
      expect(() => {
        ProductivityValidator.validateOptionalString(null, 'field');
      }).not.toThrow();
    });

    it('should pass for valid string', () => {
      expect(() => {
        ProductivityValidator.validateOptionalString('Valid string', 'field');
      }).not.toThrow();
    });

    it('should throw for non-string value', () => {
      expect(() => {
        ProductivityValidator.validateOptionalString(123, 'field');
      }).toThrow(ProductivityError);
    });
  });

  describe('validateDate', () => {
    it('should pass for valid date string', () => {
      expect(() => {
        ProductivityValidator.validateDate('2024-01-01', 'date');
      }).not.toThrow();
    });

    it('should pass for Date object', () => {
      expect(() => {
        ProductivityValidator.validateDate(new Date(), 'date');
      }).not.toThrow();
    });

    it('should throw for invalid date string', () => {
      expect(() => {
        ProductivityValidator.validateDate('invalid-date', 'date');
      }).toThrow(ProductivityError);
    });

    it('should throw for required date that is undefined', () => {
      expect(() => {
        ProductivityValidator.validateDate(undefined, 'date', true);
      }).toThrow(ProductivityError);
    });

    it('should pass for optional date that is undefined', () => {
      expect(() => {
        ProductivityValidator.validateDate(undefined, 'date', false);
      }).not.toThrow();
    });
  });

  describe('validateDateRange', () => {
    it('should pass for valid date range', () => {
      expect(() => {
        ProductivityValidator.validateDateRange('2024-01-01', '2024-01-02');
      }).not.toThrow();
    });

    it('should throw when start date is after end date', () => {
      expect(() => {
        ProductivityValidator.validateDateRange('2024-01-02', '2024-01-01');
      }).toThrow(ProductivityError);
    });

    it('should pass when dates are equal', () => {
      expect(() => {
        ProductivityValidator.validateDateRange('2024-01-01', '2024-01-01');
      }).not.toThrow();
    });
  });

  describe('validateEnum', () => {
    const validValues = ['red', 'green', 'blue'];

    it('should pass for valid enum value', () => {
      expect(() => {
        ProductivityValidator.validateEnum('red', 'color', validValues);
      }).not.toThrow();
    });

    it('should throw for invalid enum value', () => {
      expect(() => {
        ProductivityValidator.validateEnum('yellow', 'color', validValues);
      }).toThrow(ProductivityError);
    });

    it('should throw for required enum that is undefined', () => {
      expect(() => {
        ProductivityValidator.validateEnum(undefined, 'color', validValues, true);
      }).toThrow(ProductivityError);
    });

    it('should pass for optional enum that is undefined', () => {
      expect(() => {
        ProductivityValidator.validateEnum(undefined, 'color', validValues, false);
      }).not.toThrow();
    });
  });

  describe('validateBoolean', () => {
    it('should pass for true', () => {
      expect(() => {
        ProductivityValidator.validateBoolean(true, 'flag');
      }).not.toThrow();
    });

    it('should pass for false', () => {
      expect(() => {
        ProductivityValidator.validateBoolean(false, 'flag');
      }).not.toThrow();
    });

    it('should throw for non-boolean value', () => {
      expect(() => {
        ProductivityValidator.validateBoolean('true', 'flag');
      }).toThrow(ProductivityError);
    });

    it('should throw for required boolean that is undefined', () => {
      expect(() => {
        ProductivityValidator.validateBoolean(undefined, 'flag', true);
      }).toThrow(ProductivityError);
    });
  });

  describe('validateUrl', () => {
    it('should pass for valid HTTP URL', () => {
      expect(() => {
        ProductivityValidator.validateUrl('https://example.com', 'url');
      }).not.toThrow();
    });

    it('should pass for valid relative URL', () => {
      expect(() => {
        ProductivityValidator.validateUrl('/path/to/resource', 'url');
      }).not.toThrow();
    });

    it('should pass for empty optional URL', () => {
      expect(() => {
        ProductivityValidator.validateUrl('', 'url', false);
      }).not.toThrow();
    });

    it('should throw for invalid URL format', () => {
      expect(() => {
        ProductivityValidator.validateUrl('invalid-url', 'url');
      }).toThrow(ProductivityError);
    });

    it('should throw for required URL that is empty', () => {
      expect(() => {
        ProductivityValidator.validateUrl('', 'url', true);
      }).toThrow(ProductivityError);
    });
  });
});