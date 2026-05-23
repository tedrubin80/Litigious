const BaseController = require('./BaseController');
const { ErrorHandler } = require('../middleware/errorHandler');
const APIResponse = require('../lib/apiResponse');
const prisma = require('../lib/prisma');
const AuthUtils = require('../lib/authUtils');

class CommunicationController extends BaseController {
  constructor() {
    super(prisma.communication, {
      allowedFilters: [
        'type', 'direction', 'status', 'clientId', 'caseId', 'userId', 'priority',
        'followUpRequired', 'billable', 'isConfidential', 'dateTime'
      ],
      allowedSortFields: [
        'dateTime', 'type', 'direction', 'status', 'priority', 'followUpDate', 
        'createdAt', 'updatedAt'
      ],
      defaultSort: { dateTime: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            mobile: true,
            clientNumber: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      searchFields: ['subject', 'content', 'summary', 'fromEmail', 'toEmails'],
      requiredCreateFields: ['type', 'direction', 'dateTime'],
      allowedCreateFields: [
        'type', 'direction', 'status', 'subject', 'content', 'summary', 'dateTime',
        'duration', 'followUpRequired', 'followUpDate', 'priority', 'fromEmail',
        'toEmails', 'fromPhone', 'toPhone', 'attachmentCount', 'isConfidential',
        'billable', 'billingNotes', 'clientId', 'caseId'
      ],
      allowedUpdateFields: [
        'type', 'direction', 'status', 'subject', 'content', 'summary', 'dateTime',
        'duration', 'followUpRequired', 'followUpDate', 'priority', 'fromEmail',
        'toEmails', 'fromPhone', 'toPhone', 'attachmentCount', 'isConfidential',
        'billable', 'billingNotes', 'clientId', 'caseId'
      ]
    });
  }

  // Override beforeCreate to add user context
  async beforeCreate(data, req) {
    data.userId = req.user.userId;
    return data;
  }

  // Override afterCreate for activity logging
  async afterCreate(resource, req) {
    try {
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'COMMUNICATION_CREATED',
          description: `Communication logged: ${resource.type} ${resource.direction} - ${resource.subject || 'No subject'}`,
          entityType: 'COMMUNICATION',
          entityId: resource.id,
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    } catch (error) {
      console.error('Failed to log communication creation:', error);
    }
  }

  // Override afterUpdate for activity logging
  async afterUpdate(resource, req) {
    try {
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'COMMUNICATION_UPDATED',
          description: `Communication updated: ${resource.type} ${resource.direction} - ${resource.subject || 'No subject'}`,
          entityType: 'COMMUNICATION',
          entityId: resource.id,
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    } catch (error) {
      console.error('Failed to log communication update:', error);
    }
  }

  // Get communication history for a specific client
  getClientCommunications = ErrorHandler.asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const { page = 1, limit = 20, type, dateFrom, dateTo } = req.query;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!client) {
      const response = APIResponse.notFound('Client', clientId);
      return res.status(404).json(response);
    }

