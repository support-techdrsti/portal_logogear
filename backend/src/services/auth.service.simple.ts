import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  department?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export class SimpleAuthService {
  async getCurrentUser(userId: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        department: user.department || undefined,
        roles: user.roles.map(ur => ur.role.name),
        permissions: ['read:applications', 'write:applications'] // Simplified
      };
    } catch (error) {
      logger.error('Failed to get current user:', error);
      return null;
    }
  }

  async createOrUpdateUser(userData: {
    externalId: string;
    email: string;
    name?: string;
    department?: string;
  }): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          department: userData.department,
          lastLogin: new Date(),
        },
        create: {
          externalId: userData.externalId,
          email: userData.email,
          name: userData.name,
          department: userData.department,
          status: 'ACTIVE',
          lastLogin: new Date(),
        },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      // Assign default USER role if no roles exist
      if (user.roles.length === 0) {
        const userRole = await prisma.role.findUnique({
          where: { name: 'USER' }
        });

        if (userRole) {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: userRole.id,
            }
          });
          
          // Reload user with roles
          const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              roles: {
                include: {
                  role: true
                }
              }
            }
          });
          
          if (updatedUser) {
            return {
              id: updatedUser.id,
              email: updatedUser.email,
              name: updatedUser.name || updatedUser.email,
              department: updatedUser.department || undefined,
              roles: updatedUser.roles.map(ur => ur.role.name),
              permissions: ['read:applications', 'write:applications']
            };
          }
        }
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        department: user.department || undefined,
        roles: user.roles.map(ur => ur.role.name),
        permissions: ['read:applications', 'write:applications']
      };
    } catch (error) {
      logger.error('Failed to create/update user:', error);
      return null;
    }
  }

  // Mock SSO methods for development
  async initiateLogin(req: Request): Promise<string> {
    // In development, redirect to a mock login page
    return '/auth/mock-login';
  }

  async handleCallback(req: Request): Promise<AuthResult> {
    // This would normally handle OIDC/SAML callback
    // For now, return error to use mock login
    return {
      success: false,
      error: 'SSO not configured, use mock login for development'
    };
  }
}