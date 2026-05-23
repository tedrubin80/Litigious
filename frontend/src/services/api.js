// Compatibility shim — delegates to utils/api.js. New code should import from utils/api.js directly.
import { apiMethods, axiosInstance, endpoints } from '../utils/api';

export const authAPI = {
  login: (email, password) => apiMethods.post('/auth/login', { email, password }),
  register: (userData) => apiMethods.post('/auth/register', userData),
  verify: () => apiMethods.get('/auth/verify'),
  logout: () => apiMethods.post('/auth/logout'),
  forgotPassword: (email) => apiMethods.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiMethods.post('/auth/reset-password', { token, newPassword }),
};

export const casesAPI = {
  getAll: (params) => apiMethods.get('/cases', { params }),
  getById: (id) => apiMethods.get(`/cases/${id}`),
  create: (data) => apiMethods.post('/cases', data),
  update: (id, data) => apiMethods.put(`/cases/${id}`, data),
  delete: (id) => apiMethods.delete(`/cases/${id}`),
  search: (query) => apiMethods.get('/cases/search', { params: { q: query } }),
};

export const clientsAPI = {
  getAll: (params) => apiMethods.get('/clients', { params }),
  getById: (id) => apiMethods.get(`/clients/${id}`),
  create: (data) => apiMethods.post('/clients', data),
  update: (id, data) => apiMethods.put(`/clients/${id}`, data),
  delete: (id) => apiMethods.delete(`/clients/${id}`),
};

export const documentsAPI = {
  getAll: (params) => apiMethods.get('/documents', { params }),
  getById: (id) => apiMethods.get(`/documents/${id}`),
  upload: (formData) => apiMethods.upload('/documents/upload', formData),
  download: (id) => apiMethods.download(`/documents/${id}/download`),
  delete: (id) => apiMethods.delete(`/documents/${id}`),
};

export const tasksAPI = {
  getAll: (params) => apiMethods.get('/tasks', { params }),
  getById: (id) => apiMethods.get(`/tasks/${id}`),
  create: (data) => apiMethods.post('/tasks', data),
  update: (id, data) => apiMethods.put(`/tasks/${id}`, data),
  delete: (id) => apiMethods.delete(`/tasks/${id}`),
  markComplete: (id) => apiMethods.put(`/tasks/${id}/complete`),
};

export const meetingsAPI = {
  create: (data) => apiMethods.post('/meetings/create', data),
  join: (id) => apiMethods.post(`/meetings/${id}/join`),
  leave: (id) => apiMethods.post(`/meetings/${id}/leave`),
  getActive: () => apiMethods.get('/meetings/active'),
  getById: (id) => apiMethods.get(`/meetings/${id}`),
  startRecording: (id) => apiMethods.post(`/meetings/${id}/record/start`),
  stopRecording: (id) => apiMethods.post(`/meetings/${id}/record/stop`),
  getRecordings: (id) => apiMethods.get(`/meetings/${id}/recordings`),
};

export default axiosInstance;
