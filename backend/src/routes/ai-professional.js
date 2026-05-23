const express = require('express');
const router = express.Router();
const multiAIService = require('../services/multi-ai-service');
const { authenticateToken } = require('../middleware/auth');
const PermissionsMiddleware = require('../middleware/permissions-middleware');
const rateLimit = require('express-rate-limit');

// AI-specific rate limiting
const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 AI requests per hour per user
  message: {
    success: false,
    error: { message: 'AI rate limit exceeded. Please try again later.' }
  },
  keyGenerator: (req) => `ai:${req.user?.id || req.ip}`,
});

// Premium AI rate limiting (higher cost operations)
const premiumAIRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25, // 25 premium AI requests per hour
  message: {
    success: false,
    error: { message: 'Premium AI rate limit exceeded. Please try again later.' }
  },
  keyGenerator: (req) => `premium-ai:${req.user?.id || req.ip}`,
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/ai-professional/health:
 *   get:
 *     summary: Check AI providers health status
 *     tags: [AI Professional]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI providers health status
 *       500:
 *         description: Internal server error
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await multiAIService.healthCheck();

    res.json({
      success: true,
      data: {
        providers: healthStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking AI health:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error checking AI providers health' }
    });
  }
});

/**
 * @swagger
 * /api/ai-professional/analyze-document:
 *   post:
 *     summary: Analyze legal document using AI
 *     tags: [AI Professional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document content to analyze
 *               analysisType:
 *                 type: string
 *                 enum: [general, contract, litigation, compliance, risk_assessment]
 *                 default: general
 *               provider:
 *                 type: string
 *                 enum: [openai, anthropic, ollama]
 *                 description: Force specific AI provider
 *     responses:
 *       200:
 *         description: Document analysis completed
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Analysis failed
 */
