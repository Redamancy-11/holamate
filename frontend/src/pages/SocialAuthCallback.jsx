import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const SocialAuthCallback = () => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [status, setStatus] = useState('Đang xác thực tài khoản...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const _id = params.get('_id');
    const name = params.get('name');
    const email = params.get('email');
    const avatar = params.get('avatar');
    const role = params.get('role') || 'buyer';
    const vendor_id = params.get('vendor_id') || '';

    if (token && _id && name && email) {
      const userData = { _id, name, email, avatar, role, vendor_id, token };
      localStorage.setItem('hanomate_user', JSON.stringify(userData));
      setUser(userData);
      setStatus('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/'), 1200);
    } else {
      setStatus('Không thể xác thực tài khoản. Vui lòng thử lại.');
    }
  }, [navigate, setUser]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0B1728', color: '#fff' }}>
      <div style={{ maxWidth: 520, textAlign: 'center', background: 'rgba(255,255,255,0.04)', padding: 32, borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: 16 }}>Xác thực đăng nhập</h1>
        <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#CBD5E1' }}>{status}</p>
      </div>
    </div>
  );
};

export default SocialAuthCallback;
