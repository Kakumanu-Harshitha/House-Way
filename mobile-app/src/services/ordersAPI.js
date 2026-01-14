/**
 * Orders & Negotiation API Module
 * Handles all API calls for orders, chat messages, quotations, and invoices
 * 
 * REAL BACKEND INTEGRATION - Connects to actual API endpoints
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../utils/network';

// Base API URL - matches main api.js configuration
const API_BASE_URL = getApiBaseUrl();

/**
 * Get auth headers with token
 */
const getHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem('@houseway_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  } catch (error) {
    console.error('[ordersAPI] Error getting token:', error);
    return {
      'Content-Type': 'application/json',
    };
  }
};

/**
 * Make API request with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await getHeaders();
  
  console.log(`[ordersAPI] ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[ordersAPI] Error response:', data);
      return {
        success: false,
        message: data.message || `HTTP ${response.status} Error`,
        error: data.error,
      };
    }
    
    return data;
  } catch (error) {
    console.error('[ordersAPI] Network error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      error: error.message,
    };
  }
};

/**
 * Orders API - Real Backend Integration
 */
export const ordersAPI = {
  /**
   * Get all orders (filtered by user role on backend)
   * @param {Object} filters - Optional filters (status, vendorId, projectId)
   */
  async getOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.project) params.append('project', filters.project);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    
    const queryString = params.toString();
    const endpoint = `/purchase-orders${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint);
  },
  
  /**
   * Get orders pending quotation review (for admin dashboard)
   * This is just a convenience method that filters by in_negotiation status
   */
  async getOrdersPendingReview() {
    return this.getOrders({ status: 'in_negotiation' });
  },
  
  /**
   * Get orders for a specific vendor (Admin use)
   * @param {string} vendorId - Vendor user ID
   */
  async getVendorOrders(vendorId) {
    const params = new URLSearchParams();
    params.append('vendorId', vendorId);
    const queryString = params.toString();
    return apiRequest(`/purchase-orders?${queryString}`);
  },
  
  /**
   * Get single order with all messages
   * @param {string} orderId - Order ID
   */
  async getOrder(orderId) {
    return apiRequest(`/purchase-orders/${orderId}`);
  },
  
  /**
   * Get messages for an order
   * @param {string} orderId - Order ID
   */
  async getMessages(orderId) {
    return apiRequest(`/purchase-orders/${orderId}/messages`);
  },
  
  /**
   * Send a text message in the negotiation chat
   * @param {string} orderId - Order ID
   * @param {string} content - Message content
   */
  async sendMessage(orderId, content) {
    return apiRequest(`/purchase-orders/${orderId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType: 'text' }),
    });
  },
  
  /**
   * Submit a quotation
   * @param {string} orderId - Order ID
   * @param {Object} quotationData - { amount, currency, note, items, validUntil, inResponseTo }
   */
  async submitQuotation(orderId, quotationData) {
    return apiRequest(`/purchase-orders/${orderId}/quotation`, {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  },
  
  /**
   * Accept a quotation (generates invoice)
   * @param {string} orderId - Order ID
   * @param {string} messageId - Quotation message ID
   */
  async acceptQuotation(orderId, messageId) {
    return apiRequest(`/purchase-orders/${orderId}/quotation/${messageId}/accept`, {
      method: 'PUT',
    });
  },
  
  /**
   * Reject a quotation
   * @param {string} orderId - Order ID
   * @param {string} messageId - Quotation message ID
   * @param {string} reason - Optional rejection reason
   */
  async rejectQuotation(orderId, messageId, reason = '') {
    return apiRequest(`/purchase-orders/${orderId}/quotation/${messageId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },
  
  /**
   * Create a new order (Admin only)
   * @param {Object} orderData - Order details
   */
  async createOrder(orderData) {
    return apiRequest('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  
  /**
   * Update an existing order
   * @param {string} orderId - Order ID
   * @param {Object} updateData - Fields to update
   */
  async updateOrder(orderId, updateData) {
    return apiRequest(`/purchase-orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },
  
  /**
   * Send order to vendor (starts negotiation)
   * @param {string} orderId - Order ID
   */
  async sendOrder(orderId) {
    return apiRequest(`/purchase-orders/${orderId}/send`, {
      method: 'PUT',
    });
  },
  
  /**
   * Mark order as completed
   * @param {string} orderId - Order ID
   */
  async completeOrder(orderId) {
    return apiRequest(`/purchase-orders/${orderId}/complete`, {
      method: 'PUT',
    });
  },
  
  /**
   * Get unread message count for current user
   */
  async getUnreadCount() {
    return apiRequest('/purchase-orders/unread-count');
  },
  
  /**
   * Mark messages as read
   * @param {string} orderId - Order ID
   */
  async markMessagesRead(orderId) {
    return apiRequest(`/purchase-orders/${orderId}/mark-read`, {
      method: 'PUT',
    });
  },
  
  // ============ DELIVERY TRACKING ============
  
  /**
   * Submit delivery details after quotation acceptance (Vendor only)
   * This generates invoice and closes chat
   * @param {string} orderId - Order ID
   * @param {Object} deliveryData - { estimatedDeliveryDate, trackingNumber, carrier, deliveryNotes }
   */
  async submitDeliveryDetails(orderId, deliveryData) {
    return apiRequest(`/purchase-orders/${orderId}/delivery-details`, {
      method: 'POST',
      body: JSON.stringify(deliveryData),
    });
  },
  
  /**
   * Update delivery status (Vendor only)
   * @param {string} orderId - Order ID
   * @param {Object} deliveryData - { status, trackingNumber, carrier, expectedArrival, notes }
   */
  async updateDeliveryStatus(orderId, deliveryData) {
    return apiRequest(`/purchase-orders/${orderId}/delivery-status`, {
      method: 'PUT',
      body: JSON.stringify(deliveryData),
    });
  },
  
  /**
   * Get delivery tracking details for an order
   * @param {string} orderId - Order ID
   */
  async getDeliveryTracking(orderId) {
    return apiRequest(`/purchase-orders/${orderId}/delivery-tracking`);
  },
  
  /**
   * Get all deliveries overview (Admin only)
   */
  async getDeliveryOverview() {
    return apiRequest('/purchase-orders/delivery-overview');
  },
  
  // ============ DASHBOARD DATA ============
  
  /**
   * Get admin dashboard overview
   */
  async getAdminDashboardOverview() {
    return apiRequest('/dashboard/admin-overview');
  },
  
  /**
   * Get vendor dashboard overview
   */
  async getVendorDashboardOverview() {
    return apiRequest('/dashboard/vendor-overview');
  },
  
  // ============ INVOICE OPERATIONS ============
  
  /**
   * Get invoice details
   */
  async getInvoice(invoiceId) {
    return apiRequest(`/vendor-invoices/${invoiceId}`);
  },
  
  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId) {
    return apiRequest(`/vendor-invoices/${invoiceId}/download`);
  },
};

export default ordersAPI;
