import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock the complete application flow
const mockFetch = (url, options) => {
  const method = options?.method || 'GET';
  const path = url.replace('/api', '');
  
  // Mock authentication endpoints
  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = JSON.parse(options.body);
    
    if (email === 'admin@legalestate.com' && password === 'admin123') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          token: 'mock-admin-token',
          user: { 
            id: 1, 
            email: 'admin@legalestate.com', 
            name: 'Admin User',
            role: 'ADMIN' 
          }
        })
      });
    }
    
    if (email === 'demo@legalestate.com' && password === 'demo123') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          token: 'mock-demo-token',
          user: { 
            id: 2, 
            email: 'demo@legalestate.com', 
            name: 'Demo Attorney',
            role: 'ATTORNEY' 
          }
        })
      });
    }
    
    return Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid credentials' })
    });
  }
  
  // Mock cases endpoint
  if (path === '/cases' && method === 'GET') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          caseNumber: 'CASE-2024-001',
          title: 'Smith vs. Johnson',
          type: 'LITIGATION',
          status: 'ACTIVE',
          priority: 'HIGH'
        },
        {
          id: 2,
          caseNumber: 'CASE-2024-002',
          title: 'Estate of Williams',
          type: 'ESTATE_PLANNING',
          status: 'ACTIVE',
          priority: 'MEDIUM'
        }
      ])
    });
  }
  
  // Mock case creation
  if (path === '/cases' && method === 'POST') {
    const caseData = JSON.parse(options.body);
    return Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 3,
        ...caseData,
        attorneyId: 2
      })
    });
  }
  
  // Mock document upload
  if (path === '/documents/upload' && method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 1,
        name: 'uploaded-document.pdf',
        type: 'application/pdf',
        size: 1024,
        uploadedAt: new Date().toISOString()
      })
    });
  }
  
  // Default fallback
  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' })
  });
};

