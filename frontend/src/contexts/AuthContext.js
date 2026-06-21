import React, { createContext, useContext, useState, useEffect } from 'react';
import { endpoints } from '../utils/api';
import { clearLegacyAuthStorage } from '../utils/authStorage';

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

  useEffect(() => {
    clearLegacyAuthStorage();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await endpoints.auth.me();
        setUser(response.user || response);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password, loginType = 'admin') => {
    try {
      const credentials = loginType === 'client'
        ? { identifier: email, password }
        : { email, password };
      const response = loginType === 'client'
        ? await endpoints.auth.clientLogin(credentials)
        : await endpoints.auth.login(credentials);

      if (response.requiresTwoFactor) {
        return {
          success: false,
          requiresTwoFactor: true,
          userId: response.userId
        };
      }

      const { user: userData, client: clientData, loginType: userType } = response;
      const userInfo = userData || clientData;

      clearLegacyAuthStorage();
      setUser(userInfo);

      return { success: true, user: userInfo, loginType: userType || loginType };
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      await endpoints.auth.logout();
    } catch (error) {
      // Continue local logout even if API call fails
    } finally {
      clearLegacyAuthStorage();
      setUser(null);
    }
  };

  const register = async (userData) => {
    try {
      const response = await endpoints.auth.register(userData);
      const { user: newUser } = response;

      clearLegacyAuthStorage();
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.error || 'Registration failed'
      };
    }
  };

  const verify2FALogin = async (userId, token) => {
    try {
      const response = await endpoints.auth.verify2FA({ userId, token });
      const userInfo = response.user;

      clearLegacyAuthStorage();
      setUser(userInfo);

      return { success: true, user: userInfo };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Invalid verification code'
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
    verify2FALogin,
    logout,
    register,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
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
