import { Router, Request, Response } from 'express';
import { SimpleAuthService } from '../services/auth.service.simple';
import { logger } from '../config/logger';
import { env } from '../config/environment';

const router = Router();
const authService = new SimpleAuthService();

/**
 * GET /auth/login
 * Initiate SSO login
 */
router.get('/login', (req: any, res: any) => {
  // For development, redirect to mock login
  if (env.NODE_ENV === 'development') {
    return res.redirect('/auth/mock-login');
  }
  
  res.status(400).json({
    success: false,
    error: 'SSO not configured',
    message: 'Please configure OIDC or SAML for authentication'
  });
});

/**
 * GET /auth/callback
 * OIDC callback handler
 */
router.get('/callback', async (req: any, res: any) => {
  try {
    const result = await authService.handleCallback(req);
    
    if (result.success && result.user) {
      req.session.userId = result.user.id;
      req.session.user = result.user;
      res.redirect(env.FRONTEND_URL);
    } else {
      res.status(401).json({ error: result.error || 'Authentication failed' });
    }
  } catch (error) {
    logger.error('Callback handling failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', (req: any, res: any) => {
  req.session.destroy((err: any) => {
    if (err) {
      logger.error('Session destruction failed:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('logogear.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await authService.getCurrentUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get current user failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', async (req: any, res: any) => {
  const userId = req.session?.userId;
  let user = null;
  
  if (userId) {
    user = await authService.getCurrentUser(userId);
  }
  
  res.json({
    success: true,
    data: {
      authenticated: !!user,
      user: user || null,
    },
  });
});

/**
 * POST /auth/mock-login
 * Development-only mock login
 */
if (env.NODE_ENV === 'development') {
  router.post('/mock-login', async (req: any, res: any) => {
    try {
      // Get the development user from database
      const user = await authService.getCurrentUser('dev-user-1');
      
      if (!user) {
        // Create development user if not exists
        const newUser = await authService.createOrUpdateUser({
          externalId: 'dev-user-1',
          email: 'developer@logogear.co.in',
          name: 'Development User',
          department: 'IT'
        });
        
        if (!newUser) {
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create development user' 
          });
        }
        
        req.session.userId = newUser.id;
        req.session.user = newUser;
        
        return res.json({ 
          success: true, 
          data: newUser,
          message: 'Mock login successful' 
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.user = user;

      res.json({ 
        success: true, 
        data: user,
        message: 'Mock login successful' 
      });
    } catch (error) {
      logger.error('Mock login failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Mock login failed' 
      });
    }
  });
  
  router.get('/mock-login', (req: any, res: any) => {
    res.send(`
      <html>
        <head><title>Development Login</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px;">
          <h2>Development Login</h2>
          <p>Click the button below to login as a development user:</p>
          <button onclick="login()" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
            Login as Development User
          </button>
          <script>
            async function login() {
              try {
                const response = await fetch('/auth/mock-login', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                  window.location.href = '${env.FRONTEND_URL}';
                } else {
                  alert('Login failed: ' + result.error);
                }
              } catch (error) {
                alert('Login failed: ' + error.message);
              }
            }
          </script>
        </body>
      </html>
    `);
  });
}

export { router as authRoutes };