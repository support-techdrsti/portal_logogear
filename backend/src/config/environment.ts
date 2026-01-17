import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { logger } from './logger';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // Session & JWT
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // SSO Configuration
  OIDC_ISSUER_URL: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_CALLBACK_URL: z.string().url().optional(),
  
  // SAML Configuration
  SAML_ENTRY_POINT: z.string().url().optional(),
  SAML_ISSUER: z.string().optional(),
  SAML_CALLBACK_URL: z.string().url().optional(),
  SAML_CERT: z.string().optional(),
  
  // File Storage
  STORAGE_TYPE: z.enum(['local', 's3', 'azure', 'gcs']).default('local'),
  STORAGE_BASE_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Application URLs
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),
  API_BASE_URL: z.string().url().default('http://localhost:3000/api'),
  
  // PIM Integration
  PIM_BASE_URL: z.string().url().optional(),
  PIM_PRODUCTION_URL: z.string().url().optional(),
  PIM_STAGING_URL: z.string().url().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),
});

export type Environment = z.infer<typeof envSchema>;

let env: Environment;

try {
  env = envSchema.parse(process.env);
  logger.info('Environment configuration validated successfully');
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

export { env };

// Validate SSO configuration
export function validateSSOConfig(): void {
  const hasOIDC = env.OIDC_ISSUER_URL && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET;
  const hasSAML = env.SAML_ENTRY_POINT && env.SAML_ISSUER && env.SAML_CERT;
  
  if (!hasOIDC && !hasSAML) {
    logger.warn('No SSO configuration found. Either OIDC or SAML configuration is required for production.');
    if (env.NODE_ENV === 'production') {
      logger.error('SSO configuration is required in production environment');
      process.exit(1);
    }
  }
  
  if (hasOIDC) {
    logger.info('OIDC SSO configuration detected');
  }
  
  if (hasSAML) {
    logger.info('SAML SSO configuration detected');
  }
}