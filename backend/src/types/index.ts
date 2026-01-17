// Re-export all types for easy importing
export * from './user';
export * from './role';
export * from './application';
export * from './file';
export * from './audit';
export * from './auth';
export * from './api';

// Common utility types
export type ID = string;
export type Timestamp = Date;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

// Database entity base interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Soft delete interface
export interface SoftDeletable {
  deletedAt?: Date;
  isDeleted: boolean;
}

// Auditable interface
export interface Auditable {
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

// Timestamped interface
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

// Status interface
export interface Statusable {
  status: string;
  isActive: boolean;
}

// Metadata interface
export interface WithMetadata {
  metadata?: Record<string, any>;
}

// Search result interface
export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  filters: Record<string, any>;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

// Configuration interface
export interface Configuration {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description?: string;
  category: string;
  isSecret: boolean;
  isRequired: boolean;
  defaultValue?: any;
  validationRules?: Record<string, any>;
}

// Notification interface
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  read: boolean;
  persistent: boolean;
  actions?: Array<{
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

// Activity log interface
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// System metrics interface
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
  };
  redis: {
    connections: number;
    memory: number;
    keys: number;
  };
}

// Feature flag interface
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: Array<{
    type: 'user' | 'role' | 'environment' | 'custom';
    operator: 'equals' | 'contains' | 'in' | 'not_in';
    value: any;
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Cache interface
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  tags?: string[];
}

// Queue job interface
export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}