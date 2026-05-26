import React from 'react';
import { Link } from 'react-router-dom';

// Ảnh Hồ Tân Xã làm nền cho demo block
const TAN_XA_BG = '/images/tan_xa.png';

const steps = [
  { icon: '📍', title: 'Chia Sẻ Vị Trí', desc: 'Bật định vị GPS để tự động tìm các quán ăn, tiệm cafe ngon gần bạn nhất tại Hola.', color: '#F27024' },
  { icon: '🤖', title: 'AI Gợi Ý Món Ngon', desc: 'Trò chuyện nhờ AI Hola gợi ý món ăn, trà sữa học nhóm hợp túi tiền và sở thích của bạn.', color: '#FF9800' },
  { icon: '💰', title: 'Review Minh Bạch', desc: 'Nhận đánh giá ưu/nhược điểm trung thực kèm bảng giá thực tế tổng hợp từ TikTok & cộng đồng.', color: '#10B981' },
  { icon: '🛒', title: 'Đặt Món Giao Ngay', desc: 'Trỏ vào bản đồ xem menu, lên đơn order và shop sẽ giao đồ ăn tận tay bạn.', color: '#A78BFA' },
];

const HowItWorksSection = () => (
  <section id="how-it-works" style={{ padding: '80px 0', background: 'transparent' }}>
    <div className="container">
      <div className="section-header reveal" style={{ marginBottom: 60 }}>
        <span className="badge" style={{ marginBottom: 14, background: 'rgba(242,112,36,0.15)', color: '#F27024', borderColor: 'rgba(242,112,36,0.3)' }}>⚡ Cách Hoạt Động</span>
        <h2 style={{ color: '#fff' }}>Khám Phá Ẩm Thực Hola & Đặt Món Dễ Dàng<br /><span style={{ background: 'linear-gradient(135deg,#F27024,#FF9800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Chỉ 4 Bước Đơn Giản</span></h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>Từ tìm quán ngon, đọc review chân thực đến đặt món giao tận nơi chỉ trong 30 giây.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, position: 'relative' }}>
        {steps.map((s, i) => (
          <div key={i} className="reveal" style={{ textAlign: 'center', animationDelay: `${i * 0.15}s` }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: `${s.color}18`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: '2rem' }}>{s.icon}</span>
              <span style={{ position: 'absolute', top: -10, right: -10, width: 26, height: 26, borderRadius: '50%', background: s.color, color: '#fff', fontSize: '.72rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10, color: '#fff' }}>{s.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.85rem', lineHeight: 1.7, maxWidth: 200, margin: '0 auto' }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Demo block with Tan Xa background */}
      <div className="reveal" style={{
        marginTop: 72, borderRadius: 24, padding: '52px 44px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
        overflow: 'hidden', position: 'relative',
        backgroundImage: `url(${TAN_XA_BG})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,10,25,0.82)', backdropFilter: 'blur(2px)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="badge" style={{ background: 'rgba(242,112,36,0.2)', color: '#F27024', border: '1px solid rgba(242,112,36,0.35)', marginBottom: 20 }}>🚀 Thử Ngay</span>
          <h3 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#fff', fontWeight: 800, marginBottom: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Không Cần Tài Khoản — Thử Ngay Bây Giờ</h3>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '.95rem', lineHeight: 1.75, marginBottom: 28 }}>Trò chuyện trực tiếp với AI để nhận gợi ý quán ăn ngon kèm bảng giá và review chân thực tức thì.</p>
          <Link to="/planner" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 50, background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 700, fontSize: '.95rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(242,112,36,0.4)' }}>
            Thử Trò Chuyện Ngay →
          </Link>
        </div>
        <div className="hide-mobile" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, padding: 24, backdropFilter: 'blur(12px)' }}>
            <div style={{ background: 'rgba(242,112,36,0.25)', borderRadius: 12, padding: '10px 16px', marginBottom: 12 }}>
              <p style={{ color: '#fff', fontSize: '.83rem', margin: 0 }}>"Thèm ăn nẩu nướng Tân Xã dưới 200k kèm review chi tiết 🍜"</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '.83rem', margin: 0, lineHeight: 1.65 }}>
                ✨ <strong style={{ color: '#F27024' }}>Gợi ý quán cho bạn:</strong><br />
                🍲 <strong>1988 BBQ Tân Xã</strong> - Buffet nướng lẩu sinh viên (~179.000đ/người)<br />
                📝 <strong>Review:</strong> View hồ mát mẻ, đồ ướp đậm đà nhưng cuối tuần khá đông nên đặt bàn trước. Đạt 4.6⭐ rating TikTok.<br />
                <span style={{ color: '#10B981', fontSize: '.78rem' }}>💰 Giá đã xác minh · Độc lập & Minh bạch</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
