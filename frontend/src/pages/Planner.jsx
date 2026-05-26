import React from 'react';
import { useLocation } from 'react-router-dom';
import ChatBox from '../components/ChatBox';

const CHATBOX_BG = '/images/tan_xa.png';

const Planner = () => {
  const location = useLocation();
  const stateLocation = location.state?.location || null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundImage: `url(${CHATBOX_BG})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      position: 'relative',
    }}>
      {/* Background overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,10,25,0.75)', backdropFilter: 'blur(2px)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, width: '100%', margin: '0 auto', padding: '100px 20px 20px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', borderRadius: 50, padding: '8px 20px 8px 12px', marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#D4A017,#FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '1rem' }}>H</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.88rem' }}>HolaMate AI</div>
              <div style={{ color: '#10B981', fontSize: '.72rem', fontWeight: 600 }}>● Online</div>
            </div>
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 8 }}>
            AI Food & Review Assistant 🍲
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.9rem' }}>Hỏi đáp gợi ý ăn uống và đánh giá ẩm thực minh bạch tại Hola</p>
        </div>

        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '24px 10px 28px', maxWidth: 960, width: '100%', margin: '0 auto' }}>
          <ChatBox defaultLocation={stateLocation} />
        </div>
      </div>
    </div>
  );
};

export default Planner;
