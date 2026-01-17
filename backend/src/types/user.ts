import { z } from 'zod';
import { User, UserStatus, Role } from '@prisma/client';

// Base user schema for validation
export const UserSchema = z.object({
  id: z.string().cuid(),
  externalId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  department: z.string().optional(),
  status: z.nativeEnum(UserStatus),
  preferences: z.record(z.any()).optional(),
  lastLogin: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User creation schema (for API requests)
export const CreateUserSchema = z.object({
  externalId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  department: z.string().optional(),
  preferences: z.record(z.any()).optional(),
});

// User update schema
export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  preferences: z.record(z.any()).optional(),
});

// User preferences schema
export const UserPreferencesSchema = z.object({
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
  theme: z.enum(['light', 'dark']).default('light'),
  notifications: z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true),
    maintenance: z.boolean().default(true),
    security: z.boolean().default(true),
  }).default({}),
  dashboard: z.object({
    recentAppsLimit: z.number().min(1).max(20).default(5),
    showNotifications: z.boolean().default(true),
    compactView: z.boolean().default(false),
  }).default({}),
});

// Extended user type with relations
export interface UserWithRoles extends User {
  userRoles: Array<{
    role: Role;
    assignedAt: Date;
  }>;
}

// User profile response type
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  department?: string;
  roles: string[];
  permissions: string[];
  preferences: Record<string, any>;
  lastLogin?: Date;
  securityInfo: {
    lastLogin?: Date;
    recentActivity: Array<{
      action: string;
      timestamp: Date;
      ipAddress: string;
    }>;
  };
}

// Type exports
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;