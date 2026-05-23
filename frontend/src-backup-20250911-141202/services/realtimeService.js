import React from 'react';

// Real-time data service for live updates
class RealTimeService {
  constructor() {
    this.subscribers = new Map();
    this.intervals = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000; // Start with 1 second
    this.maxReconnectInterval = 30000; // Max 30 seconds
  }

  // Subscribe to real-time updates for a specific data type
  subscribe(dataType, callback, interval = 30000) {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, new Set());
    }
    
    this.subscribers.get(dataType).add(callback);
    
    // Start polling for this data type if not already started
    if (!this.intervals.has(dataType)) {
      this.startPolling(dataType, interval);
    }
    
    // Return unsubscribe function
    return () => this.unsubscribe(dataType, callback);
  }

  // Unsubscribe from real-time updates
  unsubscribe(dataType, callback) {
    if (this.subscribers.has(dataType)) {
      this.subscribers.get(dataType).delete(callback);
      
      // If no more subscribers for this data type, stop polling
      if (this.subscribers.get(dataType).size === 0) {
        this.stopPolling(dataType);
        this.subscribers.delete(dataType);
      }
    }
  }

  // Start polling for a specific data type
  startPolling(dataType, interval) {
    const pollFunction = async () => {
      try {
        const data = await this.fetchData(dataType);
        this.notifySubscribers(dataType, data);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error(`Error fetching real-time data for ${dataType}:`, error);
        this.handleConnectionError(dataType);
      }
    };

    // Initial fetch
    pollFunction();
    
    // Set up interval
    const intervalId = setInterval(pollFunction, interval);
    this.intervals.set(dataType, intervalId);
  }

  // Stop polling for a specific data type
  stopPolling(dataType) {
    if (this.intervals.has(dataType)) {
      clearInterval(this.intervals.get(dataType));
      this.intervals.delete(dataType);
    }
  }

  // Fetch data from API based on data type
  async fetchData(dataType) {
    const endpoints = {
      dashboard: '/dashboard/overview',
      analytics: '/dashboard/analytics',
      cases: '/cases/statistics',
      clients: '/clients/statistics',
      documents: '/documents/statistics',
      tasks: '/tasks/statistics',
      timeEntries: '/time-entries/recent',
      activities: '/dashboard/recent-activity',
      notifications: '/notifications/unread'
    };

    const endpoint = endpoints[dataType];
    if (!endpoint) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const token = localStorage.getItem('token');
    const apiUrl = process.env.REACT_APP_API_URL || 'https://legalestate.tech/api';
    const response = await fetch(`${apiUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${dataType}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Notify all subscribers of new data
  notifySubscribers(dataType, data) {
    if (this.subscribers.has(dataType)) {
      this.subscribers.get(dataType).forEach(callback => {
        try {
          callback(data, dataType);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Handle connection errors and implement exponential backoff
  handleConnectionError(dataType) {
    this.isConnected = false;
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectInterval
      );

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.intervals.has(dataType)) {
          this.stopPolling(dataType);
          this.startPolling(dataType, 30000); // Reset to default interval
        }
      }, delay);
    } else {
      console.error(`Max reconnection attempts reached for ${dataType}`);
      this.stopPolling(dataType);
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: Array.from(this.subscribers.keys())
    };
  }

  // Manually refresh data for a specific type
  async refreshData(dataType) {
    try {
      const data = await this.fetchData(dataType);
      this.notifySubscribers(dataType, data);
      return data;
    } catch (error) {
      console.error(`Error refreshing data for ${dataType}:`, error);
      throw error;
    }
  }

  // Clean up all subscriptions and intervals
  disconnect() {
    this.intervals.forEach((intervalId, dataType) => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    this.subscribers.clear();
    this.isConnected = false;
  }

  // Batch subscribe to multiple data types
  batchSubscribe(subscriptions) {
    const unsubscribeFunctions = [];
    
    subscriptions.forEach(({ dataType, callback, interval }) => {
      const unsubscribe = this.subscribe(dataType, callback, interval);
      unsubscribeFunctions.push(unsubscribe);
    });

    // Return function to unsubscribe from all
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  // Get cached data (last received data for a type)
  getCachedData(dataType) {
    return this.cachedData?.get(dataType) || null;
  }

  // Enable data caching
  enableCaching() {
    this.cachedData = new Map();
    
    // Override notifySubscribers to also cache data
    const originalNotify = this.notifySubscribers.bind(this);
    this.notifySubscribers = (dataType, data) => {
      this.cachedData.set(dataType, {
        data,
        timestamp: Date.now()
      });
      originalNotify(dataType, data);
    };
  }

  // Disable data caching
  disableCaching() {
    this.cachedData = null;
  }
}

// Create singleton instance
const realTimeService = new RealTimeService();

// React hook for easy integration with components
export const useRealTimeData = (dataType, interval = 30000, enabled = true) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let unsubscribe;

    const handleData = (newData, type) => {
      setData(newData);
      setLoading(false);
      setError(null);
      setLastUpdated(new Date());
    };

    const handleError = (err) => {
      setError(err);
      setLoading(false);
    };

    try {
      unsubscribe = realTimeService.subscribe(dataType, handleData, interval);
    } catch (err) {
      handleError(err);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dataType, interval, enabled]);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    try {
      const newData = await realTimeService.refreshData(dataType);
      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [dataType, enabled]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    connectionStatus: realTimeService.getConnectionStatus()
  };
};

// React hook for multiple data types
export const useMultipleRealTimeData = (subscriptions, enabled = true) => {
  const [dataMap, setDataMap] = React.useState(new Map());
  const [loadingMap, setLoadingMap] = React.useState(new Map());
  const [errorMap, setErrorMap] = React.useState(new Map());

  React.useEffect(() => {
    if (!enabled) return;

    const subscriptionConfigs = subscriptions.map(({ dataType, interval = 30000 }) => ({
      dataType,
      interval,
      callback: (data, type) => {
        setDataMap(prev => new Map(prev).set(type, data));
        setLoadingMap(prev => new Map(prev).set(type, false));
        setErrorMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(type);
          return newMap;
        });
      }
    }));

    // Initialize loading states
    subscriptions.forEach(({ dataType }) => {
      setLoadingMap(prev => new Map(prev).set(dataType, true));
    });

    const unsubscribeAll = realTimeService.batchSubscribe(subscriptionConfigs);

    return unsubscribeAll;
  }, [subscriptions, enabled]);

  return {
    dataMap,
    loadingMap,
    errorMap,
    connectionStatus: realTimeService.getConnectionStatus()
  };
};

// Context for global real-time service access
export const RealTimeContext = React.createContext(realTimeService);

// Provider component
export const RealTimeProvider = ({ children }) => {
  React.useEffect(() => {
    realTimeService.enableCaching();
    
    return () => {
      realTimeService.disconnect();
    };
  }, []);

  return (
    <RealTimeContext.Provider value={realTimeService}>
      {children}
    </RealTimeContext.Provider>
  );
};

// Hook to access real-time service
export const useRealTimeService = () => {
  const context = React.useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTimeService must be used within a RealTimeProvider');
  }
  return context;
};

export default realTimeService;