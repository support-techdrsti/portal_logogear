import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

// Simple auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * GET /api/applications
 * Get all applications accessible to the current user
 */
router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    // For now, return all active applications
    // In a full implementation, this would filter by user permissions
    const applications = await prisma.application.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(applications);
  } catch (error) {
    logger.error('Failed to fetch applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * GET /api/applications/:id
 * Get a specific application
 */
router.get('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    logger.error('Failed to fetch application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

/**
 * POST /api/applications/:id/launch
 * Launch an application (track usage)
 */
router.post('/:id/launch', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.isActive) {
      return res.status(403).json({ error: 'Application is not active' });
    }

    // Log the application launch
    await prisma.auditLog.create({
      data: {
        userId,
        eventType: 'APP_LAUNCH',
        resourceId: application.id,
        details: JSON.stringify({
          applicationName: application.name,
          applicationCode: application.code,
          launchUrl: application.url,
        }),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      },
    });

    res.json({
      success: true,
      data: {
        launchUrl: application.url,
        application: {
          id: application.id,
          name: application.name,
          code: application.code,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to launch application:', error);
    res.status(500).json({ error: 'Failed to launch application' });
  }
});

export { router as applicationsRoutes };