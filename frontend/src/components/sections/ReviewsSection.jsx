import React, { useState, useEffect } from 'react';
import { getRandomPageReviews } from '../../services/api';

const defaultBuyerMock = [
  { user_name: 'Tuấn Anh', rating: 5, comment: 'HolaMate cứu cánh mình mỗi kỳ học quân sự luôn! AI gợi ý các quán bún chả, cơm tấm siêu rẻ quanh Tân Xã mà đi bộ từ KTX cũng gần.', created_at: new Date().toISOString() },
  { user_name: 'Khánh Linh', rating: 5, comment: 'Thích nhất tính năng gợi ý cafe học nhóm. Nhờ HolaMate mà mình biết đến Bay Coffee ở Tân Xã có view hồ siêu chill.', created_at: new Date().toISOString() }
];

const defaultSellerMock = [
  { user_name: 'Chủ Quán Bún Chả', rating: 5, comment: 'Doanh thu quán bún chả của tôi tăng vọt từ khi lên đối tác HolaMate. Giao diện quản lý đơn rất mượt và trực quan.', created_at: new Date().toISOString() }
];

const Stars = ({ n }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[...Array(n)].map((_, i) => <span key={i} style={{ color: '#FFB800', fontSize: '.9rem' }}>★</span>)}
  </div>
);

const ReviewsSection = () => {
  const [buyerReviews, setBuyerReviews] = useState([]);
  const [sellerReviews, setSellerReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getRandomPageReviews();
        if (data.success) {
          setBuyerReviews(data.buyerReviews.length > 0 ? data.buyerReviews : defaultBuyerMock);
          setSellerReviews(data.sellerReviews.length > 0 ? data.sellerReviews : defaultSellerMock);
        } else {
          setBuyerReviews(defaultBuyerMock);
          setSellerReviews(defaultSellerMock);
        }
      } catch (err) {
        console.warn('Failed to fetch page reviews, using mock data:', err);
        setBuyerReviews(defaultBuyerMock);
        setSellerReviews(defaultSellerMock);
      }
    };
    fetchReviews();
  }, []);

  const renderReviewCard = (r, idx, colorTheme) => {
    // Generate initials for avatar
    const initials = r.user_name ? r.user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
    
    return (
      <div 
        key={r.id || idx} 
        className="reveal" 
        style={{
          padding: '20px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
          cursor: 'default',
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; 
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.borderColor = colorTheme;
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; 
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 38, 
              height: 38, 
              borderRadius: '50%', 
              background: `${colorTheme}22`, 
              border: `1.5px solid ${colorTheme}50`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 800, 
              fontSize: '.75rem', 
              color: colorTheme, 
              flexShrink: 0 
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#fff' }}>
                {r.user_name}
              </div>
              <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,0.45)' }}>
                {r.page_path ? `Tại trang: ${r.page_path}` : 'Giao diện chính'}
              </div>
            </div>
          </div>
          <Stars n={r.rating || 5} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.82rem', lineHeight: 1.6, margin: 0 }}>
          "{r.comment}"
        </p>
      </div>
    );
  };

  return (
    <section id="reviews" style={{ padding: '80px 0', background: 'transparent' }}>
      <div className="container">
        <div className="section-header reveal" style={{ marginBottom: 48 }}>
          <span className="badge" style={{ marginBottom: 14, background: 'rgba(242,112,36,0.15)', color: '#F27024', borderColor: 'rgba(242,112,36,0.3)' }}>⭐ Đánh Giá</span>
          <h2 style={{ color: '#fff' }}>Cảm nhận từ <span style={{ background: 'linear-gradient(135deg,#F27024,#FF9800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Cộng Đồng FPTU</span></h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>HanoMate kết nối khách hàng sinh viên và chủ cửa hàng Hòa Lạc.</p>
        </div>

        {/* Stats */}
        <div className="reveal" style={{ display: 'flex', justifyContent: 'center', gap: 56, marginBottom: 56, flexWrap: 'wrap' }}>
          {[['4.9', '★ Đánh Giá', '#FF9800'], ['1K+', 'Người Dùng', '#F27024'], ['98%', 'Hài Lòng', '#10B981']].map(([val, lbl, col]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: col, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.03em' }}>{val}</div>
              <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Split review columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40 }}>
          {/* Buyer reviews column */}
          <div>
            <h3 style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#F27024', 
              marginBottom: 20, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              borderBottom: '2px solid rgba(242,112,36,0.15)', 
              paddingBottom: 10 
            }}>
              Khách hàng chia sẻ 🥡
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {buyerReviews.map((r, i) => renderReviewCard(r, i, '#F27024'))}
            </div>
          </div>

          {/* Seller reviews column */}
          <div>
            <h3 style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#10B981', 
              marginBottom: 20, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              borderBottom: '2px solid rgba(16,185,129,0.15)', 
              paddingBottom: 10 
            }}>
              Đối tác chủ quán chia sẻ 🍳
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {sellerReviews.map((r, i) => renderReviewCard(r, i, '#10B981'))}
            </div>
          </div>
        </div>

        <div className="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
          {['Featured on FPTU Forum', 'Top App Student 2026', 'Google AI Partner', 'Verified by Holaers'].map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: '.82rem', fontWeight: 500 }}>
              <span style={{ color: '#F27024' }}>✦</span> {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
