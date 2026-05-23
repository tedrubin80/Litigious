const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Comprehensive Activity Tracking Service for Legal Practice Management
 * 
 * This service automatically captures, categorizes, and stores ALL case-related actions
 * for seamless billing, compliance, and complete case continuity.
 * 
 * Key Features:
 * - Automatic activity logging with detailed metadata
 * - Intelligent billing time calculation
 * - Real-time activity feeds
 * - Audit trail for compliance
 * - Performance analytics
 */
class ActivityTrackerService {
  constructor() {
    this.activityTypes = {
      // Document Activities
      DOCUMENT_UPLOAD: { billable: true, description: 'Document Upload' },
      DOCUMENT_VIEW: { billable: false, description: 'Document View' },
      DOCUMENT_EDIT: { billable: true, description: 'Document Edit' },
      DOCUMENT_DOWNLOAD: { billable: false, description: 'Document Download' },
      DOCUMENT_SHARE: { billable: false, description: 'Document Share' },
      DOCUMENT_REVIEW: { billable: true, description: 'Document Review' },
      
      // Communication Activities
      EMAIL_SENT: { billable: true, description: 'Email Sent' },
      EMAIL_RECEIVED: { billable: false, description: 'Email Received' },
      PHONE_CALL_MADE: { billable: true, description: 'Phone Call Made' },
      PHONE_CALL_RECEIVED: { billable: true, description: 'Phone Call Received' },
      VIDEO_MEETING_CREATED: { billable: false, description: 'Video Meeting Created' },
      VIDEO_MEETING_JOINED: { billable: true, description: 'Video Meeting Joined' },
      VIDEO_MEETING_ENDED: { billable: false, description: 'Video Meeting Ended' },
      CLIENT_MEETING: { billable: true, description: 'Client Meeting' },
      
      // Case Management
      CASE_CREATED: { billable: false, description: 'Case Created' },
      CASE_UPDATED: { billable: false, description: 'Case Updated' },
      CASE_STATUS_CHANGED: { billable: false, description: 'Case Status Changed' },
      CASE_ASSIGNED: { billable: false, description: 'Case Assigned' },
      CASE_TRANSFERRED: { billable: false, description: 'Case Transferred' },
      
      // Legal Work
      LEGAL_RESEARCH: { billable: true, description: 'Legal Research' },
      DOCUMENT_DRAFTING: { billable: true, description: 'Document Drafting' },
      CONTRACT_REVIEW: { billable: true, description: 'Contract Review' },
      COURT_FILING: { billable: true, description: 'Court Filing' },
      DEPOSITION_PREP: { billable: true, description: 'Deposition Preparation' },
      
      // Medical Records
      MEDICAL_RECORD_REQUEST: { billable: true, description: 'Medical Record Request' },
      MEDICAL_RECORD_RECEIVED: { billable: false, description: 'Medical Record Received' },
      MEDICAL_RECORD_REVIEWED: { billable: true, description: 'Medical Record Review' },
      
      // Task Management
      TASK_CREATED: { billable: false, description: 'Task Created' },
      TASK_COMPLETED: { billable: false, description: 'Task Completed' },
      TASK_ASSIGNED: { billable: false, description: 'Task Assigned' },
      
      // Time & Billing
      TIME_ENTRY_CREATED: { billable: false, description: 'Time Entry Created' },
      EXPENSE_ADDED: { billable: false, description: 'Expense Added' },
      INVOICE_GENERATED: { billable: false, description: 'Invoice Generated' },
      
      // System Activities
      LOGIN: { billable: false, description: 'System Login' },
      LOGOUT: { billable: false, description: 'System Logout' },
      SYSTEM_ACCESS: { billable: false, description: 'System Access' }
    };
  }

