const realtimeCollaborationService = require('../services/RealtimeCollaborationService');
const ApiResponse = require('../lib/apiResponse');
const prisma = require('../lib/prisma');

class CollaborationController {
  /**
   * Get active users in the system
   */
  async getActiveUsers(req, res) {
    try {
      const activeUsers = realtimeCollaborationService.getActiveUsers();
      
      return ApiResponse.success(res, {
        activeUsers: activeUsers,
        count: activeUsers.length,
        lastUpdated: new Date().toISOString()
      }, 'Active users retrieved successfully');

    } catch (error) {
      console.error('Get active users error:', error);
      return ApiResponse.error(res, 'Failed to retrieve active users', 500, error);
    }
  }

  /**
   * Get document collaboration status
   */
  async getDocumentCollaborators(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      // Verify access to document
      const hasAccess = await realtimeCollaborationService.verifyDocumentAccess(userId, documentId);
      if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied to document', 403);
      }

      // Get current collaborators
      const collaborators = realtimeCollaborationService.documentSessions.get(documentId);
      const activeCollaborators = collaborators ? 
        Array.from(collaborators)
          .map(id => realtimeCollaborationService.activeUsers.get(id))
          .filter(Boolean) : [];

      return ApiResponse.success(res, {
        documentId: documentId,
        collaborators: activeCollaborators,
        count: activeCollaborators.length
      }, 'Document collaborators retrieved successfully');

    } catch (error) {
      console.error('Get document collaborators error:', error);
      return ApiResponse.error(res, 'Failed to retrieve document collaborators', 500, error);
    }
  }

  /**
   * Get case collaboration status
   */
  async getCaseCollaborators(req, res) {
    try {
      const { caseId } = req.params;
      const userId = req.user.id;

      // Verify access to case
      const hasAccess = await realtimeCollaborationService.verifyCaseAccess(userId, caseId);
      if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied to case', 403);
      }

      // Get current collaborators
      const collaborators = realtimeCollaborationService.caseCollaborations.get(caseId);
      const activeCollaborators = collaborators ? 
        Array.from(collaborators)
          .map(id => realtimeCollaborationService.activeUsers.get(id))
          .filter(Boolean) : [];

      return ApiResponse.success(res, {
        caseId: caseId,
        collaborators: activeCollaborators,
        count: activeCollaborators.length
      }, 'Case collaborators retrieved successfully');

    } catch (error) {
      console.error('Get case collaborators error:', error);
      return ApiResponse.error(res, 'Failed to retrieve case collaborators', 500, error);
    }
  }

  /**
   * Send notification to user(s)
   */
  async sendNotification(req, res) {
    try {
      const { recipientIds, notification } = req.body;
      const senderId = req.user.id;

      if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
        return ApiResponse.error(res, 'Recipient IDs are required', 400);
      }

      if (!notification || !notification.message) {
        return ApiResponse.error(res, 'Notification message is required', 400);
      }

      // Save notification to database
      const savedNotifications = [];
      for (const recipientId of recipientIds) {
        const savedNotification = await prisma.notification.create({
          data: {
            userId: recipientId,
            senderId: senderId,
            type: notification.type || 'message',
            title: notification.title || 'New Notification',
            message: notification.message,
            data: notification.data ? JSON.stringify(notification.data) : null,
            priority: notification.priority || 'normal'
          }
        });

        // Send real-time notification
        await realtimeCollaborationService.sendNotification(recipientId, {
          id: savedNotification.id,
          ...notification,
          sender: req.user,
          timestamp: savedNotification.createdAt
        });

        savedNotifications.push(savedNotification);
      }

      return ApiResponse.success(res, {
        notifications: savedNotifications,
        sentCount: savedNotifications.length
      }, 'Notifications sent successfully');

    } catch (error) {
      console.error('Send notification error:', error);
      return ApiResponse.error(res, 'Failed to send notification', 500, error);
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { 
        limit = 50, 
        offset = 0, 
        unreadOnly = false,
        type 
      } = req.query;

      const where = {
        userId: userId,
        ...(unreadOnly === 'true' ? { readAt: null } : {}),
        ...(type ? { type: type } : {})
      };

      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.notification.count({ where: where })
      ]);

      const unreadCount = await prisma.notification.count({
        where: {
          userId: userId,
          readAt: null
        }
      });

      return ApiResponse.success(res, {
        notifications: notifications.map(notif => ({
          ...notif,
          data: notif.data ? JSON.parse(notif.data) : null
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + notifications.length < totalCount
        },
        unreadCount: unreadCount
      }, 'Notifications retrieved successfully');

    } catch (error) {
      console.error('Get user notifications error:', error);
      return ApiResponse.error(res, 'Failed to retrieve notifications', 500, error);
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(req, res) {
    try {
      const userId = req.user.id;
      const { notificationIds, markAll = false } = req.body;

      let updatedCount = 0;

      if (markAll) {
        const result = await prisma.notification.updateMany({
          where: {
            userId: userId,
            readAt: null
          },
          data: {
            readAt: new Date()
          }
        });
        updatedCount = result.count;
      } else if (notificationIds && Array.isArray(notificationIds)) {
        const result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: userId,
            readAt: null
          },
          data: {
            readAt: new Date()
          }
        });
        updatedCount = result.count;
      } else {
        return ApiResponse.error(res, 'Either notificationIds or markAll=true is required', 400);
      }

      return ApiResponse.success(res, {
        updatedCount: updatedCount,
        timestamp: new Date()
      }, 'Notifications marked as read successfully');

    } catch (error) {
      console.error('Mark notifications read error:', error);
      return ApiResponse.error(res, 'Failed to mark notifications as read', 500, error);
    }
  }

  /**
   * Get messages for a user
   */
  async getUserMessages(req, res) {
    try {
      const userId = req.user.id;
      const { 
        conversationWith, 
        limit = 50, 
        offset = 0,
        before 
      } = req.query;

      if (!conversationWith) {
        return ApiResponse.error(res, 'conversationWith parameter is required', 400);
      }

      const where = {
        OR: [
          { senderId: userId, recipientId: conversationWith },
          { senderId: conversationWith, recipientId: userId }
        ],
        ...(before ? { createdAt: { lt: new Date(before) } } : {})
      };

      const messages = await prisma.message.findMany({
        where: where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Mark messages as read
      await prisma.message.updateMany({
        where: {
          senderId: conversationWith,
          recipientId: userId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });

      return ApiResponse.success(res, {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: messages.length === parseInt(limit)
        }
      }, 'Messages retrieved successfully');

    } catch (error) {
      console.error('Get user messages error:', error);
      return ApiResponse.error(res, 'Failed to retrieve messages', 500, error);
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id;

      // Get recent conversations
      const conversations = await prisma.$queryRaw`
        SELECT DISTINCT
          CASE 
            WHEN m.senderId = ${userId} THEN m.recipientId 
            ELSE m.senderId 
          END as otherUserId,
          u.name as otherUserName,
          u.email as otherUserEmail,
          m.content as lastMessage,
          m.type as lastMessageType,
          m.createdAt as lastMessageAt,
          m.senderId = ${userId} as sentByMe,
          COUNT(CASE WHEN m2.recipientId = ${userId} AND m2.readAt IS NULL THEN 1 END) as unreadCount
        FROM Message m
        LEFT JOIN Message m2 ON (
          (m2.senderId = CASE WHEN m.senderId = ${userId} THEN m.recipientId ELSE m.senderId END AND m2.recipientId = ${userId}) OR
          (m2.recipientId = CASE WHEN m.senderId = ${userId} THEN m.recipientId ELSE m.senderId END AND m2.senderId = ${userId})
        )
        INNER JOIN User u ON u.id = CASE WHEN m.senderId = ${userId} THEN m.recipientId ELSE m.senderId END
        WHERE m.senderId = ${userId} OR m.recipientId = ${userId}
        GROUP BY otherUserId, u.name, u.email, m.content, m.type, m.createdAt, sentByMe
        ORDER BY m.createdAt DESC
        LIMIT 20
      `;

      return ApiResponse.success(res, {
        conversations: conversations,
        count: conversations.length
      }, 'Conversations retrieved successfully');

    } catch (error) {
      console.error('Get user conversations error:', error);
      return ApiResponse.error(res, 'Failed to retrieve conversations', 500, error);
    }
  }

  /**
   * Get document comments
   */
  async getDocumentComments(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;
      const { limit = 100, offset = 0 } = req.query;

      // Verify access to document
      const hasAccess = await realtimeCollaborationService.verifyDocumentAccess(userId, documentId);
      if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied to document', 403);
      }

      const comments = await prisma.documentComment.findMany({
        where: { documentId: documentId },
        orderBy: { createdAt: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
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

      return ApiResponse.success(res, {
        documentId: documentId,
        comments: comments,
        count: comments.length
      }, 'Document comments retrieved successfully');

    } catch (error) {
      console.error('Get document comments error:', error);
      return ApiResponse.error(res, 'Failed to retrieve document comments', 500, error);
    }
  }

  /**
   * Get case comments
   */
  async getCaseComments(req, res) {
    try {
      const { caseId } = req.params;
      const userId = req.user.id;
      const { limit = 100, offset = 0 } = req.query;

      // Verify access to case
      const hasAccess = await realtimeCollaborationService.verifyCaseAccess(userId, caseId);
      if (!hasAccess) {
        return ApiResponse.error(res, 'Access denied to case', 403);
      }

      const comments = await prisma.caseComment.findMany({
        where: { caseId: caseId },
        orderBy: { createdAt: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
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

      return ApiResponse.success(res, {
        caseId: caseId,
        comments: comments,
        count: comments.length
      }, 'Case comments retrieved successfully');

    } catch (error) {
      console.error('Get case comments error:', error);
      return ApiResponse.error(res, 'Failed to retrieve case comments', 500, error);
    }
  }

  /**
   * Broadcast system announcement
   */
  async broadcastAnnouncement(req, res) {
    try {
      const { announcement, targetUsers, priority = 'normal' } = req.body;
      
      if (!announcement || !announcement.message) {
        return ApiResponse.error(res, 'Announcement message is required', 400);
      }

      // Save announcement
      const savedAnnouncement = await prisma.announcement.create({
        data: {
          title: announcement.title || 'System Announcement',
          message: announcement.message,
          type: announcement.type || 'info',
          priority: priority,
          createdBy: req.user.id,
          targetUsers: targetUsers ? JSON.stringify(targetUsers) : null
        }
      });

      // Broadcast real-time announcement
      await realtimeCollaborationService.broadcastAnnouncement(
        {
          id: savedAnnouncement.id,
          title: savedAnnouncement.title,
          message: savedAnnouncement.message,
          type: savedAnnouncement.type,
          priority: savedAnnouncement.priority,
          createdBy: req.user,
          createdAt: savedAnnouncement.createdAt
        },
        targetUsers
      );

      return ApiResponse.success(res, {
        announcement: savedAnnouncement,
        targetUsers: targetUsers || 'all',
        broadcastedAt: new Date()
      }, 'Announcement broadcasted successfully');

    } catch (error) {
      console.error('Broadcast announcement error:', error);
      return ApiResponse.error(res, 'Failed to broadcast announcement', 500, error);
    }
  }

  /**
   * Get collaboration analytics
   */
  async getCollaborationAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      const now = new Date();
      let startTime;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const analytics = {
        realtime: {
          activeUsers: realtimeCollaborationService.onlineUsers.size,
          activeSessions: {
            documents: realtimeCollaborationService.documentSessions.size,
            cases: realtimeCollaborationService.caseCollaborations.size
          },
          timestamp: new Date()
        },
        historical: {
          // These would be implemented with actual database queries
          totalMessages: 0,
          totalNotifications: 0,
          documentsCollaboratedOn: 0,
          casesCollaboratedOn: 0
        }
      };

      return ApiResponse.success(res, analytics, 'Collaboration analytics retrieved successfully');

    } catch (error) {
      console.error('Get collaboration analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve collaboration analytics', 500, error);
    }
  }
}

module.exports = new CollaborationController();