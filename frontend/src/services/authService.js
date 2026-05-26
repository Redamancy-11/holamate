import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : '/api/auth';

const authService = {
  // Đăng ký
  register: async (userData) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    if (response.data.token) {
      localStorage.setItem('hanomate_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Đăng nhập
  login: async (userData) => {
    const response = await axios.post(`${API_URL}/login`, userData);
    if (response.data.token) {
      localStorage.setItem('hanomate_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Đăng nhập mạng xã hội (Mock)
  socialLogin: async (userData) => {
    const response = await axios.post(`${API_URL}/social`, userData);
    if (response.data.token) {
      localStorage.setItem('hanomate_user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Đăng xuất
  logout: () => {
    localStorage.removeItem('hanomate_user');
  },

  // Lấy user hiện tại
  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('hanomate_user'));
  },
};

export default authService;