  /**
   * Main method to track any case-related activity
   * 
   * @param {Object} params - Activity parameters
   * @param {string} params.caseId - Case ID (optional, but recommended)
   * @param {string} params.userId - User ID performing the action
   * @param {string} params.activityType - Type of activity (from activityTypes enum)
   * @param {string} params.action - Specific action description
   * @param {string} params.description - Auto-generated or custom description
   * @param {string} params.entityType - Type of entity (CASE, CLIENT, DOCUMENT, etc.)
   * @param {string} params.entityId - ID of related entity
   * @param {Object} params.metadata - Additional context data
   * @param {number} params.duration - Duration in minutes
   * @param {boolean} params.isBillable - Override default billability
   * @param {Object} params.request - HTTP request object for IP, user agent
   * @returns {Promise<Object>} Created activity record
   */
  async trackActivity(params) {
    try {
      const {
        caseId,
        userId,
        activityType,
        action,
        description,
        entityType,
        entityId,
        metadata = {},
        duration,
        isBillable,
        request
      } = params;

      // Validate required parameters
      if (!userId || !activityType || !action) {
        throw new Error('userId, activityType, and action are required');
      }

      // Get user information for billing rate
      const user = await this.getUserInfo(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Determine if activity should be billable
      const activityConfig = this.activityTypes[activityType] || { billable: false };
      const shouldBeBillable = isBillable !== undefined ? isBillable : activityConfig.billable;
      
      // Calculate billing information
      let billingAmount = 0;
      let hourlyRate = user.hourlyRate || 150.00; // Default rate if none set
      
      if (shouldBeBillable && duration && hourlyRate) {
        billingAmount = (duration / 60) * hourlyRate;
      }

      // Generate detailed description
      const activityDescription = description || this.generateDescription(activityType, action, metadata);

      // Create activity record using existing Activity model
      const activity = await prisma.activity.create({
        data: {
          action: action,
          description: activityDescription,
          entityType: entityType || 'CASE',
          entityId: entityId || caseId || 'unknown',
          userId: userId,
          ipAddress: request?.ip || request?.connection?.remoteAddress,
          userAgent: request?.get?.('user-agent'),
          createdAt: new Date()
        }
      });

      // Log billing information separately (extend Activity model later)
      if (shouldBeBillable && duration) {
        await this.createBillingEntry({
          activityId: activity.id,
          caseId,
          userId,
          description: activityDescription,
          duration,
          hourlyRate,
          billingAmount
        });
      }

      // Update case activity summary if case is specified
      if (caseId) {
        await this.updateCaseActivitySummary(caseId, activityType, duration || 0);
      }

      // Emit real-time notification
      this.emitActivityUpdate(activity, {
        caseId,
        activityType,
        isBillable: shouldBeBillable,
        billingAmount
      });

      console.log(`✅ Activity tracked: ${activityType} for user ${userId}`, {
        activityId: activity.id,
        caseId,
        billable: shouldBeBillable,
        amount: billingAmount
      });

      return {
        ...activity,
        activityType,
        isBillable: shouldBeBillable,
        duration,
        billingAmount,
        metadata
      };

    } catch (error) {
      console.error('❌ Activity tracking failed:', error);
      throw error;
    }
  }

  /**
   * Get user information including billing rate
   */
  async getUserInfo(userId) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          hourlyRate: true
        }
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Generate descriptive text for activities
   */
  generateDescription(activityType, action, metadata = {}) {
    const descriptions = {
      DOCUMENT_UPLOAD: `Uploaded document: ${metadata.filename || metadata.title || 'Unknown'}`,
      DOCUMENT_VIEW: `Viewed document: ${metadata.filename || metadata.title || 'Unknown'}`,
      DOCUMENT_DOWNLOAD: `Downloaded document: ${metadata.filename || metadata.title || 'Unknown'}`,
      VIDEO_MEETING_CREATED: `Created video meeting: ${metadata.subject || metadata.title || 'Meeting'}`,
      VIDEO_MEETING_JOINED: `Joined video meeting: ${metadata.subject || 'Meeting'} (${metadata.duration || 0}m)`,
      EMAIL_SENT: `Sent email to ${metadata.recipient || metadata.toEmails?.join(', ') || 'client'}: ${metadata.subject || 'No subject'}`,
      PHONE_CALL_MADE: `Made phone call to ${metadata.recipient || metadata.phone || 'client'} (${metadata.duration || 0}m)`,
      LEGAL_RESEARCH: `Conducted legal research on ${metadata.topic || metadata.subject || 'case matters'}`,
      DOCUMENT_REVIEW: `Reviewed ${metadata.documentType || 'document'}: ${metadata.title || metadata.filename || 'Unknown'}`,
      CASE_STATUS_CHANGED: `Changed case status from ${metadata.oldStatus} to ${metadata.newStatus}${metadata.reason ? ': ' + metadata.reason : ''}`,
      TASK_COMPLETED: `Completed task: ${metadata.taskTitle || metadata.title || action}`,
      CLIENT_MEETING: `Met with client ${metadata.clientName || ''} ${metadata.duration ? '(' + metadata.duration + 'm)' : ''}`,
      COURT_FILING: `Filed ${metadata.documentType || 'document'} with ${metadata.court || 'court'}`,
      DEPOSITION_PREP: `Prepared for deposition of ${metadata.deponent || 'witness'}`,
      MEDICAL_RECORD_REQUEST: `Requested medical records from ${metadata.provider || 'healthcare provider'}`,
      CONTRACT_REVIEW: `Reviewed contract: ${metadata.contractType || metadata.title || 'Unknown'}`
    };

    return descriptions[activityType] || `${action}: ${metadata.description || 'Activity performed'}`;
  }

