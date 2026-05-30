import React from 'react';

const HOLA_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800',
    label: 'Tòa nhà Alpha FPT',
  },
  {
    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800',
    label: 'Hồ Tân Xã Hoà Lạc',
  },
  {
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800',
    label: 'Thư viện Beta FPT',
  },
  {
    url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800',
    label: 'Đồi thông FPT',
  },
];

const features = [
  {
    icon: '🤖',
    color: '#F27024',
    photo: HOLA_PHOTOS[0],
    badge: 'AI-Powered',
    title: 'Trợ Lý Ẩm Thực AI',
    desc: 'Hỏi đáp gợi ý quán ăn ngon bổ rẻ, xem review đánh giá món ăn trung thực và giải đáp thắc mắc về đời sống Hòa Lạc cùng Trợ lý AI.',
    features: ['Gợi ý món ăn thông minh', 'Đánh giá review chân thực', 'Hỗ trợ trực tuyến 24/7'],
  },
  {
    icon: '💰',
    color: '#FF9800',
    photo: HOLA_PHOTOS[1],
    badge: 'Crowdsourced',
    title: 'Giá Cả Thực Tế',
    desc: 'Xác minh giá cả tại các quán ăn quanh khu Tân Xã và campus FPT. Thuật toán lọc báo cáo ảo giúp bạn không lo bị chặt chém.',
    features: ['Giá được xác thực', 'Cập nhật thời gian thực', 'Định mức chi phí ăn uống'],
  },
  {
    icon: '🗺️',
    color: '#7C3AED',
    photo: HOLA_PHOTOS[2],
    badge: 'Interactive',
    title: 'Bản Đồ Hola Tương Tác',
    desc: 'Bản đồ thông minh của HolaMate hiển thị định vị chính xác, các landmarks trong trường cùng các quán ăn sinh viên xung quanh.',
    features: ['Định vị GPS chính xác', 'Lọc theo danh mục', 'Đầy đủ landmarks campus'],
  },
  {
    icon: '🧡',
    color: '#10B981',
    photo: HOLA_PHOTOS[3],
    badge: 'Exclusive',
    title: 'Cộng Đồng Hola-ers',
    desc: 'Nơi chia sẻ các quán ăn ngon bổ rẻ, các cung đường chạy bộ đẹp, các tips sống sót tại Hòa Lạc từ các anh chị khóa trước.',
    features: ['Đóng góp từ sinh viên', 'Review chân thực 100%'],
  },
];

const FeaturesSection = () => (
  <section id="features" className="section" style={{ background: 'transparent', padding: '80px 0' }}>
    <div className="container">
      <div className="section-header reveal" style={{ marginBottom: 60 }}>
        <span className="badge badge-blue" style={{ marginBottom: 14, background: 'rgba(242,112,36,0.15)', color: '#F27024', borderColor: 'rgba(242,112,36,0.3)' }}>✦ Tính Năng</span>
        <h2 style={{ color: '#fff' }}>Khám Phá Hoà Lạc Dễ Dàng<br /><span style={{ background: 'linear-gradient(135deg,#FF9800,#FF5722)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Trải Nghiệm Hola Trọn Vẹn Hơn</span></h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>Bốn công cụ đắc lực hỗ trợ đời sống và học tập của sinh viên FPT. Được hỗ trợ bởi AI và cộng đồng.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
        {features.map((f, i) => (
          <div key={i} className="reveal" style={{ animationDelay: `${i * 0.1}s`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}>
            {/* Photo header */}
            <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
              <img src={f.photo.url} alt={f.photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 12, left: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 50 }}>{f.badge}</span>
                <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '.78rem', fontWeight: 700, padding: '6px 12px', borderRadius: 9999, maxWidth: 'fit-content' }}>{f.photo.label}</span>
              </div>
              <div style={{ position: 'absolute', top: 12, right: 14, fontSize: '1.6rem' }}>{f.icon}</div>
            </div>
            {/* Content */}
            <div style={{ background: 'rgba(15,10,7,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', padding: '20px 22px 24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, color: '#fff' }}>{f.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '.85rem', lineHeight: 1.7, marginBottom: 16 }}>{f.desc}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {f.features.map((feat, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.80rem', color: 'rgba(255,255,255,0.75)' }}>
                    <span style={{ color: f.color, fontWeight: 700 }}>✓</span> {feat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="reveal" style={{ textAlign: 'center', marginTop: 56 }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20, fontSize: '.95rem' }}>Tham gia cùng 1,000+ sinh viên FPT khám phá Hòa Lạc thông minh hơn</p>
        <a href="/map" className="btn btn-primary btn-lg" style={{ background: 'linear-gradient(135deg,#F27024,#FF5722)', border: 'none' }}>Khám Phá Bản Đồ Ngay →</a>
      </div>
    </div>
  </section>
);

export default FeaturesSection;
