const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const axios = require('axios');

/**
 * Zoom Integration Service
 * 
 * Provides comprehensive Zoom integration for legal video conferencing:
 * - Create and manage Zoom meetings
 * - Generate Zoom Meeting SDK signatures
 * - Handle webhooks for meeting events
 * - Client consultation scheduling
 * - Deposition and hearing management
 * - Recording management and transcription
 * - Breakout rooms for team collaboration
 * - Secure legal meeting configurations
 */
class ZoomIntegrationService {
  constructor() {
    this.zoomApiBaseUrl = 'https://api.zoom.us/v2';
    this.zoomAccountId = process.env.ZOOM_ACCOUNT_ID;
    this.zoomClientId = process.env.ZOOM_CLIENT_ID;
    this.zoomClientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.zoomWebhookSecret = process.env.ZOOM_WEBHOOK_SECRET;
    
    // Legal-specific meeting configurations
    this.MEETING_TYPES = {
      CLIENT_CONSULTATION: 'client_consultation',
      TEAM_MEETING: 'team_meeting',
      DEPOSITION: 'deposition',
      COURT_HEARING: 'court_hearing',
      CASE_REVIEW: 'case_review',
      DISCOVERY_MEETING: 'discovery_meeting',
      MEDIATION: 'mediation',
      ARBITRATION: 'arbitration'
    };

    this.SECURITY_LEVELS = {
      STANDARD: 'standard',
      HIGH: 'high',
      CONFIDENTIAL: 'confidential'
    };

    // Access token cache
    this.accessToken = null;
    this.tokenExpiry = null;

    console.log('🎥 Zoom Integration Service initialized');
  }

