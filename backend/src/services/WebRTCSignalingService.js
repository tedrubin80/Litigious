const WebRTCMeetingService = require('./WebRTCMeetingService');

/**
 * WebRTC Signaling Service
 * 
 * Handles WebRTC signaling through Socket.IO for:
 * - Peer-to-peer connection establishment
 * - ICE candidate exchange
 * - Offer/Answer SDP exchange
 * - Meeting room management
 * - Real-time chat and presence
 */
class WebRTCSignalingService {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // Track active rooms and participants
    this.userSockets = new Map(); // Track user socket connections
    
    this.WEBRTC_EVENTS = {
      JOIN_ROOM: 'webrtc:join-room',
      LEAVE_ROOM: 'webrtc:leave-room',
      OFFER: 'webrtc:offer',
      ANSWER: 'webrtc:answer',
      ICE_CANDIDATE: 'webrtc:ice-candidate',
      USER_JOINED: 'webrtc:user-joined',
      USER_LEFT: 'webrtc:user-left',
      CHAT_MESSAGE: 'webrtc:chat-message',
      START_RECORDING: 'webrtc:start-recording',
      STOP_RECORDING: 'webrtc:stop-recording',
      SCREEN_SHARE_START: 'webrtc:screen-share-start',
      SCREEN_SHARE_STOP: 'webrtc:screen-share-stop',
      PARTICIPANTS_UPDATE: 'webrtc:participants-update',
      ROOM_STATE: 'webrtc:room-state'
    };
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`WebRTC client connected: ${socket.id}`);

      // Handle room joining
      socket.on(this.WEBRTC_EVENTS.JOIN_ROOM, async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      // Handle room leaving
      socket.on(this.WEBRTC_EVENTS.LEAVE_ROOM, async (data) => {
        await this.handleLeaveRoom(socket, data);
      });

      // Handle WebRTC signaling
      socket.on(this.WEBRTC_EVENTS.OFFER, (data) => {
        this.handleOffer(socket, data);
      });

      socket.on(this.WEBRTC_EVENTS.ANSWER, (data) => {
        this.handleAnswer(socket, data);
      });

      socket.on(this.WEBRTC_EVENTS.ICE_CANDIDATE, (data) => {
        this.handleIceCandidate(socket, data);
      });

      // Handle chat messages
      socket.on(this.WEBRTC_EVENTS.CHAT_MESSAGE, (data) => {
        this.handleChatMessage(socket, data);
      });

      // Handle recording controls
      socket.on(this.WEBRTC_EVENTS.START_RECORDING, async (data) => {
        await this.handleStartRecording(socket, data);
      });

      socket.on(this.WEBRTC_EVENTS.STOP_RECORDING, async (data) => {
        await this.handleStopRecording(socket, data);
      });

      // Handle screen sharing
      socket.on(this.WEBRTC_EVENTS.SCREEN_SHARE_START, (data) => {
        this.handleScreenShareStart(socket, data);
      });

      socket.on(this.WEBRTC_EVENTS.SCREEN_SHARE_STOP, (data) => {
        this.handleScreenShareStop(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async handleJoinRoom(socket, data) {
    try {
      const { roomId, user } = data;
      
      if (!roomId || !user) {
        socket.emit('error', { message: 'Room ID and user information are required' });
        return;
      }

      // Get room from WebRTC service
      const room = WebRTCMeetingService.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check room capacity and permissions
      if (room.participants.length >= room.settings.maxParticipants) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Join socket room
      socket.join(roomId);
      
      // Track user connection
      this.userSockets.set(user.id, socket.id);
      socket.userId = user.id;
      socket.roomId = roomId;

      // Add participant to room
      const joinResult = await WebRTCMeetingService.joinMeeting(roomId, user);
      if (!joinResult.success) {
        socket.emit('error', { message: joinResult.error });
        return;
      }

      // Update room participants tracking
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Map());
      }
      this.rooms.get(roomId).set(user.id, {
        user,
        socketId: socket.id,
        joinedAt: new Date()
      });

      // Notify existing participants about new user
      socket.to(roomId).emit(this.WEBRTC_EVENTS.USER_JOINED, {
        user: user,
        timestamp: new Date().toISOString()
      });

      // Send current participants to new user
      const participants = Array.from(this.rooms.get(roomId).values())
        .map(p => p.user)
        .filter(p => p.id !== user.id);

      socket.emit(this.WEBRTC_EVENTS.PARTICIPANTS_UPDATE, {
        participants: participants
      });

      // Send room state to new participant
      socket.emit(this.WEBRTC_EVENTS.ROOM_STATE, {
        room: joinResult.room,
        participants: participants
      });

      console.log(`User ${user.name} joined room ${roomId}`);

    } catch (error) {
      console.error('Error handling join room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  async handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      if (!roomId || !userId) {
        return;
      }

      await this.removeUserFromRoom(socket, roomId, userId);

    } catch (error) {
      console.error('Error handling leave room:', error);
    }
  }

  async removeUserFromRoom(socket, roomId, userId) {
    try {
      // Leave socket room
      socket.leave(roomId);

      // Remove from tracking
      if (this.rooms.has(roomId)) {
        const roomParticipants = this.rooms.get(roomId);
        const participant = roomParticipants.get(userId);
        
        if (participant) {
          roomParticipants.delete(userId);
          
          // Notify other participants
          socket.to(roomId).emit(this.WEBRTC_EVENTS.USER_LEFT, {
            userId: userId,
            user: participant.user,
            timestamp: new Date().toISOString()
          });

          // Update WebRTC service
          await WebRTCMeetingService.leaveMeeting(roomId, userId);

          // Clean up empty room
          if (roomParticipants.size === 0) {
            this.rooms.delete(roomId);
          }

          console.log(`User ${participant.user.name} left room ${roomId}`);
        }
      }

      // Clear user tracking
      this.userSockets.delete(userId);
      socket.userId = null;
      socket.roomId = null;

    } catch (error) {
      console.error('Error removing user from room:', error);
    }
  }

  handleOffer(socket, data) {
    const { offer, to, roomId } = data;
    const from = socket.userId;

    if (!to || !offer || !roomId) {
      socket.emit('error', { message: 'Invalid offer data' });
      return;
    }

    // Forward offer to target user
    const targetSocketId = this.userSockets.get(to);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit(this.WEBRTC_EVENTS.OFFER, {
        offer,
        from,
        roomId
      });
    }
  }

  handleAnswer(socket, data) {
    const { answer, to, roomId } = data;
    const from = socket.userId;

    if (!to || !answer || !roomId) {
      socket.emit('error', { message: 'Invalid answer data' });
      return;
    }

    // Forward answer to target user
    const targetSocketId = this.userSockets.get(to);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit(this.WEBRTC_EVENTS.ANSWER, {
        answer,
        from,
        roomId
      });
    }
  }

  handleIceCandidate(socket, data) {
    const { candidate, to, roomId } = data;
    const from = socket.userId;

    if (!to || !candidate || !roomId) {
      return;
    }

    // Forward ICE candidate to target user
    const targetSocketId = this.userSockets.get(to);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit(this.WEBRTC_EVENTS.ICE_CANDIDATE, {
        candidate,
        from,
        roomId
      });
    }
  }

  handleChatMessage(socket, data) {
    const { roomId, text } = data;
    const userId = socket.userId;

    if (!roomId || !text || !userId) {
      return;
    }

    // Get user info from room participants
    if (this.rooms.has(roomId)) {
      const participant = this.rooms.get(roomId).get(userId);
      if (participant) {
        const message = {
          id: Date.now().toString(),
          user: participant.user,
          text: text.trim(),
          timestamp: new Date().toISOString()
        };

        // Broadcast message to all room participants
        this.io.to(roomId).emit(this.WEBRTC_EVENTS.CHAT_MESSAGE, message);

        // Store message in WebRTC service
        WebRTCMeetingService.addChatMessage(roomId, message);
      }
    }
  }

  async handleStartRecording(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      if (!roomId || !userId) {
        socket.emit('error', { message: 'Invalid recording request' });
        return;
      }

      // Start recording through WebRTC service
      const result = await WebRTCMeetingService.startRecording(roomId, userId);
      
      if (result.success) {
        // Notify all participants
        this.io.to(roomId).emit('recording-started', {
          recordingId: result.recordingId,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: result.error });
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      socket.emit('error', { message: 'Failed to start recording' });
    }
  }

  async handleStopRecording(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      if (!roomId || !userId) {
        socket.emit('error', { message: 'Invalid recording request' });
        return;
      }

      // Stop recording through WebRTC service
      const result = await WebRTCMeetingService.stopRecording(roomId, userId);
      
      if (result.success) {
        // Notify all participants
        this.io.to(roomId).emit('recording-stopped', {
          recordingId: result.recordingId,
          filePath: result.filePath,
          duration: result.duration,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: result.error });
      }

    } catch (error) {
      console.error('Error stopping recording:', error);
      socket.emit('error', { message: 'Failed to stop recording' });
    }
  }

  handleScreenShareStart(socket, data) {
    const { roomId } = data;
    const userId = socket.userId;

    if (!roomId || !userId) {
      return;
    }

    // Notify other participants
    socket.to(roomId).emit(this.WEBRTC_EVENTS.SCREEN_SHARE_START, {
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  handleScreenShareStop(socket, data) {
    const { roomId } = data;
    const userId = socket.userId;

    if (!roomId || !userId) {
      return;
    }

    // Notify other participants
    socket.to(roomId).emit(this.WEBRTC_EVENTS.SCREEN_SHARE_STOP, {
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(socket) {
    const userId = socket.userId;
    const roomId = socket.roomId;

    if (userId && roomId) {
      this.removeUserFromRoom(socket, roomId, userId);
    }

    console.log(`WebRTC client disconnected: ${socket.id}`);
  }

  // Utility methods
  getRoomParticipants(roomId) {
    if (this.rooms.has(roomId)) {
      return Array.from(this.rooms.get(roomId).values()).map(p => p.user);
    }
    return [];
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getTotalParticipants() {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.size;
    }
    return total;
  }
}

module.exports = WebRTCSignalingService;