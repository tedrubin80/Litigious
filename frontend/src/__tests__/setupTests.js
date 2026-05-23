// Jest setup file for React testing
import '@testing-library/jest-dom';

// Mock console methods to avoid noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('deprecated') || args[0].includes('componentWillReceiveProps'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
global.scrollTo = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');

// Mock FileReader
global.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onload = null;
    this.onerror = null;
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:text/plain;base64,dGVzdA==';
      this.readyState = 2;
      if (this.onload) this.onload();
    }, 0);
  }
  
  readAsText() {
    setTimeout(() => {
      this.result = 'test content';
      this.readyState = 2;
      if (this.onload) this.onload();
    }, 0);
  }
  
  abort() {}
};

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// Clean up after each test
afterEach(() => {
  // Clear all localStorage mock calls
  localStorage.clear.mockClear();
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  localStorage.removeItem.mockClear();
  
  // Clear all sessionStorage mock calls
  sessionStorage.clear.mockClear();
  sessionStorage.getItem.mockClear();
  sessionStorage.setItem.mockClear();
  sessionStorage.removeItem.mockClear();
  
  // Clear fetch mock
  fetch.mockClear();
  
  // Clear scroll mock
  scrollTo.mockClear();
});

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Test utilities
global.testUtils = {
  // Helper to wait for async operations
  waitFor: (callback, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(check, 10);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(check, 10);
          }
        }
      };
      check();
    });
  },
  
  // Helper to create mock user data
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'ATTORNEY',
    isActive: true,
    ...overrides
  }),
  
  // Helper to create mock case data
  createMockCase: (overrides = {}) => ({
    id: 1,
    caseNumber: 'TEST-2024-001',
    title: 'Test Case',
    type: 'LITIGATION',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    description: 'Test case description',
    ...overrides
  }),
  
  // Helper to create mock document data
  createMockDocument: (overrides = {}) => ({
    id: 1,
    name: 'test-document.pdf',
    type: 'application/pdf',
    size: 1024,
    uploadedAt: new Date().toISOString(),
    ...overrides
  })
};

// Performance testing helpers
global.performanceUtils = {
  measureRenderTime: (renderFn) => {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    return {
      result,
      renderTime: endTime - startTime
    };
  },
  
  measureAsyncOperation: async (asyncFn) => {
    const startTime = performance.now();
    const result = await asyncFn();
    const endTime = performance.now();
    return {
      result,
      executionTime: endTime - startTime
    };
  }
};

// Error boundary for testing
global.TestErrorBoundary = class TestErrorBoundary extends Error {
  constructor(error, errorInfo) {
    super(error.message);
    this.name = 'TestErrorBoundary';
    this.originalError = error;
    this.errorInfo = errorInfo;
  }
};

// Mock environment variables for testing
process.env.REACT_APP_API_URL = 'http://localhost:5000/api';
process.env.REACT_APP_ENABLE_DEMO_MODE = 'true';

console.log('Jest setup complete - Legal Estate Frontend Testing Environment Ready');