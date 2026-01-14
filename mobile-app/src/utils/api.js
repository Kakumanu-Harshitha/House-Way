import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from './network';

// -----------------------------
// 🔧 Base URL Configuration
// -----------------------------
const BASE_URL = getApiBaseUrl();

// -----------------------------
// 📡 Axios Instance
// -----------------------------
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased from 10000ms to 30000ms to give backend more time
});

// -----------------------------
// 🧠 Request Interceptor
// -----------------------------
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@houseway_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -----------------------------
// ⚙️ Response Interceptor
// -----------------------------
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (__DEV__) {
      console.error('[API Error]', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        url: error.config?.url,
        timeout: error.config?.timeout,
      });
    }
    
    // Handle different error types
    const errorData = error.response?.data || {
      success: false,
      message: error.message || 'Request failed',
      originalError: error.code, // e.g., 'ECONNABORTED' for timeout
    };
    
    return Promise.reject(errorData);
  }
);

// -----------------------------
// 🧩 AUTH API
// -----------------------------
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }, {
      headers: { 'Content-Type': 'application/json' },
    }),

  // ✅ Dynamic register route (fixed 401 for self-registration)
  register: (userData) => {
    // If we're on the RegisterScreen, we don't have a token yet.
    // The backend's /auth/register handles role-based self-registration (and admin approval).
    return api.post('/auth/register', userData, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) =>
    api.put('/auth/profile', userData, {
      headers: { 'Content-Type': 'application/json' },
    }),
  changePassword: (passwordData) =>
    api.put('/auth/change-password', passwordData, {
      headers: { 'Content-Type': 'application/json' },
    }),
  // uploadProfilePhoto and removeProfilePhoto removed - use usersAPI instead


  // Password reset via Email OTP
  requestPasswordOTP: (email) =>
    api.post('/auth/request-password-otp', { email }, {
      headers: { 'Content-Type': 'application/json' },
    }),
  verifyPasswordOTP: (email, otp) =>
    api.post('/auth/verify-password-otp', { email, otp }, {
      headers: { 'Content-Type': 'application/json' },
    }),
  resetPasswordWithOTP: (email, resetToken, newPassword) =>
    api.post('/auth/reset-password-with-otp', { email, resetToken, newPassword }, {
      headers: { 'Content-Type': 'application/json' },
    }),
  getPasswordChangeQr: () =>
    api.get('/auth/password-change/totp-qr'),
  verifyPasswordChangeOtp: (otp) =>
    api.post('/auth/password-change/verify-totp', { otp }, {
      headers: { 'Content-Type': 'application/json' },
    }),
};

// -----------------------------
// 🧱 USERS API
// -----------------------------
export const usersAPI = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUserStatus: (id, isActive) =>
    api.put(`/users/${id}/status`, { isActive }, {
      headers: { 'Content-Type': 'application/json' },
    }),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getUsersByRole: (role) => api.get(`/users/role/${role}`),
  updateProfile: (data) => api.put('/users/profile', data, {
    headers: { 'Content-Type': 'application/json' },
  }),
  changePassword: (data) => api.put('/users/change-password', data, {
    headers: { 'Content-Type': 'application/json' },
  }),
  registerClient: (data) => api.post('/users/register-client', data, {
    headers: { 'Content-Type': 'application/json' },
  }),
  // Profile photo methods
  uploadProfilePhoto: (formData) => api.post('/users/profile-photo', formData, {
    transformRequest: [(data) => data], // Prevent axios from transforming FormData
  }),
  deleteProfilePhoto: () => api.delete('/users/profile-photo'),
};

