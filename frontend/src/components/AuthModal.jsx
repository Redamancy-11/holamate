import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import authService from '../services/authService';

const AuthModal = () => {
  const { showAuthModal, setShowAuthModal, login, register } = useContext(AuthContext);
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot'
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'buyer' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');

  const getBackendAuthUrl = () => {
    const url = import.meta.env.VITE_API_URL;
    if (url && url !== 'undefined') {
      return `${url}/auth`;
    }
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:5000/api/auth';
    }
    return '/api/auth';
  };

  const BACKEND_AUTH_URL = getBackendAuthUrl();

  const handleSocialRedirect = (provider) => {
    window.location.href = `${BACKEND_AUTH_URL}/${provider}`;
  };

  if (!showAuthModal) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
    setResetUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setResetUrl('');
    try {
      if (view === 'login') {
        const data = await login({ 
          email: formData.email, 
          password: formData.password,
          code: requires2fa ? verificationCode : undefined
        });
        
        if (data.requires2fa) {
          setRequires2fa(true);
          setDevCodeHint(data.devCode || '');
          setSuccess('Mã xác thực đã được gửi về email của bạn!');
          setIsLoading(false);
          return;
        }

        if (data.role === 'admin' || data.is_admin) {
          localStorage.setItem('hanomate_admin_user', JSON.stringify(data));
          window.location.href = '/admin';
          return;
        }
      } else if (view === 'register') {
        await register(formData);
      } else if (view === 'forgot') {
        const data = await authService.forgotPassword(formData.email);
        setSuccess(data.message || 'Mã khôi phục đã được tạo (giả lập).');
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại');
    }
    setIsLoading(false);
  };

  const renderTitle = () => {
    if (view === 'login') return 'Welcome Back! 👋';
    if (view === 'register') return 'Join HanoMate 🏮';
    return 'Quên mật khẩu 🔑';
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
        <button onClick={() => { setShowAuthModal(false); setView('login'); setError(''); setSuccess(''); setResetUrl(''); }} style={{
          position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none',
          width: 32, height: 32, borderRadius: '50%', color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
        }}>
          &times;
        </button>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', marginBottom: 24, color: '#fff' }}>
          {renderTitle()}
        </h2>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', padding: '10px 14px',
            borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, border: '1px solid rgba(239,68,68,0.3)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.2)', color: '#A7F3D0', padding: '10px 14px',
            borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, border: '1px solid rgba(16,185,129,0.3)'
          }}>
            {success}
            {resetUrl && (
              <div style={{ marginTop: 10, padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <a
                  href={resetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowAuthModal(false)}
                  style={{ color: '#60D5FA', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', wordBreak: 'break-all' }}
                >
                  Ấn vào đây để đặt lại mật khẩu của bạn ➡️
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {view === 'register' && (
            <input type="text" name="name" placeholder="Tên của bạn" value={formData.name} onChange={handleChange} required
              style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem' }} />
          )}
          
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required disabled={requires2fa}
            style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem', opacity: requires2fa ? 0.5 : 1 }} />
          
          {view !== 'forgot' && (
            <input type="password" name="password" placeholder="Mật khẩu" value={formData.password} onChange={handleChange} required minLength={6} disabled={requires2fa}
              style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', fontSize: '0.95rem', opacity: requires2fa ? 0.5 : 1 }} />
          )}

          {requires2fa && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600, paddingLeft: 4 }}>Mã xác thực bảo mật (2FA):</label>
              <input type="text" placeholder="123456" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required maxLength={6}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#fff', outline: 'none', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '4px', textAlign: 'center' }} />
            </div>
          )}

          {requires2fa && devCodeHint && (
            <div style={{ padding: '10px', background: 'rgba(242,112,36,0.15)', border: '1px solid rgba(242,112,36,0.3)', borderRadius: 12, fontSize: '0.8rem', color: '#F7A072' }}>
              Mã test nhanh: <strong>{devCodeHint}</strong> (Đã được lưu vào <code>admin_2fa_code.txt</code>)
            </div>
          )}

          {view === 'login' && !requires2fa && (
            <span
              onClick={() => { setView('forgot'); setError(''); setSuccess(''); setResetUrl(''); }}
              style={{ alignSelf: 'flex-end', fontSize: '0.8rem', color: '#60D5FA', cursor: 'pointer', fontWeight: 500, marginTop: -4 }}
            >
              Quên mật khẩu?
            </span>
          )}
          
          {view === 'register' && (
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
            {isLoading ? 'Đang xử lý...' : (view === 'login' ? 'Đăng nhập' : view === 'register' ? 'Đăng ký' : 'Gửi yêu cầu')}
          </button>
        </form>

        {view !== 'forgot' && !requires2fa && (
          <>
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
            </div>
          </>
        )}

        {!requires2fa && (
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            {view === 'forgot' ? (
              <span onClick={() => { setView('login'); setError(''); setSuccess(''); setResetUrl(''); }} style={{ color: '#60D5FA', fontWeight: 600, cursor: 'pointer' }}>
                Quay lại Đăng nhập
              </span>
            ) : (
              <>
                {view === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                <span onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); setResetUrl(''); }} style={{ color: '#60D5FA', fontWeight: 600, cursor: 'pointer' }}>
                  {view === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
