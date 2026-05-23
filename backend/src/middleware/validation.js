const { body, param, query, validationResult } = require('express-validator');
const APIResponse = require('../lib/apiResponse');
const { APIError } = require('./errorHandler');

class ValidationMiddleware {
  
  // Check validation results and format errors
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));
      
      const response = APIResponse.validationError(formattedErrors);
      return res.status(400).json(response);
    }
    next();
  }

  // Common validation rules
  static rules = {
    // ID validation
    id: () => [
      param('id')
        .isLength({ min: 1 })
        .withMessage('ID is required')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid ID format')
    ],

    // Email validation
    email: (field = 'email', optional = false) => [
      optional ? 
        body(field).optional().isEmail().normalizeEmail().withMessage('Invalid email format') :
        body(field).isEmail().normalizeEmail().withMessage('Invalid email format')
    ],

    // Password validation
    password: (field = 'password', optional = false) => [
      optional ?
        body(field).optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters') :
        body(field).isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],

    // Strong password validation
    strongPassword: (field = 'password') => [
      body(field)
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    ],

    // Name validation
    name: (field = 'name', optional = false) => [
      optional ?
        body(field).optional().trim().isLength({ min: 1, max: 100 }).withMessage(`${field} must be between 1 and 100 characters`) :
        body(field).trim().isLength({ min: 1, max: 100 }).withMessage(`${field} must be between 1 and 100 characters`)
    ],

    // Phone validation
    phone: (field = 'phone', optional = true) => [
      optional ?
        body(field).optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Invalid phone number format') :
        body(field).matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Invalid phone number format')
    ],

    // Date validation
    date: (field, optional = true) => [
      optional ?
        body(field).optional().isISO8601().withMessage(`${field} must be a valid date`) :
        body(field).isISO8601().withMessage(`${field} must be a valid date`)
    ],

    // Enum validation
    enum: (field, values, optional = false) => [
      optional ?
        body(field).optional().isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`) :
        body(field).isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`)
    ],

    // Number validation
    number: (field, min = null, max = null, optional = false) => {
      const validators = [];
      
      if (optional) {
        let validator = body(field).optional().isNumeric().withMessage(`${field} must be a number`);
        if (min !== null) validator = validator.isFloat({ min }).withMessage(`${field} must be at least ${min}`);
        if (max !== null) validator = validator.isFloat({ max }).withMessage(`${field} must be at most ${max}`);
        validators.push(validator);
      } else {
        let validator = body(field).isNumeric().withMessage(`${field} must be a number`);
        if (min !== null) validator = validator.isFloat({ min }).withMessage(`${field} must be at least ${min}`);
        if (max !== null) validator = validator.isFloat({ max }).withMessage(`${field} must be at most ${max}`);
        validators.push(validator);
      }
      
      return validators;
    },

    // Pagination validation
    pagination: () => [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],

    // Sort validation
    sort: (allowedFields = []) => [
      query('sort').optional().custom(value => {
        const sortFields = value.split(',');
        for (const field of sortFields) {
          const fieldName = field.startsWith('-') ? field.slice(1) : field;
          if (allowedFields.length > 0 && !allowedFields.includes(fieldName)) {
            throw new Error(`Invalid sort field: ${fieldName}. Allowed fields: ${allowedFields.join(', ')}`);
          }
        }
        return true;
      })
    ]
  };

  // User validation schemas
  static userValidation = {
    create: () => [
      ...this.rules.email('email'),
      ...this.rules.strongPassword('password'),
      ...this.rules.name('name'),
      ...this.rules.enum('role', ['ADMIN', 'ATTORNEY', 'PARALEGAL', 'CLIENT', 'SUPPORT']),
      ...this.rules.phone('phone', true),
      body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
      body('barNumber').optional().trim().isLength({ max: 50 }).withMessage('Bar number must be less than 50 characters')
    ],

    update: () => [
      ...this.rules.email('email', true),
      ...this.rules.name('name', true),
      ...this.rules.enum('role', ['ADMIN', 'ATTORNEY', 'PARALEGAL', 'CLIENT', 'SUPPORT'], true),
      ...this.rules.phone('phone', true),
      body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
      body('barNumber').optional().trim().isLength({ max: 50 }).withMessage('Bar number must be less than 50 characters')
    ],

    changePassword: () => [
      body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
      ...this.rules.strongPassword('newPassword')
    ]
  };

  // Communication validation schemas
  static communicationValidation = {
    create: () => [
      body('type').isIn(['EMAIL', 'PHONE', 'TEXT', 'MEETING', 'LETTER', 'VIDEO_CALL', 'VOICEMAIL', 'FAX', 'DOCUMENT_DELIVERY']).withMessage('Valid communication type is required'),
      body('direction').isIn(['INBOUND', 'OUTBOUND']).withMessage('Valid direction is required'),
      body('dateTime').isISO8601().toDate().withMessage('Valid date-time is required'),
      body('subject').optional().isLength({ max: 500 }).withMessage('Subject must be less than 500 characters'),
      body('content').optional().isString().withMessage('Content must be a string'),
      body('summary').optional().isLength({ max: 1000 }).withMessage('Summary must be less than 1000 characters'),
      body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
      body('priority').optional().isIn(['HIGH', 'NORMAL', 'LOW']).withMessage('Valid priority is required'),
      body('followUpRequired').optional().isBoolean().withMessage('Follow-up required must be boolean'),
      body('followUpDate').optional().isISO8601().toDate().withMessage('Valid follow-up date is required'),
      body('fromEmail').optional().isEmail().withMessage('Valid from email is required'),
      body('toEmails').optional().isArray().withMessage('To emails must be an array'),
      body('fromPhone').optional().isMobilePhone().withMessage('Valid from phone is required'),
      body('toPhone').optional().isMobilePhone().withMessage('Valid to phone is required'),
      body('isConfidential').optional().isBoolean().withMessage('Confidential flag must be boolean'),
      body('billable').optional().isBoolean().withMessage('Billable flag must be boolean'),
      body('clientId').optional().isLength({ min: 1 }).withMessage('Valid client ID is required'),
      body('caseId').optional().isLength({ min: 1 }).withMessage('Valid case ID is required')
    ],
    update: () => [
      body('type').optional().isIn(['EMAIL', 'PHONE', 'TEXT', 'MEETING', 'LETTER', 'VIDEO_CALL', 'VOICEMAIL', 'FAX', 'DOCUMENT_DELIVERY']).withMessage('Valid communication type is required'),
      body('direction').optional().isIn(['INBOUND', 'OUTBOUND']).withMessage('Valid direction is required'),
      body('status').optional().isIn(['DRAFT', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED', 'SCHEDULED']).withMessage('Valid status is required'),
      body('dateTime').optional().isISO8601().toDate().withMessage('Valid date-time is required'),
      body('subject').optional().isLength({ max: 500 }).withMessage('Subject must be less than 500 characters'),
      body('content').optional().isString().withMessage('Content must be a string'),
      body('summary').optional().isLength({ max: 1000 }).withMessage('Summary must be less than 1000 characters'),
      body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
      body('priority').optional().isIn(['HIGH', 'NORMAL', 'LOW']).withMessage('Valid priority is required'),
      body('followUpRequired').optional().isBoolean().withMessage('Follow-up required must be boolean'),
      body('followUpDate').optional().isISO8601().toDate().withMessage('Valid follow-up date is required'),
      body('fromEmail').optional().isEmail().withMessage('Valid from email is required'),
      body('toEmails').optional().isArray().withMessage('To emails must be an array'),
      body('fromPhone').optional().isMobilePhone().withMessage('Valid from phone is required'),
      body('toPhone').optional().isMobilePhone().withMessage('Valid to phone is required'),
      body('isConfidential').optional().isBoolean().withMessage('Confidential flag must be boolean'),
      body('billable').optional().isBoolean().withMessage('Billable flag must be boolean'),
      body('clientId').optional().isLength({ min: 1 }).withMessage('Valid client ID is required'),
      body('caseId').optional().isLength({ min: 1 }).withMessage('Valid case ID is required')
    ]
  };

  // Client validation schemas
  static clientValidation = {
    create: () => [
      ...this.rules.name('firstName'),
      ...this.rules.name('lastName'),
      ...this.rules.email('email', true),
      ...this.rules.phone('phone', true),
      ...this.rules.phone('mobile', true),
      body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
      body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
      body('state').optional().trim().isLength({ max: 50 }).withMessage('State must be less than 50 characters'),
      body('zipCode').optional().matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format'),
      ...this.rules.date('dateOfBirth', true),
      body('ssn').optional().matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('SSN must be in format XXX-XX-XXXX'),
      ...this.rules.enum('maritalStatus', ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'], true),
      ...this.rules.enum('preferredContact', ['EMAIL', 'PHONE', 'MAIL', 'TEXT', 'IN_PERSON'], true)
    ],

    update: () => [
      ...this.rules.name('firstName', true),
      ...this.rules.name('lastName', true),
      ...this.rules.email('email', true),
      ...this.rules.phone('phone', true),
      ...this.rules.phone('mobile', true),
      body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
      body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
      body('state').optional().trim().isLength({ max: 50 }).withMessage('State must be less than 50 characters'),
      body('zipCode').optional().matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format'),
      ...this.rules.date('dateOfBirth', true),
      body('ssn').optional().matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('SSN must be in format XXX-XX-XXXX'),
      ...this.rules.enum('maritalStatus', ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'], true),
      ...this.rules.enum('preferredContact', ['EMAIL', 'PHONE', 'MAIL', 'TEXT', 'IN_PERSON'], true)
    ]
  };

  // Case validation schemas
  static caseValidation = {
    create: () => [
      body('title').isLength({ min: 1, max: 500 }).withMessage('Title is required (max 500 chars)'),
      body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
      ...this.rules.enum('type', [
        'PERSONAL_INJURY', 'AUTO_ACCIDENT', 'MEDICAL_MALPRACTICE', 'WORKERS_COMP',
        'PREMISES_LIABILITY', 'PRODUCT_LIABILITY', 'CONTRACT_DISPUTE', 'EMPLOYMENT_LAW',
        'FAMILY_LAW', 'CRIMINAL_DEFENSE', 'ESTATE_PLANNING', 'REAL_ESTATE',
        'BANKRUPTCY', 'BUSINESS_LAW', 'IMMIGRATION'
      ]),
      body('clientId').isLength({ min: 1 }).withMessage('Client ID is required'),
      ...this.rules.enum('status', [
        'INTAKE', 'CONSULTATION_SCHEDULED', 'CONSULTATION_COMPLETED', 'RETAINER_SIGNED',
        'INVESTIGATION', 'DISCOVERY', 'ACTIVE', 'SETTLEMENT_NEGOTIATION', 'MEDIATION',
        'ARBITRATION', 'LITIGATION', 'TRIAL_PREPARATION', 'TRIAL', 'POST_TRIAL',
        'SETTLED', 'DISMISSED', 'CLOSED', 'ARCHIVED', 'ON_HOLD', 'REFERRED_OUT'
      ], true),
      ...this.rules.enum('priority', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], true),
      ...this.rules.enum('stage', ['PRE_LITIGATION', 'LITIGATION', 'SETTLEMENT', 'TRIAL', 'POST_JUDGMENT', 'APPEAL', 'CLOSED'], true),
      ...this.rules.enum('source', [
        'REFERRAL_ATTORNEY', 'REFERRAL_CLIENT', 'REFERRAL_FRIEND', 'ONLINE_SEARCH',
        'ADVERTISEMENT', 'SOCIAL_MEDIA', 'YELLOW_PAGES', 'DIRECT_MAIL', 'WALK_IN',
        'RETURN_CLIENT', 'OTHER'
      ], true),
      body('attorneyId').optional().isLength({ min: 1 }).withMessage('Attorney ID must be valid'),
      body('paralegalId').optional().isLength({ min: 1 }).withMessage('Paralegal ID must be valid'),
      body('secondAttorneyId').optional().isLength({ min: 1 }).withMessage('Second Attorney ID must be valid'),
      body('referringAttorneyId').optional().isLength({ min: 1 }).withMessage('Referring Attorney ID must be valid'),
      ...this.rules.date('consultationDate', true),
      ...this.rules.date('retainerSignedDate', true),
      ...this.rules.date('statute', true),
      ...this.rules.date('nextDeadline', true),
      body('deadlineDescription').optional().trim().isLength({ max: 500 }).withMessage('Deadline description must be less than 500 characters'),
      ...this.rules.number('estimatedValue', 0, null, true),
      ...this.rules.number('demandAmount', 0, null, true),
      ...this.rules.number('contingencyRate', 0, 100, true),
      body('internalNotes').optional().trim().isLength({ max: 5000 }).withMessage('Internal notes must be less than 5000 characters'),
      body('clientInstructions').optional().trim().isLength({ max: 5000 }).withMessage('Client instructions must be less than 5000 characters'),
      body('workflowTemplate').optional().trim().isLength({ max: 100 }).withMessage('Workflow template must be less than 100 characters')
    ],

    update: () => [
      body('title').optional().isLength({ min: 1, max: 500 }).withMessage('Title must be 1-500 characters'),
      body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
      ...this.rules.enum('type', [
        'PERSONAL_INJURY', 'AUTO_ACCIDENT', 'MEDICAL_MALPRACTICE', 'WORKERS_COMP',
        'PREMISES_LIABILITY', 'PRODUCT_LIABILITY', 'CONTRACT_DISPUTE', 'EMPLOYMENT_LAW',
        'FAMILY_LAW', 'CRIMINAL_DEFENSE', 'ESTATE_PLANNING', 'REAL_ESTATE',
        'BANKRUPTCY', 'BUSINESS_LAW', 'IMMIGRATION'
      ], true),
      ...this.rules.enum('status', [
        'INTAKE', 'CONSULTATION_SCHEDULED', 'CONSULTATION_COMPLETED', 'RETAINER_SIGNED',
        'INVESTIGATION', 'DISCOVERY', 'ACTIVE', 'SETTLEMENT_NEGOTIATION', 'MEDIATION',
        'ARBITRATION', 'LITIGATION', 'TRIAL_PREPARATION', 'TRIAL', 'POST_TRIAL',
        'SETTLED', 'DISMISSED', 'CLOSED', 'ARCHIVED', 'ON_HOLD', 'REFERRED_OUT'
      ], true),
      ...this.rules.enum('priority', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], true),
      ...this.rules.enum('stage', ['PRE_LITIGATION', 'LITIGATION', 'SETTLEMENT', 'TRIAL', 'POST_JUDGMENT', 'APPEAL', 'CLOSED'], true),
      ...this.rules.enum('source', [
        'REFERRAL_ATTORNEY', 'REFERRAL_CLIENT', 'REFERRAL_FRIEND', 'ONLINE_SEARCH',
        'ADVERTISEMENT', 'SOCIAL_MEDIA', 'YELLOW_PAGES', 'DIRECT_MAIL', 'WALK_IN',
        'RETURN_CLIENT', 'OTHER'
      ], true),
      body('attorneyId').optional().isLength({ min: 1 }).withMessage('Attorney ID must be valid'),
      body('paralegalId').optional().isLength({ min: 1 }).withMessage('Paralegal ID must be valid'),
      body('secondAttorneyId').optional().isLength({ min: 1 }).withMessage('Second Attorney ID must be valid'),
      body('referringAttorneyId').optional().isLength({ min: 1 }).withMessage('Referring Attorney ID must be valid'),
      ...this.rules.date('consultationDate', true),
      ...this.rules.date('retainerSignedDate', true),
      ...this.rules.date('discoveryStartDate', true),
      ...this.rules.date('discoveryEndDate', true),
      ...this.rules.date('mediationDate', true),
      ...this.rules.date('trialDate', true),
      ...this.rules.date('settlementDate', true),
      ...this.rules.date('dateClosed', true),
      ...this.rules.date('statute', true),
      ...this.rules.date('nextDeadline', true),
      body('deadlineDescription').optional().trim().isLength({ max: 500 }).withMessage('Deadline description must be less than 500 characters'),
      ...this.rules.number('estimatedValue', 0, null, true),
      ...this.rules.number('demandAmount', 0, null, true),
      ...this.rules.number('settlementAmount', 0, null, true),
      ...this.rules.number('attorneyFees', 0, null, true),
      ...this.rules.number('costs', 0, null, true),
      ...this.rules.number('netToClient', 0, null, true),
      ...this.rules.number('contingencyRate', 0, 100, true),
      body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
      body('isArchived').optional().isBoolean().withMessage('isArchived must be boolean'),
      body('internalNotes').optional().trim().isLength({ max: 5000 }).withMessage('Internal notes must be less than 5000 characters'),
      body('clientInstructions').optional().trim().isLength({ max: 5000 }).withMessage('Client instructions must be less than 5000 characters'),
      body('workflowTemplate').optional().trim().isLength({ max: 100 }).withMessage('Workflow template must be less than 100 characters')
    ]
  };

  // Settlement validation schemas  
  static settlementValidation = {
    create: () => [
      body('caseId').isLength({ min: 1 }).withMessage('Case ID is required'),
      ...this.rules.enum('type', ['DEMAND', 'OFFER', 'COUNTER_OFFER', 'FINAL_SETTLEMENT', 'MEDIATION', 'ARBITRATION']),
      ...this.rules.number('amount', 0),
      ...this.rules.date('date', true),
      ...this.rules.enum('status', ['NEGOTIATING', 'ACCEPTED', 'REJECTED', 'PENDING', 'COMPLETED', 'CANCELLED'], true),
      body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
      ...this.rules.number('attorneyFees', 0, null, true),
      ...this.rules.number('costs', 0, null, true),
      ...this.rules.number('netToClient', 0, null, true)
    ],

    update: () => [
      body('caseId').optional().isLength({ min: 1 }).withMessage('Case ID must be valid'),
      ...this.rules.enum('type', ['DEMAND', 'OFFER', 'COUNTER_OFFER', 'FINAL_SETTLEMENT', 'MEDIATION', 'ARBITRATION'], true),
      ...this.rules.number('amount', 0, null, true),
      ...this.rules.date('date', true),
      ...this.rules.enum('status', ['NEGOTIATING', 'ACCEPTED', 'REJECTED', 'PENDING', 'COMPLETED', 'CANCELLED'], true),
      body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
      ...this.rules.number('attorneyFees', 0, null, true),
      ...this.rules.number('costs', 0, null, true),
      ...this.rules.number('netToClient', 0, null, true)
    ]
  };

  // Generic query validation
  static queryValidation = (allowedFilters = [], allowedSortFields = []) => [
    ...this.rules.pagination(),
    ...this.rules.sort(allowedSortFields),
    query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
    // Validate filter parameters
    query().custom((value, { req }) => {
      const invalidFilters = [];
      for (const key in req.query) {
        if (!['page', 'limit', 'sort', 'search'].includes(key)) {
          const baseField = key.replace(/_(gte|lte|gt|lt|in|contains|startsWith|endsWith|ne)$/, '');
          if (allowedFilters.length > 0 && !allowedFilters.includes(baseField)) {
            invalidFilters.push(key);
          }
        }
      }
      if (invalidFilters.length > 0) {
        throw new Error(`Invalid filter parameters: ${invalidFilters.join(', ')}. Allowed filters: ${allowedFilters.join(', ')}`);
      }
      return true;
    })
  ];
}

module.exports = ValidationMiddleware;