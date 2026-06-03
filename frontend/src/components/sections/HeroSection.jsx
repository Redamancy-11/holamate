import React from 'react';
import { Link } from 'react-router-dom';

const stats = [
  { value: '1,000+', label: 'Sinh Viên & Cán Bộ' },
  { value: '4.8★', label: 'Đánh Giá' },
  { value: '100%', label: 'Hoàn Toàn Miễn Phí' },
];

const HeroSection = () => (
  <section style={{
    position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden',
    backgroundImage: 'radial-gradient(circle at 80% 30%, rgba(242, 112, 36, 0.15) 0%, transparent 60%)',
    backgroundSize: 'cover', backgroundPosition: 'center',
  }}>
    {/* Dark overlay */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(11, 7, 4, 0.88) 0%, rgba(15, 10, 7, 0.80) 50%, rgba(11, 7, 4, 0.90) 100%)', zIndex: 1 }} />

    <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: 100, paddingBottom: 60 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        {/* Left */}
        <div className="animate-fade-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 50, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: '#10B981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'rgba(255,255,255,.9)', fontSize: '.82rem', fontWeight: 600 }}>🧡 AI Student Assistant #1 tại FPT Hoà Lạc</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 900, color: '#fff', marginBottom: 20, lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em' }}>
            Khám Phá Hoà Lạc<br />
            <span style={{ background: 'linear-gradient(135deg,#FF9800,#FF5722)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Như Người Bản Địa</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,.80)', fontSize: '1.1rem', maxWidth: 480, marginBottom: 36, lineHeight: 1.75 }}>
            Tìm kiếm quán ngon, xem giá cả sinh viên minh bạch, khám phá bản đồ địa điểm và hỏi đáp trực tuyến 24/7 — tất cả được hỗ trợ bởi AI. Hành trình tuyệt vời của bạn bắt đầu từ đây.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
            marginTop: '28px'
          }}>
            <Link to="/explore" style={{
              background: 'linear-gradient(135deg, rgba(242, 112, 36, 0.15) 0%, rgba(242, 112, 36, 0.05) 100%)',
              border: '1px solid rgba(242, 112, 36, 0.4)',
              borderRadius: '16px', padding: '16px', color: '#fff', textDecoration: 'none',
              transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '8px',
              backdropFilter: 'blur(8px)'
            }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#F27024'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(242, 112, 36, 0.4)'; e.currentTarget.style.transform = 'none'; }}>
              <span style={{ fontSize: '1.8rem' }}>🍔</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#F27024' }}>Khám Phá Ẩm Thực</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Tìm món ngon & gian hàng sinh viên</span>
            </Link>

            <Link to="/reviews" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px', padding: '16px', color: '#fff', textDecoration: 'none',
              transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '8px',
              backdropFilter: 'blur(8px)'
            }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'; e.currentTarget.style.transform = 'none'; }}>
              <span style={{ fontSize: '1.8rem' }}>💬</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10B981' }}>Review Cộng Đồng</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Chia sẻ trải nghiệm minh bạch</span>
            </Link>

            <Link to="/planner" style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              borderRadius: '16px', padding: '16px', color: '#fff', textDecoration: 'none',
              transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '8px',
              backdropFilter: 'blur(8px)'
            }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)'; e.currentTarget.style.transform = 'none'; }}>
              <span style={{ fontSize: '1.8rem' }}>🤖</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#7C3AED' }}>Trợ Lý AI Gợi Ý</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Hỏi đáp món ăn phù hợp 24/7</span>
            </Link>

            <Link to="/seller" style={{
              background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 152, 0, 0.4)',
              borderRadius: '16px', padding: '16px', color: '#fff', textDecoration: 'none',
              transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '8px',
              backdropFilter: 'blur(8px)'
            }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF9800'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.4)'; e.currentTarget.style.transform = 'none'; }}>
              <span style={{ fontSize: '1.8rem' }}>🏪</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FF9800' }}>Dành Cho Người Bán</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Quản lý cửa hàng & doanh thu</span>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['✓ Review minh bạch', '✓ Giá cả rõ ràng', '✓ Khám phá không giới hạn', '✓ Trợ lý thông minh'].map(t => (
              <span key={t} style={{ color: 'rgba(255,255,255,.65)', fontSize: '.82rem' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Right mockup */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="animate-fade-up hide-mobile">
          <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
            <div style={{ background: 'rgba(255,255,255,.05)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 28, padding: 28, boxShadow: '0 32px 80px rgba(0,0,0,.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#F27024,#FF5722)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>O</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '.9rem' }}>HolaMate AI</div>
                  <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '.75rem' }}>● Online — Sẵn sàng trợ giúp!</div>
                </div>
              </div>
              {[
                { role: 'user', text: 'Tìm quán nướng ngon rẻ quanh Tân Xã 🍢' },
                { role: 'ai', text: '✨ Gợi ý quán ngon cho bạn:\n\n🍜 1988 BBQ Tân Xã — Buffet nướng lẩu chỉ từ 129k cực đông khách.\n☕ Bay Coffee & Tea — View hồ Tân Xã siêu đẹp, đồ uống rất rẻ chỉ từ 25k.' },
                { role: 'ai', text: '💰 Tổng chi phí dự kiến: ~150.000đ/người — đã xác minh!' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div style={{ background: m.role === 'user' ? 'linear-gradient(135deg,#F27024,#FF5722)' : 'rgba(255,255,255,.08)', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', maxWidth: '85%' }}>
                    <p style={{ color: '#fff', fontSize: '.82rem', lineHeight: 1.55, whiteSpace: 'pre-line', margin: 0 }}>{m.text}</p>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 50, padding: '8px 8px 8px 16px', alignItems: 'center' }}>
                <span style={{ flex: 1, color: 'rgba(255,255,255,.4)', fontSize: '.83rem' }}>Hỏi tôi về quán ăn, xe bus, KTX Hola...</span>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#F27024,#FF5722)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '.9rem' }}>↑</span>
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: -24, right: -24, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,.25)', minWidth: 150, animation: 'float 4s ease-in-out infinite' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.4rem' }}>📍</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#111827' }}>100+ Địa Điểm</div>
                  <div style={{ fontSize: '.72rem', color: '#6B7280' }}>Đã xác minh</div>
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: -20, left: -24, background: 'linear-gradient(135deg,#F27024,#FF5722)', borderRadius: 16, padding: '12px 16px', boxShadow: '0 8px 32px rgba(242,112,36,0.5)', animation: 'float 5s ease-in-out infinite 1.5s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.3rem' }}>✨</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#fff' }}>Hỗ Trợ AI</div>
                  <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.8)' }}>Trực tuyến 24/7</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="hero-stats reveal">
        {stats.map((s, i) => (
          <div key={i} className="hero-stats-item">
            <div style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, color: '#FF9800', fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.6)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