  /**
   * Get OAuth access token for Zoom API
   */
  async getAccessToken() {
    try {
      // Check if we have a valid cached token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Generate new token
      const credentials = Buffer.from(`${this.zoomClientId}:${this.zoomClientSecret}`).toString('base64');
      
      const response = await axios.post('https://zoom.us/oauth/token', new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: this.zoomAccountId
      }), {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = response.data;
      
      // Cache the token
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000); // Refresh 1 minute early
      
      return this.accessToken;

    } catch (error) {
      console.error('Zoom access token error:', error);
      throw new Error('Failed to obtain Zoom access token');
    }
  }

  /**
   * Make authenticated API request to Zoom
   */
  async makeZoomApiRequest(endpoint, method = 'GET', body = null) {
    try {
      const accessToken = await this.getAccessToken();
      
      const config = {
        method: method,
        url: `${this.zoomApiBaseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (body && (method === 'POST' || method === 'PATCH')) {
        config.data = body;
      }

      const response = await axios(config);
      return response.data;

    } catch (error) {
      console.error('Zoom API request error:', error);
      throw error;
    }
  }

  /**
   * Create a Zoom meeting for legal purposes
   */
  async createMeeting(meetingData) {
    try {
      const {
        userId,
        caseId,
        title,
        description,
        startTime,
        duration = 60,
        meetingType = this.MEETING_TYPES.CLIENT_CONSULTATION,
        securityLevel = this.SECURITY_LEVELS.STANDARD,
        participants = [],
        settings = {}
      } = meetingData;

      // Get security settings based on level
      const securitySettings = this.getSecuritySettings(securityLevel);
      
      // Create meeting payload
      const meetingPayload = {
        topic: title,
        type: 2, // Scheduled meeting
        start_time: new Date(startTime).toISOString(),
        duration: duration,
        timezone: 'UTC',
        agenda: description,
        settings: {
          ...securitySettings,
          ...settings,
          auto_recording: securityLevel === this.SECURITY_LEVELS.CONFIDENTIAL ? 'cloud' : 'none'
        }
      };

      // Create meeting via Zoom API
      const zoomMeeting = await this.makeZoomApiRequest('/users/me/meetings', 'POST', meetingPayload);

      // Save meeting to database
      const dbMeeting = await prisma.zoomMeeting.create({
        data: {
          meetingId: zoomMeeting.id.toString(),
          userId: userId,
          caseId: caseId,
          title: title,
          description: description,
          startTime: new Date(startTime),
          duration: duration,
          meetingType: meetingType,
          securityLevel: securityLevel,
          joinUrl: zoomMeeting.join_url,
          meetingNumber: zoomMeeting.id.toString(),
          hostKey: zoomMeeting.host_key || '',
          password: zoomMeeting.password || '',
          settings: JSON.stringify(meetingPayload.settings),
          zoomResponse: JSON.stringify(zoomMeeting),
          status: 'scheduled'
        }
      });

      // Add participants if provided
      if (participants && participants.length > 0) {
        await Promise.all(participants.map(participant =>
          prisma.zoomMeetingParticipant.create({
            data: {
              meetingId: dbMeeting.id,
              email: participant.email,
              name: participant.name,
              role: participant.role || 'attendee'
            }
          })
        ));
      }

      return {
        success: true,
        data: {
          ...dbMeeting,
          zoomMeetingId: zoomMeeting.id,
          joinUrl: zoomMeeting.join_url,
          startUrl: zoomMeeting.start_url
        }
      };

    } catch (error) {
      console.error('Create Zoom meeting error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'MEETING_CREATION_FAILED'
      };
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId) {
    try {
      const meeting = await prisma.zoomMeeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true,
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!meeting) {
        return {
          success: false,
          error: 'Meeting not found',
          errorCode: 'MEETING_NOT_FOUND'
        };
      }

      // Get live meeting info from Zoom
      try {
        const zoomMeeting = await this.makeZoomApiRequest(`/meetings/${meeting.meetingNumber}`);
        meeting.zoomStatus = zoomMeeting.status;
      } catch (zoomError) {
        // Meeting might be deleted from Zoom, use database status
        meeting.zoomStatus = meeting.status;
      }

      return {
        success: true,
        data: meeting
      };

    } catch (error) {
      console.error('Get meeting error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'MEETING_RETRIEVAL_FAILED'
      };
    }
  }

  /**
   * Update meeting
   */
  async updateMeeting(meetingId, updates) {
    try {
      const meeting = await prisma.zoomMeeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        return {
          success: false,
          error: 'Meeting not found',
          errorCode: 'MEETING_NOT_FOUND'
        };
      }

      // Update in Zoom
      const zoomUpdates = {};
      if (updates.title) zoomUpdates.topic = updates.title;
      if (updates.description) zoomUpdates.agenda = updates.description;
      if (updates.startTime) zoomUpdates.start_time = new Date(updates.startTime).toISOString();
      if (updates.duration) zoomUpdates.duration = updates.duration;

      if (Object.keys(zoomUpdates).length > 0) {
        await this.makeZoomApiRequest(`/meetings/${meeting.meetingNumber}`, 'PATCH', zoomUpdates);
      }

      // Update in database
      const updatedMeeting = await prisma.zoomMeeting.update({
        where: { id: meetingId },
        data: {
          title: updates.title || meeting.title,
          description: updates.description || meeting.description,
          startTime: updates.startTime ? new Date(updates.startTime) : meeting.startTime,
          duration: updates.duration || meeting.duration,
          meetingType: updates.meetingType || meeting.meetingType,
          securityLevel: updates.securityLevel || meeting.securityLevel,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: updatedMeeting
      };

    } catch (error) {
      console.error('Update meeting error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'MEETING_UPDATE_FAILED'
      };
    }
  }

  /**
   * Delete/Cancel meeting
   */
  async deleteMeeting(meetingId, userId) {
    try {
      const meeting = await prisma.zoomMeeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) {
        return {
          success: false,
          error: 'Meeting not found',
          errorCode: 'MEETING_NOT_FOUND'
        };
      }

      if (meeting.userId !== userId) {
        return {
          success: false,
          error: 'Access denied',
          errorCode: 'ACCESS_DENIED'
        };
      }

      // Delete from Zoom
      try {
        await this.makeZoomApiRequest(`/meetings/${meeting.meetingNumber}`, 'DELETE');
      } catch (zoomError) {
        console.log('Meeting already deleted from Zoom or API error:', zoomError);
      }

      // Update status in database
      await prisma.zoomMeeting.update({
        where: { id: meetingId },
        data: { 
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        data: { message: 'Meeting cancelled successfully' }
      };

    } catch (error) {
      console.error('Delete meeting error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'MEETING_DELETION_FAILED'
      };
    }
  }

  /**
   * List user meetings
   */
  async listMeetings(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        status = 'all',
        caseId,
        meetingType
      } = options;

      const where = {
        userId: userId,
        ...(status !== 'all' ? { status: status } : {}),
        ...(caseId ? { caseId: caseId } : {}),
        ...(meetingType ? { meetingType: meetingType } : {})
      };

      const meetings = await prisma.zoomMeeting.findMany({
        where: where,
        include: {
          participants: true,
          case: {
            select: { id: true, clientName: true, caseNumber: true }
          }
        },
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.zoomMeeting.count({ where });

      return {
        success: true,
        data: {
          meetings: meetings,
          pagination: {
            total: total,
            limit: limit,
            offset: offset,
            hasMore: offset + meetings.length < total
          }
        }
      };

    } catch (error) {
      console.error('List meetings error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'MEETINGS_LIST_FAILED'
      };
    }
  }

  /**
   * Generate Meeting SDK signature for client-side integration
   */
  generateMeetingSDKSignature(signatureData) {
    try {
      const {
        meetingNumber,
        role = 0,
        userEmail = '',
        userName = '',
        expiry
      } = signatureData;

      const iat = Math.round(new Date().getTime() / 1000) - 30;
      const exp = expiry || iat + 60 * 60 * 2; // 2 hours

      const payload = {
        iss: this.zoomClientId,
        alg: 'HS256',
        iat: iat,
        exp: exp,
        aud: 'zoom',
        appKey: this.zoomClientId,
        tokenExp: exp,
        alg: 'HS256',
        meeting_number: meetingNumber,
        role: role,
        user_email: userEmail,
        user_name: userName
      };

      const signature = jwt.sign(payload, this.zoomClientSecret);

      return {
        success: true,
        data: {
          signature: signature,
          meetingNumber: meetingNumber,
          role: role,
          userEmail: userEmail,
          userName: userName,
          expiry: exp
        }
      };

    } catch (error) {
      console.error('Generate SDK signature error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'SDK_SIGNATURE_FAILED'
      };
    }
  }

  /**
   * Handle Zoom webhooks
   */
  async handleWebhook(payload, signature) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        return {
          success: false,
          error: 'Invalid webhook signature',
          errorCode: 'INVALID_SIGNATURE'
        };
      }

      const data = JSON.parse(payload);
      const event = data.event;

      switch (event) {
        case 'meeting.started':
          await this.handleMeetingStarted(data.payload);
          break;
        case 'meeting.ended':
          await this.handleMeetingEnded(data.payload);
          break;
        case 'recording.completed':
          await this.handleRecordingCompleted(data.payload);
          break;
        default:
          console.log('Unhandled webhook event:', event);
      }

      return { success: true };

    } catch (error) {
      console.error('Webhook handling error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'WEBHOOK_PROCESSING_FAILED'
      };
    }
  }

  /**
   * Get security settings based on level
   */
  getSecuritySettings(securityLevel) {
    switch (securityLevel) {
      case this.SECURITY_LEVELS.HIGH:
        return {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          registration_type: 1,
          audio: 'both',
          auto_recording: 'cloud',
          enforce_login: true,
          waiting_room: true
        };
      
      case this.SECURITY_LEVELS.CONFIDENTIAL:
        return {
          host_video: true,
          participant_video: false,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: true,
          use_pmi: false,
          approval_type: 1, // Manually approve
          registration_type: 3,
          audio: 'both',
          auto_recording: 'cloud',
          enforce_login: true,
          waiting_room: true,
          meeting_authentication: true,
          private_meeting: true
        };
      
      default: // STANDARD
        return {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          watermark: false,
          use_pmi: false,
          approval_type: 0,
          registration_type: 1,
          audio: 'both',
          auto_recording: 'none',
          enforce_login: false,
          waiting_room: false
        };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.zoomWebhookSecret || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.zoomWebhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Handle meeting started webhook
   */
  async handleMeetingStarted(payload) {
    try {
      await prisma.zoomMeeting.updateMany({
        where: { meetingNumber: payload.object.id.toString() },
        data: { 
          status: 'in_progress',
          actualStartTime: new Date()
        }
      });
    } catch (error) {
      console.error('Handle meeting started error:', error);
    }
  }

  /**
   * Handle meeting ended webhook
   */
  async handleMeetingEnded(payload) {
    try {
      await prisma.zoomMeeting.updateMany({
        where: { meetingNumber: payload.object.id.toString() },
        data: { 
          status: 'ended',
          actualEndTime: new Date(),
          actualDuration: payload.object.duration || 0
        }
      });
    } catch (error) {
      console.error('Handle meeting ended error:', error);
    }
  }

  /**
   * Handle recording completed webhook
   */
  async handleRecordingCompleted(payload) {
    try {
      const meetingId = payload.object.id.toString();
      const recordings = payload.object.recording_files || [];

      for (const recording of recordings) {
        await prisma.zoomRecording.create({
          data: {
            meetingId: meetingId,
            recordingId: recording.id,
            meetingUuid: payload.object.uuid,
            recordingType: recording.recording_type,
            fileName: recording.file_name,
            fileSize: recording.file_size,
            downloadUrl: recording.download_url,
            playUrl: recording.play_url,
            status: recording.status,
            recordingStart: new Date(recording.recording_start),
            recordingEnd: new Date(recording.recording_end)
          }
        });
      }
    } catch (error) {
      console.error('Handle recording completed error:', error);
    }
  }
}

module.exports = new ZoomIntegrationService();