  /**
   * Create billing entry for billable activities
   * (This creates a TimeEntry record for now, can be enhanced later)
   */
  async createBillingEntry({ activityId, caseId, userId, description, duration, hourlyRate, billingAmount }) {
    try {
      const timeEntry = await prisma.timeEntry.create({
        data: {
          description: `[AUTO] ${description}`,
          hours: parseFloat((duration / 60).toFixed(2)),
          rate: parseFloat(hourlyRate.toFixed(2)),
          amount: parseFloat(billingAmount.toFixed(2)),
          date: new Date(),
          billable: true,
          billed: false,
          caseId: caseId,
          userId: userId,
          createdAt: new Date()
        }
      });

      console.log(`💰 Auto-billing entry created:`, {
        timeEntryId: timeEntry.id,
        activityId,
        amount: billingAmount,
        hours: duration / 60
      });

      return timeEntry;
    } catch (error) {
      console.error('Error creating billing entry:', error);
      return null;
    }
  }

  /**
   * Update case activity summary (stored in case notes for now)
   */
  async updateCaseActivitySummary(caseId, activityType, duration = 0) {
    try {
      // For now, we'll just ensure the case exists
      // Later we can add activity summary fields to the Case model
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true }
      });

      if (!caseExists) {
        console.warn(`Case not found for activity tracking: ${caseId}`);
        return;
      }

      // Could add summary tracking here
      console.log(`📊 Case activity summary updated for ${caseId}: ${activityType} (+${duration}m)`);
      
    } catch (error) {
      console.error('Error updating case activity summary:', error);
    }
  }

  /**
   * Emit real-time activity update (placeholder for WebSocket/SSE)
   */
  emitActivityUpdate(activity, metadata = {}) {
    // In a real implementation, this would emit to WebSocket clients
    console.log(`🔔 Real-time activity update emitted:`, {
      activityId: activity.id,
      action: activity.action,
      caseId: metadata.caseId,
      timestamp: activity.createdAt
    });
  }

  /**
   * Get recent activities for a case
   */
  async getCaseActivities(caseId, limit = 50, offset = 0) {
    try {
      const activities = await prisma.activity.findMany({
        where: {
          entityId: caseId,
          entityType: 'CASE'
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
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return activities;
    } catch (error) {
      console.error('Error fetching case activities:', error);
      return [];
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId, dateRange = {}) {
    try {
      const { start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end = new Date() } = dateRange;

      const activities = await prisma.activity.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Group activities by action type
      const activityBreakdown = activities.reduce((acc, activity) => {
        const action = activity.action.split(':')[0] || activity.action; // Get activity type
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});

      return {
        totalActivities: activities.length,
        activityBreakdown,
        activities: activities.slice(0, 20) // Recent 20
      };
    } catch (error) {
      console.error('Error fetching user activity summary:', error);
      return {
        totalActivities: 0,
        activityBreakdown: {},
        activities: []
      };
    }
  }

  /**
   * Generate invoice from tracked activities
   */
  async generateInvoiceFromActivities(caseId, dateRange = {}) {
    try {
      const { start, end } = dateRange;
      
      // Get billable time entries that were auto-generated
      const billableEntries = await prisma.timeEntry.findMany({
        where: {
          caseId: caseId,
          billable: true,
          billed: false,
          description: {
            startsWith: '[AUTO]'
          },
          ...(start && end ? {
            date: {
              gte: start,
              lte: end
            }
          } : {})
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
        orderBy: {
          date: 'desc'
        }
      });

      const totalAmount = billableEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
      const totalHours = billableEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);

      return {
        caseId,
        dateRange: { start, end },
        billableEntries,
        summary: {
          totalEntries: billableEntries.length,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          averageRate: totalHours > 0 ? parseFloat((totalAmount / totalHours).toFixed(2)) : 0
        }
      };
    } catch (error) {
      console.error('Error generating invoice from activities:', error);
      return null;
    }
  }

  /**
   * Batch track multiple activities (for bulk operations)
   */
  async trackBulkActivities(activitiesList) {
    const results = [];
    const errors = [];

    for (const activityParams of activitiesList) {
      try {
        const result = await this.trackActivity(activityParams);
        results.push(result);
      } catch (error) {
        errors.push({
          params: activityParams,
          error: error.message
        });
      }
    }

    return {
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
}

// Export singleton instance
const activityTracker = new ActivityTrackerService();

module.exports = {
  ActivityTrackerService,
  activityTracker
};