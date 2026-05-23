const express = require('express');
const router = express.Router();
const langchainService = require('../services/langchainService');
const authenticateToken = require('../middleware/auth').authenticateToken;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/ai/document-types - Get available document types
router.get('/document-types', authenticateToken, (req, res) => {
  try {
    const documentTypes = langchainService.getDocumentTypes();
    res.json({
      success: true,
      documentTypes
    });
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document types'
    });
  }
});

// GET /api/ai/providers - Get available AI providers
router.get('/providers', authenticateToken, (req, res) => {
  try {
    const providers = langchainService.getAvailableProviders();
    res.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch providers'
    });
  }
});

// POST /api/ai/generate/demand-letter - Generate a demand letter
router.post('/generate/demand-letter', authenticateToken, async (req, res) => {
  try {
    const { settlementId, caseId, customData } = req.body;
    
    let data = {};
    
    // If settlementId is provided, fetch settlement and case data
    if (settlementId) {
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          case: {
            include: {
              client: true,
              attorney: true
            }
          }
        }
      });

      if (!settlement) {
        return res.status(404).json({
          success: false,
          error: 'Settlement not found'
        });
      }

      // Prepare data from settlement and case
      data = {
        clientName: `${settlement.case.client.firstName} ${settlement.case.client.lastName}`,
        clientAddress: settlement.case.client.address || 'Client Address',
        defendantName: customData?.defendantName || 'Insurance Company',
        defendantAddress: customData?.defendantAddress || 'Defendant Address',
        incidentDate: settlement.case.dateOpened.toISOString().split('T')[0],
        incidentDescription: settlement.case.description || 'Incident description',
        injuries: customData?.injuries || 'Various injuries',
        medicalTreatment: customData?.medicalTreatment || 'Medical treatment received',
        medicalExpenses: customData?.medicalExpenses || settlement.costs || 0,
        lostWages: customData?.lostWages || 0,
        otherDamages: customData?.otherDamages || 'Pain and suffering',
        demandAmount: settlement.amount,
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        attorneyName: settlement.case.attorney?.name || 'Attorney Name',
        barNumber: settlement.case.attorney?.barNumber || 'Bar Number',
        firmName: 'Legal Estate Law Firm',
        firmAddress: '123 Legal Street, Law City, LC 12345',
        phone: settlement.case.attorney?.phone || '(555) 123-4567',
        email: settlement.case.attorney?.email || 'attorney@legalestate.com'
      };
    } else if (caseId) {
      // Fetch case data if only caseId is provided
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          client: true,
          attorney: true
        }
      });

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      data = {
        clientName: `${caseData.client.firstName} ${caseData.client.lastName}`,
        clientAddress: caseData.client.address || 'Client Address',
        ...customData
      };
    } else {
      // Use only custom data
      data = customData || {};
    }

    // Generate the document
    const result = await langchainService.generateDocument('demand_letter', data, {
      provider: req.body.provider
    });

    // Store the generated document
    if (settlementId || caseId) {
      await prisma.document.create({
        data: {
          title: 'Demand Letter',
          type: 'DEMAND_LETTER',
          content: result.content.letter || result.content.document,
          caseId: caseId || settlement.case.id,
          uploadedBy: req.user.userId,
          metadata: {
            generatedBy: 'AI',
            provider: result.provider,
            usage: result.usage,
            summary: result.content.summary
          }
        }
      });
    }

    res.json({
      success: true,
      document: result.content,
      metadata: result.usage
    });
  } catch (error) {
    console.error('Error generating demand letter:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate demand letter'
    });
  }
});

// POST /api/ai/generate/settlement-agreement - Generate a settlement agreement
router.post('/generate/settlement-agreement', authenticateToken, async (req, res) => {
  try {
    const { settlementId, customData } = req.body;
    
    let data = {};
    
    if (settlementId) {
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          case: {
            include: {
              client: true
            }
          }
        }
      });

      if (!settlement) {
        return res.status(404).json({
          success: false,
          error: 'Settlement not found'
        });
      }

      data = {
        plaintiffName: `${settlement.case.client.firstName} ${settlement.case.client.lastName}`,
        defendantName: customData?.defendantName || 'Defendant Name',
        caseNumber: settlement.case.caseNumber,
        courtName: customData?.courtName || 'Superior Court',
        settlementAmount: settlement.amount,
        paymentTerms: customData?.paymentTerms || 'Lump sum payment within 30 days',
        releaseType: customData?.releaseType || 'General Release',
        confidentiality: customData?.confidentiality || 'No confidentiality provisions',
        attorneyFees: settlement.attorneyFees,
        costs: settlement.costs,
        netToClient: settlement.netToClient,
        specialConditions: customData?.specialConditions || 'None'
      };
    } else {
      data = customData || {};
    }

    const result = await langchainService.generateDocument('settlement_agreement', data, {
      provider: req.body.provider
    });

    res.json({
      success: true,
      document: result.content,
      metadata: result.usage
    });
  } catch (error) {
    console.error('Error generating settlement agreement:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate settlement agreement'
    });
  }
});

