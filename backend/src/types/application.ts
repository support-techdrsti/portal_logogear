import { z } from 'zod';
import { Application, ApplicationCategory, ApplicationEnvironment, PermissionLevel } from '@prisma/client';

// Application schema for validation
export const ApplicationSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  category: z.nativeEnum(ApplicationCategory),
  url: z.string().url(),
  environment: z.nativeEnum(ApplicationEnvironment),
  isActive: z.boolean(),
  ssoConfig: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Application creation schema
export const CreateApplicationSchema = z.object({
  name: z.string().min(1, 'Application name is required'),
  code: z.string().min(1, 'Application code is required').regex(/^[a-z0-9-]+$/, 'Code must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  category: z.nativeEnum(ApplicationCategory),
  url: z.string().url('Valid URL is required'),
  environment: z.nativeEnum(ApplicationEnvironment),
  isActive: z.boolean().default(true),
  ssoConfig: z.object({
    type: z.enum(['oidc', 'saml']).optional(),
    autoLaunch: z.boolean().default(true),
    tokenPassthrough: z.boolean().default(true),
    customParams: z.record(z.string()).optional(),
  }).optional(),
});

// Application update schema
export const UpdateApplicationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.nativeEnum(ApplicationCategory).optional(),
  url: z.string().url().optional(),
  environment: z.nativeEnum(ApplicationEnvironment).optional(),
  isActive: z.boolean().optional(),
  ssoConfig: z.object({
    type: z.enum(['oidc', 'saml']).optional(),
    autoLaunch: z.boolean().optional(),
    tokenPassthrough: z.boolean().optional(),
    customParams: z.record(z.string()).optional(),
  }).optional(),
});

// Application permission schema
export const ApplicationPermissionSchema = z.object({
  id: z.string().cuid(),
  applicationId: z.string().cuid(),
  roleId: z.string().cuid(),
  permissionLevel: z.nativeEnum(PermissionLevel),
  createdAt: z.date(),
});

// Application launch request schema
export const LaunchApplicationSchema = z.object({
  applicationId: z.string().cuid(),
  returnUrl: z.string().url().optional(),
});

// Extended application type with permissions
export interface ApplicationWithPermissions extends Application {
  permissions: Array<{
    role: {
      id: string;
      name: string;
    };
    permissionLevel: PermissionLevel;
  }>;
}

// Application catalog item for user display
export interface ApplicationCatalogItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: ApplicationCategory;
  environment: ApplicationEnvironment;
  url: string;
  isActive: boolean;
  userPermission?: PermissionLevel;
  canLaunch: boolean;
  launchUrl: string;
  icon?: string;
  tags: string[];
}

// Application launch response
export interface ApplicationLaunchResponse {
  success: boolean;
  launchUrl: string;
  method: 'GET' | 'POST';
  parameters?: Record<string, string>;
  newTab: boolean;
}

// Type exports
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
export type LaunchApplicationInput = z.infer<typeof LaunchApplicationSchema>;