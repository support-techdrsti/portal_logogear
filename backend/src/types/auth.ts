import { z } from 'zod';
import { User, Role } from '@prisma/client';

// Authentication request schemas
export const LoginRequestSchema = z.object({
  returnUrl: z.string().url().optional(),
  provider: z.enum(['oidc', 'saml']).optional(),
});

export const LogoutRequestSchema = z.object({
  returnUrl: z.string().url().optional(),
  globalLogout: z.boolean().default(true),
});

// JWT payload schema
export const JWTPayloadSchema = z.object({
  sub: z.string(), // User ID
  email: z.string().email(),
  name: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  iat: z.number(),
  exp: z.number(),
  iss: z.string(),
  aud: z.string(),
});

// Session data schema
export const SessionDataSchema = z.object({
  userId: z.string().cuid(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  loginTime: z.date(),
  lastActivity: z.date(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  ssoProvider: z.enum(['oidc', 'saml']).optional(),
  ssoSessionId: z.string().optional(),
});

// OIDC configuration schema
export const OIDCConfigSchema = z.object({
  issuerUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  callbackUrl: z.string().url(),
  scope: z.string().default('openid profile email'),
  responseType: z.string().default('code'),
  grantType: z.string().default('authorization_code'),
});

// SAML configuration schema
export const SAMLConfigSchema = z.object({
  entryPoint: z.string().url(),
  issuer: z.string().min(1),
  callbackUrl: z.string().url(),
  cert: z.string().min(1),
  signatureAlgorithm: z.string().default('sha256'),
  digestAlgorithm: z.string().default('sha256'),
});

// Authentication result
export interface AuthenticationResult {
  success: boolean;
  user?: AuthenticatedUser;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  redirectUrl?: string;
}

// Authenticated user interface
export interface AuthenticatedUser {
  id: string;
  externalId: string;
  email: string;
  name: string;
  department?: string;
  roles: string[];
  permissions: string[];
  preferences: Record<string, any>;
  lastLogin?: Date;
  sessionInfo: {
    loginTime: Date;
    ipAddress: string;
    userAgent: string;
    ssoProvider?: string;
  };
}

// SSO provider configuration
export interface SSOProviderConfig {
  name: string;
  type: 'oidc' | 'saml';
  enabled: boolean;
  config: Record<string, any>;
  userMapping: {
    id: string;
    email: string;
    name: string;
    department?: string;
    roles?: string;
  };
  groupMapping?: Record<string, string[]>;
}

// Token validation result
export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  expired?: boolean;
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions: string[];
  userPermissions: string[];
  missingPermissions: string[];
}

// Session validation result
export interface SessionValidationResult {
  valid: boolean;
  user?: AuthenticatedUser;
  expired?: boolean;
  error?: string;
}

// Authentication middleware options
export interface AuthMiddlewareOptions {
  required: boolean;
  roles?: string[];
  permissions?: string[];
  allowAnonymous?: boolean;
  redirectOnFailure?: string;
}

// SSO callback data
export interface SSOCallbackData {
  provider: 'oidc' | 'saml';
  profile: {
    id: string;
    email: string;
    name: string;
    department?: string;
    roles?: string[];
    groups?: string[];
  };
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
  };
  raw: Record<string, any>;
}

// Login audit data
export interface LoginAuditData {
  userId?: string;
  email: string;
  success: boolean;
  provider: 'oidc' | 'saml' | 'local';
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
  sessionId?: string;
  timestamp: Date;
}

// Logout audit data
export interface LogoutAuditData {
  userId: string;
  email: string;
  provider?: 'oidc' | 'saml' | 'local';
  ipAddress: string;
  userAgent: string;
  sessionDuration: number;
  globalLogout: boolean;
  timestamp: Date;
}

// Type exports
export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;
export type LogoutRequestInput = z.infer<typeof LogoutRequestSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type OIDCConfig = z.infer<typeof OIDCConfigSchema>;
export type SAMLConfig = z.infer<typeof SAMLConfigSchema>;