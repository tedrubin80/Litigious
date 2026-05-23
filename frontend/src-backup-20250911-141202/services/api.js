import axios from 'axios';

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: '/api',  // Use relative path - nginx will proxy this
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response.status, response.data);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error Response:', error.response.status, error.response.data);
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/admin') &&
            !window.location.pathname.includes('/client')) {
          window.location.href = '/admin/login';
        }
      }
      
      // Handle 403 Forbidden
      if (error.response.status === 403) {
        console.error('Access forbidden');
      }
      
      // Handle 404 Not Found
      if (error.response.status === 404) {
        console.error('Resource not found');
      }
      
      // Handle 500 Server Error
      if (error.response.status >= 500) {
        console.error('Server error occurred');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error - no response received:', error.request);
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword })
};

// Cases API endpoints
export const casesAPI = {
  getAll: (params) => api.get('/cases', { params }),
  getById: (id) => api.get(`/cases/${id}`),
  create: (caseData) => api.post('/cases', caseData),
  update: (id, caseData) => api.put(`/cases/${id}`, caseData),
  delete: (id) => api.delete(`/cases/${id}`),
  search: (query) => api.get('/cases/search', { params: { q: query } })
};

// Clients API endpoints
export const clientsAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (clientData) => api.post('/clients', clientData),
  update: (id, clientData) => api.put(`/clients/${id}`, clientData),
  delete: (id) => api.delete(`/clients/${id}`)
};

// Documents API endpoints
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`)
};

// Tasks API endpoints
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (taskData) => api.post('/tasks', taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  delete: (id) => api.delete(`/tasks/${id}`),
  markComplete: (id) => api.put(`/tasks/${id}/complete`)
};

// Meetings API endpoints
export const meetingsAPI = {
  create: (meetingData) => api.post('/meetings/create', meetingData),
  join: (meetingId) => api.post(`/meetings/${meetingId}/join`),
  leave: (meetingId) => api.post(`/meetings/${meetingId}/leave`),
  getActive: () => api.get('/meetings/active'),
  getById: (id) => api.get(`/meetings/${id}`),
  startRecording: (meetingId) => api.post(`/meetings/${meetingId}/record/start`),
  stopRecording: (meetingId) => api.post(`/meetings/${meetingId}/record/stop`),
  getRecordings: (meetingId) => api.get(`/meetings/${meetingId}/recordings`)
};

// Export the configured axios instance as default
export default api;