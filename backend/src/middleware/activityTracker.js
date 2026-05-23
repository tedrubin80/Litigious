const { activityTracker } = require('../services/ActivityTrackerService');

/**
 * Activity Tracking Middleware and Decorators
 * 
 * This middleware provides automatic activity tracking for API endpoints
 * without requiring changes to existing controller code.
 */

/**
 * Express middleware to automatically track API activities
 * 
 * Usage:
 * app.use('/api/documents', trackActivity('DOCUMENT'), documentRoutes);
 * app.use('/api/cases', trackActivity('CASE'), caseRoutes);
 */
function trackActivity(entityType, options = {}) {
  return (req, res, next) => {
    const originalSend = res.send;
    const startTime = new Date();
    
    // Override res.send to capture response
    res.send = function(body) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // minutes
      
      // Only track successful requests (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const activityType = determineActivityType(req.method, req.path, entityType);
        const { caseId, entityId } = extractEntityInfo(req, body);
        
        // Track the activity asynchronously
        setImmediate(() => {
          activityTracker.trackActivity({
            caseId,
            userId: req.user.id,
            activityType,
            action: generateActionDescription(req.method, req.path, entityType),
            entityType,
            entityId: entityId || caseId,
            metadata: extractMetadata(req, res, body),
            duration: Math.max(1, duration), // Minimum 1 minute
            request: req
          }).catch(error => {
            console.error('Activity tracking failed:', error);
          });
        });
      }
      
      // Call original send
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Determine activity type based on HTTP method and path
 */
function determineActivityType(method, path, entityType) {
  const pathLower = path.toLowerCase();
  
  // Document activities
  if (entityType === 'DOCUMENT' || pathLower.includes('document')) {
    if (method === 'POST' && pathLower.includes('upload')) return 'DOCUMENT_UPLOAD';
    if (method === 'GET' && pathLower.includes('download')) return 'DOCUMENT_DOWNLOAD';
    if (method === 'GET') return 'DOCUMENT_VIEW';
    if (method === 'PUT' || method === 'PATCH') return 'DOCUMENT_EDIT';
    if (method === 'POST') return 'DOCUMENT_UPLOAD';
  }
  
  // Case activities
  if (entityType === 'CASE' || pathLower.includes('case')) {
    if (method === 'POST') return 'CASE_CREATED';
    if (method === 'PUT' || method === 'PATCH') {
      if (pathLower.includes('status')) return 'CASE_STATUS_CHANGED';
      return 'CASE_UPDATED';
    }
    if (method === 'GET') return 'CASE_VIEW';
  }
  
  // Communication activities
  if (entityType === 'COMMUNICATION' || pathLower.includes('email') || pathLower.includes('communication')) {
    if (method === 'POST' && pathLower.includes('email')) return 'EMAIL_SENT';
    if (method === 'POST') return 'CLIENT_MEETING';
    if (method === 'GET') return 'COMMUNICATION_VIEW';
  }
  
  // Video meeting activities
  if (pathLower.includes('meeting') || pathLower.includes('video')) {
    if (method === 'POST') return 'VIDEO_MEETING_CREATED';
    if (method === 'PUT' && pathLower.includes('join')) return 'VIDEO_MEETING_JOINED';
    if (method === 'PUT' && pathLower.includes('end')) return 'VIDEO_MEETING_ENDED';
  }
  
  // Task activities
  if (entityType === 'TASK' || pathLower.includes('task')) {
    if (method === 'POST') return 'TASK_CREATED';
    if (method === 'PUT' && pathLower.includes('complete')) return 'TASK_COMPLETED';
    if (method === 'PUT' || method === 'PATCH') return 'TASK_ASSIGNED';
  }
  
  // Time tracking activities
  if (pathLower.includes('time') || pathLower.includes('billing')) {
    if (method === 'POST') return 'TIME_ENTRY_CREATED';
  }
  
  // Default to system access
  return 'SYSTEM_ACCESS';
}

/**
 * Extract case ID and entity ID from request
 */
function extractEntityInfo(req, responseBody) {
  let caseId = null;
  let entityId = null;
  
  // Check URL parameters
  caseId = req.params.caseId || req.params.id;
  entityId = req.params.id;
  
  // Check request body
  if (req.body) {
    caseId = caseId || req.body.caseId || req.body.case_id;
    entityId = entityId || req.body.id;
  }
  
  // Check query parameters
  if (req.query) {
    caseId = caseId || req.query.caseId || req.query.case_id;
    entityId = entityId || req.query.id;
  }
  
  // Try to parse response body for IDs
  if (responseBody && typeof responseBody === 'string') {
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed.id) entityId = entityId || parsed.id;
      if (parsed.caseId) caseId = caseId || parsed.caseId;
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  return { caseId, entityId };
}

/**
 * Generate human-readable action description
 */
function generateActionDescription(method, path, entityType) {
  const pathSegments = path.split('/').filter(p => p && p !== 'api');
  const resource = pathSegments[0] || entityType.toLowerCase();
  
  const methodMap = {
    'GET': `View ${resource}`,
    'POST': `Create ${resource}`,
    'PUT': `Update ${resource}`,
    'PATCH': `Update ${resource}`,
    'DELETE': `Delete ${resource}`
  };
  
  return methodMap[method] || `${method} ${resource}`;
}

/**
 * Extract relevant metadata from request and response
 */
function extractMetadata(req, res, responseBody) {
  const metadata = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    userAgent: req.get('user-agent'),
    ip: req.ip
  };
  
  // Add file information for uploads
  if (req.file) {
    metadata.filename = req.file.originalname;
    metadata.fileSize = req.file.size;
    metadata.mimeType = req.file.mimetype;
  }
  
  if (req.files && req.files.length > 0) {
    metadata.files = req.files.map(f => ({
      filename: f.originalname,
      size: f.size,
      mimeType: f.mimetype
    }));
  }
  
  // Add relevant body parameters (excluding sensitive data)
  if (req.body) {
    const { password, token, ...safeBody } = req.body;
    if (Object.keys(safeBody).length > 0) {
      metadata.requestData = safeBody;
    }
  }
  
  // Add query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    metadata.queryParams = req.query;
  }
  
  return metadata;
}

