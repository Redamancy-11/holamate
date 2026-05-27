import React, { createContext, useState, useEffect, useRef } from 'react';
import authService from '../services/authService';
import { getMyOrders, getSellerOrders } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sellerUser, setSellerUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notificationClickedOrder, setNotificationClickedOrder] = useState(null);

  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('hanomate_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const lastOrdersRef = useRef({ buyer: [], seller: [] });

  // Load initial sessions
  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    const storedSeller = authService.getCurrentSellerUser();
    if (storedSeller) {
      setSellerUser(storedSeller);
    }
    setLoading(false);
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('hanomate_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (title, message, type, orderId, orderData = null) => {
    const newNotif = {
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      title,
      message,
      type, // 'buyer' or 'seller'
      orderId,
      orderData,
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  };

  const markAsRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Polling for Buyer Order Status Updates
  useEffect(() => {
    if (!user) {
      lastOrdersRef.current.buyer = [];
      return;
    }

    const pollBuyerOrders = async () => {
      try {
        const currentOrders = await getMyOrders();
        if (!Array.isArray(currentOrders)) return;

        const previousOrders = lastOrdersRef.current.buyer || [];
        
        // Populate initially if ref is empty so we don't trigger alerts for old history on mount
        if (previousOrders.length === 0) {
          lastOrdersRef.current.buyer = currentOrders;
          return;
        }

        currentOrders.forEach(order => {
          const prevOrder = previousOrders.find(o => o._id === order._id);
          if (prevOrder) {
            // Check status change
            if (prevOrder.status !== order.status) {
              const statusText = {
                pending: 'Chờ duyệt',
                preparing: 'Đang nấu món 🍳',
                delivering: 'Đang giao hàng 🚴‍♂️',
                completed: 'Hoàn thành ✅',
                cancelled: 'Đã hủy 🚫'
              };
              let cancelDetails = '';
              if (order.status === 'cancelled' && order.sellerNote) {
                cancelDetails = `. Lý do từ quán: ${order.sellerNote}`;
              }
              addNotification(
                'Cập nhật đơn hàng 🥡',
                `Đơn hàng #${order._id.substring(order._id.length - 6)} tại ${order.vendorName} đã chuyển sang: ${statusText[order.status] || order.status}${cancelDetails}`,
                'buyer',
                order._id,
                order
              );
            }
          } else {
            // New order placed
            addNotification(
              'Đặt hàng thành công! 🛒',
              `Đơn hàng #${order._id.substring(order._id.length - 6)} tại ${order.vendorName} đã gửi thành công.`,
              'buyer',
              order._id,
              order
            );
          }
        });

        lastOrdersRef.current.buyer = currentOrders;
      } catch (err) {
        console.warn('Notification polling error (buyer):', err.message);
      }
    };

    pollBuyerOrders();
    const interval = setInterval(pollBuyerOrders, 6000);
    return () => clearInterval(interval);
  }, [user]);

  // Polling for Seller New Orders & Cancellations
  useEffect(() => {
    if (!sellerUser) {
      lastOrdersRef.current.seller = [];
      return;
    }

    const pollSellerOrders = async () => {
      try {
        const currentOrders = await getSellerOrders();
        if (!Array.isArray(currentOrders)) return;

        const previousOrders = lastOrdersRef.current.seller || [];

        // Populate initially if ref is empty
        if (previousOrders.length === 0) {
          lastOrdersRef.current.seller = currentOrders;
          return;
        }

        currentOrders.forEach(order => {
          const prevOrder = previousOrders.find(o => o._id === order._id);
          if (prevOrder) {
            // If buyer cancels a pending order
            if (prevOrder.status !== order.status && order.status === 'cancelled') {
              addNotification(
                'Khách hàng hủy đơn 🚫',
                `Đơn hàng #${order._id.substring(order._id.length - 6)} từ ${order.customerName} đã bị khách hủy.`,
                'seller',
                order._id,
                order
              );
            }
          } else {
            // New order received
            addNotification(
              'Đơn hàng mới! ⚡',
              `Bạn có đơn hàng mới #${order._id.substring(order._id.length - 6)} từ ${order.customerName} tại ${order.deliveryAddress}.`,
              'seller',
              order._id,
              order
            );
          }
        });

        lastOrdersRef.current.seller = currentOrders;
      } catch (err) {
        console.warn('Notification polling error (seller):', err.message);
      }
    };

    pollSellerOrders();
    const interval = setInterval(pollSellerOrders, 6000);
    return () => clearInterval(interval);
  }, [sellerUser]);

  const login = async (userData) => {
    const data = await authService.login(userData);
    if (data.requires2fa) {
      return data;
    }
    if (data.role === 'seller') {
      setSellerUser(data);
    } else if (data.role === 'admin' || data.is_admin) {
      // Don't set normal user/seller for admin
    } else {
      setUser(data);
    }
    setShowAuthModal(false);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data.role === 'seller') {
      setSellerUser(data);
    } else {
      setUser(data);
    }
    setShowAuthModal(false);
    return data;
  };

  const socialLogin = async (userData) => {
    const data = await authService.socialLogin(userData);
    if (data.role === 'seller') {
      setSellerUser(data);
    } else {
      setUser(data);
    }
    setShowAuthModal(false);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const logoutSeller = () => {
    authService.logoutSeller();
    setSellerUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        sellerUser,
        setSellerUser,
        loading,
        showAuthModal,
        setShowAuthModal,
        login,
        register,
        socialLogin,
        logout,
        logoutSeller,
        notifications,
        addNotification,
        markAsRead,
        clearNotifications,
        notificationClickedOrder,
        setNotificationClickedOrder
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
