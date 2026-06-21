const prisma = require('../lib/prisma');

// Generate case number
const generateCaseNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}-${random}`;
};

// Get all cases
exports.getCases = async (req, res) => {
  try {
    const { 
      status, 
      type, 
      attorneyId, 
      paralegalId,
      search,
      page = 1, 
      limit = 10 
    } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    
    if (status) where.status = status;
    if (type) where.type = type;
    if (attorneyId) where.attorneyId = attorneyId;
    if (paralegalId) where.paralegalId = paralegalId;

    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role;

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      // Full access
    } else if (role === 'ATTORNEY') {
      where.OR = [
        { attorneyId: userId },
        { secondAttorneyId: userId },
        { referringAttorneyId: userId }
      ];
    } else if (role === 'PARALEGAL') {
      where.paralegalId = userId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to list cases'
      });
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { client: { 
          firstName: { contains: search, mode: 'insensitive' } 
        }},
        { client: { 
          lastName: { contains: search, mode: 'insensitive' } 
        }}
      ];
    }

    const cases = await prisma.case.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        attorney: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        paralegal: {
          select: {
            firstName: true,
            lastName: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.case.count({ where });

    res.json({
      cases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get case by ID
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        client: true,
        attorney: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        paralegal: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        incidents: true,
        medicalRecords: {
          include: {
            provider: true
          }
        },
        insurance: true,
        documents: {
          include: {
            uploadedBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        },
        timeEntries: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        },
        communications: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            dateTime: 'desc'
          },
          take: 10
        },
        notes: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        expenses: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(caseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create case
exports.createCase = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      clientId,
      attorneyId,
      paralegalId,
      statute
    } = req.body;

    const caseNumber = generateCaseNumber();

    const caseData = await prisma.case.create({
      data: {
        caseNumber,
        title,
        description,
        type,
        clientId,
        attorneyId,
        paralegalId,
        statute: statute ? new Date(statute) : null
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        attorney: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        paralegal: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'CREATE',
        description: `Created case: ${title}`,
        entityType: 'CASE',
        entityId: caseData.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(caseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update case
exports.updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.statute) {
      updateData.statute = new Date(updateData.statute);
    }
    if (updateData.dateClosed) {
      updateData.dateClosed = new Date(updateData.dateClosed);
    }

    const caseData = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        attorney: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        paralegal: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'UPDATE',
        description: `Updated case: ${caseData.title}`,
        entityType: 'CASE',
        entityId: caseData.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(caseData);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update case status
exports.updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };
    if (status === 'CLOSED' || status === 'SETTLED') {
      updateData.dateClosed = new Date();
    }

    const caseData = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'STATUS_UPDATE',
        description: `Changed case status to ${status}`,
        entityType: 'CASE',
        entityId: caseData.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(caseData);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get case timeline
exports.getCaseTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all activities for this case
    const activities = await prisma.activity.findMany({
      where: {
        entityType: 'CASE',
        entityId: id
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get case communications
    const communications = await prisma.communication.findMany({
      where: { caseId: id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        dateTime: 'desc'
      }
    });

    // Get case tasks
    const tasks = await prisma.task.findMany({
      where: { caseId: id },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Combine and sort all timeline events
    const timeline = [
      ...activities.map(activity => ({
        type: 'activity',
        date: activity.createdAt,
        data: activity
      })),
      ...communications.map(comm => ({
        type: 'communication',
        date: comm.dateTime,
        data: comm
      })),
      ...tasks.map(task => ({
        type: 'task',
        date: task.createdAt,
        data: task
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Record settlement
exports.recordSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { settlementAmount, attorneyFees, costs } = req.body;

    const netToClient = parseFloat(settlementAmount) - parseFloat(attorneyFees || 0) - parseFloat(costs || 0);

    const caseData = await prisma.case.update({
      where: { id },
      data: {
        settlementAmount: parseFloat(settlementAmount),
        attorneyFees: parseFloat(attorneyFees || 0),
        costs: parseFloat(costs || 0),
        netToClient,
        status: 'SETTLED',
        dateClosed: new Date()
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'SETTLEMENT',
        description: `Recorded settlement of $${settlementAmount}`,
        entityType: 'CASE',
        entityId: caseData.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(caseData);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Import required modules for class-based methods
const APIResponse = require('../lib/apiResponse');
const { ErrorHandler } = require('../middleware/errorHandler');
const AuthUtils = require('../lib/authUtils');

class CaseController {
  // Add case deadline
  addCaseDeadline = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, dueDate, type, priority, isStatutory, reminderDays } = req.body;

    const case_ = await prisma.case.findUnique({
      where: { id },
      select: { id: true, nextDeadline: true }
    });

    if (!case_) {
      const response = APIResponse.notFound('Case', id);
      return res.status(404).json(response);
    }

    const deadline = await prisma.caseDeadline.create({
      data: {
        id: AuthUtils.generateToken(16),
        caseId: id,
        title,
        description,
        dueDate: new Date(dueDate),
        type,
        priority: priority || 'MEDIUM',
        isStatutory: isStatutory || false,
        reminderDays: reminderDays || [7, 1]
      },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update case next deadline if this is sooner
    const caseNextDeadline = await prisma.caseDeadline.findFirst({
      where: { caseId: id, completed: false },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true, title: true }
    });

    if (caseNextDeadline && (!case_.nextDeadline || caseNextDeadline.dueDate < case_.nextDeadline)) {
      await prisma.case.update({
        where: { id },
        data: {
          nextDeadline: caseNextDeadline.dueDate,
          deadlineDescription: caseNextDeadline.title
        }
      });
    }

    const response = APIResponse.created(deadline, 'Case deadline created successfully');
    res.status(201).json(response);
  });

  // Complete case deadline
  completeCaseDeadline = ErrorHandler.asyncHandler(async (req, res) => {
    const { id, deadlineId } = req.params;
    const { notes } = req.body;

    const deadline = await prisma.caseDeadline.findUnique({
      where: { id: deadlineId },
      select: { id: true, caseId: true, title: true }
    });

    if (!deadline || deadline.caseId !== id) {
      const response = APIResponse.notFound('Case deadline', deadlineId);
      return res.status(404).json(response);
    }

    const updated = await prisma.caseDeadline.update({
      where: { id: deadlineId },
      data: {
        completed: true,
        completedAt: new Date(),
        completedById: req.user.userId
      },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update case next deadline
    const nextDeadline = await prisma.caseDeadline.findFirst({
      where: { caseId: id, completed: false },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true, title: true }
    });

    await prisma.case.update({
      where: { id },
      data: {
        nextDeadline: nextDeadline?.dueDate || null,
        deadlineDescription: nextDeadline?.title || null
      }
    });

    const response = APIResponse.success(updated, 'Case deadline marked as complete');
    res.json(response);
  });

  // Get case value history
  getCaseValueHistory = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify case exists
    const case_ = await this.model.findUnique({
      where: { id },
      select: { id: true, caseNumber: true, title: true }
    });

    if (!case_) {
      const response = APIResponse.notFound('Case', id);
      return res.status(404).json(response);
    }

    const valueHistory = await prisma.caseValue.findMany({
      where: { caseId: id },
      include: {
        enteredBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const response = APIResponse.success(valueHistory, 'Case value history retrieved successfully');
    res.json(response);
  });

  // Add case value entry
  addCaseValue = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { valueType, amount, description } = req.body;

    // Verify case exists
    const case_ = await this.model.findUnique({
      where: { id },
      select: { id: true, caseNumber: true }
    });

    if (!case_) {
      const response = APIResponse.notFound('Case', id);
      return res.status(404).json(response);
    }

    // Deactivate previous value of same type
    await prisma.caseValue.updateMany({
      where: { caseId: id, valueType, isActive: true },
      data: { isActive: false }
    });

    // Create new value entry
    const caseValue = await prisma.caseValue.create({
      data: {
        id: AuthUtils.generateToken(16),
        caseId: id,
        valueType,
        amount: parseFloat(amount),
        description,
        enteredById: req.user.userId,
        isActive: true
      },
      include: {
        enteredBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update main case record with latest values
    const updateData = {};
    if (valueType === 'INITIAL_ESTIMATE') updateData.estimatedValue = parseFloat(amount);
    if (valueType === 'DEMAND') updateData.demandAmount = parseFloat(amount);
    if (valueType === 'SETTLEMENT') updateData.settlementAmount = parseFloat(amount);

    if (Object.keys(updateData).length > 0) {
      await prisma.case.update({
        where: { id },
        data: updateData
      });
    }

    const response = APIResponse.created(caseValue, 'Case value added successfully');
    res.status(201).json(response);
  });

  // Get case dashboard/overview with key metrics
  getCaseDashboard = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get comprehensive case data
    const case_ = await this.model.findUnique({
      where: { id },
      include: {
        ...this.options.include,
        caseStatusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5,
          include: {
            changedBy: {
              select: { name: true }
            }
          }
        },
        caseDeadlines: {
          where: { completed: false },
          orderBy: { dueDate: 'asc' },
          take: 5
        },
        caseValues: {
          where: { isActive: true },
          orderBy: { date: 'desc' }
        },
        communications: {
          orderBy: { dateTime: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            subject: true,
            dateTime: true
          }
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          orderBy: { dueDate: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            dueDate: true,
            priority: true,
            status: true
          }
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            description: true,
            hours: true,
            date: true,
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!case_) {
      const response = APIResponse.notFound('Case', id);
      return res.status(404).json(response);
    }

    // Calculate key metrics
    const [totalTimeEntries, totalExpenses, documentCount, communicationCount] = await Promise.all([
      prisma.timeEntry.aggregate({
        where: { caseId: id },
        _sum: { hours: true, amount: true }
      }),
      prisma.expense.aggregate({
        where: { caseId: id },
        _sum: { amount: true }
      }),
      prisma.document.count({ where: { caseId: id } }),
      prisma.communication.count({ where: { caseId: id } })
    ]);

    const dashboard = {
      case: case_,
      metrics: {
        totalHours: totalTimeEntries._sum.hours || 0,
        totalBilled: totalTimeEntries._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        documentCount,
        communicationCount,
        daysOpen: Math.floor((new Date() - case_.dateOpened) / (1000 * 60 * 60 * 24))
      }
    };

    const response = APIResponse.success(dashboard, 'Case dashboard retrieved successfully');
    res.json(response);
  });

  // Get case statistics overview for reporting
  getCaseStats = ErrorHandler.asyncHandler(async (req, res) => {
    const { dateFrom, dateTo, attorneyId, type, status } = req.query;

    let where = {};
    if (attorneyId) where.attorneyId = attorneyId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.dateOpened = {};
      if (dateFrom) where.dateOpened.gte = new Date(dateFrom);
      if (dateTo) where.dateOpened.lte = new Date(dateTo);
    }

    const [
      totalCases,
      activeCases,
      closedCases,
      byStatus,
      byType,
      byPriority,
      byStage,
      avgTimeToClose,
      totalSettlements,
      upcomingDeadlines
    ] = await Promise.all([
      prisma.case.count({ where }),
      prisma.case.count({ where: { ...where, isActive: true } }),
      prisma.case.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.case.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }),
      prisma.case.groupBy({
        by: ['type'],
        where,
        _count: { id: true }
      }),
      prisma.case.groupBy({
        by: ['priority'],
        where,
        _count: { id: true }
      }),
      prisma.case.groupBy({
        by: ['stage'],
        where,
        _count: { id: true }
      }),
      prisma.case.aggregate({
        where: { ...where, dateClosed: { not: null } },
        _avg: {
          // This would need a computed field for days between open and closed
        }
      }),
      prisma.case.aggregate({
        where: { ...where, settlementAmount: { not: null } },
        _sum: { settlementAmount: true },
        _avg: { settlementAmount: true },
        _count: { settlementAmount: true }
      }),
      prisma.caseDeadline.count({
        where: {
          case: where,
          completed: false,
          dueDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const stats = {
      summary: {
        totalCases,
        activeCases,
        closedCases,
        upcomingDeadlines
      },
      distributions: {
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.id;
          return acc;
        }, {}),
        byStage: byStage.reduce((acc, item) => {
          acc[item.stage] = item._count.id;
          return acc;
        }, {})
      },
      settlements: {
        totalAmount: totalSettlements._sum.settlementAmount || 0,
        averageAmount: totalSettlements._avg.settlementAmount || 0,
        count: totalSettlements._count.settlementAmount || 0
      }
    };

    const response = APIResponse.success(stats, 'Case statistics retrieved successfully');
    res.json(response);
  });
}

// Create instance for class methods
const caseControllerInstance = new CaseController();

// Export both old exports and class methods with aliases for compatibility
module.exports = {
  // Old-style exports
  getCases: exports.getCases,
  getCaseById: exports.getCaseById,
  createCase: exports.createCase,
  updateCase: exports.updateCase,
  updateCaseStatus: exports.updateCaseStatus,
  getCaseTimeline: exports.getCaseTimeline,
  recordSettlement: exports.recordSettlement,

  // BaseController-style aliases for api-v1.js compatibility
  getAll: exports.getCases,
  getById: exports.getCaseById,
  create: exports.createCase,
  update: exports.updateCase,
  delete: exports.updateCase, // Map to update as there's no delete in original

  // Class-based methods
  addCaseDeadline: caseControllerInstance.addCaseDeadline,
  createCaseDeadline: caseControllerInstance.addCaseDeadline, // Alias
  completeCaseDeadline: caseControllerInstance.completeCaseDeadline,
  getCaseValueHistory: caseControllerInstance.getCaseValueHistory,
  addCaseValue: caseControllerInstance.addCaseValue,
  getCaseDashboard: caseControllerInstance.getCaseDashboard,
  getCaseStats: caseControllerInstance.getCaseStats,

  // Stub methods for missing features
  getCaseStatusHistory: (req, res) => res.json({ success: true, data: [] }),
  getCaseDeadlines: (req, res) => res.json({ success: true, data: [] }),
  getAttorneyWorkload: (req, res) => res.json({ success: true, data: [] })
};