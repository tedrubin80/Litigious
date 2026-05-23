const express = require('express');
const cors = require('cors');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const http = require('http');
const realtimeCollaborationService = require('./src/services/RealtimeCollaborationService');
require('dotenv').config({ path: '.env.professional' });

const app = express();

// Trust proxy for Nginx reverse proxy
app.set('trust proxy', true);

// Protocol detection middleware
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  req.protocol_info = {
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    protocol: req.protocol,
    forwarded_proto: req.headers['x-forwarded-proto']
  };

  next();
});

const server = http.createServer(app);
const PORT = process.env.PORT || 3030;

// Import all routes
const authRoutes = require('./src/routes/auth');
const authEnhancedRoutes = require('./src/routes/auth-enhanced');
const authRolesRoutes = require('./src/routes/auth-roles');
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

// Professional package specific routes
const teamProfessionalRoutes = require('./src/routes/team-professional');
const aiProfessionalRoutes = require('./src/routes/ai-professional');

const errorMonitor = require('./src/services/errorMonitor');
const AuthUtils = require('./src/lib/authUtils');
const SecurityMiddleware = require('./src/middleware/security');

// Verify Professional package configuration
if (process.env.PACKAGE_TYPE !== 'PROFESSIONAL') {
  console.warn('Warning: PACKAGE_TYPE is not set to PROFESSIONAL. Some features may not work correctly.');
}

console.log('🏢 Starting Legal Estate Professional Package...');
console.log(`📊 Max Users: ${process.env.MAX_USERS || 25}`);
console.log(`🤖 AI Providers: ${process.env.AI_PROVIDER_PRIORITY || 'openai,anthropic,ollama'}`);
console.log(`👥 Team Features: ${process.env.ENABLE_TEAMS === 'true' ? 'Enabled' : 'Disabled'}`);

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error('SESSION_SECRET environment variable is required');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.FORCE_HTTPS === 'true',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 28800000, // 8 hours default
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false
  }
}));

// Initialize comprehensive security middleware
SecurityMiddleware.initializeAll(app);

// CORS configuration for Professional package
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const defaultOrigins = [
  'http://localhost:3031', // Professional frontend port
  'http://127.0.0.1:3031',
  'https://professional.legalestate.tech'
];

const allOrigins = [...new Set([...allowedOrigins, ...defaultOrigins])];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static('uploads'));
app.use('/recordings', express.static(process.env.RECORDINGS_PATH || '/var/www/html/recordings'));
app.use('/streams', express.static(process.env.STREAMS_PATH || '/var/www/html/streams'));

// Request logging middleware
app.use((req, res, next) => {
  const protocol = req.protocol_info?.secure ? 'HTTPS' : 'HTTP';
  console.log(`${new Date().toISOString()} - ${protocol} ${req.method} ${req.path}`);
  next();
});

// API Documentation (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LegalEstate Professional API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Security endpoints
app.get('/api/csrf-token', SecurityMiddleware.csrfTokenEndpoint());
app.get('/api/security/audit', SecurityMiddleware.securityAuditEndpoint());

// Create endpoint-specific rate limiters
const endpointLimiters = SecurityMiddleware.createEndpointRateLimiters();

// API v1 - Comprehensive RESTful API
app.use('/api/v1', endpointLimiters.api, apiV1Routes);

// Authentication routes
app.use('/api/auth', endpointLimiters.auth, authRoutes);
app.use('/api/auth-v2', endpointLimiters.auth, authEnhancedRoutes);
app.use('/api/auth', endpointLimiters.auth, authRolesRoutes);

// Admin routes
const adminAiRoutes = require('./src/routes/admin-ai');
app.use('/api/admin', endpointLimiters.api, adminAiRoutes);

// Core application routes
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
app.use('/api/monitoring', monitoringRoutes);

// Professional package specific routes
app.use('/api/team', endpointLimiters.api, teamProfessionalRoutes);
app.use('/api/ai-professional', endpointLimiters.api, aiProfessionalRoutes);

// Meeting room routes
app.use('/', meetingRoutes);

