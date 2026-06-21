const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const AuthUtils = require('../lib/authUtils');
const { getTokenFromRequest } = require('../lib/authCookies');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

// Enhanced authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT
    const decoded = AuthUtils.verifyJWT(token);
    
    // Get user from database with security fields
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        loginAttempts: true,
        lockedUntil: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if account is locked
    if (AuthUtils.isAccountLocked(user)) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil
      });
    }

    // Check email verification for sensitive operations
    if (req.requireEmailVerification && !user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!rolesArray.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: rolesArray,
        current: userRole
      });
    }

    next();
  };
};

// Email verification required middleware
const requireEmailVerification = (req, res, next) => {
  req.requireEmailVerification = true;
  next();
};

// Admin only middleware
const requireAdmin = requireRole('ADMIN');

// Attorney or Admin middleware
const requireAttorneyOrAdmin = requireRole(['ATTORNEY', 'ADMIN']);

// Paralegal or higher middleware
const requireParalegalOrHigher = requireRole(['PARALEGAL', 'ATTORNEY', 'ADMIN']);

// Own resource or admin middleware (for accessing user's own data)
const requireOwnResourceOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const requestedUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    const currentUserId = req.user.userId;
    const userRole = req.user.role;

    // Admin can access any resource
    if (userRole === 'ADMIN') {
      return next();
    }

    // User can access their own resource
    if (requestedUserId === currentUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Can only access own resources',
      code: 'RESOURCE_ACCESS_DENIED'
    });
  };
};

// Case access middleware (user must be assigned to case or be admin)
const requireCaseAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const caseId = req.params.caseId || req.body.caseId || req.query.caseId;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admin can access any case
    if (userRole === 'ADMIN') {
      return next();
    }

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: 'Case ID required',
        code: 'CASE_ID_REQUIRED'
      });
    }

    // Check if user is assigned to the case
    const caseAccess = await prisma.case.findFirst({
      where: {
        id: caseId,
        OR: [
          { attorneyId: userId },
          { paralegalId: userId },
          // Attorney can access cases from their paralegals
          ...(userRole === 'ATTORNEY' ? [{
            paralegal: {
              assignedCases: {
                some: { attorneyId: userId }
              }
            }
          }] : [])
        ]
      }
    });

    if (!caseAccess) {
      return res.status(403).json({
        success: false,
        message: 'No access to this case',
        code: 'CASE_ACCESS_DENIED'
      });
    }

    req.caseId = caseId;
    next();
  } catch (error) {
    console.error('Case access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking case access',
      code: 'CASE_ACCESS_ERROR'
    });
  }
};

// Client access middleware
const requireClientAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const clientId = req.params.clientId || req.body.clientId || req.query.clientId;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admin can access any client
    if (userRole === 'ADMIN') {
      return next();
    }

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID required',
        code: 'CLIENT_ID_REQUIRED'
      });
    }

    // Check if user has access to client through cases
    const clientAccess = await prisma.client.findFirst({
      where: {
        id: clientId,
        cases: {
          some: {
            OR: [
              { attorneyId: userId },
              { paralegalId: userId }
            ]
          }
        }
      }
    });

    if (!clientAccess) {
      return res.status(403).json({
        success: false,
        message: 'No access to this client',
        code: 'CLIENT_ACCESS_DENIED'
      });
    }

    req.clientId = clientId;
    next();
  } catch (error) {
    console.error('Client access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking client access',
      code: 'CLIENT_ACCESS_ERROR'
    });
  }
};

// Activity logging middleware
const logActivity = (action, entityType = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const clientInfo = AuthUtils.extractClientInfo(req);
        
        prisma.activity.create({
          data: {
            id: AuthUtils.generateToken(16),
            action: action || req.method,
            description: `${req.method} ${req.originalUrl}`,
            entityType: entityType || 'API',
            entityId: req.params.id || req.body.id || 'unknown',
            userId: req.user.userId,
            ipAddress: clientInfo.ip,
            userAgent: clientInfo.userAgent
          }
        }).catch(error => {
          console.error('Activity logging error:', error);
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireEmailVerification,
  requireAdmin,
  requireAttorneyOrAdmin,
  requireParalegalOrHigher,
  requireOwnResourceOrAdmin,
  requireCaseAccess,
  requireClientAccess,
  logActivity
};