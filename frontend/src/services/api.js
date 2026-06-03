import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const isAdminRequest = config.url.includes('/admin');
  const roleHint = config.headers?.['X-Role-Hint'];
  const isSellerRequest = config.url.includes('/seller') || config.url.includes('/bulk-hide') || roleHint === 'seller';

  let storageKey = 'hanomate_user';
  if (isAdminRequest) {
    storageKey = 'hanomate_admin_user';
  } else if (isSellerRequest) {
    storageKey = 'hanomate_seller_user';
  }

  let stored = localStorage.getItem(storageKey);
  // Fallback: if primary key has no token, try the other one
  if (!stored && isSellerRequest) {
    stored = localStorage.getItem('hanomate_user');
  }
  if (!stored && !isSellerRequest && !isAdminRequest) {
    stored = localStorage.getItem('hanomate_seller_user');
  }
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch {
      // ignore invalid localStorage data
    }
  }
  // Clean up custom header before sending
  if (roleHint) {
    delete config.headers['X-Role-Hint'];
  }
  return config;
});

// AI endpoints
export const chatWithAI = async (message, history = [], location = null) => {
  const { data } = await api.post('/ai/chat', { message, history, location });
  return data;
};

export const generateItinerary = async (params) => {
  const { data } = await api.post('/ai/itinerary', params);
  return data;
};

export const checkPrice = async (query) => {
  const { data } = await api.post('/ai/price-check', { query });
  return data;
};

export const getSuggestions = async (type = 'all', limit = 6) => {
  const { data } = await api.get(`/ai/suggest?type=${type}&limit=${limit}`);
  return data;
};

// Vendors (backend)
export const getVendors = async () => {
  const { data } = await api.get('/vendors');
  return data;
};

// Fetch vendor details by ID
export const getVendorById = async (id) => {
  const { data } = await api.get(`/vendors/${id}`);
  return data;
};

export const postLocationPing = async (payload) => {
  const { data } = await api.post('/location', payload);
  return data;
};

export const detectIpLocation = async () => {
  const { data } = await api.get('/location/detect-ip');
  return data;
};

// Streaming: returns an EventSource-like fetch stream
export const streamChat = async (message, history = [], onChunk, onDone, onError, location = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, location }),
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') { onDone?.(); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) onChunk?.(parsed.chunk);
            if (parsed.error) onError?.(parsed.error);
          } catch (_) { }
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err.message);
  }
};

// Price reports
export const submitPriceReport = async (reportData) => {
  const { data } = await api.post('/reports', reportData);
  return data;
};

export const getReports = async () => {
  const { data } = await api.get('/reports');
  return data;
};

// Orders (ShopeeFood integration)
export const createOrder = async (orderData) => {
  const { data } = await api.post('/orders', orderData);
  return data;
};

export const getOrderById = async (id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
};

// Buyer: get my order history (requires login)
export const getMyOrders = async () => {
  const { data } = await api.get('/orders/my');
  return data;
};

// Seller & Admin Dashboard API functions
export const getOrdersByVendor = async (vendorId, includeHidden = false) => {
  const { data } = await api.get(`/orders?vendorId=${vendorId}&includeHidden=${includeHidden}`);
  return data;
};

// Seller: get orders for my store (requires login as seller)
export const getSellerOrders = async (includeHidden = false) => {
  const { data } = await api.get(`/orders/seller?includeHidden=${includeHidden}`);
  return data;
};

export const bulkHideOrders = async (range) => {
  const { data } = await api.post('/orders/bulk-hide', { range });
  return data;
};

export const updateOrderStatus = async (id, status, sellerNote = undefined) => {
  const { data } = await api.put(`/orders/${id}/status`, { status, sellerNote });
  return data;
};

export const updateVendorMenu = async (vendorId, menu) => {
  const { data } = await api.patch(`/admin/vendors/${vendorId}/menu`, { menu });
  return data;
};

export const updateVendorInfo = async (vendorId, info) => {
  const { data } = await api.put(`/admin/vendors/${vendorId}`, info);
  return data;
};

export const updateVendor = async (vendorId, vendorData) => {
  const { data } = await api.put(`/vendors/${vendorId}`, vendorData);
  return data;
};

export const scanVendorMenu = async (vendorId, payload) => {
  const { data } = await api.post(`/admin/vendors/${vendorId}/scan-menu`, payload);
  return data;
};

