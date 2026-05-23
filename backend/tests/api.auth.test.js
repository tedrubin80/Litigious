const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Authentication API Tests', () => {
  let testUser;
  
  beforeAll(async () => {
    // Create a test user for authentication tests
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'apitest@legalestate.com',
        password: hashedPassword,
        firstName: 'API',
        lastName: 'Test',
        role: 'ATTORNEY',
        isActive: true
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    test('successful login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'apitest@legalestate.com',
          password: 'testpassword123'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('apitest@legalestate.com');
      expect(response.body.user).not.toHaveProperty('password');
      
      // Verify JWT token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
    });

    test('login fails with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'testpassword123'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('login fails with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'apitest@legalestate.com',
          password: 'wrongpassword'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('login fails with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'testpassword123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('login fails with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'apitest@legalestate.com'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('login fails for inactive user', async () => {
      // Create inactive user
      const hashedPassword = await bcrypt.hash('inactive123', 10);
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive@legalestate.com',
          password: hashedPassword,
          firstName: 'Inactive',
          lastName: 'User',
          role: 'ATTORNEY',
          isActive: false
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@legalestate.com',
          password: 'inactive123'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Account is inactive');

      // Clean up
      await prisma.user.delete({ where: { id: inactiveUser.id } });
    });

    test('demo user login - admin', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@legalestate.com',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('ADMIN');
    });

    test('demo user login - attorney', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'demo@legalestate.com',
          password: 'demo123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('ATTORNEY');
    });

    test('demo user login - paralegal', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'paralegal@legalestate.com',
          password: 'paralegal123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('PARALEGAL');
    });
  });

  describe('POST /api/auth/register', () => {
    test('successful registration with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@legalestate.com',
          password: 'securepassword123',
          firstName: 'New',
          lastName: 'User',
          role: 'ATTORNEY'
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@legalestate.com');

      // Clean up
      await prisma.user.delete({ 
        where: { email: 'newuser@legalestate.com' } 
      });
    });

    test('registration fails with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'apitest@legalestate.com', // Already exists
          password: 'newpassword123',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'ATTORNEY'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    test('registration fails with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalidemail',
          password: 'password123',
          firstName: 'Invalid',
          lastName: 'Email',
          role: 'ATTORNEY'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('registration fails with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weakpass@legalestate.com',
          password: '123', // Too short
          firstName: 'Weak',
          lastName: 'Password',
          role: 'ATTORNEY'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });
  });

  describe('Protected Routes', () => {
    let authToken;

    beforeAll(async () => {
      // Get auth token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'apitest@legalestate.com',
          password: 'testpassword123'
        });
      authToken = response.body.token;
    });

    test('protected route succeeds with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('apitest@legalestate.com');
    });

    test('protected route fails without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No token provided');
    });

    test('protected route fails with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    test('protected route fails with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Rate Limiting', () => {
    test('rate limits excessive login attempts', async () => {
      const requests = [];
      
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'ratelimit@test.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('prevents SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "' OR '1'='1' --",
          password: "' OR '1'='1' --"
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).not.toHaveProperty('user');
    });
  });

  describe('XSS Prevention', () => {
    test('sanitizes user input to prevent XSS', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'xsstest@legalestate.com',
          password: 'secure123',
          firstName: '<script>alert("XSS")</script>',
          lastName: 'Test',
          role: 'ATTORNEY'
        })
        .expect(201);

      expect(response.body.user.firstName).not.toContain('<script>');
      
      // Clean up
      await prisma.user.delete({ 
        where: { email: 'xsstest@legalestate.com' } 
      });
    });
  });
});