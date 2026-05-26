import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

// Ảnh nền cho từng gói
const PLAN_PHOTOS = {
  explorer: { url: '/images/langbac.png', label: 'Lăng Bác' },
  traveler: { url: '/images/hotay.png', label: 'Hồ Tây' },
  pro: { url: '/images/tranquoc.png', label: 'Chùa Trấn Quốc' },
};

const plans = [
  {
    name: 'Explorer',
    photo: PLAN_PHOTOS.explorer.url,
    landmark: PLAN_PHOTOS.explorer.label,
    price: { monthly: 0, yearly: 0 },
    desc: 'Hoàn hảo cho du khách lần đầu và những người thích khám phá tự do.',
    color: '#FFD700',
    cta: 'Dùng Miễn Phí',
    ctaStyle: { background: 'rgba(255,215,0,0.15)', border: '1.5px solid #FFD700', color: '#FFD700' },
    features: [
      { text: 'Hỗ trợ Chat AI cơ bản', included: true },
      { text: 'Bản đồ cơ bản', included: true },
      { text: '100 địa điểm đã xác minh', included: true },
      { text: 'Giá cộng đồng', included: true },
      { text: 'Bản đồ offline', included: false },
      { text: 'AI phản hồi ưu tiên', included: false },
    ],
  },
  {
    name: 'Traveler',
    photo: PLAN_PHOTOS.traveler.url,
    landmark: PLAN_PHOTOS.traveler.label,
    price: { monthly: 99000, yearly: 79000 },
    desc: 'Cho du khách thường xuyên muốn trải nghiệm Hà Nội toàn diện nhất.',
    color: '#FF8C00',
    popular: true,
    cta: 'Chọn Traveler',
    ctaStyle: { background: 'linear-gradient(135deg,#D4A017,#FF8C00)', border: 'none', color: '#fff', boxShadow: '0 8px 24px rgba(212,160,23,0.4)' },
    features: [
      { text: 'Hỗ trợ Chat AI không giới hạn', included: true },
      { text: 'Bản đồ tương tác đầy đủ', included: true },
      { text: '500+ địa điểm đã xác minh', included: true },
      { text: 'Giá thời gian thực', included: true },
      { text: 'Bản đồ offline', included: true },
      { text: 'AI phản hồi ưu tiên', included: false },
    ],
  },
  {
    name: 'Pro Local',
    photo: PLAN_PHOTOS.pro.url,
    landmark: PLAN_PHOTOS.pro.label,
    price: { monthly: 199000, yearly: 159000 },
    desc: 'Dành cho hướng dẫn viên, blogger và những người yêu Hà Nội thực thụ.',
    color: '#A78BFA',
    cta: 'Go Pro',
    ctaStyle: { background: 'rgba(167,139,250,0.15)', border: '1.5px solid #A78BFA', color: '#A78BFA' },
    features: [
      { text: 'Mọi thứ của Traveler', included: true },
      { text: 'AI phản hồi ưu tiên', included: true },
      { text: 'Truy cập API', included: true },
      { text: 'Ưu tiên phản hồi từ AI', included: true },
      { text: 'Truy cập sớm tính năng mới', included: true },
      { text: 'Hỗ trợ riêng', included: true },
    ],
  },
];

const PricingSection = () => {
  const [yearly, setYearly] = useState(false);
  const { user, setShowAuthModal } = useContext(AuthContext);
  const fmt = (n) => n === 0 ? 'Miễn Phí' : n.toLocaleString('vi-VN') + 'đ';

  return (
    <section id="pricing" style={{ padding: '80px 0', background: 'transparent' }}>
      <div className="container">
        <div className="section-header reveal" style={{ marginBottom: 60 }}>
          <span className="badge" style={{ marginBottom: 14, background: 'rgba(212,160,23,0.15)', color: '#D4A017', borderColor: 'rgba(212,160,23,0.3)' }}>💰 Gói Dịch Vụ</span>
          <h2 style={{ color: '#fff' }}>Đơn Giản, Minh Bạch</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>Bắt đầu miễn phí. Nâng cấp khi bạn sẵn sàng. Không phí ẩn.</p>
          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginTop: 24, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '6px 6px 6px 18px', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '.88rem', fontWeight: 500, color: !yearly ? '#FFD700' : 'rgba(255,255,255,0.4)' }}>Hàng tháng</span>
            <button onClick={() => setYearly(!yearly)} style={{ width: 48, height: 26, borderRadius: 13, background: yearly ? '#D4A017' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .25s ease', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 3, left: yearly ? 24 : 3, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'left .25s ease', display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
            </button>
            <span style={{ fontSize: '.88rem', fontWeight: 500, color: yearly ? '#FFD700' : 'rgba(255,255,255,0.4)' }}>Hàng năm</span>
            {yearly && <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981', fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(16,185,129,0.3)', marginRight: 6 }}>Giảm 20%</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>
          {plans.map((p, i) => (
            <div key={i} className="reveal" style={{
              borderRadius: 20, overflow: 'hidden',
              border: p.popular ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.1)',
              boxShadow: p.popular ? `0 20px 60px rgba(212,160,23,0.25)` : '0 8px 24px rgba(0,0,0,0.3)',
              transform: p.popular ? 'scale(1.03)' : 'none',
              animationDelay: `${i * 0.1}s`,
              transition: 'transform 0.3s ease',
            }}>
              {/* Photo header */}
              <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)' }} />
                {p.popular && (
                  <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#000', fontSize: '.72rem', fontWeight: 700, padding: '5px 16px', borderRadius: 50, whiteSpace: 'nowrap', boxShadow: `0 4px 12px ${p.color}60` }}>
                    ⭐ Phổ Biến Nhất
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 46, left: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '.78rem', fontWeight: 700, padding: '4px 12px', borderRadius: 9999 }}>{p.landmark}</span>
                </div>
                <div style={{ position: 'absolute', bottom: 14, left: 20 }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: p.color, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 'clamp(1.6rem,3vw,2rem)', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                      {fmt(yearly ? p.price.yearly : p.price.monthly)}
                    </span>
                    {p.price.monthly > 0 && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.82rem' }}>/tháng</span>}
                  </div>
                </div>
              </div>
              {/* Content */}
              <div style={{ background: 'rgba(10,15,35,0.85)', backdropFilter: 'blur(12px)', padding: '20px 24px 28px' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.84rem', lineHeight: 1.65, marginBottom: 20 }}>{p.desc}</p>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 20 }} />
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 24 }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem', color: f.included ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' }}>
                      <span style={{ color: f.included ? p.color : 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{f.included ? '✓' : '✗'}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                {user ? (
                  <Link to="/planner" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s ease', ...p.ctaStyle }}>
                    {p.cta}
                  </Link>
                ) : (
                  <button onClick={() => setShowAuthModal(true)} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', border: p.ctaStyle.border || 'none', transition: 'all 0.2s ease', ...p.ctaStyle }}>
                    {p.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="reveal" style={{ textAlign: 'center', marginTop: 36, color: 'rgba(255,255,255,0.4)', fontSize: '.85rem' }}>
          Mọi gói đều có 7 ngày dùng thử miễn phí. Không cần thẻ tín dụng. Huỷ bất cứ lúc nào.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
