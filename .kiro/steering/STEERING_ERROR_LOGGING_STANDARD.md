# STEERING_ERROR_LOGGING_STANDARD

**Document Type:** Company Governance Standard  
**Version:** 1.0  
**Effective Date:** 2026-01-13  
**Authority:** Principal Architect  
**Scope:** All applications and services error handling and logging

## Purpose

This document establishes mandatory standards for error handling, logging, and observability to ensure consistent debugging capabilities, operational visibility, and compliance across all Logogear systems.

## Scope

This standard applies to:
- Backend services and APIs
- Frontend applications
- Background job processors
- Integration services
- Monitoring and alerting systems

## Mandatory Standards

### Error Categorization
All errors MUST be categorized using the following classification:

#### System Errors (5xx)
- **Database Connection Failures:** Connection timeouts, pool exhaustion
- **External Service Failures:** Third-party API failures, network timeouts
- **Resource Exhaustion:** Memory limits, disk space, CPU limits
- **Configuration Errors:** Missing environment variables, invalid configuration

#### Client Errors (4xx)
- **Authentication Errors:** Invalid credentials, expired tokens
- **Authorization Errors:** Insufficient permissions, access denied
- **Validation Errors:** Invalid input data, schema violations
- **Resource Not Found:** Missing resources, invalid IDs

#### Business Logic Errors
- **Workflow Violations:** Invalid state transitions, business rule violations
- **Data Integrity Errors:** Constraint violations, duplicate entries
- **Processing Errors:** File format errors, calculation failures

### Logging Levels
```typescript
// Mandatory Log Levels
enum LogLevel {
  ERROR = 'error',    // System errors, exceptions, failures
  WARN = 'warn',      // Deprecated features, unusual conditions
  INFO = 'info',      // General application flow, business events
  DEBUG = 'debug',    // Detailed debugging information
}

// Environment-specific log levels
const LOG_LEVELS = {
  development: 'debug',
  testing: 'error',
  staging: 'info',
  production: 'warn',
};
```

### Structured Logging Implementation
```typescript
// Mandatory Winston Configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'logogear-portal',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

### Error Response Standards
```typescript
// Mandatory Error Response Interface
interface ApiError {
  success: false;
  error: {
    code: string;           // ERROR_CODE_CONSTANT
    message: string;        // User-friendly message
    details?: any;          // Development details (dev only)
    timestamp: string;      // ISO timestamp
    requestId: string;      // Trace ID for debugging
    path?: string;          // Request path where error occurred
  };
}

// Error Response Factory
const createErrorResponse = (
  code: string, 
  message: string, 
  details?: any, 
  requestId?: string,
  path?: string
): ApiError => ({
  success: false,
  error: {
    code,
    message,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
    path,
  },
});
```

### Request Tracing
```typescript
// Mandatory Request ID Middleware
import { v4 as uuidv4 } from 'uuid';