// -----------------------------
// 🏗️ PROJECTS API
// -----------------------------
export const projectsAPI = {
  getProjects: (params = {}) => api.get('/projects', { params }),
  getProjectById: (id) => api.get(`/projects/${id}`),
  getProject: (id) => api.get(`/projects/${id}`), // Alias for getProjectById
  createProject: (data) =>
    api.post('/projects', data, { headers: { 'Content-Type': 'application/json' } }),
  updateProject: (id, data) =>
    api.put(`/projects/${id}`, data, { headers: { 'Content-Type': 'application/json' } }),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  assignEmployee: (id, employeeId) =>
    api.put(`/projects/${id}/assign-employee`, { employeeId }, {
      headers: { 'Content-Type': 'application/json' },
    }),
  unassignEmployee: (id, employeeId) =>
    api.delete(`/projects/${id}/unassign-employee/${employeeId}`),
  assignVendor: (id, vendorId) =>
    api.put(`/projects/${id}/assign-vendor`, { vendorId }, {
      headers: { 'Content-Type': 'application/json' },
    }),
  unassignVendor: (id, vendorId) =>
    api.delete(`/projects/${id}/unassign-vendor/${vendorId}`),
  updateProgress: (id, progressData) =>
    api.put(`/projects/${id}/progress`, progressData, {
      headers: { 'Content-Type': 'application/json' },
    }),
  // Timeline methods
  addTimelineEvent: (id, eventData) =>
    api.post(`/projects/${id}/timeline`, eventData, {
      headers: { 'Content-Type': 'application/json' },
    }),
  getTimeline: (id) => api.get(`/projects/${id}/timeline`),
  // Image/Media upload - delegates to files API
  uploadImages: (id, formData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { projectId: id },
    }),
};

// -----------------------------
// 🧾 DASHBOARD API
// -----------------------------
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getClientStats: () => api.get('/dashboard/client-stats'),
  getEmployeeStats: () => api.get('/dashboard/employee-stats'),
  getVendorStats: () => api.get('/dashboard/vendor-stats'),
  getOwnerStats: () => api.get('/dashboard/owner-stats'),
  getRecentActivity: (limit = 10) =>
    api.get('/dashboard/recent-activity', { params: { limit } }),
};

// -----------------------------
// ⚙️ MATERIAL REQUESTS API
// -----------------------------
export const materialRequestsAPI = {
  getMaterialRequests: (params = {}) => api.get('/material-requests', { params }),
  getAvailableRequests: (params = {}) => api.get('/material-requests', { params: { ...params, available: 'true' } }),
  acceptMaterialRequest: (id) => api.post(`/material-requests/${id}/accept`),
  createMaterialRequest: (data) =>
    api.post('/material-requests', data, { headers: { 'Content-Type': 'application/json' } }),
};

// -----------------------------
// � QUOTATIONS API
// -----------------------------
export const quotationsAPI = {
  getQuotations: (params = {}) => api.get('/quotations', { params }),
  getQuotationById: (id) => api.get(`/quotations/${id}`),
  createQuotation: (data) =>
    api.post('/quotations', data, { headers: { 'Content-Type': 'application/json' } }),
  getVendorQuotations: (params = {}) => api.get('/quotations/vendor/my-quotations', { params }),
  updateQuotation: (id, data) =>
    api.put(`/quotations/${id}`, data, { headers: { 'Content-Type': 'application/json' } }),
  // Deprecated endpoints - kept for backward compatibility but return 410
  // approveQuotation: (id) => api.put(`/quotations/${id}/approve`),
  // rejectQuotation: (id, data) => api.put(`/quotations/${id}/reject`, data),
  // addNote: (id, data) => api.post(`/quotations/${id}/notes`, data),
};

