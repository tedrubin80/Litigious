const express = require('express');
const router = express.Router();
const advancedAnalyticsController = require('../controllers/AdvancedAnalyticsController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for analytics API calls
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for analytics as they're frequently accessed
  message: {
    success: false,
    error: { message: 'Too many analytics requests, please try again later' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(analyticsRateLimit);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard analytics
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [3months, 6months, 12months, 24months]
 *           default: 12months
 *         description: Time range for analytics
 *       - in: query
 *         name: includeMarketData
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include market intelligence data
 *       - in: query
 *         name: includePredictions
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include predictive analytics
 *       - in: query
 *         name: includeComparisons
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include benchmark comparisons
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', advancedAnalyticsController.getDashboardAnalytics);

/**
 * @swagger
 * /api/analytics/financial:
 *   get:
 *     summary: Get financial performance analytics
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [3months, 6months, 12months, 24months]
 *           default: 12months
 *         description: Time range for analysis
 *       - in: query
 *         name: breakdown
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly]
 *           default: monthly
 *         description: Data breakdown granularity
 *       - in: query
 *         name: includeForecasting
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include financial forecasting
 *     responses:
 *       200:
 *         description: Financial analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/financial', advancedAnalyticsController.getFinancialAnalytics);

/**
 * @swagger
 * /api/analytics/cases:
 *   get:
 *     summary: Get case performance analytics with predictions
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [3months, 6months, 12months, 24months]
 *           default: 12months
 *         description: Time range for analysis
 *       - in: query
 *         name: practiceAreas
 *         schema:
 *           type: string
 *         description: Comma-separated list of practice areas to analyze
 *       - in: query
 *         name: includePredictions
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include case outcome predictions
 *     responses:
 *       200:
 *         description: Case analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/cases', advancedAnalyticsController.getCaseAnalytics);

/**
 * @swagger
 * /api/analytics/competitive:
 *   get:
 *     summary: Get competitive intelligence report
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: practiceAreas
 *         schema:
 *           type: string
 *         description: Comma-separated list of practice areas
 *       - in: query
 *         name: jurisdiction
 *         schema:
 *           type: string
 *           default: ALL
 *         description: Jurisdiction for competitive analysis
 *       - in: query
 *         name: includeMarketTrends
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include market trend analysis
 *     responses:
 *       200:
 *         description: Competitive analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/competitive', advancedAnalyticsController.getCompetitiveAnalytics);

/**
 * @swagger
 * /api/analytics/predictive:
 *   get:
 *     summary: Get predictive analytics and forecasts
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: horizon
 *         schema:
 *           type: string
 *           enum: [3_months, 12_months, 24_months]
 *           default: 12_months
 *         description: Prediction time horizon
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of prediction categories
 *       - in: query
 *         name: confidenceThreshold
 *         schema:
 *           type: number
 *           minimum: 0.1
 *           maximum: 1.0
 *           default: 0.7
 *         description: Minimum confidence threshold for predictions
 *     responses:
 *       200:
 *         description: Predictive analytics generated successfully
 *       500:
 *         description: Internal server error
 */
router.get('/predictive', advancedAnalyticsController.getPredictiveAnalytics);

/**
 * @swagger
 * /api/analytics/business-intelligence:
 *   get:
 *     summary: Get comprehensive business intelligence report
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [comprehensive, financial, operational, strategic]
 *           default: comprehensive
 *         description: Type of business intelligence report
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [3months, 6months, 12months, 24months]
 *           default: 12months
 *         description: Time range for report
 *       - in: query
 *         name: includeExecutiveSummary
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include executive summary
 *     responses:
 *       200:
 *         description: Business intelligence report generated successfully
 *       500:
 *         description: Internal server error
 */
router.get('/business-intelligence', advancedAnalyticsController.getBusinessIntelligenceReport);

/**
 * @swagger
 * /api/analytics/kpis/realtime:
 *   get:
 *     summary: Get real-time KPI metrics
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of KPI categories (revenue, efficiency, growth, risk, client_satisfaction)
 *     responses:
 *       200:
 *         description: Real-time KPIs retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/kpis/realtime', advancedAnalyticsController.getRealtimeKPIs);

/**
 * @swagger
 * /api/analytics/insights:
 *   get:
 *     summary: Get analytics insights and alerts
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, low, medium, high, urgent]
 *           default: all
 *         description: Filter insights by priority level
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, financial, performance, market, risk, efficiency]
 *           default: all
 *         description: Filter insights by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of insights to return
 *     responses:
 *       200:
 *         description: Analytics insights retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/insights', advancedAnalyticsController.getAnalyticsInsights);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics report in various formats
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [comprehensive, financial, operational, strategic]
 *           default: comprehensive
 *         description: Type of report to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [3months, 6months, 12months, 24months]
 *           default: 12months
 *         description: Time range for exported data
 *     responses:
 *       200:
 *         description: Analytics report exported successfully
 *       400:
 *         description: Invalid export parameters
 *       501:
 *         description: Export format not implemented
 *       500:
 *         description: Internal server error
 */
router.get('/export', advancedAnalyticsController.exportAnalyticsReport);

module.exports = router;