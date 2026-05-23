const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../middleware/auth');
const TeamMiddleware = require('../middleware/team-middleware');
const PermissionsMiddleware = require('../middleware/permissions-middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for team operations
const teamRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: { message: 'Too many team requests, please try again later' }
  }
});

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(teamRateLimit);
router.use(TeamMiddleware.requireTeamFeatures);

/**
 * @swagger
 * /api/team/users:
 *   get:
 *     summary: Get all team members
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Team members retrieved successfully
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get('/users', PermissionsMiddleware.requirePermission('user:read'), async (req, res) => {
  try {
    const { department, role, isActive } = req.query;

    const where = {};
    if (department) where.department = department;
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        title: true,
        isActive: true,
        phone: true,
        avatarUrl: true,
        hireDate: true,
        supervisor: true,
        canAssignTasks: true,
        canManageClients: true,
        canViewBilling: true,
        canManageUsers: true,
        lastLogin: true,
        createdAt: true
      },
      include: {
        supervisorUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    const config = await prisma.professionalConfig.findFirst();

    res.json({
      success: true,
      data: {
        users,
        totalUsers: users.length,
        maxUsers: config?.maxUsers || 25,
        activeUsers: users.filter(u => u.isActive).length
      }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error fetching team members' }
    });
  }
});

/**
 * @swagger
 * /api/team/users:
 *   post:
 *     summary: Add new team member
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ATTORNEY, PARALEGAL, ASSISTANT]
 *               department:
 *                 type: string
 *               title:
 *                 type: string
 *               phone:
 *                 type: string
 *               supervisor:
 *                 type: string
 *     responses:
 *       201:
 *         description: Team member added successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: User limit exceeded or access denied
 *       500:
 *         description: Internal server error
 */
router.post('/users',
  TeamMiddleware.enforceUserLimit,
  PermissionsMiddleware.requirePermission('user:create'),
  async (req, res) => {
    try {
      const {
        email,
        name,
        firstName,
        lastName,
        role,
        department,
        title,
        phone,
        supervisor,
        canAssignTasks = false,
        canManageClients = false,
        canViewBilling = false
      } = req.body;

      // Validate required fields
      if (!email || !name || !role) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email, name, and role are required' }
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: { message: 'User with this email already exists' }
        });
      }

      // Create new team member
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          firstName,
          lastName,
          role,
          department,
          title,
          phone,
          supervisor,
          canAssignTasks,
          canManageClients,
          canViewBilling,
          isActive: true,
          emailVerified: false // They'll need to verify email and set password
        },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          title: true,
          isActive: true,
          createdAt: true
        }
      });

      // Update user count
      await TeamMiddleware.updateUserCount();

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Team member added successfully. They will receive an email to set up their account.'
      });
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error adding team member' }
      });
    }
  }
);

/**
 * @swagger
 * /api/team/users/{userId}:
 *   put:
 *     summary: Update team member
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *               department:
 *                 type: string
 *               title:
 *                 type: string
 *               phone:
 *                 type: string
 *               supervisor:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Team member updated successfully
 *       404:
 *         description: Team member not found
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.put('/users/:userId',
  PermissionsMiddleware.requirePermission('user:update'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated via this endpoint
      delete updateData.email;
      delete updateData.password;
      delete updateData.id;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          title: true,
          isActive: true,
          phone: true,
          supervisor: true,
          canAssignTasks: true,
          canManageClients: true,
          canViewBilling: true,
          canManageUsers: true,
          updatedAt: true
        }
      });

      // Update user count if status changed
      if ('isActive' in updateData) {
        await TeamMiddleware.updateUserCount();
      }

      res.json({
        success: true,
        data: updatedUser,
        message: 'Team member updated successfully'
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: { message: 'Team member not found' }
        });
      }

      console.error('Error updating team member:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error updating team member' }
      });
    }
  }
);

/**
 * @swagger
 * /api/team/assignments:
 *   get:
 *     summary: Get team assignments for cases
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         schema:
 *           type: string
 *         description: Filter by specific case
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by specific user
 *     responses:
 *       200:
 *         description: Team assignments retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/assignments', PermissionsMiddleware.requirePermission('case:read'), async (req, res) => {
  try {
    const { caseId, userId } = req.query;

    const where = {};
    if (caseId) where.caseId = caseId;
    if (userId) where.userId = userId;

    const assignments = await prisma.caseTeamMember.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            priority: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching team assignments:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error fetching team assignments' }
    });
  }
});

/**
 * @swagger
 * /api/team/assignments:
 *   post:
 *     summary: Assign team member to case
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - userId
 *             properties:
 *               caseId:
 *                 type: string
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [lead, member, observer]
 *                 default: member
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [READ, WRITE, DELETE, ADMIN, ASSIGN, SHARE]
 *     responses:
 *       201:
 *         description: Team member assigned successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: User already assigned to case
 *       500:
 *         description: Internal server error
 */
