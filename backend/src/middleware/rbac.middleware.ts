import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import { logger } from '../config/logger';
import { AuthorizationError, PermissionError } from './error.middleware';
import { PermissionLevel } from '@prisma/client';

export class RBACMiddleware {
  private authorizationService: AuthorizationService;

  constructor() {
    this.authorizationService = new AuthorizationService();
  }

  /**
   * Require specific roles
   */
  requireRoles(roles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        const hasRole = await this.authorizationService.checkRoles(req.user.id, roles);
        
        if (!hasRole) {
          logger.warn('Access denied - insufficient roles', {
            userId: req.user.id,
            userRoles: req.user.roles,
            requiredRoles: roles,
            url: req.originalUrl,
            method: req.method,
          });

          throw new AuthorizationError(
            `Access denied. Required roles: ${roles.join(', ')}`,
            'INSUFFICIENT_ROLES'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Require specific permissions
   */
  requirePermissions(permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        const permissionCheck = await this.authorizationService.checkPermissions(
          req.user.id,
          permissions
        );
        
        if (!permissionCheck.allowed) {
          logger.warn('Access denied - insufficient permissions', {
            userId: req.user.id,
            userPermissions: permissionCheck.userPermissions,
            requiredPermissions: permissions,
            missingPermissions: permissionCheck.missingPermissions,
            url: req.originalUrl,
            method: req.method,
          });

          throw new PermissionError(
            `Access denied. Missing permissions: ${permissionCheck.missingPermissions.join(', ')}`,
            permissionCheck.missingPermissions,
            'INSUFFICIENT_PERMISSIONS'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Require admin role
   */
  requireAdmin() {
    return this.requireRoles(['ADMIN']);
  }

  /**
   * Require application access
   */
  requireApplicationAccess(applicationCode: string, minimumLevel?: PermissionLevel) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        const canAccess = await this.authorizationService.canAccessApplication(
          req.user.id,
          applicationCode
        );
        
        if (!canAccess) {
          logger.warn('Access denied - no application access', {
            userId: req.user.id,
            applicationCode,
            url: req.originalUrl,
            method: req.method,
          });

          throw new AuthorizationError(
            `Access denied to application: ${applicationCode}`,
            'NO_APPLICATION_ACCESS'
          );
        }

        // Check minimum permission level if specified
        if (minimumLevel) {
          const userLevel = await this.authorizationService.getUserApplicationPermissionLevel(
            req.user.id,
            applicationCode
          );

          if (!userLevel || !this.authorizationService.hasPermissionLevel(userLevel, minimumLevel)) {
            logger.warn('Access denied - insufficient application permission level', {
              userId: req.user.id,
              applicationCode,
              userLevel,
              requiredLevel: minimumLevel,
              url: req.originalUrl,
              method: req.method,
            });

            throw new AuthorizationError(
              `Insufficient permission level for ${applicationCode}. Required: ${minimumLevel}`,
              'INSUFFICIENT_PERMISSION_LEVEL'
            );
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Require PIM access
   */
  requirePIMAccess(minimumLevel?: PermissionLevel) {
    return this.requireApplicationAccess('pim-production', minimumLevel);
  }

  /**
   * Check if user owns resource or has admin access
   */
  requireOwnershipOrAdmin(getResourceOwnerId: (req: Request) => Promise<string | null>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        // Check if user is admin
        const isAdmin = await this.authorizationService.isAdmin(req.user.id);
        
        if (isAdmin) {
          return next();
        }

        // Check resource ownership
        const resourceOwnerId = await getResourceOwnerId(req);
        
        if (!resourceOwnerId) {
          throw new AuthorizationError('Resource not found or access denied');
        }

        if (resourceOwnerId !== req.user.id) {
          logger.warn('Access denied - not resource owner', {
            userId: req.user.id,
            resourceOwnerId,
            url: req.originalUrl,
            method: req.method,
          });

          throw new AuthorizationError(
            'Access denied. You can only access your own resources.',
            'NOT_RESOURCE_OWNER'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Conditional access based on user attributes
   */
  requireCondition(condition: (req: Request) => Promise<boolean>, errorMessage?: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        const allowed = await condition(req);
        
        if (!allowed) {
          logger.warn('Access denied - condition not met', {
            userId: req.user.id,
            url: req.originalUrl,
            method: req.method,
          });

          throw new AuthorizationError(
            errorMessage || 'Access denied - condition not met',
            'CONDITION_NOT_MET'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Department-based access control
   */
  requireDepartment(departments: string[]) {
    return this.requireCondition(
      async (req: Request) => {
        // Get user's department from database or token
        const userDepartment = req.user?.department;
        return userDepartment ? departments.includes(userDepartment) : false;
      },
      `Access restricted to departments: ${departments.join(', ')}`
    );
  }

  /**
   * Time-based access control
   */
  requireBusinessHours() {
    return this.requireCondition(
      async (req: Request) => {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        // Monday to Friday, 9 AM to 6 PM
        return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
      },
      'Access restricted to business hours (Mon-Fri, 9 AM - 6 PM)'
    );
  }

  /**
   * Rate limiting per user
   */
  requireUserRateLimit(maxRequests: number, windowMs: number) {
    const userRequests = new Map<string, { count: number; resetTime: number }>();

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        const userId = req.user.id;
        const now = Date.now();
        const userLimit = userRequests.get(userId);

        if (!userLimit || now > userLimit.resetTime) {
          // Reset or initialize counter
          userRequests.set(userId, {
            count: 1,
            resetTime: now + windowMs,
          });
          return next();
        }

        if (userLimit.count >= maxRequests) {
          logger.warn('User rate limit exceeded', {
            userId,
            count: userLimit.count,
            maxRequests,
            url: req.originalUrl,
            method: req.method,
          });

          return res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: 'User rate limit exceeded',
            code: 'USER_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
            timestamp: new Date(),
          });
        }

        userLimit.count++;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Feature flag based access control
   */
  requireFeatureFlag(flagName: string) {
    return this.requireCondition(
      async (req: Request) => {
        // TODO: Implement feature flag service
        // For now, return true (feature enabled)
        return true;
      },
      `Feature '${flagName}' is not enabled`
    );
  }

  /**
   * Multiple conditions with AND logic
   */
  requireAll(...middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let index = 0;

      const runNext = (error?: any) => {
        if (error) {
          return next(error);
        }

        if (index >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[index++];
        middleware(req, res, runNext);
      };

      runNext();
    };
  }

  /**
   * Multiple conditions with OR logic
   */
  requireAny(...middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let lastError: any;
      let index = 0;

      const tryNext = () => {
        if (index >= middlewares.length) {
          return next(lastError || new AuthorizationError('None of the authorization conditions were met'));
        }

        const middleware = middlewares[index++];
        middleware(req, res, (error?: any) => {
          if (error) {
            lastError = error;
            return tryNext();
          }
          next();
        });
      };

      tryNext();
    };
  }
}