const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Role-Based Permissions Middleware for Professional Package
 * Implements granular permissions based on user roles and assignments
 */

class PermissionsMiddleware {
  /**
   * Role hierarchy and default permissions
   */
  static roleHierarchy = {
    SUPER_ADMIN: {
      level: 100,
      permissions: ['*'] // All permissions
    },
    ADMIN: {
      level: 80,
      permissions: [
        'user:create', 'user:read', 'user:update', 'user:delete',
        'case:create', 'case:read', 'case:update', 'case:delete', 'case:assign',
        'client:create', 'client:read', 'client:update', 'client:delete',
        'document:create', 'document:read', 'document:update', 'document:delete', 'document:share',
        'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign',
        'billing:read', 'billing:create', 'billing:update',
        'team:manage', 'team:assign',
        'settings:read', 'settings:update'
      ]
    },
    ATTORNEY: {
      level: 60,
      permissions: [
        'case:create', 'case:read', 'case:update', 'case:assign',
        'client:create', 'client:read', 'client:update',
        'document:create', 'document:read', 'document:update', 'document:share',
        'task:create', 'task:read', 'task:update', 'task:assign',
        'billing:read', 'billing:create',
        'team:assign'
      ]
    },
    PARALEGAL: {
      level: 40,
      permissions: [
        'case:read', 'case:update',
        'client:read', 'client:update',
        'document:create', 'document:read', 'document:update', 'document:share',
        'task:create', 'task:read', 'task:update',
        'billing:read'
      ]
    },
    ASSISTANT: {
      level: 20,
      permissions: [
        'case:read',
        'client:read', 'client:update',
        'document:read', 'document:update',
        'task:read', 'task:update'
      ]
    },
    CLIENT: {
      level: 10,
      permissions: [
        'case:read', // Only own cases
        'document:read', // Only own documents
        'communication:create', 'communication:read'
      ]
    }
  };

  /**
   * Check if user has required permission
   */
  static requirePermission(permission) {
    return async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return res.status(401).json({
            success: false,
            error: { message: 'Authentication required' }
          });
        }

