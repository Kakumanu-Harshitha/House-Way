/**
 * API Service - REAL BACKEND INTEGRATION
 * All mock data has been removed. This service connects to actual backend endpoints.
 * 
 * API Base URL is configured based on platform and environment.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerBaseUrl } from '../utils/network';

// ============ CONFIGURATION ============

const API_BASE_URL = getServerBaseUrl();

// ============ AUTH HELPERS ============

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('@houseway_token');
  } catch (e) {
    console.error('Error getting auth token:', e);
    return null;
  }
};

const getHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// ============ API REQUEST HELPER ============

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const headers = await getHeaders();
  
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // Some backend errors return HTML (e.g., 404). Avoid crashing on JSON.parse.
    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (parseError) {
      data = {
        success: false,
        message: `Non-JSON response (HTTP ${response.status})`,
        raw: raw?.slice(0, 200),
      };
    }
    
    if (!response.ok) {
      console.error('[API] Error response:', data);
      throw new Error(data.message || `HTTP ${response.status} Error`);
    }
    
    return data;
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
};

// ============ API SERVICE CLASS ============

class ApiService {
  // ============ USERS ============
  
  async getUsers(role = null) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    params.append('limit', '1000');
    
    const endpoint = `/users?${params.toString()}`;
    const response = await apiRequest(endpoint);
    
    // Backend returns { success: true, data: { users: [] } }
    return response.data?.users || [];
  }
  
  async getUserById(userId) {
    const response = await apiRequest(`/users/${userId}`);
    return response.data?.user || response.data || response;
  }
  
  async createUser(userData) {
    const role = userData?.role;

    // Backend does not expose POST /api/users. Owner workflows use auth registration endpoints.
    // - employee/vendor: owner-only endpoints (require auth)
    // - client/guest: public endpoints
    // - owner: not supported via UI
    let endpoint = '/auth/register';
    if (role === 'employee') endpoint = '/auth/register-employee';
    else if (role === 'vendor') endpoint = '/auth/register-vendor';
    else if (role === 'client') endpoint = '/auth/register-client';
    else if (role === 'guest') endpoint = '/auth/register-guest';
    else if (role === 'owner') {
      throw new Error('Creating owner accounts is not supported from this screen');
    }

    const response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data?.user || response;
  }
  
  async updateUser(userId, userData) {
    const response = await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data?.user || response;
  }
  
  async deleteUser(userId) {
    const response = await apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
    return response;
  }
  
  // ============ PROJECTS ============
  
  async getProjects(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.client) params.append('client', filters.client);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const endpoint = `/projects${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.projects || response.projects || [];
  }
  
  async getProjectById(projectId) {
    const response = await apiRequest(`/projects/${projectId}`);
    return response.data?.project || response.project || response;
  }
  
  async createProject(projectData) {
    const response = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
    return response.data?.project || response;
  }
  
  async updateProject(projectId, projectData) {
    const response = await apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
    return response.data?.project || response;
  }

  async getProjectTimeline(projectId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.visibility) params.append('visibility', filters.visibility);

    const qs = params.toString();
    const endpoint = `/projects/${projectId}/timeline${qs ? `?${qs}` : ''}`;
    const response = await apiRequest(endpoint);
    return response.data?.events || response.events || [];
  }

  async getRecentProjectTimelineUpdates(limit = 10, filters = {}) {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (filters.visibility) params.append('visibility', filters.visibility);

    const endpoint = `/projects/timeline/recent?${params.toString()}`;
    const response = await apiRequest(endpoint);
    return response.data?.events || response.events || [];
  }
  
  // ============ FINANCE - INVOICES ============
  
  async getInvoices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    
    const queryString = params.toString();
    const endpoint = `/invoices${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.invoices || response.invoices || [];
  }
  
  async getClientInvoices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.projectId) params.append('projectId', filters.projectId);
    
    const queryString = params.toString();
    const endpoint = `/invoices/client${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.invoices || response.invoices || [];
  }
  
  async getInvoiceById(invoiceId) {
    const response = await apiRequest(`/invoices/${invoiceId}`);
    return response.data?.invoice || response.invoice || response;
  }
  
  async createInvoice(invoiceData) {
    const response = await apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
    return response.data?.invoice || response;
  }
  
  async updateInvoice(invoiceId, updates) {
    const response = await apiRequest(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data?.invoice || response;
  }
  
  // ============ FINANCE - VENDOR INVOICES ============
  
  async getVendorInvoices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.vendor) params.append('vendor', filters.vendor);
    
    const queryString = params.toString();
    const endpoint = `/vendor-invoices${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.invoices || response.invoices || [];
  }
  
  async getMyVendorInvoices() {
    const response = await apiRequest('/vendor-invoices/my-invoices');
    return response.data?.invoices || response.invoices || [];
  }
  
  async getVendorInvoiceStats() {
    const response = await apiRequest('/vendor-invoices/stats');
    return response.data || response;
  }
  
  async generateVendorInvoice(orderId) {
    const response = await apiRequest('/vendor-invoices/generate', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
    return response.data?.invoice || response;
  }
  
  async approveVendorInvoice(invoiceId) {
    const response = await apiRequest(`/vendor-invoices/${invoiceId}/approve`, {
      method: 'PUT',
    });
    return response.data?.invoice || response;
  }
  
  async recordVendorPayment(invoiceId, paymentData) {
    const response = await apiRequest(`/vendor-invoices/${invoiceId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return response.data?.invoice || response;
  }
  
  // ============ FINANCE - RECEIVABLES & PAYABLES ============
  
  async getReceivables() {
    try {
      // Get client invoices that are pending/overdue
      const response = await apiRequest('/invoices');
      console.log('[API] Receivables response:', response);
      const invoices = response?.data?.invoices || response?.invoices || [];
      
      console.log('[API] Processing', invoices.length, 'receivable invoices');
      
      // Transform to receivables format (mapping clientId/projectId to client/project)
      const transformed = invoices.filter(inv => inv.status !== 'paid').map(inv => {
        const now = new Date();
        let computedStatus = inv.status || 'pending';
        try {
          if (inv.dueDate) {
            const due = new Date(inv.dueDate);
            if (computedStatus !== 'paid' && !['cancelled','refunded'].includes(computedStatus) && due < now) {
              computedStatus = 'overdue';
            }
          }
        } catch (e) {
          // Ignore parse errors and keep original status
        }

        return {
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          projectId: inv.projectId?._id || inv.projectId,
          projectName: inv.projectId?.title || 'Unknown Project',
          clientName: inv.clientId?.firstName ? `${inv.clientId.firstName} ${inv.clientId.lastName}` : 'Unknown Client',
          amount: inv.totalAmount || inv.amount || 0,
          dueDate: inv.dueDate,
          status: computedStatus,
          type: 'receivable',
          isSchedule: inv.isSchedule || false,
          installmentName: inv.installmentName || null
        };
      });
      
      console.log('[API] Transformed to', transformed.length, 'receivables');
      return transformed;
    } catch (error) {
      console.error('[API] getReceivables error:', error);
      throw error;
    }
  }
  
  async getPayables() {
    try {
      // Get vendor invoices that need payment
      const response = await apiRequest('/vendor-invoices');
      console.log('[API] Payables response:', response);
      const invoices = response?.data?.invoices || response?.invoices || [];
      
      console.log('[API] Processing', invoices.length, 'payable invoices');
      
      // Transform to payables format
      const transformed = invoices.filter(inv => inv.status !== 'paid').map(inv => ({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        vendorId: inv.vendor?._id || inv.vendor,
        vendorName: inv.vendor?.vendorDetails?.companyName || 
                    (inv.vendor?.firstName ? `${inv.vendor.firstName} ${inv.vendor.lastName}` : 'Unknown Vendor'),
        projectName: inv.project?.title || 'Vendor Payment',
        category: inv.vendor?.vendorDetails?.specialization || 'General',
        amount: inv.totalAmount || inv.amount || 0,
        dueDate: inv.dueDate,
        status: inv.status || 'pending',
        approvalStatus: inv.approvalStatus || 'pending',
        type: 'payable',
      }));
      
      console.log('[API] Transformed to', transformed.length, 'payables');
      return transformed;
    } catch (error) {
      console.error('[API] getPayables error:', error);
      throw error;
    }
  }
  
  // ============ MATERIAL REQUESTS ============
  
  async getMaterialRequests(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.project) params.append('project', filters.project);
    if (filters.limit) params.append('limit', String(filters.limit));
    
    const queryString = params.toString();
    const endpoint = `/material-requests${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.materialRequests || response.materialRequests || [];
  }
  
  async getMaterialRequestById(requestId) {
    const response = await apiRequest(`/material-requests/${requestId}`);
    return response.data?.materialRequest || response;
  }
  
  async createMaterialRequest(requestData) {
    const response = await apiRequest('/material-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
    return response.data?.materialRequest || response;
  }
  
  async approveMaterialRequest(requestId) {
    const response = await apiRequest(`/material-requests/${requestId}/approve`, {
      method: 'PUT',
    });
    return response.data || response;
  }
  
  async rejectMaterialRequest(requestId, reason) {
    const response = await apiRequest(`/material-requests/${requestId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    return response.data || response;
  }
  
  // ============ QUOTATIONS ============
  
  async getQuotations(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.vendor) params.append('vendor', filters.vendor);
    
    const queryString = params.toString();
    const endpoint = `/quotations${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.quotations || response.quotations || [];
  }
  
  async getQuotationById(quotationId) {
    const response = await apiRequest(`/quotations/${quotationId}`);
    return response.data?.quotation || response;
  }
  
  async approveQuotation(quotationId) {
    const response = await apiRequest(`/quotations/${quotationId}/approve`, {
      method: 'PATCH',
    });
    return response.data || response;
  }
  
  async rejectQuotation(quotationId, reason) {
    const response = await apiRequest(`/quotations/${quotationId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
    return response.data || response;
  }
  
  // ============ PURCHASE ORDERS ============
  
  async getPurchaseOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.vendor) params.append('vendor', filters.vendor);
    if (filters.project) params.append('project', filters.project);
    
    const queryString = params.toString();
    const endpoint = `/purchase-orders${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.purchaseOrders || response.purchaseOrders || [];
  }
  
  async getPurchaseOrderById(orderId) {
    const response = await apiRequest(`/purchase-orders/${orderId}`);
    return response.data?.purchaseOrder || response.purchaseOrder || response;
  }
  
  // ============ ATTENDANCE ============
  
  async getAttendance(userId, date = null) {
    try {
      const params = {};
      if (userId) params.userId = userId;
      if (date) params.date = date;
      
      const response = await apiRequest('/attendance', { params });
      
      // Return the data object with all attendance info
      return response.data?.data || response.data || {
        isCheckedIn: false,
        checkInTime: null,
        checkOutTime: null,
        totalActiveMinutes: 0,
        totalActiveHours: 0,
        lastHeartbeat: null,
      };
    } catch (error) {
      console.error('[Attendance API] getAttendance error:', error);
      return {
        isCheckedIn: false,
        checkInTime: null,
        checkOutTime: null,
        totalActiveMinutes: 0,
        totalActiveHours: 0,
        lastHeartbeat: null,
      };
    }
  }
  
  async getAllAttendance(filters = {}) {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const endpoint = `/attendance/all${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.attendanceRecords || response.data || [];
  }
  
  async checkIn() {
    const response = await apiRequest('/attendance/check-in', {
      method: 'POST',
    });
    return response.data || response;
  }
  
  async checkOut() {
    const response = await apiRequest('/attendance/check-out', {
      method: 'POST',
    });
    return response.data || response;
  }
  
  // ============ DASHBOARD ============
  
  async getDashboardStats(role = 'owner') {
    const endpoint = role === 'vendor' 
      ? '/dashboard/vendor-stats' 
      : role === 'client'
      ? '/dashboard/client-stats'
      : role === 'employee'
      ? '/dashboard/employee-stats'
      : '/dashboard/stats';
    
    const response = await apiRequest(endpoint);
    return response.data || response;
  }
  
  async getAdminOverview() {
    const response = await apiRequest('/dashboard/admin-overview');
    return response.data || response;
  }
  
  async getVendorOverview() {
    const response = await apiRequest('/dashboard/vendor-overview');
    return response.data || response;
  }
  
  async getRecentActivity(role = 'owner') {
    const params = new URLSearchParams();
    params.append('role', role);
    
    const response = await apiRequest(`/dashboard/recent-activity?${params.toString()}`);
    return response.data?.activities || response.activities || [];
  }
  
  // ============ TEAM STATS ============
  
  async getTeamStats() {
    try {
      const response = await apiRequest('/dashboard/admin-overview');
      const data = response.data || response;
      
      return {
        totalEmployees: data.summary?.users?.employees || 0,
        activeEmployees: data.summary?.users?.employees || 0,
        totalVendors: data.summary?.users?.vendors || 0,
        totalClients: data.summary?.users?.clients || 0,
        pendingVendorApprovals: data.alerts?.unreadMessages || 0,
        utilizationRate: 0,
      };
    } catch (error) {
      console.error('getTeamStats error:', error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalVendors: 0,
        totalClients: 0,
        pendingVendorApprovals: 0,
        utilizationRate: 0,
      };
    }
  }
  
  // ============ SERVICE REQUESTS ============
  
  async getServiceRequests(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.project) params.append('project', filters.project);
    
    const queryString = params.toString();
    const endpoint = `/service-requests${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.serviceRequests || response.serviceRequests || [];
  }
  
  async createServiceRequest(requestData) {
    const response = await apiRequest('/service-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
    return response.data?.serviceRequest || response;
  }
  
  // ============ TASKS ============
  
  async getTasks() {
    // Backend does not currently expose GET /api/tasks for all tasks.
    // Use getUpcomingTasks() or getProjectTasks(projectId).
    return [];
  }

  async getUpcomingTasks(days = 7) {
    const endpoint = `/tasks/upcoming?days=${encodeURIComponent(String(days))}`;
    const response = await apiRequest(endpoint);
    return response.data?.tasks || response.tasks || [];
  }

  async getProjectTasks(projectId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);

    const qs = params.toString();
    const endpoint = `/tasks/project/${projectId}${qs ? `?${qs}` : ''}`;
    const response = await apiRequest(endpoint);
    return response.data?.tasks || response.tasks || [];
  }
  
  async createTask(taskData) {
    const response = await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.data?.task || response;
  }
  
  async updateTask(taskId, updates) {
    const response = await apiRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data?.task || response;
  }

  // ============ INVOICES (Project) ============

  async getProjectInvoices(projectId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const qs = params.toString();
    const endpoint = `/invoices/project/${projectId}${qs ? `?${qs}` : ''}`;
    const response = await apiRequest(endpoint);
    return response.data?.invoices || response.invoices || [];
  }
  
  // ============ VENDOR CHATS (Legacy support - use ordersAPI for new code) ============
  
  async getVendorChats(vendorId) {
    // This is now handled by NegotiationMessage through ordersAPI
    // Keeping for backward compatibility
    console.warn('[API] getVendorChats is deprecated. Use ordersAPI.getMessages instead.');
    return [];
  }
  
  // ============ WORK STATUS ============
  
  async getWorkStatus(filters = {}) {
    const params = new URLSearchParams();
    if (filters.project) params.append('project', filters.project);
    if (filters.date) params.append('date', filters.date);
    
    const queryString = params.toString();
    const endpoint = `/work-status${queryString ? `?${queryString}` : ''}`;
    const response = await apiRequest(endpoint);
    
    return response.data?.workStatuses || response.workStatuses || [];
  }
  
  async createWorkStatus(statusData) {
    const response = await apiRequest('/work-status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    });
    return response.data?.workStatus || response;
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;

