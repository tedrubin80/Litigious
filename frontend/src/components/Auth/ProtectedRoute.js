import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, requiredLoginType = null }) => {
  const { user, loading, loginType } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate login based on what was requested
    if (requiredLoginType === 'client') {
      return <Navigate to="/client/login" replace />;
    } else {
      return <Navigate to="/admin/login" replace />;
    }
  }

  // Check login type match
  if (requiredLoginType && loginType !== requiredLoginType) {
    if (requiredLoginType === 'client') {
      return <Navigate to="/client/login" replace />;
    } else {
      return <Navigate to="/admin/login" replace />;
    }
  }

  // Check role requirements for admin users
  if (requiredRole && loginType === 'admin' && user.role !== requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;