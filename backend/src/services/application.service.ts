import { prisma } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';
import { AuthorizationService } from './authorization.service';
import { AuditService } from './audit.service';
import {
  CreateApplicationInput,
  UpdateApplicationInput,
  ApplicationWithPermissions,
  ApplicationCatalogItem,
  ApplicationLaunchResponse,
} from '../types/application';
import { CreateAuditLogInput } from '../types/audit';
import { Application, ApplicationCategory, ApplicationEnvironment, PermissionLevel } from '@prisma/client';

export class ApplicationService {
  private readonly redis;
  private readonly authorizationService: AuthorizationService;
  private readonly auditService: AuditService;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = getRedisClient();
    this.authorizationService = new AuthorizationService();
    this.auditService = new AuditService();
  }

  /**
   * Create new application
   */
  async createApplication(
    applicationData: CreateApplicationInput,
    createdBy: string
  ): Promise<Application> {
    try {
      // Check if application code already exists
      const existing = await prisma.application.findUnique({
        where: { code: applicationData.code },
      });

      if (existing) {
        throw new Error(`Application with code '${applicationData.code}' already exists`);
      }

      // Create application
      const application = await prisma.application.create({
        data: {
          name: applicationData.name,
          code: applicationData.code,
          description: applicationData.description,
          category: applicationData.category,
          url: applicationData.url,
          environment: applicationData.environment,
          isActive: applicationData.isActive,
          ssoConfig: applicationData.ssoConfig || {},
        },
      });

      // Invalidate cache
      await this.invalidateCache();

      logger.info('Application created', {
        applicationId: application.id,
        code: application.code,
        name: application.name,
        createdBy,
      });

      // Log application creation
      await this.auditService.createAuditLog({
        userId: createdBy,
        eventType: 'CONFIG_CHANGE',
        resourceType: 'application',
        resourceId: application.id,
        details: {
          action: 'application_created',
          applicationCode: application.code,
          applicationName: application.name,
          category: application.category,
          environment: application.environment,
        },
        ipAddress: 'system',
        userAgent: 'Application Service',
      });

      return application;
    } catch (error) {
      logger.error('Failed to create application', {
        error: error.message,
        applicationData,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Update application
   */
  async updateApplication(
    applicationId: string,
    updateData: UpdateApplicationInput,
    updatedBy: string
  ): Promise<Application> {
    try {
      // Get current application
      const currentApp = await prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!currentApp) {
        throw new Error('Application not found');
      }

      // Check if code is being changed and if it conflicts
      if (updateData.code && updateData.code !== currentApp.code) {
        const existing = await prisma.application.findUnique({
          where: { code: updateData.code },
        });

        if (existing) {
          throw new Error(`Application with code '${updateData.code}' already exists`);
        }
      }

      // Update application
      const application = await prisma.application.update({
        where: { id: applicationId },
        data: {
          ...updateData,
          ssoConfig: updateData.ssoConfig ? {
            ...currentApp.ssoConfig as object,
            ...updateData.ssoConfig,
          } : undefined,
        },
      });

      // Invalidate cache
      await this.invalidateCache();

      logger.info('Application updated', {
        applicationId,
        code: application.code,
        name: application.name,
        updatedBy,
        changes: updateData,
      });

      // Log application update
      await this.auditService.createAuditLog({
        userId: updatedBy,
        eventType: 'CONFIG_CHANGE',
        resourceType: 'application',
        resourceId: applicationId,
        details: {
          action: 'application_updated',
          applicationCode: application.code,
          applicationName: application.name,
          changes: updateData,
          previousValues: {
            name: currentApp.name,
            description: currentApp.description,
            category: currentApp.category,
            url: currentApp.url,
            environment: currentApp.environment,
            isActive: currentApp.isActive,
          },
        },
        ipAddress: 'system',
        userAgent: 'Application Service',
      });

      return application;
    } catch (error) {
      logger.error('Failed to update application', {
        error: error.message,
        applicationId,
        updateData,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * Delete application
   */
  async deleteApplication(applicationId: string, deletedBy: string): Promise<void> {
    try {
      // Get application details before deletion
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          permissions: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Delete application (this will cascade delete permissions)
      await prisma.application.delete({
        where: { id: applicationId },
      });

      // Invalidate cache
      await this.invalidateCache();

      // Invalidate user caches for users who had access to this application
      const affectedUsers = await this.authorizationService.getUsersWithApplicationAccess(
        application.code
      );
      await this.authorizationService.invalidateUsersCache(affectedUsers);

      logger.info('Application deleted', {
        applicationId,
        code: application.code,
        name: application.name,
        deletedBy,
        affectedUsers: affectedUsers.length,
      });

      // Log application deletion
      await this.auditService.createAuditLog({
        userId: deletedBy,
        eventType: 'CONFIG_CHANGE',
        resourceType: 'application',
        resourceId: applicationId,
        details: {
          action: 'application_deleted',
          applicationCode: application.code,
          applicationName: application.name,
          affectedUsers: affectedUsers.length,
        },
        ipAddress: 'system',
        userAgent: 'Application Service',
      });
    } catch (error) {
      logger.error('Failed to delete application', {
        error: error.message,
        applicationId,
        deletedBy,
      });
      throw error;
    }
  }

  /**
   * Get application by ID with permissions
   */
  async getApplicationById(applicationId: string): Promise<ApplicationWithPermissions | null> {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          permissions: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return application;
    } catch (error) {
      logger.error('Failed to get application by ID', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Get application by code
   */
  async getApplicationByCode(code: string): Promise<Application | null> {
    try {
      const cacheKey = `app:code:${code}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const application = await prisma.application.findUnique({
        where: { code },
      });

      if (application) {
        await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(application));
      }

      return application;
    } catch (error) {
      logger.error('Failed to get application by code', {
        error: error.message,
        code,
      });
      throw error;
    }
  }

  /**
   * Get all applications
   */
  async getAllApplications(): Promise<Application[]> {
    try {
      const cacheKey = 'apps:all';
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const applications = await prisma.application.findMany({
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(applications));

      return applications;
    } catch (error) {
      logger.error('Failed to get all applications', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get application catalog for user
   */
  async getApplicationCatalog(userId: string): Promise<ApplicationCatalogItem[]> {
    try {
      const cacheKey = `user:${userId}:catalog`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get all active applications
      const applications = await prisma.application.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      // Get user's application permissions
      const userPermissions = await prisma.applicationPermission.findMany({
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
          application: true,
        },
      });

      // Create permission map
      const permissionMap = new Map<string, PermissionLevel>();
      userPermissions.forEach(permission => {
        const currentLevel = permissionMap.get(permission.application.code);
        if (!currentLevel || this.authorizationService.hasPermissionLevel(permission.permissionLevel, currentLevel)) {
          permissionMap.set(permission.application.code, permission.permissionLevel);
        }
      });

      // Build catalog items
      const catalogItems: ApplicationCatalogItem[] = applications
        .filter(app => permissionMap.has(app.code))
        .map(app => ({
          id: app.id,
          name: app.name,
          code: app.code,
          description: app.description,
          category: app.category,
          environment: app.environment,
          url: app.url,
          isActive: app.isActive,
          userPermission: permissionMap.get(app.code),
          canLaunch: true,
          launchUrl: `/api/applications/${app.id}/launch`,
          icon: this.getApplicationIcon(app.code),
          tags: this.getApplicationTags(app),
        }));

      // Cache the result
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(catalogItems));

      return catalogItems;
    } catch (error) {
      logger.error('Failed to get application catalog', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Launch application with SSO
   */
  async launchApplication(
    applicationId: string,
    userId: string,
    returnUrl?: string
  ): Promise<ApplicationLaunchResponse> {
    try {
      // Get application
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (!application.isActive) {
        throw new Error('Application is not active');
      }

      // Check user access
      const canAccess = await this.authorizationService.canAccessApplication(
        userId,
        application.code
      );

      if (!canAccess) {
        throw new Error('Access denied to application');
      }

      // Get SSO configuration
      const ssoConfig = application.ssoConfig as any || {};
      
      // Build launch URL with SSO parameters
      let launchUrl = application.url;
      const launchMethod: 'GET' | 'POST' = 'GET';
      const parameters: Record<string, string> = {};

      // Add SSO token or parameters based on configuration
      if (ssoConfig.tokenPassthrough) {
        // In a real implementation, you would generate a temporary token
        // or use the existing JWT token for SSO
        parameters.sso_token = 'temp_token_placeholder';
      }

      if (returnUrl) {
        parameters.return_url = returnUrl;
      }

      // Add custom parameters from SSO config
      if (ssoConfig.customParams) {
        Object.assign(parameters, ssoConfig.customParams);
      }

      // Build final URL with parameters
      if (Object.keys(parameters).length > 0) {
        const urlParams = new URLSearchParams(parameters);
        launchUrl += (launchUrl.includes('?') ? '&' : '?') + urlParams.toString();
      }

      // Log application launch
      await this.auditService.createAuditLog({
        userId,
        eventType: 'APP_LAUNCH',
        resourceType: 'application',
        resourceId: applicationId,
        details: {
          applicationCode: application.code,
          applicationName: application.name,
          applicationUrl: application.url,
          launchMethod: 'sso',
          success: true,
        },
        ipAddress: 'system',
        userAgent: 'Application Service',
      });

      logger.info('Application launched', {
        applicationId,
        applicationCode: application.code,
        userId,
        launchUrl,
      });

      return {
        success: true,
        launchUrl,
        method: launchMethod,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        newTab: ssoConfig.autoLaunch !== false,
      };
    } catch (error) {
      logger.error('Failed to launch application', {
        error: error.message,
        applicationId,
        userId,
      });

      // Log failed launch
      await this.auditService.createAuditLog({
        userId,
        eventType: 'APP_LAUNCH',
        resourceType: 'application',
        resourceId: applicationId,
        details: {
          applicationId,
          launchMethod: 'sso',
          success: false,
          errorMessage: error.message,
        },
        ipAddress: 'system',
        userAgent: 'Application Service',
      });

      return {
        success: false,
        launchUrl: '',
        method: 'GET',
        newTab: false,
      };
    }
  }

  /**
   * Get applications by category
   */
  async getApplicationsByCategory(category: ApplicationCategory): Promise<Application[]> {
    try {
      const cacheKey = `apps:category:${category}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const applications = await prisma.application.findMany({
        where: { 
          category,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(applications));

      return applications;
    } catch (error) {
      logger.error('Failed to get applications by category', {
        error: error.message,
        category,
      });
      throw error;
    }
  }

  /**
   * Search applications
   */
  async searchApplications(query: string, userId?: string): Promise<ApplicationCatalogItem[]> {
    try {
      let applications = await this.getAllApplications();

      // Filter by search query
      if (query) {
        const searchTerm = query.toLowerCase();
        applications = applications.filter(app =>
          app.name.toLowerCase().includes(searchTerm) ||
          app.code.toLowerCase().includes(searchTerm) ||
          app.description?.toLowerCase().includes(searchTerm) ||
          app.category.toLowerCase().includes(searchTerm)
        );
      }

      // If user ID provided, filter by permissions and return catalog items
      if (userId) {
        const catalog = await this.getApplicationCatalog(userId);
        const catalogMap = new Map(catalog.map(item => [item.id, item]));
        
        return applications
          .map(app => catalogMap.get(app.id))
          .filter(Boolean) as ApplicationCatalogItem[];
      }

      // Return basic application info
      return applications.map(app => ({
        id: app.id,
        name: app.name,
        code: app.code,
        description: app.description,
        category: app.category,
        environment: app.environment,
        url: app.url,
        isActive: app.isActive,
        canLaunch: false,
        launchUrl: '',
        icon: this.getApplicationIcon(app.code),
        tags: this.getApplicationTags(app),
      }));
    } catch (error) {
      logger.error('Failed to search applications', {
        error: error.message,
        query,
        userId,
      });
      throw error;
    }
  }

  /**
   * Invalidate application cache
   */
  private async invalidateCache(): Promise<void> {
    try {
      const keys = [
        'apps:all',
        'apps:category:*',
        'app:code:*',
        'user:*:catalog',
      ];

      for (const pattern of keys) {
        if (pattern.includes('*')) {
          const matchingKeys = await this.redis.keys(pattern);
          if (matchingKeys.length > 0) {
            await this.redis.del(matchingKeys);
          }
        } else {
          await this.redis.del(pattern);
        }
      }

      logger.info('Application cache invalidated');
    } catch (error) {
      logger.error('Failed to invalidate application cache', {
        error: error.message,
      });
    }
  }

  /**
   * Get application icon based on code
   */
  private getApplicationIcon(code: string): string {
    const iconMap: Record<string, string> = {
      'pim-production': '📦',
      'pim-staging': '🧪',
      'analytics-dashboard': '📊',
      'order-management': '🛒',
    };

    return iconMap[code] || '🔧';
  }

  /**
   * Get application tags
   */
  private getApplicationTags(app: Application): string[] {
    const tags: string[] = [];

    tags.push(app.category.toLowerCase());
    tags.push(app.environment.toLowerCase());

    if (app.code.includes('pim')) {
      tags.push('product-management');
    }

    if (app.code.includes('analytics')) {
      tags.push('reporting', 'business-intelligence');
    }

    if (app.code.includes('order')) {
      tags.push('sales', 'e-commerce');
    }

    return tags;
  }
}