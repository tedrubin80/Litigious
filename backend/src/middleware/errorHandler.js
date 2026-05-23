const APIResponse = require('../lib/apiResponse');
const SecurityService = require('../services/securityService');

class APIError extends Error {
  constructor(message, statusCode = 500, errors = null, metadata = {}) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.metadata = metadata;
    this.isOperational = true;
  }
}

class ErrorHandler {
  
  static createError(message, statusCode = 500, errors = null, metadata = {}) {
    return new APIError(message, statusCode, errors, metadata);
  }

  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static globalErrorHandler() {
    return async (err, req, res, next) => {
      let error = { ...err };
      error.message = err.message;

      console.error('API Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.userId || 'anonymous'
      });

      // Log security events for certain error types
      if (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 429) {
        try {
          const securityService = require('../services/securityService');
          await securityService.logSecurityEvent(
            'API_ERROR',
            {
              statusCode: err.statusCode,
              message: err.message,
              url: req.url,
              method: req.method
            },
            req.user?.userId,
            req
          );
        } catch (logError) {
          console.error('Failed to log security event:', logError);
        }
      }

      // Mongoose/Prisma validation errors
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => ({
          field: val.path,
          message: val.message
        }));
        error = APIResponse.validationError(errors);
        return res.status(400).json(error);
      }

      // Mongoose/Prisma duplicate key error
      if (err.code === 11000 || err.code === 'P2002') {
        const duplicateFields = err.keyValue ? Object.keys(err.keyValue) : [];
        const message = `Duplicate value for: ${duplicateFields.join(', ')}`;
        error = APIResponse.conflict(message);
        return res.status(409).json(error);
      }

      // Mongoose/Prisma cast error
      if (err.name === 'CastError' || err.code === 'P2025') {
        error = APIResponse.notFound('Resource');
        return res.status(404).json(error);
      }

      // JWT errors
      if (err.name === 'JsonWebTokenError') {
        error = APIResponse.unauthorized('Invalid token');
        return res.status(401).json(error);
      }

      if (err.name === 'TokenExpiredError') {
        error = APIResponse.unauthorized('Token expired');
        return res.status(401).json(error);
      }

      // Prisma specific errors
      if (err.code && err.code.startsWith('P')) {
        switch (err.code) {
          case 'P2001':
            error = APIResponse.notFound('Record');
            return res.status(404).json(error);
          case 'P2003':
            error = APIResponse.error('Foreign key constraint violation', 400);
            return res.status(400).json(error);
          case 'P2016':
            error = APIResponse.error('Query interpretation error', 400);
            return res.status(400).json(error);
          case 'P2021':
            error = APIResponse.error('Table does not exist', 500);
            return res.status(500).json(error);
          default:
            error = APIResponse.error('Database error occurred', 500);
            return res.status(500).json(error);
        }
      }

      // Rate limiting errors
      if (err.statusCode === 429) {
        error = APIResponse.tooManyRequests(err.message, err.retryAfter);
        return res.status(429).json(error);
      }

      // Custom API errors
      if (err.isOperational) {
        const response = APIResponse.error(
          err.message,
          err.statusCode,
          err.errors,
          err.metadata
        );
        return res.status(err.statusCode).json(response);
      }

      // Default error response
      const isDev = process.env.NODE_ENV === 'development';
      const response = APIResponse.error(
        isDev ? err.message : 'Internal server error',
        500,
        isDev ? { stack: err.stack } : null,
        { type: 'INTERNAL_ERROR' }
      );

      res.status(500).json(response);
    };
  }

  static notFoundHandler() {
    return (req, res) => {
      const error = APIResponse.notFound(`Endpoint '${req.method} ${req.path}'`);
      res.status(404).json(error);
    };
  }

  static validationErrorHandler(validationResult) {
    return (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value
        }));
        const response = APIResponse.validationError(formattedErrors);
        return res.status(400).json(response);
      }
      next();
    };
  }

  static requireAuth(req, res, next) {
    if (!req.user) {
      const error = APIResponse.unauthorized('Authentication required');
      return res.status(401).json(error);
    }
    next();
  }

  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        const error = APIResponse.unauthorized('Authentication required');
        return res.status(401).json(error);
      }

      const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      const hasRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        const error = APIResponse.forbidden(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
        return res.status(403).json(error);
      }
      
      next();
    };
  }

  static requireOwnership(getResourceUserId) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          const error = APIResponse.unauthorized('Authentication required');
          return res.status(401).json(error);
        }

        const resourceUserId = await getResourceUserId(req);
        
        if (resourceUserId !== userId && !['ADMIN', 'ATTORNEY'].includes(req.user.role)) {
          const error = APIResponse.forbidden('Access denied. You can only access your own resources.');
          return res.status(403).json(error);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = { ErrorHandler, APIError };