// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/logogear_portal_test';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Skip database operations in test environment
console.log('Test environment detected - skipping database setup');