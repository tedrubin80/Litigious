const { PrismaClient } = require('@prisma/client');
const { activityTracker } = require('../services/ActivityTrackerService');

const prisma = new PrismaClient();

/**
 * Activity Controller for comprehensive case activity tracking
 */

/**
 * Get case activities with advanced filtering
 */
exports.getCaseActivities = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      activityType,
      userId,
      dateFrom,
      dateTo,
      billableOnly = false
    } = req.query;

    // Check if user has access to this case
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      const hasAccess = await prisma.case.findFirst({
        where: {
          id: caseId,
          OR: [
            { attorneyId: req.user.id },
            { paralegalId: req.user.id },
            { clientId: req.user.clientId } // If user is a client
          ]
        }
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this case'
        });
      }
    }

    const activities = await activityTracker.getCaseActivities(
      caseId,
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    // Get recent time entries for billing context
    const recentTimeEntries = await prisma.timeEntry.findMany({
      where: {
        caseId,
        description: { startsWith: '[AUTO]' } // Auto-generated from activities
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      caseId,
      activities,
      recentBilling: recentTimeEntries,
      summary: {
        totalActivities: activities.length,
        billableEntries: recentTimeEntries.length,
        totalBilledAmount: recentTimeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
        totalBilledHours: recentTimeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0)
      }
    });

  } catch (error) {
    console.error('Error fetching case activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case activities',
      error: error.message
    });
  }
};

/**
 * Get user activity summary
 */
exports.getUserActivitySummary = async (req, res) => {
  try {
    const { userId = req.user.id } = req.params;
    const { days = 7 } = req.query;

    const dateRange = {
      start: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const summary = await activityTracker.getUserActivitySummary(userId, dateRange);

    res.json({
      success: true,
      userId,
      dateRange,
      summary
    });

  } catch (error) {
    console.error('Error fetching user activity summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity summary',
      error: error.message
    });
  }
};

/**
 * Generate billing report from activities
 */
exports.generateBillingReport = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const report = await activityTracker.generateInvoiceFromActivities(caseId, {
      start: new Date(startDate),
      end: new Date(endDate)
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'No billing data found for the specified period'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating billing report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate billing report',
      error: error.message
    });
  }
};

/**
 * Manually track an activity (for testing or manual entry)
 */
exports.trackManualActivity = async (req, res) => {
  try {
    const {
      caseId,
      activityType,
      action,
      description,
      duration,
      isBillable,
      metadata = {}
    } = req.body;

    if (!activityType || !action) {
      return res.status(400).json({
        success: false,
        message: 'activityType and action are required'
      });
    }

    const activity = await activityTracker.trackActivity({
      caseId,
      userId: req.user.id,
      activityType,
      action,
      description,
      entityType: 'CASE',
      entityId: caseId,
      metadata: {
        ...metadata,
        manualEntry: true,
        enteredBy: `${req.user.firstName} ${req.user.lastName}`
      },
      duration: duration || 1,
      isBillable: isBillable !== undefined ? isBillable : true,
      request: req
    });

    res.status(201).json({
      success: true,
      message: 'Activity tracked successfully',
      activity
    });

  } catch (error) {
    console.error('Error tracking manual activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track activity',
      error: error.message
    });
  }
};

/**
 * Get activity statistics dashboard
 */
exports.getActivityStatistics = async (req, res) => {
  try {
    const { timeframe = '30' } = req.query;
    const userId = req.user.id;
    
    const timeframeDate = new Date();
    timeframeDate.setDate(timeframeDate.getDate() - parseInt(timeframe));

    // Get activity counts by type
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        createdAt: {
          gte: timeframeDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get recent time entries (auto-generated from activities)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        description: { startsWith: '[AUTO]' },
        date: {
          gte: timeframeDate
        }
      }
    });

    const activityBreakdown = activities.reduce((acc, activity) => {
      const action = activity.action.split(':')[0] || activity.action;
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});

    const totalBillableAmount = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
    const totalBillableHours = timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);

    res.json({
      success: true,
      timeframe: parseInt(timeframe),
      statistics: {
        totalActivities: activities.length,
        activityBreakdown,
        billing: {
          totalBillableEntries: timeEntries.length,
          totalBillableHours: parseFloat(totalBillableHours.toFixed(2)),
          totalBillableAmount: parseFloat(totalBillableAmount.toFixed(2)),
          averageHourlyRate: totalBillableHours > 0 ? parseFloat((totalBillableAmount / totalBillableHours).toFixed(2)) : 0
        },
        recentActivities: activities.slice(0, 10).map(activity => ({
          id: activity.id,
          action: activity.action,
          description: activity.description,
          createdAt: activity.createdAt,
          entityType: activity.entityType
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
};

/**
 * Real-time activity feed (simulates WebSocket for now)
 */
exports.getActivityFeed = async (req, res) => {
  try {
    const { since } = req.query;
    const userId = req.user.id;
    
    const where = { userId };
    if (since) {
      where.createdAt = { gte: new Date(since) };
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    res.json({
      success: true,
      activities,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity feed',
      error: error.message
    });
  }
};

module.exports = exports;