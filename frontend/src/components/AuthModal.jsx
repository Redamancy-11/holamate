import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const AuthModal = () => {
  const { showAuthModal, setShowAuthModal, login, register } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'buyer' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const BACKEND_AUTH_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : '/api/auth';

  const handleSocialRedirect = (provider) => {
    window.location.href = `${BACKEND_AUTH_URL}/${provider}`;
  };

  if (!showAuthModal) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await register(formData);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại');
    }
    setIsLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(11,25,44,0.7)', backdropFilter: 'blur(10px)', padding: 20
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, width: '100%', maxWidth: 420, padding: 32, position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)', color: '#fff'
      }}>
        {/* Close button */}
        <button onClick={() => setShowAuthModal(false)} style={{
          position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none',
          width: 32, height: 32, borderRadius: '50%', color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
        }}>
          &times;
        </button>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', marginBottom: 24, color: '#fff' }}>
          {isLogin ? 'Welcome Back! 👋' : 'Join HanoMate 🏮'}
        </h2>

        {error && <div style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isLogin && (
            <input type="text" name="name" placeholder="Tên của bạn" value={formData.name} onChange={handleChange} required
              style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem' }} />
          )}
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required
            style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem' }} />
          <input type="password" name="password" placeholder="Mật khẩu" value={formData.password} onChange={handleChange} required minLength={6}
            style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem' }} />
          
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', paddingLeft: 4 }}>Bạn là:</label>
              <select name="role" value={formData.role} onChange={handleChange}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem', cursor: 'pointer' }}>
                <option value="buyer" style={{ background: '#0B192C', color: '#fff' }}>Người mua (Khách hàng)</option>
                <option value="seller" style={{ background: '#0B192C', color: '#fff' }}>Người bán (Chủ cửa hàng)</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={isLoading} style={{
            padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #1A56DB, #5B8FF9)', border: 'none',
            color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 8,
            opacity: isLoading ? 0.7 : 1, transition: 'all 0.2s'
          }}>
            {isLoading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Hoặc tiếp tục với</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Social Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => handleSocialRedirect('google')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px', borderRadius: 12, background: '#fff', border: 'none', color: '#333', fontWeight: 600, cursor: 'pointer' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="20" height="20" /> Google
          </button>
          <button onClick={() => handleSocialRedirect('facebook')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px', borderRadius: 12, background: '#1877F2', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook" width="20" height="20" /> Facebook
          </button>
          <button onClick={() => handleSocialRedirect('instagram')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px', borderRadius: 12, background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" alt="Instagram" width="20" height="20" /> Instagram
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <span onClick={() => setIsLogin(!isLogin)} style={{ color: '#60D5FA', fontWeight: 600, cursor: 'pointer' }}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
