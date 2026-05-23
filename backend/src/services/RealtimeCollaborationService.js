const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const WebRTCSignalingService = require('./WebRTCSignalingService');

/**
 * Real-time Collaboration Service
 * 
 * Provides comprehensive real-time collaboration features:
 * - Live document editing with operational transforms
 * - Real-time case updates and notifications
 * - Team collaboration and presence awareness
 * - Instant messaging and comments
 * - Live video/audio calls integration
 * - Screen sharing for document reviews
 * - Activity feeds and audit trails
 */
class RealtimeCollaborationService {
  constructor() {
    this.io = null;
    this.webrtcSignaling = null;
    this.activeUsers = new Map(); // Track active users
    this.documentSessions = new Map(); // Track document editing sessions
    this.caseCollaborations = new Map(); // Track case collaborations
    this.onlineUsers = new Set(); // Track online users
    
    // Collaboration features
    this.COLLABORATION_EVENTS = {
      DOCUMENT_EDIT: 'document:edit',
      DOCUMENT_CURSOR: 'document:cursor',
      DOCUMENT_SELECTION: 'document:selection',
      DOCUMENT_COMMENT: 'document:comment',
      CASE_UPDATE: 'case:update',
      CASE_COMMENT: 'case:comment',
      USER_PRESENCE: 'user:presence',
      NOTIFICATION: 'notification',
      TYPING: 'typing',
      VIDEO_CALL: 'video:call',
      SCREEN_SHARE: 'screen:share',
      ACTIVITY_FEED: 'activity:feed'
    };

    this.PRESENCE_STATUS = {
      ONLINE: 'online',
      AWAY: 'away',
      BUSY: 'busy',
      OFFLINE: 'offline'
    };

    this.NOTIFICATION_TYPES = {
      CASE_ASSIGNED: 'case_assigned',
      DOCUMENT_SHARED: 'document_shared',
      COMMENT_ADDED: 'comment_added',
      DEADLINE_REMINDER: 'deadline_reminder',
      TASK_ASSIGNED: 'task_assigned',
      MENTION: 'mention',
      MESSAGE: 'message'
    };

    console.log('🔗 Real-time Collaboration Service initialized');
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001', 
          process.env.FRONTEND_URL
        ].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupSocketAuthentication();
    this.setupEventHandlers();
    
    // Initialize WebRTC signaling
    this.webrtcSignaling = new WebRTCSignalingService(this.io);
    this.webrtcSignaling.initialize();
    