        const hasPermission = await PermissionsMiddleware.userHasPermission(user, permission);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: {
              message: 'Insufficient permissions',
              required: permission,
              userRole: user.role
            }
          });
        }

        next();
      } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Internal server error checking permissions' }
        });
      }
    };
  }

  /**
   * Check if user has any of the required permissions
   */
  static requireAnyPermission(permissions) {
    return async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return res.status(401).json({
            success: false,
            error: { message: 'Authentication required' }
          });
        }

        for (const permission of permissions) {
          if (await PermissionsMiddleware.userHasPermission(user, permission)) {
            return next();
          }
        }

        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            required: permissions,
            userRole: user.role
          }
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Internal server error checking permissions' }
        });
      }
    };
  }

  /**
   * Check if user has permission for specific resource
   */
  static requireResourcePermission(resourceType, permission) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        const resourceId = req.params.id || req.params.caseId || req.params.clientId || req.params.documentId;

        if (!user) {
          return res.status(401).json({
            success: false,
            error: { message: 'Authentication required' }
          });
        }

        const hasAccess = await PermissionsMiddleware.checkResourceAccess(
          user,
          resourceType,
          resourceId,
          permission
        );

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              message: `Access denied to ${resourceType}`,
              required: permission,
              resourceType,
              resourceId
            }
          });
        }

        next();
      } catch (error) {
        console.error('Error checking resource permission:', error);
        res.status(500).json({
          success: false,
          error: { message: 'Internal server error checking resource access' }
        });
      }
    };
  }

  /**
   * Check if user has permission
   */
  static async userHasPermission(user, permission) {
    try {
      const roleInfo = PermissionsMiddleware.roleHierarchy[user.role];

      if (!roleInfo) return false;

      // Super admin has all permissions
      if (roleInfo.permissions.includes('*')) return true;

      // Check if role has the specific permission
      if (roleInfo.permissions.includes(permission)) return true;

      // Check custom user permissions
      const userPermissions = await prisma.userPermission.findMany({
        where: { userId: user.id }
      });

      return userPermissions.some(p => p.permission === permission);
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  /**
   * Check access to specific resource
   */
  static async checkResourceAccess(user, resourceType, resourceId, permission) {
    try {
      // Super admin always has access
      if (user.role === 'SUPER_ADMIN') return true;

      switch (resourceType) {
        case 'case':
          return await PermissionsMiddleware.checkCaseAccess(user, resourceId, permission);
        case 'client':
          return await PermissionsMiddleware.checkClientAccess(user, resourceId, permission);
        case 'document':
          return await PermissionsMiddleware.checkDocumentAccess(user, resourceId, permission);
        case 'task':
          return await PermissionsMiddleware.checkTaskAccess(user, resourceId, permission);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking resource access:', error);
      return false;
    }
  }

  /**
   * Check case access
   */
  static async checkCaseAccess(user, caseId, permission) {
    try {
      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          teamMembers: {
            where: { userId: user.id }
          },
          permissions: {
            where: { userId: user.id }
          }
        }
      });

      if (!caseRecord) return false;

      // Check if user is assigned to the case
      if (caseRecord.attorneyId === user.id ||
          caseRecord.paralegalId === user.id ||
          caseRecord.secondAttorneyId === user.id ||
          caseRecord.caseManagerId === user.id) {
        return await PermissionsMiddleware.userHasPermission(user, `case:${permission}`);
      }

      // Check team membership
      if (caseRecord.teamMembers.length > 0) {
        const teamMember = caseRecord.teamMembers[0];
        return teamMember.permissions.includes(permission.toUpperCase());
      }

      // Check specific case permissions
      if (caseRecord.permissions.length > 0) {
        const casePermission = caseRecord.permissions[0];
        return casePermission.permissions.includes(permission.toUpperCase());
      }

      return false;
    } catch (error) {
      console.error('Error checking case access:', error);
      return false;
    }
  }

  /**
   * Check client access
   */
  static async checkClientAccess(user, clientId, permission) {
    try {
      // Check if user created the client
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          cases: {
            where: {
              OR: [
                { attorneyId: user.id },
                { paralegalId: user.id },
                { secondAttorneyId: user.id },
                { caseManagerId: user.id }
              ]
            }
          }
        }
      });

      if (!client) return false;

      // If user created the client
      if (client.createdById === user.id) {
        return await PermissionsMiddleware.userHasPermission(user, `client:${permission}`);
      }

      // If user is assigned to any of the client's cases
      if (client.cases.length > 0) {
        return await PermissionsMiddleware.userHasPermission(user, `client:${permission}`);
      }

      return false;
    } catch (error) {
      console.error('Error checking client access:', error);
      return false;
    }
  }

  /**
   * Check document access
   */
  static async checkDocumentAccess(user, documentId, permission) {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          case: {
            include: {
              teamMembers: {
                where: { userId: user.id }
              }
            }
          }
        }
      });

      if (!document) return false;

      // If user uploaded the document
      if (document.uploadedBy === user.id) {
        return await PermissionsMiddleware.userHasPermission(user, `document:${permission}`);
      }

      // Check if document is shared with user
      if (document.sharedWith && document.sharedWith.includes(user.id)) {
        return await PermissionsMiddleware.userHasPermission(user, `document:${permission}`);
      }

      // Check case access if document is associated with a case
      if (document.caseId) {
        return await PermissionsMiddleware.checkCaseAccess(user, document.caseId, permission);
      }

      return false;
    } catch (error) {
      console.error('Error checking document access:', error);
      return false;
    }
  }

  /**
   * Check task access
   */
  static async checkTaskAccess(user, taskId, permission) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!task) return false;

      // If user is assigned to the task or created it
      if (task.assignedToId === user.id || task.createdById === user.id) {
        return await PermissionsMiddleware.userHasPermission(user, `task:${permission}`);
      }

      // Check case access if task is associated with a case
      if (task.caseId) {
        return await PermissionsMiddleware.checkCaseAccess(user, task.caseId, permission);
      }

      return false;
    } catch (error) {
      console.error('Error checking task access:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userPermissions: true
        }
      });

      if (!user) return [];

      const roleInfo = PermissionsMiddleware.roleHierarchy[user.role];
      if (!roleInfo) return [];

      if (roleInfo.permissions.includes('*')) {
        return ['*'];
      }

      const rolePermissions = roleInfo.permissions;
      const customPermissions = user.userPermissions.map(p => p.permission);

      return [...new Set([...rolePermissions, ...customPermissions])];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Filter data based on user permissions
   */
  static filterByPermissions(data, user, permission) {
    // This would implement data filtering based on user permissions
    // For now, return data as-is for users with appropriate permissions
    return data;
  }
}

module.exports = PermissionsMiddleware;