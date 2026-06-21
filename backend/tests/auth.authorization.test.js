const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../src/middleware/auth');
const { userCanAccessDocument } = require('../src/lib/documentAccess');

jest.mock('../src/lib/documentAccess', () => ({
  userCanAccessDocument: jest.fn()
}));

jest.mock('../src/lib/prisma', () => ({
  case: {
    findFirst: jest.fn()
  },
  document: {
    findUnique: jest.fn()
  }
}));

const prisma = require('../src/lib/prisma');

describe('authorization helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('userCanAccessDocument denies unrelated paralegal', async () => {
    userCanAccessDocument.mockResolvedValue(false);

    const allowed = await userCanAccessDocument(
      { id: 'user-1', role: 'PARALEGAL' },
      { id: 10, uploadedBy: 'user-2', caseId: 5 }
    );

    expect(allowed).toBe(false);
  });

  test('userCanAccessDocument allows admin', async () => {
    userCanAccessDocument.mockResolvedValue(true);

    const allowed = await userCanAccessDocument(
      { id: 'admin-1', role: 'ADMIN' },
      { id: 10, uploadedBy: 'user-2', caseId: 5 }
    );

    expect(allowed).toBe(true);
  });
});

describe('JWT auth middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-with-enough-length';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  test('rejects requests without a token', () => {
    const req = { headers: {}, cookies: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid bearer token', () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'staff@example.com', role: 'ATTORNEY' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {}
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe('user-1');
  });
});
