const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const errorMonitor = require('../services/errorMonitor');

// Health check endpoint (no auth required for monitoring services)
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  };
  
  res.json(health);
});

// Apply auth middleware to protected routes
router.use(authenticateToken);

// Get error statistics (admin only)
router.get('/errors/stats', requireAdmin, (req, res) => {
  try {
    const stats = errorMonitor.getErrorStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get error log (admin only)
router.get('/errors', requireAdmin, (req, res) => {
  try {
    const { category, severity, userId, startDate, endDate, limit = 100 } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (userId) filter.userId = userId;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    
    const errors = errorMonitor.getErrors(filter);
    const limitedErrors = errors.slice(-limit); // Get last N errors
    
    res.json({
      total: errors.length,
      returned: limitedErrors.length,
      errors: limitedErrors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System metrics (admin only)
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get database statistics
    const [userCount, caseCount, clientCount, taskCount, documentCount] = await Promise.all([
      prisma.user.count(),
      prisma.case.count(),
      prisma.client.count(),
      prisma.task.count(),
      prisma.document.count()
    ]);
    
    // Get recent activity count
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentActivityCount = await prisma.activity.count({
      where: {
        createdAt: { gte: oneDayAgo }
      }
    });
    
    await prisma.$disconnect();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        users: userCount,
        cases: caseCount,
        clients: clientCount,
        tasks: taskCount,
        documents: documentCount,
        recentActivity: recentActivityCount
      },
      errors: errorMonitor.getErrorStats()
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log a client-side error
router.post('/errors/client', async (req, res) => {
  try {
    const { message, stack, component, severity = 'LOW', additionalData } = req.body;
    
    const error = new Error(message);
    error.stack = stack;
    
    await errorMonitor.logError(error, {
      category: 'CLIENT',
      severity: severity,
      userId: req.user?.id,
      endpoint: component,
      method: 'CLIENT',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      additionalData: additionalData || {}
    });
    
    res.json({ success: true, message: 'Error logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;