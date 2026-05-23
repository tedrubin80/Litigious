const { z } = require('zod');

// Base validation schemas for legal estate system
const ValidationSchemas = {
  // User validation
  user: {
    create: z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(255),
      name: z.string().min(1).max(255),
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      role: z.enum(['ADMIN', 'ATTORNEY', 'PARALEGAL', 'ASSISTANT', 'CLIENT']),
      phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      address: z.string().max(1000).optional(),
      barNumber: z.string().max(50).optional(),
      hourlyRate: z.number().min(0).max(9999.99).optional(),
    }),
    update: z.object({
      email: z.string().email().max(255).optional(),
      name: z.string().min(1).max(255).optional(),
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      address: z.string().max(1000).optional(),
      barNumber: z.string().max(50).optional(),
      hourlyRate: z.number().min(0).max(9999.99).optional(),
      isActive: z.boolean().optional(),
    }),
  },

  // Client validation
  client: {
    create: z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().max(255).optional(),
      phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      state: z.string().length(2).optional(), // US state codes
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
      dateOfBirth: z.string().datetime().optional(),
      ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/).optional(), // XXX-XX-XXXX format
      emergencyContact: z.string().max(255).optional(),
      emergencyPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      notes: z.string().optional(),
      source: z.string().max(100).optional(),
    }),
    update: z.object({
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      email: z.string().email().max(255).optional(),
      phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      state: z.string().length(2).optional(),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
      dateOfBirth: z.string().datetime().optional(),
      emergencyContact: z.string().max(255).optional(),
      emergencyPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      notes: z.string().optional(),
      source: z.string().max(100).optional(),
    }),
  },

  // Case validation
  case: {
    create: z.object({
      caseNumber: z.string().max(50).optional(), // Auto-generated if not provided
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      type: z.enum([
        'PERSONAL_INJURY', 'AUTO_ACCIDENT', 'MEDICAL_MALPRACTICE', 
        'WORKERS_COMP', 'PREMISES_LIABILITY', 'PRODUCT_LIABILITY',
        'CONTRACT_DISPUTE', 'EMPLOYMENT_LAW', 'FAMILY_LAW',
        'CRIMINAL_DEFENSE', 'ESTATE_PLANNING', 'REAL_ESTATE',
        'BANKRUPTCY', 'BUSINESS_LAW', 'IMMIGRATION'
      ]),
      status: z.enum(['INTAKE', 'INVESTIGATION', 'ACTIVE', 'SETTLEMENT_NEGOTIATION', 'SETTLED', 'CLOSED', 'ARCHIVED']).optional(),
      dateOpened: z.string().datetime().optional(),
      statute: z.string().datetime().optional(),
      clientId: z.string().cuid(),
      attorneyId: z.string().cuid().optional(),
      paralegalId: z.string().cuid().optional(),
    }),
    update: z.object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      status: z.enum(['INTAKE', 'INVESTIGATION', 'ACTIVE', 'SETTLEMENT_NEGOTIATION', 'SETTLED', 'CLOSED', 'ARCHIVED']).optional(),
      dateClosed: z.string().datetime().optional(),
      statute: z.string().datetime().optional(),
      attorneyId: z.string().cuid().optional(),
      paralegalId: z.string().cuid().optional(),
      settlementAmount: z.number().min(0).max(99999999.99).optional(),
      attorneyFees: z.number().min(0).max(99999999.99).optional(),
      costs: z.number().min(0).max(99999999.99).optional(),
      netToClient: z.number().min(0).max(99999999.99).optional(),
    }),
  },

  // Settlement validation
  settlement: {
    create: z.object({
      caseId: z.string().cuid(),
      amount: z.number().min(0).max(99999999.99),
      status: z.enum(['DRAFT', 'PROPOSED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXECUTED', 'PAID', 'CANCELLED']).optional(),
      proposedDate: z.string().datetime().optional(),
      acceptedDate: z.string().datetime().optional(),
      executedDate: z.string().datetime().optional(),
      paidDate: z.string().datetime().optional(),
      attorneyFees: z.number().min(0).max(99999999.99).optional(),
      costs: z.number().min(0).max(99999999.99).optional(),
      netToClient: z.number().min(0).max(99999999.99).optional(),
      attorneyPercent: z.number().min(0).max(100).optional(),
      paymentTerms: z.string().optional(),
      settlor: z.string().max(255).optional(),
      payorContact: z.string().max(255).optional(),
      payorPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/).optional(),
      payorEmail: z.string().email().max(255).optional(),
      description: z.string().optional(),
      conditions: z.string().optional(),
      confidential: z.boolean().optional(),
      negotiatedById: z.string().cuid(),
    }),
  },

  // Calendar Event validation
  calendarEvent: {
    create: z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      type: z.enum([
        'COURT_DATE', 'DEPOSITION', 'MEDIATION', 'ARBITRATION',
        'SETTLEMENT_CONFERENCE', 'CLIENT_MEETING', 'DEADLINE',
        'STATUTE_DEADLINE', 'DISCOVERY_DEADLINE', 'TRIAL_DATE',
        'APPEAL_DEADLINE', 'CONSULTATION', 'FOLLOW_UP'
      ]),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().optional(),
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/).optional(),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/).optional(),
      allDay: z.boolean().optional(),
      location: z.string().max(500).optional(),
      caseId: z.string().cuid().optional(),
      clientId: z.string().cuid().optional(),
      assignedToId: z.string().cuid().optional(),
      courtroom: z.string().max(50).optional(),
      reminderTime: z.number().min(0).max(10080).optional(), // Max 7 days in minutes
    }),
  },

  // Invoice validation
  invoice: {
    create: z.object({
      invoiceNumber: z.string().max(50).optional(), // Auto-generated if not provided
      clientId: z.string().cuid().optional(),
      caseId: z.string().cuid().optional(),
      dueDate: z.string().datetime(),
      subtotal: z.number().min(0).max(99999999.99),
      taxRate: z.number().min(0).max(100).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
    }).refine(data => data.clientId || data.caseId, {
      message: "Either clientId or caseId must be provided",
    }),
    update: z.object({
      dueDate: z.string().datetime().optional(),
      status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL_PAYMENT']).optional(),
      paidAmount: z.number().min(0).max(99999999.99).optional(),
      paymentMethod: z.string().max(100).optional(),
      paymentReference: z.string().max(255).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
    }),
  },

  // Document validation
  document: {
    create: z.object({
      title: z.string().min(1).max(500),
      filename: z.string().max(255).optional(),
      type: z.enum([
        'CONTRACT', 'MEDICAL_RECORD', 'POLICE_REPORT', 'INSURANCE_DOCUMENT',
        'PHOTO_EVIDENCE', 'CORRESPONDENCE', 'LEGAL_BRIEF', 'DEMAND_LETTER',
        'SETTLEMENT_AGREEMENT', 'DISCOVERY_REQUEST', 'RETAINER_AGREEMENT',
        'INVOICE', 'RECEIPT', 'WITNESS_STATEMENT', 'EXPERT_REPORT',
        'COURT_FILING', 'OTHER'
      ]),
      content: z.string().optional(), // For AI-generated documents
      description: z.string().optional(),
      caseId: z.string().cuid().optional(),
      clientId: z.string().cuid().optional(),
      generatedBy: z.enum(['AI', 'TEMPLATE', 'MANUAL']).optional(),
      aiProvider: z.string().max(50).optional(),
    }).refine(data => data.caseId || data.clientId, {
      message: "Either caseId or clientId must be provided",
    }),
  },

  // Time Entry validation
  timeEntry: {
    create: z.object({
      description: z.string().min(1).max(500),
      hours: z.number().min(0.1).max(24), // Minimum 6 minutes, max 24 hours
      rate: z.number().min(0).max(9999.99),
      date: z.string().datetime(),
      billable: z.boolean().optional(),
      caseId: z.string().cuid().optional(),
    }),
  },

  // Search and filter validation
  search: {
    cases: z.object({
      query: z.string().max(255).optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      attorneyId: z.string().cuid().optional(),
      clientId: z.string().cuid().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }),
    clients: z.object({
      query: z.string().max(255).optional(),
      state: z.string().length(2).optional(),
      source: z.string().max(100).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }),
    documents: z.object({
      query: z.string().max(255).optional(),
      type: z.string().optional(),
      caseId: z.string().cuid().optional(),
      clientId: z.string().cuid().optional(),
      generatedBy: z.enum(['AI', 'TEMPLATE', 'MANUAL']).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }),
  },
};

// Validation middleware
const validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedData = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

// Query parameter validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Query validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

module.exports = {
  ValidationSchemas,
  validateSchema,
  validateQuery,
};