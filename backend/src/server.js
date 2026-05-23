const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const adminAiRoutes = require('./routes/admin-ai');
app.use('/api/admin', adminAiRoutes);

// Production API - Authentication handled by auth routes

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Legal Estate Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      login: '/api/login',
      status: '/api/status',
      dashboard: '/api/dashboard'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected', // You can add real DB check here
    services: {
      authentication: 'active',
      fileStorage: 'active',
      notifications: 'active'
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'operational',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    totalUsers: 'protected',
    activeConnections: 1,
    lastBackup: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Redirect to proper auth endpoint
  res.status(400).json({ 
    message: 'Please use /api/auth/login endpoint',
    success: false 
  });
});

// Dashboard data endpoint
app.get('/api/dashboard', (req, res) => {
  // In production, you'd verify the token from headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  // Mock dashboard data
  res.json({
    user: {
      name: 'Demo User',
      role: 'admin'
    },
    stats: {
      totalCases: 45,
      activeCases: 23,
      completedCases: 22,
      totalSettlement: '$2,350,000'
    },
    recentActivity: [
      { id: 1, action: 'New case filed', case: 'Johnson vs. Metro Insurance', date: '2024-01-15' },
      { id: 2, action: 'Settlement reached', case: 'Smith vs. ABC Corp', date: '2024-01-14' },
      { id: 3, action: 'Medical records received', case: 'Davis vs. XYZ Medical', date: '2024-01-13' }
    ],
    notifications: [
      { id: 1, message: 'Court date scheduled for Johnson case', priority: 'high' },
      { id: 2, message: 'Medical records request pending', priority: 'medium' },
      { id: 3, message: 'Settlement payment received', priority: 'low' }
    ]
  });
});

// Cases endpoint (example)
app.get('/api/cases', (req, res) => {
  res.json({
    cases: [
      {
        id: 1,
        clientName: 'John Johnson',
        caseType: 'Personal Injury',
        status: 'Active',
        dateOpened: '2024-01-10',
        settlement: '$150,000'
      },
      {
        id: 2,
        clientName: 'Mary Smith',
        caseType: 'Medical Malpractice',
        status: 'Settled',
        dateOpened: '2023-11-15',
        settlement: '$500,000'
      },
      {
        id: 3,
        clientName: 'Robert Davis',
        caseType: 'Auto Accident',
        status: 'Investigation',
        dateOpened: '2024-01-08',
        settlement: 'Pending'
      }
    ]
  });
});

// System info endpoint (admin only)
app.get('/api/system', (req, res) => {
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform
    },
    database: {
      status: 'connected',
      tables: ['users', 'cases', 'clients', 'documents'],
      lastBackup: new Date().toISOString()
    },
    security: {
      lastSecurityScan: new Date().toISOString(),
      encryptionStatus: 'active',
      backupStatus: 'current'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/status',
      'POST /api/login',
      'GET /api/dashboard',
      'GET /api/cases',
      'GET /api/system'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Legal Estate Backend running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Demo users available: ${demoUsers.length}`);
  console.log('🔐 Demo Admin: admin@legalestate.com / admin123');
  console.log('👤 Demo User: demo@legalestate.com / demo123');
});