router.post('/analyze-document',
  aiRateLimit,
  premiumAIRateLimit,
  PermissionsMiddleware.requirePermission('document:read'),
  async (req, res) => {
    try {
      const { content, analysisType = 'general', provider } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Document content is required' }
        });
      }

      if (content.length > 50000) {
        return res.status(400).json({
          success: false,
          error: { message: 'Document content too large. Maximum 50,000 characters.' }
        });
      }

      const result = await multiAIService.analyzeDocument(content, analysisType);

      res.json({
        success: true,
        data: {
          analysis: result.response,
          provider: result.provider,
          analysisType,
          metadata: result.metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error analyzing document:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Document analysis failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-professional/generate-case-summary:
 *   post:
 *     summary: Generate AI-powered case summary
 *     tags: [AI Professional]
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
 *             properties:
 *               caseId:
 *                 type: string
 *               includeDocuments:
 *                 type: boolean
 *                 default: false
 *               includeCommunications:
 *                 type: boolean
 *                 default: false
 *               summaryType:
 *                 type: string
 *                 enum: [executive, detailed, timeline, legal_analysis]
 *                 default: executive
 *     responses:
 *       200:
 *         description: Case summary generated successfully
 *       404:
 *         description: Case not found
 *       500:
 *         description: Summary generation failed
 */
router.post('/generate-case-summary',
  aiRateLimit,
  PermissionsMiddleware.requireResourcePermission('case', 'read'),
  async (req, res) => {
    try {
      const { caseId, includeDocuments = false, includeCommunications = false, summaryType = 'executive' } = req.body;

      if (!caseId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Case ID is required' }
        });
      }

      // Fetch case data (this would use the existing case access middleware)
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          client: true,
          attorney: { select: { name: true, email: true } },
          paralegal: { select: { name: true, email: true } },
          documents: includeDocuments ? {
            select: { title: true, type: true, description: true, createdAt: true }
          } : false,
          communications: includeCommunications ? {
            select: { type: true, subject: true, summary: true, dateTime: true },
            take: 10,
            orderBy: { dateTime: 'desc' }
          } : false,
          tasks: {
            select: { title: true, status: true, priority: true, dueDate: true },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          notes: {
            select: { content: true, createdAt: true },
            where: { isPrivate: false },
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: { message: 'Case not found' }
        });
      }

      // Clean sensitive data
      const cleanCaseData = {
        ...caseData,
        client: {
          name: `${caseData.client.firstName} ${caseData.client.lastName}`,
          email: caseData.client.email ? '[EMAIL_REDACTED]' : null
        }
      };

      const result = await multiAIService.generateCaseSummary(cleanCaseData);

      res.json({
        success: true,
        data: {
          summary: result.response,
          provider: result.provider,
          summaryType,
          caseId,
          metadata: result.metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating case summary:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Case summary generation failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-professional/generate-document:
 *   post:
 *     summary: Generate legal document using AI
 *     tags: [AI Professional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - parameters
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [demand_letter, settlement_agreement, discovery_request, motion, brief, contract, retainer_agreement]
 *               parameters:
 *                 type: object
 *                 description: Document-specific parameters
 *               caseId:
 *                 type: string
 *                 description: Associated case ID
 *               provider:
 *                 type: string
 *                 enum: [openai, anthropic, ollama]
 *     responses:
 *       200:
 *         description: Document generated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Document generation failed
 */
router.post('/generate-document',
  aiRateLimit,
  premiumAIRateLimit,
  PermissionsMiddleware.requirePermission('document:create'),
  async (req, res) => {
    try {
      const { documentType, parameters, caseId, provider } = req.body;

      if (!documentType || !parameters) {
        return res.status(400).json({
          success: false,
          error: { message: 'Document type and parameters are required' }
        });
      }

      // Add case context if caseId provided
      let caseContext = null;
      if (caseId) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        caseContext = await prisma.case.findUnique({
          where: { id: caseId },
          include: {
            client: {
              select: { firstName: true, lastName: true, email: true, phone: true, address: true }
            },
            attorney: {
              select: { name: true, email: true, phone: true, barNumber: true }
            }
          }
        });
      }

      // Add case context to parameters
      const enhancedParameters = {
        ...parameters,
        ...(caseContext && {
          caseNumber: caseContext.caseNumber,
          caseTitle: caseContext.title,
          clientName: `${caseContext.client.firstName} ${caseContext.client.lastName}`,
          attorneyName: caseContext.attorney?.name
        })
      };

      const result = await multiAIService.generateDocument(documentType, enhancedParameters);

      res.json({
        success: true,
        data: {
          document: result.response,
          documentType,
          provider: result.provider,
          caseId,
          metadata: result.metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating document:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Document generation failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-professional/chat:
 *   post:
 *     summary: AI chat interface for legal assistance
 *     tags: [AI Professional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: string
 *                 description: Additional context for the conversation
 *               caseId:
 *                 type: string
 *                 description: Related case ID for context
 *               requestType:
 *                 type: string
 *                 enum: [general, legal_advice, case_strategy, research, document_review]
 *                 default: general
 *               provider:
 *                 type: string
 *                 enum: [openai, anthropic, ollama]
 *     responses:
 *       200:
 *         description: AI response generated
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Chat request failed
 */
router.post('/chat',
  aiRateLimit,
  async (req, res) => {
    try {
      const { message, context = '', caseId, requestType = 'general', provider } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Message is required' }
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: { message: 'Message too long. Maximum 2000 characters.' }
        });
      }

      // Add case context if provided
      let enhancedContext = context;
      if (caseId) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const caseData = await prisma.case.findUnique({
          where: { id: caseId },
          select: {
            caseNumber: true,
            title: true,
            type: true,
            status: true,
            description: true
          }
        });

        if (caseData) {
          enhancedContext += `\n\nRelated Case: ${caseData.caseNumber} - ${caseData.title} (${caseData.type}, Status: ${caseData.status})`;
          if (caseData.description) {
            enhancedContext += `\nCase Description: ${caseData.description}`;
          }
        }
      }

      const request = {
        prompt: message,
        context: enhancedContext,
        requestType,
        provider
      };

      const result = await multiAIService.processRequest(request);

      res.json({
        success: true,
        data: {
          response: result.response,
          provider: result.provider,
          requestType,
          caseId,
          metadata: result.metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error processing AI chat:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'AI chat request failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-professional/usage-stats:
 *   get:
 *     summary: Get AI usage statistics
 *     tags: [AI Professional]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: Usage statistics retrieved
 *       500:
 *         description: Error retrieving statistics
 */
router.get('/usage-stats',
  PermissionsMiddleware.requirePermission('settings:read'),
  async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;

      const stats = await multiAIService.getUsageStats(timeframe);

      res.json({
        success: true,
        data: {
          timeframe,
          stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting AI usage stats:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error retrieving usage statistics' }
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-professional/providers:
 *   get:
 *     summary: Get available AI providers and their capabilities
 *     tags: [AI Professional]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider information retrieved
 *       500:
 *         description: Error retrieving provider information
 */
router.get('/providers', async (req, res) => {
  try {
    const healthStatus = await multiAIService.healthCheck();

    const providers = Object.entries(multiAIService.providers).map(([name, config]) => ({
      name,
      displayName: config.name,
      enabled: config.enabled,
      status: healthStatus[name]?.status || 'unknown',
      capabilities: {
        documentAnalysis: true,
        caseSupport: true,
        documentGeneration: name !== 'ollama', // Premium feature
        legalResearch: true,
        costPerToken: config.costPerToken,
        maxTokens: config.maxTokens
      }
    }));

    res.json({
      success: true,
      data: {
        providers,
        priority: multiAIService.priority,
        costTracking: multiAIService.costTracking
      }
    });
  } catch (error) {
    console.error('Error getting provider information:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error retrieving provider information' }
    });
  }
});

module.exports = router;