const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Request Logging Middleware
const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    });
  });

  next();
};
```

### Error Handling Middleware
```typescript
// Centralized Error Handler
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true,
    public details?: any
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global Error Handler Middleware
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error occurred', {
    requestId: req.requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: (err as AppError).code,
      statusCode: (err as AppError).statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      userId: req.user?.id,
    },
  });

  // Determine status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid input data';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  }

  // Send error response
  res.status(statusCode).json(
    createErrorResponse(errorCode, message, (err as AppError).details, req.requestId, req.path)
  );
};
```

### Audit Logging
```typescript
// Audit Event Types
enum AuditEventType {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  DATA_EXPORT = 'DATA_EXPORT',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

// Audit Logging Function
const auditLog = (
  eventType: AuditEventType,
  userId: string,
  resourceId?: string,
  details?: any,
  req?: Request
) => {
  logger.info('Audit event', {
    eventType,
    userId,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
    requestId: req?.requestId,
    ipAddress: req?.ip,
    userAgent: req?.get('User-Agent'),
  });
};
```

## Environment-Specific Behavior

### Development Environment
```typescript
// Development Logging Configuration
if (process.env.NODE_ENV === 'development') {
  // Detailed error information
  logger.level = 'debug';
  
  // Stack traces in responses
  const createErrorResponse = (code: string, message: string, details?: any) => ({
    success: false,
    error: {
      code,
      message,
      details,
      stack: new Error().stack, // Include stack trace
      timestamp: new Date().toISOString(),
    },
  });
}
```

### Production Environment
```typescript
// Production Logging Configuration
if (process.env.NODE_ENV === 'production') {
  // Minimal error information to clients
  const createErrorResponse = (code: string, message: string) => ({
    success: false,
    error: {
      code,
      message: sanitizeErrorMessage(message), // Sanitize sensitive info
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  });

  // Enhanced security logging
  logger.add(new winston.transports.File({
    filename: 'logs/security.log',
    level: 'warn',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));
}
```

## Recommended Practices

### Performance Logging
```typescript
// Performance Monitoring
const performanceLogger = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // Alert on slow operations
  if (duration > 1000) {
    logger.warn('Slow operation detected', {
      operation,
      duration,
      metadata,
    });
  }
};

// Usage example
const startTime = Date.now();
await databaseOperation();
performanceLogger('database_query', Date.now() - startTime, { query: 'SELECT * FROM users' });
```

### Business Event Logging
```typescript
// Business Event Logging
const businessEventLogger = (event: string, data: any, userId?: string) => {
  logger.info('Business event', {
    event,
    data,
    userId,
    timestamp: new Date().toISOString(),
  });
};

// Usage examples
businessEventLogger('order_created', { orderId: '123', amount: 99.99 }, userId);
businessEventLogger('payment_processed', { paymentId: '456', status: 'success' }, userId);
```

### Log Aggregation
```typescript
// Structured logging for aggregation
const structuredLog = (level: string, message: string, metadata: any) => {
  logger.log(level, message, {
    ...metadata,
    service: 'logogear-portal',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
};
```

## Prohibited Practices

### Security Violations
- **PROHIBITED:** Logging sensitive data (passwords, tokens, personal information)
- **PROHIBITED:** Exposing internal error details to clients in production
- **PROHIBITED:** Missing request tracing for debugging
- **PROHIBITED:** Logging without proper sanitization
- **PROHIBITED:** Missing audit trails for sensitive operations
- **PROHIBITED:** Exposing stack traces in production error responses

### Logging Anti-patterns
- **PROHIBITED:** Using console.log() in production code
- **PROHIBITED:** Synchronous logging operations that block request processing
- **PROHIBITED:** Missing error context (request ID, user ID, operation)
- **PROHIBITED:** Inconsistent log formats across services
- **PROHIBITED:** Missing log rotation and retention policies
- **PROHIBITED:** Logging without proper error categorization

### Performance Issues
- **PROHIBITED:** Excessive logging that impacts performance
- **PROHIBITED:** Missing log level configuration
- **PROHIBITED:** Logging large objects without truncation
- **PROHIBITED:** Missing async logging for high-throughput operations

## Observability Requirements

### Monitoring Integration
```typescript
// Health Check Endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    checks: {
      database: 'healthy', // Implement actual health checks
      redis: 'healthy',
      external_services: 'healthy',
    },
  };

  logger.info('Health check requested', { healthCheck });
  res.status(200).json(healthCheck);
});
```

### Metrics Collection
```typescript
// Custom Metrics
const metrics = {
  requestCount: 0,
  errorCount: 0,
  responseTime: [],
};

// Metrics Middleware
const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  metrics.requestCount++;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metrics.responseTime.push(duration);

    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }

    // Log metrics periodically
    if (metrics.requestCount % 100 === 0) {
      logger.info('Metrics snapshot', { metrics });
    }
  });

  next();
};
```

## Compliance Requirements

### Code Review Checklist
- [ ] Proper error handling implemented for all async operations
- [ ] Structured logging with Winston configured
- [ ] Request tracing implemented with unique request IDs
- [ ] Error responses follow standard format
- [ ] Sensitive data excluded from logs
- [ ] Audit logging implemented for sensitive operations
- [ ] Environment-specific logging behavior configured
- [ ] Log rotation and retention configured

### Operational Requirements
- [ ] Log aggregation system configured (ELK stack, CloudWatch, etc.)
- [ ] Alerting configured for error rate thresholds
- [ ] Dashboard created for monitoring key metrics
- [ ] Log retention policy implemented
- [ ] Security monitoring configured for audit logs
- [ ] Performance monitoring integrated
- [ ] Health check endpoints implemented

## Enforcement

Violations of this standard will result in:
1. **Code Review Rejection:** Non-compliant logging will not be merged
2. **Production Incident:** Missing error handling may cause production issues
3. **Security Review:** Logging violations require security team review
4. **Operational Review:** Poor observability impacts operational capabilities

## Document Control

- **Next Review Date:** 2026-07-13
- **Document Owner:** Principal Architect
- **Approval Authority:** CTO
- **Distribution:** All developers, DevOps teams, security teams, operations teams