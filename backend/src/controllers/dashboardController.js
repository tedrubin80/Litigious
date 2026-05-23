const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Base stats for all users
    let caseWhere = {};
    if (userRole === 'ATTORNEY') {
      caseWhere.attorneyId = userId;
    } else if (userRole === 'PARALEGAL') {
      caseWhere.OR = [
        { paralegalId: userId },
        { attorneyId: userId }
      ];
    }

    // Get case statistics
    const totalCases = await prisma.case.count({ where: caseWhere });
    const activeCases = await prisma.case.count({
      where: { ...caseWhere, status: 'ACTIVE' }
    });
    const intakeCases = await prisma.case.count({
      where: { ...caseWhere, status: 'INTAKE' }
    });
    const settledCases = await prisma.case.count({
      where: { ...caseWhere, status: 'SETTLED' }
    });

    // Get client statistics
    const totalClients = await prisma.client.count();
    const newClientsThisMonth = await prisma.client.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    // Get task statistics
    const myTasks = await prisma.task.count({
      where: { assignedToId: userId }
    });
    const overdueTasks = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    });
    const dueTodayTasks = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    // Get time tracking statistics
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyTimeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const monthlyHours = monthlyTimeEntries.reduce((total, entry) => 
      total + parseFloat(entry.hours), 0
    );
    const monthlyBillableHours = monthlyTimeEntries
      .filter(entry => entry.billable)
      .reduce((total, entry) => total + parseFloat(entry.hours), 0);
    const monthlyRevenue = monthlyTimeEntries.reduce((total, entry) => 
      total + parseFloat(entry.amount), 0
    );

    // Get settlement statistics
    const settlements = await prisma.case.findMany({
      where: {
        ...caseWhere,
        status: 'SETTLED',
        settlementAmount: { not: null }
      },
      select: {
        settlementAmount: true,
        attorneyFees: true,
        dateClosed: true
      }
    });

    const totalSettlements = settlements.reduce((total, settlement) =>
      total + parseFloat(settlement.settlementAmount || 0), 0
    );
    const totalFees = settlements.reduce((total, settlement) =>
      total + parseFloat(settlement.attorneyFees || 0), 0
    );

    // Get recent activity
    const recentActivities = await prisma.activity.findMany({
      where: userRole === 'ADMIN' ? {} : { userId },
      take: 10,
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

    // Get upcoming deadlines
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      include: {
        case: {
          select: {
            title: true,
            caseNumber: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 5
    });

    // Get case status distribution
    const caseStatusDistribution = await prisma.case.groupBy({
      by: ['status'],
      where: caseWhere,
      _count: {
        status: true
      }
    });

    // Get case type distribution
    const caseTypeDistribution = await prisma.case.groupBy({
      by: ['type'],
      where: caseWhere,
      _count: {
        type: true
      }
    });

    res.json({
      caseStats: {
        total: totalCases,
        active: activeCases,
        intake: intakeCases,
        settled: settledCases,
        statusDistribution: caseStatusDistribution,
        typeDistribution: caseTypeDistribution
      },
      clientStats: {
        total: totalClients,
        newThisMonth: newClientsThisMonth
      },
      taskStats: {
        total: myTasks,
        overdue: overdueTasks,
        dueToday: dueTodayTasks
      },
      timeStats: {
        monthlyHours,
        monthlyBillableHours,
        monthlyRevenue,
        utilizationRate: monthlyHours > 0 ? (monthlyBillableHours / monthlyHours * 100) : 0
      },
      settlementStats: {
        totalSettlements,
        totalFees,
        averageSettlement: settlements.length > 0 ? totalSettlements / settlements.length : 0,
        settledCasesCount: settlements.length
      },
      // Frontend expects these arrays to always exist
      recentActivity: Array.isArray(recentActivities) ? recentActivities : [],
      recentCases: [], // Recent cases need to be fetched separately
      upcomingDeadlines: Array.isArray(upcomingDeadlines) ? upcomingDeadlines : [],
      
      // Additional metadata
      lastUpdated: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    
    // Return safe fallback data instead of throwing
    res.status(200).json({
      caseStats: {
        total: 0,
        active: 0,
        intake: 0,
        settled: 0,
        statusDistribution: [],
        typeDistribution: []
      },
      clientStats: {
        total: 0,
        newThisMonth: 0
      },
      taskStats: {
        total: 0,
        overdue: 0,
        dueToday: 0
      },
      timeStats: {
        monthlyHours: 0,
        monthlyBillableHours: 0,
        monthlyRevenue: 0,
        utilizationRate: 0
      },
      settlementStats: {
        totalSettlements: 0,
        totalFees: 0,
        averageSettlement: 0,
        settledCasesCount: 0
      },
      recentActivity: [],
      recentCases: [],
      upcomingDeadlines: [],
      lastUpdated: new Date().toISOString(),
      success: false,
      error: 'Failed to load some dashboard data',
      debugInfo: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get case analytics
exports.getCaseAnalytics = async (req, res) => {
  try {
    const { period = '6m' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '1m':
        dateFilter = { gte: new Date(now.setMonth(now.getMonth() - 1)) };
        break;
      case '3m':
        dateFilter = { gte: new Date(now.setMonth(now.getMonth() - 3)) };
        break;
      case '6m':
        dateFilter = { gte: new Date(now.setMonth(now.getMonth() - 6)) };
        break;
      case '1y':
        dateFilter = { gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
        break;
    }

    // Cases opened over time
    const casesOpened = await prisma.case.groupBy({
      by: ['dateOpened'],
      where: {
        dateOpened: dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        dateOpened: 'asc'
      }
    });

    // Cases closed over time
    const casesClosed = await prisma.case.groupBy({
      by: ['dateClosed'],
      where: {
        dateClosed: { ...dateFilter, not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        dateClosed: 'asc'
      }
    });

    // Settlement amounts over time
    const settlements = await prisma.case.findMany({
      where: {
        status: 'SETTLED',
        dateClosed: { ...dateFilter, not: null },
        settlementAmount: { not: null }
      },
      select: {
        settlementAmount: true,
        attorneyFees: true,
        dateClosed: true,
        type: true
      },
      orderBy: {
        dateClosed: 'asc'
      }
    });

    // Average case duration
    const closedCases = await prisma.case.findMany({
      where: {
        dateClosed: { not: null, ...dateFilter }
      },
      select: {
        dateOpened: true,
        dateClosed: true,
        type: true
      }
    });

    const caseDurations = closedCases.map(caseData => ({
      type: caseData.type,
      duration: Math.floor((new Date(caseData.dateClosed) - new Date(caseData.dateOpened)) / (1000 * 60 * 60 * 24))
    }));

    const avgDurationByType = caseDurations.reduce((acc, curr) => {
      if (!acc[curr.type]) {
        acc[curr.type] = { total: 0, count: 0 };
      }
      acc[curr.type].total += curr.duration;
      acc[curr.type].count += 1;
      return acc;
    }, {});

    Object.keys(avgDurationByType).forEach(type => {
      avgDurationByType[type] = avgDurationByType[type].total / avgDurationByType[type].count;
    });

    res.json({
      casesOpened,
      casesClosed,
      settlements,
      avgDurationByType,
      summary: {
        totalCasesOpened: casesOpened.reduce((sum, item) => sum + item._count.id, 0),
        totalCasesClosed: casesClosed.reduce((sum, item) => sum + item._count.id, 0),
        totalSettlements: settlements.reduce((sum, settlement) => 
          sum + parseFloat(settlement.settlementAmount || 0), 0),
        avgSettlement: settlements.length > 0 
          ? settlements.reduce((sum, settlement) => 
              sum + parseFloat(settlement.settlementAmount || 0), 0) / settlements.length
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Base query filters
    let caseWhere = {};
    if (userRole === 'ATTORNEY') {
      caseWhere.attorneyId = userId;
    } else if (userRole === 'PARALEGAL') {
      caseWhere.OR = [
        { paralegalId: userId },
        { attorneyId: userId }
      ];
    }

    // Get case counts
    const activeCases = await prisma.case.count({
      where: { ...caseWhere, status: 'ACTIVE' }
    });

    // Get today's tasks
    const todaysTasks = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    // Get recent documents
    const recentDocuments = await prisma.document.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    // Get upcoming deadlines count
    const upcomingDeadlines = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    res.json({
      activeCases,
      todaysTasks,
      recentDocuments,
      upcomingDeadlines,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get recent activities
    const activities = await prisma.activity.findMany({
      where: userRole === 'ADMIN' ? {} : { userId },
      take: 15,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.action,
      description: activity.description || `${activity.action} on ${activity.entityType}`,
      user: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System',
      timestamp: activity.createdAt,
      entityType: activity.entityType,
      entityId: activity.entityId
    }));

    res.json({
      activities: formattedActivities,
      total: formattedActivities.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user activity report
exports.getUserActivity = async (req, res) => {
  try {
    const { period = '1m', userId } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '1w':
        dateFilter = { gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case '1m':
        dateFilter = { gte: new Date(now.setMonth(now.getMonth() - 1)) };
        break;
      case '3m':
        dateFilter = { gte: new Date(now.setMonth(now.getMonth() - 3)) };
        break;
    }

    let where = { createdAt: dateFilter };
    if (userId) {
      where.userId = userId;
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group activities by action type
    const activityByType = activities.reduce((acc, activity) => {
      if (!acc[activity.action]) {
        acc[activity.action] = 0;
      }
      acc[activity.action]++;
      return acc;
    }, {});

    // Group activities by user
    const activityByUser = activities.reduce((acc, activity) => {
      const userName = `${activity.user.firstName} ${activity.user.lastName}`;
      if (!acc[userName]) {
        acc[userName] = { count: 0, role: activity.user.role };
      }
      acc[userName].count++;
      return acc;
    }, {});

    res.json({
      activities,
      activityByType,
      activityByUser,
      summary: {
        totalActivities: activities.length,
        uniqueUsers: Object.keys(activityByUser).length,
        mostActiveUser: Object.entries(activityByUser).sort((a, b) => b[1].count - a[1].count)[0]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get task statistics
exports.getTaskStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get task counts by status
    const pending = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: 'PENDING'
      }
    });

    const inProgress = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: 'IN_PROGRESS'
      }
    });

    const completed = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: 'COMPLETED'
      }
    });

    const overdue = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() }
      }
    });

    // Get task completion rate for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasksLast30Days = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        status: true,
        completedAt: true
      }
    });

    const completedLast30Days = tasksLast30Days.filter(t => t.status === 'COMPLETED').length;
    const totalLast30Days = tasksLast30Days.length;
    const completionRate = totalLast30Days > 0 ? (completedLast30Days / totalLast30Days * 100) : 0;

    // Get tasks by priority
    const highPriority = await prisma.task.count({
      where: {
        assignedToId: userId,
        priority: 'HIGH',
        status: { not: 'COMPLETED' }
      }
    });

    const mediumPriority = await prisma.task.count({
      where: {
        assignedToId: userId,
        priority: 'MEDIUM',
        status: { not: 'COMPLETED' }
      }
    });

    const lowPriority = await prisma.task.count({
      where: {
        assignedToId: userId,
        priority: 'LOW',
        status: { not: 'COMPLETED' }
      }
    });

    res.json({
      byStatus: {
        pending,
        inProgress,
        completed,
        overdue
      },
      byPriority: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority
      },
      metrics: {
        total: pending + inProgress + completed,
        completionRate: Math.round(completionRate),
        averageCompletionTime: null // Could calculate if needed
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Task statistics error:', error);
    res.status(500).json({ error: error.message });
  }
};