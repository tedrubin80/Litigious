const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);
router.get('/analytics', dashboardController.getCaseAnalytics);
router.get('/activity', dashboardController.getUserActivity);

// New endpoints for frontend compatibility
router.get('/overview', dashboardController.getDashboardOverview);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;