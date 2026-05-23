const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const MongoSanitize = require('express-mongo-sanitize');
const SecurityService = require('../services/securityService');
const prisma = require('../lib/prisma');

class SecurityMiddleware {
  
  // Initialize all security middleware
  static initializeAll(app) {
    // Security headers with helmet
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true
      }
    }));

    // Additional security headers from SecurityService
    app.use((req, res, next) => {
      const securityService = require('../services/securityService');
      const headers = securityService.constructor.getSecurityHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      next();
    });

    // Input sanitization
    app.use(MongoSanitize({
      replaceWith: '_'
    }));

    // Global rate limiting
    app.use(this.createGlobalRateLimit());

    // Slow down middleware for repeated requests
    app.use(this.createSlowDownMiddleware());

    // IP security check middleware
    app.use(this.ipSecurityCheck());

    // Anomaly detection middleware
    app.use(this.anomalyDetection());
  }

  // Global rate limiter
  static createGlobalRateLimit() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes (reduced from 15)
      max: 2000, // limit each IP to 2000 requests per windowMs (increased from 1000)
      message: {
        error: 'Too many requests from this IP, please try again later.',
        resetTime: new Date(Date.now() + 10 * 60 * 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: ['loopback', 'linklocal', 'uniquelocal'], // Fix trust proxy configuration
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health' || req.path === '/health';
      }
    });
  }

  // Slow down middleware for progressive delays
  static createSlowDownMiddleware() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100, // allow 100 requests per 15 minutes without delay
      delayMs: () => 500, // Fixed: function that returns delay in ms
      maxDelayMs: 10000, // max delay of 10 seconds
      validate: { delayMs: false }, // Disable deprecation warning
      skip: (req) => {
        // Skip for health checks and static assets
        return req.path === '/api/health' || 
               req.path === '/health' || 
               req.path.startsWith('/static/');
      }
    });
  }

  // IP security check middleware
  static ipSecurityCheck() {
    return async (req, res, next) => {
      try {
        const clientIP = req.ip;
        const userId = req.user?.userId;

        // Check IP security
        const securityService = require('../services/securityService');
        const securityCheck = await securityService.checkIPSecurity(clientIP, userId);
        
        if (!securityCheck.allowed) {
          // Log security event
          await securityService.logSecurityEvent(
            'IP_BLOCKED',
            { 
              ip: clientIP, 
              reason: securityCheck.reason,
              risk: securityCheck.risk 
            },
            userId,
            req
          );

          return res.status(403).json({
            success: false,
            message: 'Access denied',
            reason: 'IP address blocked'
          });
        }

        // Add security info to request for downstream use
        req.securityInfo = {
          ip: clientIP,
          risk: securityCheck.risk
        };

        next();
      } catch (error) {
        console.error('IP security check error:', error);
        // Continue on error to avoid breaking the application
        next();
      }
    };
  }

  // Anomaly detection middleware
  static anomalyDetection() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.userId;
        
        // Only run anomaly detection for authenticated users
        if (userId) {
          const securityService = require('../services/securityService');
          const anomalies = await securityService.detectAnomalies(userId, req);
          
          if (anomalies.anomalies && anomalies.anomalies.length > 0) {
            // Log anomalies for review
            await securityService.logSecurityEvent(
              'ANOMALY_DETECTED',
              { 
                anomalies: anomalies.anomalies,
                userId 
              },
              userId,
              req
            );

            // Add anomaly info to request
            req.anomalies = anomalies.anomalies;
          }
        }

        next();
      } catch (error) {
        console.error('Anomaly detection error:', error);
        // Continue on error
        next();
      }
    };
  }

  // CSRF protection middleware factory
  static createCSRFProtection() {
    return (req, res, next) => {
      // Skip CSRF for GET requests and certain endpoints
      if (req.method === 'GET' || 
          req.path === '/api/auth/login' ||
          req.path === '/api/auth/register' ||
          req.path.startsWith('/api/auth/2fa/verify')) {
        return next();
      }

      const sessionToken = req.session?.csrfToken;
      const requestToken = req.headers['x-csrf-token'] || req.body._token;

      const securityService = require('../services/securityService');
      if (!securityService.constructor.validateCSRFToken(sessionToken, requestToken)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid CSRF token'
        });
      }

      next();
    };
  }

  // Session integrity check middleware
  static sessionIntegrityCheck() {
    return (req, res, next) => {
      if (req.user && req.session) {
        const securityService = require('../services/securityService');
        const isValid = securityService.constructor.validateSessionIntegrity(
          req.session,
          req.get('User-Agent'),
          req.ip
        );

        if (!isValid) {
          // Destroy compromised session
          req.session.destroy();
          return res.status(401).json({
            success: false,
            message: 'Session integrity check failed. Please log in again.'
          });
        }
      }
      next();
    };
  }

  // Device fingerprinting middleware
  static deviceFingerprinting() {
    return (req, res, next) => {
      // Generate device fingerprint
      const securityService = require('../services/securityService');
      const fingerprint = securityService.constructor.generateDeviceFingerprint(req);
      req.deviceFingerprint = fingerprint;
      
      // Store in session for tracking
      if (req.session) {
        req.session.deviceFingerprint = fingerprint;
      }
      
      next();
    };
  }

  // Endpoint-specific rate limiters
  static createEndpointRateLimiters() {
    return {
      // Beta testing friendly rate limiting for auth endpoints
      auth: rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15)
        max: 20, // 20 attempts per window (increased from 5)
        message: {
          error: 'Too many authentication attempts, please try again in 5 minutes.',
          resetTime: new Date(Date.now() + 5 * 60 * 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        trustProxy: ['loopback', 'linklocal', 'uniquelocal']
      }),

      // Moderate rate limiting for API endpoints
      api: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute
        message: {
          error: 'Rate limit exceeded for API endpoints.',
          resetTime: new Date(Date.now() + 1 * 60 * 1000)
        },
        trustProxy: ['loopback', 'linklocal', 'uniquelocal']
      }),

      // Strict rate limiting for password reset
      passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset attempts per hour
        message: {
          error: 'Too many password reset attempts, please try again later.'
        },
        trustProxy: ['loopback', 'linklocal', 'uniquelocal']
      })
    };
  }

  // Generate CSRF token endpoint
  static csrfTokenEndpoint() {
    return (req, res) => {
      const securityService = require('../services/securityService');
      const token = securityService.constructor.generateCSRFToken();
      
      // Store in session
      if (req.session) {
        req.session.csrfToken = token;
      }

      res.json({
        success: true,
        csrfToken: token
      });
    };
  }

  // Security audit endpoint (admin only)
  static securityAuditEndpoint() {
    return async (req, res) => {
      try {
        // Check if user is admin
        if (req.user?.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Admin access required'
          });
        }

        const { eventType, limit = 50, offset = 0 } = req.query;
        
        const auditLogs = await prisma.securityAudit.findMany({
          where: eventType ? { eventType } : {},
          orderBy: { timestamp: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        });

        res.json({
          success: true,
          data: auditLogs,
          total: auditLogs.length
        });

      } catch (error) {
        console.error('Security audit error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    };
  }
}

module.exports = SecurityMiddleware;