export const deleteOrder = async (id, role = null) => {
  const headers = {};
  if (role) headers['X-Role-Hint'] = role;
  const { data } = await api.delete(`/orders/${id}`, { headers });
  return data;
};

// ===================== ADMIN DASHBOARD API =====================
const adminHeaders = () => {
  const stored = localStorage.getItem('hanomate_admin_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) return { Authorization: `Bearer ${parsed.token}` };
    } catch { }
  }
  return {};
};
export const adminLogin = async (email, password, code = undefined) => {
  const { data } = await api.post('/admin/login', { email, password, code });
  return data;
};
export const getAdminStats = async () => {
  const { data } = await api.get('/admin/dashboard/stats', { headers: adminHeaders() });
  return data;
};

export const getAdminUsers = async (search = '') => {
  const { data } = await api.get(`/admin/dashboard/users?search=${encodeURIComponent(search)}`, { headers: adminHeaders() });
  return data;
};

export const updateAdminUser = async (userId, updates) => {
  const { data } = await api.put(`/admin/dashboard/users/${userId}`, updates, { headers: adminHeaders() });
  return data;
};

export const deleteAdminUser = async (userId) => {
  const { data } = await api.delete(`/admin/dashboard/users/${userId}`, { headers: adminHeaders() });
  return data;
};

export const getAdminSellers = async (search = '') => {
  const { data } = await api.get(`/admin/dashboard/sellers?search=${encodeURIComponent(search)}`, { headers: adminHeaders() });
  return data;
};

export const updateAdminSeller = async (sellerId, updates) => {
  const { data } = await api.put(`/admin/dashboard/sellers/${sellerId}`, updates, { headers: adminHeaders() });
  return data;
};

export const deleteAdminSeller = async (sellerId) => {
  const { data } = await api.delete(`/admin/dashboard/sellers/${sellerId}`, { headers: adminHeaders() });
  return data;
};

export const getAdminVendors = async (search = '', category = '') => {
  const { data } = await api.get(`/admin/dashboard/vendors?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`, { headers: adminHeaders() });
  return data;
};

export const updateAdminVendor = async (vendorId, updates) => {
  const { data } = await api.put(`/admin/dashboard/vendors/${encodeURIComponent(vendorId)}`, updates, { headers: adminHeaders() });
  return data;
};

export const deleteAdminVendor = async (vendorId) => {
  const { data } = await api.delete(`/admin/dashboard/vendors/${encodeURIComponent(vendorId)}`, { headers: adminHeaders() });
  return data;
};

export const getAdminOrders = async (status = 'all', search = '', page = 1) => {
  const { data } = await api.get(`/admin/dashboard/orders?status=${status}&search=${encodeURIComponent(search)}&page=${page}`, { headers: adminHeaders() });
  return data;
};

export const updateAdminOrder = async (orderId, updates) => {
  const { data } = await api.put(`/admin/dashboard/orders/${encodeURIComponent(orderId)}`, updates, { headers: adminHeaders() });
  return data;
};

export const getAdminFinance = async () => {
  const { data } = await api.get('/admin/dashboard/finance', { headers: adminHeaders() });
  return data;
};

export const updateAdminCommission = async (vendorId, commission_rate) => {
  const { data } = await api.put(`/admin/dashboard/finance/commission/${encodeURIComponent(vendorId)}`, { commission_rate }, { headers: adminHeaders() });
  return data;
};

export const getAdminAdmins = async () => {
  const { data } = await api.get('/admin/dashboard/admins', { headers: adminHeaders() });
  return data;
};

export const createAdminAdmin = async (name, email, password) => {
  const { data } = await api.post('/admin/dashboard/admins', { name, email, password }, { headers: adminHeaders() });
  return data;
};

export const deleteAdminAdmin = async (adminId) => {
  const { data } = await api.delete(`/admin/dashboard/admins/${encodeURIComponent(adminId)}`, { headers: adminHeaders() });
  return data;
};

export const setAdminVendorPartner = async (vendorId, sellerDetails) => {
  const { data } = await api.put(`/admin/dashboard/vendors/partner/${encodeURIComponent(vendorId)}`, sellerDetails, { headers: adminHeaders() });
  return data;
};

export const submitPageReview = async (reviewData) => {
  const { data } = await api.post('/reviews', reviewData);
  return data;
};

export const getRandomPageReviews = async () => {
  const { data } = await api.get('/reviews/random');
  return data;
};

// ===================== STUDENT STORE API =====================
export const getStudentStoreMy = async () => {
  const { data } = await api.get('/student-store/my');
  return data;
};