    console.log('🚀 Socket.IO server initialized for real-time collaboration');
    console.log('📹 WebRTC signaling service initialized');
  }

  /**
   * Setup socket authentication middleware
   */
  setupSocketAuthentication() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userData = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userData.name} connected (${socket.id})`);
      
      this.handleUserConnection(socket);
      this.setupDocumentCollaboration(socket);
      this.setupCaseCollaboration(socket);
      this.setupMessaging(socket);
      this.setupNotifications(socket);
      this.setupVideoConferencing(socket);
      this.setupPresenceAwareness(socket);
      
      socket.on('disconnect', () => {
        this.handleUserDisconnection(socket);
      });
    });
  }

  /**
   * Handle user connection
   */
  async handleUserConnection(socket) {
    const userId = socket.userId;
    const userData = socket.userData;

    // Track active user
    this.activeUsers.set(userId, {
      socketId: socket.id,
      userData: userData,
      status: this.PRESENCE_STATUS.ONLINE,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    this.onlineUsers.add(userId);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Join user to their organization room
    if (userData.organizationId) {
      socket.join(`org:${userData.organizationId}`);
    }

    // Update user presence in database
    await this.updateUserPresence(userId, this.PRESENCE_STATUS.ONLINE);

    // Broadcast user online status
    socket.broadcast.emit(this.COLLABORATION_EVENTS.USER_PRESENCE, {
      userId: userId,
      userData: userData,
      status: this.PRESENCE_STATUS.ONLINE,
      timestamp: new Date()
    });

    // Send initial data to user
    socket.emit('connection:established', {
      userId: userId,
      activeUsers: this.getActiveUsers(),
      onlineCount: this.onlineUsers.size
    });
  }

  /**
   * Handle user disconnection
   */
  async handleUserDisconnection(socket) {
    const userId = socket.userId;
    const userData = socket.userData;

    console.log(`User ${userData.name} disconnected (${socket.id})`);

    // Remove from active users
    this.activeUsers.delete(userId);
    this.onlineUsers.delete(userId);

    // Leave all document sessions
    this.leaveAllDocumentSessions(userId);

    // Update user presence
    await this.updateUserPresence(userId, this.PRESENCE_STATUS.OFFLINE);

    // Broadcast user offline status
    socket.broadcast.emit(this.COLLABORATION_EVENTS.USER_PRESENCE, {
      userId: userId,
      userData: userData,
      status: this.PRESENCE_STATUS.OFFLINE,
      timestamp: new Date()
    });
  }

  /**
   * Setup document collaboration features
   */
  setupDocumentCollaboration(socket) {
    // Join document editing session
    socket.on('document:join', async (data) => {
      const { documentId } = data;
      const userId = socket.userId;

      try {
        // Verify user has access to document
        const hasAccess = await this.verifyDocumentAccess(userId, documentId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to document' });
          return;
        }

        // Join document room
        socket.join(`document:${documentId}`);

        // Track document session
        if (!this.documentSessions.has(documentId)) {
          this.documentSessions.set(documentId, new Set());
        }
        this.documentSessions.get(documentId).add(userId);

        // Notify other users in document
        socket.to(`document:${documentId}`).emit('document:user_joined', {
          userId: userId,
          userData: socket.userData,
          documentId: documentId,
          timestamp: new Date()
        });

        // Send document collaborators to user
        const collaborators = Array.from(this.documentSessions.get(documentId))
          .map(id => this.activeUsers.get(id))
          .filter(Boolean);

        socket.emit('document:collaborators', {
          documentId: documentId,
          collaborators: collaborators
        });

      } catch (error) {
        console.error('Document join error:', error);
        socket.emit('error', { message: 'Failed to join document session' });
      }
    });

    // Handle document edits
    socket.on('document:edit', async (data) => {
      const { documentId, operation, content, version } = data;
      const userId = socket.userId;

      try {
        // Apply operational transform
        const transformedOperation = await this.applyOperationalTransform(
          documentId,
          operation,
          version
        );

        // Save document changes
        await this.saveDocumentChanges(documentId, userId, transformedOperation);

        // Broadcast changes to other users
        socket.to(`document:${documentId}`).emit(this.COLLABORATION_EVENTS.DOCUMENT_EDIT, {
          documentId: documentId,
          operation: transformedOperation,
          userId: userId,
          userData: socket.userData,
          timestamp: new Date()
        });

        // Acknowledge to sender
        socket.emit('document:edit_ack', {
          documentId: documentId,
          operation: transformedOperation,
          version: version + 1
        });

      } catch (error) {
        console.error('Document edit error:', error);
        socket.emit('document:edit_error', { 
          message: 'Failed to apply document changes',
          operation: operation 
        });
      }
    });

    // Handle cursor movements
    socket.on('document:cursor', (data) => {
      const { documentId, position, selection } = data;
      
      socket.to(`document:${documentId}`).emit(this.COLLABORATION_EVENTS.DOCUMENT_CURSOR, {
        documentId: documentId,
        userId: socket.userId,
        userData: socket.userData,
        position: position,
        selection: selection,
        timestamp: new Date()
      });
    });

    // Handle document comments
    socket.on('document:comment', async (data) => {
      const { documentId, comment, position, mentionedUsers } = data;
      const userId = socket.userId;

      try {
        // Save comment to database
        const savedComment = await this.saveDocumentComment(
          documentId, 
          userId, 
          comment, 
          position
        );

        // Broadcast comment to document collaborators
        this.io.to(`document:${documentId}`).emit(this.COLLABORATION_EVENTS.DOCUMENT_COMMENT, {
          documentId: documentId,
          comment: savedComment,
          userId: userId,
          userData: socket.userData,
          timestamp: new Date()
        });

        // Send notifications to mentioned users
        if (mentionedUsers?.length > 0) {
          await this.sendMentionNotifications(mentionedUsers, documentId, comment);
        }

      } catch (error) {
        console.error('Document comment error:', error);
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Leave document session
    socket.on('document:leave', (data) => {
      const { documentId } = data;
      const userId = socket.userId;

      this.leaveDocumentSession(userId, documentId);
      socket.leave(`document:${documentId}`);

      socket.to(`document:${documentId}`).emit('document:user_left', {
        userId: userId,
        userData: socket.userData,
        documentId: documentId,
        timestamp: new Date()
      });
    });
  }

  /**
   * Setup case collaboration features
   */
  setupCaseCollaboration(socket) {
    // Join case collaboration
    socket.on('case:join', async (data) => {
      const { caseId } = data;
      const userId = socket.userId;

      try {
        const hasAccess = await this.verifyCaseAccess(userId, caseId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to case' });
          return;
        }

        socket.join(`case:${caseId}`);

        // Track case collaboration
        if (!this.caseCollaborations.has(caseId)) {
          this.caseCollaborations.set(caseId, new Set());
        }
        this.caseCollaborations.get(caseId).add(userId);

        // Get case activity feed
        const activityFeed = await this.getCaseActivityFeed(caseId);
        socket.emit('case:activity_feed', {
          caseId: caseId,
          activities: activityFeed
        });

      } catch (error) {
        console.error('Case join error:', error);
        socket.emit('error', { message: 'Failed to join case collaboration' });
      }
    });

    // Handle case updates
    socket.on('case:update', async (data) => {
      const { caseId, updates } = data;
      const userId = socket.userId;

      try {
        // Update case in database
        await this.updateCase(caseId, userId, updates);

        // Broadcast update to case collaborators
        socket.to(`case:${caseId}`).emit(this.COLLABORATION_EVENTS.CASE_UPDATE, {
          caseId: caseId,
          updates: updates,
          userId: userId,
          userData: socket.userData,
          timestamp: new Date()
        });

        // Add to activity feed
        await this.addCaseActivity(caseId, userId, 'case_updated', updates);

      } catch (error) {
        console.error('Case update error:', error);
        socket.emit('error', { message: 'Failed to update case' });
      }
    });

    // Handle case comments
    socket.on('case:comment', async (data) => {
      const { caseId, comment, mentionedUsers } = data;
      const userId = socket.userId;

      try {
        const savedComment = await this.saveCaseComment(caseId, userId, comment);

        this.io.to(`case:${caseId}`).emit(this.COLLABORATION_EVENTS.CASE_COMMENT, {
          caseId: caseId,
          comment: savedComment,
          userId: userId,
          userData: socket.userData,
          timestamp: new Date()
        });

        // Send notifications
        if (mentionedUsers?.length > 0) {
          await this.sendMentionNotifications(mentionedUsers, caseId, comment, 'case');
        }

      } catch (error) {
        console.error('Case comment error:', error);
        socket.emit('error', { message: 'Failed to add case comment' });
      }
    });
  }

  /**
   * Setup messaging features
   */
  setupMessaging(socket) {
    // Join message channels
    socket.on('message:join_channel', (data) => {
      const { channelId } = data;
      socket.join(`channel:${channelId}`);
    });

    // Send direct message
    socket.on('message:send', async (data) => {
      const { recipientId, message, type = 'text' } = data;
      const senderId = socket.userId;

      try {
        const savedMessage = await this.saveMessage(senderId, recipientId, message, type);

        // Send to recipient
        this.io.to(`user:${recipientId}`).emit('message:received', {
          message: savedMessage,
          sender: socket.userData,
          timestamp: new Date()
        });

        // Acknowledge to sender
        socket.emit('message:sent', {
          messageId: savedMessage.id,
          recipientId: recipientId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      const { recipientId, channelId } = data;
      
      if (recipientId) {
        this.io.to(`user:${recipientId}`).emit('typing:indicator', {
          userId: socket.userId,
          userData: socket.userData,
          isTyping: true
        });
      } else if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:indicator', {
          userId: socket.userId,
          userData: socket.userData,
          isTyping: true,
          channelId: channelId
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { recipientId, channelId } = data;
      
      if (recipientId) {
        this.io.to(`user:${recipientId}`).emit('typing:indicator', {
          userId: socket.userId,
          userData: socket.userData,
          isTyping: false
        });
      } else if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:indicator', {
          userId: socket.userId,
          userData: socket.userData,
          isTyping: false,
          channelId: channelId
        });
      }
    });
  }

  /**
   * Setup notifications
   */
  setupNotifications(socket) {
    socket.on('notification:mark_read', async (data) => {
      const { notificationIds } = data;
      const userId = socket.userId;

      try {
        await this.markNotificationsRead(userId, notificationIds);
        
        socket.emit('notification:marked_read', {
          notificationIds: notificationIds,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Mark notifications read error:', error);
      }
    });
  }

  /**
   * Setup video conferencing features
   */
  setupVideoConferencing(socket) {
    // Initiate video call
    socket.on('video:call_initiate', async (data) => {
      const { recipientIds, caseId, type = 'audio' } = data;
      const callId = this.generateCallId();
      
      // Create call room
      socket.join(`call:${callId}`);
      
      // Invite recipients
      recipientIds.forEach(recipientId => {
        this.io.to(`user:${recipientId}`).emit('video:call_incoming', {
          callId: callId,
          initiator: socket.userData,
          caseId: caseId,
          type: type,
          timestamp: new Date()
        });
      });

      socket.emit('video:call_initiated', {
        callId: callId,
        recipientIds: recipientIds,
        timestamp: new Date()
      });
    });

    // Join video call
    socket.on('video:call_join', (data) => {
      const { callId } = data;
      socket.join(`call:${callId}`);
      
      socket.to(`call:${callId}`).emit('video:participant_joined', {
        participant: socket.userData,
        timestamp: new Date()
      });
    });

    // Screen sharing
    socket.on('screen:share_start', (data) => {
      const { callId, streamId } = data;
      
      socket.to(`call:${callId}`).emit('screen:share_started', {
        userId: socket.userId,
        userData: socket.userData,
        streamId: streamId,
        timestamp: new Date()
      });
    });
  }

  /**
   * Setup presence awareness
   */
  setupPresenceAwareness(socket) {
    socket.on('presence:update', async (data) => {
      const { status, message } = data;
      const userId = socket.userId;

      if (this.activeUsers.has(userId)) {
        this.activeUsers.get(userId).status = status;
        this.activeUsers.get(userId).statusMessage = message;
        this.activeUsers.get(userId).lastActivity = new Date();
      }

      await this.updateUserPresence(userId, status, message);

      // Broadcast presence update
      socket.broadcast.emit(this.COLLABORATION_EVENTS.USER_PRESENCE, {
        userId: userId,
        userData: socket.userData,
        status: status,
        message: message,
        timestamp: new Date()
      });
    });

    // Activity heartbeat
    socket.on('activity:heartbeat', () => {
      const userId = socket.userId;
      if (this.activeUsers.has(userId)) {
        this.activeUsers.get(userId).lastActivity = new Date();
      }
    });
  }

  // Utility methods
  async verifyDocumentAccess(userId, documentId) {
    try {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          OR: [
            { userId: userId },
            { case: { userId: userId } },
            { case: { collaborators: { some: { userId: userId } } } }
          ]
        }
      });
      return !!document;
    } catch (error) {
      return false;
    }
  }

  async verifyCaseAccess(userId, caseId) {
    try {
      const case_ = await prisma.case.findFirst({
        where: {
          id: caseId,
          OR: [
            { userId: userId },
            { collaborators: { some: { userId: userId } } }
          ]
        }
      });
      return !!case_;
    } catch (error) {
      return false;
    }
  }

  getActiveUsers() {
    return Array.from(this.activeUsers.values()).map(user => ({
      userId: user.userData.id,
      userData: user.userData,
      status: user.status,
      statusMessage: user.statusMessage,
      connectedAt: user.connectedAt,
      lastActivity: user.lastActivity
    }));
  }

  leaveDocumentSession(userId, documentId) {
    if (this.documentSessions.has(documentId)) {
      this.documentSessions.get(documentId).delete(userId);
      if (this.documentSessions.get(documentId).size === 0) {
        this.documentSessions.delete(documentId);
      }
    }
  }

  leaveAllDocumentSessions(userId) {
    for (const [documentId, users] of this.documentSessions) {
      users.delete(userId);
      if (users.size === 0) {
        this.documentSessions.delete(documentId);
      }
    }
  }

  generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Database operations
  async updateUserPresence(userId, status, message = null) {
    try {
      await prisma.userPresence.upsert({
        where: { userId: userId },
        update: {
          status: status,
          message: message,
          lastSeen: new Date()
        },
        create: {
          userId: userId,
          status: status,
          message: message,
          lastSeen: new Date()
        }
      });
    } catch (error) {
      console.error('Update user presence error:', error);
    }
  }

  async saveDocumentComment(documentId, userId, comment, position) {
    return await prisma.documentComment.create({
      data: {
        documentId: documentId,
        userId: userId,
        content: comment,
        position: position
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async saveCaseComment(caseId, userId, comment) {
    return await prisma.caseComment.create({
      data: {
        caseId: caseId,
        userId: userId,
        content: comment
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async saveMessage(senderId, recipientId, message, type) {
    return await prisma.message.create({
      data: {
        senderId: senderId,
        recipientId: recipientId,
        content: message,
        type: type
      }
    });
  }

  // Placeholder methods for advanced features
  async applyOperationalTransform(documentId, operation, version) {
    // Implement operational transform algorithm
    return operation;
  }

  async saveDocumentChanges(documentId, userId, operation) {
    // Save document changes with version control
  }

  async getCaseActivityFeed(caseId) {
    // Get case activity feed
    return [];
  }

  async addCaseActivity(caseId, userId, type, data) {
    // Add activity to case feed
  }

  async updateCase(caseId, userId, updates) {
    // Update case in database
  }

  async sendMentionNotifications(userIds, entityId, content, type = 'document') {
    // Send mention notifications
  }

  async markNotificationsRead(userId, notificationIds) {
    // Mark notifications as read
  }

  /**
   * Send real-time notification
   */
  async sendNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit(this.COLLABORATION_EVENTS.NOTIFICATION, {
      notification: notification,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast system announcement
   */
  async broadcastAnnouncement(announcement, targetUsers = null) {
    const event = 'system:announcement';
    const data = {
      announcement: announcement,
      timestamp: new Date()
    };

    if (targetUsers) {
      targetUsers.forEach(userId => {
        this.io.to(`user:${userId}`).emit(event, data);
      });
    } else {
      this.io.emit(event, data);
    }
  }
}

// Export singleton instance
module.exports = new RealtimeCollaborationService();