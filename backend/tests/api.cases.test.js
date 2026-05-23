const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Cases API Tests', () => {
  let authToken;
  let testUser;
  let testCase;
  let testClient;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'casetest@legalestate.com',
        password: hashedPassword,
        firstName: 'Case',
        lastName: 'Tester',
        role: 'ATTORNEY',
        isActive: true
      }
    });

    // Get auth token
    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test client
    testClient = await prisma.client.create({
      data: {
        firstName: 'Test',
        lastName: 'Client',
        email: 'testclient@example.com',
        phone: '555-0100',
        address: '123 Test St',
        userId: testUser.id
      }
    });

    // Create test case
    testCase = await prisma.case.create({
      data: {
        caseNumber: 'TEST-2024-001',
        title: 'Test Case',
        type: 'LITIGATION',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        description: 'Test case for API testing',
        attorneyId: testUser.id,
        clientId: testClient.id
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.case.deleteMany({
      where: { attorneyId: testUser.id }
    });
    await prisma.client.delete({
      where: { id: testClient.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/cases', () => {
    test('fetches all cases for authenticated user', async () => {
      const response = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const testCaseFound = response.body.find(c => c.id === testCase.id);
      expect(testCaseFound).toBeDefined();
      expect(testCaseFound.caseNumber).toBe('TEST-2024-001');
    });

    test('fails without authentication', async () => {
      const response = await request(app)
        .get('/api/cases')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('filters cases by status', async () => {
      const response = await request(app)
        .get('/api/cases?status=ACTIVE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(caseItem => {
        expect(caseItem.status).toBe('ACTIVE');
      });
    });

    test('filters cases by priority', async () => {
      const response = await request(app)
        .get('/api/cases?priority=MEDIUM')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const mediumPriorityCases = response.body.filter(c => c.priority === 'MEDIUM');
      expect(mediumPriorityCases.length).toBeGreaterThan(0);
    });

    test('paginates cases correctly', async () => {
      const response = await request(app)
        .get('/api/cases?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/cases/:id', () => {
    test('fetches specific case by ID', async () => {
      const response = await request(app)
        .get(`/api/cases/${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testCase.id);
      expect(response.body.caseNumber).toBe('TEST-2024-001');
      expect(response.body.title).toBe('Test Case');
    });

    test('returns 404 for non-existent case', async () => {
      const response = await request(app)
        .get('/api/cases/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('prevents access to other users cases', async () => {
      // Create another user and case
      const otherUser = await prisma.user.create({
        data: {
          email: 'otheruser@legalestate.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Other',
          lastName: 'User',
          role: 'ATTORNEY',
          isActive: true
        }
      });

      const otherCase = await prisma.case.create({
        data: {
          caseNumber: 'OTHER-2024-001',
          title: 'Other User Case',
          type: 'CONTRACT',
          status: 'ACTIVE',
          priority: 'LOW',
          attorneyId: otherUser.id
        }
      });

      const response = await request(app)
        .get(`/api/cases/${otherCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');

      // Clean up
      await prisma.case.delete({ where: { id: otherCase.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('POST /api/cases', () => {
    test('creates new case with valid data', async () => {
      const newCase = {
        caseNumber: 'TEST-2024-002',
        title: 'New Test Case',
        type: 'ESTATE_PLANNING',
        status: 'ACTIVE',
        priority: 'HIGH',
        description: 'A new test case',
        clientId: testClient.id
      };

      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCase)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.caseNumber).toBe('TEST-2024-002');
      expect(response.body.attorneyId).toBe(testUser.id);

      // Clean up
      await prisma.case.delete({ where: { id: response.body.id } });
    });

    test('fails with duplicate case number', async () => {
      const duplicateCase = {
        caseNumber: 'TEST-2024-001', // Already exists
        title: 'Duplicate Case',
        type: 'CONTRACT',
        status: 'ACTIVE',
        priority: 'LOW'
      };

      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateCase)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    test('validates required fields', async () => {
      const invalidCase = {
        // Missing required fields
        description: 'Invalid case'
      };

      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCase)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('validates case type enum', async () => {
      const invalidCase = {
        caseNumber: 'TEST-2024-003',
        title: 'Invalid Type Case',
        type: 'INVALID_TYPE', // Invalid enum value
        status: 'ACTIVE',
        priority: 'MEDIUM'
      };

      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCase)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/cases/:id', () => {
    test('updates case successfully', async () => {
      const updates = {
        title: 'Updated Test Case',
        priority: 'HIGH',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe('Updated Test Case');
      expect(response.body.priority).toBe('HIGH');
      expect(response.body.description).toBe('Updated description');

      // Restore original values
      await prisma.case.update({
        where: { id: testCase.id },
        data: {
          title: 'Test Case',
          priority: 'MEDIUM',
          description: 'Test case for API testing'
        }
      });
    });

    test('prevents updating case number', async () => {
      const updates = {
        caseNumber: 'CHANGED-2024-001'
      };

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Case number cannot be changed');
    });

    test('returns 404 for non-existent case', async () => {
      const response = await request(app)
        .put('/api/cases/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/cases/:id', () => {
    test('deletes case successfully', async () => {
      // Create a case to delete
      const caseToDelete = await prisma.case.create({
        data: {
          caseNumber: 'DELETE-2024-001',
          title: 'Case to Delete',
          type: 'CONTRACT',
          status: 'CLOSED',
          priority: 'LOW',
          attorneyId: testUser.id
        }
      });

      const response = await request(app)
        .delete(`/api/cases/${caseToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify case is deleted
      const deletedCase = await prisma.case.findUnique({
        where: { id: caseToDelete.id }
      });
      expect(deletedCase).toBeNull();
    });

    test('returns 404 for non-existent case', async () => {
      const response = await request(app)
        .delete('/api/cases/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('prevents deleting active cases', async () => {
      const response = await request(app)
        .delete(`/api/cases/${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Cannot delete active case');
    });
  });

  describe('Case Statistics', () => {
    test('gets case statistics', async () => {
      const response = await request(app)
        .get('/api/cases/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('closed');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byPriority');
    });
  });

  describe('Case Search', () => {
    test('searches cases by keyword', async () => {
      const response = await request(app)
        .get('/api/cases/search?q=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find(c => c.id === testCase.id);
      expect(found).toBeDefined();
    });

    test('searches with multiple filters', async () => {
      const response = await request(app)
        .get('/api/cases/search?q=Test&status=ACTIVE&type=LITIGATION')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(caseItem => {
        expect(caseItem.status).toBe('ACTIVE');
        expect(caseItem.type).toBe('LITIGATION');
      });
    });
  });
});