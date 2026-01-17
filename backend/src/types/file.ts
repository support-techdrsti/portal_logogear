import { z } from 'zod';
import { DataFile, ProcessingJob, ProcessedFile, FileStatus, JobStatus, JobType, StorageType } from '@prisma/client';

// File upload schema
export const FileUploadSchema = z.object({
  templateType: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// File validation schema
export const FileValidationSchema = z.object({
  filename: z.string().min(1),
  size: z.number().min(1).max(100 * 1024 * 1024), // 100MB max
  mimeType: z.string().min(1),
});

// Processing job creation schema
export const CreateProcessingJobSchema = z.object({
  dataFileId: z.string().cuid(),
  jobType: z.nativeEnum(JobType),
  processingConfig: z.record(z.any()).optional(),
});

// Processing job update schema
export const UpdateProcessingJobSchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  errorLog: z.string().optional(),
  processingConfig: z.record(z.any()).optional(),
});

// File search/filter schema
export const FileSearchSchema = z.object({
  filename: z.string().optional(),
  templateType: z.string().optional(),
  status: z.nativeEnum(FileStatus).optional(),
  uploadedBy: z.string().cuid().optional(),
  uploadedAfter: z.date().optional(),
  uploadedBefore: z.date().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Job search/filter schema
export const JobSearchSchema = z.object({
  jobType: z.nativeEnum(JobType).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  triggeredBy: z.string().cuid().optional(),
  startedAfter: z.date().optional(),
  startedBefore: z.date().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Extended file type with relations
export interface DataFileWithDetails extends DataFile {
  uploader: {
    id: string;
    name: string;
    email: string;
  };
  jobs: Array<{
    id: string;
    jobType: JobType;
    status: JobStatus;
    startedAt?: Date;
    completedAt?: Date;
    processedFiles: ProcessedFile[];
  }>;
}

// Extended job type with relations
export interface ProcessingJobWithDetails extends ProcessingJob {
  dataFile: {
    id: string;
    originalFilename: string;
    templateType?: string;
    fileSize: number;
  };
  triggerer: {
    id: string;
    name: string;
    email: string;
  };
  processedFiles: ProcessedFile[];
}

// File upload response
export interface FileUploadResponse {
  success: boolean;
  file: {
    id: string;
    filename: string;
    size: number;
    uploadedAt: Date;
  };
  message: string;
}

// Processing job response
export interface ProcessingJobResponse {
  success: boolean;
  job: {
    id: string;
    status: JobStatus;
    createdAt: Date;
  };
  message: string;
}

// File processing statistics
export interface FileProcessingStats {
  totalFiles: number;
  totalJobs: number;
  jobsByStatus: Record<JobStatus, number>;
  jobsByType: Record<JobType, number>;
  averageProcessingTime: number;
  successRate: number;
  recentActivity: Array<{
    type: 'upload' | 'job_start' | 'job_complete' | 'job_fail';
    timestamp: Date;
    filename?: string;
    jobType?: JobType;
    user: string;
  }>;
}

// Storage location info
export interface StorageLocationInfo {
  name: StorageType;
  description: string;
  basePath: string;
  isActive: boolean;
  fileCount: number;
  totalSize: number;
  lastActivity?: Date;
}

// File browser item
export interface FileBrowserItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  modifiedAt: Date;
  canDownload: boolean;
  downloadUrl?: string;
  metadata?: Record<string, any>;
}

// Template type configuration
export interface TemplateTypeConfig {
  name: string;
  description: string;
  supportedFormats: string[];
  processingOptions: {
    bluedart: boolean;
    dc: boolean;
  };
  validationRules: Record<string, any>;
  defaultConfig: Record<string, any>;
}

// Type exports
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type FileValidationInput = z.infer<typeof FileValidationSchema>;
export type CreateProcessingJobInput = z.infer<typeof CreateProcessingJobSchema>;
export type UpdateProcessingJobInput = z.infer<typeof UpdateProcessingJobSchema>;
export type FileSearchInput = z.infer<typeof FileSearchSchema>;
export type JobSearchInput = z.infer<typeof JobSearchSchema>;