// Error handling utilities for consistent error management across the application

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

// Common error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error messages for user display
export const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect to the server. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action. Please log in.',
  FORBIDDEN: 'Access denied. You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER: 'An internal server error occurred. Please try again later.',
  VALIDATION: 'Please correct the highlighted fields and try again.',
  GENERIC: 'An unexpected error occurred. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.'
};

// Parse API errors and return user-friendly messages
export const parseApiError = (error) => {
  // Network error
  if (!error.response) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: ERROR_MESSAGES.NETWORK,
      originalError: error
    };
  }

  const { status, data } = error.response;

  // Handle different HTTP status codes
  switch (status) {
    case 400:
      if (data?.errors && typeof data.errors === 'object') {
        // Validation errors from backend
        return {
          type: ERROR_TYPES.VALIDATION,
          message: ERROR_MESSAGES.VALIDATION,
          validationErrors: data.errors,
          originalError: error
        };
      }
      return {
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || ERROR_MESSAGES.VALIDATION,
        originalError: error
      };

    case 401:
      return {
        type: ERROR_TYPES.AUTHENTICATION,
        message: data?.message || ERROR_MESSAGES.UNAUTHORIZED,
        originalError: error
      };

    case 403:
      return {
        type: ERROR_TYPES.AUTHORIZATION,
        message: data?.message || ERROR_MESSAGES.FORBIDDEN,
        originalError: error
      };

    case 404:
      return {
        type: ERROR_TYPES.NOT_FOUND,
        message: data?.message || ERROR_MESSAGES.NOT_FOUND,
        originalError: error
      };

    case 408:
      return {
        type: ERROR_TYPES.TIMEOUT,
        message: ERROR_MESSAGES.TIMEOUT,
        originalError: error
      };

    case 422:
      if (data?.errors && typeof data.errors === 'object') {
        return {
          type: ERROR_TYPES.VALIDATION,
          message: ERROR_MESSAGES.VALIDATION,
          validationErrors: data.errors,
          originalError: error
        };
      }
      return {
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || ERROR_MESSAGES.VALIDATION,
        originalError: error
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: ERROR_TYPES.SERVER,
        message: ERROR_MESSAGES.SERVER,
        originalError: error
      };

    default:
      return {
        type: ERROR_TYPES.UNKNOWN,
        message: data?.message || ERROR_MESSAGES.GENERIC,
        originalError: error
      };
  }
};

// Format validation errors for form display
export const formatValidationErrors = (validationErrors) => {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return {};
  }

  const formattedErrors = {};
  
  Object.keys(validationErrors).forEach(field => {
    const error = validationErrors[field];
    
    if (Array.isArray(error)) {
      // Handle array of error messages
      formattedErrors[field] = error.join(', ');
    } else if (typeof error === 'string') {
      // Handle string error message
      formattedErrors[field] = error;
    } else if (error && typeof error === 'object' && error.message) {
      // Handle error object with message property
      formattedErrors[field] = error.message;
    }
  });

  return formattedErrors;
};

// Enhanced error logger
export const logError = (error, context = {}) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: context.userId || 'anonymous'
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Log');
    console.error('Error:', error);
    console.table(context);
    console.groupEnd();
  }

  // In production, you might want to send this to a logging service
  // Example: sendToLoggingService(errorInfo);
  
  return errorInfo;
};

// Generic error boundary error handler
export const handleErrorBoundary = (error, errorInfo) => {
  console.error('🚨 ERROR BOUNDARY CAUGHT ERROR:');
  console.error('Error:', error);
  console.error('Error Info:', errorInfo);
  console.error('Component Stack:', errorInfo.componentStack);
  
  const context = {
    component: 'ErrorBoundary',
    errorBoundary: true,
    componentStack: errorInfo.componentStack
  };

  logError(error, context);

  // You might want to report this to an error tracking service
  // Example: reportError(error, context);
};

// Async operation error handler with retry logic
export const withErrorHandling = (asyncFn, retries = 0, delay = 1000) => {
  return async (...args) => {
    let attempt = 0;
    
    while (attempt <= retries) {
      try {
        return await asyncFn(...args);
      } catch (error) {
        const parsedError = parseApiError(error);
        
        attempt++;
        
        if (attempt <= retries && 
            (parsedError.type === ERROR_TYPES.NETWORK || 
             parsedError.type === ERROR_TYPES.TIMEOUT)) {
          
          console.warn(`Retrying operation, attempt ${attempt}/${retries + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
        
        logError(error, { 
          attempts: attempt,
          function: asyncFn.name,
          args: args.length > 0 ? `${args.length} arguments` : 'no arguments'
        });
        
        throw parsedError;
      }
    }
  };
};

// Toast notification helper for errors
export const showErrorToast = (error, toastFunction) => {
  const parsedError = parseApiError(error);
  
  if (toastFunction) {
    toastFunction(parsedError.message, {
      type: 'error',
      duration: parsedError.type === ERROR_TYPES.NETWORK ? 5000 : 4000
    });
  }
  
  return parsedError;
};

// Form error handler
export const handleFormError = (error, setErrors, setGeneralError = null) => {
  const parsedError = parseApiError(error);
  
  if (parsedError.validationErrors) {
    const formattedErrors = formatValidationErrors(parsedError.validationErrors);
    setErrors(formattedErrors);
  } else {
    // Set general error if no specific field errors
    if (setGeneralError) {
      setGeneralError(parsedError.message);
    } else {
      setErrors({ general: parsedError.message });
    }
  }
  
  logError(error, { context: 'form_submission' });
  return parsedError;
};

// API request wrapper with consistent error handling
export const apiRequest = async (requestFn, options = {}) => {
  const { 
    retries = 1, 
    timeout = 10000, 
    showLoading = true,
    context = {} 
  } = options;

  try {
    if (showLoading && window.setGlobalLoading) {
      window.setGlobalLoading(true);
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    );

    const result = await Promise.race([
      withErrorHandling(requestFn, retries)(),
      timeoutPromise
    ]);

    return result;
  } catch (error) {
    const parsedError = parseApiError(error);
    logError(error, { ...context, apiRequest: true });
    throw parsedError;
  } finally {
    if (showLoading && window.setGlobalLoading) {
      window.setGlobalLoading(false);
    }
  }
};

// Session management error handler
export const handleSessionError = (error, logout) => {
  const parsedError = parseApiError(error);
  
  if (parsedError.type === ERROR_TYPES.AUTHENTICATION || 
      error.response?.status === 401) {
    
    // Clear any stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login
    if (logout && typeof logout === 'function') {
      logout();
    } else {
      window.location.href = '/admin/login';
    }
    
    return {
      ...parsedError,
      message: ERROR_MESSAGES.SESSION_EXPIRED
    };
  }
  
  return parsedError;
};

// Development helper to simulate errors
export const simulateError = (type = 'generic', delay = 0) => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('simulateError should only be used in development');
    return;
  }
  
  setTimeout(() => {
    switch (type) {
      case 'network':
        throw new AppError(ERROR_MESSAGES.NETWORK, 0, ERROR_TYPES.NETWORK);
      case 'validation':
        throw new AppError(ERROR_MESSAGES.VALIDATION, 400, ERROR_TYPES.VALIDATION);
      case 'auth':
        throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, 401, ERROR_TYPES.AUTHENTICATION);
      case 'server':
        throw new AppError(ERROR_MESSAGES.SERVER, 500, ERROR_TYPES.SERVER);
      default:
        throw new Error(ERROR_MESSAGES.GENERIC);
    }
  }, delay);
};