import { NextResponse } from 'next/server';

/**
 * Standard error codes for productivity APIs
 */
export enum ProductivityErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_ID = 'INVALID_ID',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT'
}

/**
 * Standard error response interface
 */
export interface ProductivityErrorResponse {
  success: false;
  error: {
    code: ProductivityErrorCode;
    message: string;
    details?: any;
    timestamp?: string;
    requestId?: string;
  };
}

/**
 * Standard success response interface
 */
export interface ProductivitySuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
  requestId?: string;
}

/**
 * Union type for all API responses
 */
export type ProductivityApiResponse<T = any> = ProductivitySuccessResponse<T> | ProductivityErrorResponse;

/**
 * Error class forivity-specific errors
 */
export class ProductivityError extends Error {
  public readonly code: ProductivityErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    code: ProductivityErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ProductivityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ProductivityErrorCode,
  message: string,
  statusCode: number = 500,
  details?: any,
  requestId?: string
): NextResponse<ProductivityErrorResponse> {
  const errorResponse: ProductivityErrorResponse = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(requestId && { requestId })
    }
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): NextResponse<ProductivitySuccessResponse<T>> {
  const successResponse: ProductivitySuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(message && { message }),
    ...(requestId && { requestId })
  };

  return NextResponse.json(successResponse);
}

/**
 * Handles common error scenarios and returns appropriate responses
 */
export function handleProductivityError(error: any, requestId?: string): NextResponse<ProductivityErrorResponse> {
  console.error('Productivity API Error:', error);

  // Handle ProductivityError instances
  if (error instanceof ProductivityError) {
    return createErrorResponse(error.code, error.message, error.statusCode, error.details, requestId);
  }

  // Handle MongoDB validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map((err: any) => err.message);
    return createErrorResponse(
      ProductivityErrorCode.VALIDATION_ERROR,
      'Validation failed: ' + validationErrors.join(', '),
      400,
      { validationErrors },
      requestId
    );
  }

  // Handle MongoDB cast errors (invalid ObjectId)
  if (error.name === 'CastError' || error.message?.includes('Cast to ObjectId failed')) {
    return createErrorResponse(
      ProductivityErrorCode.INVALID_ID,
      'Invalid ID format',
      400,
      { field: error.path },
      requestId
    );
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return createErrorResponse(
      ProductivityErrorCode.RESOURCE_CONFLICT,
      `Duplicate ${field} value`,
      409,
      { field, value: error.keyValue?.[field] },
      requestId
    );
  }

  // Handle authentication errors
  if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
    return createErrorResponse(
      ProductivityErrorCode.UNAUTHORIZED,
      'Authentication required',
      401,
      undefined,
      requestId
    );
  }

  // Handle permission errors
  if (error.message?.includes('permission') || error.message?.includes('forbidden')) {
    return createErrorResponse(
      ProductivityErrorCode.FORBIDDEN,
      'Insufficient permissions',
      403,
      undefined,
      requestId
    );
  }

  // Handle rate limiting
  if (error.message?.includes('rate limit')) {
    return createErrorResponse(
      ProductivityErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      429,
      undefined,
      requestId
    );
  }

  // Default to internal server error
  return createErrorResponse(
    ProductivityErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    500,
    process.env.NODE_ENV === 'development' ? { originalError: error.message, stack: error.stack } : undefined,
    requestId
  );
}

/**
 * Validates common input parameters
 */
export class ProductivityValidator {
  /**
   * Validates required string fields
   */
  static validateRequiredString(value: any, fieldName: string, maxLength?: number): void {
    if (!value || typeof value !== 'string') {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} is required and must be a string`,
        400
      );
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} cannot be empty`,
        400
      );
    }

    if (maxLength && trimmed.length > maxLength) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} cannot exceed ${maxLength} characters`,
        400
      );
    }
  }

  /**
   * Validates optional string fields
   */
  static validateOptionalString(value: any, fieldName: string, maxLength?: number): void {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        throw new ProductivityError(
          ProductivityErrorCode.VALIDATION_ERROR,
          `${fieldName} must be a string`,
          400
        );
      }

      if (maxLength && value.length > maxLength) {
        throw new ProductivityError(
          ProductivityErrorCode.VALIDATION_ERROR,
          `${fieldName} cannot exceed ${maxLength} characters`,
          400
        );
      }
    }
  }

  /**
   * Validates date fields
   */
  static validateDate(value: any, fieldName: string, required: boolean = true): void {
    if (required && (value === undefined || value === null)) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} is required`,
        400
      );
    }

    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ProductivityError(
          ProductivityErrorCode.VALIDATION_ERROR,
          `${fieldName} must be a valid date`,
          400
        );
      }
    }
  }

  /**
   * Validates date range (start date must be before end date)
   */
  static validateDateRange(startDate: any, endDate: any): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start.getTime() > end.getTime()) {
        throw new ProductivityError(
          ProductivityErrorCode.VALIDATION_ERROR,
          'Start date must be before end date',
          400
        );
      }
    }
  }

  /**
   * Validates enum values
   */
  static validateEnum(value: any, fieldName: string, allowedValues: string[], required: boolean = true): void {
    if (required && (value === undefined || value === null)) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} is required`,
        400
      );
    }

    if (value !== undefined && value !== null && !allowedValues.includes(value)) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        400
      );
    }
  }

  /**
   * Validates boolean fields
   */
  static validateBoolean(value: any, fieldName: string, required: boolean = true): void {
    if (required && (value === undefined || value === null)) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} is required`,
        400
      );
    }

    if (value !== undefined && value !== null && typeof value !== 'boolean') {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} must be a boolean`,
        400
      );
    }
  }

  /**
   * Validates URL fields
   */
  static validateUrl(value: any, fieldName: string, required: boolean = false): void {
    if (required && (value === undefined || value === null || value === '')) {
      throw new ProductivityError(
        ProductivityErrorCode.VALIDATION_ERROR,
        `${fieldName} is required`,
        400
      );
    }

    if (value && typeof value === 'string' && value.trim() !== '') {
      // Allow relative URLs (starting with /) or absolute URLs
      if (!/^(\/|https?:\/\/)/.test(value.trim())) {
        throw new ProductivityError(
          ProductivityErrorCode.VALIDATION_ERROR,
          `${fieldName} must be a valid URL or path`,
          400
        );
      }
    }
  }
}

/**
 * Generates a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}