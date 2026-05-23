const express = require('express');
const router = express.Router();
const activityController = require('../controllers/ActivityController');
const { authenticateToken } = require('../middleware/auth');
const { trackActivity } = require('../middleware/activityTracker');

// Apply authentication to all activity routes
router.use(authenticateToken);

// Apply activity tracking middleware to track API usage
router.use(trackActivity('ACTIVITY'));

/**
 * Activity Tracking Routes
 * 
 * These routes provide comprehensive activity tracking and reporting
 * for the legal practice management system.
 */

// Get case activities with filtering
router.get('/case/:caseId', activityController.getCaseActivities);

// Get user activity summary
router.get('/user/:userId?/summary', activityController.getUserActivitySummary);

// Generate billing report from activities
router.get('/case/:caseId/billing-report', activityController.generateBillingReport);

// Manually track an activity (for testing or manual entry)
router.post('/track', activityController.trackManualActivity);

// Get activity statistics dashboard
router.get('/statistics', activityController.getActivityStatistics);

// Real-time activity feed
router.get('/feed', activityController.getActivityFeed);

// Bulk track activities (for batch operations)
router.post('/bulk-track', async (req, res) => {
  try {
    const { activities } = req.body;
    
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'activities array is required and must not be empty'
      });
    }

    // Add user ID to each activity
    const activitiesWithUser = activities.map(activity => ({
      ...activity,
      userId: req.user.id,
      request: req
    }));

    const { activityTracker } = require('../services/ActivityTrackerService');
    const result = await activityTracker.trackBulkActivities(activitiesWithUser);

    res.status(201).json({
      success: true,
      message: `Tracked ${result.successful} activities, ${result.failed} failed`,
      result
    });

  } catch (error) {
    console.error('Bulk activity tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track bulk activities',
      error: error.message
    });
  }
});

// Demo endpoint to show comprehensive activity tracking in action
router.post('/demo/legal-work', async (req, res) => {
  try {
    console.log('Demo legal work - req.user:', JSON.stringify(req.user, null, 2));
    const { caseId, workType, duration = 30 } = req.body;
    
    if (!caseId || !workType) {
      return res.status(400).json({
        success: false,
        message: 'caseId and workType are required'
      });
    }

    const { activityTracker } = require('../services/ActivityTrackerService');
    
    const workTypes = {
      'legal-research': {
        activityType: 'LEGAL_RESEARCH',
        action: 'Legal Research',
        description: 'Conducted comprehensive legal research',
        metadata: {
          researchTopic: req.body.topic || 'Case law analysis',
          databasesUsed: ['Westlaw', 'LexisNexis'],
          documentsReviewed: Math.floor(Math.random() * 20) + 5
        }
      },
      'document-drafting': {
        activityType: 'DOCUMENT_DRAFTING',
        action: 'Document Drafting',
        description: 'Drafted legal document',
        metadata: {
          documentType: req.body.documentType || 'Motion',
          pageCount: Math.floor(Math.random() * 10) + 3,
          revisions: 1
        }
      },
      'client-meeting': {
        activityType: 'CLIENT_MEETING',
        action: 'Client Meeting',
        description: 'Conducted client consultation meeting',
        metadata: {
          meetingType: req.body.meetingType || 'Strategy Discussion',
          attendees: ['Attorney', 'Client'],
          location: 'Office'
        }
      },
      'court-filing': {
        activityType: 'COURT_FILING',
        action: 'Court Filing',
        description: 'Prepared and filed court documents',
        metadata: {
          court: req.body.court || 'Superior Court',
          filingType: req.body.filingType || 'Motion to Dismiss',
          filingFee: 150.00
        }
      }
    };

    const workConfig = workTypes[workType];
    if (!workConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid work type. Available types: ${Object.keys(workTypes).join(', ')}`
      });
    }

    const activity = await activityTracker.trackActivity({
      caseId,
      userId: req.user.userId || req.user.id,
      activityType: workConfig.activityType,
      action: workConfig.action,
      description: workConfig.description,
      entityType: 'CASE',
      entityId: caseId,
      metadata: {
        ...workConfig.metadata,
        demonstrationMode: true
      },
      duration: parseInt(duration),
      isBillable: true,
      request: req
    });

    res.status(201).json({
      success: true,
      message: 'Legal work activity tracked successfully',
      activity,
      billing: {
        duration: `${duration} minutes`,
        estimatedCost: activity.billingAmount ? `$${activity.billingAmount.toFixed(2)}` : 'N/A',
        hourlyRate: activity.hourlyRate ? `$${activity.hourlyRate}/hour` : 'N/A'
      }
    });

  } catch (error) {
    console.error('Demo legal work tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track legal work activity',
      error: error.message
    });
  }
});

module.exports = router;