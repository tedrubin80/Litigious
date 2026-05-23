import axios from 'axios';
import { parseApiError, handleSessionError, logError } from './errorHandler';

// Use environment variable with fallback
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://legalestate.tech/api';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '10000', 10);

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { requestStartedAt: new Date().getTime() };

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    logError(error, { context: 'request_interceptor' });
    return Promise.reject(error);
  }
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    if (response.config.metadata) {
      response.config.metadata.responseReceivedAt = new Date().getTime();
      response.config.metadata.duration = 
        response.config.metadata.responseReceivedAt - response.config.metadata.requestStartedAt;
    }

    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      const duration = response.config.metadata?.duration || 0;
      console.log(
        `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`,
        response.status
      );
    }

    return response;
  },
  (error) => {
    // Calculate request duration even for errors
    if (error.config?.metadata) {
      error.config.metadata.responseReceivedAt = new Date().getTime();
      error.config.metadata.duration = 
        error.config.metadata.responseReceivedAt - error.config.metadata.requestStartedAt;
    }

    // Log error response in development
    if (process.env.NODE_ENV === 'development') {
      const duration = error.config?.metadata?.duration || 0;
      console.error(
        `❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`,
        error.response?.status || 'Network Error'
      );
    }

    // Handle authentication errors globally
    if (error.response?.status === 401) {
      const parsedError = handleSessionError(error, () => {
        // Redirect to login or trigger logout
        window.location.href = '/admin/login';
      });
      return Promise.reject(parsedError);
    }

    // Parse and log other errors
    const parsedError = parseApiError(error);
    logError(error, { 
      context: 'response_interceptor',
      url: error.config?.url,
      method: error.config?.method,
      duration: error.config?.metadata?.duration
    });

    return Promise.reject(parsedError);
  }
);

// API methods with consistent error handling
export const apiMethods = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  },

  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  },

  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  },

  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  },

  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  },

  // Upload file with progress tracking
  upload: async (url, formData, onProgress = null) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await api.post(url, formData, config);
      return response.data;
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  },

  // Download file
  download: async (url, filename = null) => {
    try {
      const response = await api.get(url, {
        responseType: 'blob',
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Extract filename from response headers or use provided name
      const contentDisposition = response.headers['content-disposition'];
      let extractedFilename = filename;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          extractedFilename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', extractedFilename || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true, filename: extractedFilename };
    } catch (error) {
      throw error; // Error already parsed by interceptor
    }
  }
};

// Specific API endpoints
export const endpoints = {
  // Authentication
  auth: {
    login: (credentials) => apiMethods.post('/auth/login', credentials),
    logout: () => apiMethods.post('/auth/logout'),
    refresh: (token) => apiMethods.post('/auth/refresh', { token }),
    me: () => apiMethods.get('/auth/me'),
    changePassword: (data) => apiMethods.put('/auth/change-password', data),
  },

  // Users
  users: {
    list: (params = {}) => apiMethods.get('/users', { params }),
    get: (id) => apiMethods.get(`/users/${id}`),
    create: (data) => apiMethods.post('/users', data),
    update: (id, data) => apiMethods.put(`/users/${id}`, data),
    delete: (id) => apiMethods.delete(`/users/${id}`),
    statistics: () => apiMethods.get('/users/statistics'),
  },

  // Clients
  clients: {
    list: (params = {}) => apiMethods.get('/clients', { params }),
    get: (id) => apiMethods.get(`/clients/${id}`),
    create: (data) => apiMethods.post('/clients', data),
    update: (id, data) => apiMethods.put(`/clients/${id}`, data),
    delete: (id) => apiMethods.delete(`/clients/${id}`),
    search: (query) => apiMethods.get('/clients/search', { params: { q: query } }),
    statistics: () => apiMethods.get('/clients/statistics'),
  },

  // Cases
  cases: {
    list: (params = {}) => apiMethods.get('/cases', { params }),
    get: (id) => apiMethods.get(`/cases/${id}`),
    create: (data) => apiMethods.post('/cases', data),
    update: (id, data) => apiMethods.put(`/cases/${id}`, data),
    delete: (id) => apiMethods.delete(`/cases/${id}`),
    updateStatus: (id, status) => apiMethods.patch(`/cases/${id}/status`, { status }),
    assign: (id, userId) => apiMethods.patch(`/cases/${id}/assign`, { userId }),
    timeline: (id) => apiMethods.get(`/cases/${id}/timeline`),
    statistics: () => apiMethods.get('/cases/statistics'),
    search: (query) => apiMethods.get('/cases/search', { params: { q: query } }),
  },

  // Tasks
  tasks: {
    list: (params = {}) => apiMethods.get('/tasks', { params }),
    get: (id) => apiMethods.get(`/tasks/${id}`),
    create: (data) => apiMethods.post('/tasks', data),
    update: (id, data) => apiMethods.put(`/tasks/${id}`, data),
    delete: (id) => apiMethods.delete(`/tasks/${id}`),
    updateStatus: (id, status) => apiMethods.patch(`/tasks/${id}/status`, { status }),
    assign: (id, userId) => apiMethods.patch(`/tasks/${id}/assign`, { userId }),
  },

  // Documents
  documents: {
    list: (params = {}) => apiMethods.get('/documents', { params }),
    get: (id) => apiMethods.get(`/documents/${id}`),
    upload: (formData, onProgress) => apiMethods.upload('/documents/upload', formData, onProgress),
    update: (id, data) => apiMethods.put(`/documents/${id}`, data),
    delete: (id) => apiMethods.delete(`/documents/${id}`),
    download: (id, filename) => apiMethods.download(`/documents/${id}/download`, filename),
    preview: (id) => apiMethods.get(`/documents/${id}/preview`),
  },

  // Time Tracking
  timeEntries: {
    list: (params = {}) => apiMethods.get('/time-entries', { params }),
    get: (id) => apiMethods.get(`/time-entries/${id}`),
    create: (data) => apiMethods.post('/time-entries', data),
    update: (id, data) => apiMethods.put(`/time-entries/${id}`, data),
    delete: (id) => apiMethods.delete(`/time-entries/${id}`),
    stop: (id) => apiMethods.patch(`/time-entries/${id}/stop`),
    start: (data) => apiMethods.post('/time-entries/start', data),
  },

  // Dashboard & Analytics
  dashboard: {
    overview: () => apiMethods.get('/dashboard/overview'),
    analytics: (params = {}) => apiMethods.get('/dashboard/analytics', { params }),
    recentActivity: () => apiMethods.get('/dashboard/recent-activity'),
    upcomingTasks: () => apiMethods.get('/dashboard/upcoming-tasks'),
  },

  // Medical Records
  medicalRecords: {
    list: (params = {}) => apiMethods.get('/medical-records', { params }),
    get: (id) => apiMethods.get(`/medical-records/${id}`),
    create: (data) => apiMethods.post('/medical-records', data),
    update: (id, data) => apiMethods.put(`/medical-records/${id}`, data),
    delete: (id) => apiMethods.delete(`/medical-records/${id}`),
  },

  // Settings
  settings: {
    get: () => apiMethods.get('/settings'),
    update: (data) => apiMethods.put('/settings', data),
    backup: () => apiMethods.get('/settings/backup'),
    restore: (data) => apiMethods.post('/settings/restore', data),
  },
};

// Utility functions
export const cancelToken = () => axios.CancelToken.source();

export const isCancel = (error) => axios.isCancel(error);

// Export configured axios instance for direct use if needed
export { api as axiosInstance };

// Export default as apiMethods for backward compatibility
export default apiMethods;