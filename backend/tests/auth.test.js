const request = require('supertest');
const express = require('express');
const authEnhancedRoutes = require('../src/routes/auth-enhanced');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth-v2', authEnhancedRoutes);

// Import error handling
const { ErrorHandler } = require('../src/middleware/errorHandler');
app.use(ErrorHandler.globalErrorHandler());

describe('Authentication API', () => {
  let authToken = '';
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
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('role', testUser.role);
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
      expect(response.body.error.message).toContain('Password does not meet security requirements');
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth-v2/register')
        .send(testUser)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/auth-v2/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth-v2/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresAt');

      authToken = response.body.token;
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth-v2/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message', 'Invalid email or password');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth-v2/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message', 'Invalid email or password');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth-v2/login')
        .send({
          email: testUser.email
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset for existing user', async () => {
      const response = await request(app)
        .post('/api/auth-v2/forgot-password')
        .send({
          email: testUser.email
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link');
    });

    it('should handle password reset for non-existent user gracefully', async () => {
      const response = await request(app)
        .post('/api/auth-v2/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('If an account with this email exists');
    });

    it('should reject password reset with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth-v2/forgot-password')
        .send({
          email: 'invalid-email'
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

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      // Make multiple failed login attempts
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/auth-v2/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // Check that some requests are rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test
  });
});