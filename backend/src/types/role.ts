import { z } from 'zod';
import { Role, PermissionLevel } from '@prisma/client';

// Role schema for validation
export const RoleSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  description: z.string(),
  isSystemRole: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Role creation schema
export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').regex(/^[A-Z_]+$/, 'Role name must be uppercase with underscores only'),
  description: z.string().min(1, 'Role description is required'),
  isSystemRole: z.boolean().default(false),
});

// Role update schema
export const UpdateRoleSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z_]+$/).optional(),
  description: z.string().min(1).optional(),
  isSystemRole: z.boolean().optional(),
});

// User role assignment schema
export const AssignRoleSchema = z.object({
  userId: z.string().cuid(),
  roleId: z.string().cuid(),
});

// Bulk role assignment schema
export const BulkAssignRolesSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1),
  roleIds: z.array(z.string().cuid()).min(1),
});

// Role permission mapping schema
export const RolePermissionSchema = z.object({
  roleId: z.string().cuid(),
  applicationId: z.string().cuid(),
  permissionLevel: z.nativeEnum(PermissionLevel),
});

// Extended role type with permissions and users
export interface RoleWithDetails extends Role {
  userRoles: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      department?: string;
    };
    assignedAt: Date;
  }>;
  applicationPermissions: Array<{
    application: {
      id: string;
      name: string;
      code: string;
      category: string;
    };
    permissionLevel: PermissionLevel;
  }>;
}

// Role summary for admin interface
export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  userCount: number;
  applicationCount: number;
  permissions: Array<{
    applicationName: string;
    permissionLevel: PermissionLevel;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Permission matrix for role management
export interface PermissionMatrix {
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  applications: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  permissions: Record<string, Record<string, PermissionLevel | null>>;
}

// Role validation result
export interface RoleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canDelete: boolean;
  affectedUsers: number;
  affectedApplications: number;
}

// Type exports
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
export type BulkAssignRolesInput = z.infer<typeof BulkAssignRolesSchema>;
export type RolePermissionInput = z.infer<typeof RolePermissionSchema>;