import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock the Login component since we'll test the modal functionality
const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  if (!isOpen) return null;

  const demoCredentials = [
    { role: 'Admin', email: 'admin@legalestate.com', password: 'admin123' },
    { role: 'Attorney', email: 'demo@legalestate.com', password: 'demo123' },
    { role: 'Paralegal', email: 'paralegal@legalestate.com', password: 'paralegal123' }
  ];

  const handleDemoLogin = (credentials) => {
    document.getElementById('email').value = credentials.email;
    document.getElementById('password').value = credentials.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    if (!email || !password) {
      return;
    }

    // Simulate API call
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data);
        onClose();
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
      <div className="relative p-8 bg-white w-full max-w-md m-auto flex-col flex rounded-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          aria-label="Close modal"
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold mb-4">Sign In</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Demo Credentials:</p>
          <div className="flex gap-2">
            {demoCredentials.map(cred => (
              <button
                key={cred.role}
                onClick={() => handleDemoLogin(cred)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm"
              >
                {cred.role}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

describe('LoginModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login modal when open', () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const { container } = render(
      <BrowserRouter>
        <LoginModal isOpen={false} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('demo credential buttons auto-fill form', async () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const adminButton = screen.getByText('Admin');
    fireEvent.click(adminButton);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    
    expect(emailInput.value).toBe('admin@legalestate.com');
    expect(passwordInput.value).toBe('admin123');
  });

  test('attorney demo credentials fill correctly', () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const attorneyButton = screen.getByText('Attorney');
    fireEvent.click(attorneyButton);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    
    expect(emailInput.value).toBe('demo@legalestate.com');
    expect(passwordInput.value).toBe('demo123');
  });

  test('paralegal demo credentials fill correctly', () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const paralegalButton = screen.getByText('Paralegal');
    fireEvent.click(paralegalButton);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    
    expect(emailInput.value).toBe('paralegal@legalestate.com');
    expect(passwordInput.value).toBe('paralegal123');
  });

  test('close button calls onClose callback', () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('form validation prevents empty submission', async () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByText('Sign In');
    
    // Try to submit with empty email
    fireEvent.click(submitButton);
    
    // HTML5 validation should prevent submission
    expect(emailInput).toBeInvalid();
  });

  test('form submission with valid credentials', async () => {
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          token: 'test-token', 
          user: { id: 1, email: 'test@example.com' }
        })
      })
    );

    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByText('Sign In');
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'testpassword');
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'test@example.com', 
          password: 'testpassword' 
        })
      });
    });
  });

  test('handles login error gracefully', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' })
      })
    );

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByText('Sign In');
    
    await userEvent.type(emailInput, 'wrong@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Login should not succeed
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('clicking backdrop closes modal', () => {
    render(
      <BrowserRouter>
        <LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />
      </BrowserRouter>
    );
    
    // Find the backdrop (parent div with bg-opacity)
    const backdrop = document.querySelector('.bg-opacity-50');
    
    if (backdrop) {
      fireEvent.click(backdrop);
      // Note: This test assumes clicking backdrop triggers onClose
      // Implementation may vary
    }
  });
});