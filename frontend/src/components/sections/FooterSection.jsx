import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const footerLinks = {
  'Sản Phẩm': [
    { label: 'Trợ Lý AI 💬', to: '/planner', desc: 'Gợi ý món ăn & đời sống' },
    { label: 'Bản Đồ Tương Tác', to: '/map', desc: 'Xem địa điểm trên bản đồ GPS' },
    { label: 'Tính Năng', href: '/#features', desc: 'Khám phá tất cả tính năng' },
    { label: 'Đánh Giá', href: '/#reviews', desc: 'Nhận xét từ du khách' },
  ],
  'Công Ty': [
    { label: 'Về Chúng Tôi', modal: 'about', desc: 'Câu chuyện HolaMate' },
    { label: 'Blog Đời Sống', modal: 'blog', desc: 'Tips & kinh nghiệm Hoà Lạc' },
    { label: 'Tuyển Dụng', modal: 'careers', desc: 'Gia nhập đội ngũ chúng tôi' },
    { label: 'Liên Hệ', modal: 'contact', desc: 'Hỗ trợ & phản hồi' },
    { label: 'Press Kit', modal: 'press', desc: 'Tài liệu báo chí' },
  ],
  'Hỗ Trợ': [
    { label: 'Trung Tâm Trợ Giúp', modal: 'help', desc: 'Câu hỏi thường gặp' },
    { label: 'Hướng Dẫn Sử Dụng', modal: 'guide', desc: 'Cách dùng HolaMate' },
    { label: 'Cộng Đồng', modal: 'community', desc: 'Nhóm Hola-ers' },
    { label: 'Chính Sách BM', modal: 'privacy', desc: 'Bảo vệ dữ liệu của bạn' },
    { label: 'Điều Khoản DV', modal: 'terms', desc: 'Điều khoản sử dụng' },
  ],
};

