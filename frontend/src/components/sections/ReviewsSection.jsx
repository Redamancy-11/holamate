import React from 'react';

const reviews = [
  { name: 'Tuấn Anh', role: 'K20 Software Engineering', country: '🍊', avatar: 'TA', color: '#F27024', rating: 5, text: 'HolaMate cứu cánh mình mỗi kỳ học quân sự luôn! AI gợi ý các quán bún chả, cơm tấm siêu rẻ quanh Tân Xã mà đi bộ từ KTX cũng gần. Tính năng báo cáo giá giúp sinh viên không lo bị "nói thách"!' },
  { name: 'Khánh Linh', role: 'K19 Digital Marketing', country: '🍊', avatar: 'KL', color: '#FF9800', rating: 5, text: 'Thích nhất tính năng gợi ý cafe học nhóm. Nhờ HolaMate mà mình biết đến Bay Coffee ở Tân Xã có view hồ siêu chill, yên tĩnh học nhóm rất hiệu quả. Rất recommend cho các bạn Holaers!' },
  { name: 'Thầy Hoàng', role: 'Giảng viên FPTU', country: '🏫', avatar: 'TH', color: '#10B981', rating: 5, text: 'Tôi dùng app này để chỉ đường và gợi ý quán ăn cho các em tân sinh viên khóa mới. Bản đồ định vị rất chính xác các mốc ký túc xá Dom A, Dom B và khu giảng đường Alpha, Beta.' },
  { name: 'Minh Đức', role: 'K18 Business Administration', country: '🍊', avatar: 'MĐ', color: '#A78BFA', rating: 5, text: 'Lịch trình di chuyển xe bus 107 và 74 trên app cập nhật rất chuẩn. Đi lại từ nội thành lên Hòa Lạc cuối tuần không còn là cực hình nữa. AI lên plan đi chơi 3 tiếng quanh đây rất mượt!' },
  { name: 'Hương Giang', role: 'K20 Graphic Design', country: '🍊', avatar: 'HG', color: '#F27024', rating: 5, text: 'Giao diện màu cam FPT cực đẹp và dễ dùng. Thông tin giá lẩu nướng 1988 BBQ và các quán ăn xung quanh rất thực tế, cập nhật theo thời gian thực nhờ cộng đồng đóng góp.' },
  { name: 'Alex M.', role: 'Exchange Student', country: '🇺🇸', avatar: 'AM', color: '#FF9800', rating: 5, text: 'As an international student at FPT Hoa Lac, finding food was hard. HolaMate AI helped me find local pho and spring rolls near Tan Xa with walk paths. Lifesaver app!' },
];

const Stars = ({ n }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[...Array(n)].map((_, i) => <span key={i} style={{ color: '#FF9800', fontSize: '.9rem' }}>★</span>)}
  </div>
);

const ReviewsSection = () => (
  <section id="reviews" style={{ padding: '80px 0', background: 'transparent' }}>
    <div className="container">
      <div className="section-header reveal" style={{ marginBottom: 48 }}>
        <span className="badge" style={{ marginBottom: 14, background: 'rgba(242,112,36,0.15)', color: '#F27024', borderColor: 'rgba(242,112,36,0.3)' }}>⭐ Đánh Giá</span>
        <h2 style={{ color: '#fff' }}>Được Yêu Thích Bởi <span style={{ background: 'linear-gradient(135deg,#F27024,#FF9800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>1,000+ Sinh Viên</span></h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>Từ tân sinh viên KTX đến giảng viên FPT — nghe họ chia sẻ về HolaMate.</p>
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

      {/* Review grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {reviews.map((r, i) => (
          <div key={i} className="reveal" style={{
            padding: '24px', animationDelay: `${i * 0.08}s`, borderRadius: 16,
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'transform 0.3s ease, background 0.3s ease',
            cursor: 'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${r.color}22`, border: `2px solid ${r.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.82rem', color: r.color, flexShrink: 0 }}>
                  {r.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.name} <span>{r.country}</span>
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.45)' }}>{r.role}</div>
                </div>
              </div>
              <Stars n={r.rating} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.87rem', lineHeight: 1.75, margin: 0 }}>"{r.text}"</p>
          </div>
        ))}
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

export default ReviewsSection;
