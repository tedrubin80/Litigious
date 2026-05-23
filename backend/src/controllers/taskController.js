const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all tasks
exports.getTasks = async (req, res) => {
  try {
    const { 
      assignedToId, 
      caseId, 
      status, 
      priority,
      overdue,
      page = 1, 
      limit = 20 
    } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    
    if (assignedToId) where.assignedToId = assignedToId;
    if (caseId) where.caseId = caseId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    if (overdue === 'true') {
      where.status = { not: 'COMPLETED' };
      where.dueDate = { lt: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        case: {
          select: {
            id: true,
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
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { priority: 'desc' }
      ]
    });

    const total = await prisma.task.count({ where });

    res.json({
      tasks,
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

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        case: {
          select: {
            id: true,
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

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create task
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority = 'MEDIUM',
      caseId,
      assignedToId
    } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        caseId,
        assignedToId,
        createdById: req.user.id
      },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            email: true
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
        description: `Created task: ${title}`,
        entityType: 'TASK',
        entityId: task.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    // If marking as completed, set completedAt timestamp
    if (updateData.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
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
        description: `Updated task: ${task.title}`,
        entityType: 'TASK',
        entityId: task.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(task);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'DELETE',
        description: `Deleted task: ${task.title}`,
        entityType: 'TASK',
        entityId: task.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's tasks
exports.getUserTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, overdue, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let where = { assignedToId: id };
    
    if (status) where.status = status;
    
    if (overdue === 'true') {
      where.status = { not: 'COMPLETED' };
      where.dueDate = { lt: new Date() };
    }

    const tasks = await prisma.task.findMany({
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
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { priority: 'desc' }
      ]
    });

    const total = await prisma.task.count({ where });

    const stats = {
      total,
      pending: await prisma.task.count({
        where: { assignedToId: id, status: 'PENDING' }
      }),
      inProgress: await prisma.task.count({
        where: { assignedToId: id, status: 'IN_PROGRESS' }
      }),
      completed: await prisma.task.count({
        where: { assignedToId: id, status: 'COMPLETED' }
      }),
      overdue: await prisma.task.count({
        where: {
          assignedToId: id,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      })
    };

    res.json({
      tasks,
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

// Get case tasks
exports.getCaseTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    let where = { caseId: id };
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { priority: 'desc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};