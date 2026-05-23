const express = require('express');
const router = express.Router();
const zoomController = require('../controllers/ZoomController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for Zoom endpoints
const zoomRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: { message: 'Too many Zoom requests, please try again later' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(zoomRateLimit);

/**
 * @swagger
 * /api/zoom/meetings:
 *   post:
 *     summary: Create a new Zoom meeting
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startTime
 *             properties:
 *               caseId:
 *                 type: string
 *                 description: Associated case ID
 *               title:
 *                 type: string
 *                 description: Meeting title
 *               description:
 *                 type: string
 *                 description: Meeting description
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Meeting start time
 *               duration:
 *                 type: integer
 *                 default: 60
 *                 description: Meeting duration in minutes
 *               meetingType:
 *                 type: string
 *                 enum: [client_consultation, team_meeting, deposition, court_hearing, case_review, discovery_meeting, mediation, arbitration]
 *                 description: Type of legal meeting
 *               securityLevel:
 *                 type: string
 *                 enum: [standard, high, confidential]
 *                 description: Security level for the meeting
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *               settings:
 *                 type: object
 *                 description: Additional meeting settings
 *     responses:
 *       200:
 *         description: Meeting created successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/meetings', zoomController.createMeeting);

/**
 * @swagger
 * /api/zoom/meetings/recurring:
 *   post:
 *     summary: Create recurring Zoom meetings
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startTime
 *               - recurrencePattern
 *             properties:
 *               title:
 *                 type: string
 *                 description: Meeting title
 *               description:
 *                 type: string
 *                 description: Meeting description
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: First meeting start time
 *               duration:
 *                 type: integer
 *                 default: 60
 *                 description: Meeting duration in minutes
 *               recurrencePattern:
 *                 type: object
 *                 required:
 *                   - type
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [daily, weekly, monthly]
 *                   interval:
 *                     type: integer
 *                     description: Interval between meetings
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     description: Days of week for weekly recurrence (0=Sunday)
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: End date for recurrence
 *               meetingType:
 *                 type: string
 *                 enum: [client_consultation, team_meeting, deposition, court_hearing, case_review, discovery_meeting, mediation, arbitration]
 *               securityLevel:
 *                 type: string
 *                 enum: [standard, high, confidential]
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Recurring meetings created successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/meetings/recurring', zoomController.createRecurringMeeting);

/**
 * @swagger
 * /api/zoom/meetings:
 *   get:
 *     summary: List user's Zoom meetings
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: '50'
 *         description: Number of meetings to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: string
 *           default: '0'
 *         description: Number of meetings to skip
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, scheduled, ended, waiting]
 *           default: all
 *         description: Filter meetings by status
 *       - in: query
 *         name: caseId
 *         schema:
 *           type: string
 *         description: Filter meetings by case ID
 *       - in: query
 *         name: meetingType
 *         schema:
 *           type: string
 *         description: Filter meetings by type
 *     responses:
 *       200:
 *         description: Meetings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/meetings', zoomController.listMeetings);

/**
 * @swagger
 * /api/zoom/meetings/{meetingId}:
 *   get:
 *     summary: Get meeting details
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting details retrieved successfully
 *       404:
 *         description: Meeting not found
 *       500:
 *         description: Internal server error
 */
router.get('/meetings/:meetingId', zoomController.getMeeting);

/**
 * @swagger
 * /api/zoom/meetings/{meetingId}:
 *   put:
 *     summary: Update meeting
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               meetingType:
 *                 type: string
 *                 enum: [client_consultation, team_meeting, deposition, court_hearing, case_review, discovery_meeting, mediation, arbitration]
 *               securityLevel:
 *                 type: string
 *                 enum: [standard, high, confidential]
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *       400:
 *         description: Invalid meeting ID
 *       500:
 *         description: Internal server error
 */
router.put('/meetings/:meetingId', zoomController.updateMeeting);

/**
 * @swagger
 * /api/zoom/meetings/{meetingId}:
 *   delete:
 *     summary: Cancel/Delete meeting
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting cancelled successfully
 *       400:
 *         description: Invalid meeting ID
 *       500:
 *         description: Internal server error
 */
router.delete('/meetings/:meetingId', zoomController.deleteMeeting);

/**
 * @swagger
 * /api/zoom/sdk/signature:
 *   post:
 *     summary: Generate Meeting SDK signature for client-side integration
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingNumber
 *             properties:
 *               meetingNumber:
 *                 type: string
 *                 description: Zoom meeting number
 *               role:
 *                 type: integer
 *                 enum: [0, 1]
 *                 default: 0
 *                 description: User role (0=attendee, 1=host)
 *               userEmail:
 *                 type: string
 *                 description: User email (optional)
 *               userName:
 *                 type: string
 *                 description: User name (optional)
 *               expiry:
 *                 type: integer
 *                 description: Signature expiry time in milliseconds
 *     responses:
 *       200:
 *         description: SDK signature generated successfully
 *       400:
 *         description: Meeting number is required
 *       500:
 *         description: Internal server error
 */
router.post('/sdk/signature', zoomController.generateSDKSignature);

/**
 * @swagger
 * /api/zoom/meetings/{meetingId}/recordings:
 *   get:
 *     summary: Get meeting recordings
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting ID
 *     responses:
 *       200:
 *         description: Meeting recordings retrieved successfully
 *       400:
 *         description: Meeting ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/meetings/:meetingId/recordings', zoomController.getMeetingRecordings);

/**
 * @swagger
 * /api/zoom/configuration:
 *   get:
 *     summary: Get meeting types and security levels configuration
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Meeting configuration retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/configuration', zoomController.getMeetingConfiguration);

/**
 * @swagger
 * /api/zoom/analytics:
 *   get:
 *     summary: Get meeting analytics
 *     tags: [Zoom Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Meeting analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', zoomController.getMeetingAnalytics);

/**
 * @swagger
 * /api/zoom/webhook:
 *   post:
 *     summary: Handle Zoom webhooks
 *     tags: [Zoom Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Zoom webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Webhook processing failed
 */
router.post('/webhook', zoomController.handleWebhook);

module.exports = router;