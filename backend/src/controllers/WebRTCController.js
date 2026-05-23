const WebRTCMeetingService = require('../services/WebRTCMeetingService');
const ApiResponse = require('../lib/apiResponse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class WebRTCController {
  async createMeeting(req, res) {
    try {
      const userId = req.user.id;
      const {
        title,
        description,
        startTime,
        duration,
        meetingType,
        securityLevel,
        participants,
        enableRecording,
        enableChat,
        enableScreenShare,
        requiresApproval
      } = req.body;

      if (!title || !startTime) {
        return ApiResponse.error(res, 'Title and start time are required', 400);
      }

      // Create meeting room
      const room = await WebRTCMeetingService.createRoom({
        title,
        hostId: userId,
        meetingType,
        securityLevel,
        settings: {
          enableRecording: enableRecording !== false,
          enableChat: enableChat !== false,
          enableScreenShare: enableScreenShare !== false,
          requiresApproval: requiresApproval === true
        }
      });

      // Store meeting in database
      const meeting = {
        id: room.roomId,
        title,
        description: description || '',
        hostId: userId,
        startTime: new Date(startTime),
        duration: duration || 60,
        meetingType: meetingType || 'client_consultation',
        securityLevel: securityLevel || 'standard',
        status: 'scheduled',
        participants: participants || [],
        settings: room.settings,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // For demo purposes, we'll return the meeting data directly
      // In production, you would save to database
      return ApiResponse.success(res, meeting, 'Meeting created successfully');

    } catch (error) {
      console.error('Create WebRTC meeting error:', error);
      return ApiResponse.error(res, 'Failed to create meeting', 500, error);
    }
  }

  async getMeetings(req, res) {
    try {
      const userId = req.user.id;
      const { status, meetingType, limit = '50', offset = '0' } = req.query;

      // For demo purposes, return mock data
      // In production, you would query the database
      const meetings = [
        {
          id: `meeting_${Date.now()}_1`,
          title: 'Client Consultation - Personal Injury Case',
          description: 'Initial consultation with client regarding auto accident claim',
          hostId: userId,
          startTime: new Date(Date.now() + 60000 * 30),
          duration: 60,
          meetingType: 'client_consultation',
          securityLevel: 'high',
          status: 'scheduled',
          participants: [
            { id: userId, name: req.user.name, email: req.user.email, role: 'host' },
            { id: 'client_1', name: 'John Smith', email: 'john.smith@email.com', role: 'client' }
          ],
          settings: {
            enableRecording: true,
            enableChat: true,
            enableScreenShare: true,
            requiresApproval: false
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `meeting_${Date.now()}_2`,
          title: 'Weekly Team Strategy Meeting',
          description: 'Review ongoing cases and discuss legal strategies',
          hostId: userId,
          startTime: new Date(Date.now() + 60000 * 120),
          duration: 90,
          meetingType: 'team_meeting',
          securityLevel: 'standard',
          status: 'scheduled',
          participants: [
            { id: userId, name: req.user.name, email: req.user.email, role: 'host' },
            { id: 'colleague_1', name: 'Sarah Johnson', email: 'sarah@firm.com', role: 'participant' },
            { id: 'colleague_2', name: 'Mike Davis', email: 'mike@firm.com', role: 'participant' }
          ],
          settings: {
            enableRecording: false,
            enableChat: true,
            enableScreenShare: true,
            requiresApproval: false
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return ApiResponse.success(res, { 
        meetings: meetings,
        totalCount: meetings.length,
        hasMore: false 
      }, 'Meetings retrieved successfully');

    } catch (error) {
      console.error('Get WebRTC meetings error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meetings', 500, error);
    }
  }

  async getMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Get meeting from service
      const room = WebRTCMeetingService.getRoom(meetingId);
      
      if (!room) {
        return ApiResponse.error(res, 'Meeting not found', 404);
      }

      // Check if user has access to this meeting
      const hasAccess = room.hostId === userId || 
        room.participants.some(p => p.id === userId) ||
        room.settings.securityLevel === 'standard';

      if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      return ApiResponse.success(res, room, 'Meeting details retrieved successfully');

    } catch (error) {
      console.error('Get WebRTC meeting error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meeting details', 500, error);
    }
  }

  async joinMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;
      const { password } = req.body;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Join meeting through service
      const result = await WebRTCMeetingService.joinMeeting(meetingId, {
        id: userId,
        name: req.user.name,
        email: req.user.email
      }, password);

      if (!result.success) {
        return ApiResponse.error(res, result.error, 403);
      }

      return ApiResponse.success(res, {
        roomId: meetingId,
        participant: result.participant,
        room: result.room
      }, 'Joined meeting successfully');

    } catch (error) {
      console.error('Join WebRTC meeting error:', error);
      return ApiResponse.error(res, 'Failed to join meeting', 500, error);
    }
  }

  async leaveMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Leave meeting through service
      const result = await WebRTCMeetingService.leaveMeeting(meetingId, userId);

      if (!result.success) {
        return ApiResponse.error(res, result.error, 400);
      }

      return ApiResponse.success(res, null, 'Left meeting successfully');

    } catch (error) {
      console.error('Leave WebRTC meeting error:', error);
      return ApiResponse.error(res, 'Failed to leave meeting', 500, error);
    }
  }

  async updateMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Update meeting through service
      const result = await WebRTCMeetingService.updateRoom(meetingId, updates, userId);

      if (!result.success) {
        return ApiResponse.error(res, result.error, result.code || 400);
      }

      return ApiResponse.success(res, result.room, 'Meeting updated successfully');

    } catch (error) {
      console.error('Update WebRTC meeting error:', error);
      return ApiResponse.error(res, 'Failed to update meeting', 500, error);
    }
  }

  async deleteMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Delete meeting through service
      const result = await WebRTCMeetingService.deleteRoom(meetingId, userId);

      if (!result.success) {
        return ApiResponse.error(res, result.error, result.code || 400);
      }

      return ApiResponse.success(res, null, 'Meeting deleted successfully');

    } catch (error) {
      console.error('Delete WebRTC meeting error:', error);
      return ApiResponse.error(res, 'Failed to delete meeting', 500, error);
    }
  }

  async startRecording(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Start recording through service
      const result = await WebRTCMeetingService.startRecording(meetingId, userId);

      if (!result.success) {
        return ApiResponse.error(res, result.error, 400);
      }

      return ApiResponse.success(res, {
        recordingId: result.recordingId,
        status: 'recording'
      }, 'Recording started successfully');

    } catch (error) {
      console.error('Start recording error:', error);
      return ApiResponse.error(res, 'Failed to start recording', 500, error);
    }
  }

  async stopRecording(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Stop recording through service
      const result = await WebRTCMeetingService.stopRecording(meetingId, userId);

      if (!result.success) {
        return ApiResponse.error(res, result.error, 400);
      }

      return ApiResponse.success(res, {
        recordingId: result.recordingId,
        filePath: result.filePath,
        duration: result.duration,
        status: 'completed'
      }, 'Recording stopped successfully');

    } catch (error) {
      console.error('Stop recording error:', error);
      return ApiResponse.error(res, 'Failed to stop recording', 500, error);
    }
  }

  async getRecordings(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Get recordings through service
      const result = await WebRTCMeetingService.getRecordings(meetingId, userId);

      if (!result.success) {
        return ApiResponse.error(res, result.error, 400);
      }

      return ApiResponse.success(res, {
        meetingId: meetingId,
        recordings: result.recordings
      }, 'Recordings retrieved successfully');

    } catch (error) {
      console.error('Get recordings error:', error);
      return ApiResponse.error(res, 'Failed to retrieve recordings', 500, error);
    }
  }

  async getMeetingAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { timeRange = '30d' } = req.query;

      // Get analytics through service
      const analytics = await WebRTCMeetingService.getAnalytics(userId, timeRange);

      return ApiResponse.success(res, analytics, 'Analytics retrieved successfully');

    } catch (error) {
      console.error('Get meeting analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve analytics', 500, error);
    }
  }

  async generateMeetingToken(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      if (!meetingId) {
        return ApiResponse.error(res, 'Meeting ID is required', 400);
      }

      // Generate access token for WebRTC signaling
      const token = await WebRTCMeetingService.generateAccessToken(meetingId, userId);

      return ApiResponse.success(res, {
        token: token,
        meetingId: meetingId,
        expiresIn: 3600 // 1 hour
      }, 'Meeting token generated successfully');

    } catch (error) {
      console.error('Generate meeting token error:', error);
      return ApiResponse.error(res, 'Failed to generate meeting token', 500, error);
    }
  }

  async getMeetingConfiguration(req, res) {
    try {
      const configuration = {
        meetingTypes: [
          {
            value: 'client_consultation',
            label: 'Client Consultation',
            description: 'Private meeting with clients',
            defaultSecurity: 'high',
            features: ['recording', 'screenshare', 'chat', 'waiting_room']
          },
          {
            value: 'team_meeting',
            label: 'Team Meeting',
            description: 'Internal team discussions',
            defaultSecurity: 'standard',
            features: ['screenshare', 'chat']
          },
          {
            value: 'deposition',
            label: 'Deposition',
            description: 'Legal deposition with recording',
            defaultSecurity: 'confidential',
            features: ['recording', 'transcription', 'authentication']
          },
          {
            value: 'court_hearing',
            label: 'Court Hearing',
            description: 'Virtual court appearance',
            defaultSecurity: 'confidential',
            features: ['recording', 'authentication', 'waiting_room']
          },
          {
            value: 'mediation',
            label: 'Mediation',
            description: 'Mediation session',
            defaultSecurity: 'high',
            features: ['recording', 'breakout_rooms', 'authentication']
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
            features: ['Waiting room', 'Authentication required', 'Advanced encryption', 'Meeting lock']
          },
          {
            value: 'confidential',
            label: 'Confidential',
            description: 'Maximum security for highly sensitive meetings',
            features: ['Waiting room', 'Multi-factor authentication', 'End-to-end encryption', 'Watermarks', 'Access logging']
          }
        ],
        limits: {
          maxParticipants: 50,
          maxDuration: 480, // 8 hours
          maxRecordingSize: '10GB',
          supportedFormats: ['WebM', 'MP4', 'Audio-only MP3']
        },
        features: {
          recording: {
            formats: ['webm', 'mp4', 'mp3'],
            maxDuration: 480,
            autoTranscription: true
          },
          screenshare: {
            enabled: true,
            quality: ['720p', '1080p'],
            frameRate: [15, 30]
          },
          chat: {
            enabled: true,
            fileSharing: true,
            maxFileSize: '50MB'
          }
        }
      };

      return ApiResponse.success(res, configuration, 'Meeting configuration retrieved successfully');

    } catch (error) {
      console.error('Get meeting configuration error:', error);
      return ApiResponse.error(res, 'Failed to retrieve meeting configuration', 500, error);
    }
  }
}

module.exports = new WebRTCController();