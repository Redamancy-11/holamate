import React from 'react';
import { Link } from 'react-router-dom';

// Ảnh hồ Tân Xã làm nền CTA
const TAN_XA_BG = '/images/tan_xa.png';

const CtaSection = () => (
  <section style={{
    position: 'relative', padding: '96px 24px', overflow: 'hidden', textAlign: 'center',
    backgroundImage: `url(${TAN_XA_BG})`,
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
  }}>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,10,25,0.80)', backdropFilter: 'blur(2px)' }} />
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
      <span className="badge reveal" style={{ background: 'rgba(212,160,23,0.2)', color: '#FFD700', border: '1px solid rgba(212,160,23,0.35)', marginBottom: 24, display: 'inline-flex' }}>
        🧡 Trải Nghiệm Hoà Lạc
      </span>
      <h2 className="reveal" style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginBottom: 20, lineHeight: 1.2 }}>
        <span style={{ background: 'linear-gradient(135deg,#FFD700,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Bắt Đầu Ngay Hôm Nay</span>
      </h2>
      <div className="reveal" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/planner" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '15px 32px', borderRadius: 50,
          background: 'linear-gradient(135deg,#D4A017,#FF8C00)',
          color: '#fff', fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(212,160,23,0.45)',
        }}>
          🚀 Bắt Đầu Miễn Phí
        </Link>
        <a href="#features" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '15px 32px', borderRadius: 50,
          border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)',
          color: '#fff', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none',
        }}>
          Khám Phá Tính Năng
        </a>
      </div>
    </div>
  </section>
);

export default CtaSection;