const MODAL_CONTENT = {
  about: {
    title: '🧡 Về HolaMate',
    content: `HolaMate ra đời từ mong muốn hỗ trợ các bạn sinh viên và cán bộ tại FPT Hoà Lạc (Thạch Thất, Hà Nội) khám phá và hòa nhập với cuộc sống nơi đây một cách dễ dàng và tiết kiệm nhất.

Chúng tôi tin rằng đời sống học tập xa nhà sẽ thú vị và trọn vẹn hơn khi bạn có thể tìm được những quán ăn ngon bổ rẻ quanh khu Tân Xã, lập lịch trình đi chơi cuối tuần, xe bus di chuyển, hay kiểm tra giá cả thị trường mà không sợ bị chặt chém.

Được xây dựng bởi các bạn sinh viên FPT kết hợp với công nghệ AI Gemini tiên tiến, HolaMate mang lại trải nghiệm tiện ích nhất cho toàn thể Hola-ers.`,
  },
  blog: {
    title: '📰 Blog Đời Sống Hoà Lạc',
    content: `✦ Top 5 quán lẩu nướng ngon rẻ cho sinh viên Hola 2026
✦ Cẩm nang xe bus 107 & 74 từ nội thành lên Hoà Lạc
✦ Review các quán cafe yên tĩnh học bài nhóm quanh campus
✦ Hồ Tân Xã về chiều — Điểm chạy bộ và ngắm hoàng hôn lý tưởng
✦ Tips sống sót học kỳ đầu tiên tại KTX FPT Hoà Lạc
✦ Khảo sát giá cả ăn uống quanh khu Tân Xã tháng 5/2026

Blog sẽ ra mắt chính thức vào tháng 6/2026. Đăng ký email để nhận thông báo sớm!`,
  },
  careers: {
    title: '💼 Tuyển Dụng',
    content: `Chúng tôi luôn tìm kiếm những bạn sinh viên FPT năng động muốn thử sức với các dự án thực tế:

🔹 Frontend Developer (React / Tailwind)
🔹 AI Engineer Intern (Python, Prompt Engineering)
🔹 Content Creator (Review ẩm thực & đời sống Hola)
🔹 Community Manager (Quản lý group, tổ chức sự kiện)

Môi trường làm việc: Team trẻ trung, thoải mái sáng tạo tại campus FPT.
Phúc lợi: Hỗ trợ phụ cấp + kinh nghiệm thực chiến + cơ hội làm việc chính thức.

📧 Gửi CV về: careers@holamate.vn`,
  },
  contact: {
    title: '📞 Liên Hệ',
    content: `Chúng tôi luôn sẵn sàng hỗ trợ các bạn!

📧 Email: hello@holamate.vn
📱 Hotline: 1800-HOLAMATE (miễn phí cho sinh viên)
🏠 Địa chỉ văn phòng: Khu Công nghệ cao Hoà Lạc, Thạch Thất, Hà Nội
⏰ Giờ làm việc: Thứ 2 - Thứ 6, 8:30 - 17:30

Facebook: facebook.com/holamate
Instagram: @holamate_official`,
  },
  press: {
    title: '📋 Press Kit',
    content: `HolaMate — Trợ lý đời sống AI số #1 tại FPT Hoà Lạc

📊 Số liệu chính (Q1 2026):
• 1,000+ sinh viên & cán bộ tin dùng
• 100+ địa điểm ẩm thực & dịch vụ đã xác minh
• Đóng góp hơn 2,000 lượt báo cáo giá từ cộng đồng
• Tiết kiệm trung bình 15% chi phí sinh hoạt cho mỗi user

🏆 Giải thưởng:
• Dự án Đổi mới Sáng tạo Sinh viên FPT 2025
• Đối tác Công nghệ AI Google Certified

📥 Tải logo và tài liệu truyền thông:
Liên hệ press@holamate.vn để nhận press kit.`,
  },
  help: {
    title: '❓ Câu Hỏi Thường Gặp',
    content: `Q: HolaMate có mất phí không?
A: Hoàn toàn MIỄN PHÍ dành cho cộng đồng sinh viên và cán bộ FPT.

Q: Làm sao để báo cáo giá một món ăn?
A: Bạn có thể vào tab Bản Đồ, chọn địa điểm và nhấn "Báo cáo giá thực tế" để gửi thông tin cho cộng đồng.

Q: Dữ liệu giá có chính xác không?
A: Các báo cáo giá đều được đối chiếu chéo thông qua thuật toán đồng thuận để lọc bỏ báo cáo sai lệch.

Q: Làm sao để AI gợi ý tốt nhất?
A: Hãy cung cấp vị trí và sở thích ăn uống hiện tại của bạn, AI sẽ tự động đề xuất những quán ăn ngon, bổ, rẻ phù hợp.

📧 Liên hệ hỗ trợ: support@holamate.vn`,
  },
  guide: {
    title: '📖 Hướng Dẫn Sử Dụng',
    content: `🚀 Khám phá HolaMate trong 3 bước:

1️⃣ Mở Trợ Lý AI
   → Click "Bắt đầu ngay" để mở khung Chat AI
   → Trò chuyện trực tiếp với trợ lý AI HolaMate

2️⃣ Sử dụng Bản Đồ Tương Tác
   → Vào tab "Bản Đồ" và cho phép truy cập vị trí GPS
   → Xem các địa điểm ăn uống, cafe xung quanh campus

3️⃣ Đóng góp Báo Cáo Giá
   → Phát hiện chênh lệch giá? Hãy cập nhật ngay để giúp các bạn khác tránh bị chặt chém.`,
  },
  community: {
    title: '👥 Cộng Đồng HolaMate',
    content: `Kết nối với hàng ngàn Hola-ers khác để chia sẻ kinh nghiệm ăn chơi:

🧡 Facebook Group: "Hội Review Đồ Ăn Hoà Lạc"
   → 12,000+ thành viên hoạt động sôi nổi
📸 Instagram: @holamate_community
   → Tag #HolaMate để chia sẻ hình ảnh đẹp quanh Hola
💬 Discord Server: discord.gg/holamate
   → Góc tán gẫu, tìm bạn đi ăn nướng, chạy bộ Tân Xã.`,
  },
  privacy: {
    title: '🔒 Chính Sách Bảo Mật',
    content: `HolaMate cam kết bảo mật thông tin cá nhân của người dùng.

📋 Thông tin chúng tôi thu thập:
• Email đăng nhập (khi đăng ký tài khoản)
• Vị trí GPS (chỉ dùng hiển thị trên bản đồ thiết bị của bạn, không lưu trữ trên máy chủ)
• Lịch sử tương tác AI (để tối ưu hóa câu trả lời)

🛡️ Cam kết bảo mật:
• Không chia sẻ dữ liệu với bất kỳ bên thứ ba nào
• Dữ liệu truyền tải qua SSL bảo mật tối đa
• Bạn có quyền xóa tài khoản và dữ liệu liên quan bất cứ lúc nào.

📧 Liên hệ bảo mật: privacy@holamate.vn`,
  },
  terms: {
    title: '📄 Điều Khoản Dịch Vụ',
    content: `Chào mừng bạn đến với HolaMate. Khi sử dụng dịch vụ, bạn đồng ý với:

✅ Hành vi được khuyến khích:
• Đóng góp thông tin giá cả trung thực, khách quan
• Tôn trọng văn hóa trường học và địa phương
• Chia sẻ thông tin hữu ích giúp đỡ cộng đồng

❌ Các hành vi bị cấm:
• Báo cáo thông tin giá ảo, gây nhiễu dữ liệu
• Sử dụng ngôn từ công kích, xúc phạm
• Tấn công hoặc spam hệ thống

💡 Tuyên bố miễn trừ:
Thông tin giá cả do cộng đồng đóng góp mang tính chất tham khảo, chúng tôi không chịu trách nhiệm pháp lý về chênh lệch thực tế.

📧 Pháp lý: legal@holamate.vn`,
  },
};

