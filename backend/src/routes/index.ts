import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { applicationsRoutes } from './applications.routes';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/api/applications', applicationsRoutes);

export { router as routes };