import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { env } from '../config/environment';
import { ErrorResponse, ValidationError } from '../types/api';

export class ErrorMiddleware {
  /**
   * Global error handler middleware
   */
  static handle() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      const timestamp = new Date();

      // Log the error
      logger.error('Request error', {
        requestId,
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
      });

      // Handle Zod validation errors
      if (err instanceof ZodError) {
        const validationError: ValidationError = {
          success: false,
          error: 'Validation Error',
          message: 'Request validation failed',
          details: err.errors.map(error => ({
            field: error.path.join('.'),
            message: error.message,
            code: error.code,
            value: error.input,
          })),
          timestamp,
        };

        return res.status(400).json(validationError);
      }

      // Handle authentication errors
      if (err.name === 'UnauthorizedError' || err.status === 401) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp,
          requestId,
        };

        return res.status(401).json(errorResponse);
      }

      // Handle authorization errors
      if (err.status === 403) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          timestamp,
          requestId,
        };

        return res.status(403).json(errorResponse);
      }

      // Handle not found errors
      if (err.status === 404) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Not Found',
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND',
          timestamp,
          requestId,
        };

        return res.status(404).json(errorResponse);
      }

      // Handle rate limiting errors
      if (err.status === 429) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp,
          requestId,
        };

        return res.status(429).json(errorResponse);
      }

      // Handle database errors
      if (err.code === 'P2002') { // Prisma unique constraint violation
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Conflict',
          message: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE',
          timestamp,
          requestId,
        };

        return res.status(409).json(errorResponse);
      }

      if (err.code === 'P2025') { // Prisma record not found
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Not Found',
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND',
          timestamp,
          requestId,
        };

        return res.status(404).json(errorResponse);
      }

      // Handle file upload errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'File Too Large',
          message: 'File size exceeds the maximum allowed limit',
          code: 'FILE_TOO_LARGE',
          timestamp,
          requestId,
        };

        return res.status(413).json(errorResponse);
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid File',
          message: 'Unexpected file field or file type',
          code: 'INVALID_FILE',
          timestamp,
          requestId,
        };

        return res.status(400).json(errorResponse);
      }

      // Handle SSO errors
      if (err.name === 'SSOError' || err.message?.includes('SSO')) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'SSO Error',
          message: 'Single Sign-On authentication failed',
          code: 'SSO_FAILED',
          details: env.NODE_ENV === 'development' ? { originalError: err.message } : undefined,
          timestamp,
          requestId,
        };

        return res.status(401).json(errorResponse);
      }

      // Handle session errors
      if (err.name === 'SessionError' || err.message?.includes('session')) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Session Error',
          message: 'Session is invalid or expired',
          code: 'SESSION_INVALID',
          timestamp,
          requestId,
        };

        return res.status(401).json(errorResponse);
      }

      // Handle permission errors
      if (err.name === 'PermissionError' || err.message?.includes('permission')) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Permission Denied',
          message: 'You do not have permission to perform this action',
          code: 'PERMISSION_DENIED',
          timestamp,
          requestId,
        };

        return res.status(403).json(errorResponse);
      }

      // Handle configuration errors
      if (err.name === 'ConfigurationError') {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Configuration Error',
          message: 'System configuration error',
          code: 'CONFIG_ERROR',
          timestamp,
          requestId,
        };

        return res.status(500).json(errorResponse);
      }

      // Default error response
      const statusCode = err.status || err.statusCode || 500;
      const errorResponse: ErrorResponse = {
        success: false,
        error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
        message: env.NODE_ENV === 'production' && statusCode >= 500 
          ? 'An unexpected error occurred' 
          : err.message || 'Request failed',
        code: err.code || 'UNKNOWN_ERROR',
        details: env.NODE_ENV === 'development' ? {
          stack: err.stack,
          originalError: err.message,
        } : undefined,
        timestamp,
        requestId,
      };

      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * 404 Not Found handler
   */
  static notFound() {
    return (req: Request, res: Response) => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND',
        timestamp: new Date(),
      };

      res.status(404).json(errorResponse);
    };
  }

  /**
   * Async error wrapper
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

// Custom error classes
export class AuthenticationError extends Error {
  public status: number;
  public code: string;

  constructor(message: string = 'Authentication failed', code: string = 'AUTH_FAILED') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
    this.code = code;
  }
}

export class AuthorizationError extends Error {
  public status: number;
  public code: string;

  constructor(message: string = 'Insufficient permissions', code: string = 'INSUFFICIENT_PERMISSIONS') {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 403;
    this.code = code;
  }
}

export class ValidationError extends Error {
  public status: number;
  public code: string;
  public details: any;

  constructor(message: string = 'Validation failed', details: any = {}, code: string = 'VALIDATION_FAILED') {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  public status: number;
  public code: string;

  constructor(message: string = 'Resource not found', code: string = 'RESOURCE_NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.code = code;
  }
}

export class ConflictError extends Error {
  public status: number;
  public code: string;

  constructor(message: string = 'Resource conflict', code: string = 'RESOURCE_CONFLICT') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
    this.code = code;
  }
}

export class SSOError extends Error {
  public status: number;
  public code: string;
  public provider?: string;

  constructor(message: string = 'SSO authentication failed', provider?: string, code: string = 'SSO_FAILED') {
    super(message);
    this.name = 'SSOError';
    this.status = 401;
    this.code = code;
    this.provider = provider;
  }
}

export class SessionError extends Error {
  public status: number;
  public code: string;

  constructor(message: string = 'Session error', code: string = 'SESSION_ERROR') {
    super(message);
    this.name = 'SessionError';
    this.status = 401;
    this.code = code;
  }
}

export class PermissionError extends Error {
  public status: number;
  public code: string;
  public requiredPermissions?: string[];

  constructor(message: string = 'Permission denied', requiredPermissions?: string[], code: string = 'PERMISSION_DENIED') {
    super(message);
    this.name = 'PermissionError';
    this.status = 403;
    this.code = code;
    this.requiredPermissions = requiredPermissions;
  }
}

export class ConfigurationError extends Error {
  public status: number;
  public code: string;

  constructor(message: string = 'Configuration error', code: string = 'CONFIG_ERROR') {
    super(message);
    this.name = 'ConfigurationError';
    this.status = 500;
    this.code = code;
  }
}