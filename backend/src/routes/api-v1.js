const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const { ErrorHandler } = require('../middleware/errorHandler');
const SecurityMiddleware = require('../middleware/security');

// Import controllers
const ClientController = require('../controllers/clientController');
const CommunicationController = require('../controllers/CommunicationController');
const CaseController = require('../controllers/caseController');
const CaseTemplateController = require('../controllers/CaseTemplateController');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API Health Check
 *     description: Returns the health status of the API
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: 'API is healthy'
 *               timestamp: '2024-01-01T00:00:00.000Z'
 *               version: '1.0.0'
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Apply common middleware to authenticated API routes
router.use(authenticateToken); // All other API routes require authentication
router.use(SecurityMiddleware.deviceFingerprinting()); // Device fingerprinting

// ==================== CLIENT ROUTES ====================
const clientRouter = express.Router();

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: List all clients
 *     description: Retrieve a paginated list of clients with optional filtering and sorting
 *     tags: [Clients]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of clients per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort by fields (e.g., "firstName,-createdAt")
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for firstName, lastName, email, phone, or clientNumber
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *         description: Filter by first name
 *       - in: query
 *         name: lastName
 *         schema:
 *           type: string
 *         description: Filter by last name
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of clients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Client'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
clientRouter.get('/', 
  ValidationMiddleware.queryValidation(
    ['firstName', 'lastName', 'email', 'phone', 'mobile', 'city', 'state', 'zipCode', 'maritalStatus', 'preferredContact', 'isActive'],
    ['firstName', 'lastName', 'email', 'phone', 'clientNumber', 'city', 'state', 'createdAt', 'updatedAt']
  ),
  ValidationMiddleware.handleValidationErrors,
  ClientController.getAll
);

clientRouter.get('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ClientController.getById
);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     description: Create a new client record
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientCreateRequest'
 *           examples:
 *             basic:
 *               summary: Basic client creation
 *               value:
 *                 firstName: John
 *                 lastName: Doe
 *                 email: john.doe@example.com
 *                 phone: "15551234567"
 *                 city: New York
 *                 state: NY
 *                 preferredContact: EMAIL
 *             full:
 *               summary: Complete client information
 *               value:
 *                 firstName: Jane
 *                 lastName: Smith
 *                 email: jane.smith@example.com
 *                 phone: "15551234567"
 *                 mobile: "15559876543"
 *                 address: 456 Oak Avenue
 *                 city: Los Angeles
 *                 state: CA
 *                 zipCode: "90210"
 *                 dateOfBirth: "1985-03-15"
 *                 employer: Tech Corp
 *                 occupation: Software Developer
 *                 maritalStatus: MARRIED
 *                 spouseName: John Smith
 *                 preferredContact: EMAIL
 *                 notes: Referred by existing client
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     statusCode:
 *                       type: integer
 *                       example: 201
 *                     data:
 *                       $ref: '#/components/schemas/Client'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Client with email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
