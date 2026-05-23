const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET /api/settlements - Get all settlements for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settlements = await prisma.settlement.findMany({
      include: {
        case: {
          include: {
            user: true
          }
        },
        liens: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      settlements: settlements.map(settlement => ({
        id: settlement.id,
        amount: settlement.amount,
        type: settlement.type,
        status: settlement.status,
        description: settlement.description,
        attorneyFees: settlement.attorneyFees,
        costs: settlement.costs,
        netToClient: settlement.netToClient,
        date: settlement.date,
        createdAt: settlement.createdAt,
        case: {
          id: settlement.case.id,
          clientName: settlement.case.clientName,
          caseType: settlement.case.caseType,
          status: settlement.case.status,
          attorney: settlement.case.attorney
        },
        liensCount: settlement.liens.length
      }))
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({
      error: 'Failed to fetch settlements',
      details: error.message
    });
  }
});

// GET /api/settlements/:id - Get specific settlement
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.id },
      include: {
        case: {
          include: {
            user: true
          }
        },
        liens: true
      }
    });

    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    res.json({
      success: true,
      settlement: {
        id: settlement.id,
        amount: settlement.amount,
        type: settlement.type,
        status: settlement.status,
        description: settlement.description,
        attorneyFees: settlement.attorneyFees,
        costs: settlement.costs,
        netToClient: settlement.netToClient,
        date: settlement.date,
        createdAt: settlement.createdAt,
        case: {
          id: settlement.case.id,
          clientName: settlement.case.clientName,
          caseType: settlement.case.caseType,
          status: settlement.case.status,
          attorney: settlement.case.attorney
        },
        liens: settlement.liens
      }
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({
      error: 'Failed to fetch settlement',
      details: error.message
    });
  }
});

// POST /api/settlements - Create new settlement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      caseId, 
      amount, 
      type, 
      status, 
      description, 
      attorneyFees,
      costs,
      netToClient,
      date 
    } = req.body;

    // Validate required fields
    if (!caseId || !amount || !type) {
      return res.status(400).json({
        error: 'Missing required fields: caseId, amount, type'
      });
    }

    // Verify case exists
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId }
    });

    if (!caseExists) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const settlement = await prisma.settlement.create({
      data: {
        caseId,
        amount: parseFloat(amount),
        type,
        status: status || 'NEGOTIATING',
        description,
        attorneyFees: attorneyFees ? parseFloat(attorneyFees) : 0,
        costs: costs ? parseFloat(costs) : 0,
        netToClient: netToClient ? parseFloat(netToClient) : 0,
        date: date ? new Date(date) : null
      },
      include: {
        case: {
          include: {
            user: true
          }
        },
        liens: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Settlement created successfully',
      settlement: {
        id: settlement.id,
        amount: settlement.amount,
        type: settlement.type,
        status: settlement.status,
        description: settlement.description,
        attorneyFees: settlement.attorneyFees,
        costs: settlement.costs,
        netToClient: settlement.netToClient,
        date: settlement.date,
        createdAt: settlement.createdAt,
        case: {
          id: settlement.case.id,
          clientName: settlement.case.clientName,
          caseType: settlement.case.caseType,
          status: settlement.case.status,
          attorney: settlement.case.attorney
        }
      }
    });
  } catch (error) {
    console.error('Error creating settlement:', error);
    res.status(500).json({
      error: 'Failed to create settlement',
      details: error.message
    });
  }
});

// PUT /api/settlements/:id - Update settlement
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { 
      amount, 
      type, 
      status, 
      description, 
      attorneyFees,
      costs,
      netToClient,
      date 
    } = req.body;

    const settlement = await prisma.settlement.update({
      where: { id: req.params.id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(type && { type }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
        ...(attorneyFees !== undefined && { attorneyFees: parseFloat(attorneyFees) }),
        ...(costs !== undefined && { costs: parseFloat(costs) }),
        ...(netToClient !== undefined && { netToClient: parseFloat(netToClient) }),
        ...(date !== undefined && { 
          date: date ? new Date(date) : null 
        })
      },
      include: {
        case: {
          include: {
            user: true
          }
        },
        liens: true
      }
    });

    res.json({
      success: true,
      message: 'Settlement updated successfully',
      settlement: {
        id: settlement.id,
        amount: settlement.amount,
        type: settlement.type,
        status: settlement.status,
        description: settlement.description,
        attorneyFees: settlement.attorneyFees,
        costs: settlement.costs,
        netToClient: settlement.netToClient,
        date: settlement.date,
        case: {
          id: settlement.case.id,
          clientName: settlement.case.clientName,
          caseType: settlement.case.caseType,
          status: settlement.case.status,
          attorney: settlement.case.attorney
        }
      }
    });
  } catch (error) {
    console.error('Error updating settlement:', error);
    res.status(500).json({
      error: 'Failed to update settlement',
      details: error.message
    });
  }
});

// DELETE /api/settlements/:id - Delete settlement
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.settlement.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Settlement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting settlement:', error);
    res.status(500).json({
      error: 'Failed to delete settlement',
      details: error.message
    });
  }
});

// GET /api/settlements/case/:caseId - Get settlements for specific case
router.get('/case/:caseId', authenticateToken, async (req, res) => {
  try {
    const settlements = await prisma.settlement.findMany({
      where: { caseId: req.params.caseId },
      include: {
        case: {
          include: {
            user: true
          }
        },
        liens: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      settlements: settlements.map(settlement => ({
        id: settlement.id,
        amount: settlement.amount,
        type: settlement.type,
        status: settlement.status,
        description: settlement.description,
        attorneyFees: settlement.attorneyFees,
        costs: settlement.costs,
        netToClient: settlement.netToClient,
        date: settlement.date,
        createdAt: settlement.createdAt,
        liensCount: settlement.liens.length
      }))
    });
  } catch (error) {
    console.error('Error fetching case settlements:', error);
    res.status(500).json({
      error: 'Failed to fetch case settlements',
      details: error.message
    });
  }
});

module.exports = router;