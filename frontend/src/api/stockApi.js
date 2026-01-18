// ================================
// API Module for Electron App
// Fully compatible with Electron preload API
// ================================

// Get API URL safely from preload.js
const API_URL =
  typeof window !== 'undefined' &&
  window.electronAPI &&
  typeof window.electronAPI.getApiUrl === 'function'
    ? window.electronAPI.getApiUrl()
    : 'https://stockmanager.up.railway.app/api';

// Generic fetch helper
const fetchWithErrorHandling = async (endpoint, options = {}) => {
  try {
    const url = `${API_URL}${endpoint}`;
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) return await response.json();
    if (contentType?.includes('application/pdf')) return await response.blob();
    return await response.text();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
};

// ================================
// AUTH API
// ================================
export const authApi = {
  login: (credentials) =>
    fetchWithErrorHandling('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  register: (userData) =>
    fetchWithErrorHandling('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
};

// ================================
// PRODUCTS API
// ================================
export const productApi = {
  getAll: (filters = {}) =>
    fetchWithErrorHandling(`/products?${new URLSearchParams(filters)}`),

  getAllProducts: () => fetchWithErrorHandling('/allproducts'),

  getLowStock: () => fetchWithErrorHandling('/products/low-stock'),

  getById: (id) => fetchWithErrorHandling(`/products/${id}`),

  create: (data) =>
    fetchWithErrorHandling('/products', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    fetchWithErrorHandling(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => fetchWithErrorHandling(`/products/${id}`, { method: 'DELETE' }),
};

// ================================
// CUSTOMERS API
// ================================
export const customerApi = {
  getAll: () => fetchWithErrorHandling('/customers'),

  getById: (id) => fetchWithErrorHandling(`/customers/${id}`),

  create: (data) =>
    fetchWithErrorHandling('/customers', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    fetchWithErrorHandling(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => fetchWithErrorHandling(`/customers/${id}`, { method: 'DELETE' }),
};

// ================================
// INVOICES API
// ================================
export const invoiceApi = {
  getAll: (filters = {}) =>
    fetchWithErrorHandling(`/invoices?${new URLSearchParams(filters)}`),

  getById: (id) => fetchWithErrorHandling(`/invoices/${id}`),

  create: (data) =>
    fetchWithErrorHandling('/invoices', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    fetchWithErrorHandling(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => fetchWithErrorHandling(`/invoices/${id}`, { method: 'DELETE' }),

  getPDF: (id) => fetchWithErrorHandling(`/invoices/${id}/pdf`),

  getByCustomer: (customerId) =>
    fetchWithErrorHandling(`/invoices/customer/${customerId}`),
};

// ================================
// ALERTS API
// ================================
export const alertApi = {
  getAll: () => fetchWithErrorHandling('/alerts'),

  getUnresolved: () => fetchWithErrorHandling('/alerts/unresolvedAlerts'),

  markResolved: (id) =>
    fetchWithErrorHandling(`/alerts/${id}/resolve`, { method: 'PUT' }),
};

// ================================
// PAYMENTS API
// ================================
export const paymentApi = {
  create: (data) =>
    fetchWithErrorHandling('/payments', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => fetchWithErrorHandling('/payments'),

  getByInvoice: (invoiceId) =>
    fetchWithErrorHandling(`/payments/invoice/${invoiceId}`),

  getById: (id) => fetchWithErrorHandling(`/payments/${id}`),

  update: (id, data) =>
    fetchWithErrorHandling(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => fetchWithErrorHandling(`/payments/${id}`, { method: 'DELETE' }),
};

// ================================
// EXPORT GENERIC FETCH
// ================================
export { fetchWithErrorHandling };
