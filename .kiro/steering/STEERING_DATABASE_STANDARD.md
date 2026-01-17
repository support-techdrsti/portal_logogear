# STEERING_DATABASE_STANDARD

**Document Type:** Company Governance Standard  
**Version:** 1.0  
**Effective Date:** 2026-01-13  
**Authority:** Principal Architect  
**Scope:** All database systems and data persistence layers

## Purpose

This document establishes mandatory standards for database design, configuration, and management to ensure data integrity, security, and performance across all Logogear systems.

## Scope

This standard applies to:
- PostgreSQL databases (primary)
- SQLite databases (development/testing)
- Redis caches and session stores
- Database migrations and schema changes
- Data access patterns and ORM usage

## Mandatory Standards

### Database Technology Stack
- **Primary Database:** PostgreSQL 13+ for production systems
- **Development Database:** SQLite 3+ for local development (when appropriate)
- **Cache/Sessions:** Redis 6+ for caching and session management
- **ORM:** Prisma (mandatory for new projects)
- **Migration Tool:** Prisma Migrate or native database migration tools
- **Connection Pooling:** Built-in ORM pooling or PgBouncer for high-load systems

### Connection Management
```typescript
// Mandatory Connection Configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Mandatory Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

### Environment-Based Configuration
```bash
# Development
DATABASE_URL="postgresql://user:pass@localhost:5432/app_dev"

# Staging
DATABASE_URL="postgresql://user:pass@staging-db:5432/app_staging?sslmode=require"

# Production
DATABASE_URL="postgresql://user:pass@prod-db:5432/app_prod?sslmode=require&connection_limit=20"
```

### Schema Design Standards
- **Naming Convention:** snake_case for all database objects
- **Primary Keys:** Use `id` as primary key with appropriate type (UUID preferred)
- **Foreign Keys:** Use descriptive names ending with `_id` (e.g., `user_id`, `order_id`)
- **Timestamps:** Include `created_at` and `updated_at` for all entities
- **Soft Deletes:** Use `deleted_at` timestamp for soft deletion when audit trail required
- **Indexes:** Create indexes for all foreign keys and frequently queried columns

```sql
-- Example Table Structure
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    preferences JSONB,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Mandatory Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Migration Strategy
- **Version Control:** All schema changes MUST be versioned and tracked
- **Rollback Plan:** Every migration MUST have a corresponding rollback script
- **Testing:** Migrations MUST be tested on staging before production deployment
- **Backup:** Database backup MUST be created before running migrations in production
- **Monitoring:** Migration execution MUST be monitored and logged

```typescript
// Prisma Migration Example
// migrations/001_create_users_table.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// migrations/001_rollback_create_users_table.sql
DROP TABLE IF EXISTS users;
```

### Security Practices
- **SSL/TLS:** MANDATORY for all production database connections
- **Authentication:** Strong passwords with minimum 16 characters
- **Authorization:** Principle of least privilege for database users
- **Encryption:** Encrypt sensitive data at rest and in transit
- **Audit Logging:** Enable database audit logging for production systems
- **Network Security:** Database servers MUST be in private networks
- **Backup Encryption:** Database backups MUST be encrypted

### Performance Standards
- **Query Performance:** All queries MUST execute under 100ms for simple operations
- **Index Coverage:** All foreign keys and frequently queried columns MUST be indexed
- **Connection Limits:** Configure appropriate connection pool sizes
- **Query Monitoring:** Slow query logging MUST be enabled (>1000ms threshold)
- **Regular Maintenance:** VACUUM and ANALYZE operations MUST be scheduled

## Recommended Practices

### Indexing Strategy
```sql
-- Composite Indexes for Common Query Patterns
CREATE INDEX idx_users_status_created_at ON users(status, created_at);
CREATE INDEX idx_audit_logs_user_event ON audit_logs(user_id, event_type, created_at);

-- Partial Indexes for Filtered Queries
CREATE INDEX idx_users_active ON users(email) WHERE status = 'ACTIVE';
CREATE INDEX idx_soft_deleted ON users(id) WHERE deleted_at IS NULL;
```

