import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Mã xác nhận (token) không tồn tại hoặc không hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.resetPassword(token, password);
      setSuccess('Đặt lại mật khẩu thành công! Bạn sẽ được chuyển hướng về trang chủ sau 3 giây.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra trong quá trình đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B192C',
      padding: '40px 20px',
      color: '#fff',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        width: '100%',
        maxWidth: 440,
        padding: 40,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12, background: 'linear-gradient(135deg, #FFB800, #F27024)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Đặt lại mật khẩu 🔐
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: 30 }}>
          Nhập mật khẩu mới của bạn bên dưới
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: '0.85rem',
            marginBottom: 20,
            textAlign: 'left'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#A7F3D0',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: '0.85rem',
            marginBottom: 20,
            textAlign: 'left'
          }}>
            ✅ {success}
          </div>
        )}

        {!token ? (
          <div style={{ color: '#EF4444', fontWeight: 600, fontSize: '0.95rem' }}>
            Mã xác nhận (token) bị thiếu. Vui lòng sử dụng liên kết khôi phục mật khẩu hợp lệ.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>Mật khẩu mới</label>
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #F27024, #FFB800)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(242,112,36,0.3)',
                marginTop: 10
              }}
            >
              {loading ? 'Đang thực hiện...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
