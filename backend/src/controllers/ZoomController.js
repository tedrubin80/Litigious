const zoomIntegrationService = require('../services/ZoomIntegrationService');
const ApiResponse = require('../lib/apiResponse');

class ZoomController {
  /**
   * Create a new Zoom meeting
   */
  async createMeeting(req, res) {
    try {
      const userId = req.user.id;
      const {
        caseId,
        title,
        description,
        startTime,
        duration,
        meetingType,
        securityLevel,
        participants,
        settings
      } = req.body;

      if (!title || !startTime) {
        return ApiResponse.error(res, 'Title and start time are required', 400);
      }

      const meetingData = {
        userId,
        caseId,
        title,
        description,
        startTime,
        duration,
        meetingType,
        securityLevel,
        participants: participants || [],
        settings: settings || {}
      };

      // Create mock meeting for demo purposes
      const mockMeeting = {
        id: Date.now().toString(),
        meetingNumber: Math.random().toString().slice(2, 12),
        joinUrl: `https://zoom.us/j/${Math.random().toString().slice(2, 12)}`,
        hostKey: Math.random().toString().slice(2, 8),
        password: Math.random().toString(36).slice(2, 8),
        ...meetingData,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      return ApiResponse.success(res, mockMeeting, 'Zoom meeting created successfully');

    } catch (error) {
      console.error('Create Zoom meeting error:', error);
      return ApiResponse.error(res, 'Failed to create Zoom meeting', 500, error);
    }
  }

  /**
   * Generate Meeting SDK signature for client-side integration
   */
  async generateSDKSignature(req, res) {
    try {
      const {
        meetingNumber,
        role,
        userEmail,
        userName,
        expiry
      } = req.body;

      if (!meetingNumber) {
        return ApiResponse.error(res, 'Meeting number is required', 400);
      }

      const signatureData = {
        meetingNumber,
        role: role || 0,
        userEmail: userEmail || req.user.email || '',
        userName: userName || req.user.name || '',
        expiry
      };

      const result = zoomIntegrationService.generateMeetingSDKSignature(signatureData);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Meeting SDK signature generated successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Generate SDK signature error:', error);
      return ApiResponse.error(res, 'Failed to generate SDK signature', 500, error);
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(req, res) {
    try {
      const { meetingId } = req.params;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      const result = await zoomIntegrationService.getMeeting(meetingId);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Meeting details retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 404, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get Zoom meeting error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meeting details', 500, error);
    }
  }

  /**
   * Update meeting
   */
  async updateMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const updates = req.body;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      const result = await zoomIntegrationService.updateMeeting(meetingId, updates);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Meeting updated successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Update Zoom meeting error:', error);
      return ApiResponse.error(res, 'Failed to update meeting', 500, error);
    }
  }

  /**
   * Cancel/Delete meeting
   */
  async deleteMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      const result = await zoomIntegrationService.deleteMeeting(meetingId, userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Meeting cancelled successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Delete Zoom meeting error:', error);
      return ApiResponse.error(res, 'Failed to cancel meeting', 500, error);
    }
  }

  /**
   * List user's meetings
   */
  async listMeetings(req, res) {
    try {
      const userId = req.user.id;
      const {
        limit = '50',
        offset = '0',
        status = 'all',
        caseId,
        meetingType
      } = req.query;

      // Return mock data for demo purposes
      const mockMeetings = {
        meetings: [],
        totalCount: 0,
        hasMore: false
      };

      return ApiResponse.success(res, mockMeetings, 'Meetings retrieved successfully');

    } catch (error) {
      console.error('List Zoom meetings error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meetings', 500, error);
    }
  }

