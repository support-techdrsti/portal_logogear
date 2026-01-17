# STEERING_ENVIRONMENT_STANDARD

**Document Type:** Company Governance Standard  
**Version:** 1.0  
**Effective Date:** 2026-01-13  
**Authority:** Principal Architect  
**Scope:** All application environments and configuration management

## Purpose

This document establishes mandatory standards for environment separation, configuration management, and secrets handling to ensure security, consistency, and operational excellence across all deployment environments.

## Scope

This standard applies to:
- Local development environments
- Continuous integration environments
- Staging/testing environments
- Production environments
- Configuration management systems
- Secrets management solutions

## Mandatory Standards

### Environment Separation
All applications MUST support the following environment types:

1. **Development (local):** Individual developer workstations
2. **Testing/CI:** Automated testing and continuous integration
3. **Staging:** Production-like environment for final testing
4. **Production:** Live customer-facing environment

### Configuration Management
```typescript
// Mandatory Environment Schema Validation
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'testing', 'staging', 'production']),
  PORT: z.string().transform(Number).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FRONTEND_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
});

// Mandatory Validation at Startup
let env: z.infer<typeof EnvSchema>;
try {
  env = EnvSchema.parse(process.env);
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  console.error('🔧 Please check your .env file against .env.example');
  process.exit(1);
}
```

### Environment File Structure
```bash
# Project Root
├── .env.example              # Template with all required variables
├── .env.local               # Local development overrides (gitignored)
├── .env.development         # Development defaults
├── .env.testing             # Testing environment
├── .env.staging             # Staging environment template
└── .env.production          # Production environment template
```

### Environment Variable Categories

#### Application Configuration
```bash
# Application Settings
NODE_ENV=production
PORT=3000
API_VERSION=v1
FRONTEND_URL=https://portal.logogear.com
API_BASE_URL=https://api.logogear.com

# Feature Flags
FEATURE_FILE_PROCESSING=true
FEATURE_SSO_INTEGRATION=true
FEATURE_AUDIT_LOGGING=true
```

#### Database Configuration
```bash
# Database URLs with environment-specific settings
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=20
REDIS_URL=redis://user:pass@host:6379/0

# Database Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
```

#### Security Configuration
```bash
# Secrets (MUST be unique per environment)
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
SESSION_SECRET=your-session-secret-minimum-32-characters-long
ENCRYPTION_KEY=your-encryption-key-for-sensitive-data

# Authentication
OIDC_ISSUER_URL=https://auth.logogear.com
OIDC_CLIENT_ID=logogear-portal-client
OIDC_CLIENT_SECRET=your-oidc-client-secret
```

#### External Service Configuration
```bash
# File Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=logogear-portal-files

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@logogear.com
SMTP_PASS=your-smtp-password
```

### Secrets Management
- **MANDATORY:** All secrets MUST be stored in environment variables
- **MANDATORY:** Secrets MUST be unique per environment
- **MANDATORY:** Secrets MUST have minimum complexity requirements
- **MANDATORY:** Secrets MUST be rotated regularly (quarterly minimum)
- **PROHIBITED:** Secrets MUST NEVER be committed to version control
- **PROHIBITED:** Secrets MUST NEVER be logged or exposed in error messages

### Environment-Specific Behavior

#### Development Environment
```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://dev:dev@localhost:5432/app_dev
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://localhost:3001
API_BASE_URL=http://localhost:3000/api

# Development-specific features
ENABLE_CORS=true
ENABLE_MOCK_AUTH=true
DISABLE_RATE_LIMITING=true
```

#### Testing Environment
```bash
NODE_ENV=testing
LOG_LEVEL=error
DATABASE_URL=postgresql://test:test@localhost:5432/app_test
REDIS_URL=redis://localhost:6379/1

# Testing-specific settings
DISABLE_EXTERNAL_SERVICES=true
MOCK_EMAIL_SERVICE=true
FAST_PASSWORD_HASHING=true
```

#### Staging Environment
```bash
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgresql://staging_user:secure_pass@staging-db:5432/app_staging?sslmode=require
REDIS_URL=redis://staging_user:secure_pass@staging-redis:6379/0

# Production-like settings
ENABLE_SSL=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
```

#### Production Environment
```bash
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://prod_user:ultra_secure_pass@prod-db:5432/app_prod?sslmode=require&connection_limit=50
REDIS_URL=redis://prod_user:ultra_secure_pass@prod-redis:6379/0

# Production-specific settings
ENABLE_SSL=true
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_MONITORING=true
```

