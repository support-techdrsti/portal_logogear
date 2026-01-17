import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AuthorizationService } from './authorization.service';
import { AuditService } from './audit.service';
import {
  CreateUserInput,
  UpdateUserInput,
  UserProfile,
  UserWithRoles,
  UserPreferences,
  UserPreferencesSchema,
} from '../types/user';
import { CreateAuditLogInput } from '../types/audit';
import { User, UserStatus } from '@prisma/client';

export class UserService {
  private authorizationService: AuthorizationService;
  private auditService: AuditService;

  constructor() {
    this.authorizationService = new AuthorizationService();
    this.auditService = new AuditService();
  }

  /**
   * Create or update user from IdP data
   */
  async syncUserFromIdP(
    externalId: string,
    userData: {
      email: string;
      name: string;
      department?: string;
      roles?: string[];
      groups?: string[];
    },
    triggeredBy?: string
  ): Promise<User> {
    try {
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { externalId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const isNewUser = !user;

      if (isNewUser) {
        // Create new user
        user = await prisma.user.create({
          data: {
            externalId,
            email: userData.email,
            name: userData.name,
            department: userData.department,
            status: 'ACTIVE',
            preferences: {
              timezone: 'Asia/Kolkata',
              language: 'en',
              theme: 'light',
              notifications: {
                email: true,
                inApp: true,
                maintenance: true,
                security: true,
              },
              dashboard: {
                recentAppsLimit: 5,
                showNotifications: true,
                compactView: false,
              },
            },
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        logger.info('Created new user from IdP sync', {
          userId: user.id,
          externalId,
          email: userData.email,
          name: userData.name,
        });

        // Assign default viewer role to new users
        await this.assignDefaultRole(user.id, triggeredBy || user.id);
      } else {
        // Update existing user
        const updateData: any = {
          email: userData.email,
          name: userData.name,
          department: userData.department,
        };

        // Only update lastLogin if this is an actual login sync
        if (triggeredBy) {
          updateData.lastLogin = new Date();
        }

        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        logger.info('Updated user from IdP sync', {
          userId: user.id,
          externalId,
          email: userData.email,
          changes: updateData,
        });
      }

      // Sync roles from IdP groups if provided
      if (userData.groups && userData.groups.length > 0) {
        await this.syncUserRolesFromGroups(user.id, userData.groups, triggeredBy || user.id);
      }

      // Invalidate user cache
      await this.authorizationService.invalidateUserCache(user.id);

      // Log user sync event
      await this.auditService.createAuditLog({
        userId: user.id,
        eventType: isNewUser ? 'CONFIG_CHANGE' : 'CONFIG_CHANGE',
        details: {
          action: isNewUser ? 'user_created' : 'user_updated',
          source: 'idp_sync',
          userData: {
            email: userData.email,
            name: userData.name,
            department: userData.department,
            groups: userData.groups,
          },
          isNewUser,
        },
        ipAddress: 'system',
        userAgent: 'IdP Sync Service',
      });

      return user;
    } catch (error) {
      logger.error('Failed to sync user from IdP', {
        error: error.message,
        externalId,
        userData,
      });
      throw error;
    }
  }

  /**
   * Get user profile with roles and permissions
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      const roles = user.userRoles.map(ur => ur.role.name);
      const permissions = await this.authorizationService.getUserPermissions(userId);

      // Get recent activity
      const recentActivity = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          eventType: true,
          createdAt: true,
          ipAddress: true,
          details: true,
        },
      });

      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        roles,
        permissions,
        preferences: user.preferences as Record<string, any>,
        lastLogin: user.lastLogin,
        securityInfo: {
          lastLogin: user.lastLogin,
          recentActivity: recentActivity.map(activity => ({
            action: this.formatActivityAction(activity.eventType, activity.details),
            timestamp: activity.createdAt,
            ipAddress: activity.ipAddress,
          })),
        },
      };

      return profile;
    } catch (error) {
      logger.error('Failed to get user profile', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
    updatedBy: string
  ): Promise<void> {
    try {
      // Validate preferences
      const validatedPreferences = UserPreferencesSchema.partial().parse(preferences);

      // Get current preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Merge with existing preferences
      const currentPreferences = (user.preferences as Record<string, any>) || {};
      const updatedPreferences = {
        ...currentPreferences,
        ...validatedPreferences,
      };

      // Update user preferences
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: updatedPreferences,
        },
      });

      logger.info('User preferences updated', {
        userId,
        updatedBy,
        changes: validatedPreferences,
      });

      // Log preference change
      await this.auditService.createAuditLog({
        userId,
        eventType: 'CONFIG_CHANGE',
        details: {
          action: 'preferences_updated',
          changes: validatedPreferences,
          updatedBy,
        },
        ipAddress: 'system',
        userAgent: 'User Service',
      });
    } catch (error) {
      logger.error('Failed to update user preferences', {
        error: error.message,
        userId,
        preferences,
      });
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    try {
      // Check if assignment already exists
      const existing = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
      });

      if (existing) {
        logger.warn('Role already assigned to user', { userId, roleId });
        return;
      }

      // Get role information
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      // Assign role
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
          assignedBy,
        },
      });

      // Invalidate user cache
      await this.authorizationService.invalidateUserCache(userId);

      logger.info('Role assigned to user', {
        userId,
        roleId,
        roleName: role.name,
        assignedBy,
      });

      // Log role assignment
      await this.auditService.createAuditLog({
        userId: assignedBy,
        eventType: 'ROLE_CHANGE',
        resourceType: 'user',
        resourceId: userId,
        details: {
          action: 'assign',
          roleId,
          roleName: role.name,
          targetUserId: userId,
        },
        ipAddress: 'system',
        userAgent: 'User Service',
      });
    } catch (error) {
      logger.error('Failed to assign role to user', {
        error: error.message,
        userId,
        roleId,
        assignedBy,
      });
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, removedBy: string): Promise<void> {
    try {
      // Get role information before deletion
      const userRole = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        include: {
          role: true,
        },
      });

      if (!userRole) {
        logger.warn('Role not assigned to user', { userId, roleId });
        return;
      }

      // Check if this would remove the last admin role
      if (userRole.role.name === 'ADMIN') {
        const adminCount = await prisma.userRole.count({
          where: {
            role: {
              name: 'ADMIN',
            },
          },
        });

        if (adminCount <= 1) {
          throw new Error('Cannot remove the last admin role');
        }
      }

      // Remove role
      await prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
      });

      // Invalidate user cache
      await this.authorizationService.invalidateUserCache(userId);

      logger.info('Role removed from user', {
        userId,
        roleId,
        roleName: userRole.role.name,
        removedBy,
      });

      // Log role removal
      await this.auditService.createAuditLog({
        userId: removedBy,
        eventType: 'ROLE_CHANGE',
        resourceType: 'user',
        resourceId: userId,
        details: {
          action: 'remove',
          roleId,
          roleName: userRole.role.name,
          targetUserId: userId,
        },
        ipAddress: 'system',
        userAgent: 'User Service',
      });
    } catch (error) {
      logger.error('Failed to remove role from user', {
        error: error.message,
        userId,
        roleId,
        removedBy,
      });
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string, deactivatedBy: string, reason?: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'INACTIVE',
        },
      });

      // Invalidate user cache
      await this.authorizationService.invalidateUserCache(userId);

      logger.info('User deactivated', {
        userId,
        deactivatedBy,
        reason,
      });

      // Log user deactivation
      await this.auditService.createAuditLog({
        userId: deactivatedBy,
        eventType: 'CONFIG_CHANGE',
        resourceType: 'user',
        resourceId: userId,
        details: {
          action: 'user_deactivated',
          reason,
          targetUserId: userId,
        },
        ipAddress: 'system',
        userAgent: 'User Service',
      });
    } catch (error) {
      logger.error('Failed to deactivate user', {
        error: error.message,
        userId,
        deactivatedBy,
      });
      throw error;
    }
  }

  /**
   * Assign default role to new user
   */
  private async assignDefaultRole(userId: string, assignedBy: string): Promise<void> {
    try {
      const viewerRole = await prisma.role.findUnique({
        where: { name: 'VIEWER' },
      });

      if (viewerRole) {
        await this.assignRole(userId, viewerRole.id, assignedBy);
      }
    } catch (error) {
      logger.error('Failed to assign default role', {
        error: error.message,
        userId,
      });
    }
  }

  /**
   * Sync user roles from IdP groups
   */
  private async syncUserRolesFromGroups(
    userId: string,
    groups: string[],
    syncedBy: string
  ): Promise<void> {
    try {
      // Define group to role mapping
      const groupRoleMapping: Record<string, string> = {
        'logogear-admins': 'ADMIN',
        'logogear-pim-managers': 'PIM_MANAGER',
        'logogear-merchandisers': 'MERCHANDISER',
        'logogear-sales': 'SALES',
        // Add more mappings as needed
      };

      // Get roles that should be assigned based on groups
      const targetRoleNames = groups
        .map(group => groupRoleMapping[group])
        .filter(Boolean);

      if (targetRoleNames.length === 0) {
        logger.info('No role mappings found for user groups', {
          userId,
          groups,
        });
        return;
      }

      // Get role IDs
      const targetRoles = await prisma.role.findMany({
        where: {
          name: { in: targetRoleNames },
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Get current user roles
      const currentUserRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: true,
        },
      });

      const currentRoleNames = currentUserRoles.map(ur => ur.role.name);
      const targetRoleIds = targetRoles.map(r => r.id);

      // Assign missing roles
      for (const role of targetRoles) {
        if (!currentRoleNames.includes(role.name)) {
          await this.assignRole(userId, role.id, syncedBy);
        }
      }

      // Remove roles that are no longer in groups (except VIEWER)
      for (const userRole of currentUserRoles) {
        if (
          userRole.role.name !== 'VIEWER' &&
          !targetRoleNames.includes(userRole.role.name)
        ) {
          await this.removeRole(userId, userRole.roleId, syncedBy);
        }
      }

      logger.info('User roles synced from IdP groups', {
        userId,
        groups,
        targetRoles: targetRoleNames,
        currentRoles: currentRoleNames,
      });
    } catch (error) {
      logger.error('Failed to sync user roles from groups', {
        error: error.message,
        userId,
        groups,
      });
    }
  }

  /**
   * Format activity action for display
   */
  private formatActivityAction(eventType: string, details: any): string {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return details?.action === 'logout' ? 'Logged out' : 'Logged in';
      case 'LOGIN_FAILURE':
        return 'Failed login attempt';
      case 'APP_LAUNCH':
        return `Launched ${details?.applicationName || 'application'}`;
      case 'ROLE_CHANGE':
        return `Role ${details?.action}: ${details?.roleName}`;
      case 'FILE_UPLOAD':
        return `Uploaded ${details?.filename}`;
      case 'JOB_TRIGGER':
        return `Started ${details?.jobType} processing`;
      case 'CONFIG_CHANGE':
        return `Configuration changed: ${details?.action}`;
      default:
        return eventType.replace(/_/g, ' ').toLowerCase();
    }
  }
}