clientRouter.post('/',
  ValidationMiddleware.clientValidation.create(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  ClientController.create
);

clientRouter.put('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.clientValidation.update(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  ClientController.update
);

clientRouter.patch('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.clientValidation.update(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  ClientController.patch
);

clientRouter.delete('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  ClientController.delete
);

// Custom client routes
clientRouter.get('/:id/stats',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ClientController.getClientStats
);

clientRouter.get('/:id/timeline',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.rules.pagination(),
  ValidationMiddleware.handleValidationErrors,
  ClientController.getClientTimeline
);

// Emergency Contact Management
clientRouter.get('/:id/emergency-contacts',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ClientController.getEmergencyContacts
);

clientRouter.post('/:id/emergency-contacts',
  ValidationMiddleware.rules.id(),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('relationship').notEmpty().withMessage('Relationship is required'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('email').optional().isEmail().withMessage('Invalid email format')
  ],
  ValidationMiddleware.handleValidationErrors,
  ClientController.createEmergencyContact
);

clientRouter.put('/:id/emergency-contacts/:contactId',
  ValidationMiddleware.rules.id(),
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('relationship').optional().notEmpty().withMessage('Relationship cannot be empty'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('email').optional().isEmail().withMessage('Invalid email format')
  ],
  ValidationMiddleware.handleValidationErrors,
  ClientController.updateEmergencyContact
);

clientRouter.delete('/:id/emergency-contacts/:contactId',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ClientController.deleteEmergencyContact
);

clientRouter.post('/merge',
  [
    body('primaryClientId').isLength({ min: 1 }).withMessage('Primary client ID is required'),
    body('secondaryClientId').isLength({ min: 1 }).withMessage('Secondary client ID is required')
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  ClientController.mergeClients
);

// Bulk operations
clientRouter.post('/bulk',
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  ClientController.bulkCreate
);

clientRouter.put('/bulk',
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  ClientController.bulkUpdate
);

clientRouter.delete('/bulk',
  ErrorHandler.requireRole(['ADMIN']),
  ClientController.bulkDelete
);

// Mount client routes
router.use('/clients', clientRouter);

// ==================== COMMUNICATION ROUTES ====================
const communicationRouter = express.Router();

/**
 * @swagger
 * /communications:
 *   get:
 *     summary: List all communications
 *     description: Retrieve a paginated list of communications with filtering and sorting
 *     tags: [Communications]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of communications per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [EMAIL, PHONE, TEXT, MEETING, LETTER, VIDEO_CALL, VOICEMAIL, FAX, DOCUMENT_DELIVERY]
 *         description: Filter by communication type
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter by client ID
 *       - in: query
 *         name: caseId
 *         schema:
 *           type: string
 *         description: Filter by case ID
 *       - in: query
 *         name: followUpRequired
 *         schema:
 *           type: boolean
 *         description: Filter communications requiring follow-up
 *     responses:
 *       200:
 *         description: Communications retrieved successfully
 *       401:
 *         description: Authentication required
 */
communicationRouter.get('/',
  ValidationMiddleware.queryValidation(
    ['type', 'direction', 'status', 'clientId', 'caseId', 'userId', 'priority', 'followUpRequired', 'billable', 'isConfidential'],
    ['dateTime', 'type', 'direction', 'status', 'priority', 'followUpDate', 'createdAt', 'updatedAt']
  ),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.getAll
);

communicationRouter.get('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.getById
);

/**
 * @swagger
 * /communications:
 *   post:
 *     summary: Create a new communication record
 *     description: Log a new communication (email, phone call, meeting, etc.)
 *     tags: [Communications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - direction
 *               - dateTime
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [EMAIL, PHONE, TEXT, MEETING, LETTER, VIDEO_CALL, VOICEMAIL, FAX, DOCUMENT_DELIVERY]
 *               direction:
 *                 type: string
 *                 enum: [INBOUND, OUTBOUND]
 *               subject:
 *                 type: string
 *                 maxLength: 500
 *               content:
 *                 type: string
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *               clientId:
 *                 type: string
 *               caseId:
 *                 type: string
 *               followUpRequired:
 *                 type: boolean
 *               followUpDate:
 *                 type: string
 *                 format: date-time
 *           examples:
 *             email:
 *               summary: Email communication
 *               value:
 *                 type: EMAIL
 *                 direction: OUTBOUND
 *                 subject: Case update
 *                 content: Dear client, your case has been updated...
 *                 dateTime: 2025-01-15T10:30:00Z
 *                 clientId: client123
 *                 caseId: case456
 *                 followUpRequired: true
 *                 followUpDate: 2025-01-22T10:30:00Z
 *     responses:
 *       201:
 *         description: Communication created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
communicationRouter.post('/',
  ValidationMiddleware.communicationValidation.create(),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.create
);

communicationRouter.put('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.communicationValidation.update(),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.update
);

communicationRouter.delete('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CommunicationController.delete
);

// Client-specific communication routes
communicationRouter.get('/client/:clientId',
  ValidationMiddleware.rules.id('clientId'),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.getClientCommunications
);

// Case-specific communication routes  
communicationRouter.get('/case/:caseId',
  ValidationMiddleware.rules.id('caseId'),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.getCaseCommunications
);

// Follow-up management
communicationRouter.get('/followup/pending',
  CommunicationController.getFollowUpCommunications
);

// Communication actions
communicationRouter.patch('/:id/read',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.markAsRead
);

communicationRouter.post('/:id/summary',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CommunicationController.generateSummary
);

// Statistics and analytics
communicationRouter.get('/stats/overview',
  CommunicationController.getCommunicationStats
);

// Bulk operations
communicationRouter.patch('/bulk/status',
  [
    body('ids').isArray({ min: 1 }).withMessage('IDs array is required'),
    body('status').isIn(['DRAFT', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED', 'SCHEDULED']).withMessage('Valid status is required')
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  CommunicationController.bulkUpdateStatus
);

// Mount communication routes
router.use('/communications', communicationRouter);

// ==================== CASE ROUTES ====================
const caseRouter = express.Router();

/**
 * @swagger
 * /cases:
 *   get:
 *     summary: List all cases
 *     description: Retrieve a paginated list of cases with optional filtering and sorting
 *     tags: [Cases]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of cases per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort by fields (e.g., "caseNumber,-createdAt")
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for case number, title, or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by case status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by case type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by case priority
 *       - in: query
 *         name: attorneyId
 *         schema:
 *           type: string
 *         description: Filter by assigned attorney
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter by client
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
caseRouter.get('/',
  ...ValidationMiddleware.rules.pagination(),
  ValidationMiddleware.handleValidationErrors,
  CaseController.getAll
);

/**
 * @swagger
 * /cases/{id}:
 *   get:
 *     summary: Get case by ID
 *     description: Retrieve detailed information about a specific case
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case retrieved successfully
 *       404:
 *         description: Case not found
 */
caseRouter.get('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CaseController.getById
);

/**
 * @swagger
 * /cases:
 *   post:
 *     summary: Create new case
 *     description: Create a new case with automatic case number generation
 *     tags: [Cases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - clientId
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 500
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PERSONAL_INJURY, AUTO_ACCIDENT, MEDICAL_MALPRACTICE, WORKERS_COMP, PREMISES_LIABILITY, PRODUCT_LIABILITY, CONTRACT_DISPUTE, EMPLOYMENT_LAW, FAMILY_LAW, CRIMINAL_DEFENSE, ESTATE_PLANNING, REAL_ESTATE, BANKRUPTCY, BUSINESS_LAW, IMMIGRATION]
 *               priority:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *                 default: MEDIUM
 *               clientId:
 *                 type: string
 *               attorneyId:
 *                 type: string
 *               paralegalId:
 *                 type: string
 *               estimatedValue:
 *                 type: number
 *               statute:
 *                 type: string
 *                 format: date
 *               contingencyRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Case created successfully
 *       400:
 *         description: Validation error
 */
caseRouter.post('/',
  ValidationMiddleware.caseValidation.create(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseController.create
);

/**
 * @swagger
 * /cases/{id}:
 *   put:
 *     summary: Update case
 *     description: Update case information with full replacement
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               stage:
 *                 type: string
 *               statusChangeReason:
 *                 type: string
 *               statusChangeNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Case updated successfully
 *       404:
 *         description: Case not found
 */
caseRouter.put('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.caseValidation.update(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  CaseController.update
);

/**
 * @swagger
 * /cases/{id}:
 *   delete:
 *     summary: Delete case
 *     description: Soft delete a case (archives it)
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       204:
 *         description: Case deleted successfully
 *       404:
 *         description: Case not found
 */
caseRouter.delete('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseController.delete
);

// Case lifecycle and status tracking
caseRouter.get('/:id/status-history',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CaseController.getCaseStatusHistory
);

// Case deadlines management
caseRouter.get('/:id/deadlines',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CaseController.getCaseDeadlines
);

caseRouter.post('/:id/deadlines',
  ValidationMiddleware.rules.id(),
  [
    body('title').isLength({ min: 1, max: 300 }).withMessage('Title is required (max 300 chars)'),
    body('dueDate').isISO8601().toDate().withMessage('Valid due date is required'),
    body('type').isLength({ min: 1, max: 100 }).withMessage('Deadline type is required'),
    body('priority').optional().isIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    body('isStatutory').optional().isBoolean()
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  CaseController.createCaseDeadline
);

caseRouter.patch('/:id/deadlines/:deadlineId/complete',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.rules.id('deadlineId'),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  CaseController.completeCaseDeadline
);

// Case value tracking
caseRouter.get('/:id/values',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CaseController.getCaseValueHistory
);

caseRouter.post('/:id/values',
  ValidationMiddleware.rules.id(),
  [
    body('valueType').isIn(['INITIAL_ESTIMATE', 'DEMAND', 'OFFER', 'SETTLEMENT', 'JUDGMENT']).withMessage('Valid value type is required'),
    body('amount').isDecimal().withMessage('Valid amount is required'),
    body('description').optional().isLength({ max: 500 })
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  CaseController.addCaseValue
);

// Attorney workload and assignment
caseRouter.get('/attorney/:attorneyId/workload',
  ValidationMiddleware.rules.id('attorneyId'),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseController.getAttorneyWorkload
);

// Case dashboard and overview
caseRouter.get('/:id/dashboard',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CaseController.getCaseDashboard
);

// Case statistics and reporting
caseRouter.get('/stats/overview',
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseController.getCaseStats
);

// Mount case routes
router.use('/cases', caseRouter);

// ==================== CASE TEMPLATE ROUTES ====================
const caseTemplateRouter = express.Router();

/**
 * @swagger
 * /case-templates:
 *   get:
 *     summary: List all case templates
 *     description: Retrieve a paginated list of case templates with optional filtering
 *     tags: [Case Templates]
 *     parameters:
 *       - in: query
 *         name: caseType
 *         schema:
 *           type: string
 *         description: Filter by case type
 *       - in: query
 *         name: templateType
 *         schema:
 *           type: string
 *         description: Filter by template type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
caseTemplateRouter.get('/',
  ValidationMiddleware.queryValidation(
    ['caseType', 'templateType', 'isActive', 'isDefault'],
    ['name', 'caseType', 'templateType', 'createdAt']
  ),
  ValidationMiddleware.handleValidationErrors,
  CaseTemplateController.getAll
);

caseTemplateRouter.get('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  CaseTemplateController.getById
);

/**
 * @swagger
 * /case-templates:
 *   post:
 *     summary: Create new case template
 *     description: Create a new case template with workflow configuration
 *     tags: [Case Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - caseType
 *               - templateType
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *               caseType:
 *                 type: string
 *               templateType:
 *                 type: string
 *               workflowSteps:
 *                 type: object
 *               taskTemplates:
 *                 type: object
 *               deadlineTemplates:
 *                 type: object
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Validation error
 */
caseTemplateRouter.post('/',
  [
    body('name').notEmpty().isLength({ max: 200 }).withMessage('Name is required (max 200 chars)'),
    body('caseType').notEmpty().withMessage('Case type is required'),
    body('templateType').notEmpty().withMessage('Template type is required')
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseTemplateController.create
);

caseTemplateRouter.put('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseTemplateController.update
);

caseTemplateRouter.delete('/:id',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseTemplateController.delete
);

// Get templates by case type
caseTemplateRouter.get('/case-type/:caseType',
  [
    body('caseType').notEmpty().withMessage('Case type is required')
  ],
  ValidationMiddleware.handleValidationErrors,
  CaseTemplateController.getTemplatesByCaseType
);

// Apply template to case
caseTemplateRouter.post('/:templateId/apply',
  ValidationMiddleware.rules.id('templateId'),
  [
    body('caseId').notEmpty().withMessage('Case ID is required')
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY', 'PARALEGAL']),
  CaseTemplateController.applyTemplateToCase
);

// Set template as default
caseTemplateRouter.patch('/:id/set-default',
  ValidationMiddleware.rules.id(),
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseTemplateController.setAsDefault
);

// Clone template
caseTemplateRouter.post('/:id/clone',
  ValidationMiddleware.rules.id(),
  [
    body('name').optional().isLength({ max: 200 }).withMessage('Name max 200 chars')
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseTemplateController.cloneTemplate
);

// Get template usage statistics
caseTemplateRouter.get('/stats/usage',
  ErrorHandler.requireRole(['ADMIN', 'ATTORNEY']),
  CaseTemplateController.getTemplateStats
);

// Mount case template routes
router.use('/case-templates', caseTemplateRouter);

// ==================== SETTLEMENT ROUTES ====================
// TODO: Implement SettlementController and routes

// ==================== USER ROUTES ====================
// TODO: Implement UserController and routes

// ==================== DOCUMENT ROUTES ====================
// TODO: Implement DocumentController and routes

// ==================== TASK ROUTES ====================
// TODO: Implement TaskController and routes

// ==================== TIME ENTRY ROUTES ====================
// TODO: Implement TimeEntryController and routes

// ==================== BILLING ROUTES ====================
// TODO: Implement BillingController and routes

// ==================== COMMUNICATION ROUTES ====================
// TODO: Implement CommunicationController and routes

// ==================== APPOINTMENT ROUTES ====================
// TODO: Implement AppointmentController and routes

// ==================== REPORTING ROUTES ====================
// TODO: Implement ReportingController and routes

// API Documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Legal Estate API Documentation',
    version: '1.0.0',
    endpoints: {
      clients: {
        'GET /clients': 'List all clients with pagination, filtering, and sorting',
        'GET /clients/:id': 'Get client by ID',
        'POST /clients': 'Create new client',
        'PUT /clients/:id': 'Update client',
        'PATCH /clients/:id': 'Partially update client',
        'DELETE /clients/:id': 'Delete client',
        'GET /clients/:id/stats': 'Get client statistics',
        'GET /clients/:id/timeline': 'Get client timeline',
        'POST /clients/merge': 'Merge two clients',
        'POST /clients/bulk': 'Bulk create clients',
        'PUT /clients/bulk': 'Bulk update clients',
        'DELETE /clients/bulk': 'Bulk delete clients'
      }
    },
    authentication: 'Bearer token required for all endpoints',
    errorFormat: {
      success: false,
      error: {
        message: 'Error description',
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'ERROR_TYPE',
        details: 'Additional error details if available'
      }
    },
    successFormat: {
      success: true,
      message: 'Success message',
      timestamp: '2024-01-01T00:00:00.000Z',
      data: 'Response data',
      pagination: {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: false
      }
    }
  });
});

module.exports = router;