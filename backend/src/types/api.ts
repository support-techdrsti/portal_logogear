import { z } from 'zod';

// Generic API response schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  requestId: z.string().optional(),
});

// Paginated response schema
export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    total: z.number().min(0),
    totalPages: z.number().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.any()).optional(),
  code: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  requestId: z.string().optional(),
});

// Validation error schema
export const ValidationErrorSchema = z.object({
  success: z.literal(false),
  error: z.literal('Validation Error'),
  message: z.string(),
  details: z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
    value: z.any().optional(),
  }).array(),
  timestamp: z.date().default(() => new Date()),
});

// Pagination parameters schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search parameters schema
export const SearchSchema = z.object({
  q: z.string().optional(),
  filters: z.record(z.any()).optional(),
  ...PaginationSchema.shape,
});

// Generic API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

// Paginated response interface
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: string;
  message?: string;
  timestamp: Date;
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, any>;
  code?: string;
  timestamp: Date;
  requestId?: string;
}

// Validation error interface
export interface ValidationError {
  success: false;
  error: 'Validation Error';
  message: string;
  details: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
  timestamp: Date;
}

// API endpoint configuration
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth: boolean;
  roles?: string[];
  permissions?: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
}

// Request context interface
export interface RequestContext {
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  query: Record<string, any>;
  body: Record<string, any>;
  headers: Record<string, string>;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
  ipAddress: string;
  userAgent: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  environment: string;
  version: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  metrics?: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

// Bulk operation request
export interface BulkOperationRequest<T = any> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: {
    continueOnError: boolean;
    batchSize: number;
  };
}

// Bulk operation response
export interface BulkOperationResponse<T = any> {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    success: boolean;
    item: T;
    error?: string;
  }>;
  errors: string[];
  timestamp: Date;
}

// File upload response
export interface FileUploadResponse {
  success: boolean;
  files: Array<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
  }>;
  message?: string;
  timestamp: Date;
}

// Export response (for reports, data exports)
export interface ExportResponse {
  success: boolean;
  exportId: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  downloadUrl: string;
  expiresAt: Date;
  recordCount: number;
  fileSize: number;
  timestamp: Date;
}

// Type exports
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;