const BaseController = require('./BaseController');
const { ErrorHandler } = require('../middleware/errorHandler');
const APIResponse = require('../lib/apiResponse');
const prisma = require('../lib/prisma');
const AuthUtils = require('../lib/authUtils');

class CaseTemplateController extends BaseController {
  constructor() {
    super(prisma.caseTemplate, {
      allowedFilters: ['caseType', 'templateType', 'isActive', 'isDefault'],
      allowedSortFields: ['name', 'caseType', 'templateType', 'createdAt'],
      defaultSort: { name: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            cases: true
          }
        }
      },
      searchFields: ['name', 'description'],
      requiredCreateFields: ['name', 'caseType', 'templateType'],
      allowedCreateFields: [
        'name', 'description', 'caseType', 'templateType', 'defaultStatus',
        'defaultPriority', 'defaultStage', 'workflowSteps', 'taskTemplates',
        'deadlineTemplates', 'documentTemplates', 'communicationTemplates'
      ],
      allowedUpdateFields: [
        'name', 'description', 'defaultStatus', 'defaultPriority', 'defaultStage',
        'workflowSteps', 'taskTemplates', 'deadlineTemplates', 'documentTemplates',
        'communicationTemplates', 'isActive', 'isDefault'
      ]
    });
  }

  // Override beforeCreate to set createdBy
  async beforeCreate(data, req) {
    data.createdById = req.user.userId;
    delete data.userId;
    return data;
  }

  // Get templates by case type
  getTemplatesByCaseType = ErrorHandler.asyncHandler(async (req, res) => {
    const { caseType } = req.params;
    const { activeOnly = true } = req.query;

    const where = { caseType };
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const templates = await prisma.caseTemplate.findMany({
      where,
      include: this.options.include,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
    });

    const response = APIResponse.success(templates, 'Case templates retrieved successfully');
    res.json(response);
  });

  // Apply template to case
  applyTemplateToCase = ErrorHandler.asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const { caseId } = req.body;

    // Verify template exists
    const template = await prisma.caseTemplate.findUnique({
      where: { id: templateId },
      include: {
        CaseTemplateTask: true,
        CaseWorkflowStep: true
      }
    });

    if (!template) {
      const response = APIResponse.notFound('Template', templateId);
      return res.status(404).json(response);
    }

    // Verify case exists
    const case_ = await prisma.case.findUnique({
      where: { id: caseId }
    });

    if (!case_) {
      const response = APIResponse.notFound('Case', caseId);
      return res.status(404).json(response);
    }

    try {
      // Update case with template reference
      await prisma.case.update({
        where: { id: caseId },
        data: {
          workflowTemplate: templateId,
          status: template.defaultStatus,
          priority: template.defaultPriority,
          stage: template.defaultStage
        }
      });

      // Create workflow steps from template
      if (template.workflowSteps && Array.isArray(template.workflowSteps)) {
        const workflowSteps = template.workflowSteps.map((step, index) => ({
          id: AuthUtils.generateToken(16),
          caseId: caseId,
          name: step.name,
          description: step.description,
          stepOrder: index + 1,
          estimatedDays: step.estimatedDays,
          autoCreateTasks: step.autoCreateTasks || false,
          autoCreateDeadlines: step.autoCreateDeadlines || false
        }));

        await prisma.caseWorkflowStep.createMany({
          data: workflowSteps
        });
      }

      // Create tasks from template
      if (template.taskTemplates && Array.isArray(template.taskTemplates)) {
        const today = new Date();
        const tasks = template.taskTemplates.map((taskTemplate) => {
          let dueDate = null;
          if (taskTemplate.dueDaysFromStart) {
            dueDate = new Date(today.getTime() + (taskTemplate.dueDaysFromStart * 24 * 60 * 60 * 1000));
          }

          return {
            id: AuthUtils.generateToken(16),
            title: taskTemplate.title,
            description: taskTemplate.description,
            priority: taskTemplate.priority || 'MEDIUM',
            dueDate: dueDate,
            caseId: caseId,
            assignedToId: case_.attorneyId || req.user.userId,
            createdById: req.user.userId
          };
        });

        await prisma.task.createMany({
          data: tasks
        });
      }

      // Create deadlines from template
      if (template.deadlineTemplates && Array.isArray(template.deadlineTemplates)) {
        const deadlines = template.deadlineTemplates.map((deadlineTemplate) => {
          let dueDate = new Date();
          if (deadlineTemplate.dueDaysFromStart) {
            dueDate = new Date(Date.now() + (deadlineTemplate.dueDaysFromStart * 24 * 60 * 60 * 1000));
          }

          return {
            id: AuthUtils.generateToken(16),
            caseId: caseId,
            title: deadlineTemplate.title,
            description: deadlineTemplate.description,
            dueDate: dueDate,
            type: deadlineTemplate.type,
            priority: deadlineTemplate.priority || 'MEDIUM',
            isStatutory: deadlineTemplate.isStatutory || false,
            reminderDays: deadlineTemplate.reminderDays || [7, 1]
          };
        });

        await prisma.caseDeadline.createMany({
          data: deadlines
        });
      }

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'TEMPLATE_APPLIED',
          description: `Template "${template.name}" applied to case ${case_.caseNumber}`,
          entityType: 'CASE',
          entityId: caseId,
          userId: req.user.userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const response = APIResponse.success(
        { templateId, caseId, appliedItems: { workflowSteps: true, tasks: true, deadlines: true } },
        'Template applied to case successfully'
      );
      res.json(response);

    } catch (error) {
      console.error('Template application error:', error);
      const response = APIResponse.error('Failed to apply template to case', 500);
      res.status(500).json(response);
    }
  });

  // Set template as default for case type
  setAsDefault = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await prisma.caseTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      const response = APIResponse.notFound('Template', id);
      return res.status(404).json(response);
    }

    // Remove default flag from other templates of same case type
    await prisma.caseTemplate.updateMany({
      where: {
        caseType: template.caseType,
        id: { not: id }
      },
      data: { isDefault: false }
    });

    // Set this template as default
    const updated = await prisma.caseTemplate.update({
      where: { id },
      data: { isDefault: true },
      include: this.options.include
    });

    const response = APIResponse.success(updated, 'Template set as default successfully');
    res.json(response);
  });

  // Clone template
  cloneTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const originalTemplate = await prisma.caseTemplate.findUnique({
      where: { id },
      include: {
        CaseTemplateTask: true,
        CaseWorkflowStep: true
      }
    });

    if (!originalTemplate) {
      const response = APIResponse.notFound('Template', id);
      return res.status(404).json(response);
    }

    const clonedTemplate = await prisma.caseTemplate.create({
      data: {
        id: AuthUtils.generateToken(16),
        name: name || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        caseType: originalTemplate.caseType,
        templateType: originalTemplate.templateType,
        defaultStatus: originalTemplate.defaultStatus,
        defaultPriority: originalTemplate.defaultPriority,
        defaultStage: originalTemplate.defaultStage,
        workflowSteps: originalTemplate.workflowSteps,
        taskTemplates: originalTemplate.taskTemplates,
        deadlineTemplates: originalTemplate.deadlineTemplates,
        documentTemplates: originalTemplate.documentTemplates,
        communicationTemplates: originalTemplate.communicationTemplates,
        createdById: req.user.userId,
        isDefault: false
      },
      include: this.options.include
    });

    const response = APIResponse.created(clonedTemplate, 'Template cloned successfully');
    res.status(201).json(response);
  });

  // Get template usage statistics
  getTemplateStats = ErrorHandler.asyncHandler(async (req, res) => {
    const stats = await Promise.all([
      // Templates by case type
      prisma.caseTemplate.groupBy({
        by: ['caseType'],
        _count: { id: true }
      }),
      // Most used templates
      prisma.case.groupBy({
        by: ['workflowTemplate'],
        where: { workflowTemplate: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      // Template types
      prisma.caseTemplate.groupBy({
        by: ['templateType'],
        _count: { id: true }
      })
    ]);

    const [byType, mostUsed, byTemplateType] = stats;

    // Get template names for most used
    const templateIds = mostUsed.map(t => t.workflowTemplate);
    const templateNames = await prisma.caseTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true }
    });

    const mostUsedWithNames = mostUsed.map(usage => ({
      ...usage,
      templateName: templateNames.find(t => t.id === usage.workflowTemplate)?.name || 'Unknown'
    }));

    const response = APIResponse.success({
      byType: byType.reduce((acc, item) => {
        acc[item.caseType] = item._count.id;
        return acc;
      }, {}),
      byTemplateType: byTemplateType.reduce((acc, item) => {
        acc[item.templateType] = item._count.id;
        return acc;
      }, {}),
      mostUsed: mostUsedWithNames
    }, 'Template statistics retrieved successfully');

    res.json(response);
  });
}

module.exports = new CaseTemplateController();