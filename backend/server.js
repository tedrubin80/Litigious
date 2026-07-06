const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const http = require('http');
const realtimeCollaborationService = require('./src/services/RealtimeCollaborationService');
const { initErrorTracking, registerErrorHandler } = require('./src/lib/errorTracking');
require('dotenv').config();

const app = express();
const Sentry = initErrorTracking(app);

// Trust proxy for Nginx reverse proxy - handles both HTTP and HTTPS
// Use 1 (not true) to trust exactly one proxy (nginx) — satisfies express-rate-limit's ERR_ERL_PERMISSIVE_TRUST_PROXY
app.set('trust proxy', 1);

// Protocol detection middleware for HTTP/HTTPS fallback
app.use((req, res, next) => {
  // Set secure headers for HTTPS when available
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Add protocol info to request for logging
  req.protocol_info = {
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    protocol: req.protocol,
    forwarded_proto: req.headers['x-forwarded-proto']
  };
  
  next();
});

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Import routes
const authUnifiedRoutes = require('./src/routes/auth-unified');
const settlementRoutes = require('./src/routes/settlements');
const aiDocumentRoutes = require('./src/routes/ai-documents');
const userRoutes = require('./src/routes/users');
const clientRoutes = require('./src/routes/clients');
const caseRoutes = require('./src/routes/cases');
const taskRoutes = require('./src/routes/tasks');
const documentRoutes = require('./src/routes/documents');
const dashboardRoutes = require('./src/routes/dashboard');
const aiGenerationRoutes = require('./src/routes/ai-generation');
const lexMachinaRoutes = require('./src/routes/lexmachina');
const advancedAnalyticsRoutes = require('./src/routes/advanced-analytics');
const collaborationRoutes = require('./src/routes/collaboration');
const zoomRoutes = require('./src/routes/zoom');
const webrtcRoutes = require('./src/routes/webrtcRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const apiV1Routes = require('./src/routes/api-v1');
const monitoringRoutes = require('./src/routes/monitoring');
const activitiesRoutes = require('./src/routes/activities');
const errorMonitor = require('./src/services/errorMonitor');
const AuthUtils = require('./src/lib/authUtils');
const SecurityMiddleware = require('./src/middleware/security');
const { createSecureStaticMiddleware } = require('./src/middleware/secureStatic');
const { authenticateToken, requireAdmin } = require('./src/middleware/auth');
const { httpsEnforcement, shouldEnforceHttps } = require('./src/middleware/httpsEnforcement');
const { createCorsOptions } = require('./src/config/cors');
const path = require('path');

app.use(httpsEnforcement);

// Session configuration - supports both HTTP and HTTPS for SSL fallback
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error('SESSION_SECRET environment variable is required');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: shouldEnforceHttps(),
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Initialize comprehensive security middleware
SecurityMiddleware.initializeAll(app);

if (process.env.METRICS_ENABLED === 'true') {
  const { metricsRouter, metricsMiddleware } = require('./src/routes/metrics');
  app.use(metricsMiddleware);

  const metricsAuth = (req, res, next) => {
    const token = process.env.METRICS_TOKEN;
    if (token && req.headers['x-metrics-token'] !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  app.use('/metrics', metricsAuth, metricsRouter);
  console.log('📊 Prometheus metrics enabled at /metrics');
}

// CORS configuration
app.use(cors(createCorsOptions()));

// Body parsing middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authenticated static file serving (uploads/recordings/streams are not public)
app.use('/uploads', ...createSecureStaticMiddleware(path.join(__dirname, 'uploads')));
app.use('/recordings', ...createSecureStaticMiddleware(process.env.RECORDINGS_PATH || '/var/www/html/recordings', { requireAdmin: true }));
app.use('/streams', ...createSecureStaticMiddleware(process.env.STREAMS_PATH || '/var/www/html/streams', { requireAdmin: true }));

// Request logging middleware with protocol info
app.use((req, res, next) => {
  const protocol = req.protocol_info?.secure ? 'HTTPS' : 'HTTP';
  console.log(`${new Date().toISOString()} - ${protocol} ${req.method} ${req.path}`);
  next();
});

// API Documentation with Swagger UI (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LegalEstate API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Security endpoints
app.get('/api/csrf-token', SecurityMiddleware.csrfTokenEndpoint());
app.get('/api/security/audit', authenticateToken, requireAdmin, SecurityMiddleware.securityAuditEndpoint());

// CSRF protection for non-API cookie/session requests
app.use((req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer ') || req.path.startsWith('/api/')) {
    return next();
  }
  return SecurityMiddleware.createCSRFProtection()(req, res, next);
});

// Routes with endpoint-specific rate limiting
const endpointLimiters = SecurityMiddleware.createEndpointRateLimiters();

// API v1 - Comprehensive RESTful API with error handling
app.use('/api/v1', endpointLimiters.api, apiV1Routes);

// Authentication routes (unified)
app.use('/api/auth', endpointLimiters.auth, authUnifiedRoutes);
app.use('/api/auth-v2', endpointLimiters.auth, (req, res, next) => {
  res.set('Deprecation', 'true');
  req.url = `/v2${req.url}`;
  authUnifiedRoutes(req, res, next);
});

// Admin routes
const adminAiRoutes = require('./src/routes/admin-ai');
app.use('/api/admin', endpointLimiters.api, adminAiRoutes);
app.use('/api/settlements', endpointLimiters.api, settlementRoutes);
app.use('/api/ai-documents', endpointLimiters.api, aiDocumentRoutes);
app.use('/api/users', endpointLimiters.api, userRoutes);
app.use('/api/clients', endpointLimiters.api, clientRoutes);
app.use('/api/cases', endpointLimiters.api, caseRoutes);
app.use('/api/tasks', endpointLimiters.api, taskRoutes);
app.use('/api/documents', endpointLimiters.api, documentRoutes);
app.use('/api/dashboard', endpointLimiters.api, dashboardRoutes);
app.use('/api/ai', endpointLimiters.api, aiGenerationRoutes);
app.use('/api/lexmachina', endpointLimiters.api, lexMachinaRoutes);
app.use('/api/analytics', endpointLimiters.api, advancedAnalyticsRoutes);
app.use('/api/collaboration', endpointLimiters.api, collaborationRoutes);
app.use('/api/zoom', endpointLimiters.api, zoomRoutes);
app.use('/api/webrtc', endpointLimiters.api, webrtcRoutes);
app.use('/api/activities', endpointLimiters.api, activitiesRoutes);
app.use('/api/monitoring', endpointLimiters.api, monitoringRoutes);

// Meeting room direct access routes (should be after API routes but before catch-all)
app.use('/', meetingRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Legal Estate Backend API',
    status: 'running',
    version: '1.0.0',
    security: {
      features: ['2FA', 'Rate Limiting', 'CSRF Protection', 'Security Headers', 'IP Filtering', 'Anomaly Detection'],
      endpoints: {
        csrfToken: 'GET /api/csrf-token',
        securityAudit: 'GET /api/security/audit'
      }
    },
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      apiV1: {
        docs: 'GET /api/v1/docs',
        health: 'GET /api/v1/health',
        clients: 'GET /api/v1/clients',
        note: 'Comprehensive RESTful API with pagination, filtering, sorting, and error handling'
      },
      documentation: {
        interactive: 'GET /api-docs (Swagger UI)',
        json: 'GET /api-docs.json (OpenAPI JSON)',
        note: 'Interactive API documentation with request/response examples'
      },
      auth: {
        legacy: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          verify: 'GET /api/auth/verify'
        },
        roles: {
          adminLogin: 'POST /api/auth/roles/admin/login',
          clientLogin: 'POST /api/auth/roles/client/login',
          clientSetupPassword: 'POST /api/auth/roles/client/setup-password',
          logout: 'POST /api/auth/roles/logout',
          verify: 'GET /api/auth/roles/verify'
        },
        enhanced: {
          login: 'POST /api/auth-v2/login',
          register: 'POST /api/auth-v2/register',
          forgotPassword: 'POST /api/auth-v2/forgot-password',
          resetPassword: 'POST /api/auth-v2/reset-password',
          verifyEmail: 'POST /api/auth-v2/verify-email',
          changePassword: 'POST /api/auth-v2/change-password',
          twoFactor: {
            generate: 'POST /api/auth-v2/2fa/generate',
            enable: 'POST /api/auth-v2/2fa/enable',
            disable: 'POST /api/auth-v2/2fa/disable',
            verify: 'POST /api/auth-v2/2fa/verify'
          }
        }
      },
      lexMachina: {
        cases: {
          search: 'GET /api/lexmachina/cases/search',
          details: 'GET /api/lexmachina/cases/{id}',
          predictions: 'GET /api/lexmachina/cases/{id}/predictions',
          insights: 'GET /api/lexmachina/cases/{id}/insights'
        },
        analytics: {
          judges: 'GET /api/lexmachina/judges/{id}/analytics',
          lawFirms: 'GET /api/lexmachina/law-firms/{id}/analytics',
          damages: 'GET /api/lexmachina/damages/{practiceArea}/analytics',
          trends: 'GET /api/lexmachina/trends',
          practiceAreas: 'GET /api/lexmachina/practice-areas/{practiceArea}/intelligence'
        },
        intelligence: {
          competitive: 'GET /api/lexmachina/law-firms/{firm}/competitive-intelligence'
        }
      },
      analytics: {
        dashboard: 'GET /api/analytics/dashboard',
        financial: 'GET /api/analytics/financial',
        cases: 'GET /api/analytics/cases',
        competitive: 'GET /api/analytics/competitive',
        predictive: 'GET /api/analytics/predictive',
        businessIntelligence: 'GET /api/analytics/business-intelligence',
        kpis: 'GET /api/analytics/kpis/realtime',
        insights: 'GET /api/analytics/insights',
        export: 'GET /api/analytics/export'
      },
      collaboration: {
        activeUsers: 'GET /api/collaboration/users/active',
        documentCollaborators: 'GET /api/collaboration/documents/{id}/collaborators',
        caseCollaborators: 'GET /api/collaboration/cases/{id}/collaborators',
        notifications: {
          send: 'POST /api/collaboration/notifications',
          get: 'GET /api/collaboration/notifications',
          markRead: 'POST /api/collaboration/notifications/read'
        },
        messaging: {
          messages: 'GET /api/collaboration/messages',
          conversations: 'GET /api/collaboration/conversations'
        },
        comments: {
          document: 'GET /api/collaboration/documents/{id}/comments',
          case: 'GET /api/collaboration/cases/{id}/comments'
        },
        announcements: 'POST /api/collaboration/announcements',
        analytics: 'GET /api/collaboration/analytics',
        websocket: 'Socket.IO connection at same origin'
      },
      zoom: {
        meetings: {
          create: 'POST /api/zoom/meetings',
          list: 'GET /api/zoom/meetings',
          details: 'GET /api/zoom/meetings/{meetingId}',
          update: 'PUT /api/zoom/meetings/{meetingId}',
          delete: 'DELETE /api/zoom/meetings/{meetingId}',
          recurring: 'POST /api/zoom/meetings/recurring'
        },
        sdk: {
          signature: 'POST /api/zoom/sdk/signature'
        },
        recordings: 'GET /api/zoom/meetings/{meetingId}/recordings',
        configuration: 'GET /api/zoom/configuration',
        analytics: 'GET /api/zoom/analytics',
        webhook: 'POST /api/zoom/webhook'
      },
      webrtc: {
        meetings: {
          create: 'POST /api/webrtc/meetings',
          list: 'GET /api/webrtc/meetings',
          details: 'GET /api/webrtc/meetings/{meetingId}',
          update: 'PUT /api/webrtc/meetings/{meetingId}',
          delete: 'DELETE /api/webrtc/meetings/{meetingId}',
          join: 'POST /api/webrtc/meetings/{meetingId}/join',
          leave: 'POST /api/webrtc/meetings/{meetingId}/leave',
          token: 'GET /api/webrtc/meetings/{meetingId}/token'
        },
        recording: {
          start: 'POST /api/webrtc/meetings/{meetingId}/recording/start',
          stop: 'POST /api/webrtc/meetings/{meetingId}/recording/stop',
          list: 'GET /api/webrtc/meetings/{meetingId}/recordings'
        },
        configuration: 'GET /api/webrtc/configuration',
        analytics: 'GET /api/webrtc/analytics'
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'operational',
    version: '1.0.0'
  });
});

// Import comprehensive error handling
const { ErrorHandler } = require('./src/middleware/errorHandler');

// Global error handling middleware
app.use(ErrorHandler.globalErrorHandler());
registerErrorHandler(app, Sentry);

// 404 handler
app.use(ErrorHandler.notFoundHandler());

// Initialize real-time collaboration
realtimeCollaborationService.initialize(server);

// Global error handling middleware (must be last)
app.use(errorMonitor.middleware());

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Legal Estate Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 API Endpoints available on port ${PORT}`);
  console.log(`🔗 Socket.IO server ready for real-time collaboration`);
  console.log(`📡 Server listening on 0.0.0.0:${PORT}`);
  console.log(`🔒 HTTPS Support: ${process.env.FORCE_HTTPS === 'true' ? 'Required' : 'Optional with HTTP fallback'}`);
  console.log(`🌍 CORS Origins: HTTPS/HTTP both supported for SSL fallback`);
  console.log(`📋 Activity Tracking: Comprehensive system ready for production`);
});