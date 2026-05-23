const request = require('supertest');
const express = require('express');

// Mock the authentication middleware before requiring routes
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      userId: 'test-user-id',
      email: 'attorney@lawfirm.com',
      role: 'ATTORNEY'
    };
    next();
  },
  requireRole: (roles) => (req, res, next) => next()
}));

// Mock security middleware
jest.mock('../src/middleware/security', () => ({
  deviceFingerprinting: () => (req, res, next) => next()
}));

const apiV1Routes = require('../src/routes/api-v1');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1', apiV1Routes);

// Import error handling
const { ErrorHandler } = require('../src/middleware/errorHandler');
app.use(ErrorHandler.globalErrorHandler());

describe('Case Management API', () => {
  let clientId = '';
  let caseId = '';
  let deadlineId = '';
  
  const testClient = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '15551234567'
  };

  const testCase = {
    title: 'Personal Injury Case - Car Accident on I-95',
    description: 'Client was rear-ended on I-95, sustained injuries including whiplash and back pain',
    type: 'AUTO_ACCIDENT',
    priority: 'HIGH',
    stage: 'PRE_LITIGATION',
    source: 'REFERRAL_ATTORNEY',
    attorneyId: 'test-user-id', // Assign the test attorney
    estimatedValue: 75000,
    statute: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(), // 2 years from now
    contingencyRate: 33.33,
    internalNotes: 'Client seems credible, good potential case',
    clientInstructions: 'Client wants aggressive representation'
  };

  // Setup: Create test user and client first
  beforeAll(async () => {
    // First create a test user (since we don't have user routes yet, do it directly with Prisma)
    const prisma = require('../src/lib/prisma');
    
    await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'attorney@lawfirm.com',
        name: 'Test Attorney',
        role: 'ATTORNEY',
        password: 'hashed-password'
      }
    });
    
    const clientResponse = await request(app)
      .post('/api/v1/clients')
      .send(testClient);
    
    if (clientResponse.status === 201) {
      clientId = clientResponse.body.data.id;
      testCase.clientId = clientId;
    }
  });

  describe('Basic Case CRUD Operations', () => {
    it('should create a new case with auto-generated case number', async () => {
      const response = await request(app)
        .post('/api/v1/cases')
        .send(testCase);
      
      if (response.status !== 201) {
        console.log('Case creation failed:', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('caseNumber');
      expect(response.body.data.caseNumber).toMatch(/^CS\d{8}$/); // CS + year + 4 digits
      expect(response.body.data).toHaveProperty('title', testCase.title);
      expect(response.body.data).toHaveProperty('type', testCase.type);
      expect(response.body.data).toHaveProperty('priority', testCase.priority);
      expect(response.body.data).toHaveProperty('status', 'INTAKE'); // Default status
      expect(response.body.data).toHaveProperty('clientId', clientId);
      expect(parseFloat(response.body.data.estimatedValue)).toBe(testCase.estimatedValue);
      expect(parseFloat(response.body.data.contingencyRate)).toBe(testCase.contingencyRate);

      caseId = response.body.data.id;
    });

    it('should retrieve case by ID with full details', async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${caseId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', caseId);
      expect(response.body.data).toHaveProperty('client');
      expect(response.body.data.client).toHaveProperty('firstName', testClient.firstName);
      expect(response.body.data).toHaveProperty('_count');
      expect(response.body.data._count).toHaveProperty('documents');
      expect(response.body.data._count).toHaveProperty('tasks');
    });

    it('should update case status and track changes', async () => {
      const updates = {
        status: 'INVESTIGATION',
        priority: 'CRITICAL',
        attorneyId: 'test-user-id',
        statusChangeReason: 'Moving to investigation phase',
        statusChangeNotes: 'Client provided all necessary documents'
      };

      const response = await request(app)
        .put(`/api/v1/cases/${caseId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', updates.status);
      expect(response.body.data).toHaveProperty('priority', updates.priority);
      expect(response.body.data).toHaveProperty('attorneyId', updates.attorneyId);
    });

    it('should list cases with pagination and filtering', async () => {
      const response = await request(app)
        .get('/api/v1/cases?page=1&limit=10&status=INVESTIGATION&type=AUTO_ACCIDENT')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every(case_ => case_.status === 'INVESTIGATION')).toBe(true);
      expect(response.body.data.every(case_ => case_.type === 'AUTO_ACCIDENT')).toBe(true);
    });
  });

  describe('Case Lifecycle Tracking', () => {
    it('should retrieve case status history', async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${caseId}/status-history`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // Initial status + one update
      
      // Check that status changes are tracked
      const statusChanges = response.body.data;
      expect(statusChanges.some(change => change.toStatus === 'INTAKE')).toBe(true);
      expect(statusChanges.some(change => change.toStatus === 'INVESTIGATION')).toBe(true);
      expect(statusChanges.every(change => change.changedBy)).toBe(true);
    });
  });

  describe('Case Deadlines Management', () => {
    it('should create a case deadline', async () => {
      const deadline = {
        title: 'File Answer to Complaint',
        description: 'Defendant must file answer within 30 days',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'FILING',
        priority: 'HIGH',
        isStatutory: false,
        reminderDays: [7, 3, 1]
      };

      const response = await request(app)
        .post(`/api/v1/cases/${caseId}/deadlines`)
        .send(deadline)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('title', deadline.title);
      expect(response.body.data).toHaveProperty('type', deadline.type);
      expect(response.body.data).toHaveProperty('priority', deadline.priority);
      expect(response.body.data).toHaveProperty('completed', false);

      deadlineId = response.body.data.id;
    });

    it('should retrieve case deadlines', async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${caseId}/deadlines`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some(deadline => deadline.id === deadlineId)).toBe(true);
    });

    it('should complete a case deadline', async () => {
      const response = await request(app)
        .patch(`/api/v1/cases/${caseId}/deadlines/${deadlineId}/complete`)
        .send({ notes: 'Answer filed successfully' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('completed', true);
      expect(response.body.data).toHaveProperty('completedAt');
      expect(response.body.data).toHaveProperty('completedBy');
    });
  });

  describe('Case Value Tracking', () => {
    it('should add initial case value estimate', async () => {
      const caseValue = {
        valueType: 'INITIAL_ESTIMATE',
        amount: 75000,
        description: 'Initial estimate based on similar cases and medical records'
      };

      const response = await request(app)
        .post(`/api/v1/cases/${caseId}/values`)
        .send(caseValue)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('valueType', caseValue.valueType);
      expect(response.body.data).toHaveProperty('amount', caseValue.amount);
      expect(response.body.data).toHaveProperty('isActive', true);
      expect(response.body.data).toHaveProperty('enteredBy');
    });

    it('should add demand letter value', async () => {
      const demandValue = {
        valueType: 'DEMAND',
        amount: 125000,
        description: 'Demand letter amount sent to insurance company'
      };

      const response = await request(app)
        .post(`/api/v1/cases/${caseId}/values`)
        .send(demandValue)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('amount', demandValue.amount);
    });

    it('should retrieve case value history', async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${caseId}/values`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Initial estimate + demand
      
      // Check for both value types
      const valueTypes = response.body.data.map(v => v.valueType);
      expect(valueTypes).toContain('INITIAL_ESTIMATE');
      expect(valueTypes).toContain('DEMAND');
    });
  });

  describe('Case Dashboard and Overview', () => {
    it('should get comprehensive case dashboard', async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${caseId}/dashboard`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('case');
      expect(response.body.data).toHaveProperty('metrics');
      
      const metrics = response.body.data.metrics;
      expect(metrics).toHaveProperty('totalHours');
      expect(metrics).toHaveProperty('totalBilled');
      expect(metrics).toHaveProperty('totalExpenses');
      expect(metrics).toHaveProperty('documentCount');
      expect(metrics).toHaveProperty('communicationCount');
      expect(metrics).toHaveProperty('daysOpen');
      expect(typeof metrics.daysOpen).toBe('number');
      expect(metrics.daysOpen).toBeGreaterThanOrEqual(0);

      // Verify case data includes related information
      const caseData = response.body.data.case;
      expect(caseData).toHaveProperty('caseStatusHistory');
      expect(caseData).toHaveProperty('caseDeadlines');
      expect(caseData).toHaveProperty('caseValues');
      expect(caseData).toHaveProperty('communications');
      expect(caseData).toHaveProperty('tasks');
    });
  });

  describe('Attorney Workload Management', () => {
    it('should get attorney workload overview', async () => {
      const response = await request(app)
        .get(`/api/v1/cases/attorney/test-user-id/workload`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('attorney');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('cases');

      const statistics = response.body.data.statistics;
      expect(statistics).toHaveProperty('totalCases');
      expect(statistics).toHaveProperty('activeCases');
      expect(statistics).toHaveProperty('byStatus');
      expect(statistics).toHaveProperty('byType');
      expect(typeof statistics.totalCases).toBe('number');
    });
  });

  describe('Case Statistics and Reporting', () => {
    it('should get case statistics overview', async () => {
      const response = await request(app)
        .get('/api/v1/cases/stats/overview')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('distributions');
      expect(response.body.data).toHaveProperty('settlements');

      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('totalCases');
      expect(summary).toHaveProperty('activeCases');
      expect(summary).toHaveProperty('closedCases');
      expect(summary).toHaveProperty('upcomingDeadlines');

      const distributions = response.body.data.distributions;
      expect(distributions).toHaveProperty('byStatus');
      expect(distributions).toHaveProperty('byType');
      expect(distributions).toHaveProperty('byPriority');
      expect(distributions).toHaveProperty('byStage');
    });

    it('should filter case statistics by date range', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/cases/stats/overview?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('summary');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate required fields on case creation', async () => {
      const invalidCase = {
        description: 'Missing required fields'
        // Missing title, type, clientId
      };

      const response = await request(app)
        .post('/api/v1/cases')
        .send(invalidCase)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain(expect.objectContaining({
        field: expect.stringMatching(/title|type|clientId/)
      }));
    });

    it('should validate case type enum values', async () => {
      const invalidCase = {
        title: 'Test Case',
        type: 'INVALID_TYPE',
        clientId: clientId
      };

      const response = await request(app)
        .post('/api/v1/cases')
        .send(invalidCase)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate case priority enum values', async () => {
      const invalidCase = {
        title: 'Test Case',
        type: 'AUTO_ACCIDENT',
        priority: 'INVALID_PRIORITY',
        clientId: clientId
      };

      const response = await request(app)
        .post('/api/v1/cases')
        .send(invalidCase)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle non-existent case ID', async () => {
      const response = await request(app)
        .get('/api/v1/cases/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });

    it('should handle non-existent attorney in workload query', async () => {
      const response = await request(app)
        .get('/api/v1/cases/attorney/non-existent-attorney/workload')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });

    it('should validate deadline creation fields', async () => {
      const invalidDeadline = {
        // Missing required fields: title, dueDate, type
        description: 'Invalid deadline'
      };

      const response = await request(app)
        .post(`/api/v1/cases/${caseId}/deadlines`)
        .send(invalidDeadline)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate case value fields', async () => {
      const invalidValue = {
        valueType: 'INVALID_TYPE',
        amount: 'not-a-number'
      };

      const response = await request(app)
        .post(`/api/v1/cases/${caseId}/values`)
        .send(invalidValue)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Case Search and Advanced Features', () => {
    it('should search cases by case number', async () => {
      // First get the case number from our test case
      const caseResponse = await request(app)
        .get(`/api/v1/cases/${caseId}`);
      
      const caseNumber = caseResponse.body.data.caseNumber;

      const response = await request(app)
        .get(`/api/v1/cases?search=${caseNumber}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some(case_ => case_.caseNumber === caseNumber)).toBe(true);
    });

    it('should search cases by title', async () => {
      const response = await request(app)
        .get('/api/v1/cases?search=Personal Injury')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some(case_ => case_.title.includes('Personal Injury'))).toBe(true);
    });

    it('should sort cases by priority and creation date', async () => {
      const response = await request(app)
        .get('/api/v1/cases?sort=priority,-createdAt')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter cases by multiple criteria', async () => {
      const response = await request(app)
        .get('/api/v1/cases?type=AUTO_ACCIDENT&priority=CRITICAL&status=INVESTIGATION')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      if (response.body.data.length > 0) {
        expect(response.body.data.every(case_ => 
          case_.type === 'AUTO_ACCIDENT' && 
          case_.priority === 'CRITICAL' && 
          case_.status === 'INVESTIGATION'
        )).toBe(true);
      }
    });
  });
});