const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/CollaborationController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for collaboration endpoints
const collaborationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Higher limit for real-time features
  message: {
    success: false,
    error: { message: 'Too many collaboration requests, please try again later' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(collaborationRateLimit);

/**
 * @swagger
 * /api/collaboration/users/active:
 *   get:
 *     summary: Get currently active users
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active users retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/users/active', collaborationController.getActiveUsers);

/**
 * @swagger
 * /api/collaboration/documents/{documentId}/collaborators:
 *   get:
 *     summary: Get active collaborators for a document
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document collaborators retrieved successfully
 *       403:
 *         description: Access denied to document
 *       500:
 *         description: Internal server error
 */
router.get('/documents/:documentId/collaborators', collaborationController.getDocumentCollaborators);

/**
 * @swagger
 * /api/collaboration/cases/{caseId}/collaborators:
 *   get:
 *     summary: Get active collaborators for a case
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case collaborators retrieved successfully
 *       403:
 *         description: Access denied to case
 *       500:
 *         description: Internal server error
 */
router.get('/cases/:caseId/collaborators', collaborationController.getCaseCollaborators);

/**
 * @swagger
 * /api/collaboration/notifications:
 *   post:
 *     summary: Send notification to users
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientIds
 *               - notification
 *             properties:
 *               recipientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to send notification to
 *               notification:
 *                 type: object
 *                 required:
 *                   - message
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [message, alert, info, warning, success]
 *                   title:
 *                     type: string
 *                     description: Notification title
 *                   message:
 *                     type: string
 *                     description: Notification message
 *                   priority:
 *                     type: string
 *                     enum: [low, normal, high, urgent]
 *                   data:
 *                     type: object
 *                     description: Additional data for the notification
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/notifications', collaborationController.sendNotification);

/**
 * @swagger
 * /api/collaboration/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of notifications to skip
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return only unread notifications
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/notifications', collaborationController.getUserNotifications);

/**
 * @swagger
 * /api/collaboration/notifications/read:
 *   post:
 *     summary: Mark notifications as read
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of notification IDs to mark as read
 *               markAll:
 *                 type: boolean
 *                 description: Mark all notifications as read
 *     responses:
 *       200:
 *         description: Notifications marked as read successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/notifications/read', collaborationController.markNotificationsRead);

/**
 * @swagger
 * /api/collaboration/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationWith
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the conversation partner
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of messages to skip
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return messages before this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get('/messages', collaborationController.getUserMessages);

/**
 * @swagger
 * /api/collaboration/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/conversations', collaborationController.getUserConversations);

/**
 * @swagger
 * /api/collaboration/documents/{documentId}/comments:
 *   get:
 *     summary: Get comments for a document
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of comments to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of comments to skip
 *     responses:
 *       200:
 *         description: Document comments retrieved successfully
 *       403:
 *         description: Access denied to document
 *       500:
 *         description: Internal server error
 */
router.get('/documents/:documentId/comments', collaborationController.getDocumentComments);

/**
 * @swagger
 * /api/collaboration/cases/{caseId}/comments:
 *   get:
 *     summary: Get comments for a case
 *     tags: [Real-time Collaboration]
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of comments to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of comments to skip
 *     responses:
 *       200:
 *         description: Case comments retrieved successfully
 *       403:
 *         description: Access denied to case
 *       500:
 *         description: Internal server error
 */
router.get('/cases/:caseId/comments', collaborationController.getCaseComments);

/**
 * @swagger
 * /api/collaboration/announcements:
 *   post:
 *     summary: Broadcast system announcement
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - announcement
 *             properties:
 *               announcement:
 *                 type: object
 *                 required:
 *                   - message
 *                 properties:
 *                   title:
 *                     type: string
 *                     description: Announcement title
 *                   message:
 *                     type: string
 *                     description: Announcement message
 *                   type:
 *                     type: string
 *                     enum: [info, warning, success, error]
 *               targetUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific users to target (optional - broadcasts to all if not provided)
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *     responses:
 *       200:
 *         description: Announcement broadcasted successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/announcements', collaborationController.broadcastAnnouncement);

/**
 * @swagger
 * /api/collaboration/analytics:
 *   get:
 *     summary: Get collaboration analytics
 *     tags: [Real-time Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d]
 *           default: 24h
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Collaboration analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', collaborationController.getCollaborationAnalytics);

module.exports = router;