  /**
   * Get meeting types and security levels
   */
  async getMeetingConfiguration(req, res) {
    try {
      const configuration = {
        meetingTypes: [
          {
            value: 'client_consultation',
            label: 'Client Consultation',
            description: 'Private meeting with clients',
            defaultSecurity: 'standard'
          },
          {
            value: 'team_meeting',
            label: 'Team Meeting',
            description: 'Internal team discussions',
            defaultSecurity: 'standard'
          },
          {
            value: 'deposition',
            label: 'Deposition',
            description: 'Legal deposition with recording',
            defaultSecurity: 'high'
          },
          {
            value: 'court_hearing',
            label: 'Court Hearing',
            description: 'Virtual court appearance',
            defaultSecurity: 'confidential'
          },
          {
            value: 'case_review',
            label: 'Case Review',
            description: 'Case discussion and planning',
            defaultSecurity: 'standard'
          },
          {
            value: 'discovery_meeting',
            label: 'Discovery Meeting',
            description: 'Discovery phase discussions',
            defaultSecurity: 'high'
          },
          {
            value: 'mediation',
            label: 'Mediation',
            description: 'Mediation session',
            defaultSecurity: 'high'
          },
          {
            value: 'arbitration',
            label: 'Arbitration',
            description: 'Arbitration hearing',
            defaultSecurity: 'confidential'
          }
        ],
        securityLevels: [
          {
            value: 'standard',
            label: 'Standard Security',
            description: 'Basic security settings',
            features: ['Password protection', 'Basic encryption']
          },
          {
            value: 'high',
            label: 'High Security',
            description: 'Enhanced security for sensitive meetings',
            features: ['Waiting room', 'Login required', 'Cloud recording', 'Meeting authentication']
          },
          {
            value: 'confidential',
            label: 'Confidential',
            description: 'Maximum security for highly sensitive meetings',
            features: ['Waiting room', 'Login required', 'Watermark', 'Private meeting', 'No screen sharing']
          }
        ]
      };

      return ApiResponse.success(res, configuration, 'Meeting configuration retrieved successfully');

    } catch (error) {
      console.error('Get meeting configuration error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meeting configuration', 500, error);
    }
  }

  /**
   * Handle Zoom webhooks
   */
  async handleWebhook(req, res) {
    try {
      const payload = JSON.stringify(req.body);
      const signature = req.headers['x-zm-signature'];

      const result = await zoomIntegrationService.handleWebhook(payload, signature);

      if (result.success) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ success: false, error: result.error });
      }

    } catch (error) {
      console.error('Handle Zoom webhook error:', error);
      return res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
  }

  /**
   * Get meeting analytics
   */
  async getMeetingAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { timeRange = '30d' } = req.query;

      // This would include analytics like:
      // - Total meetings created/completed
      // - Average meeting duration
      // - Most used meeting types
      // - Security level usage
      // - Recording statistics

      const mockAnalytics = {
        summary: {
          totalMeetings: 45,
          completedMeetings: 42,
          cancelledMeetings: 3,
          totalDuration: 2340, // minutes
          averageDuration: 52
        },
        meetingTypes: {
          client_consultation: 18,
          team_meeting: 12,
          deposition: 8,
          case_review: 7
        },
        securityLevels: {
          standard: 22,
          high: 15,
          confidential: 8
        },
        monthlyTrend: [
          { month: 'Jan', meetings: 12 },
          { month: 'Feb', meetings: 15 },
          { month: 'Mar', meetings: 18 }
        ]
      };

      return ApiResponse.success(res, mockAnalytics, 'Meeting analytics retrieved successfully');

    } catch (error) {
      console.error('Get meeting analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meeting analytics', 500, error);
    }
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(req, res) {
    try {
      const { meetingId } = req.params;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Get recordings from database
      const recordings = await prisma.zoomRecording.findMany({
        where: { meetingId: meetingId },
        orderBy: { createdAt: 'desc' }
      });

      return ApiResponse.success(res, {
        meetingId: meetingId,
        recordings: recordings,
        count: recordings.length
      }, 'Meeting recordings retrieved successfully');

    } catch (error) {
      console.error('Get meeting recordings error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meeting recordings', 500, error);
    }
  }

  /**
   * Schedule recurring meeting
   */
  async createRecurringMeeting(req, res) {
    try {
      const userId = req.user.id;
      const {
        title,
        description,
        startTime,
        duration,
        recurrencePattern,
        endDate,
        meetingType,
        securityLevel,
        participants
      } = req.body;

      if (!title || !startTime || !recurrencePattern) {
        return ApiResponse.error(res, 'Title, start time, and recurrence pattern are required', 400);
      }

      // This would create multiple meetings based on recurrence pattern
      // For now, return a mock response
      const recurringMeetingData = {
        seriesId: `series_${Date.now()}`,
        totalMeetings: 10, // Based on recurrence pattern
        meetings: [], // Array of created meetings
        recurrencePattern: recurrencePattern
      };

      return ApiResponse.success(res, recurringMeetingData, 'Recurring meetings created successfully');

    } catch (error) {
      console.error('Create recurring meeting error:', error);
      return ApiResponse.error(res, 'Failed to create recurring meetings', 500, error);
    }
  }
}

module.exports = new ZoomController();