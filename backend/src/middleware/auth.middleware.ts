import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import { Strategy as SamlStrategy } from 'passport-saml';
import { AuthService } from '../services/auth.service';
import { logger } from '../config/logger';
import { env } from '../config/environment';
import { AuthMiddlewareOptions, SSOCallbackData } from '../types/auth';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
    this.configurePassport();
  }

  /**
   * Configure Passport strategies
   */
  private configurePassport(): void {
    // OIDC Strategy
    if (env.OIDC_ISSUER_URL && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET) {
      passport.use('oidc', new OpenIDConnectStrategy({
        issuer: env.OIDC_ISSUER_URL,
        clientID: env.OIDC_CLIENT_ID,
        clientSecret: env.OIDC_CLIENT_SECRET,
        callbackURL: env.OIDC_CALLBACK_URL,
        scope: 'openid profile email',
      }, async (issuer, profile, done) => {
        try {
          const callbackData: SSOCallbackData = {
            provider: 'oidc',
            profile: {
              id: profile.id,
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName || '',
              department: profile._json?.department,
              roles: profile._json?.roles || [],
              groups: profile._json?.groups || [],
            },
            tokens: {
              accessToken: profile._json?.access_token,
              refreshToken: profile._json?.refresh_token,
              idToken: profile._json?.id_token,
            },
            raw: profile._json,
          };

          return done(null, callbackData);
        } catch (error) {
          logger.error('OIDC strategy error', { error: error.message, profile });
          return done(error, null);
        }
      }));

      logger.info('OIDC strategy configured');
    }

    // SAML Strategy
    if (env.SAML_ENTRY_POINT && env.SAML_ISSUER && env.SAML_CERT) {
      passport.use('saml', new SamlStrategy({
        entryPoint: env.SAML_ENTRY_POINT,
        issuer: env.SAML_ISSUER,
        callbackUrl: env.SAML_CALLBACK_URL,
        cert: env.SAML_CERT,
        signatureAlgorithm: 'sha256',
      }, async (profile, done) => {
        try {
          const callbackData: SSOCallbackData = {
            provider: 'saml',
            profile: {
              id: profile.nameID || profile.id,
              email: profile.email || profile.mail || profile.emailAddress,
              name: profile.displayName || profile.name || `${profile.firstName} ${profile.lastName}`.trim(),
              department: profile.department,
              roles: profile.roles || [],
              groups: profile.groups || [],
            },
            raw: profile,
          };

          return done(null, callbackData);
        } catch (error) {
          logger.error('SAML strategy error', { error: error.message, profile });
          return done(error, null);
        }
      }));

      logger.info('SAML strategy configured');
    }

    // Serialize/deserialize user for session
    passport.serializeUser((user: any, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: any, done) => {
      done(null, user);
    });
  }

  /**
   * Initialize Passport middleware
   */
  initialize() {
    return passport.initialize();
  }

  /**
   * Initialize Passport session middleware
   */
  session() {
    return passport.session();
  }

  /**
   * OIDC authentication middleware
   */
  authenticateOIDC() {
    return passport.authenticate('oidc', {
      scope: 'openid profile email',
    });
  }

  /**
   * SAML authentication middleware
   */
  authenticateSAML() {
    return passport.authenticate('saml');
  }

  /**
   * Handle SSO callback
   */
  handleCallback(provider: 'oidc' | 'saml') {
    return async (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(provider, async (err: any, callbackData: SSOCallbackData) => {
        if (err) {
          logger.error('SSO callback error', { error: err.message, provider });
          return res.redirect(`${env.FRONTEND_URL}/login?error=sso_error`);
        }

        if (!callbackData) {
          logger.warn('No callback data received', { provider });
          return res.redirect(`${env.FRONTEND_URL}/login?error=no_data`);
        }

        try {
          const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
          const userAgent = req.get('User-Agent') || 'unknown';

          const authResult = await this.authService.processSSOCallback(
            callbackData,
            ipAddress,
            userAgent
          );

          if (authResult.success && authResult.user && authResult.token) {
            // Set secure cookie with JWT token
            res.cookie('auth_token', authResult.token, {
              httpOnly: true,
              secure: env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: authResult.expiresIn ? authResult.expiresIn * 1000 : 24 * 60 * 60 * 1000,
            });

            // Redirect to frontend dashboard
            const returnUrl = req.session?.returnUrl || `${env.FRONTEND_URL}/dashboard`;
            delete req.session?.returnUrl;
            
            return res.redirect(returnUrl);
          } else {
            logger.warn('Authentication failed', { 
              error: authResult.error,
              email: callbackData.profile.email,
              provider 
            });
            return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
          }
        } catch (error) {
          logger.error('Callback processing error', { 
            error: error.message,
            provider,
            email: callbackData.profile.email 
          });
          return res.redirect(`${env.FRONTEND_URL}/login?error=processing_error`);
        }
      })(req, res, next);
    };
  }

  /**
   * Require authentication middleware
   */
  requireAuth(options: AuthMiddlewareOptions = { required: true }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get token from cookie or Authorization header
        let token = req.cookies?.auth_token;
        
        if (!token) {
          const authHeader = req.get('Authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }

        if (!token) {
          if (options.allowAnonymous) {
            return next();
          }
          
          if (options.redirectOnFailure) {
            req.session!.returnUrl = req.originalUrl;
            return res.redirect(options.redirectOnFailure);
          }
          
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
          });
        }

        // Validate token
        const tokenResult = await this.authService.validateToken(token);
        
        if (!tokenResult.valid) {
          if (tokenResult.expired) {
            res.clearCookie('auth_token');
            
            if (options.redirectOnFailure) {
              req.session!.returnUrl = req.originalUrl;
              return res.redirect(options.redirectOnFailure);
            }
            
            return res.status(401).json({
              success: false,
              error: 'Token expired',
            });
          }
          
          return res.status(401).json({
            success: false,
            error: 'Invalid token',
          });
        }

        // Get session data
        const session = await this.authService.getSession(tokenResult.payload!.sub);
        
        if (!session) {
          res.clearCookie('auth_token');
          
          if (options.redirectOnFailure) {
            req.session!.returnUrl = req.originalUrl;
            return res.redirect(options.redirectOnFailure);
          }
          
          return res.status(401).json({
            success: false,
            error: 'Session not found',
          });
        }

        // Set user in request
        req.user = {
          id: session.userId,
          email: session.email,
          name: session.name,
          roles: session.roles,
          permissions: session.permissions,
        };

        // Check role requirements
        if (options.roles && options.roles.length > 0) {
          const hasRequiredRole = options.roles.some(role => session.roles.includes(role));
          if (!hasRequiredRole) {
            return res.status(403).json({
              success: false,
              error: 'Insufficient permissions',
              required: options.roles,
            });
          }
        }

        // Check permission requirements
        if (options.permissions && options.permissions.length > 0) {
          const hasRequiredPermission = options.permissions.some(permission => 
            session.permissions.includes(permission)
          );
          if (!hasRequiredPermission) {
            return res.status(403).json({
              success: false,
              error: 'Insufficient permissions',
              required: options.permissions,
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Auth middleware error', { 
          error: error.message,
          url: req.originalUrl,
          method: req.method 
        });
        
        return res.status(500).json({
          success: false,
          error: 'Authentication error',
        });
      }
    };
  }

  /**
   * Require admin role middleware
   */
  requireAdmin() {
    return this.requireAuth({
      required: true,
      roles: ['ADMIN'],
    });
  }

  /**
   * Logout middleware
   */
  logout() {
    return async (req: Request, res: Response) => {
      try {
        if (req.user) {
          const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
          const userAgent = req.get('User-Agent') || 'unknown';
          
          await this.authService.invalidateSession(req.user.id, ipAddress, userAgent);
        }

        res.clearCookie('auth_token');
        req.logout(() => {
          res.json({
            success: true,
            message: 'Logged out successfully',
          });
        });
      } catch (error) {
        logger.error('Logout error', { error: error.message });
        res.status(500).json({
          success: false,
          error: 'Logout failed',
        });
      }
    };
  }
}