export const updateStudentStoreMy = async (storeData) => {
  const { data } = await api.put('/student-store/my', storeData);
  return data;
};

export const addStudentStoreMenuItem = async (menuItem) => {
  const { data } = await api.post('/student-store/menu', menuItem);
  return data;
};

export const updateStudentStoreMenuItem = async (itemId, menuItem) => {
  const { data } = await api.put(`/student-store/menu/${itemId}`, menuItem);
  return data;
};

export const deleteStudentStoreMenuItem = async (itemId) => {
  const { data } = await api.delete(`/student-store/menu/${itemId}`);
  return data;
};

export const getStudentStoreOrders = async () => {
  const { data } = await api.get('/student-store/orders');
  return data;
};

export const updateStudentStoreOrderStatus = async (orderId, status) => {
  const { data } = await api.put(`/student-store/orders/${orderId}/status`, { status });
  return data;
};

// ===================== COMMUNITY REVIEWS API =====================
export const getCommunityReviews = async (params = {}) => {
  const { data } = await api.get('/community-reviews', { params });
  return data;
};

export const createCommunityReview = async (reviewData) => {
  const { data } = await api.post('/community-reviews', reviewData);
  return data;
};

export const voteCommunityReview = async (reviewId, rating) => {
  const { data } = await api.post(`/community-reviews/${reviewId}/vote`, { rating });
  return data;
};

export const reportCommunityReview = async (reviewId, reportData) => {
  const { data } = await api.post(`/community-reviews/${reviewId}/report`, reportData);
  return data;
};

// Admin Review moderation
export const adminGetCommunityReviews = async () => {
  const { data } = await api.get('/admin/dashboard/community-reviews', { headers: adminHeaders() });
  return data;
};

export const adminGetReviewReports = async (reviewId) => {
  const { data } = await api.get(`/admin/dashboard/community-reviews/${reviewId}/reports`, { headers: adminHeaders() });
  return data;
};

export const adminModerateReview = async (reviewId, status) => {
  const { data } = await api.put(`/admin/dashboard/community-reviews/${reviewId}`, { status }, { headers: adminHeaders() });
  return data;
};

// ===================== STUDENT STORES PUBLIC API =====================
export const getStudentStoresPublic = async () => {
  const { data } = await api.get('/student-store/public');
  return data;
};

export const getStudentStorePublicById = async (id) => {
  const { data } = await api.get(`/student-store/public/${id}`);
  return data;
};

// ===================== USER PROFILE & COMPLAINTS API =====================
export const updateUserProfile = async (profileData) => {
  const { data } = await api.put('/auth/profile', profileData);
  return data;
};

export const requestStudentVerification = async (verifyData) => {
  const { data } = await api.post('/auth/student-verify', verifyData);
  return data;
};

export const reportAccount = async (reportData) => {
  const { data } = await api.post('/auth/report-account', reportData);
  return data;
};

// ===================== ADMIN EXTENDED MODERATION API =====================
export const getAdminStudentVerifications = async () => {
  const { data } = await api.get('/admin/dashboard/student-verifications', { headers: adminHeaders() });
  return data;
};

export const moderateAdminStudentVerification = async (userId, status) => {
  const { data } = await api.put(`/admin/dashboard/student-verifications/${userId}`, { status }, { headers: adminHeaders() });
  return data;
};

export const getAdminAccountReports = async () => {
  const { data } = await api.get('/admin/dashboard/account-reports', { headers: adminHeaders() });
  return data;
};

export const moderateAdminAccountReport = async (reportId, status) => {
  const { data } = await api.put(`/admin/dashboard/account-reports/${reportId}`, { status }, { headers: adminHeaders() });
  return data;
};

export const restrictAdminUser = async (userId, restrictionData) => {
  const { data } = await api.put(`/admin/dashboard/users/${userId}/restrict`, restrictionData, { headers: adminHeaders() });
  return data;
};

export const restrictAdminSeller = async (sellerId, restrictionData) => {
  const { data } = await api.put(`/admin/dashboard/sellers/${sellerId}/restrict`, restrictionData, { headers: adminHeaders() });
  return data;
};

export const getAdminMediaItems = async () => {
  const { data } = await api.get('/admin/dashboard/media', { headers: adminHeaders() });
  return data;
};

export const moderateAdminMediaItem = async (mediaId, status) => {
  const { data } = await api.put(`/admin/dashboard/media/${mediaId}`, { status }, { headers: adminHeaders() });
  return data;
};

export default api;