// Root endpoint with Professional package information
app.get('/', (req, res) => {
  res.json({
    message: 'Legal Estate Professional Package API',
    status: 'running',
    version: '1.0.0',
    package: {
      type: 'PROFESSIONAL',
      maxUsers: parseInt(process.env.MAX_USERS) || 25,
      features: {
        teamCollaboration: process.env.ENABLE_TEAMS === 'true',
        taskDelegation: process.env.ENABLE_TASK_DELEGATION === 'true',
        documentSharing: process.env.ENABLE_DOCUMENT_SHARING === 'true',
        timeTracking: process.env.ENABLE_TIME_TRACKING === 'true',
        billing: process.env.ENABLE_BILLING === 'true',
        clientPortal: process.env.ENABLE_CLIENT_PORTAL === 'true',
        multiProviderAI: true
      },
      aiProviders: {
        enabled: (process.env.AI_PROVIDER_PRIORITY || 'ollama').split(','),
        primary: process.env.AI_PROVIDER_PRIORITY?.split(',')[0] || 'ollama',
        costTracking: process.env.AI_COST_TRACKING === 'true'
      }
    },
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
        clients: 'GET /api/v1/clients'
      },
      documentation: {
        interactive: 'GET /api-docs (Swagger UI)',
        json: 'GET /api-docs.json (OpenAPI JSON)'
      },
      professional: {
        team: {
          users: 'GET /api/team/users',
          assignments: 'GET /api/team/assignments',
          workload: 'GET /api/team/workload',
          config: 'GET /api/team/config'
        },
        ai: {
          health: 'GET /api/ai-professional/health',
          analyzeDocument: 'POST /api/ai-professional/analyze-document',
          generateCaseSummary: 'POST /api/ai-professional/generate-case-summary',
          generateDocument: 'POST /api/ai-professional/generate-document',
          chat: 'POST /api/ai-professional/chat',
          usageStats: 'GET /api/ai-professional/usage-stats',
          providers: 'GET /api/ai-professional/providers'
        }
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
        websocket: 'Socket.IO connection at same origin'
      }
    }
  });
});

// Health check endpoints
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$queryRaw`SELECT 1`;

    // Check Professional config
    const config = await prisma.professionalConfig.findFirst();
    const userCount = await prisma.user.count({ where: { isActive: true } });

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      package: 'PROFESSIONAL',
      database: 'connected',
      users: {
        current: userCount,
        max: config?.maxUsers || 25,
        available: (config?.maxUsers || 25) - userCount
      },
      features: {
        teamFeatures: config?.teamFeaturesEnabled || false,
        aiProviders: (process.env.AI_PROVIDER_PRIORITY || 'ollama').split(',').length
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    version: '1.0.0',
    package: 'PROFESSIONAL',
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Import comprehensive error handling
const { ErrorHandler } = require('./src/middleware/errorHandler');

// Global error handling middleware
app.use(ErrorHandler.globalErrorHandler());

// 404 handler
app.use(ErrorHandler.notFoundHandler());

// Initialize real-time collaboration
realtimeCollaborationService.initialize(server);

// Global error handling middleware (must be last)
app.use(errorMonitor.middleware());

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Legal Estate Professional Package running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Package: PROFESSIONAL (${process.env.MAX_USERS || 25} user limit)`);
  console.log(`🔐 API Endpoints available on port ${PORT}`);
  console.log(`🔗 Socket.IO server ready for real-time collaboration`);
  console.log(`📡 Server listening on 0.0.0.0:${PORT}`);
  console.log(`🔒 HTTPS Support: ${process.env.FORCE_HTTPS === 'true' ? 'Required' : 'Optional'}`);
  console.log(`👥 Team Features: ${process.env.ENABLE_TEAMS === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`🤖 AI Providers: ${process.env.AI_PROVIDER_PRIORITY || 'ollama'}`);
  console.log(`💰 Cost Tracking: ${process.env.AI_COST_TRACKING === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`📋 Professional Package Features Ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Professional package server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Professional package server closed');
    process.exit(0);
  });
});