## Recommended Practices

### Configuration Loading
```typescript
// Environment-specific configuration loading
const config = {
  app: {
    name: process.env.APP_NAME || 'Logogear Portal',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL!,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
    },
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    sessionSecret: process.env.SESSION_SECRET!,
    tokenExpiry: process.env.JWT_EXPIRES_IN || '24h',
  },
  features: {
    fileProcessing: process.env.FEATURE_FILE_PROCESSING === 'true',
    ssoIntegration: process.env.FEATURE_SSO_INTEGRATION === 'true',
    auditLogging: process.env.FEATURE_AUDIT_LOGGING === 'true',
  },
};
```

### Environment Detection
```typescript
// Environment detection utilities
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isTesting = () => process.env.NODE_ENV === 'testing';
export const isStaging = () => process.env.NODE_ENV === 'staging';
export const isProduction = () => process.env.NODE_ENV === 'production';

// Environment-specific behavior
if (isDevelopment()) {
  // Enable development tools
  app.use(morgan('dev'));
  app.use(cors({ origin: true, credentials: true }));
}

if (isProduction()) {
  // Enable production optimizations
  app.use(helmet());
  app.use(compression());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
}
```

### Configuration Validation
```typescript
// Runtime configuration validation
function validateConfig() {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }

  // Validate secret strength
  if (process.env.JWT_SECRET!.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
}
```

## Prohibited Practices

### Security Violations
- **PROHIBITED:** Committing .env files with real secrets to version control
- **PROHIBITED:** Using the same secrets across multiple environments
- **PROHIBITED:** Hardcoding configuration values in source code
- **PROHIBITED:** Logging environment variables or secrets
- **PROHIBITED:** Exposing configuration endpoints without authentication
- **PROHIBITED:** Using weak or default passwords in any environment
- **PROHIBITED:** Storing secrets in plain text files on servers

### Configuration Anti-patterns
- **PROHIBITED:** Missing environment validation at application startup
- **PROHIBITED:** Using production credentials in development/testing
- **PROHIBITED:** Inconsistent configuration structure across environments
- **PROHIBITED:** Missing .env.example template file
- **PROHIBITED:** Environment-specific code branches (use configuration instead)
- **PROHIBITED:** Deploying without environment-specific configuration

## Environment-Specific Requirements

### Development Environment
- MUST provide easy setup with minimal external dependencies
- MUST include seed data for consistent development experience
- MUST support hot reloading and debugging tools
- MUST use non-production services (local database, mock services)

### Testing Environment
- MUST be isolated from other environments
- MUST use test-specific databases and services
- MUST support parallel test execution
- MUST clean up test data after execution

### Staging Environment
- MUST mirror production configuration as closely as possible
- MUST use production-like data volumes
- MUST support load testing and performance validation
- MUST have monitoring and alerting configured

### Production Environment
- MUST have high availability configuration
- MUST have comprehensive monitoring and alerting
- MUST have automated backup and recovery procedures
- MUST have security hardening applied
- MUST have disaster recovery procedures documented

## Compliance Requirements

### Code Review Checklist
- [ ] Environment schema validation implemented
- [ ] All required environment variables documented in .env.example
- [ ] No secrets committed to version control
- [ ] Environment-specific behavior properly configured
- [ ] Configuration loading tested in all environments
- [ ] Secrets meet complexity requirements
- [ ] Environment detection logic implemented correctly

### Deployment Checklist
- [ ] Environment variables configured for target environment
- [ ] Database migrations applied successfully
- [ ] External service connectivity verified
- [ ] SSL certificates configured (staging/production)
- [ ] Monitoring and alerting configured
- [ ] Backup procedures verified
- [ ] Security scanning completed
- [ ] Performance testing completed (staging)

## Enforcement

Violations of this standard will result in:
1. **Deployment Failure:** Applications with invalid configuration will not deploy
2. **Security Incident:** Exposed secrets trigger immediate incident response
3. **Code Review Rejection:** Non-compliant configuration will not be merged
4. **Environment Audit:** Regular audits to ensure compliance

## Document Control

- **Next Review Date:** 2026-07-13
- **Document Owner:** Principal Architect
- **Approval Authority:** CTO
- **Distribution:** All developers, DevOps teams, security teams, operations teams