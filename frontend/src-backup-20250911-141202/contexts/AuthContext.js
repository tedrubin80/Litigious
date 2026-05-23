import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authAPI } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Token is now handled by the API service interceptors
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    }
  }, [token]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.verify();
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password, loginType = 'admin') => {
    console.log('🔐 AuthContext.login called with:', { email, password: '***', loginType });
    
    try {
      console.log('📤 Sending login request');
      console.log('📤 Request data:', { email, password: '***' });
      
      const response = await authAPI.login(email, password);
      
      console.log('✅ Login response status:', response.status);
      console.log('✅ Login response data:', response.data);

      const { token: authToken, user: userData, client: clientData, loginType: userType } = response.data;
      const userInfo = userData || clientData;
      
      console.log('👤 User info extracted:', userInfo);
      console.log('🎫 Token extracted:', authToken ? authToken.substring(0, 50) + '...' : 'NO TOKEN');
      
      localStorage.setItem('token', authToken);
      localStorage.setItem('loginType', userType || loginType);
      setToken(authToken);
      setUser(userInfo);
      
      console.log('✅ Login successful, returning success');
      return { success: true, user: userInfo, loginType: userType || loginType };
    } catch (error) {
      console.error('❌ Login error (full):', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Login failed';
      console.error('❌ Final error message:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      const { token: authToken, user: newUser } = response.data;
      
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isAttorney: user?.role === 'ATTORNEY',
    isParalegal: user?.role === 'PARALEGAL',
    isAssistant: user?.role === 'ASSISTANT',
    isClient: user?.role === 'CLIENT'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};