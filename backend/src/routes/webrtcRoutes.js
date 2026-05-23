const express = require('express');
const WebRTCController = require('../controllers/WebRTCController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All WebRTC routes require authentication
router.use(authenticateToken);

// Meeting management routes
router.post('/meetings', WebRTCController.createMeeting);
router.get('/meetings', WebRTCController.getMeetings);
router.get('/meetings/:meetingId', WebRTCController.getMeeting);
router.put('/meetings/:meetingId', WebRTCController.updateMeeting);
router.delete('/meetings/:meetingId', WebRTCController.deleteMeeting);

// Meeting participation routes
router.post('/meetings/:meetingId/join', WebRTCController.joinMeeting);
router.post('/meetings/:meetingId/leave', WebRTCController.leaveMeeting);
router.get('/meetings/:meetingId/token', WebRTCController.generateMeetingToken);

// Recording routes
router.post('/meetings/:meetingId/recording/start', WebRTCController.startRecording);
router.post('/meetings/:meetingId/recording/stop', WebRTCController.stopRecording);
router.get('/meetings/:meetingId/recordings', WebRTCController.getRecordings);

// Analytics and configuration routes
router.get('/analytics', WebRTCController.getMeetingAnalytics);
router.get('/configuration', WebRTCController.getMeetingConfiguration);

module.exports = router;