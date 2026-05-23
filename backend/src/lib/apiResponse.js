class APIResponse {
  
  static success(data = null, message = 'Success', metadata = {}) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    return response;
  }

  static error(message = 'An error occurred', statusCode = 500, errors = null, metadata = {}) {
    const response = {
      success: false,
      error: {
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
    
    if (errors) {
      response.error.details = errors;
    }
    
    return response;
  }

  static validationError(errors, message = 'Validation failed') {
    return this.error(message, 400, errors, { type: 'VALIDATION_ERROR' });
  }

  static notFound(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    return this.error(message, 404, null, { type: 'NOT_FOUND' });
  }

  static unauthorized(message = 'Authentication required') {
    return this.error(message, 401, null, { type: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'Access forbidden') {
    return this.error(message, 403, null, { type: 'FORBIDDEN' });
  }

  static conflict(message = 'Resource conflict', details = null) {
    return this.error(message, 409, details, { type: 'CONFLICT' });
  }

  static tooManyRequests(message = 'Too many requests', retryAfter = null) {
    const metadata = { type: 'RATE_LIMITED' };
    if (retryAfter) {
      metadata.retryAfter = retryAfter;
    }
    return this.error(message, 429, null, metadata);
  }

  static paginated(data, pagination, message = 'Success') {
    return this.success(data, message, {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        pages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
    });
  }

  static created(data, message = 'Resource created successfully') {
    return this.success(data, message, { statusCode: 201 });
  }

  static updated(data, message = 'Resource updated successfully') {
    return this.success(data, message, { statusCode: 200 });
  }

  static deleted(message = 'Resource deleted successfully') {
    return this.success(null, message, { statusCode: 200 });
  }
}

module.exports = APIResponse;