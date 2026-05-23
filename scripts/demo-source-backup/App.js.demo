import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import ErrorMonitor from './components/Common/ErrorMonitor';
import ToastProvider from './components/Common/Toast';
import { RealTimeProvider } from './services/realtimeService';
import Layout from './components/Layout/Layout';
import Homepage from './components/Homepage/Homepage';
import Login from './components/Auth/Login';
import AdminLogin from './components/Auth/AdminLogin';
import ClientLogin from './components/Auth/ClientLogin';
import Dashboard from './components/Dashboard/Dashboard';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import CaseList from './components/Cases/CaseList';
import CaseDetail from './components/Cases/CaseDetail';
import CaseForm from './components/Cases/CaseForm';
import ClientList from './components/Clients/ClientList';
import ClientDetail from './components/Clients/ClientDetail';
import ClientForm from './components/Clients/ClientForm';
import TaskBoard from './components/Tasks/TaskBoard';
import DocumentManager from './components/Documents/DocumentManager';
import TimeTracker from './components/TimeTracking/TimeTracker';
import MedicalRecords from './components/Medical/MedicalRecords';
import UserManagement from './components/Admin/UserManagement';
import AIKeyManagement from './components/Admin/AIKeyManagement';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';
import WebRTCMeetingList from './components/WebRTC/WebRTCMeetingList';
import LexMachinaResearch from './components/LexMachina/LexMachinaResearch';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const isDemoMode = localStorage.getItem('demoMode') === 'true';

  if (loading && !isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Allow access in demo mode without authentication
  if (isDemoMode) {
    return children;
  }

  if (!user) {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

// Public Route Component (redirects if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/app/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <ErrorMonitor autoReload={false}>
      <ErrorBoundary showDetails={true}>
        <RealTimeProvider>
          <ToastProvider position="top-right" maxToasts={5}>
            <AuthProvider>
            <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Homepage />} />
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/admin/login" element={
                <PublicRoute>
                  <AdminLogin />
                </PublicRoute>
              } />
              <Route path="/client/login" element={
                <PublicRoute>
                  <ClientLogin />
                </PublicRoute>
              } />
              
              {/* Protected Routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/app/dashboard" />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Cases */}
                <Route path="cases" element={<CaseList />} />
                <Route path="cases/new" element={<CaseForm />} />
                <Route path="cases/:id" element={<CaseDetail />} />
                <Route path="cases/:id/edit" element={<CaseForm />} />
                
                {/* Clients */}
                <Route path="clients" element={<ClientList />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />
                
                {/* Tasks */}
                <Route path="tasks" element={<TaskBoard />} />
                
                {/* Documents */}
                <Route path="documents" element={<DocumentManager />} />
                
                {/* Video Meetings */}
                <Route path="meetings" element={<WebRTCMeetingList />} />
                
                {/* Time Tracking */}
                <Route path="time" element={<TimeTracker />} />
                
                {/* Medical Records */}
                <Route path="medical" element={<MedicalRecords />} />
                
                {/* Reports */}
                <Route path="reports" element={<Reports />} />
                
                {/* Analytics */}
                <Route path="analytics" element={<AnalyticsDashboard />} />
                
                {/* Legal Research */}
                <Route path="research" element={<LexMachinaResearch />} />
                
                {/* Admin */}
                <Route path="admin/users" element={<UserManagement />} />
                <Route path="admin/ai-keys" element={<AIKeyManagement />} />
                
                {/* Settings */}
                <Route path="settings" element={<Settings />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            </Router>
            </AuthProvider>
          </ToastProvider>
        </RealTimeProvider>
      </ErrorBoundary>
    </ErrorMonitor>
  );
}

export default App;