import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { CreateAuditLogInput, AuditLogSearchInput, AuditLogWithUser, AuditStatistics } from '../types/audit';
import { PaginatedResponse } from '../types/api';

export class AuditService {
  /**
   * Create a new audit log entry
   */
  async createAuditLog(data: CreateAuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          eventType: data.eventType,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error.message,
        data,
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Search audit logs with filters and pagination
   */
  async searchAuditLogs(searchParams: AuditLogSearchInput): Promise<PaginatedResponse<AuditLogWithUser>> {
    try {
      const {
        userId,
        eventType,
        resourceType,
        resourceId,
        ipAddress,
        startDate,
        endDate,
        search,
        limit,
        offset,
        sortBy,
        sortOrder,
      } = searchParams;

      // Build where clause
      const where: any = {};

      if (userId) {
        where.userId = userId;
      }

      if (eventType) {
        where.eventType = eventType;
      }

      if (resourceType) {
        where.resourceType = resourceType;
      }

      if (resourceId) {
        where.resourceId = resourceId;
      }

      if (ipAddress) {
        where.ipAddress = ipAddress;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      if (search) {
        where.OR = [
          {
            user: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            user: {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            details: {
              path: ['$'],
              string_contains: search,
            },
          },
        ];
      }

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return {
        success: true,
        data: auditLogs,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to search audit logs', {
        error: error.message,
        searchParams,
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date): Promise<AuditStatistics> {
    try {
      const where: any = {};
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Get total events
      const totalEvents = await prisma.auditLog.count({ where });

      // Get events by type
      const eventsByTypeRaw = await prisma.auditLog.groupBy({
        by: ['eventType'],
        where,
        _count: {
          eventType: true,
        },
      });

      const eventsByType = eventsByTypeRaw.reduce((acc, item) => {
        acc[item.eventType] = item._count.eventType;
        return acc;
      }, {} as Record<string, number>);

      // Get events by user
      const eventsByUserRaw = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      });

      const userIds = eventsByUserRaw.map(item => item.userId).filter(Boolean);
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {} as Record<string, string>);

      const eventsByUser = eventsByUserRaw.map(item => ({
        userId: item.userId!,
        userName: userMap[item.userId!] || 'Unknown User',
        eventCount: item._count.userId,
      }));

      // Get events by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const eventsByDayRaw = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const eventsByDay = eventsByDayRaw.map(item => ({
        date: item.date,
        count: Number(item.count),
      }));

      // Get top IP addresses
      const topIpAddressesRaw = await prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where,
        _count: {
          ipAddress: true,
        },
        _max: {
          createdAt: true,
        },
        orderBy: {
          _count: {
            ipAddress: 'desc',
          },
        },
        take: 10,
      });

      const topIpAddresses = topIpAddressesRaw.map(item => ({
        ipAddress: item.ipAddress,
        count: item._count.ipAddress,
        lastSeen: item._max.createdAt!,
      }));

      // Get security events
      const failedLogins = await prisma.auditLog.count({
        where: {
          ...where,
          eventType: 'LOGIN_FAILURE',
        },
      });

      const permissionChanges = await prisma.auditLog.count({
        where: {
          ...where,
          eventType: 'PERMISSION_CHANGE',
        },
      });

      // Get recent activity
      const recentActivityRaw = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      const recentActivity = recentActivityRaw.map(log => ({
        eventType: log.eventType,
        timestamp: log.createdAt,
        user: log.user?.name || 'System',
        description: this.formatEventDescription(log.eventType, log.details),
      }));

      return {
        totalEvents,
        eventsByType,
        eventsByUser,
        eventsByDay,
        topIpAddresses,
        securityEvents: {
          failedLogins,
          suspiciousActivity: 0, // TODO: Implement suspicious activity detection
          permissionChanges,
        },
        recentActivity,
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', {
        error: error.message,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Format event description for display
   */
  private formatEventDescription(eventType: string, details: any): string {
    switch (eventType) {
      case 'LOGIN_SUCCESS':
        return details.action === 'logout' ? 'User logged out' : `User logged in via ${details.provider || 'unknown'}`;
      case 'LOGIN_FAILURE':
        return `Login failed: ${details.failureReason || 'Unknown reason'}`;
      case 'APP_LAUNCH':
        return `Launched application: ${details.applicationName}`;
      case 'ROLE_CHANGE':
        return `Role ${details.action}: ${details.roleName} for ${details.targetUserName}`;
      case 'FILE_UPLOAD':
        return `Uploaded file: ${details.filename}`;
      case 'JOB_TRIGGER':
        return `Triggered ${details.jobType} processing job for ${details.filename}`;
      case 'CONFIG_CHANGE':
        return `Configuration changed: ${details.configType}`;
      case 'PERMISSION_CHANGE':
        return `Permission ${details.action} for ${details.targetName}`;
      default:
        return `${eventType} event occurred`;
    }
  }
}