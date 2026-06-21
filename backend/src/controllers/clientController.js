const BaseController = require('./BaseController');
const prisma = require('../lib/prisma');
const APIResponse = require('../lib/apiResponse');
const { ErrorHandler, APIError } = require('../middleware/errorHandler');
const AuthUtils = require('../lib/authUtils');
const { encryptValue, sanitizeClientPii } = require('../lib/piiEncryption');

class ClientController extends BaseController {
  constructor() {
    super(prisma.client, {
      modelName: 'Client',
      allowedFilters: [
        'firstName', 'lastName', 'email', 'phone', 'mobile', 'city', 'state', 
        'zipCode', 'maritalStatus', 'preferredContact', 'isActive', 'createdAt', 'updatedAt'
      ],
      allowedSortFields: [
        'firstName', 'lastName', 'email', 'phone', 'clientNumber', 'city', 
        'state', 'createdAt', 'updatedAt'
      ],
      defaultSort: { lastName: 'asc' },
      include: {
        emergencyContacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { firstName: 'asc' }
          ]
        }
      },
      searchFields: ['firstName', 'lastName', 'email', 'phone', 'mobile', 'clientNumber'],
      requiredCreateFields: ['firstName', 'lastName'],
      allowedCreateFields: [
        'firstName', 'lastName', 'email', 'phone', 'mobile', 'address', 'city', 
        'state', 'zipCode', 'dateOfBirth', 'ssn', 'employer', 'occupation', 
        'maritalStatus', 'spouseName', 'referredBy', 'preferredContact', 'notes'
      ],
      allowedUpdateFields: [
        'firstName', 'lastName', 'email', 'phone', 'mobile', 'address', 'city', 
        'state', 'zipCode', 'dateOfBirth', 'ssn', 'employer', 'occupation', 
        'maritalStatus', 'spouseName', 'referredBy', 'preferredContact', 'isActive', 'notes'
      ]
    });
  }

  // Override beforeCreate to generate client number and set createdById
  async beforeCreate(data, req) {
    // Generate unique client number
    data.clientNumber = await this.generateClientNumber();
    
    // Set the createdById from the authenticated user
    data.createdById = req.user.userId;
    
    if (data.ssn) {
      data.ssn = encryptValue(data.ssn);
    }

    // Remove userId as Client model doesn't have this field directly
    delete data.userId;
    
    return data;
  }

  async beforeUpdate(data, req) {
    if (data.ssn) {
      data.ssn = encryptValue(data.ssn);
    }
    return data;
  }

  transformResponse(resource, req) {
    const canRevealPii = ['ADMIN', 'SUPER_ADMIN', 'ATTORNEY'].includes(req.user?.role);
    return sanitizeClientPii(resource, { reveal: canRevealPii });
  }

  // Override afterCreate for activity logging
  async afterCreate(resource, req) {
    try {
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'CLIENT_CREATED',
          description: `New client created: ${resource.firstName} ${resource.lastName}`,
          entityType: 'CLIENT',
          entityId: resource.id,
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    } catch (error) {
      console.error('Failed to log client creation:', error);
    }
  }

  // Override afterUpdate for activity logging
  async afterUpdate(resource, existingResource, req) {
    try {
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'CLIENT_UPDATED',
          description: `Client updated: ${resource.firstName} ${resource.lastName}`,
          entityType: 'CLIENT',
          entityId: resource.id,
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    } catch (error) {
      console.error('Failed to log client update:', error);
    }
  }

  // Override user filtering for clients (clients don't have direct user ownership)
  addUserFilter(where, user) {
    if (user.role === 'ADMIN') {
      return where;
    }
    
    if (user.role === 'ATTORNEY') {
      // Attorneys can see all clients
      return where;
    }
    
    if (user.role === 'PARALEGAL') {
      // Paralegals can see clients with cases they're assigned to
      return {
        ...where,
        cases: {
          some: {
            userId: user.userId
          }
        }
      };
    }
    
    // Other roles have no access to clients
    return {
      ...where,
      id: 'no-access' // This will return no results
    };
  }

  // Override ownership check (attorneys can access all clients they're assigned to)
  checkOwnership(resource, user) {
    if (['ADMIN', 'ATTORNEY'].includes(user.role)) {
      return true;
    }
    
    // Paralegals can access clients if they have cases assigned to them
    if (user.role === 'PARALEGAL' && resource.cases) {
      const hasAssignedCases = resource.cases.some(caseItem => caseItem.userId === user.userId);
      if (hasAssignedCases) {
        return true;
      }
    }

    throw new APIError('Access denied. You can only access clients you are assigned to.', 403);
  }

  // Generate unique client number
  async generateClientNumber() {
    const year = new Date().getFullYear();
    const prefix = `CL${year}`;
    
    // Find the highest existing client number for this year
    const lastClient = await prisma.client.findFirst({
      where: {
        clientNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        clientNumber: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastClient) {
      const lastNumber = parseInt(lastClient.clientNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // Custom route: Get client statistics
  getClientStats = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        cases: {
          include: {
            billing: true,
            timeEntries: true,
            settlements: true
          }
        },
        communications: true,
        tasks: true
      }
    });

    if (!client) {
      const response = APIResponse.notFound('Client', id);
      return res.status(404).json(response);
    }

    // Check ownership
    this.checkOwnership(client, req.user);

    // Calculate statistics
    const stats = {
      totalCases: client.cases.length,
      activeCases: client.cases.filter(c => c.status === 'ACTIVE').length,
      closedCases: client.cases.filter(c => c.status === 'CLOSED').length,
      totalBilled: client.cases.reduce((sum, caseItem) => 
        sum + caseItem.billing.reduce((billingSum, b) => billingSum + b.totalAmount, 0), 0),
      totalPaid: client.cases.reduce((sum, caseItem) => 
        sum + caseItem.billing.reduce((billingSum, b) => billingSum + b.paidAmount, 0), 0),
      totalTimeHours: client.cases.reduce((sum, caseItem) => 
        sum + caseItem.timeEntries.reduce((timeSum, t) => timeSum + t.hours, 0), 0),
      totalSettlements: client.cases.reduce((sum, caseItem) => 
        sum + caseItem.settlements.reduce((settlementSum, s) => settlementSum + s.amount, 0), 0),
      communicationCount: client.communications.length,
      taskCount: client.tasks.length,
      openTasks: client.tasks.filter(t => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length
    };

    const response = APIResponse.success(stats, 'Client statistics retrieved successfully');
    res.json(response);
  });

  // Custom route: Get client timeline
  getClientTimeline = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      const response = APIResponse.notFound('Client', id);
      return res.status(404).json(response);
    }

    // Check ownership
    this.checkOwnership(client, req.user);

    // Get timeline events from various sources
    const [activities, communications, tasks, caseEvents] = await Promise.all([
      prisma.activity.findMany({
        where: { entityId: id, entityType: 'CLIENT' },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.communication.findMany({
        where: { clientId: id },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { date: 'desc' }
      }),
      prisma.task.findMany({
        where: { clientId: id },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.case.findMany({
        where: { clientId: id },
        include: {
          settlements: { orderBy: { createdAt: 'desc' } },
          deadlines: { orderBy: { dueDate: 'desc' } }
        }
      })
    ]);

    // Combine and format timeline events
    const timeline = [];

    activities.forEach(activity => {
      timeline.push({
        type: 'activity',
        date: activity.createdAt,
        title: activity.action.replace(/_/g, ' ').toLowerCase(),
        description: activity.description,
        data: activity
      });
    });

    communications.forEach(comm => {
      timeline.push({
        type: 'communication',
        date: comm.date,
        title: `${comm.type.replace(/_/g, ' ').toLowerCase()} - ${comm.direction.toLowerCase()}`,
        description: comm.subject || comm.content.substring(0, 100),
        data: comm
      });
    });

    tasks.forEach(task => {
      timeline.push({
        type: 'task',
        date: task.createdAt,
        title: `Task ${task.status.toLowerCase()}: ${task.title}`,
        description: task.description,
        data: task
      });
    });

    caseEvents.forEach(caseItem => {
      timeline.push({
        type: 'case',
        date: caseItem.createdAt,
        title: `Case opened: ${caseItem.caseNumber}`,
        description: `${caseItem.caseType} case opened`,
        data: caseItem
      });

      caseItem.settlements.forEach(settlement => {
        timeline.push({
          type: 'settlement',
          date: settlement.createdAt,
          title: `Settlement ${settlement.type.toLowerCase()}`,
          description: `$${settlement.amount.toLocaleString()} settlement`,
          data: settlement
        });
      });
    });

    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    const response = APIResponse.success(
      timeline.slice(0, parseInt(limit)), 
      'Client timeline retrieved successfully'
    );
    res.json(response);
  });

  // Custom route: Merge clients
  mergeClients = ErrorHandler.asyncHandler(async (req, res) => {
    const { primaryClientId, secondaryClientId } = req.body;

    if (!primaryClientId || !secondaryClientId) {
      throw new APIError('Both primaryClientId and secondaryClientId are required', 400);
    }

    if (primaryClientId === secondaryClientId) {
      throw new APIError('Cannot merge a client with itself', 400);
    }

    // Check if both clients exist
    const [primaryClient, secondaryClient] = await Promise.all([
      prisma.client.findUnique({ where: { id: primaryClientId } }),
      prisma.client.findUnique({ where: { id: secondaryClientId } })
    ]);

    if (!primaryClient) {
      throw new APIError('Primary client not found', 404);
    }

    if (!secondaryClient) {
      throw new APIError('Secondary client not found', 404);
    }

    // Check permissions
    this.checkOwnership(primaryClient, req.user);
    this.checkOwnership(secondaryClient, req.user);

    // Perform merge transaction
    await prisma.$transaction(async (tx) => {
      // Move all related records from secondary to primary client
      await Promise.all([
        tx.case.updateMany({
          where: { clientId: secondaryClientId },
          data: { clientId: primaryClientId }
        }),
        tx.communication.updateMany({
          where: { clientId: secondaryClientId },
          data: { clientId: primaryClientId }
        }),
        tx.task.updateMany({
          where: { clientId: secondaryClientId },
          data: { clientId: primaryClientId }
        }),
        tx.billing.updateMany({
          where: { clientId: secondaryClientId },
          data: { clientId: primaryClientId }
        })
      ]);

      // Delete secondary client
      await tx.client.delete({ where: { id: secondaryClientId } });

      // Log the merge activity
      await tx.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'CLIENTS_MERGED',
          description: `Client ${secondaryClient.firstName} ${secondaryClient.lastName} merged into ${primaryClient.firstName} ${primaryClient.lastName}`,
          entityType: 'CLIENT',
          entityId: primaryClientId,
          userId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: JSON.stringify({
            primaryClient: primaryClientId,
            secondaryClient: secondaryClientId,
            secondaryClientName: `${secondaryClient.firstName} ${secondaryClient.lastName}`
          })
        }
      });
    });

    const response = APIResponse.success(
      { primaryClientId, mergedClientId: secondaryClientId },
      'Clients merged successfully'
    );
    res.json(response);
  });

  // Emergency Contact Management
  getEmergencyContacts = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: clientId } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    });

    if (!client) {
      const response = APIResponse.notFound('Client', clientId);
      return res.status(404).json(response);
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { clientId },
      orderBy: [
        { isPrimary: 'desc' },
        { firstName: 'asc' }
      ]
    });

    const response = APIResponse.success(contacts, 'Emergency contacts retrieved successfully');
    res.json(response);
  });

  createEmergencyContact = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: clientId } = req.params;
    const data = req.body;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    });

    if (!client) {
      const response = APIResponse.notFound('Client', clientId);
      return res.status(404).json(response);
    }

    // If setting as primary, unset other primary contacts
    if (data.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        ...data,
        clientId
      }
    });

    const response = APIResponse.success(contact, 'Emergency contact created successfully', { statusCode: 201 });
    res.status(201).json(response);
  });

  updateEmergencyContact = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: clientId, contactId } = req.params;
    const data = req.body;

    const contact = await prisma.emergencyContact.findFirst({
      where: { 
        id: contactId,
        clientId 
      }
    });

    if (!contact) {
      const response = APIResponse.notFound('Emergency contact', contactId);
      return res.status(404).json(response);
    }

    // If setting as primary, unset other primary contacts
    if (data.isPrimary && !contact.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const updatedContact = await prisma.emergencyContact.update({
      where: { id: contactId },
      data
    });

    const response = APIResponse.success(updatedContact, 'Emergency contact updated successfully');
    res.json(response);
  });

  deleteEmergencyContact = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: clientId, contactId } = req.params;

    const contact = await prisma.emergencyContact.findFirst({
      where: { 
        id: contactId,
        clientId 
      }
    });

    if (!contact) {
      const response = APIResponse.notFound('Emergency contact', contactId);
      return res.status(404).json(response);
    }

    await prisma.emergencyContact.delete({
      where: { id: contactId }
    });

    const response = APIResponse.success(null, 'Emergency contact deleted successfully');
    res.json(response);
  });
}

module.exports = new ClientController();