const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all time entries
exports.getTimeEntries = async (req, res) => {
  try {
    const { 
      userId, 
      caseId, 
      billable, 
      billed, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (userId) where.userId = userId;
    if (caseId) where.caseId = caseId;
    if (billable !== undefined) where.billable = billable === 'true';
    if (billed !== undefined) where.billed = billed === 'true';
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        case: {
          select: {
            title: true,
            caseNumber: true,
            client: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    const total = await prisma.timeEntry.count({ where });

    // Calculate summary statistics
    const stats = {
      totalHours: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      billableHours: timeEntries.filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      totalAmount: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
      billedAmount: timeEntries.filter(entry => entry.billed)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
    };

    res.json({
      timeEntries,
      stats,
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

// Create time entry
exports.createTimeEntry = async (req, res) => {
  try {
    const {
      description,
      hours,
      rate,
      date,
      billable = true,
      caseId
    } = req.body;

    const amount = parseFloat(hours) * parseFloat(rate);

    const timeEntry = await prisma.timeEntry.create({
      data: {
        description,
        hours: parseFloat(hours),
        rate: parseFloat(rate),
        amount,
        date: new Date(date),
        billable,
        caseId,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        case: {
          select: {
            title: true,
            caseNumber: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'CREATE',
        description: `Logged ${hours} hours: ${description}`,
        entityType: 'TIME_ENTRY',
        entityId: timeEntry.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update time entry
exports.updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    // Recalculate amount if hours or rate changed
    if (updateData.hours !== undefined || updateData.rate !== undefined) {
      const currentEntry = await prisma.timeEntry.findUnique({ where: { id } });
      if (!currentEntry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      const hours = updateData.hours !== undefined ? parseFloat(updateData.hours) : parseFloat(currentEntry.hours);
      const rate = updateData.rate !== undefined ? parseFloat(updateData.rate) : parseFloat(currentEntry.rate);
      updateData.amount = hours * rate;
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        case: {
          select: {
            title: true,
            caseNumber: true
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'UPDATE',
        description: `Updated time entry: ${timeEntry.description}`,
        entityType: 'TIME_ENTRY',
        entityId: timeEntry.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(timeEntry);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete time entry
exports.deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const timeEntry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!timeEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    await prisma.timeEntry.delete({ where: { id } });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'DELETE',
        description: `Deleted time entry: ${timeEntry.description}`,
        entityType: 'TIME_ENTRY',
        entityId: timeEntry.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user time entries
exports.getUserTimeEntries = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, billable, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let where = { userId: id };
    if (billable !== undefined) where.billable = billable === 'true';
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        case: {
          select: {
            title: true,
            caseNumber: true,
            client: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    const total = await prisma.timeEntry.count({ where });

    // Calculate user-specific stats
    const stats = {
      totalHours: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      billableHours: timeEntries.filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      totalAmount: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
      billedAmount: timeEntries.filter(entry => entry.billed)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
      utilizationRate: 0
    };

    // Calculate utilization rate (billable hours / total hours)
    if (stats.totalHours > 0) {
      stats.utilizationRate = (stats.billableHours / stats.totalHours) * 100;
    }

    res.json({
      timeEntries,
      stats,
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

// Get case time entries
exports.getCaseTimeEntries = async (req, res) => {
  try {
    const { id } = req.params;

    const timeEntries = await prisma.timeEntry.findMany({
      where: { caseId: id },
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
        date: 'desc'
      }
    });

    // Calculate case time statistics
    const stats = {
      totalHours: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      billableHours: timeEntries.filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      totalAmount: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
      billedAmount: timeEntries.filter(entry => entry.billed)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
    };

    // Group by user
    const byUser = timeEntries.reduce((acc, entry) => {
      const userId = entry.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          hours: 0,
          amount: 0,
          entries: []
        };
      }
      acc[userId].hours += parseFloat(entry.hours);
      acc[userId].amount += parseFloat(entry.amount);
      acc[userId].entries.push(entry);
      return acc;
    }, {});

    res.json({
      timeEntries,
      stats,
      byUser: Object.values(byUser)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark time entries as billed
exports.markAsBilled = async (req, res) => {
  try {
    const { timeEntryIds } = req.body;

    if (!timeEntryIds || !Array.isArray(timeEntryIds)) {
      return res.status(400).json({ error: 'timeEntryIds array is required' });
    }

    const updatedEntries = await prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntryIds },
        billable: true,
        billed: false
      },
      data: {
        billed: true
      }
    });

    // Log activity for each billed entry
    const timeEntries = await prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds } }
    });

    for (const entry of timeEntries) {
      await prisma.activity.create({
        data: {
          action: 'BILLING',
          description: `Marked time entry as billed: ${entry.description}`,
          entityType: 'TIME_ENTRY',
          entityId: entry.id,
          userId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

    res.json({
      message: `${updatedEntries.count} time entries marked as billed`,
      count: updatedEntries.count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate time report
exports.generateTimeReport = async (req, res) => {
  try {
    const { userId, caseId, startDate, endDate, groupBy = 'user' } = req.query;

    let where = {};
    if (userId) where.userId = userId;
    if (caseId) where.caseId = caseId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        case: {
          select: {
            title: true,
            caseNumber: true,
            client: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    let groupedData = {};
    
    if (groupBy === 'user') {
      groupedData = timeEntries.reduce((acc, entry) => {
        const key = `${entry.user.firstName} ${entry.user.lastName}`;
        if (!acc[key]) {
          acc[key] = {
            user: entry.user,
            totalHours: 0,
            billableHours: 0,
            totalAmount: 0,
            entries: []
          };
        }
        acc[key].totalHours += parseFloat(entry.hours);
        if (entry.billable) acc[key].billableHours += parseFloat(entry.hours);
        acc[key].totalAmount += parseFloat(entry.amount);
        acc[key].entries.push(entry);
        return acc;
      }, {});
    } else if (groupBy === 'case') {
      groupedData = timeEntries.reduce((acc, entry) => {
        const key = entry.case ? entry.case.caseNumber : 'No Case';
        if (!acc[key]) {
          acc[key] = {
            case: entry.case,
            totalHours: 0,
            billableHours: 0,
            totalAmount: 0,
            entries: []
          };
        }
        acc[key].totalHours += parseFloat(entry.hours);
        if (entry.billable) acc[key].billableHours += parseFloat(entry.hours);
        acc[key].totalAmount += parseFloat(entry.amount);
        acc[key].entries.push(entry);
        return acc;
      }, {});
    }

    const summary = {
      totalEntries: timeEntries.length,
      totalHours: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      billableHours: timeEntries.filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0),
      totalAmount: timeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
      billedAmount: timeEntries.filter(entry => entry.billed)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
      unbilledAmount: timeEntries.filter(entry => entry.billable && !entry.billed)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
    };

    res.json({
      summary,
      groupedData: Object.values(groupedData),
      timeEntries
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};