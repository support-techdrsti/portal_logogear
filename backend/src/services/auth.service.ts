import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger, auditLogger } from '../config/logger';
import { env } from '../config/environment';
import {
  AuthenticationResult,
  AuthenticatedUser,
  JWTPayload,
  SessionData,
  TokenValidationResult,
  SSOCallbackData,
  LoginAuditData,
  LogoutAuditData,
} from '../types/auth';
import { CreateAuditLogInput } from '../types/audit';
import { AuditService } from './audit.service';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly redis;
  private readonly auditService: AuditService;

  constructor() {
    this.jwtSecret = env.JWT_SECRET;
    this.jwtExpiresIn = env.JWT_EXPIRES_IN;
    this.redis = getRedisClient();
    this.auditService = new AuditService();
  }

  /**
   * Process SSO callback and authenticate user
   */
  async processSSOCallback(callbackData: SSOCallbackData, ipAddress: string, userAgent: string): Promise<AuthenticationResult> {
    try {
      logger.info('Processing SSO callback', {
        provider: callbackData.provider,
        email: callbackData.profile.email,
        ipAddress,
      });

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { externalId: callbackData.profile.id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            externalId: callbackData.profile.id,
            email: callbackData.profile.email,
            name: callbackData.profile.name,
            department: callbackData.profile.department,
            status: 'ACTIVE',
            preferences: {
              timezone: 'Asia/Kolkata',
              language: 'en',
              theme: 'light',
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

        // Assign default viewer role to new users
        const viewerRole = await prisma.role.findUnique({
          where: { name: 'VIEWER' },
        });

        if (viewerRole) {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: viewerRole.id,
              assignedBy: user.id, // Self-assigned for new users
            },
          });
        }

        logger.info('Created new user from SSO', {
          userId: user.id,
          email: user.email,
          provider: callbackData.provider,
        });
      } else {
        // Update existing user information
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: callbackData.profile.email,
            name: callbackData.profile.name,
            department: callbackData.profile.department,
            lastLogin: new Date(),
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        await this.logAuthenticationEvent({
          userId: user.id,
          email: user.email,
          success: false,
          provider: callbackData.provider,
          ipAddress,
          userAgent,
          failureReason: `User account is ${user.status}`,
          timestamp: new Date(),
        });

        return {
          success: false,
          error: 'Account is not active',
        };
      }

      // Get user roles and permissions
      const roles = user.userRoles.map(ur => ur.role.name);
      const permissions = await this.getUserPermissions(user.id);

      // Create authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        externalId: user.externalId,
        email: user.email,
        name: user.name,
        department: user.department,
        roles,
        permissions,
        preferences: user.preferences as Record<string, any>,
        lastLogin: user.lastLogin,
        sessionInfo: {
          loginTime: new Date(),
          ipAddress,
          userAgent,
          ssoProvider: callbackData.provider,
        },
      };

      // Generate JWT token
      const token = this.generateJWT(authenticatedUser);

      // Store session in Redis
      const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions,
        loginTime: new Date(),
        lastActivity: new Date(),
        ipAddress,
        userAgent,
        ssoProvider: callbackData.provider,
      };

      await this.storeSession(user.id, sessionData);

      // Log successful authentication
      await this.logAuthenticationEvent({
        userId: user.id,
        email: user.email,
        success: true,
        provider: callbackData.provider,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });

      logger.info('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        provider: callbackData.provider,
        roles,
      });

      return {
        success: true,
        user: authenticatedUser,
        token,
        expiresIn: this.parseJWTExpiration(this.jwtExpiresIn),
      };

    } catch (error) {
      logger.error('SSO callback processing failed', {
        error: error.message,
        provider: callbackData.provider,
        email: callbackData.profile.email,
        ipAddress,
      });

      await this.logAuthenticationEvent({
        email: callbackData.profile.email,
        success: false,
        provider: callbackData.provider,
        ipAddress,
        userAgent,
        failureReason: error.message,
        timestamp: new Date(),
      });

      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Check if session exists in Redis
      const sessionExists = await this.redis.exists(`session:${payload.sub}`);
      if (!sessionExists) {
        return {
          valid: false,
          error: 'Session not found',
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          expired: true,
          error: 'Token expired',
        };
      }

      return {
        valid: false,
        error: 'Invalid token',
      };
    }
  }

  /**
   * Get user session from Redis
   */
  async getSession(userId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `session:${userId}`;
      const sessionData = await this.redis.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as SessionData;
      
      // Update last activity
      session.lastActivity = new Date();
      await this.redis.setEx(sessionKey, 24 * 60 * 60, JSON.stringify(session)); // 24 hours TTL

      return session;
    } catch (error) {
      logger.error('Failed to get session', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Store user session in Redis
   */
  async storeSession(userId: string, sessionData: SessionData): Promise<void> {
    try {
      const sessionKey = `session:${userId}`;
      await this.redis.setEx(sessionKey, 24 * 60 * 60, JSON.stringify(sessionData)); // 24 hours TTL
    } catch (error) {
      logger.error('Failed to store session', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Invalidate user session
   */
  async invalidateSession(userId: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      const session = await this.getSession(userId);
      const sessionKey = `session:${userId}`;
      
      await this.redis.del(sessionKey);

      if (session) {
        const sessionDuration = Date.now() - session.loginTime.getTime();
        
        await this.logLogoutEvent({
          userId,
          email: session.email,
          provider: session.ssoProvider,
          ipAddress,
          userAgent,
          sessionDuration,
          globalLogout: true,
          timestamp: new Date(),
        });
      }

      logger.info('Session invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate session', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  private generateJWT(user: AuthenticatedUser): string {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseJWTExpiration(this.jwtExpiresIn),
      iss: 'logogear-portal',
      aud: 'logogear-portal',
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Get user permissions based on roles
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
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
        application: true,
        role: true,
      },
    });

    return permissions.map(p => `${p.application.code}:${p.permissionLevel.toLowerCase()}`);
  }

  /**
   * Parse JWT expiration time
   */
  private parseJWTExpiration(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 24 * 60 * 60; // Default to 24 hours
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 24 * 60 * 60;
    }
  }

  /**
   * Log authentication event
   */
  private async logAuthenticationEvent(data: LoginAuditData): Promise<void> {
    try {
      const auditData: CreateAuditLogInput = {
        userId: data.userId,
        eventType: data.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
        details: {
          email: data.email,
          provider: data.provider,
          success: data.success,
          failureReason: data.failureReason,
          sessionId: data.sessionId,
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      };

      await this.auditService.createAuditLog(auditData);
      
      auditLogger.info('Authentication event', data);
    } catch (error) {
      logger.error('Failed to log authentication event', { error: error.message, data });
    }
  }

  /**
   * Log logout event
   */
  private async logLogoutEvent(data: LogoutAuditData): Promise<void> {
    try {
      const auditData: CreateAuditLogInput = {
        userId: data.userId,
        eventType: 'LOGIN_SUCCESS', // Using LOGIN_SUCCESS for logout tracking
        details: {
          action: 'logout',
          email: data.email,
          provider: data.provider,
          sessionDuration: data.sessionDuration,
          globalLogout: data.globalLogout,
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      };

      await this.auditService.createAuditLog(auditData);
      
      auditLogger.info('Logout event', data);
    } catch (error) {
      logger.error('Failed to log logout event', { error: error.message, data });
    }
  }
}