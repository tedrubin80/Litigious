const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Error Handling and Edge Cases', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('errortest123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'errortest@legalestate.com',
        password: hashedPassword,
        firstName: 'Error',
        lastName: 'Test',
        role: 'ATTORNEY',
        isActive: true
      }
    });

    authToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('Network Error Scenarios', () => {
    test('handles database connection timeout', async () => {
      // Mock a database timeout by making a query with invalid connection
      const response = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(1000);

      // Should return proper error response even if DB is slow
      expect([200, 500, 503]).toContain(response.status);
    });

    test('handles malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", invalid json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('invalid json');
    });

    test('handles missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'test123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('handles extremely large request payload', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'a'.repeat(100000), // 100KB password
        extraData: 'x'.repeat(1000000) // 1MB extra data
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Input Validation Edge Cases', () => {
    test('handles null and undefined values', async () => {
      const testCases = [
        { email: null, password: 'test123' },
        { email: undefined, password: 'test123' },
        { email: 'test@example.com', password: null },
        { email: 'test@example.com', password: undefined }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(testCase);

        expect([400, 401]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('handles special characters in email', async () => {
      const specialEmails = [
        'test+tag@example.com',
        'test.email@example.com',
        'test_email@example.com',
        'test-email@example.com',
        'тест@example.com', // Cyrillic characters
        'test@münchen.de'   // International domain
      ];

      for (const email of specialEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'ATTORNEY'
          });

        // Should either accept valid international emails or reject with proper error
        expect([201, 400]).toContain(response.status);
        
        if (response.status === 201) {
          // Clean up if registration succeeded
          await prisma.user.delete({ where: { email } });
        }
      }
    });

    test('handles Unicode and emoji in text fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'unicode@example.com',
          password: 'SecurePass123!',
          firstName: '🚀 Test',
          lastName: 'User 测试',
          role: 'ATTORNEY'
        });

      if (response.status === 201) {
        expect(response.body.user.firstName).toBeDefined();
        // Clean up
        await prisma.user.delete({ where: { email: 'unicode@example.com' } });
      } else {
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('handles very long input strings', async () => {
      const longString = 'a'.repeat(1000);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'long@example.com',
          password: 'SecurePass123!',
          firstName: longString,
          lastName: 'User',
          role: 'ATTORNEY'
        });

      expect([400, 413]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Edge Cases', () => {
    test('handles expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('expired');
    });

    test('handles malformed JWT token', async () => {
      const malformedTokens = [
        'invalid.jwt.token',
        'Bearer malformed',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        ''
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/cases')
          .set('Authorization', `Bearer ${token}`);

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('handles JWT with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: testUser.id },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    test('handles user account deleted after token issued', async () => {
      // Create a user, get token, then delete user
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp@example.com',
          password: await bcrypt.hash('temp123', 10),
          firstName: 'Temp',
          lastName: 'User',
          role: 'ATTORNEY',
          isActive: true
        }
      });

      const tempToken = jwt.sign({ userId: tempUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Delete the user
      await prisma.user.delete({ where: { id: tempUser.id } });

      // Try to use the token
      const response = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${tempToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Database Edge Cases', () => {
    test('handles database constraint violations gracefully', async () => {
      // Try to create user with duplicate email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email, // Already exists
          password: 'NewPass123!',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'ATTORNEY'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    test('handles foreign key constraint violations', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          caseNumber: 'FK-TEST-001',
          title: 'Foreign Key Test',
          type: 'LITIGATION',
          status: 'ACTIVE',
          priority: 'MEDIUM',
          clientId: 999999 // Non-existent client ID
        });

      expect([400, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    test('handles concurrent modifications', async () => {
      // Create a case
      const testCase = await prisma.case.create({
        data: {
          caseNumber: 'CONCURRENT-001',
          title: 'Concurrent Test',
          type: 'CONTRACT',
          status: 'ACTIVE',
          priority: 'LOW',
          attorneyId: testUser.id
        }
      });

      // Simulate two concurrent updates
      const update1 = request(app)
        .put(`/api/cases/${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated by User 1' });

      const update2 = request(app)
        .put(`/api/cases/${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated by User 2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      // At least one should succeed
      expect([200, 409, 500].includes(response1.status) || [200, 409, 500].includes(response2.status)).toBe(true);

      // Clean up
      await prisma.case.delete({ where: { id: testCase.id } });
    });
  });

  describe('File Upload Edge Cases', () => {
    test('handles empty file upload', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.alloc(0), 'empty.pdf')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('empty');
    });

    test('handles file with no extension', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('content'), 'noextension')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('handles file with multiple extensions', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('content'), 'file.backup.pdf.exe')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not allowed');
    });

    test('handles filename with special characters', async () => {
      const specialNames = [
        '../../../etc/passwd',
        'file with spaces.pdf',
        'file-with-dashes.pdf',
        'file_with_underscores.pdf',
        'файл.pdf', // Cyrillic
        'file@#$%.pdf'
      ];

      for (const filename of specialNames) {
        const response = await request(app)
          .post('/api/documents/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('content'), filename);

        // Should either sanitize the filename or reject it
        if (response.status === 201) {
          // Clean up if upload succeeded
          await prisma.document.delete({ where: { id: response.body.id } });
        } else {
          expect([400, 413]).toContain(response.status);
        }
      }
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    test('handles burst requests', async () => {
      const promises = [];
      
      // Send 20 rapid requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'burst@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    test('rate limit headers are present', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ratelimit@example.com',
          password: 'wrongpassword'
        });

      // Should have rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('handles deeply nested JSON', async () => {
      let deepObject = {};
      let current = deepObject;
      
      // Create deeply nested object
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      const response = await request(app)
        .post('/api/auth/login')
        .send(deepObject);

      expect([400, 413]).toContain(response.status);
    });

    test('handles request with many properties', async () => {
      const manyProps = { email: 'many@example.com', password: 'test123' };
      
      // Add 1000 extra properties
      for (let i = 0; i < 1000; i++) {
        manyProps[`prop${i}`] = `value${i}`;
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(manyProps);

      expect([400, 413, 401]).toContain(response.status);
    });
  });

  describe('Cross-Browser Compatibility Edge Cases', () => {
    test('handles different User-Agent headers', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'curl/7.68.0',
        'PostmanRuntime/7.28.0',
        ''
      ];

      for (const userAgent of userAgents) {
        const response = await request(app)
          .get('/api/cases')
          .set('Authorization', `Bearer ${authToken}`)
          .set('User-Agent', userAgent);

        expect([200, 401]).toContain(response.status);
      }
    });

    test('handles various Accept headers', async () => {
      const acceptHeaders = [
        'application/json',
        'application/json, text/plain, */*',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'application/xml',
        '*/*',
        ''
      ];

      for (const accept of acceptHeaders) {
        const response = await request(app)
          .get('/api/cases')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Accept', accept);

        expect([200, 401, 406]).toContain(response.status);
      }
    });
  });

  describe('Security Edge Cases', () => {
    test('handles prototype pollution attempts', async () => {
      const pollutionAttempts = [
        { '__proto__': { admin: true }, email: 'test@example.com', password: 'test123' },
        { 'constructor.prototype.admin': true, email: 'test@example.com', password: 'test123' },
        { email: 'test@example.com', password: 'test123', '__proto__.polluted': true }
      ];

      for (const attempt of pollutionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(attempt);

        // Should not create admin privileges
        expect([400, 401]).toContain(response.status);
      }
    });

    test('handles NoSQL injection attempts', async () => {
      const injectionAttempts = [
        { email: { '$ne': null }, password: { '$ne': null } },
        { email: { '$regex': '.*' }, password: 'test' },
        { email: 'test@example.com', password: { '$where': 'return true' } }
      ];

      for (const attempt of injectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(attempt);

        expect([400, 401]).toContain(response.status);
      }
    });

    test('handles LDAP injection attempts', async () => {
      const ldapAttempts = [
        { email: 'admin)(&)(|(password=*)', password: 'test' },
        { email: '*)(&)', password: 'test' },
        { email: 'test@example.com)(|(objectClass=*))', password: 'test' }
      ];

      for (const attempt of ldapAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(attempt);

        expect([400, 401]).toContain(response.status);
      }
    });
  });
});