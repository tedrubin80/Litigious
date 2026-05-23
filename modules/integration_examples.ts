// ============================================================================
// FRONTEND API CLIENT CONFIGURATION
// ============================================================================

// frontend/src/lib/api.ts
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{
      access_token: string;
      user: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.access_token);
    return response;
  }

  async logout() {
    this.clearToken();
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  // Clients
  async getClients(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request<{
      data: any[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/clients?${searchParams}`);
  }

  async getClient(id: string) {
    return this.request<any>(`/clients/${id}`);
  }

  async getClientDetailed(id: string) {
    return this.request<any>(`/clients/${id}/detailed`);
  }

  async updateClient(id: string, data: any) {
    return this.request<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Cases
  async getCases(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    caseType?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request<{
      data: any[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/cases?${searchParams}`);
  }

  async getCase(id: string) {
    return this.request<any>(`/cases/${id}`);
  }

  async getCaseOverview(id: string) {
    return this.request<any>(`/cases/${id}/overview`);
  }

  // Medical Information
  async getMedicalProviders(caseId: string) {
    return this.request<any[]>(`/medical/cases/${caseId}/providers`);
  }

  async getMedicalRecords(caseId: string, params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any[]>(`/medical/cases/${caseId}/records?${searchParams}`);
  }

  async getInjuries(caseId: string) {
    return this.request<any[]>(`/medical/cases/${caseId}/injuries`);
  }

  async getMedicalSummary(caseId: string) {
    return this.request<any>(`/medical/cases/${caseId}/summary`);
  }

  async createMedicalProvider(caseId: string, data: any) {
    return this.request<any>(`/medical/cases/${caseId}/providers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Incident Information
  async getIncident(caseId: string) {
    return this.request<any>(`/incident/cases/${caseId}`);
  }

  async getVehicles(caseId: string) {
    return this.request<any[]>(`/incident/cases/${caseId}/vehicles`);
  }

  async getWitnesses(caseId: string) {
    return this.request<any[]>(`/incident/cases/${caseId}/witnesses`);
  }

  async getEvidence(caseId: string, params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any[]>(`/incident/cases/${caseId}/evidence?${searchParams}`);
  }

  async getCompleteIncidentInfo(caseId: string) {
    return this.request<any>(`/incident/cases/${caseId}/complete`);
  }

  // Insurance Information
  async getInsurancePolicies(caseId: string, params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any[]>(`/insurance/cases/${caseId}/policies?${searchParams}`);
  }

  async getInsuranceClaims(caseId: string, params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any[]>(`/insurance/cases/${caseId}/claims?${searchParams}`);
  }

  async getInsuranceSummary(caseId: string) {
    return this.request<any>(`/insurance/cases/${caseId}/summary`);
  }

  async getAutoInsurance(caseId: string) {
    return this.request<any[]>(`/insurance/cases/${caseId}/auto-insurance`);
  }

  async getHealthInsurance(caseId: string) {
    return this.request<any[]>(`/insurance/cases/${caseId}/health-insurance`);
  }

  // Tasks
  async getCaseTasks(caseId: string, params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any>(`/tasks/cases/${caseId}?${searchParams}`);
  }

  async createTask(caseId: string, data: any) {
    return this.request<any>(`/tasks/cases/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId: string, data: any) {
    return this.request<any>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeTask(taskId: string) {
    return this.request<any>(`/tasks/${taskId}/complete`, {
      method: 'PATCH',
    });
  }

  // Documents
  async getCaseDocuments(caseId: string, params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any>(`/documents/cases/${caseId}?${searchParams}`);
  }

  async uploadDocument(caseId: string, file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    return this.request<any>(`/documents/cases/${caseId}`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
  }

  // Reports
  async getDashboardStats(params?: any) {
    const searchParams = new URLSearchParams(params);
    return this.request<any>(`/reports/dashboard?${searchParams}`);
  }

  async getCaseSummaryReport(caseId: string) {
    return this.request<any>(`/reports/cases/${caseId}/summary`);
  }

  async getFinancialReport(caseId: string) {
    return this.request<any>(`/reports/cases/${caseId}/financial`);
  }
}

export const apiClient = new ApiClient();

// ============================================================================
// REACT HOOKS FOR API INTEGRATION
// ============================================================================

// frontend/src/hooks/useApi.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

// Specific hooks for common operations
export function useClients(params?: any) {
  return useApi(() => apiClient.getClients(params), [params]);
}

export function useClient(id: string) {
  return useApi(() => apiClient.getClientDetailed(id), [id]);
}

export function useCases(params?: any) {
  return useApi(() => apiClient.getCases(params), [params]);
}

export function useCase(id: string) {
  return useApi(() => apiClient.getCaseOverview(id), [id]);
}

export function useMedicalInfo(caseId: string) {
  const providers = useApi(() => apiClient.getMedicalProviders(caseId), [caseId]);
  const records = useApi(() => apiClient.getMedicalRecords(caseId), [caseId]);
  const injuries = useApi(() => apiClient.getInjuries(caseId), [caseId]);
  const summary = useApi(() => apiClient.getMedicalSummary(caseId), [caseId]);

  return {
    providers: providers.data,
    records: records.data,
    injuries: injuries.data,
    summary: summary.data,
    loading: providers.loading || records.loading || injuries.loading || summary.loading,
    error: providers.error || records.error || injuries.error || summary.error,
    refetch: () => {
      providers.refetch();
      records.refetch();
      injuries.refetch();
      summary.refetch();
    },
  };
}

export function useIncidentInfo(caseId: string) {
  return useApi(() => apiClient.getCompleteIncidentInfo(caseId), [caseId]);
}

export function useInsuranceInfo(caseId: string) {
  const policies = useApi(() => apiClient.getInsurancePolicies(caseId), [caseId]);
  const claims = useApi(() => apiClient.getInsuranceClaims(caseId), [caseId]);
  const summary = useApi(() => apiClient.getInsuranceSummary(caseId), [caseId]);

  return {
    policies: policies.data,
    claims: claims.data,
    summary: summary.data,
    loading: policies.loading || claims.loading || summary.loading,
    error: policies.error || claims.error || summary.error,
    refetch: () => {
      policies.refetch();
      claims.refetch();
      summary.refetch();
    },
  };
}

// ============================================================================
// AUTHENTICATION CONTEXT
// ============================================================================

// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to get current user:', error);
          apiClient.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

// frontend/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// UPDATED APP.TSX WITH AUTHENTICATION
// ============================================================================

// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Homepage from './components/Homepage';
import Login from './components/Login';
import ClientDashboard from './components/ClientDashboard';
import ClientCaseView from './components/ClientCaseView';
import ClientIntakeForm from './components/ClientIntakeForm';
import MedicalInformation from './components/MedicalInformation';
import PersonalInformation from './components/PersonalInformation';
import IncidentInformation from './components/IncidentInformation';
import InsuranceInformation from './components/InsuranceInformation';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route 
              path="/clients" 
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:clientId" 
              element={
                <ProtectedRoute>
                  <ClientCaseView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:clientId/medical" 
              element={
                <ProtectedRoute>
                  <MedicalInformation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:clientId/personal" 
              element={
                <ProtectedRoute>
                  <PersonalInformation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:clientId/incident" 
              element={
                <ProtectedRoute>
                  <IncidentInformation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/:clientId/insurance" 
              element={
                <ProtectedRoute>
                  <InsuranceInformation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clients/intake" 
              element={
                <ProtectedRoute requiredRole="ATTORNEY">
                  <ClientIntakeForm />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

// ============================================================================
// EXAMPLE UPDATED LOGIN COMPONENT WITH API INTEGRATION
// ============================================================================

// frontend/src/components/Login.tsx (Updated with API integration)
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginType, setLoginType] = useState<'client' | 'signin' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    caseDescription: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (loginType === 'signin') {
      setLoading(true);
      try {
        await login(formData.email, formData.password);
        navigate('/clients');
      } catch (err) {
        setError('Invalid email or password');
      } finally {
        setLoading(false);
      }
    } else {
      // Handle client inquiry
      console.log('Client inquiry submitted:', formData);
      alert('Thank you for your inquiry. We will contact you within 24 hours.');
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = (role: 'admin' | 'attorney' | 'paralegal') => {
    const credentials = {
      admin: { email: 'admin@legal-estate.com', password: 'admin123' },
      attorney: { email: 'john.smith@legal-estate.com', password: 'attorney123' },
      paralegal: { email: 'alexis.camacho@legal-estate.com', password: 'paralegal123' },
    };
    
    setFormData(prev => ({
      ...prev,
      ...credentials[role]
    }));
  };

  if (!loginType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <Link to="/" className="flex justify-center">
              <h1 className="text-3xl font-bold text-blue-900">Legal Estate</h1>
            </Link>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please choose how you'd like to proceed
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={() => setLoginType('client')}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Prospective Client
              </div>
            </button>

            <button
              onClick={() => setLoginType('signin')}
              className="group relative w-full flex justify-center py-4 px-4 border border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sign In
              </div>
            </button>
          </div>

          <div className="text-center">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex justify-center">
            <h1 className="text-3xl font-bold text-blue-900">Legal Estate</h1>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {loginType === 'client' ? 'New Client Inquiry' : 'Sign In'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {loginType === 'client' 
              ? 'Tell us about your case and we\'ll get back to you shortly'
              : 'Access your Legal Estate account'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {loginType === 'client' ? (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label htmlFor="caseDescription" className="block text-sm font-medium text-gray-700">
                    Brief Case Description *
                  </label>
                  <textarea
                    id="caseDescription"
                    name="caseDescription"
                    rows={4}
                    required
                    value={formData.caseDescription}
                    onChange={handleInputChange}
                    className="mt-1 relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Please describe your legal matter briefly..."
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="mt-1 relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>

                {/* Demo Credentials */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Demo Credentials:</p>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('admin')}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('attorney')}
                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                    >
                      Attorney
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('paralegal')}
                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                    >
                      Paralegal
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (loginType === 'client' ? 'Submit Inquiry' : 'Sign In')}
            </button>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setLoginType(null)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to options
            </button>
            <span className="text-gray-300">|</span>
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Back to Homepage
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;