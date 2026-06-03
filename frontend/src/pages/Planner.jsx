import React from 'react';
import { useLocation } from 'react-router-dom';
import ChatBox from '../components/ChatBox';

const Planner = () => {
  const location = useLocation();
  const stateLocation = location.state?.location || null;

  return (
    <div style={{
      height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#07050f', // Sleek ultra dark violet background
      position: 'relative', overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
    }}>
      {/* Animated gradient orbs */}
      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(80px,-60px) scale(1.2)} 66%{transform:translate(-40px,50px) scale(0.9)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-90px,70px) scale(1.25)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(60px,80px) scale(0.85)} 75%{transform:translate(-70px,-50px) scale(1.1)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(25px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Floating ambient orbs */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%', width: '50vw', height: '50vw',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,112,36,0.12) 0%, transparent 65%)',
        filter: 'blur(120px)', animation: 'orbFloat1 22s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-15%', width: '55vw', height: '55vw',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)',
        filter: 'blur(140px)', animation: 'orbFloat2 26s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '15%', width: '35vw', height: '35vw',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 65%)',
        filter: 'blur(110px)', animation: 'orbFloat3 18s ease-in-out infinite', pointerEvents: 'none',
      }} />

      {/* Futuristic Grid Overlay with Masking */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(242,112,36,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(242,112,36,0.015) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)',
      }} />

      {/* Top noise texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <div style={{
        position: 'relative', zIndex: 1, maxWidth: 820, width: '100%', margin: '0 auto',
        padding: '84px 20px 10px', display: 'flex', flexDirection: 'column', height: '100%',
        minHeight: 0, boxSizing: 'border-box',
        animation: 'fadeInUp 0.6s ease-out',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)', borderRadius: 50,
            padding: '8px 20px 8px 12px', marginBottom: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #F27024, #FF5722, #FF8A50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: '#fff', fontSize: '1rem',
              boxShadow: '0 4px 16px rgba(242,112,36,0.4)',
            }}>H</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.85rem', letterSpacing: '-0.01em' }}>HolaMate AI</div>
              <div style={{ color: '#10B981', fontSize: '.68rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                Đang hoạt động
              </div>
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.3rem, 3vw, 2.1rem)', fontWeight: 900, color: '#fff',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", marginBottom: 6,
            letterSpacing: '-0.02em', lineHeight: 1.2,
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 50%, #FF9800 100%)',
            backgroundSize: '200% auto', animation: 'shimmer 6s linear infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Trợ Lý Ẩm Thực AI 🍲
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.45)', fontSize: '.8rem', maxWidth: 480, margin: '0 auto',
            lineHeight: 1.5, fontWeight: 400,
          }}>
            Gợi ý món ăn, đánh giá cửa hàng, và tư vấn ẩm thực minh bạch tại FPT Hoà Lạc
          </p>
        </div>

        <div style={{
          display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0,
          padding: '0 0 16px', maxWidth: 960, width: '100%', margin: '0 auto',
        }}>
          <ChatBox defaultLocation={stateLocation} />
        </div>
      </div>
    </div>
  );
};

export default Planner;