    // Build filters
    const where = { clientId };
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = new Date(dateFrom);
      if (dateTo) where.dateTime.lte = new Date(dateTo);
    }

    // Get communications with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [communications, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        include: this.options.include,
        orderBy: { dateTime: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.communication.count({ where })
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: skip + parseInt(limit) < total,
      hasPrev: parseInt(page) > 1
    };

    const response = APIResponse.paginated(communications, pagination, 'Client communications retrieved successfully');
    res.json(response);
  });

  // Get communication history for a specific case
  getCaseCommunications = ErrorHandler.asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { page = 1, limit = 20, type, dateFrom, dateTo } = req.query;

    // Verify case exists
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true, title: true }
    });

    if (!case_) {
      const response = APIResponse.notFound('Case', caseId);
      return res.status(404).json(response);
    }

    // Build filters
    const where = { caseId };
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = new Date(dateFrom);
      if (dateTo) where.dateTime.lte = new Date(dateTo);
    }

    // Get communications with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [communications, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        include: this.options.include,
        orderBy: { dateTime: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.communication.count({ where })
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: skip + parseInt(limit) < total,
      hasPrev: parseInt(page) > 1
    };

    const response = APIResponse.paginated(communications, pagination, 'Case communications retrieved successfully');
    res.json(response);
  });

  // Get communications requiring follow-up
  getFollowUpCommunications = ErrorHandler.asyncHandler(async (req, res) => {
    const { overdue = false } = req.query;
    
    const where = { 
      followUpRequired: true,
      followUpDate: overdue ? { lt: new Date() } : { gte: new Date() }
    };

    const communications = await prisma.communication.findMany({
      where,
      include: this.options.include,
      orderBy: { followUpDate: 'asc' }
    });

    const message = overdue ? 'Overdue follow-up communications retrieved successfully' : 'Upcoming follow-up communications retrieved successfully';
    const response = APIResponse.success(communications, message);
    res.json(response);
  });

  // Mark communication as read
  markAsRead = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;

    const communication = await this.model.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!communication) {
      const response = APIResponse.notFound('Communication', id);
      return res.status(404).json(response);
    }

    const updated = await this.model.update({
      where: { id },
      data: { status: 'READ' },
      include: this.options.include
    });

    const response = APIResponse.success(updated, 'Communication marked as read');
    res.json(response);
  });

  // Generate AI summary for communication content
  generateSummary = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;

    const communication = await this.model.findUnique({
      where: { id },
      select: { id: true, content: true, type: true, subject: true }
    });

    if (!communication) {
      const response = APIResponse.notFound('Communication', id);
      return res.status(404).json(response);
    }

    if (!communication.content) {
      const response = APIResponse.error('No content available for summary generation', 400);
      return res.status(400).json(response);
    }

    try {
      // Mock AI summary generation (replace with actual AI service call)
      const summary = `Summary of ${communication.type.toLowerCase()} communication: ${communication.subject || 'No subject'}. Content length: ${communication.content.length} characters.`;

      const updated = await this.model.update({
        where: { id },
        data: { summary },
        include: this.options.include
      });

      const response = APIResponse.success(updated, 'AI summary generated successfully');
      res.json(response);
    } catch (error) {
      console.error('AI summary generation error:', error);
      const response = APIResponse.error('Failed to generate AI summary', 500);
      res.status(500).json(response);
    }
  });

  // Communication statistics
  getCommunicationStats = ErrorHandler.asyncHandler(async (req, res) => {
    const { clientId, caseId, dateFrom, dateTo } = req.query;

    let where = {};
    if (clientId) where.clientId = clientId;
    if (caseId) where.caseId = caseId;
    if (dateFrom || dateTo) {
      where.dateTime = {};
      if (dateFrom) where.dateTime.gte = new Date(dateFrom);
      if (dateTo) where.dateTime.lte = new Date(dateTo);
    }

    const [
      totalCommunications,
      byType,
      byDirection,
      byStatus,
      followUpPending,
      billableCount
    ] = await Promise.all([
      prisma.communication.count({ where }),
      prisma.communication.groupBy({
        by: ['type'],
        where,
        _count: { id: true }
      }),
      prisma.communication.groupBy({
        by: ['direction'],
        where,
        _count: { id: true }
      }),
      prisma.communication.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }),
      prisma.communication.count({
        where: { ...where, followUpRequired: true, followUpDate: { gte: new Date() } }
      }),
      prisma.communication.count({
        where: { ...where, billable: true }
      })
    ]);

    const stats = {
      total: totalCommunications,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {}),
      byDirection: byDirection.reduce((acc, item) => {
        acc[item.direction] = item._count.id;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      followUpPending,
      billableCount,
      billablePercentage: totalCommunications > 0 ? Math.round((billableCount / totalCommunications) * 100) : 0
    };

    const response = APIResponse.success(stats, 'Communication statistics retrieved successfully');
    res.json(response);
  });

  // Bulk operations
  bulkUpdateStatus = ErrorHandler.asyncHandler(async (req, res) => {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      const response = APIResponse.error('Communication IDs array is required', 400);
      return res.status(400).json(response);
    }

    const result = await prisma.communication.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });

    const response = APIResponse.success(
      { updatedCount: result.count },
      `${result.count} communications updated successfully`
    );
    res.json(response);
  });
}

module.exports = new CommunicationController();