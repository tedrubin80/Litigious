const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const AIDocumentService = require('../services/aiDocumentService');
const MockAIDocumentService = require('../services/mockAIService');

const router = express.Router();
const prisma = new PrismaClient();

// Use mock service if no AI API keys are configured
const hasAPIKeys = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY || process.env.COHERE_API_KEY;
const aiService = hasAPIKeys ? new AIDocumentService() : new MockAIDocumentService();

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

// GET /api/ai-documents/types - Get available document types
router.get('/types', authenticateToken, (req, res) => {
  try {
    const documentTypes = aiService.getAvailableDocumentTypes();
    res.json({
      success: true,
      documentTypes
    });
  } catch (error) {
    console.error('Error getting document types:', error);
    res.status(500).json({
      error: 'Failed to get document types',
      details: error.message
    });
  }
});

// GET /api/ai-documents/providers/status - Get AI provider status
router.get('/providers/status', authenticateToken, (req, res) => {
  try {
    const stats = aiService.getUsageStats();
    res.json({
      success: true,
      providers: stats.providers,
      usage: stats.usage,
      totalRequests: stats.totalRequests,
      totalCost: stats.totalCost
    });
  } catch (error) {
    console.error('Error getting provider status:', error);
    res.status(500).json({
      error: 'Failed to get provider status',
      details: error.message
    });
  }
});

// POST /api/ai-documents/test-provider - Test AI provider connection
router.post('/test-provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider name required' });
    }

    const result = await aiService.testProviderConnection(provider);
    res.json(result);
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({
      error: 'Failed to test provider',
      details: error.message
    });
  }
});

// POST /api/ai-documents/generate - Generate AI document
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const {
      documentType,
      templateData,
      preferredProvider,
      caseId,
      settlementId,
      saveDocument = true
    } = req.body;

    // Validate required fields
    if (!documentType || !templateData) {
      return res.status(400).json({
        error: 'Missing required fields: documentType, templateData'
      });
    }

    // Generate document using AI service
    const result = await aiService.generateDocument(
      documentType,
      templateData,
      preferredProvider
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'AI document generation failed',
        details: result.error,
        documentType: result.documentType
      });
    }

    // Save document to database if requested
    let savedDocument = null;
    if (saveDocument) {
      try {
        savedDocument = await prisma.document.create({
          data: {
            name: `${documentType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} - ${templateData.clientName || 'Generated'}`,
            type: documentType,
            content: result.document,
            caseId: caseId || null,
            uploadedBy: req.user.userId,
            metadata: JSON.stringify({
              ...result.metadata,
              settlementId,
              generatedBy: 'AI',
              templateData: templateData
            }),
            size: `${Math.round(result.document.length / 1024)}KB`
          }
        });
      } catch (dbError) {
        console.error('Error saving document to database:', dbError);
        // Continue with response even if DB save fails
      }
    }

    res.json({
      success: true,
      document: result.document,
      metadata: result.metadata,
      savedDocument: savedDocument ? {
        id: savedDocument.id,
        name: savedDocument.name,
        createdAt: savedDocument.createdAt
      } : null
    });

  } catch (error) {
    console.error('Error in document generation:', error);
    res.status(500).json({
      error: 'Failed to generate document',
      details: error.message
    });
  }
});

// POST /api/ai-documents/generate-settlement - Generate settlement-specific document
router.post('/generate-settlement', authenticateToken, async (req, res) => {
  try {
    const { settlementId, documentType, additionalData = {} } = req.body;

    if (!settlementId || !documentType) {
      return res.status(400).json({
        error: 'Missing required fields: settlementId, documentType'
      });
    }

    // Get settlement data from database
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
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

    // Prepare template data from settlement
    const templateData = {
      clientName: settlement.case.clientName,
      caseType: settlement.case.caseType,
      settlementAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(settlement.amount),
      demandAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(settlement.amount),
      attorneyFees: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(settlement.attorneyFees),
      costs: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(settlement.costs),
      netToClient: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(settlement.netToClient),
      description: settlement.description || 'Settlement case',
      settlementDate: settlement.date ? settlement.date.toLocaleDateString() : 'TBD',
      attorney: settlement.case.attorney || 'Attorney',
      settlementType: settlement.type,
      settlementStatus: settlement.status,
      ...additionalData
    };

    // Generate document
    const result = await aiService.generateDocument(documentType, templateData);

    if (!result.success) {
      return res.status(500).json({
        error: 'AI document generation failed',
        details: result.error
      });
    }

    // Save document linked to settlement and case
    const savedDocument = await prisma.document.create({
      data: {
        name: `${documentType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} - ${settlement.case.clientName}`,
        type: documentType,
        content: result.document,
        caseId: settlement.caseId,
        uploadedBy: req.user.userId,
        metadata: JSON.stringify({
          ...result.metadata,
          settlementId,
          generatedBy: 'AI',
          templateData
        }),
        size: `${Math.round(result.document.length / 1024)}KB`
      }
    });

    res.json({
      success: true,
      document: result.document,
      metadata: result.metadata,
      settlement: {
        id: settlement.id,
        clientName: settlement.case.clientName,
        amount: settlement.amount
      },
      savedDocument: {
        id: savedDocument.id,
        name: savedDocument.name,
        createdAt: savedDocument.createdAt
      }
    });

  } catch (error) {
    console.error('Error generating settlement document:', error);
    res.status(500).json({
      error: 'Failed to generate settlement document',
      details: error.message
    });
  }
});

// GET /api/ai-documents/usage - Get AI usage analytics
router.get('/usage', authenticateToken, (req, res) => {
  try {
    const stats = aiService.getUsageStats();
    
    res.json({
      success: true,
      analytics: {
        totalRequests: stats.totalRequests,
        totalCost: parseFloat(stats.totalCost.toFixed(4)),
        providers: Object.entries(stats.usage).map(([provider, data]) => ({
          provider,
          requests: data.requests,
          tokens: data.tokens,
          cost: parseFloat(data.cost.toFixed(4)),
          averageTokensPerRequest: data.requests > 0 ? Math.round(data.tokens / data.requests) : 0
        }))
      }
    });
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    res.status(500).json({
      error: 'Failed to get usage analytics',
      details: error.message
    });
  }
});

module.exports = router;