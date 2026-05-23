const request = require('supertest');
const express = require('express');

// Mock the authentication middleware before requiring routes
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      userId: 'test-user-id',
      email: 'test@example.com',
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

describe('Communication Management API', () => {
  let clientId = '';
  let caseId = '';
  let communicationId = '';
  
  const testClient = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '15551234567'
  };

  const testCommunication = {
    type: 'EMAIL',
    direction: 'OUTBOUND',
    subject: 'Case Status Update',
    content: 'Dear Mr. Doe, I wanted to provide you with an update on your case...',
    dateTime: new Date().toISOString(),
    priority: 'NORMAL',
    followUpRequired: true,
    followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    fromEmail: 'attorney@lawfirm.com',
    toEmails: ['john.doe@example.com'],
    billable: true,
    isConfidential: false
  };

  // Setup: Create a test client first
  beforeAll(async () => {
    const clientResponse = await request(app)
      .post('/api/v1/clients')
      .send(testClient);
    
    if (clientResponse.status === 201) {
      clientId = clientResponse.body.data.id;
      testCommunication.clientId = clientId;
    }
  });

  describe('Basic Communication CRUD', () => {
    it('should create a new communication record', async () => {
      const response = await request(app)
        .post('/api/v1/communications')
        .send(testCommunication)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('type', testCommunication.type);
      expect(response.body.data).toHaveProperty('direction', testCommunication.direction);
      expect(response.body.data).toHaveProperty('subject', testCommunication.subject);
      expect(response.body.data).toHaveProperty('followUpRequired', true);
      expect(response.body.data).toHaveProperty('userId', 'test-user-id');

      communicationId = response.body.data.id;
    });

    it('should retrieve communication by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/communications/${communicationId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', communicationId);
      expect(response.body.data).toHaveProperty('client');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should update communication', async () => {
      const updates = {
        subject: 'Updated Case Status',
        status: 'READ',
        summary: 'Client responded positively to case update'
      };

      const response = await request(app)
        .put(`/api/v1/communications/${communicationId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('subject', updates.subject);
      expect(response.body.data).toHaveProperty('status', updates.status);
      expect(response.body.data).toHaveProperty('summary', updates.summary);
    });

    it('should list communications with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/communications?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Communication History & Filtering', () => {
    it('should get client-specific communications', async () => {
      const response = await request(app)
        .get(`/api/v1/communications/client/${clientId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every(comm => comm.clientId === clientId)).toBe(true);
    });

    it('should filter communications by type', async () => {
      const response = await request(app)
        .get('/api/v1/communications?type=EMAIL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.every(comm => comm.type === 'EMAIL')).toBe(true);
    });

    it('should filter communications by follow-up required', async () => {
      const response = await request(app)
        .get('/api/v1/communications?followUpRequired=true')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.every(comm => comm.followUpRequired === true)).toBe(true);
    });

    it('should get follow-up communications', async () => {
      const response = await request(app)
        .get('/api/v1/communications/followup/pending')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Communication Actions', () => {
    it('should mark communication as read', async () => {
      const response = await request(app)
        .patch(`/api/v1/communications/${communicationId}/read`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'READ');
    });

    it('should generate AI summary', async () => {
      const response = await request(app)
        .post(`/api/v1/communications/${communicationId}/summary`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toBeTruthy();
    });
  });

  describe('Communication Statistics', () => {
    it('should get communication statistics overview', async () => {
      const response = await request(app)
        .get('/api/v1/communications/stats/overview')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('byDirection');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('followUpPending');
      expect(response.body.data).toHaveProperty('billableCount');
      expect(response.body.data).toHaveProperty('billablePercentage');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should get client-specific communication stats', async () => {
      const response = await request(app)
        .get(`/api/v1/communications/stats/overview?clientId=${clientId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total');
      expect(typeof response.body.data.total).toBe('number');
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update communication status', async () => {
      const response = await request(app)
        .patch('/api/v1/communications/bulk/status')
        .send({
          ids: [communicationId],
          status: 'DELIVERED'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('updatedCount', 1);
    });

    it('should validate bulk operation inputs', async () => {
      const response = await request(app)
        .patch('/api/v1/communications/bulk/status')
        .send({
          ids: [], // empty array
          status: 'INVALID_STATUS'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Validation & Error Handling', () => {
    it('should validate required communication fields', async () => {
      const invalidCommunication = {
        // missing required fields: type, direction, dateTime
        subject: 'Test subject'
      };

      const response = await request(app)
        .post('/api/v1/communications')
        .send(invalidCommunication)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate communication enum values', async () => {
      const invalidCommunication = {
        type: 'INVALID_TYPE',
        direction: 'INVALID_DIRECTION',
        dateTime: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/v1/communications')
        .send(invalidCommunication)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate date formats', async () => {
      const invalidCommunication = {
        type: 'EMAIL',
        direction: 'OUTBOUND',
        dateTime: 'invalid-date',
        followUpDate: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/v1/communications')
        .send(invalidCommunication)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle non-existent communication', async () => {
      const response = await request(app)
        .get('/api/v1/communications/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });

    it('should handle non-existent client in communication history', async () => {
      const response = await request(app)
        .get('/api/v1/communications/client/non-existent-client-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });
  });

  describe('Communication Types & Features', () => {
    it('should create phone call communication with duration', async () => {
      const phoneCall = {
        type: 'PHONE',
        direction: 'INBOUND',
        content: 'Client called regarding case status',
        dateTime: new Date().toISOString(),
        duration: 15, // 15 minutes
        fromPhone: '15551234567',
        toPhone: '15559876543',
        clientId,
        billable: true
      };

      const response = await request(app)
        .post('/api/v1/communications')
        .send(phoneCall)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('type', 'PHONE');
      expect(response.body.data).toHaveProperty('duration', 15);
      expect(response.body.data).toHaveProperty('fromPhone', phoneCall.fromPhone);
    });

    it('should create meeting communication', async () => {
      const meeting = {
        type: 'MEETING',
        direction: 'OUTBOUND',
        subject: 'Initial client consultation',
        content: 'Met with client to discuss case details and strategy',
        dateTime: new Date().toISOString(),
        duration: 60, // 1 hour
        clientId,
        priority: 'HIGH',
        billable: true,
        isConfidential: true
      };

      const response = await request(app)
        .post('/api/v1/communications')
        .send(meeting)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('type', 'MEETING');
      expect(response.body.data).toHaveProperty('isConfidential', true);
      expect(response.body.data).toHaveProperty('priority', 'HIGH');
    });
  });
});