### Data Types Best Practices
- **UUIDs:** Use UUID for primary keys in distributed systems
- **Timestamps:** Use `TIMESTAMP WITH TIME ZONE` for all datetime fields
- **JSON:** Use JSONB for PostgreSQL JSON data (better performance)
- **Enums:** Use database enums for fixed value sets
- **Text vs VARCHAR:** Use TEXT for variable-length strings, VARCHAR for fixed limits

### Query Optimization
- Use EXPLAIN ANALYZE to understand query execution plans
- Implement proper pagination for large result sets
- Use database functions for complex calculations
- Implement read replicas for read-heavy workloads
- Use materialized views for complex aggregations

### Backup and Recovery
- **Automated Backups:** Daily full backups with point-in-time recovery
- **Backup Testing:** Regular restore testing to verify backup integrity
- **Retention Policy:** Maintain backups for minimum 30 days
- **Geographic Distribution:** Store backups in multiple geographic locations
- **Documentation:** Maintain detailed recovery procedures

## Prohibited Practices

### Anti-patterns
- **PROHIBITED:** Using SELECT * in application queries
- **PROHIBITED:** Missing indexes on foreign key columns
- **PROHIBITED:** Storing large binary data directly in database
- **PROHIBITED:** Using database for session storage in high-traffic applications
- **PROHIBITED:** Hardcoded database credentials in application code
- **PROHIBITED:** Missing transaction boundaries for multi-step operations
- **PROHIBITED:** Using database-specific SQL in application code (use ORM)
- **PROHIBITED:** Missing connection pooling in production applications

### Security Violations
- **PROHIBITED:** SQL injection vulnerabilities (use parameterized queries)
- **PROHIBITED:** Storing passwords in plain text
- **PROHIBITED:** Missing encryption for sensitive data
- **PROHIBITED:** Overprivileged database users
- **PROHIBITED:** Exposing database directly to public networks
- **PROHIBITED:** Missing audit trails for sensitive operations
- **PROHIBITED:** Using default database passwords

### Performance Anti-patterns
- **PROHIBITED:** N+1 query problems (use proper joins or eager loading)
- **PROHIBITED:** Missing LIMIT clauses on potentially large result sets
- **PROHIBITED:** Unnecessary database round trips
- **PROHIBITED:** Using database for complex business logic
- **PROHIBITED:** Missing query optimization for slow operations
- **PROHIBITED:** Ignoring database performance monitoring

## Environment-Specific Requirements

### Development Environment
- Use SQLite for simple local development when appropriate
- Seed data MUST be provided for consistent development experience
- Database reset scripts MUST be available
- Migration testing MUST be performed locally

### Staging Environment
- MUST mirror production database structure exactly
- Use production-like data volumes for performance testing
- SSL connections MUST be enforced
- Backup and recovery procedures MUST be tested

### Production Environment
- High availability configuration MUST be implemented
- Automated failover MUST be configured
- Monitoring and alerting MUST be comprehensive
- Regular security audits MUST be performed
- Disaster recovery procedures MUST be documented and tested

## Compliance Requirements

### Code Review Checklist
- [ ] All database queries use parameterized statements
- [ ] Proper indexes created for new tables and columns
- [ ] Migration scripts include rollback procedures
- [ ] Connection pooling properly configured
- [ ] Sensitive data encryption implemented
- [ ] Audit logging configured for sensitive operations
- [ ] Performance impact assessed for schema changes
- [ ] Backup procedures updated if needed

### Monitoring Requirements
- Database connection pool utilization
- Query performance metrics (slow query log)
- Database size and growth trends
- Backup success/failure status
- Replication lag (if applicable)
- Security audit events

## Enforcement

Violations of this standard will result in:
1. **Code Review Rejection:** Non-compliant database code will not be merged
2. **Security Incident:** Security violations trigger immediate incident response
3. **Performance Review:** Performance issues require optimization plans
4. **Data Governance Review:** Data handling violations require governance review

## Document Control

- **Next Review Date:** 2026-07-13
- **Document Owner:** Principal Architect
- **Approval Authority:** CTO
- **Distribution:** All developers, DBAs, DevOps teams, security teams