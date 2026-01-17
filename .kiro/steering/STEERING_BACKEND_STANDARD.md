# STEERING_BACKEND_STANDARD

**Document Type:** Company Governance Standard  
**Version:** 1.0  
**Effective Date:** 2026-01-13  
**Authority:** Principal Architect  
**Scope:** All backend services and APIs

## Purpose

This document establishes mandatory standards for backend service development to ensure scalability, security, and maintainability across all Logogear backend systems.

## Scope

This standard applies to:
- REST APIs and GraphQL services
- Microservices and monolithic applications
- Background job processors
- Data processing services
- Integration services

## Mandatory Standards

### Project Structure
```
backend/
├── src/
│   ├── config/             # Configuration management
│   ├── controllers/        # HTTP request handlers
│   ├── middleware/         # Express middleware functions
│   ├── services/           # Business logic layer
│   ├── repositories/       # Data access layer
│   ├── models/             # Data models and schemas
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── validators/         # Input validation schemas
├── tests/                  # Test files
├── docs/                   # API documentation
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── .env.example            # Environment template
```

### Technology Stack Requirements
- **Runtime:** Node.js 18+ LTS
- **Language:** TypeScript (mandatory for new projects)
- **Framework:** Express.js 4+ with TypeScript
- **Database ORM:** Prisma (preferred) or TypeORM
- **Validation:** Zod for schema validation
- **Logging:** Winston with structured JSON logging
- **Testing:** Jest with Supertest for API testing
- **Documentation:** OpenAPI/Swagger specification

### API Design Standards
- **URL Structure:** RESTful design with resource-based URLs
  ```
  GET    /api/v1/users              # List resources
  GET    /api/v1/users/:id          # Get specific resource
  POST   /api/v1/users              # Create resource
  PUT    /api/v1/users/:id          # Update resource (full)
  PATCH  /api/v1/users/:id          # Update resource (partial)
  DELETE /api/v1/users/:id          # Delete resource
  ```

- **HTTP Status Codes:** Proper status code usage
  - 200: Success with response body
  - 201: Resource created successfully
  - 204: Success with no response body
  - 400: Bad request (validation errors)
  - 401: Unauthorized (authentication required)
  - 403: Forbidden (insufficient permissions)
  - 404: Resource not found
  - 409: Conflict (duplicate resource)
  - 422: Unprocessable entity (business logic error)
  - 500: Internal server error

### Response Format Standards
```typescript
// Success Response
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Error Response
interface ApiError {
  success: false;
  error: {
    code: string;           // ERROR_CODE_CONSTANT
    message: string;        // User-friendly message
    details?: any;          // Development details (dev only)
    timestamp: string;      // ISO timestamp
    requestId: string;      // Trace ID for debugging
  };
}
```

### Environment Configuration
- **MANDATORY:** Environment validation at startup using Zod
- **MANDATORY:** Separate configurations for development, staging, production
- **MANDATORY:** No hardcoded secrets or configuration values
- **MANDATORY:** Graceful degradation for optional services

```typescript
// Environment Schema Example
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().transform(Number).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
```

### Security Requirements
- **Authentication:** JWT tokens with proper expiration (24 hours maximum)
- **Authorization:** Role-based access control (RBAC) implementation
- **Input Validation:** All inputs MUST be validated using Zod schemas
- **Rate Limiting:** Implement rate limiting for all public endpoints
- **CORS:** Properly configured CORS policies
- **Headers:** Security headers using Helmet.js
- **Secrets:** Environment variables for all sensitive data
- **SQL Injection:** Use parameterized queries only (ORM enforced)

## Recommended Practices

### Service Layer Architecture
- **Controllers:** Handle HTTP concerns only (request/response)
- **Services:** Contain business logic and orchestration
- **Repositories:** Handle data access and persistence
- **Models:** Define data structures and validation
- **Middleware:** Handle cross-cutting concerns (auth, logging, validation)

### Error Handling Strategy
```typescript
// Centralized Error Handler
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage
throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
```

### Logging Standards
```typescript
// Structured Logging
logger.info('User login attempt', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString(),
});
```

### Database Best Practices
- Use connection pooling for database connections
- Implement proper indexing strategies
- Use transactions for multi-step operations
- Implement soft deletes for audit trails
- Use database migrations for schema changes
- Implement proper backup and recovery procedures

### Testing Strategy
- **Unit Tests:** 80%+ code coverage requirement
- **Integration Tests:** Test API endpoints with real database
- **Contract Tests:** API contract testing with OpenAPI
- **Load Tests:** Performance testing for critical endpoints
- **Security Tests:** Automated security scanning

## Prohibited Practices

### Anti-patterns
- **PROHIBITED:** Synchronous file operations in request handlers
- **PROHIBITED:** Database queries in controllers (use services/repositories)
- **PROHIBITED:** Hardcoded configuration values
- **PROHIBITED:** Missing error handling for async operations
- **PROHIBITED:** Exposing internal error details to clients
- **PROHIBITED:** Using `any` type in TypeScript
- **PROHIBITED:** Missing input validation on public endpoints
- **PROHIBITED:** Storing passwords in plain text
- **PROHIBITED:** Missing rate limiting on authentication endpoints

### Security Violations
- **PROHIBITED:** SQL injection vulnerabilities
- **PROHIBITED:** Cross-site scripting (XSS) vulnerabilities
- **PROHIBITED:** Missing authentication on protected endpoints
- **PROHIBITED:** Exposing sensitive data in error messages
- **PROHIBITED:** Using weak cryptographic algorithms
- **PROHIBITED:** Missing HTTPS in production environments

## Performance Requirements

### Response Time Standards
- **Authentication endpoints:** < 200ms (95th percentile)
- **CRUD operations:** < 300ms (95th percentile)
- **Complex queries:** < 1000ms (95th percentile)
- **File uploads:** < 5000ms for files up to 10MB
- **Health checks:** < 50ms

### Scalability Requirements
- Services MUST be stateless for horizontal scaling
- Database connections MUST use connection pooling
- Caching MUST be implemented for frequently accessed data
- Background jobs MUST be used for long-running operations
- Proper monitoring and alerting MUST be implemented

## Compliance Requirements

### Code Review Checklist
- [ ] TypeScript strict mode enabled
- [ ] All inputs validated with Zod schemas
- [ ] Proper error handling implemented
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Logging implemented for all operations
- [ ] Tests written with adequate coverage
- [ ] API documentation updated
- [ ] Environment variables properly configured
- [ ] Database migrations created if needed

### Deployment Requirements
- Health check endpoint MUST be implemented (`/health`)
- Graceful shutdown MUST be implemented
- Environment-specific configuration MUST be validated
- Database migrations MUST be automated
- Monitoring and alerting MUST be configured
- Backup procedures MUST be documented

## Enforcement

Violations of this standard will result in:
1. **Code Review Rejection:** Non-compliant code will not be merged
2. **Security Review:** Security violations require immediate remediation
3. **Performance Review:** Performance issues require optimization plans
4. **Architecture Review:** Major violations require architecture team review

## Document Control

- **Next Review Date:** 2026-07-13
- **Document Owner:** Principal Architect
- **Approval Authority:** CTO
- **Distribution:** All backend developers, DevOps teams, security teams