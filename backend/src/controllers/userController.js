const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = role ? { role } : {};
    
    const users = await prisma.user.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        address: true,
        createdAt: true,
        lastLogin: true
      }
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
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

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        address: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          assignedCases: true,
          paralegalCases: true,
          tasks: true,
          timeEntries: true
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'PARALEGAL',
        phone,
        address
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        address: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, phone, address, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        role,
        phone,
        address,
        isActive
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        address: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get user stats
exports.getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await prisma.user.findUnique({
      where: { id },
      select: {
        _count: {
          assignedCases: true,
          paralegalCases: true,
          tasks: true,
          timeEntries: true,
          documents: true,
          notes: true
        },
        timeEntries: {
          select: {
            hours: true,
            amount: true,
            billable: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate time and billing stats
    const totalHours = stats.timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
    const billableHours = stats.timeEntries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
    const totalBilled = stats.timeEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    res.json({
      caseStats: {
        assignedCases: stats._count.assignedCases,
        paralegalCases: stats._count.paralegalCases
      },
      taskStats: {
        totalTasks: stats._count.tasks
      },
      timeStats: {
        totalHours,
        billableHours,
        totalBilled,
        totalEntries: stats._count.timeEntries
      },
      documentStats: {
        totalDocuments: stats._count.documents
      },
      noteStats: {
        totalNotes: stats._count.notes
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};