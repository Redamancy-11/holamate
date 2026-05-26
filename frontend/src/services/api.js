import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const roleHint = config.headers?.['X-Role-Hint'];
  const isSellerRequest = config.url.includes('/seller') || config.url.includes('/admin')
    || config.url.includes('/bulk-hide') || roleHint === 'seller';
  const storageKey = isSellerRequest ? 'hanomate_seller_user' : 'hanomate_user';
  let stored = localStorage.getItem(storageKey);
  // Fallback: if primary key has no token, try the other one
  if (!stored && isSellerRequest) {
    stored = localStorage.getItem('hanomate_user');
  }
  if (!stored && !isSellerRequest) {
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
          } catch (_) {}
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

export default api;