// -----------------------------
// �📁 FILES API
// -----------------------------
export const filesAPI = {
  getFiles: (params = {}) => api.get('/files', { params }),
  getProjectFiles: (projectId, category) =>
    api.get('/files', { params: { projectId, category } }),
  uploadFile: (formData) => api.post('/files/upload', formData, {
    // Don't set Content-Type manually - let axios/browser set it with correct boundary
    transformRequest: [(data) => data], // Prevent axios from transforming FormData
  }),
  uploadInvoice: (formData) => api.post('/files/upload/invoice', formData, {
    transformRequest: [(data) => data],
  }),
  deleteFile: (id) => api.delete(`/files/id/${id}`),
  getFileUrl: (filePath) => api.get('/files/download-url', { params: { path: filePath } }),
  downloadFile: async (fileUrl, filename) => {
    // For web, open in new tab
    if (typeof window !== 'undefined') {
      window.open(fileUrl, '_blank');
      return { success: true };
    }
    // For mobile, return the URL for native download handling
    return { success: true, url: fileUrl, filename };
  },
};

// -----------------------------
// 📊 PURCHASE ORDERS API
// -----------------------------
export const purchaseOrdersAPI = {
  getPurchaseOrders: (params = {}) => api.get('/purchase-orders', { params }),
  getPurchaseOrderById: (id) => api.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) =>
    api.post('/purchase-orders', data, { headers: { 'Content-Type': 'application/json' } }),
  // Vendor's own orders - backend filters by authenticated user role
  getMyOrders: (params = {}) => api.get('/purchase-orders', { params }),
  
  // Delivery status management
  updateDeliveryStatus: (orderId, deliveryData) =>
    api.put(`/purchase-orders/${orderId}/delivery-status`, deliveryData, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Negotiation chat messages
  getMessages: (orderId) => api.get(`/purchase-orders/${orderId}/messages`),
  sendMessage: (orderId, content, messageType = 'text') =>
    api.post(`/purchase-orders/${orderId}/messages`, { content, messageType }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  markMessagesRead: (orderId) => api.put(`/purchase-orders/${orderId}/mark-read`),
  
  // Quotation submission in negotiation chat
  submitQuotation: (orderId, quotationData) =>
    api.post(`/purchase-orders/${orderId}/quotation`, quotationData, {
      headers: { 'Content-Type': 'application/json' }
    }),
  acceptQuotation: (orderId, messageId) =>
    api.put(`/purchase-orders/${orderId}/quotation/${messageId}/accept`),
  rejectQuotation: (orderId, messageId, reason = '') =>
    api.put(`/purchase-orders/${orderId}/quotation/${messageId}/reject`, { reason }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Delivery details submission (after quotation accepted)
  submitDeliveryDetails: (orderId, deliveryDetails) =>
    api.post(`/purchase-orders/${orderId}/delivery-details`, deliveryDetails, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Admin delivery overview
  getDeliveryOverview: () => api.get('/purchase-orders/delivery-overview'),
  
  // Unread message count
  getUnreadCount: () => api.get('/purchase-orders/unread-count'),
};

// -----------------------------
// ⏱️ ATTENDANCE API
// -----------------------------
export const attendanceAPI = {
  checkIn: () => api.post('/attendance/check-in'),
  checkOut: () => api.post('/attendance/check-out'),
  heartbeat: (activeMinutes = 60) =>
    api.post('/attendance/heartbeat', { activeMinutes }),
  getStatus: () => api.get('/attendance/status'),
  getStats: (period = 'weekly') =>
    api.get('/attendance/stats', { params: { period } }),
  getEmployeeStats: (employeeId, period = 'weekly') =>
    api.get(`/attendance/employee/${employeeId}`, { params: { period } }),
  // Get attendance for a specific user (admin can fetch any employee, employee can fetch self)
  getEmployeeAttendance: (userId) => api.get('/attendance', { params: { userId } }),
};

// -----------------------------
// 📅 TASKS API
// -----------------------------
export const tasksAPI = {
  createTask: (data) => api.post('/tasks', data, {
    headers: { 'Content-Type': 'application/json' }
  }),
  getProjectTasks: (projectId, params = {}) =>
    api.get(`/tasks/project/${projectId}`, { params }),
  getUpcomingTasks: (days = 7) =>
    api.get('/tasks/upcoming', { params: { days } }),
  getTask: (taskId) => api.get(`/tasks/${taskId}`),
  updateTask: (taskId, data) => api.put(`/tasks/${taskId}`, data, {
    headers: { 'Content-Type': 'application/json' }
  }),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`),
  updateTaskStatus: (taskId, status) =>
    api.put(`/tasks/${taskId}/status`, { status }, {
      headers: { 'Content-Type': 'application/json' }
    }),
};

// -----------------------------
// 💰 INVOICES API
// -----------------------------
export const invoicesAPI = {
  createInvoice: (data) => api.post('/invoices', data, {
    headers: { 'Content-Type': 'application/json' }
  }),
  uploadInvoicePDF: (projectId, formData) =>
    api.post(`/invoices/project/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getProjectInvoices: (projectId, params = {}) =>
    api.get(`/invoices/project/${projectId}`, { params }),
  getClientInvoices: (clientId, params = {}) =>
    api.get(`/invoices/client/${clientId}`, { params }),
  getInvoice: (invoiceId) => api.get(`/invoices/${invoiceId}`),
  updateInvoice: (invoiceId, data) => api.put(`/invoices/${invoiceId}`, data, {
    headers: { 'Content-Type': 'application/json' }
  }),
  updateInvoiceStatus: (invoiceId, status, paymentMethod) =>
    api.put(`/invoices/${invoiceId}/status`, { status, paymentMethod }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  deleteInvoice: (invoiceId) => api.delete(`/invoices/${invoiceId}`),
  getInvoiceStats: (clientId) =>
    api.get('/invoices/stats/overview', { params: { clientId } }),
};

// -----------------------------
// 👥 CLIENTS API
// -----------------------------
export const clientsAPI = {
  getClients: (params = {}) => api.get('/clients', { params }),
  getClientById: (id) => api.get(`/clients/${id}`),
  getClient: (id) => api.get(`/clients/${id}`),  // Alias for getClientById
  getClientProjects: (clientId) => api.get(`/clients/${clientId}/projects`),
  getClientProjectInvoices: (clientId, projectId) =>
    api.get(`/clients/${clientId}/projects/${projectId}/invoices`),
  updateClient: (id, data) => api.put(`/clients/${id}`, data, {
    headers: { 'Content-Type': 'application/json' }
  }),

  // Client self-service endpoints (for logged-in clients to access their own data)
  getMyProjects: (params = {}) => api.get('/clients/me/projects', { params }),
  getMyProjectDetails: (projectId) => api.get(`/clients/me/projects/${projectId}`),
  getMyProjectMedia: (projectId, params = {}) =>
    api.get(`/clients/me/projects/${projectId}/media`, { params }),
  getMyProjectDocuments: (projectId) =>
    api.get(`/clients/me/projects/${projectId}/documents`),
};

// -----------------------------
// 📝 WORK STATUS API
// -----------------------------
export const workStatusAPI = {
  getWorkStatuses: (params = {}) => api.get('/work-status', { params }),
  getWorkStatusById: (id) => api.get(`/work-status/${id}`),
  createWorkStatus: (data) =>
    api.post('/work-status', data, { headers: { 'Content-Type': 'application/json' } }),
  updateWorkStatus: (id, data) =>
    api.put(`/work-status/${id}`, data, { headers: { 'Content-Type': 'application/json' } }),
};

// -----------------------------
// 💳 VENDOR INVOICES API
// -----------------------------
export const vendorInvoicesAPI = {
  getVendorInvoices: (params = {}) => api.get('/vendor-invoices', { params }),
  // Get invoices for current vendor (uses same endpoint, backend filters by role)
  getMyInvoices: (params = {}) => api.get('/vendor-invoices', { params }),
  getVendorInvoiceById: (id) => api.get(`/vendor-invoices/${id}`),
  getVendorInvoiceStats: () => api.get('/vendor-invoices/stats'),
  approveInvoice: (id) => api.put(`/vendor-invoices/${id}/approve`),
  recordPayment: (id, paymentData) =>
    api.post(`/vendor-invoices/${id}/payment`, paymentData, {
      headers: { 'Content-Type': 'application/json' }
    }),
  downloadInvoice: (id) => api.get(`/vendor-invoices/${id}/download`),
};

// -----------------------------
// 🔔 ORDERS API (for vendor/admin negotiation)
// -----------------------------
export const ordersAPI = {
  // Get all orders (filtered by user role on backend)
  getOrders: (params = {}) => api.get('/purchase-orders', { params }),
  
  // Get orders pending quotation review
  getOrdersPendingReview: () => api.get('/purchase-orders', { params: { status: 'in_negotiation' } }),
  
  // Get orders for a specific vendor
  getVendorOrders: (vendorId) => api.get('/purchase-orders', { params: { vendorId } }),
  
  // Get single order with all details
  getOrder: (orderId) => api.get(`/purchase-orders/${orderId}`),
  
  // Get negotiation messages
  getMessages: (orderId) => api.get(`/purchase-orders/${orderId}/messages`),
  
  // Send text message in negotiation chat
  sendMessage: (orderId, content) =>
    api.post(`/purchase-orders/${orderId}/messages`, { content, messageType: 'text' }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Submit quotation
  submitQuotation: (orderId, quotationData) =>
    api.post(`/purchase-orders/${orderId}/quotation`, quotationData, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Accept/Reject quotation
  acceptQuotation: (orderId, messageId) =>
    api.put(`/purchase-orders/${orderId}/quotation/${messageId}/accept`),
  rejectQuotation: (orderId, messageId, reason = '') =>
    api.put(`/purchase-orders/${orderId}/quotation/${messageId}/reject`, { reason }, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Create new order
  createOrder: (orderData) =>
    api.post('/purchase-orders', orderData, { headers: { 'Content-Type': 'application/json' } }),
  
  // Update order
  updateOrder: (orderId, updateData) =>
    api.put(`/purchase-orders/${orderId}`, updateData, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  // Mark messages as read
  markMessagesRead: (orderId) => api.put(`/purchase-orders/${orderId}/mark-read`),
  
  // Get unread count
  getUnreadCount: () => api.get('/purchase-orders/unread-count'),
};

// -----------------------------
// 🛎️ SERVICE REQUESTS API
// -----------------------------
export const serviceRequestsAPI = {
  // Get all service requests (filtered by role on backend)
  getServiceRequests: (params = {}) => api.get('/service-requests', { params }),
  
  // Get single service request
  getServiceRequest: (id) => api.get(`/service-requests/${id}`),
  
  // Create a new service request
  createServiceRequest: (data) =>
    api.post('/service-requests', data, { headers: { 'Content-Type': 'application/json' } }),
  
  // Update service request
  updateServiceRequest: (id, data) =>
    api.put(`/service-requests/${id}`, data, { headers: { 'Content-Type': 'application/json' } }),
  
  // Assign vendor to service request (admin only)
  assignVendor: (id, vendorId) =>
    api.put(`/service-requests/${id}/assign`, { vendorId }, { headers: { 'Content-Type': 'application/json' } }),
  
  // Update status
  updateStatus: (id, status) =>
    api.put(`/service-requests/${id}/status`, { status }, { headers: { 'Content-Type': 'application/json' } }),
  
  // Cancel request
  cancelRequest: (id, reason) =>
    api.put(`/service-requests/${id}/cancel`, { reason }, { headers: { 'Content-Type': 'application/json' } }),
  
  // Add comment/message
  addComment: (id, comment) =>
    api.post(`/service-requests/${id}/comments`, { comment }, { headers: { 'Content-Type': 'application/json' } }),
  
  // Get comments
  getComments: (id) => api.get(`/service-requests/${id}/comments`),
};

// -----------------------------
// Export Axios Instance & Base URL
// -----------------------------
export const API_BASE_URL = BASE_URL;
export default api;
