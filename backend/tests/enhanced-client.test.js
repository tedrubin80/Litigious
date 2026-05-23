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

describe('Enhanced Client Management API', () => {
  let clientId = '';
  let emergencyContactId = '';
  
  const testClient = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '15551234567',
    mobile: '15559876543',
    workPhone: '15551111111',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    employer: 'Tech Corp',
    occupation: 'Software Engineer',
    maritalStatus: 'MARRIED',
    spouseName: 'Jane Doe',
    preferredContact: 'EMAIL'
  };

  const testEmergencyContact = {
    firstName: 'Jane',
    lastName: 'Doe',
    relationship: 'Spouse',
    phone: '15555555555',
    email: 'jane.doe@example.com',
    address: '123 Main Street',
    isPrimary: true
  };

  describe('Enhanced Client CRUD', () => {
    it('should create a client with enhanced fields', async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .send(testClient)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('clientNumber');
      expect(response.body.data).toHaveProperty('mobile', testClient.mobile);
      expect(response.body.data).toHaveProperty('workPhone', testClient.workPhone);
      expect(response.body.data).toHaveProperty('employer', testClient.employer);
      expect(response.body.data).toHaveProperty('occupation', testClient.occupation);
      expect(response.body.data).toHaveProperty('maritalStatus', testClient.maritalStatus);
      expect(response.body.data).toHaveProperty('spouseName', testClient.spouseName);
      expect(response.body.data).toHaveProperty('preferredContact', testClient.preferredContact);

      clientId = response.body.data.id;
    });

    it('should retrieve client with enhanced fields and relationships', async () => {
      const response = await request(app)
        .get(`/api/v1/clients/${clientId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('emergencyContacts');
      expect(response.body.data).toHaveProperty('cases');
      expect(response.body.data).toHaveProperty('_count');
      expect(Array.isArray(response.body.data.emergencyContacts)).toBe(true);
    });

    it('should update client with enhanced fields', async () => {
      const updates = {
        employer: 'New Tech Corp',
        occupation: 'Senior Engineer',
        maritalStatus: 'SINGLE'
      };

      const response = await request(app)
        .put(`/api/v1/clients/${clientId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('employer', updates.employer);
      expect(response.body.data).toHaveProperty('occupation', updates.occupation);
      expect(response.body.data).toHaveProperty('maritalStatus', updates.maritalStatus);
    });
  });

  describe('Emergency Contact Management', () => {
    it('should create an emergency contact', async () => {
      const response = await request(app)
        .post(`/api/v1/clients/${clientId}/emergency-contacts`)
        .send(testEmergencyContact)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('firstName', testEmergencyContact.firstName);
      expect(response.body.data).toHaveProperty('relationship', testEmergencyContact.relationship);
      expect(response.body.data).toHaveProperty('isPrimary', true);
      expect(response.body.data).toHaveProperty('clientId', clientId);

      emergencyContactId = response.body.data.id;
    });

    it('should retrieve all emergency contacts for a client', async () => {
      const response = await request(app)
        .get(`/api/v1/clients/${clientId}/emergency-contacts`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('firstName', testEmergencyContact.firstName);
      expect(response.body.data[0]).toHaveProperty('isPrimary', true);
    });

    it('should update an emergency contact', async () => {
      const updates = {
        relationship: 'Ex-Spouse',
        isPrimary: false
      };

      const response = await request(app)
        .put(`/api/v1/clients/${clientId}/emergency-contacts/${emergencyContactId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('relationship', updates.relationship);
      expect(response.body.data).toHaveProperty('isPrimary', updates.isPrimary);
    });

    it('should create a second emergency contact and make it primary', async () => {
      const secondContact = {
        firstName: 'Bob',
        lastName: 'Smith',
        relationship: 'Friend',
        phone: '15556666666',
        isPrimary: true
      };

      const response = await request(app)
        .post(`/api/v1/clients/${clientId}/emergency-contacts`)
        .send(secondContact)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isPrimary', true);

      // Verify the old primary contact is no longer primary
      const contactsResponse = await request(app)
        .get(`/api/v1/clients/${clientId}/emergency-contacts`)
        .expect(200);

      const primaryContacts = contactsResponse.body.data.filter(c => c.isPrimary);
      expect(primaryContacts).toHaveLength(1);
      expect(primaryContacts[0].firstName).toBe('Bob');
    });

    it('should delete an emergency contact', async () => {
      await request(app)
        .delete(`/api/v1/clients/${clientId}/emergency-contacts/${emergencyContactId}`)
        .expect(200);

      // Verify contact was deleted
      const response = await request(app)
        .get(`/api/v1/clients/${clientId}/emergency-contacts`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].firstName).toBe('Bob');
    });

    it('should handle non-existent emergency contact', async () => {
      const response = await request(app)
        .get('/api/v1/clients/non-existent-id/emergency-contacts')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
    });
  });

  describe('Enhanced Client Validation', () => {
    it('should validate enhanced client fields', async () => {
      const invalidClient = {
        firstName: 'Test',
        lastName: 'User',
        maritalStatus: 'INVALID_STATUS',
        preferredContact: 'INVALID_METHOD',
        zipCode: 'invalid',
        phone: 'not-a-phone'
      };

      const response = await request(app)
        .post('/api/v1/clients')
        .send(invalidClient)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate emergency contact fields', async () => {
      const invalidContact = {
        // missing required fields
        phone: 'invalid-phone',
        email: 'invalid-email'
      };

      const response = await request(app)
        .post(`/api/v1/clients/${clientId}/emergency-contacts`)
        .send(invalidContact)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Client Stats Integration', () => {
    it('should include emergency contacts in client relationships', async () => {
      const response = await request(app)
        .get(`/api/v1/clients/${clientId}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('emergencyContacts');
      expect(Array.isArray(response.body.data.emergencyContacts)).toBe(true);
      expect(response.body.data.emergencyContacts.length).toBeGreaterThan(0);
    });
  });
});