import { z } from 'zod';
import { AuditLog, EventType } from '@prisma/client';

// Audit log schema for validation
export const AuditLogSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().optional(),
  eventType: z.nativeEnum(EventType),
  resourceType: z.string().optional(),
  resourceId: z.string().cuid().optional(),
  details: z.record(z.any()),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  createdAt: z.date(),
});

// Audit log creation schema
export const CreateAuditLogSchema = z.object({
  userId: z.string().cuid().optional(),
  eventType: z.nativeEnum(EventType),
  resourceType: z.string().optional(),
  resourceId: z.string().cuid().optional(),
  details: z.record(z.any()).default({}),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
});

// Audit log search/filter schema
export const AuditLogSearchSchema = z.object({
  userId: z.string().cuid().optional(),
  eventType: z.nativeEnum(EventType).optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().cuid().optional(),
  ipAddress: z.string().ip().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'eventType', 'userId']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Extended audit log with user details
export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

// Audit event details for different event types
export interface LoginEventDetails {
  method: 'oidc' | 'saml' | 'local';
  provider?: string;
  success: boolean;
  failureReason?: string;
  sessionId?: string;
}

export interface AppLaunchEventDetails {
  applicationId: string;
  applicationName: string;
  applicationUrl: string;
  launchMethod: 'sso' | 'direct';
  success: boolean;
  errorMessage?: string;
}

export interface RoleChangeEventDetails {
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  action: 'assign' | 'remove';
  roleId: string;
  roleName: string;
  previousRoles?: string[];
  newRoles?: string[];
}

export interface FileUploadEventDetails {
  fileId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  templateType?: string;
  storageLocation: string;
}

export interface JobTriggerEventDetails {
  jobId: string;
  jobType: 'BLUEDART' | 'DC';
  dataFileId: string;
  filename: string;
  processingConfig?: Record<string, any>;
}

export interface ConfigChangeEventDetails {
  configType: 'sso' | 'application' | 'role' | 'storage' | 'system';
  action: 'create' | 'update' | 'delete';
  resourceId?: string;
  resourceName?: string;
  changes: Record<string, {
    from: any;
    to: any;
  }>;
}

export interface PermissionChangeEventDetails {
  targetType: 'user' | 'role';
  targetId: string;
  targetName: string;
  action: 'grant' | 'revoke' | 'modify';
  applicationId?: string;
  applicationName?: string;
  permissionLevel?: string;
  previousPermissions?: Record<string, string>;
  newPermissions?: Record<string, string>;
}

// Audit statistics
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  eventsByUser: Array<{
    userId: string;
    userName: string;
    eventCount: number;
  }>;
  eventsByDay: Array<{
    date: string;
    count: number;
  }>;
  topIpAddresses: Array<{
    ipAddress: string;
    count: number;
    lastSeen: Date;
  }>;
  securityEvents: {
    failedLogins: number;
    suspiciousActivity: number;
    permissionChanges: number;
  };
  recentActivity: Array<{
    eventType: EventType;
    timestamp: Date;
    user?: string;
    description: string;
  }>;
}

// Audit report configuration
export interface AuditReportConfig {
  title: string;
  description?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    eventTypes?: EventType[];
    userIds?: string[];
    resourceTypes?: string[];
    ipAddresses?: string[];
  };
  groupBy?: 'user' | 'eventType' | 'date' | 'ipAddress';
  includeDetails: boolean;
  format: 'json' | 'csv' | 'pdf';
}

// Security alert configuration
export interface SecurityAlert {
  id: string;
  type: 'failed_login_threshold' | 'suspicious_ip' | 'privilege_escalation' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeredAt: Date;
  userId?: string;
  ipAddress?: string;
  eventCount: number;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Type exports
export type CreateAuditLogInput = z.infer<typeof CreateAuditLogSchema>;
export type AuditLogSearchInput = z.infer<typeof AuditLogSearchSchema>;