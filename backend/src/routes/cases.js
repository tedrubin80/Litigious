const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Case routes
router.get('/', caseController.getCases);
router.post('/', caseController.createCase);
router.get('/:id', caseController.getCaseById);
router.put('/:id', caseController.updateCase);
router.put('/:id/status', caseController.updateCaseStatus);
router.get('/:id/timeline', caseController.getCaseTimeline);
router.post('/:id/settlement', caseController.recordSettlement);

module.exports = router;