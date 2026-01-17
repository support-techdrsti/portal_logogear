import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';
import { env } from '../config/environment';
import { AuditService } from '../services/audit.service';

export class SecurityMiddleware {
  private static auditService = new AuditService();

  /**
   * Rate limiting middleware
   */
  static rateLimit(options?: {
    windowMs?: number;
    max?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
  }) {
    return rateLimit({
      windowMs: options?.windowMs || env.RATE_LIMIT_WINDOW_MS,
      max: options?.max || env.RATE_LIMIT_MAX_REQUESTS,
      message: {
        success: false,
        error: 'Too Many Requests',
        message: options?.message || 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
        });

        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: options?.message || 'Too many requests from this IP, please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date(),
        });
      },
    });
  }

  /**
   * Strict rate limiting for authentication endpoints
   */
  static authRateLimit() {
    return this.rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    });
  }

  /**
   * Rate limiting for file upload endpoints
   */
  static uploadRateLimit() {
    return this.rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 uploads per minute
      message: 'Too many file uploads, please try again later.',
    });
  }

  /**
   * Request logging middleware
   */
  static requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string || 
                       Math.random().toString(36).substring(2, 15);

      // Add request ID to headers
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);

      // Log request
      logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        contentLength: req.get('Content-Length'),
      });

      // Override res.json to log response
      const originalJson = res.json;
      res.json = function(body: any) {
        const duration = Date.now() - startTime;
        
        logger.info('Request completed', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userId: req.user?.id,
          success: body?.success !== false,
        });

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Security headers middleware
   */
  static securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // HSTS header for HTTPS
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }

      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  static sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize request body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      next();
    };
  }

  /**
   * Suspicious activity detection middleware
   */
  static suspiciousActivityDetection() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const suspiciousPatterns = [
          // SQL injection patterns
          /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
          // XSS patterns
          /(<script|javascript:|vbscript:|onload=|onerror=)/i,
          // Path traversal patterns
          /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
          // Command injection patterns
          /(\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat)\b)/i,
        ];

        const requestString = JSON.stringify({
          url: req.originalUrl,
          query: req.query,
          body: req.body,
          headers: req.headers,
        });

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

        if (isSuspicious) {
          logger.warn('Suspicious activity detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            userId: req.user?.id,
            requestData: {
              query: req.query,
              body: req.body,
            },
          });

          // Log to audit trail
          if (req.user) {
            await this.auditService.createAuditLog({
              userId: req.user.id,
              eventType: 'LOGIN_FAILURE', // Using as generic security event
              details: {
                type: 'suspicious_activity',
                url: req.originalUrl,
                method: req.method,
                patterns: suspiciousPatterns.map(p => p.source),
              },
              ipAddress: req.ip || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
            });
          }

          // Block the request
          return res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'Request contains suspicious content',
            code: 'SUSPICIOUS_CONTENT',
            timestamp: new Date(),
          });
        }

        next();
      } catch (error) {
        logger.error('Suspicious activity detection error', {
          error: error.message,
          url: req.originalUrl,
        });
        next(); // Continue processing even if detection fails
      }
    };
  }

  /**
   * Failed login attempt tracking
   */
  static trackFailedLogins() {
    const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || 'unknown';
      const now = new Date();

      // Check if this is a failed login response
      const originalJson = res.json;
      res.json = function(body: any) {
        if (req.originalUrl.includes('/auth/') && body?.success === false) {
          const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: now };
          
          // Reset count if last attempt was more than 1 hour ago
          if (now.getTime() - attempts.lastAttempt.getTime() > 60 * 60 * 1000) {
            attempts.count = 0;
          }

          attempts.count++;
          attempts.lastAttempt = now;
          failedAttempts.set(ip, attempts);

          // Log excessive failed attempts
          if (attempts.count >= 5) {
            logger.warn('Excessive failed login attempts', {
              ip,
              attempts: attempts.count,
              userAgent: req.get('User-Agent'),
              url: req.originalUrl,
            });

            // Could implement IP blocking here
            if (attempts.count >= 10) {
              logger.error('IP blocked due to excessive failed attempts', {
                ip,
                attempts: attempts.count,
              });
            }
          }
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Sanitize object recursively
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input
   */
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    return str
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit length
      .substring(0, 10000);
  }
}