router.post('/assignments',
  PermissionsMiddleware.requirePermission('case:assign'),
  async (req, res) => {
    try {
      const {
        caseId,
        userId,
        role = 'member',
        permissions = ['READ', 'WRITE']
      } = req.body;

      if (!caseId || !userId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Case ID and User ID are required' }
        });
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.caseTeamMember.findUnique({
        where: {
          caseId_userId: {
            caseId,
            userId
          }
        }
      });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          error: { message: 'User is already assigned to this case' }
        });
      }

      // Create assignment
      const assignment = await prisma.caseTeamMember.create({
        data: {
          caseId,
          userId,
          role,
          permissions,
          assignedById: req.user.id
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true
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
        }
      });

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Team member assigned to case successfully'
      });
    } catch (error) {
      console.error('Error assigning team member:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error assigning team member to case' }
      });
    }
  }
);

/**
 * @swagger
 * /api/team/assignments/{assignmentId}:
 *   delete:
 *     summary: Remove team member from case
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member removed successfully
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Internal server error
 */
router.delete('/assignments/:assignmentId',
  PermissionsMiddleware.requirePermission('case:assign'),
  async (req, res) => {
    try {
      const { assignmentId } = req.params;

      await prisma.caseTeamMember.delete({
        where: { id: assignmentId }
      });

      res.json({
        success: true,
        message: 'Team member removed from case successfully'
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: { message: 'Assignment not found' }
        });
      }

      console.error('Error removing team assignment:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error removing team assignment' }
      });
    }
  }
);

/**
 * @swagger
 * /api/team/workload:
 *   get:
 *     summary: Get team workload analytics
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workload analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/workload', PermissionsMiddleware.requirePermission('user:read'), async (req, res) => {
  try {
    const workloadData = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['ATTORNEY', 'PARALEGAL', 'ASSISTANT'] }
      },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        assignedCases: {
          where: {
            status: {
              in: ['ACTIVE', 'INVESTIGATION', 'DISCOVERY', 'TRIAL_PREPARATION']
            }
          },
          select: { id: true, title: true, priority: true }
        },
        paralegalCases: {
          where: {
            status: {
              in: ['ACTIVE', 'INVESTIGATION', 'DISCOVERY', 'TRIAL_PREPARATION']
            }
          },
          select: { id: true, title: true, priority: true }
        },
        assignedTasks: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          select: { id: true, title: true, priority: true, dueDate: true }
        },
        caseTeamMembers: {
          include: {
            case: {
              where: {
                status: {
                  in: ['ACTIVE', 'INVESTIGATION', 'DISCOVERY', 'TRIAL_PREPARATION']
                }
              },
              select: { id: true, title: true, priority: true }
            }
          }
        }
      }
    });

    const workloadSummary = workloadData.map(user => {
      const activeCases = [
        ...user.assignedCases,
        ...user.paralegalCases,
        ...user.caseTeamMembers.map(tm => tm.case).filter(Boolean)
      ];

      const uniqueCases = activeCases.filter((case_, index, self) =>
        index === self.findIndex(c => c.id === case_.id)
      );

      const overdueTasks = user.assignedTasks.filter(task =>
        task.dueDate && new Date(task.dueDate) < new Date()
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          department: user.department
        },
        workload: {
          activeCases: uniqueCases.length,
          pendingTasks: user.assignedTasks.length,
          overdueTasks: overdueTasks.length,
          highPriorityCases: uniqueCases.filter(c => c.priority === 'HIGH' || c.priority === 'CRITICAL').length,
          highPriorityTasks: user.assignedTasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL').length
        },
        details: {
          cases: uniqueCases,
          tasks: user.assignedTasks,
          overdueTasks
        }
      };
    });

    res.json({
      success: true,
      data: workloadSummary
    });
  } catch (error) {
    console.error('Error fetching workload analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error fetching workload analytics' }
    });
  }
});

/**
 * @swagger
 * /api/team/config:
 *   get:
 *     summary: Get Professional package configuration
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/config', PermissionsMiddleware.requirePermission('settings:read'), async (req, res) => {
  try {
    const config = await prisma.professionalConfig.findFirst();
    const currentUserCount = await prisma.user.count({
      where: { isActive: true }
    });

    res.json({
      success: true,
      data: {
        ...config,
        currentUserCount
      }
    });
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error fetching configuration' }
    });
  }
});

/**
 * @swagger
 * /api/team/config:
 *   put:
 *     summary: Update Professional package configuration
 *     tags: [Team Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamFeaturesEnabled:
 *                 type: boolean
 *               taskDelegationEnabled:
 *                 type: boolean
 *               documentSharingEnabled:
 *                 type: boolean
 *               timeTrackingEnabled:
 *                 type: boolean
 *               billingEnabled:
 *                 type: boolean
 *               clientPortalEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.put('/config',
  PermissionsMiddleware.requirePermission('settings:update'),
  async (req, res) => {
    try {
      const updateData = req.body;

      // Remove fields that shouldn't be updated via this endpoint
      delete updateData.id;
      delete updateData.maxUsers;
      delete updateData.currentUserCount;

      const config = await prisma.professionalConfig.updateMany({
        data: updateData
      });

      const updatedConfig = await prisma.professionalConfig.findFirst();

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error updating configuration' }
      });
    }
  }
);

module.exports = router;