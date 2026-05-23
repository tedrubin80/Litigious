const request = require('supertest');
const express = require('express');
const authEnhancedRoutes = require('../src/routes/auth-enhanced');

// Create test app
const app = express();
app.use(express.json());

// Mock email service to avoid SMTP errors in tests
jest.mock('../src/services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEmailVerification: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
}));

app.use('/api/auth-v2', authEnhancedRoutes);

// Import error handling
const { ErrorHandler } = require('../src/middleware/errorHandler');
app.use(ErrorHandler.globalErrorHandler());

describe('Authentication API (Mocked)', () => {
  const testUser = {
    email: 'test.user@example.com',
    password: 'TestPass123@',
    name: 'Test User',
    role: 'ATTORNEY'
  };

  describe('POST /api/auth-v2/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send({
          ...testUser,
          email: 'another@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('POST /api/auth-v2/login', () => {
    it('should handle login validation', async () => {
      const response = await request(app)
        .post('/api/auth-v2/login')
        .send({
          email: 'test@example.com'
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send({
          ...testUser,
          email: 'not-an-email'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send({
          email: 'valid@example.com'
          // missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Response Format', () => {
    it('should have consistent error response format', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send({
          email: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode', 400);
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });
});