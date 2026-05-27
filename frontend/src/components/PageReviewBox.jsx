import React, { useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { submitPageReview } from '../services/api';

const PageReviewBox = () => {
  const location = useLocation();
  const { user, sellerUser } = useContext(AuthContext);

  // Determine current active user
  const loggedInUser = sellerUser || user;
  const detectedType = sellerUser ? 'seller' : 'buyer';

  const [userType, setUserType] = useState(detectedType);
  const [userName, setUserName] = useState(loggedInUser?.name || '');
  const [isAnonymous, setIsAnonymous] = useState(!loggedInUser);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Hidden on admin portal and callback pages
  const isHiddenPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth/callback');
  if (isHiddenPath) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setStatus({ type: 'error', message: 'Vui lòng nhập nội dung đánh giá.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        user_type: loggedInUser ? detectedType : userType,
        user_name: isAnonymous ? 'Người dùng ẩn danh' : (userName.trim() || 'Người dùng ẩn danh'),
        rating,
        comment: comment.trim(),
        page_path: location.pathname
      };

      await submitPageReview(payload);
      setStatus({ type: 'success', message: 'Cảm ơn đóng góp của bạn! Đánh giá đã được ghi nhận.' });
      setComment('');
      if (!loggedInUser) {
        setUserName('');
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại sau.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 800,
      margin: '60px auto 40px auto',
      padding: '28px 32px',
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: 24,
      fontFamily: "'Inter', sans-serif",
      color: '#fff',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        Góp ý trải nghiệm trang này 💬
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
        Phản hồi của bạn giúp chúng tôi cải thiện HanoMate tốt hơn mỗi ngày.
      </p>

      {status.message && (
        <div style={{
          background: status.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: status.type === 'success' ? '#A7F3D0' : '#FCA5A5',
          padding: '10px 14px',
          borderRadius: 12,
          fontSize: '0.85rem',
          marginBottom: 18
        }}>
          {status.type === 'success' ? '✅' : '⚠️'} {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Rating selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Đánh giá:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: star <= (hoverRating || rating) ? '#FFB800' : 'rgba(255,255,255,0.15)',
                  transition: 'color 0.15s ease'
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* User identification */}
        {!loggedInUser ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="userType"
                  value="buyer"
                  checked={userType === 'buyer'}
                  onChange={() => setUserType('buyer')}
                  style={{ accentColor: '#F27024' }}
                />
                Khách hàng 🥡
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="userType"
                  value="seller"
                  checked={userType === 'seller'}
                  onChange={() => setUserType('seller')}
                  style={{ accentColor: '#F27024' }}
                />
                Chủ quán 🍳
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                placeholder="Tên của bạn"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (isAnonymous) setIsAnonymous(false);
                }}
                disabled={isAnonymous}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.85rem',
                  width: 140,
                  opacity: isAnonymous ? 0.5 : 1
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', opacity: 0.7 }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ accentColor: '#F27024' }}
                />
                Ẩn danh
              </label>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Đánh giá với tư cách: <strong style={{ color: '#fff' }}>{loggedInUser.name}</strong> ({detectedType === 'seller' ? 'Chủ quán' : 'Khách hàng'})
          </div>
        )}

        {/* Comment textarea */}
        <textarea
          placeholder="Viết đánh giá của bạn về trang này tại đây..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          rows={3}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            outline: 'none',
            fontSize: '0.9rem',
            resize: 'vertical',
            lineHeight: '1.5'
          }}
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            alignSelf: 'flex-end',
            padding: '10px 24px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #F27024, #FFB800)',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(242,112,36,0.2)'
          }}
        >
          {loading ? 'Đang gửi...' : 'Gửi Đánh Giá'}
        </button>
      </form>
    </div>
  );
};

export default PageReviewBox;
