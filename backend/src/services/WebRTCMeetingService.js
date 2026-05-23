const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const FFmpegService = require('./FFmpegService');

class WebRTCMeetingService extends EventEmitter {
  constructor() {
    super();
    this.meetingRooms = new Map();
    this.participants = new Map();
    this.recordings = new Map();
    this.initializeService();
  }

  initializeService() {
    console.log('📹 Self-Hosted WebRTC Meeting Service initialized');
    
    // Clean up old rooms every 30 minutes
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 30 * 60 * 1000);
  }

  /**
   * Create a new meeting room
   */
  createMeetingRoom(meetingData) {
    try {
      const roomId = uuidv4();
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const hostKey = Math.random().toString(36).substring(2, 12);
      
      const meetingRoom = {
        id: roomId,
        accessCode,
        hostKey,
        title: meetingData.title,
        description: meetingData.description,
        hostId: meetingData.hostId,
        caseId: meetingData.caseId,
        meetingType: meetingData.meetingType || 'client_consultation',
        securityLevel: meetingData.securityLevel || 'standard',
        maxParticipants: meetingData.maxParticipants || 10,
        isRecording: false,
        recordingPath: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        endedAt: null,
        status: 'waiting', // waiting, active, ended
        settings: {
          waitingRoom: meetingData.securityLevel === 'high' || meetingData.securityLevel === 'confidential',
          requireAuth: meetingData.securityLevel === 'confidential',
          allowScreenShare: meetingData.securityLevel !== 'confidential',
          allowChat: true,
          allowRecording: meetingData.allowRecording !== false,
          muteOnJoin: true,
          lockRoom: false,
          ...meetingData.settings
        },
        participants: new Map(),
        waitingParticipants: new Map(),
        chatHistory: [],
        recordings: [],
        screenShares: new Map()
      };

      this.meetingRooms.set(roomId, meetingRoom);

      return {
        success: true,
        data: {
          roomId,
          accessCode,
          hostKey,
          joinUrl: `/meeting/${roomId}`,
          hostUrl: `/meeting/${roomId}?host=${hostKey}`,
          ...meetingRoom
        }
      };
    } catch (error) {
      console.error('Error creating meeting room:', error);
      return {
        success: false,
        error: 'Failed to create meeting room'
      };
    }
  }

  /**
   * Join a meeting room
   */
  joinMeetingRoom(roomId, participantData) {
    try {
      const room = this.meetingRooms.get(roomId);
      if (!room) {
        return {
          success: false,
          error: 'Meeting room not found'
        };
      }

      // Check if room is locked
      if (room.settings.lockRoom && !participantData.isHost) {
        return {
          success: false,
          error: 'Meeting room is locked'
        };
      }

      // Check max participants
      if (room.participants.size >= room.maxParticipants && !participantData.isHost) {
        return {
          success: false,
          error: 'Meeting room is full'
        };
      }

      const participantId = uuidv4();
      const participant = {
        id: participantId,
        socketId: participantData.socketId,
        name: participantData.name,
        email: participantData.email,
        isHost: participantData.isHost || false,
        isGuest: !participantData.email,
        joinedAt: new Date().toISOString(),
        audioEnabled: !room.settings.muteOnJoin,
        videoEnabled: true,
        isScreenSharing: false,
        handsRaised: false,
        connectionStatus: 'connecting'
      };

      // Handle waiting room
      if (room.settings.waitingRoom && !participant.isHost) {
        room.waitingParticipants.set(participantId, participant);
        
        // Notify host about waiting participant
        this.notifyHost(roomId, 'participant_waiting', {
          participant: this.sanitizeParticipant(participant)
        });

        return {
          success: true,
          data: {
            status: 'waiting',
            message: 'Waiting for host to admit you to the meeting',
            participantId
          }
        };
      }

      // Add to active participants
      room.participants.set(participantId, participant);
      this.participants.set(participantId, { roomId, participant });

      // Start meeting if host joins
      if (participant.isHost && room.status === 'waiting') {
        room.status = 'active';
        room.startedAt = new Date().toISOString();
      }

      // Notify other participants
      this.broadcastToRoom(roomId, 'participant_joined', {
        participant: this.sanitizeParticipant(participant),
        roomInfo: this.getRoomInfo(roomId)
      }, participantId);

      // Add welcome message to chat
      if (!participant.isHost) {
        this.addChatMessage(roomId, {
          type: 'system',
          message: `${participant.name} joined the meeting`,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: {
          participantId,
          roomInfo: this.getRoomInfo(roomId),
          participants: Array.from(room.participants.values()).map(p => this.sanitizeParticipant(p)),
          chatHistory: room.chatHistory.slice(-50), // Last 50 messages
          isHost: participant.isHost
        }
      };
    } catch (error) {
      console.error('Error joining meeting room:', error);
      return {
        success: false,
        error: 'Failed to join meeting room'
      };
    }
  }

  /**
   * Leave meeting room
   */
  leaveMeetingRoom(participantId) {
    try {
      const participantInfo = this.participants.get(participantId);
      if (!participantInfo) {
        return { success: true }; // Already left
      }

      const { roomId, participant } = participantInfo;
      const room = this.meetingRooms.get(roomId);
      
      if (room) {
        // Remove from active participants
        room.participants.delete(participantId);
        
        // Remove from waiting participants if there
        room.waitingParticipants.delete(participantId);

        // Stop screen share if active
        if (participant.isScreenSharing) {
          room.screenShares.delete(participantId);
          this.broadcastToRoom(roomId, 'screen_share_stopped', {
            participantId,
            participantName: participant.name
          });
        }

        // Add leave message to chat
        this.addChatMessage(roomId, {
          type: 'system',
          message: `${participant.name} left the meeting`,
          timestamp: new Date().toISOString()
        });

        // Notify other participants
        this.broadcastToRoom(roomId, 'participant_left', {
          participantId,
          participantName: participant.name,
          roomInfo: this.getRoomInfo(roomId)
        });

        // End meeting if host leaves and no other hosts
        if (participant.isHost) {
          const hasOtherHosts = Array.from(room.participants.values())
            .some(p => p.isHost && p.id !== participantId);
          
          if (!hasOtherHosts && room.participants.size > 0) {
            // Transfer host to first participant
            const firstParticipant = Array.from(room.participants.values())[0];
            if (firstParticipant) {
              firstParticipant.isHost = true;
              this.broadcastToRoom(roomId, 'host_changed', {
                newHostId: firstParticipant.id,
                newHostName: firstParticipant.name
              });
            }
          }
        }

        // Clean up room if empty
        if (room.participants.size === 0 && room.waitingParticipants.size === 0) {
          this.endMeetingRoom(roomId);
        }
      }

      this.participants.delete(participantId);

      return { success: true };
    } catch (error) {
      console.error('Error leaving meeting room:', error);
      return {
        success: false,
        error: 'Failed to leave meeting room'
      };
    }
  }

  /**
   * Admit participant from waiting room
   */
  admitParticipant(roomId, participantId, hostParticipantId) {
    try {
      const room = this.meetingRooms.get(roomId);
      if (!room) {
        return { success: false, error: 'Meeting room not found' };
      }

      const hostInfo = this.participants.get(hostParticipantId);
      if (!hostInfo || !hostInfo.participant.isHost) {
        return { success: false, error: 'Only hosts can admit participants' };
      }

      const waitingParticipant = room.waitingParticipants.get(participantId);
      if (!waitingParticipant) {
        return { success: false, error: 'Participant not found in waiting room' };
      }

      // Move from waiting to active
      room.waitingParticipants.delete(participantId);
      room.participants.set(participantId, waitingParticipant);
      this.participants.set(participantId, { roomId, participant: waitingParticipant });

      // Notify participant they've been admitted
      this.emit('participant_admitted', {
        roomId,
        participantId,
        roomInfo: this.getRoomInfo(roomId),
        participants: Array.from(room.participants.values()).map(p => this.sanitizeParticipant(p))
      });

      // Notify room about new participant
      this.broadcastToRoom(roomId, 'participant_joined', {
        participant: this.sanitizeParticipant(waitingParticipant),
        roomInfo: this.getRoomInfo(roomId)
      }, participantId);

      return { success: true };
    } catch (error) {
      console.error('Error admitting participant:', error);
      return { success: false, error: 'Failed to admit participant' };
    }
  }

  /**
   * Start recording
   */
  async startRecording(roomId, hostParticipantId) {
    try {
      const room = this.meetingRooms.get(roomId);
      if (!room) {
        return { success: false, error: 'Meeting room not found' };
      }

      const hostInfo = this.participants.get(hostParticipantId);
      if (!hostInfo || !hostInfo.participant.isHost) {
        return { success: false, error: 'Only hosts can start recording' };
      }

      if (!room.settings.allowRecording) {
        return { success: false, error: 'Recording not allowed for this meeting' };
      }

      if (room.isRecording) {
        return { success: false, error: 'Recording already in progress' };
      }

      // Start FFmpeg recording
      const recordingResult = await FFmpegService.startRecording(roomId, {
        settings: {
          video: {
            resolution: room.settings.recordingQuality || '1920x1080',
            bitrate: '2000k',
            fps: 30
          },
          audio: {
            bitrate: '128k',
            sampleRate: 44100
          }
        }
      });

      if (!recordingResult.success) {
        return {
          success: false,
          error: recordingResult.error
        };
      }

      const recordingId = recordingResult.recordingId;
      
      room.isRecording = true;
      room.currentRecording = {
        id: recordingId,
        path: recordingResult.outputPath,
        startedAt: new Date().toISOString(),
        startedBy: hostInfo.participant.name
      };

      // Store recording info
      this.recordings.set(recordingId, {
        id: recordingId,
        roomId: roomId,
        filePath: recordingResult.outputPath,
        startedAt: new Date(),
        startedBy: hostInfo.participant.name,
        status: 'recording'
      });

      // Notify all participants
      this.broadcastToRoom(roomId, 'recording_started', {
        recordingId,
        startedBy: hostInfo.participant.name,
        timestamp: new Date().toISOString()
      });

      // Add system message
      this.addChatMessage(roomId, {
        type: 'system',
        message: 'Recording started',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        recordingId: recordingId,
        outputPath: recordingResult.outputPath
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      return { success: false, error: 'Failed to start recording' };
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(roomId, hostParticipantId) {
    try {
      const room = this.meetingRooms.get(roomId);
      if (!room || !room.isRecording) {
        return { success: false, error: 'No active recording' };
      }

      const hostInfo = this.participants.get(hostParticipantId);
      if (!hostInfo || !hostInfo.participant.isHost) {
        return { success: false, error: 'Only hosts can stop recording' };
      }

      // Stop FFmpeg recording
      const stopResult = await FFmpegService.stopRecording(roomId);
      
      if (!stopResult.success) {
        return {
          success: false,
          error: stopResult.error
        };
      }

      const recording = room.currentRecording;
      recording.endedAt = new Date().toISOString();
      recording.duration = stopResult.duration;
      recording.fileSize = stopResult.fileSize;
      recording.status = 'completed';

      // Update recording in storage
      if (this.recordings.has(recording.id)) {
        const storedRecording = this.recordings.get(recording.id);
        storedRecording.endedAt = new Date();
        storedRecording.duration = stopResult.duration;
        storedRecording.fileSize = stopResult.fileSize;
        storedRecording.status = 'completed';
      }

      room.recordings.push(recording);
      room.isRecording = false;
      room.currentRecording = null;

      // Notify all participants
      this.broadcastToRoom(roomId, 'recording_stopped', {
        recordingId: recording.id,
        duration: recording.duration,
        filePath: stopResult.filePath,
        timestamp: recording.endedAt
      });

      // Add system message
      this.addChatMessage(roomId, {
        type: 'system',
        message: 'Recording stopped',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        recordingId: recording.id,
        filePath: stopResult.filePath,
        duration: stopResult.duration,
        fileSize: stopResult.fileSize
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { success: false, error: 'Failed to stop recording' };
    }
  }

  /**
   * Add chat message
   */
  addChatMessage(roomId, messageData) {
    const room = this.meetingRooms.get(roomId);
    if (!room) return;

    const message = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...messageData
    };

    room.chatHistory.push(message);

    // Keep only last 200 messages
    if (room.chatHistory.length > 200) {
      room.chatHistory = room.chatHistory.slice(-200);
    }

    // Broadcast to all participants
    this.broadcastToRoom(roomId, 'chat_message', message);
  }

  /**
   * Toggle participant audio/video
   */
  toggleParticipantMedia(roomId, participantId, mediaType, enabled) {
    try {
      const room = this.meetingRooms.get(roomId);
      if (!room) return { success: false, error: 'Room not found' };

      const participant = room.participants.get(participantId);
      if (!participant) return { success: false, error: 'Participant not found' };

      if (mediaType === 'audio') {
        participant.audioEnabled = enabled;
      } else if (mediaType === 'video') {
        participant.videoEnabled = enabled;
      }

      // Notify other participants
      this.broadcastToRoom(roomId, 'participant_media_changed', {
        participantId,
        mediaType,
        enabled,
        participantName: participant.name
      }, participantId);

      return { success: true };
    } catch (error) {
      console.error('Error toggling media:', error);
      return { success: false, error: 'Failed to toggle media' };
    }
  }

  /**
   * Get room information
   */
  getRoomInfo(roomId) {
    const room = this.meetingRooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      title: room.title,
      status: room.status,
      participantCount: room.participants.size,
      waitingCount: room.waitingParticipants.size,
      isRecording: room.isRecording,
      startedAt: room.startedAt,
      settings: room.settings,
      meetingType: room.meetingType,
      securityLevel: room.securityLevel
    };
  }

  /**
   * Sanitize participant data for client
   */
  sanitizeParticipant(participant) {
    return {
      id: participant.id,
      name: participant.name,
      isHost: participant.isHost,
      isGuest: participant.isGuest,
      audioEnabled: participant.audioEnabled,
      videoEnabled: participant.videoEnabled,
      isScreenSharing: participant.isScreenSharing,
      handsRaised: participant.handsRaised,
      joinedAt: participant.joinedAt
    };
  }

  /**
   * Broadcast message to all participants in room
   */
  broadcastToRoom(roomId, event, data, excludeParticipantId = null) {
    const room = this.meetingRooms.get(roomId);
    if (!room) return;

    room.participants.forEach((participant) => {
      if (participant.id !== excludeParticipantId) {
        this.emit('room_broadcast', {
          socketId: participant.socketId,
          event,
          data
        });
      }
    });
  }

  /**
   * Notify host about events
   */
  notifyHost(roomId, event, data) {
    const room = this.meetingRooms.get(roomId);
    if (!room) return;

    const hosts = Array.from(room.participants.values()).filter(p => p.isHost);
    hosts.forEach(host => {
      this.emit('room_broadcast', {
        socketId: host.socketId,
        event,
        data
      });
    });
  }

  /**
   * End meeting room
   */
  endMeetingRoom(roomId) {
    const room = this.meetingRooms.get(roomId);
    if (!room) return;

    // Stop any active recording
    if (room.isRecording && room.currentRecording) {
      room.currentRecording.endedAt = new Date().toISOString();
      room.recordings.push(room.currentRecording);
    }

    room.status = 'ended';
    room.endedAt = new Date().toISOString();

    // Notify all participants
    this.broadcastToRoom(roomId, 'meeting_ended', {
      endedAt: room.endedAt,
      duration: new Date(room.endedAt) - new Date(room.startedAt || room.createdAt)
    });

    // Clean up participants
    room.participants.forEach((participant) => {
      this.participants.delete(participant.id);
    });

    console.log(`📹 Meeting room ${roomId} ended`);
  }

  /**
   * Clean up inactive rooms
   */
  cleanupInactiveRooms() {
    const now = new Date();
    const maxInactiveTime = 4 * 60 * 60 * 1000; // 4 hours

    this.meetingRooms.forEach((room, roomId) => {
      const lastActivity = new Date(room.endedAt || room.startedAt || room.createdAt);
      
      if (now - lastActivity > maxInactiveTime) {
        console.log(`📹 Cleaning up inactive room: ${roomId}`);
        this.meetingRooms.delete(roomId);
      }
    });
  }

  /**
   * Get meeting statistics
   */
  getMeetingStats() {
    const totalRooms = this.meetingRooms.size;
    const activeRooms = Array.from(this.meetingRooms.values()).filter(room => room.status === 'active').length;
    const totalParticipants = this.participants.size;

    return {
      totalRooms,
      activeRooms,
      totalParticipants,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new WebRTCMeetingService();