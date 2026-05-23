const express = require('express');
const router = express.Router();
const lexMachinaController = require('../controllers/LexMachinaController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for API calls to prevent abuse
const lexMachinaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: { message: 'Too many API requests, please try again later' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(lexMachinaRateLimit);

/**
 * @swagger
 * /api/lexmachina/cases/search:
 *   get:
 *     summary: Search cases across all court types
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: caseType
 *         schema:
 *           type: string
 *           enum: [DistrictCases, AppealsCases, StateCases, PTABCases, ITCCases]
 *         description: Type of court cases to search
 *       - in: query
 *         name: jurisdiction
 *         schema:
 *           type: string
 *         description: Jurisdiction to search in
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for search range
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for search range
 *       - in: query
 *         name: practiceAreas
 *         schema:
 *           type: string
 *         description: Comma-separated list of practice areas
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
 *       400:
 *         description: Invalid search parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.get('/cases/search', lexMachinaController.searchCases);

/**
 * @swagger
 * /api/lexmachina/cases/{caseId}:
 *   get:
 *     summary: Get detailed case information with analytics
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *       - in: query
 *         name: caseType
 *         schema:
 *           type: string
 *           default: DistrictCases
 *         description: Type of court case
 *     responses:
 *       200:
 *         description: Case details retrieved successfully
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 */
router.get('/cases/:caseId', lexMachinaController.getCaseDetails);

/**
 * @swagger
 * /api/lexmachina/cases/{caseId}/predictions:
 *   get:
 *     summary: Get case predictions using ML models
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *       - in: query
 *         name: caseType
 *         schema:
 *           type: string
 *           default: DistrictCases
 *         description: Type of court case
 *     responses:
 *       200:
 *         description: Case predictions generated successfully
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 */
router.get('/cases/:caseId/predictions', lexMachinaController.getCasePredictions);

/**
 * @swagger
 * /api/lexmachina/cases/{caseId}/insights:
 *   get:
 *     summary: Get strategic case insights and recommendations
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *       - in: query
 *         name: includeRecommendations
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include strategic recommendations
 *     responses:
 *       200:
 *         description: Strategic insights generated successfully
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 */
router.get('/cases/:caseId/insights', lexMachinaController.getStrategicInsights);

/**
 * @swagger
 * /api/lexmachina/judges/{judgeId}/analytics:
 *   get:
 *     summary: Get judge analytics and performance metrics
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: judgeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Judge ID
 *       - in: query
 *         name: practiceAreas
 *         schema:
 *           type: string
 *         description: Comma-separated list of practice areas
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis range
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis range
 *       - in: query
 *         name: includeComparisons
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include peer comparisons
 *     responses:
 *       200:
 *         description: Judge analytics retrieved successfully
 *       404:
 *         description: Judge not found
 *       500:
 *         description: Internal server error
 */
router.get('/judges/:judgeId/analytics', lexMachinaController.getJudgeAnalytics);

/**
 * @swagger
 * /api/lexmachina/law-firms/{firmId}/analytics:
 *   get:
 *     summary: Get law firm performance analytics
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: firmId
 *         required: true
 *         schema:
 *           type: string
 *         description: Law firm ID
 *       - in: query
 *         name: practiceAreas
 *         schema:
 *           type: string
 *         description: Comma-separated list of practice areas
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis range
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis range
 *       - in: query
 *         name: attorneyId
 *         schema:
 *           type: string
 *         description: Specific attorney ID to analyze
 *       - in: query
 *         name: includeAttorneys
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include attorney-level analytics
 *     responses:
 *       200:
 *         description: Law firm analytics retrieved successfully
 *       404:
 *         description: Law firm not found
 *       500:
 *         description: Internal server error
 */
router.get('/law-firms/:firmId/analytics', lexMachinaController.getLawFirmAnalytics);

/**
 * @swagger
 * /api/lexmachina/law-firms/{lawFirm}/competitive-intelligence:
 *   get:
 *     summary: Get competitive intelligence report for law firm
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lawFirm
 *         required: true
 *         schema:
 *           type: string
 *         description: Law firm identifier
 *       - in: query
 *         name: practiceArea
 *         required: true
 *         schema:
 *           type: string
 *         description: Practice area for analysis
 *       - in: query
 *         name: jurisdiction
 *         schema:
 *           type: string
 *         description: Jurisdiction for analysis
 *     responses:
 *       200:
 *         description: Competitive intelligence report generated successfully
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
router.get('/law-firms/:lawFirm/competitive-intelligence', lexMachinaController.getCompetitiveIntelligence);

/**
 * @swagger
 * /api/lexmachina/trends:
 *   get:
 *     summary: Get litigation trends and market intelligence
 *     tags: [Legal Analytics]
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
 *         description: Jurisdiction for trend analysis
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for trend analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for trend analysis
 *       - in: query
 *         name: trendType
 *         schema:
 *           type: string
 *           default: filing_volume
 *         description: Type of trend to analyze
 *     responses:
 *       200:
 *         description: Litigation trends retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/trends', lexMachinaController.getLitigationTrends);

/**
 * @swagger
 * /api/lexmachina/damages/{practiceArea}/analytics:
 *   get:
 *     summary: Get damages analytics and benchmarking
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practiceArea
 *         required: true
 *         schema:
 *           type: string
 *         description: Practice area for damages analysis
 *       - in: query
 *         name: jurisdiction
 *         schema:
 *           type: string
 *         description: Jurisdiction for analysis
 *       - in: query
 *         name: caseType
 *         schema:
 *           type: string
 *         description: Specific case type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis range
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis range
 *       - in: query
 *         name: includeSettlements
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include settlement data
 *     responses:
 *       200:
 *         description: Damages analytics retrieved successfully
 *       400:
 *         description: Invalid practice area
 *       500:
 *         description: Internal server error
 */
router.get('/damages/:practiceArea/analytics', lexMachinaController.getDamagesAnalytics);

/**
 * @swagger
 * /api/lexmachina/practice-areas/{practiceArea}/intelligence:
 *   get:
 *     summary: Get comprehensive practice area intelligence
 *     tags: [Legal Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practiceArea
 *         required: true
 *         schema:
 *           type: string
 *         description: Practice area for intelligence analysis
 *       - in: query
 *         name: jurisdiction
 *         schema:
 *           type: string
 *         description: Jurisdiction for analysis
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [3months, 6months, 12months, 24months]
 *           default: 12months
 *         description: Time range for analysis
 *     responses:
 *       200:
 *         description: Practice area intelligence generated successfully
 *       400:
 *         description: Invalid practice area
 *       500:
 *         description: Internal server error
 */
router.get('/practice-areas/:practiceArea/intelligence', lexMachinaController.getPracticeAreaIntelligence);

module.exports = router;