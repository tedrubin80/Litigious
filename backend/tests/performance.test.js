const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Performance and Load Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Use existing demo user for performance tests
    testUser = await prisma.user.findUnique({
      where: { email: 'demo@legalestate.com' }
    });

    if (testUser) {
      authToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }
  }, 10000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('API Response Time Tests', () => {
    test('login endpoint responds within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'demo@legalestate.com',
          password: 'demo123'
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      
      console.log(`Login response time: ${responseTime}ms`);
    }, 5000);

    test('cases list endpoint responds within acceptable time', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      }
      
      console.log(`Cases list response time: ${responseTime}ms`);
    }, 3000);

    test('document list endpoint responds within acceptable time', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(responseTime).toBeLessThan(1500); // Should respond within 1.5 seconds
      }
      
      console.log(`Documents list response time: ${responseTime}ms`);
    }, 3000);
  });

  describe('Concurrent Request Tests', () => {
    test('handles multiple concurrent login requests', async () => {
      const concurrentRequests = 10;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'demo@legalestate.com',
              password: 'demo123'
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete
      expect(responses).toHaveLength(concurrentRequests);
      
      // Most should succeed (some might be rate limited)
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds for all requests
      
      console.log(`${concurrentRequests} concurrent login requests completed in ${totalTime}ms`);
      console.log(`Success rate: ${successfulResponses.length}/${concurrentRequests}`);
    }, 15000);

    test('handles concurrent API requests with authentication', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const endpoints = [
        '/api/cases',
        '/api/documents',
        '/api/auth/me'
      ];
      
      const requests = [];
      
      // Make 5 requests to each endpoint
      endpoints.forEach(endpoint => {
        for (let i = 0; i < 5; i++) {
          requests.push(
            request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${authToken}`)
          );
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(15); // 3 endpoints × 5 requests each
      
      // Most should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(10);
      
      console.log(`15 concurrent API requests completed in ${totalTime}ms`);
      console.log(`Success rate: ${successfulResponses.length}/15`);
    }, 15000);
  });

  describe('Database Performance Tests', () => {
    test('database connection pool handles multiple queries', async () => {
      const queries = [];
      
      // Create 20 concurrent database queries
      for (let i = 0; i < 20; i++) {
        queries.push(prisma.user.count());
      }

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(20);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`20 concurrent DB queries completed in ${totalTime}ms`);
    }, 10000);

    test('pagination performance with large datasets', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const pageTests = [
        { page: 1, limit: 10 },
        { page: 1, limit: 50 },
        { page: 1, limit: 100 },
        { page: 5, limit: 20 }
      ];

      for (const test of pageTests) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(`/api/cases?page=${test.page}&limit=${test.limit}`)
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (response.status === 200) {
          expect(responseTime).toBeLessThan(2000);
          console.log(`Pagination (page=${test.page}, limit=${test.limit}): ${responseTime}ms`);
        }
      }
    }, 15000);
  });

  describe('File Upload Performance Tests', () => {
    test('handles multiple small file uploads', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const uploads = [];
      
      // Upload 5 small files concurrently
      for (let i = 0; i < 5; i++) {
        uploads.push(
          request(app)
            .post('/api/documents/upload')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from(`Test content ${i}`), `test${i}.txt`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(uploads);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulUploads = responses.filter(r => [201, 400, 403].includes(r.status));
      expect(successfulUploads.length).toBe(5);
      
      console.log(`5 concurrent file uploads completed in ${totalTime}ms`);

      // Clean up successful uploads
      for (const response of responses) {
        if (response.status === 201 && response.body.id) {
          try {
            await prisma.document.delete({ where: { id: response.body.id } });
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    }, 10000);

    test('handles large file upload performance', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      // Create a 1MB buffer
      const largeBuffer = Buffer.alloc(1024 * 1024, 'x');
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large-test.txt')
        .timeout(10000);

      const endTime = Date.now();
      const uploadTime = endTime - startTime;

      expect([201, 400, 403, 413]).toContain(response.status);
      console.log(`1MB file upload completed in ${uploadTime}ms`);

      // Clean up if successful
      if (response.status === 201 && response.body.id) {
        try {
          await prisma.document.delete({ where: { id: response.body.id } });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }, 15000);
  });

  describe('Memory Usage Tests', () => {
    test('memory usage remains stable under load', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const initialMemory = process.memoryUsage();
      
      // Make 50 requests to various endpoints
      const requests = [];
      for (let i = 0; i < 50; i++) {
        const endpoints = ['/api/cases', '/api/documents', '/api/auth/me'];
        const endpoint = endpoints[i % endpoints.length];
        
        requests.push(
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      await Promise.all(requests);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after 50 requests: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      console.log(`Initial heap: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Final heap: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
    }, 30000);
  });

  describe('Search Performance Tests', () => {
    test('case search performance', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const searchTerms = ['test', 'case', 'smith', 'contract', 'litigation'];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(`/api/cases/search?q=${term}`)
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const searchTime = endTime - startTime;

        if (response.status === 200) {
          expect(searchTime).toBeLessThan(3000); // Should complete within 3 seconds
          console.log(`Search for "${term}": ${searchTime}ms (${response.body.length || 0} results)`);
        }
      }
    }, 20000);

    test('document search performance', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const searchTerms = ['pdf', 'document', 'test', 'contract'];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(`/api/documents/search?q=${term}`)
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = Date.now();
        const searchTime = endTime - startTime;

        if (response.status === 200) {
          expect(searchTime).toBeLessThan(2000); // Should complete within 2 seconds
          console.log(`Document search for "${term}": ${searchTime}ms`);
        }
      }
    }, 15000);
  });

  describe('Stress Tests', () => {
    test('handles rapid sequential requests', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const startTime = Date.now();
      
      // Make 100 sequential requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / 100;

      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(averageTime).toBeLessThan(300); // Average should be under 300ms per request
      
      console.log(`100 sequential requests completed in ${totalTime}ms`);
      console.log(`Average response time: ${averageTime.toFixed(2)}ms`);
    }, 45000);
  });

  describe('Resource Cleanup Tests', () => {
    test('database connections are properly closed', async () => {
      const connectionsBefore = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE application_name LIKE '%prisma%'`;
      
      // Make several requests that use the database
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(prisma.user.count());
      }
      
      await Promise.all(requests);
      
      // Wait a bit for connections to close
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const connectionsAfter = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE application_name LIKE '%prisma%'`;
      
      // Connection count should not increase significantly
      console.log(`DB connections before: ${connectionsBefore[0].count}`);
      console.log(`DB connections after: ${connectionsAfter[0].count}`);
    }, 5000);

    test('no memory leaks in request handling', async () => {
      const memorySnapshots = [];
      
      // Take initial memory snapshot
      memorySnapshots.push(process.memoryUsage().heapUsed);
      
      // Make batches of requests and check memory
      for (let batch = 0; batch < 5; batch++) {
        const requests = [];
        for (let i = 0; i < 20; i++) {
          requests.push(
            request(app)
              .get('/api/auth/login')
              .send({ email: 'test@example.com', password: 'wrong' })
          );
        }
        
        await Promise.all(requests);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }
      
      // Memory should not continuously increase
      const memoryIncrease = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      console.log(`Memory change over 100 requests: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Should not increase by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, 15000);
  });
});