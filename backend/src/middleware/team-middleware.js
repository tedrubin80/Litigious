const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Team Management Middleware for Professional Package
 * Handles team-based access control and user limit enforcement
 */

class TeamMiddleware {
  /**
   * Enforce Professional package user limit (25 users max)
   */
  static async enforceUserLimit(req, res, next) {
    try {
      if (process.env.PACKAGE_TYPE !== 'PROFESSIONAL') {
        return next();
      }

      const config = await prisma.professionalConfig.findFirst();
      const currentUserCount = await prisma.user.count({
        where: { isActive: true }
      });

      if (currentUserCount >= (config?.maxUsers || 25)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'User limit reached for Professional package',
            code: 'USER_LIMIT_EXCEEDED',
            maxUsers: config?.maxUsers || 25,
            currentUsers: currentUserCount
          }
        });
      }

      req.professionalConfig = config;
      req.currentUserCount = currentUserCount;
      next();
    } catch (error) {
      console.error('Error enforcing user limit:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking user limits' }
      });
    }
  }

  /**
   * Check if user has team management permissions
   */
  static async requireTeamManagement(req, res, next) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      // Super admins and users with team management permissions can proceed
      if (user.role === 'SUPER_ADMIN' || user.canManageUsers) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: { message: 'Team management permissions required' }
      });
    } catch (error) {
      console.error('Error checking team management permissions:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking permissions' }
      });
    }
  }

  /**
   * Check if user can assign tasks to others
   */
  static async requireTaskAssignment(req, res, next) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      // Check if user has task assignment permissions
      if (user.role === 'SUPER_ADMIN' ||
          user.role === 'ADMIN' ||
          user.role === 'ATTORNEY' ||
          user.canAssignTasks) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: { message: 'Task assignment permissions required' }
      });
    } catch (error) {
      console.error('Error checking task assignment permissions:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking permissions' }
      });
    }
  }

  /**
   * Check if user can access case based on team membership
   */
  static async requireCaseAccess(req, res, next) {
    try {
      const user = req.user;
      const caseId = req.params.caseId || req.body.caseId;

      if (!user || !caseId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication and case ID required' }
        });
      }

      // Super admins always have access
      if (user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Check if user is assigned to the case or is a team member
      const caseAccess = await prisma.case.findFirst({
        where: {
          id: caseId,
          OR: [
            { attorneyId: user.id },
            { paralegalId: user.id },
            { secondAttorneyId: user.id },
            { caseManagerId: user.id },
            {
              teamMembers: {
                some: { userId: user.id }
              }
            },
            {
              permissions: {
                some: {
                  userId: user.id,
                  permissions: {
                    has: 'READ'
                  }
                }
              }
            }
          ]
        },
        include: {
          teamMembers: {
            where: { userId: user.id }
          },
          permissions: {
            where: { userId: user.id }
          }
        }
      });

      if (!caseAccess) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied to this case' }
        });
      }

      req.caseAccess = caseAccess;
      req.userCasePermissions = caseAccess.permissions[0]?.permissions || ['READ'];
      next();
    } catch (error) {
      console.error('Error checking case access:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking case access' }
      });
    }
  }

  /**
   * Check if user can manage team members
   */
  static async requireTeamMemberManagement(req, res, next) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      // Check role-based permissions
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'ATTORNEY'];
      if (allowedRoles.includes(user.role) || user.canManageUsers) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: { message: 'Team member management permissions required' }
      });
    } catch (error) {
      console.error('Error checking team member management permissions:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking permissions' }
      });
    }
  }

  /**
   * Get user's effective permissions for a resource
   */
  static async getUserPermissions(userId, resourceType, resourceId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userPermissions: true,
          casePermissions: {
            where: resourceType === 'case' ? { caseId: resourceId } : undefined
          }
        }
      });

      if (!user) return [];

      // Super admin has all permissions
      if (user.role === 'SUPER_ADMIN') {
        return ['READ', 'WRITE', 'DELETE', 'ADMIN', 'ASSIGN', 'SHARE'];
      }

      let permissions = [];

      // Role-based permissions
      switch (user.role) {
        case 'ADMIN':
          permissions = ['READ', 'WRITE', 'DELETE', 'ASSIGN', 'SHARE'];
          break;
        case 'ATTORNEY':
          permissions = ['READ', 'WRITE', 'ASSIGN', 'SHARE'];
          break;
        case 'PARALEGAL':
          permissions = ['READ', 'WRITE', 'SHARE'];
          break;
        case 'ASSISTANT':
          permissions = ['READ', 'WRITE'];
          break;
        default:
          permissions = ['READ'];
      }

      // Add specific case permissions
      if (resourceType === 'case' && user.casePermissions.length > 0) {
        const casePerms = user.casePermissions[0].permissions;
        permissions = [...new Set([...permissions, ...casePerms])];
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission for a resource
   */
  static async hasPermission(req, res, next) {
    const requiredPermission = req.requiredPermission || 'READ';
    const resourceType = req.resourceType || 'case';
    const resourceId = req.params.caseId || req.params.resourceId;

    try {
      const permissions = await TeamMiddleware.getUserPermissions(
        req.user.id,
        resourceType,
        resourceId
      );

      if (!permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: {
            message: `${requiredPermission} permission required`,
            requiredPermission,
            userPermissions: permissions
          }
        });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking permissions' }
      });
    }
  }

  /**
   * Middleware factory for checking specific permissions
   */
  static requirePermission(permission, resourceType = 'case') {
    return (req, res, next) => {
      req.requiredPermission = permission;
      req.resourceType = resourceType;
      TeamMiddleware.hasPermission(req, res, next);
    };
  }

  /**
   * Update user count in Professional config
   */
  static async updateUserCount() {
    try {
      const currentUserCount = await prisma.user.count({
        where: { isActive: true }
      });

      await prisma.professionalConfig.updateMany({
        data: { currentUserCount }
      });

      return currentUserCount;
    } catch (error) {
      console.error('Error updating user count:', error);
      throw error;
    }
  }

  /**
   * Check team collaboration features
   */
  static async requireTeamFeatures(req, res, next) {
    try {
      if (process.env.PACKAGE_TYPE !== 'PROFESSIONAL') {
        return res.status(403).json({
          success: false,
          error: { message: 'Professional package required for team features' }
        });
      }

      const config = await prisma.professionalConfig.findFirst();

      if (!config?.teamFeaturesEnabled) {
        return res.status(403).json({
          success: false,
          error: { message: 'Team features are disabled' }
        });
      }

      next();
    } catch (error) {
      console.error('Error checking team features:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error checking team features' }
      });
    }
  }
}

module.exports = TeamMiddleware;