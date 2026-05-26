import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (userData) => {
    const data = await authService.login(userData);
    setUser(data);
    setShowAuthModal(false);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    setUser(data);
    setShowAuthModal(false);
    return data;
  };

  const socialLogin = async (userData) => {
    const data = await authService.socialLogin(userData);
    setUser(data);
    setShowAuthModal(false);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        showAuthModal,
        setShowAuthModal,
        login,
        register,
        socialLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
