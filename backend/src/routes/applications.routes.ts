import { Router } from 'express';
import { z } from 'zod';
import { ApplicationService } from '../services/application.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { RBACMiddleware } from '../middleware/rbac.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';
import { SecurityMiddleware } from '../middleware/security.middleware';
import { CreateApplicationSchema, UpdateApplicationSchema, LaunchApplicationSchema } from '../types/application';
import { logger } from '../config/logger';

const router = Router();
const applicationService = new ApplicationService();
const authMiddleware = new AuthMiddleware();
const rbacMiddleware = new RBACMiddleware();

// Apply authentication to all routes
router.use(authMiddleware.requireAuth());

/**
 * GET /api/applications
 * Get application catalog for current user
 */
router.get('/', 
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const catalog = await applicationService.getApplicationCatalog(req.user!.id);
    
    res.json({
      success: true,
      data: catalog,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/applications/search
 * Search applications
 */
router.get('/search',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { q } = req.query;
    const query = typeof q === 'string' ? q : '';
    
    const results = await applicationService.searchApplications(query, req.user!.id);
    
    res.json({
      success: true,
      data: results,
      query,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/applications/categories/:category
 * Get applications by category
 */
router.get('/categories/:category',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['OPERATIONS', 'SALES', 'TECH', 'ADMIN'];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories,
      });
    }
    
    const applications = await applicationService.getApplicationsByCategory(
      category.toUpperCase() as any
    );
    
    res.json({
      success: true,
      data: applications,
      category,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/applications/:id
 * Get application details
 */
router.get('/:id',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const application = await applicationService.getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }
    
    res.json({
      success: true,
      data: application,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/applications/:id/launch
 * Launch application with SSO
 */
router.post('/:id/launch',
  SecurityMiddleware.rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 launches per minute
  }),
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate request body
    const validationResult = LaunchApplicationSchema.safeParse({
      applicationId: id,
      ...req.body,
    });
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationResult.error.errors,
      });
    }
    
    const { returnUrl } = validationResult.data;
    
    const launchResult = await applicationService.launchApplication(
      id,
      req.user!.id,
      returnUrl
    );
    
    if (!launchResult.success) {
      return res.status(403).json({
        success: false,
        error: 'Application launch failed',
        message: 'Unable to launch application. Please check your permissions.',
      });
    }
    
    res.json({
      success: true,
      data: launchResult,
      timestamp: new Date(),
    });
  })
);

// Admin-only routes
router.use(rbacMiddleware.requireAdmin());

/**
 * GET /api/applications/admin/all
 * Get all applications (admin only)
 */
router.get('/admin/all',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const applications = await applicationService.getAllApplications();
    
    res.json({
      success: true,
      data: applications,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/applications
 * Create new application (admin only)
 */
router.post('/',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    // Validate request body
    const validationResult = CreateApplicationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationResult.error.errors,
      });
    }
    
    const application = await applicationService.createApplication(
      validationResult.data,
      req.user!.id
    );
    
    res.status(201).json({
      success: true,
      data: application,
      message: 'Application created successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * PUT /api/applications/:id
 * Update application (admin only)
 */
router.put('/:id',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate request body
    const validationResult = UpdateApplicationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationResult.error.errors,
      });
    }
    
    const application = await applicationService.updateApplication(
      id,
      validationResult.data,
      req.user!.id
    );
    
    res.json({
      success: true,
      data: application,
      message: 'Application updated successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * DELETE /api/applications/:id
 * Delete application (admin only)
 */
router.delete('/:id',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await applicationService.deleteApplication(id, req.user!.id);
    
    res.json({
      success: true,
      message: 'Application deleted successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/applications/:id/permissions
 * Manage application permissions (admin only)
 */
router.post('/:id/permissions',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { roleId, permissionLevel } = req.body;
    
    // Validate input
    const schema = z.object({
      roleId: z.string().cuid(),
      permissionLevel: z.enum(['VIEW', 'EDIT', 'ADMIN']),
    });
    
    const validationResult = schema.safeParse({ roleId, permissionLevel });
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationResult.error.errors,
      });
    }
    
    // Create or update permission
    const permission = await prisma.applicationPermission.upsert({
      where: {
        applicationId_roleId: {
          applicationId: id,
          roleId: validationResult.data.roleId,
        },
      },
      update: {
        permissionLevel: validationResult.data.permissionLevel,
      },
      create: {
        applicationId: id,
        roleId: validationResult.data.roleId,
        permissionLevel: validationResult.data.permissionLevel,
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
        application: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });
    
    logger.info('Application permission updated', {
      applicationId: id,
      roleId: validationResult.data.roleId,
      permissionLevel: validationResult.data.permissionLevel,
      updatedBy: req.user!.id,
    });
    
    res.json({
      success: true,
      data: permission,
      message: 'Permission updated successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * DELETE /api/applications/:id/permissions/:roleId
 * Remove application permission (admin only)
 */
router.delete('/:id/permissions/:roleId',
  ErrorMiddleware.asyncHandler(async (req, res) => {
    const { id, roleId } = req.params;
    
    await prisma.applicationPermission.delete({
      where: {
        applicationId_roleId: {
          applicationId: id,
          roleId,
        },
      },
    });
    
    logger.info('Application permission removed', {
      applicationId: id,
      roleId,
      removedBy: req.user!.id,
    });
    
    res.json({
      success: true,
      message: 'Permission removed successfully',
      timestamp: new Date(),
    });
  })
);

export { router as applicationsRoutes };