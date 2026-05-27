import axios from 'axios';

const getAuthApiUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  if (url && url !== 'undefined') {
    return `${url}/auth`;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000/api/auth';
  }
  return '/api/auth';
};

const API_URL = getAuthApiUrl();

const authService = {
  // Đăng ký
  register: async (userData) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    if (response.data.token) {
      const key = response.data.role === 'seller' ? 'hanomate_seller_user' : 'hanomate_user';
      localStorage.setItem(key, JSON.stringify(response.data));
    }
    return response.data;
  },

  // Đăng nhập
  login: async (userData) => {
    const response = await axios.post(`${API_URL}/login`, userData);
    if (response.data.token) {
      const key = response.data.role === 'seller' ? 'hanomate_seller_user' : 'hanomate_user';
      localStorage.setItem(key, JSON.stringify(response.data));
    }
    return response.data;
  },

  // Đăng nhập mạng xã hội (Mock)
  socialLogin: async (userData) => {
    const response = await axios.post(`${API_URL}/social`, userData);
    if (response.data.token) {
      const key = response.data.role === 'seller' ? 'hanomate_seller_user' : 'hanomate_user';
      localStorage.setItem(key, JSON.stringify(response.data));
    }
    return response.data;
  },

  // Đăng xuất buyer
  logout: () => {
    localStorage.removeItem('hanomate_user');
  },

  // Đăng xuất seller
  logoutSeller: () => {
    localStorage.removeItem('hanomate_seller_user');
  },

  // Lấy user hiện tại (buyer)
  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('hanomate_user'));
  },

  // Lấy seller hiện tại
  getCurrentSellerUser: () => {
    return JSON.parse(localStorage.getItem('hanomate_seller_user'));
  },

  // Quên mật khẩu
  forgotPassword: async (email) => {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
  },

  // Đặt lại mật khẩu
  resetPassword: async (token, password) => {
    const response = await axios.post(`${API_URL}/reset-password`, { token, password });
    return response.data;
  },
};

export default authService;