/**
 * Manual activity tracking decorator for specific functions
 * 
 * Usage:
 * const trackedFunction = withActivityTracking(originalFunction, {
 *   activityType: 'LEGAL_RESEARCH',
 *   action: 'Research Case Law',
 *   extractCaseId: (args) => args[0].caseId
 * });
 */
function withActivityTracking(fn, options) {
  return async function(...args) {
    const startTime = new Date();
    
    try {
      const result = await fn.apply(this, args);
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
      
      // Extract tracking information
      const caseId = options.extractCaseId ? options.extractCaseId(args) : null;
      const userId = options.extractUserId ? options.extractUserId(args) : null;
      const metadata = options.extractMetadata ? options.extractMetadata(args, result) : {};
      
      if (userId) {
        // Track the activity
        setImmediate(() => {
          activityTracker.trackActivity({
            caseId,
            userId,
            activityType: options.activityType,
            action: options.action,
            description: options.description,
            entityType: options.entityType || 'CASE',
            entityId: options.extractEntityId ? options.extractEntityId(args, result) : null,
            metadata: { ...metadata, functionArgs: args.length },
            duration: Math.max(1, duration),
            isBillable: options.isBillable
          }).catch(error => {
            console.error('Function activity tracking failed:', error);
          });
        });
      }
      
      return result;
    } catch (error) {
      // Track failed attempts too
      if (options.trackFailures !== false && options.extractUserId) {
        const userId = options.extractUserId(args);
        if (userId) {
          setImmediate(() => {
            activityTracker.trackActivity({
              caseId: options.extractCaseId ? options.extractCaseId(args) : null,
              userId,
              activityType: options.activityType,
              action: `${options.action} (FAILED)`,
              description: `Failed: ${error.message}`,
              entityType: options.entityType || 'CASE',
              metadata: { error: error.message, functionArgs: args.length },
              duration: 1,
              isBillable: false
            }).catch(trackError => {
              console.error('Failed activity tracking failed:', trackError);
            });
          });
        }
      }
      
      throw error;
    }
  };
}

/**
 * Batch activity tracking for bulk operations
 */
async function trackBulkActivity(activities) {
  try {
    return await activityTracker.trackBulkActivities(activities);
  } catch (error) {
    console.error('Bulk activity tracking failed:', error);
    throw error;
  }
}

/**
 * Express middleware for time tracking active sessions
 */
function timeTrackingMiddleware() {
  return (req, res, next) => {
    if (req.user) {
      req.activityStartTime = new Date();
      
      // Track session start
      if (req.method === 'GET' && req.path.includes('dashboard')) {
        activityTracker.trackActivity({
          userId: req.user.id,
          activityType: 'SYSTEM_ACCESS',
          action: 'Dashboard Access',
          entityType: 'SYSTEM',
          entityId: 'dashboard',
          metadata: {
            path: req.path,
            method: req.method
          },
          duration: 1,
          isBillable: false,
          request: req
        }).catch(() => {}); // Ignore errors for system tracking
      }
    }
    
    next();
  };
}

module.exports = {
  trackActivity,
  withActivityTracking,
  trackBulkActivity,
  timeTrackingMiddleware,
  determineActivityType,
  extractEntityInfo,
  generateActionDescription
};