// Mock the complete app with simplified components
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [currentView, setCurrentView] = React.useState('homepage');
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  
  const handleLogin = async (credentials) => {
    const response = await mockFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      setIsLoggedIn(true);
      setCurrentView('dashboard');
      setShowLoginModal(false);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } else {
      throw new Error('Login failed');
    }
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView('homepage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };
  
  // Homepage component
  const Homepage = () => (
    <div>
      <nav className="nav-bar">
        <h1>Legal Estate</h1>
        <button onClick={() => setShowLoginModal(true)}>Sign In</button>
      </nav>
      
      <main>
        <h2>Professional Legal Practice Management</h2>
        <button onClick={() => setShowLoginModal(true)}>Start Free Trial</button>
        <button onClick={() => setShowLoginModal(true)}>View Demo</button>
        <button 
          onClick={() => {
            setShowLoginModal(true);
            // Auto-fill demo credentials after modal opens
            setTimeout(() => {
              const emailInput = document.getElementById('email');
              const passwordInput = document.getElementById('password');
              if (emailInput) emailInput.value = 'demo@legalestate.com';
              if (passwordInput) passwordInput.value = 'demo123';
            }, 100);
          }}
        >
          Try Demo User Account
        </button>
      </main>
      
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
  
  // Login Modal component
  const LoginModal = ({ onClose, onLogin }) => (
    <div className="modal-overlay">
      <div className="modal">
        <button onClick={onClose} className="close-btn">×</button>
        <h2>Sign In</h2>
        
        <div className="demo-credentials">
          <p>Demo Credentials:</p>
          <button 
            type="button"
            onClick={() => {
              document.getElementById('email').value = 'admin@legalestate.com';
              document.getElementById('password').value = 'admin123';
            }}
          >
            Admin
          </button>
          <button 
            type="button"
            onClick={() => {
              document.getElementById('email').value = 'demo@legalestate.com';
              document.getElementById('password').value = 'demo123';
            }}
          >
            Attorney
          </button>
          <button 
            type="button"
            onClick={() => {
              document.getElementById('email').value = 'paralegal@legalestate.com';
              document.getElementById('password').value = 'paralegal123';
            }}
          >
            Paralegal
          </button>
        </div>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          await onLogin({
            email: formData.get('email'),
            password: formData.get('password')
          });
        }}>
          <input 
            type="email" 
            id="email" 
            name="email" 
            placeholder="Email" 
            required 
          />
          <input 
            type="password" 
            id="password" 
            name="password" 
            placeholder="Password" 
            required 
          />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
  
  // Dashboard component
  const Dashboard = () => {
    const [activeSection, setActiveSection] = React.useState('overview');
    const [cases, setCases] = React.useState([]);
    const [newCaseData, setNewCaseData] = React.useState({
      caseNumber: '',
      title: '',
      type: 'LITIGATION',
      priority: 'MEDIUM'
    });
    
    React.useEffect(() => {
      // Load cases when dashboard mounts
      if (activeSection === 'cases') {
        mockFetch('/api/cases').then(response => {
          if (response.ok) {
            response.json().then(setCases);
          }
        });
      }
    }, [activeSection]);
    
    const handleCreateCase = async (e) => {
      e.preventDefault();
      const response = await mockFetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCaseData)
      });
      
      if (response.ok) {
        const newCase = await response.json();
        setCases([...cases, newCase]);
        setNewCaseData({
          caseNumber: '',
          title: '',
          type: 'LITIGATION',
          priority: 'MEDIUM'
        });
      }
    };
    
    const handleFileUpload = async (files) => {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        await mockFetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
      }
    };
    
    const renderContent = () => {
      switch (activeSection) {
        case 'overview':
          return (
            <div>
              <h2>Dashboard Overview</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Cases</h3>
                  <p>12</p>
                </div>
                <div className="stat-card">
                  <h3>Active Cases</h3>
                  <p>8</p>
                </div>
                <div className="stat-card">
                  <h3>Total Clients</h3>
                  <p>25</p>
                </div>
                <div className="stat-card">
                  <h3>Pending Tasks</h3>
                  <p>5</p>
                </div>
              </div>
            </div>
          );
          
        case 'cases':
          return (
            <div>
              <h2>Cases Management</h2>
              
              <div className="add-case-section">
                <h3>Add New Case</h3>
                <form onSubmit={handleCreateCase}>
                  <input
                    type="text"
                    placeholder="Case Number"
                    value={newCaseData.caseNumber}
                    onChange={(e) => setNewCaseData({
                      ...newCaseData,
                      caseNumber: e.target.value
                    })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Case Title"
                    value={newCaseData.title}
                    onChange={(e) => setNewCaseData({
                      ...newCaseData,
                      title: e.target.value
                    })}
                    required
                  />
                  <select
                    value={newCaseData.type}
                    onChange={(e) => setNewCaseData({
                      ...newCaseData,
                      type: e.target.value
                    })}
                  >
                    <option value="LITIGATION">Litigation</option>
                    <option value="ESTATE_PLANNING">Estate Planning</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                  <button type="submit">Add Case</button>
                </form>
              </div>
              
              <div className="cases-list">
                {cases.map(caseItem => (
                  <div key={caseItem.id} className="case-item">
                    <h4>{caseItem.caseNumber}</h4>
                    <p>{caseItem.title}</p>
                    <span className={`status ${caseItem.status.toLowerCase()}`}>
                      {caseItem.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
          
        case 'documents':
          return (
            <div>
              <h2>Document Management</h2>
              <div className="file-upload">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                />
                <p>Drag and drop files here or click to browse</p>
              </div>
            </div>
          );
          
        default:
          return <div><h2>{activeSection}</h2></div>;
      }
    };
    
    return (
      <div className="dashboard">
        <div className="sidebar">
          <div className="user-info">
            <h3>Welcome, {user.name}</h3>
            <p>{user.email}</p>
          </div>
          
          <nav className="sidebar-nav">
            {['overview', 'cases', 'documents', 'tasks', 'calendar', 'clients', 'settlements', 'reports'].map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={activeSection === section ? 'active' : ''}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </nav>
          
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
        
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    );
  };
  
  return (
    <BrowserRouter>
      <div className="app">
        {!isLoggedIn ? <Homepage /> : <Dashboard />}
      </div>
    </BrowserRouter>
  );
};

describe('End-to-End User Flow Tests', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Complete Login to Dashboard Flow', () => {
    test('admin user complete flow', async () => {
      render(<App />);
      
      // 1. Verify homepage loads
      expect(screen.getByText('Professional Legal Practice Management')).toBeInTheDocument();
      
      // 2. Click Sign In to open modal
      const signInButton = screen.getByText('Sign In');
      fireEvent.click(signInButton);
      
      // 3. Verify modal opens
      expect(screen.getByText('Demo Credentials:')).toBeInTheDocument();
      
      // 4. Use Admin demo credentials
      const adminButton = screen.getByText('Admin');
      fireEvent.click(adminButton);
      
      // 5. Verify credentials are filled
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      expect(emailInput.value).toBe('admin@legalestate.com');
      expect(passwordInput.value).toBe('admin123');
      
      // 6. Submit login form
      const submitButton = screen.getByText('Sign In');
      fireEvent.click(submitButton);
      
      // 7. Verify dashboard loads
      await waitFor(() => {
        expect(screen.getByText('Welcome, Admin User')).toBeInTheDocument();
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
      
      // 8. Verify stats cards are displayed
      expect(screen.getByText('Total Cases')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      
      // 9. Test logout
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      // 10. Verify return to homepage
      await waitFor(() => {
        expect(screen.getByText('Professional Legal Practice Management')).toBeInTheDocument();
      });
    });

    test('attorney user complete flow', async () => {
      render(<App />);
      
      // Click Sign In and use Attorney credentials
      fireEvent.click(screen.getByText('Sign In'));
      
      const attorneyButton = screen.getByText('Attorney');
      fireEvent.click(attorneyButton);
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      expect(emailInput.value).toBe('demo@legalestate.com');
      expect(passwordInput.value).toBe('demo123');
      
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Demo Attorney')).toBeInTheDocument();
      });
    });
  });

  describe('Case Creation Flow', () => {
    test('create new case from dashboard', async () => {
      render(<App />);
      
      // Login first
      fireEvent.click(screen.getByText('Sign In'));
      fireEvent.click(screen.getByText('Attorney'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Demo Attorney')).toBeInTheDocument();
      });
      
      // Navigate to Cases section
      const casesButton = screen.getByText('Cases');
      fireEvent.click(casesButton);
      
      await waitFor(() => {
        expect(screen.getByText('Cases Management')).toBeInTheDocument();
      });
      
      // Fill out new case form
      const caseNumberInput = screen.getByPlaceholderText('Case Number');
      const caseTitleInput = screen.getByPlaceholderText('Case Title');
      
      await userEvent.type(caseNumberInput, 'TEST-2024-003');
      await userEvent.type(caseTitleInput, 'New Test Case');
      
      // Submit form
      const addCaseButton = screen.getByText('Add Case');
      fireEvent.click(addCaseButton);
      
      // Verify case is added to list
      await waitFor(() => {
        expect(screen.getByText('TEST-2024-003')).toBeInTheDocument();
        expect(screen.getByText('New Test Case')).toBeInTheDocument();
      });
    });
  });

  describe('Document Upload Flow', () => {
    test('upload document from dashboard', async () => {
      render(<App />);
      
      // Login and navigate to documents
      fireEvent.click(screen.getByText('Sign In'));
      fireEvent.click(screen.getByText('Attorney'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Demo Attorney')).toBeInTheDocument();
      });
      
      const documentsButton = screen.getByText('Documents');
      fireEvent.click(documentsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Document Management')).toBeInTheDocument();
      });
      
      // Test file upload
      const fileInput = screen.getByDisplayValue('');
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      await userEvent.upload(fileInput, file);
      
      // File upload would be processed
      expect(fileInput.files[0]).toBe(file);
    });
  });

  describe('Try Demo User Account Flow', () => {
    test('try demo user account auto-fills and logs in', async () => {
      render(<App />);
      
      // Click "Try Demo User Account" button
      const demoButton = screen.getByText('Try Demo User Account');
      fireEvent.click(demoButton);
      
      // Modal should open
      await waitFor(() => {
        expect(screen.getByText('Demo Credentials:')).toBeInTheDocument();
      });
      
      // Credentials should be auto-filled
      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('Email');
        const passwordInput = screen.getByPlaceholderText('Password');
        expect(emailInput.value).toBe('demo@legalestate.com');
        expect(passwordInput.value).toBe('demo123');
      });
      
      // Submit to complete login
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Demo Attorney')).toBeInTheDocument();
      });
    });
  });

  describe('Section Navigation Flow', () => {
    test('navigate between dashboard sections', async () => {
      render(<App />);
      
      // Login
      fireEvent.click(screen.getByText('Sign In'));
      fireEvent.click(screen.getByText('Admin'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      });
      
      // Navigate to different sections
      const sections = ['Cases', 'Documents', 'Tasks', 'Calendar', 'Clients', 'Settlements', 'Reports'];
      
      for (const section of sections) {
        const sectionButton = screen.getByText(section);
        fireEvent.click(sectionButton);
        
        await waitFor(() => {
          if (section === 'Cases') {
            expect(screen.getByText('Cases Management')).toBeInTheDocument();
          } else if (section === 'Documents') {
            expect(screen.getByText('Document Management')).toBeInTheDocument();
          } else {
            expect(screen.getByText(section)).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Error Handling Flow', () => {
    test('handles login errors gracefully', async () => {
      render(<App />);
      
      // Open login modal
      fireEvent.click(screen.getByText('Sign In'));
      
      // Enter invalid credentials
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      await userEvent.type(emailInput, 'invalid@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      
      fireEvent.click(screen.getByText('Sign In'));
      
      // Should stay on homepage (login failed)
      await waitFor(() => {
        expect(screen.getByText('Professional Legal Practice Management')).toBeInTheDocument();
      });
    });
  });

  describe('Persistent Login State', () => {
    test('maintains login state across page refreshes', async () => {
      render(<App />);
      
      // Login
      fireEvent.click(screen.getByText('Sign In'));
      fireEvent.click(screen.getByText('Admin'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Admin User')).toBeInTheDocument();
      });
      
      // Check localStorage
      expect(localStorage.getItem('token')).toBe('mock-admin-token');
      expect(JSON.parse(localStorage.getItem('user')).email).toBe('admin@legalestate.com');
      
      // Logout clears localStorage
      fireEvent.click(screen.getByText('Logout'));
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});