const socials = [
  { icon: 'f', label: 'Facebook', color: '#1877F2' },
  { icon: '▶', label: 'YouTube', color: '#FF0000' },
  { icon: '𝕏', label: 'Twitter/X', color: '#aaa' },
  { icon: 'in', label: 'LinkedIn', color: '#0A66C2' },
];

const FooterSection = () => {
  const [activeModal, setActiveModal] = useState(null);

  const handleLinkClick = (item, e) => {
    if (item.modal) {
      e.preventDefault();
      setActiveModal(item.modal);
    }
  };

  const modal = activeModal ? MODAL_CONTENT[activeModal] : null;

  return (
    <>
      {/* Info Modal */}
      {modal && (
        <div onClick={() => setActiveModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#120b08', border: '1px solid rgba(242,112,36,0.3)',
            borderRadius: 20, padding: '36px 40px', maxWidth: 540, width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            backgroundImage: 'linear-gradient(135deg, rgba(242,112,36,0.04) 0%, transparent 60%)',
            animation: 'modalIn .25s ease',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <style>{`@keyframes modalIn { from{opacity:0;transform:scale(.95)translateY(12px)} to{opacity:1;transform:none} }`}</style>
            {/* Orange top bar */}
            <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#F27024,transparent)', marginBottom: 24, borderRadius: 2 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FF9800', marginBottom: 16, fontFamily: "sans-serif" }}>
              {modal.title}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '.9rem', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
              {modal.content}
            </p>
            <button onClick={() => setActiveModal(null)} style={{
              marginTop: 28, padding: '10px 28px', borderRadius: 50,
              background: 'linear-gradient(135deg,#F27024,#FF5722)', border: 'none',
              color: '#fff', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(242,112,36,0.4)',
            }}>Đóng ✕</button>
          </div>
        </div>
      )}

      <footer style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(11, 7, 4, 0.95), rgba(15, 10, 7, 0.98))',
        borderTop: '1px solid rgba(242,112,36,0.15)',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="container" style={{ paddingTop: 64 }}>
            <div className="hanoi-divider" style={{ marginBottom: 48 }}>
              <span>🧡</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, paddingBottom: 56 }}>
              {/* Brand */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#F27024,#FF5722)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#fff', boxShadow: '0 4px 16px rgba(242,112,36,.5)' }}>O</div>
                  <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#FF9800', letterSpacing: '.02em', fontFamily: 'sans-serif' }}>HolaMate</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,.48)', fontSize: '.86rem', lineHeight: 1.8, maxWidth: 260, marginBottom: 24 }}>
                  Trợ lý ẩm thực & đời sống AI chuyên biệt cho FPT Hoà Lạc. Gợi ý món ngon, xem review chân thực và khảo sát giá sinh viên minh bạch.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {socials.map(s => (
                    <a key={s.label} href="#" aria-label={s.label}
                      style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)', fontSize: '.8rem', fontWeight: 700, transition: 'all .25s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = s.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = s.color; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; }}>
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Link columns */}
              {Object.entries(footerLinks).map(([group, links]) => (
                <div key={group}>
                  <h5 style={{ color: '#FF9800', fontWeight: 700, fontSize: '.78rem', marginBottom: 18, letterSpacing: '.1em', textTransform: 'uppercase' }}>{group}</h5>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {links.map(item => (
                      <li key={item.label}>
                        {item.to ? (
                          <Link to={item.to}
                            style={{ color: 'rgba(255,255,255,.42)', fontSize: '.84rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s', paddingLeft: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F27024'; e.currentTarget.style.paddingLeft = '6px'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.42)'; e.currentTarget.style.paddingLeft = '0'; }}>
                            <span style={{ opacity: 0.4, fontSize: '.7rem' }}>→</span> {item.label}
                          </Link>
                        ) : item.href ? (
                          <a href={item.href}
                            style={{ color: 'rgba(255,255,255,.42)', fontSize: '.84rem', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s', paddingLeft: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F27024'; e.currentTarget.style.paddingLeft = '6px'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.42)'; e.currentTarget.style.paddingLeft = '0'; }}>
                            <span style={{ opacity: 0.4, fontSize: '.7rem' }}>→</span> {item.label}
                          </a>
                        ) : (
                          <button onClick={e => handleLinkClick(item, e)}
                            style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,.42)', fontSize: '.84rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s', width: '100%', paddingLeft: 0, fontFamily: 'Inter,sans-serif' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F27024'; e.currentTarget.style.paddingLeft = '6px'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.42)'; e.currentTarget.style.paddingLeft = '0'; }}>
                            <span style={{ opacity: 0.4, fontSize: '.7rem' }}>→</span> {item.label}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Newsletter */}
            <div style={{ borderTop: '1px solid rgba(242,112,36,0.15)', padding: '32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h5 style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>🧡 Nhận tips đời sống Hoà Lạc hàng tuần</h5>
                <p style={{ color: 'rgba(255,255,255,.38)', fontSize: '.82rem' }}>Không spam. Huỷ đăng ký bất kỳ lúc nào.</p>
              </div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(242,112,36,.25)', borderRadius: 50, overflow: 'hidden', maxWidth: 380, width: '100%' }}>
                <input type="email" placeholder="email@example.com" style={{ flex: 1, background: 'none', border: 'none', padding: '12px 20px', color: '#fff', fontSize: '.88rem', outline: 'none', fontFamily: 'Inter,sans-serif' }} />
                <button className="btn btn-primary btn-sm" style={{ borderRadius: 50, margin: 4, flexShrink: 0 }}>Đăng Ký</button>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ color: 'rgba(255,255,255,.28)', fontSize: '.78rem' }}>© 2026 HolaMate. Made with 🧡 tại FPT Hoà Lạc, Việt Nam.</p>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'Bảo Mật', modal: 'privacy' },
                  { label: 'Điều Khoản', modal: 'terms' },
                  { label: 'Liên Hệ', modal: 'contact' },
                ].map(t => (
                  <button key={t.label} onClick={() => setActiveModal(t.modal)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.28)', fontSize: '.76rem', cursor: 'pointer', transition: 'color .2s', fontFamily: 'Inter,sans-serif', padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F27024'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.28)'}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterSection;