// POST /api/ai/generate/discovery - Generate discovery requests
router.post('/generate/discovery', authenticateToken, async (req, res) => {
  try {
    const { caseId, discoveryType, customData } = req.body;
    
    let data = {};
    
    if (caseId) {
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          client: true
        }
      });

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      data = {
        caseType: caseData.type,
        clientName: `${caseData.client.firstName} ${caseData.client.lastName}`,
        opposingParty: customData?.opposingParty || 'Opposing Party',
        caseNumber: caseData.caseNumber,
        discoveryType: discoveryType || 'Interrogatories',
        caseFacts: caseData.description || customData?.caseFacts || 'Case facts',
        areasOfInterest: customData?.areasOfInterest || 'Liability and damages'
      };
    } else {
      data = customData || {};
    }

    const result = await langchainService.generateDocument('discovery_request', data, {
      provider: req.body.provider
    });

    res.json({
      success: true,
      document: result.content,
      metadata: result.usage
    });
  } catch (error) {
    console.error('Error generating discovery request:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate discovery request'
    });
  }
});

// POST /api/ai/generate/legal-brief - Generate a legal brief
router.post('/generate/legal-brief', authenticateToken, async (req, res) => {
  try {
    const { caseId, briefType, customData } = req.body;
    
    let data = {};
    
    if (caseId) {
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          client: true
        }
      });

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      data = {
        caseName: `${caseData.client.firstName} ${caseData.client.lastName} v. Defendant`,
        caseNumber: caseData.caseNumber,
        courtName: customData?.courtName || 'Superior Court',
        judgeName: customData?.judgeName || 'Honorable Judge',
        briefType: briefType || 'Motion',
        legalIssue: customData?.legalIssue || 'Legal issue',
        facts: caseData.description || customData?.facts || 'Statement of facts',
        applicableLaw: customData?.applicableLaw || 'Applicable law',
        arguments: customData?.arguments || 'Legal arguments'
      };
    } else {
      data = customData || {};
    }

    const result = await langchainService.generateDocument('legal_brief', data, {
      provider: req.body.provider
    });

    res.json({
      success: true,
      document: result.content,
      metadata: result.usage
    });
  } catch (error) {
    console.error('Error generating legal brief:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate legal brief'
    });
  }
});

// POST /api/ai/generate/retainer - Generate a retainer agreement
router.post('/generate/retainer', authenticateToken, async (req, res) => {
  try {
    const { clientId, customData } = req.body;
    
    let data = {};
    
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      data = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientAddress: client.address || 'Client Address',
        matterDescription: customData?.matterDescription || 'Legal representation',
        feeType: customData?.feeType || 'Hourly',
        hourlyRate: customData?.hourlyRate || '$350',
        retainerAmount: customData?.retainerAmount || '$5,000',
        contingencyPercentage: customData?.contingencyPercentage || '33.33%',
        scopeOfWork: customData?.scopeOfWork || 'Full legal representation'
      };
    } else {
      data = customData || {};
    }

    const result = await langchainService.generateDocument('retainer_agreement', data, {
      provider: req.body.provider
    });

    res.json({
      success: true,
      document: result.content,
      metadata: result.usage
    });
  } catch (error) {
    console.error('Error generating retainer agreement:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate retainer agreement'
    });
  }
});

// POST /api/ai/test-provider - Test a specific provider
router.post('/test-provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required'
      });
    }

    const result = await langchainService.testProvider(provider);
    res.json(result);
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test provider'
    });
  }
});

// POST /api/ai/test-all-providers - Test all configured providers
router.post('/test-all-providers', authenticateToken, async (req, res) => {
  try {
    const results = await langchainService.testAllProviders();
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error testing providers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test providers'
    });
  }
});

module.exports = router;