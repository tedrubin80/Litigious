const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

describe('Documents API Tests', () => {
  let authToken;
  let testUser;
  let testCase;
  let testDocument;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'doctest@legalestate.com',
        password: hashedPassword,
        firstName: 'Doc',
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

    // Create test case
    testCase = await prisma.case.create({
      data: {
        caseNumber: 'DOC-2024-001',
        title: 'Document Test Case',
        type: 'LITIGATION',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        attorneyId: testUser.id
      }
    });

    // Create test document
    testDocument = await prisma.document.create({
      data: {
        name: 'test-document.pdf',
        type: 'application/pdf',
        size: 1024,
        path: '/uploads/test-document.pdf',
        caseId: testCase.id,
        uploadedById: testUser.id
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.document.deleteMany({
      where: { uploadedById: testUser.id }
    });
    await prisma.case.delete({
      where: { id: testCase.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/documents/upload', () => {
    test('uploads single file successfully', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', testCase.id)
        .attach('file', Buffer.from('test file content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('test.pdf');
      expect(response.body.type).toBe('application/pdf');
      expect(response.body.caseId).toBe(testCase.id);

      // Clean up
      await prisma.document.delete({ where: { id: response.body.id } });
    });

    test('uploads multiple files', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', testCase.id)
        .attach('files', Buffer.from('file1'), 'file1.pdf')
        .attach('files', Buffer.from('file2'), 'file2.pdf')
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      // Clean up
      for (const doc of response.body) {
        await prisma.document.delete({ where: { id: doc.id } });
      }
    });

    test('rejects files exceeding size limit', async () => {
      // Create a large buffer (11MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', testCase.id)
        .attach('file', largeBuffer, {
          filename: 'large.pdf',
          contentType: 'application/pdf'
        })
        .expect(413);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File too large');
    });

    test('rejects unsupported file types', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', testCase.id)
        .attach('file', Buffer.from('executable'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File type not allowed');
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .field('caseId', testCase.id)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('validates case ownership', async () => {
      // Create another user and case
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@legalestate.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Other',
          lastName: 'User',
          role: 'ATTORNEY',
          isActive: true
        }
      });

      const otherCase = await prisma.case.create({
        data: {
          caseNumber: 'OTHER-DOC-001',
          title: 'Other Case',
          type: 'CONTRACT',
          status: 'ACTIVE',
          priority: 'LOW',
          attorneyId: otherUser.id
        }
      });

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('caseId', otherCase.id)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(403);

      expect(response.body).toHaveProperty('error');

      // Clean up
      await prisma.case.delete({ where: { id: otherCase.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('GET /api/documents', () => {
    test('fetches all documents for user', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find(d => d.id === testDocument.id);
      expect(found).toBeDefined();
    });

    test('filters documents by case', async () => {
      const response = await request(app)
        .get(`/api/documents?caseId=${testCase.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(doc => {
        expect(doc.caseId).toBe(testCase.id);
      });
    });

    test('filters documents by type', async () => {
      const response = await request(app)
        .get('/api/documents?type=application/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(doc => {
        expect(doc.type).toBe('application/pdf');
      });
    });

    test('paginates documents', async () => {
      const response = await request(app)
        .get('/api/documents?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/documents/:id', () => {
    test('fetches specific document', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testDocument.id);
      expect(response.body.name).toBe('test-document.pdf');
    });

    test('returns 404 for non-existent document', async () => {
      const response = await request(app)
        .get('/api/documents/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('prevents access to other users documents', async () => {
      // Create another user's document
      const otherUser = await prisma.user.create({
        data: {
          email: 'docother@legalestate.com',
          password: await bcrypt.hash('password123', 10),
          firstName: 'Doc',
          lastName: 'Other',
          role: 'ATTORNEY',
          isActive: true
        }
      });

      const otherDoc = await prisma.document.create({
        data: {
          name: 'other-doc.pdf',
          type: 'application/pdf',
          size: 500,
          path: '/uploads/other-doc.pdf',
          uploadedById: otherUser.id
        }
      });

      const response = await request(app)
        .get(`/api/documents/${otherDoc.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');

      // Clean up
      await prisma.document.delete({ where: { id: otherDoc.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('GET /api/documents/:id/download', () => {
    test('downloads document file', async () => {
      // Create a real test file
      const testFilePath = path.join(__dirname, '../uploads/download-test.pdf');
      fs.writeFileSync(testFilePath, 'Test PDF content');

      const downloadDoc = await prisma.document.create({
        data: {
          name: 'download-test.pdf',
          type: 'application/pdf',
          size: 16,
          path: testFilePath,
          uploadedById: testUser.id
        }
      });

      const response = await request(app)
        .get(`/api/documents/${downloadDoc.id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('download-test.pdf');

      // Clean up
      await prisma.document.delete({ where: { id: downloadDoc.id } });
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    test('returns 404 if file not found on disk', async () => {
      const missingDoc = await prisma.document.create({
        data: {
          name: 'missing.pdf',
          type: 'application/pdf',
          size: 100,
          path: '/uploads/non-existent.pdf',
          uploadedById: testUser.id
        }
      });

      const response = await request(app)
        .get(`/api/documents/${missingDoc.id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File not found');

      // Clean up
      await prisma.document.delete({ where: { id: missingDoc.id } });
    });
  });

  describe('PUT /api/documents/:id', () => {
    test('updates document metadata', async () => {
      const updates = {
        name: 'updated-document.pdf',
        tags: ['important', 'contract']
      };

      const response = await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe('updated-document.pdf');
      expect(response.body.tags).toEqual(['important', 'contract']);

      // Restore original
      await prisma.document.update({
        where: { id: testDocument.id },
        data: { name: 'test-document.pdf', tags: [] }
      });
    });

    test('cannot change document file path', async () => {
      const response = await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ path: '/malicious/path.pdf' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    test('deletes document successfully', async () => {
      const docToDelete = await prisma.document.create({
        data: {
          name: 'delete-me.pdf',
          type: 'application/pdf',
          size: 100,
          path: '/uploads/delete-me.pdf',
          uploadedById: testUser.id
        }
      });

      const response = await request(app)
        .delete(`/api/documents/${docToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify document is deleted
      const deleted = await prisma.document.findUnique({
        where: { id: docToDelete.id }
      });
      expect(deleted).toBeNull();
    });

    test('returns 404 for non-existent document', async () => {
      const response = await request(app)
        .delete('/api/documents/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Document Search', () => {
    test('searches documents by name', async () => {
      const response = await request(app)
        .get('/api/documents/search?q=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find(d => d.id === testDocument.id);
      expect(found).toBeDefined();
    });

    test('searches with date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const response = await request(app)
        .get(`/api/documents/search?from=${startDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('File Type Validation', () => {
    const testFiles = [
      { name: 'valid.pdf', type: 'application/pdf', valid: true },
      { name: 'valid.doc', type: 'application/msword', valid: true },
      { name: 'valid.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', valid: true },
      { name: 'valid.jpg', type: 'image/jpeg', valid: true },
      { name: 'valid.png', type: 'image/png', valid: true },
      { name: 'invalid.exe', type: 'application/x-msdownload', valid: false },
      { name: 'invalid.bat', type: 'application/x-bat', valid: false },
      { name: 'invalid.sh', type: 'application/x-sh', valid: false }
    ];

    testFiles.forEach(file => {
      test(`${file.valid ? 'accepts' : 'rejects'} ${file.type}`, async () => {
        const response = await request(app)
          .post('/api/documents/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('caseId', testCase.id)
          .attach('file', Buffer.from('test'), {
            filename: file.name,
            contentType: file.type
          })
          .expect(file.valid ? 201 : 400);

        if (file.valid) {
          expect(response.body).toHaveProperty('id');
          // Clean up
          await prisma.document.delete({ where: { id: response.body.id } });
        } else {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain('not allowed');
        }
      });
    });
  });
});