import { prisma } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import { PermissionCheckResult } from '../types/auth';
import { PermissionLevel } from '@prisma/client';

export class AuthorizationService {
  private readonly redis;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Check if user has required permissions
   */
  async checkPermissions(
    userId: string,
    requiredPermissions: string[],
    applicationCode?: string
  ): Promise<PermissionCheckResult> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check if user has all required permissions
      const missingPermissions = requiredPermissions.filter(
        permission => !userPermissions.includes(permission)
      );

      // If application code is provided, also check application-specific permissions
      if (applicationCode) {
        const appPermissions = await this.getUserApplicationPermissions(userId, applicationCode);
        const hasAppAccess = appPermissions.length > 0;
        
        if (!hasAppAccess) {
          missingPermissions.push(`${applicationCode}:access`);
        }
      }

      const allowed = missingPermissions.length === 0;

      return {
        allowed,
        reason: allowed ? undefined : 'Insufficient permissions',
        requiredPermissions,
        userPermissions,
        missingPermissions,
      };
    } catch (error) {
      logger.error('Permission check failed', {
        error: error.message,
        userId,
        requiredPermissions,
        applicationCode,
      });

      return {
        allowed: false,
        reason: 'Permission check failed',
        requiredPermissions,
        userPermissions: [],
        missingPermissions: requiredPermissions,
      };
    }
  }

  /**
   * Check if user has required roles
   */
  async checkRoles(userId: string, requiredRoles: string[]): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return requiredRoles.some(role => userRoles.includes(role));
    } catch (error) {
      logger.error('Role check failed', {
        error: error.message,
        userId,
        requiredRoles,
      });
      return false;
    }
  }

  /**
   * Check if user can access application
   */
  async canAccessApplication(userId: string, applicationCode: string): Promise<boolean> {
    try {
      const permissions = await this.getUserApplicationPermissions(userId, applicationCode);
      return permissions.length > 0;
    } catch (error) {
      logger.error('Application access check failed', {
        error: error.message,
        userId,
        applicationCode,
      });
      return false;
    }
  }

  /**
   * Get user's application permission level
   */
  async getUserApplicationPermissionLevel(
    userId: string, 
    applicationCode: string
  ): Promise<PermissionLevel | null> {
    try {
      const permissions = await this.getUserApplicationPermissions(userId, applicationCode);
      
      if (permissions.length === 0) {
        return null;
      }

      // Return the highest permission level
      const permissionHierarchy: PermissionLevel[] = ['VIEW', 'EDIT', 'ADMIN'];
      
      for (const level of permissionHierarchy.reverse()) {
        if (permissions.includes(level)) {
          return level;
        }
      }

      return permissions[0] as PermissionLevel;
    } catch (error) {
      logger.error('Failed to get user application permission level', {
        error: error.message,
        userId,
        applicationCode,
      });
      return null;
    }
  }

  /**
   * Get all user roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const cacheKey = `user:${userId}:roles`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      const roles = userRoles.map(ur => ur.role.name);
      
      // Cache the result
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(roles));
      
      return roles;
    } catch (error) {
      logger.error('Failed to get user roles', {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  /**
   * Get all user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const cacheKey = `user:${userId}:permissions`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const permissions = await prisma.applicationPermission.findMany({
        where: {
          role: {
            userRoles: {
              some: {
                userId,
              },
            },
          },
        },
        include: {
          application: {
            select: {
              code: true,
            },
          },
        },
      });

      const permissionStrings = permissions.map(p => 
        `${p.application.code}:${p.permissionLevel.toLowerCase()}`
      );

      // Add role-based permissions
      const roles = await this.getUserRoles(userId);
      const rolePermissions = roles.map(role => `role:${role.toLowerCase()}`);
      
      const allPermissions = [...permissionStrings, ...rolePermissions];
      
      // Cache the result
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(allPermissions));
      
      return allPermissions;
    } catch (error) {
      logger.error('Failed to get user permissions', {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  /**
   * Get user permissions for specific application
   */
  async getUserApplicationPermissions(userId: string, applicationCode: string): Promise<string[]> {
    try {
      const cacheKey = `user:${userId}:app:${applicationCode}:permissions`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const permissions = await prisma.applicationPermission.findMany({
        where: {
          application: {
            code: applicationCode,
          },
          role: {
            userRoles: {
              some: {
                userId,
              },
            },
          },
        },
      });

      const permissionLevels = permissions.map(p => p.permissionLevel);
      
      // Cache the result
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(permissionLevels));
      
      return permissionLevels;
    } catch (error) {
      logger.error('Failed to get user application permissions', {
        error: error.message,
        userId,
        applicationCode,
      });
      return [];
    }
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.includes('ADMIN');
    } catch (error) {
      logger.error('Failed to check admin status', {
        error: error.message,
        userId,
      });
      return false;
    }
  }

  /**
   * Check if user has system role
   */
  async hasSystemRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.includes(roleName);
    } catch (error) {
      logger.error('Failed to check system role', {
        error: error.message,
        userId,
        roleName,
      });
      return false;
    }
  }

  /**
   * Invalidate user permission cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const keys = [
        `user:${userId}:roles`,
        `user:${userId}:permissions`,
      ];

      // Get all application-specific permission keys
      const appKeys = await this.redis.keys(`user:${userId}:app:*:permissions`);
      keys.push(...appKeys);

      if (keys.length > 0) {
        await this.redis.del(keys);
      }

      logger.info('User permission cache invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user cache', {
        error: error.message,
        userId,
      });
    }
  }

  /**
   * Bulk invalidate cache for multiple users
   */
  async invalidateUsersCache(userIds: string[]): Promise<void> {
    try {
      const promises = userIds.map(userId => this.invalidateUserCache(userId));
      await Promise.all(promises);
      
      logger.info('Bulk user permission cache invalidated', { 
        userCount: userIds.length 
      });
    } catch (error) {
      logger.error('Failed to bulk invalidate user cache', {
        error: error.message,
        userIds,
      });
    }
  }

  /**
   * Get users with specific role
   */
  async getUsersWithRole(roleName: string): Promise<string[]> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          role: {
            name: roleName,
          },
        },
        select: {
          userId: true,
        },
      });

      return userRoles.map(ur => ur.userId);
    } catch (error) {
      logger.error('Failed to get users with role', {
        error: error.message,
        roleName,
      });
      return [];
    }
  }

  /**
   * Get users with access to application
   */
  async getUsersWithApplicationAccess(applicationCode: string): Promise<string[]> {
    try {
      const permissions = await prisma.applicationPermission.findMany({
        where: {
          application: {
            code: applicationCode,
          },
        },
        include: {
          role: {
            include: {
              userRoles: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      const userIds = new Set<string>();
      
      permissions.forEach(permission => {
        permission.role.userRoles.forEach(userRole => {
          userIds.add(userRole.userId);
        });
      });

      return Array.from(userIds);
    } catch (error) {
      logger.error('Failed to get users with application access', {
        error: error.message,
        applicationCode,
      });
      return [];
    }
  }

  /**
   * Check permission hierarchy
   */
  hasPermissionLevel(userLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
    const hierarchy: Record<PermissionLevel, number> = {
      VIEW: 1,
      EDIT: 2,
      ADMIN: 3,
    };

    return hierarchy[userLevel] >= hierarchy[requiredLevel];
  }

  /**
   * Get effective permissions (considering hierarchy)
   */
  getEffectivePermissions(permissions: PermissionLevel[]): PermissionLevel[] {
    const hierarchy: PermissionLevel[] = ['VIEW', 'EDIT', 'ADMIN'];
    const effective: PermissionLevel[] = [];

    // Find the highest permission level
    let highestLevel = 0;
    permissions.forEach(permission => {
      const level = hierarchy.indexOf(permission);
      if (level > highestLevel) {
        highestLevel = level;
      }
    });

    // Include all permissions up to the highest level
    for (let i = 0; i <= highestLevel; i++) {
      effective.push(hierarchy[i]);
    }

    return effective;
  }
}