import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, endpoints } from '../utils/api';
import { useToast } from '../components/Common/Toast';
import io from 'socket.io-client';

/**
 * Comprehensive Activity Tracking Hook
 * 
 * Provides real-time activity tracking, automatic billing,
 * and live activity feed functionality for the legal practice
 * management system.
 */
export const useActivityTracker = () => {
  const { user, token } = useAuth();
  const toast = useToast();
  const socketRef = useRef(null);
  
  const [state, setState] = useState({
    activities: [],
    statistics: null,
    realtimeActivities: [],
    loading: false,
    error: null,
    connected: false
  });

  // Initialize Socket.IO connection for real-time updates
  useEffect(() => {
    if (token && user) {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://legalestate.tech';
      const socketUrl = API_BASE_URL.replace('/api', '').replace('https://', 'wss://').replace('http://', 'ws://');
      
      socketRef.current = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        setState(prev => ({ ...prev, connected: true }));
        console.log('🔗 Activity tracker connected to real-time updates');
      });

      socketRef.current.on('disconnect', () => {
        setState(prev => ({ ...prev, connected: false }));
      });

      socketRef.current.on('activity_update', (data) => {
        setState(prev => ({
          ...prev,
          realtimeActivities: [data, ...prev.realtimeActivities.slice(0, 49)] // Keep last 50
        }));
        
        // Show notification for new activities
        if (data.action && data.caseId) {
          toast?.show?.({
            type: 'info',
            message: `New activity: ${data.action}`,
            duration: 3000
          });
        }
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [token, user, toast]);

  /**
   * Track a manual activity (e.g., from form submission)
   */
  const trackActivity = useCallback(async (activityData) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await api.post('/activities/track', {
        ...activityData,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          activities: [response.data.activity, ...prev.activities],
          loading: false
        }));
        
        toast?.show?.({
          type: 'success',
          message: `Activity tracked: ${response.data.activity.action}`,
          duration: 4000
        });

        return response.data.activity;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to track activity';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      toast?.show?.({
        type: 'error',
        message: errorMsg,
        duration: 5000
      });
      throw error;
    }
  }, [user, toast]);

  /**
   * Track a demo legal work activity (for testing/demos)
   */
  const trackLegalWork = useCallback(async (workData) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await api.post('/activities/demo/legal-work', workData);

      if (response.data.success) {
        const { activity, billing } = response.data;
        
        setState(prev => ({
          ...prev,
          activities: [activity, ...prev.activities],
          loading: false
        }));

        toast?.show?.({
          type: 'success',
          message: `${activity.action} tracked - ${billing.duration} billed at ${billing.estimatedCost}`,
          duration: 6000
        });

        return response.data;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to track legal work';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw error;
    }
  }, [toast]);

  /**
   * Fetch case activities with optional filtering
   */
  const fetchCaseActivities = useCallback(async (caseId, filters = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const queryParams = new URLSearchParams(filters).toString();
      const url = `/activities/case/${caseId}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await api.get(url);

      if (response.data.success) {
        return response.data;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch case activities';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Fetch user activity summary
   */
  const fetchUserSummary = useCallback(async (userId = null, timeframe = 30) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const targetUserId = userId || user?.id;
      const response = await api.get(`/activities/user/${targetUserId}/summary?timeframe=${timeframe}`);

      if (response.data.success) {
        return response.data.summary;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch user summary';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  /**
   * Fetch activity statistics
   */
  const fetchStatistics = useCallback(async (timeframe = 30) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await api.get(`/activities/statistics?timeframe=${timeframe}`);

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          statistics: response.data.statistics,
          loading: false
        }));
        
        return response.data.statistics;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch statistics';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw error;
    }
  }, []);

  /**
   * Fetch activity feed (recent activities)
   */
  const fetchActivityFeed = useCallback(async (limit = 20) => {
    try {
      const response = await api.get(`/activities/feed?limit=${limit}`);
      
      if (response.data.success) {
        setState(prev => ({
          ...prev,
          activities: response.data.activities
        }));
        
        return response.data.activities;
      }
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
      throw error;
    }
  }, []);

  /**
   * Generate billing report for a case
   */
  const generateBillingReport = useCallback(async (caseId, startDate = null, endDate = null) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/activities/case/${caseId}/billing-report?${params}`);
      
      if (response.data.success) {
        return response.data.report;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to generate billing report';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchStatistics(),
      fetchActivityFeed()
    ]);
  }, [fetchStatistics, fetchActivityFeed]);

  return {
    // State
    activities: state.activities,
    realtimeActivities: state.realtimeActivities,
    statistics: state.statistics,
    loading: state.loading,
    error: state.error,
    connected: state.connected,
    
    // Actions
    trackActivity,
    trackLegalWork,
    fetchCaseActivities,
    fetchUserSummary,
    fetchStatistics,
    fetchActivityFeed,
    generateBillingReport,
    clearError,
    refresh
  };
};

/**
 * Hook specifically for case activity tracking
 */
export const useCaseActivityTracker = (caseId) => {
  const [caseData, setCaseData] = useState({
    activities: [],
    billing: null,
    summary: null,
    loading: false,
    error: null
  });

  const { fetchCaseActivities, generateBillingReport } = useActivityTracker();

  const loadCaseData = useCallback(async () => {
    if (!caseId) return;
    
    try {
      setCaseData(prev => ({ ...prev, loading: true, error: null }));
      
      const [activitiesData, billingReport] = await Promise.all([
        fetchCaseActivities(caseId),
        generateBillingReport(caseId).catch(() => null) // Don't fail if billing unavailable
      ]);
      
      setCaseData({
        activities: activitiesData.activities || [],
        billing: billingReport,
        summary: activitiesData.summary || null,
        loading: false,
        error: null
      });
    } catch (error) {
      setCaseData(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  }, [caseId, fetchCaseActivities, generateBillingReport]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  return {
    ...caseData,
    refresh: loadCaseData
  };
};

export default useActivityTracker;