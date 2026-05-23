const { execSync } = require('child_process');

// Mock email service globally
jest.mock('../src/services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEmailVerification: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Reset test database
  try {
    execSync('npx prisma db push --force-reset --skip-generate', { stdio: 'inherit' });
    console.log('Test database reset successfully');
  } catch (error) {
    console.error('Failed to reset test database:', error.message);
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up after tests
  console.log('Test cleanup completed');
});