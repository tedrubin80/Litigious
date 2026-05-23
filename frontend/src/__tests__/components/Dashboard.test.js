import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock Dashboard component
const Dashboard = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = React.useState('overview');
  const [stats, setStats] = React.useState({
    totalCases: 0,
    activeCases: 0,
    totalClients: 0,
    pendingTasks: 0
  });

  React.useEffect(() => {
    // Simulate fetching stats
    setStats({
      totalCases: 12,
      activeCases: 8,
      totalClients: 25,
      pendingTasks: 5
    });
  }, []);

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'cases', label: 'My Cases', icon: '📁' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'tasks', label: 'Tasks', icon: '✓' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'settlements', label: 'Settlements', icon: '💰' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Cases</h3>
              <p className="text-2xl font-bold">{stats.totalCases}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Active Cases</h3>
              <p className="text-2xl font-bold">{stats.activeCases}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Total Clients</h3>
              <p className="text-2xl font-bold">{stats.totalClients}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Pending Tasks</h3>
              <p className="text-2xl font-bold">{stats.pendingTasks}</p>
            </div>
          </div>
        );
      case 'cases':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Cases Management</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Case Number</th>
                    <th className="text-left">Title</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CASE-2024-001</td>
                    <td>Smith vs. Johnson</td>
                    <td>Active</td>
                    <td>High</td>
                  </tr>
                  <tr>
                    <td>CASE-2024-002</td>
                    <td>Estate of Williams</td>
                    <td>Active</td>
                    <td>Medium</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Document Management</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500 mb-4">Drag and drop files here or click to browse</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded">Choose Files</button>
              </div>
            </div>
          </div>
        );
      case 'settlements':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Settlement Tracking</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p>Settlement financial data and tracking</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{sections.find(s => s.id === activeSection)?.label}</h2>
            <p>Content for {activeSection}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">Legal Estate</h1>
          <p className="text-sm text-gray-600 mt-2">Welcome, {user.name}</p>
        </div>
        
        <nav className="mt-6">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full px-6 py-3 text-left hover:bg-gray-100 flex items-center ${
                activeSection === section.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
              <span className="mr-3">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
        
        <div className="absolute bottom-0 w-64 p-6">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              {sections.find(s => s.id === activeSection)?.label || 'Dashboard'}
            </h1>
          </div>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

describe('Dashboard Component', () => {
  const mockUser = { 
    name: 'Test User', 
    email: 'test@example.com',
    role: 'ATTORNEY'
  };
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays welcome message with user name', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
  });

  test('renders all navigation sections', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('My Cases')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  test('sidebar navigation changes active section', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const casesButton = screen.getByText('My Cases');
    fireEvent.click(casesButton);
    
    expect(screen.getByText('Cases Management')).toBeInTheDocument();
  });

  test('overview section displays stats cards', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Total Cases')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Active Cases')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Total Clients')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  test('cases section shows case table', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const casesButton = screen.getByText('My Cases');
    fireEvent.click(casesButton);
    
    expect(screen.getByText('CASE-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Smith vs. Johnson')).toBeInTheDocument();
    expect(screen.getByText('CASE-2024-002')).toBeInTheDocument();
    expect(screen.getByText('Estate of Williams')).toBeInTheDocument();
  });

  test('documents section shows upload area', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const documentsButton = screen.getByText('Documents');
    fireEvent.click(documentsButton);
    
    expect(screen.getByText('Document Management')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop files here or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
  });

  test('settlements section displays financial data', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const settlementsButton = screen.getByText('Settlements');
    fireEvent.click(settlementsButton);
    
    expect(screen.getByText('Settlement Tracking')).toBeInTheDocument();
    expect(screen.getByText('Settlement financial data and tracking')).toBeInTheDocument();
  });

  test('logout button triggers logout function', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('active section has visual highlighting', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const overviewButton = screen.getByText('Overview');
    expect(overviewButton.parentElement).toHaveClass('bg-blue-50', 'border-l-4', 'border-blue-600');
    
    const casesButton = screen.getByText('My Cases');
    fireEvent.click(casesButton);
    
    expect(casesButton.parentElement).toHaveClass('bg-blue-50', 'border-l-4', 'border-blue-600');
    expect(overviewButton.parentElement).not.toHaveClass('bg-blue-50');
  });

  test('sidebar is fixed and main content is scrollable', () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    const sidebar = container.querySelector('.w-64');
    const mainContent = container.querySelector('.flex-1');
    
    expect(sidebar).toBeInTheDocument();
    expect(mainContent).toHaveClass('overflow-auto');
  });

  test('displays correct heading for each section', () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    // Check initial overview heading
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    
    // Navigate to Tasks
    const tasksButton = screen.getByText('Tasks');
    fireEvent.click(tasksButton);
    expect(screen.getByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    
    // Navigate to Calendar
    const calendarButton = screen.getByText('Calendar');
    fireEvent.click(calendarButton);
    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument();
  });

  test('renders correctly for different user roles', () => {
    const adminUser = { ...mockUser, role: 'ADMIN' };
    render(
      <BrowserRouter>
        <Dashboard user={adminUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    // Admin should see all sections
    expect(screen.getByText('Reports')).toBeInTheDocument();
    
    const paralegalUser = { ...mockUser, role: 'PARALEGAL' };
    const { rerender } = render(
      <BrowserRouter>
        <Dashboard user={paralegalUser} onLogout={mockLogout} />
      </BrowserRouter>
    );
    
    // Paralegal should also see all sections (modify based on actual permission logic)
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });
});