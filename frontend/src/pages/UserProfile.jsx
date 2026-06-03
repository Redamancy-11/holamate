import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { updateUserProfile, requestStudentVerification, reportAccount, getAdminUsers, getAdminSellers } from '../services/api';

const UserProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [anonymitySetting, setAnonymitySetting] = useState('none'); // 'none' | 'partial' | 'full'

  // Student verify fields
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Report fields
  const [reportTargetType, setReportTargetType] = useState('user'); // 'user' | 'seller'
  const [reportedId, setReportedId] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  
  // Search lists for reporting
  const [searchQuery, setSearchQuery] = useState('');
  const [searchList, setSearchList] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Status/Messages
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    setName(user.name || '');
    setPhone(user.phone || '');
    setAvatar(user.avatar || '');
    setAnonymitySetting(user.anonymity_setting || 'none');
    setStudentId(user.student_id || '');
    setStudentEmail(user.student_email || '');
  }, [user]);

  // Search users or sellers for report target
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchList([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        if (reportTargetType === 'user') {
          const res = await getAdminUsers(searchQuery);
          // filter out self
          setSearchList((res.users || []).filter(u => u.id !== user?.id));
        } else {
          const res = await getAdminSellers(searchQuery);
          setSearchList(res.sellers || []);
        }
      } catch (err) {
        console.error('Error searching report targets:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, reportTargetType]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoadingProfile(true);
    try {
      const res = await updateUserProfile({ name, phone, avatar, anonymity_setting: anonymitySetting });
      setUser({ ...user, ...res.user });
      setSuccessMsg('Cập nhật thông tin cá nhân thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Có lỗi xảy ra khi cập nhật hồ sơ');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleRequestVerify = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoadingVerify(true);
    try {
      const res = await requestStudentVerification({ student_id: studentId, student_email: studentEmail });
      setUser({ ...user, ...res.user });
      setSuccessMsg('Gửi yêu cầu xác thực sinh viên thành công! Đang chờ Admin phê duyệt.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Gửi yêu cầu xác thực thất bại.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!reportedId) {
      setErrorMsg('Vui lòng chọn tài khoản cần báo cáo từ danh sách tìm kiếm');
      return;
    }
    setSuccessMsg('');
    setErrorMsg('');
    setLoadingReport(true);
    try {
      const payload = {
        reason: reportReason,
        description: reportDescription,
        reported_user_id: reportTargetType === 'user' ? reportedId : undefined,
        reported_seller_id: reportTargetType === 'seller' ? reportedId : undefined,
      };
      await reportAccount(payload);
      setSuccessMsg('Gửi báo cáo vi phạm thành công! Admin sẽ sớm xử lý.');
      setReportedId('');
      setSearchQuery('');
      setReportReason('');
      setReportDescription('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Gửi báo cáo vi phạm thất bại.');
    } finally {
      setLoadingReport(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 100%)',
      padding: '100px 16px 60px 16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#fff'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0', background: 'linear-gradient(to right, #FF8A00, #FF007A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Hồ Sơ & Tài Khoản
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
            Quản lý thông tin cá nhân, xác thực trạng thái sinh viên và gửi báo cáo vi phạm.
          </p>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', padding: '14px 20px', borderRadius: 12, marginBottom: 24, fontSize: '0.9rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>✅</span> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', padding: '14px 20px', borderRadius: 12, marginBottom: 24, fontSize: '0.9rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>❌</span> {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 30 }}>

          {/* Section 1: Personal Profile */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>👤</span> Thông Tin Cá Nhân
            </h2>
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10 }}>
                <img 
                  src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF7A00&color=fff`} 
                  alt="Avatar" 
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #FF7A00', boxShadow: '0 4px 14px rgba(255,122,0,0.3)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>Ảnh đại diện</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>Nhập đường dẫn URL ảnh của bạn ở dưới</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Họ và Tên</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  placeholder="Nhập họ và tên..."
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Số Điện Thoại</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="Nhập số điện thoại..."
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Đường Dẫn Ảnh Đại Diện (Avatar URL)</label>
                <input 
                  type="url" 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)} 
                  placeholder="https://example.com/avatar.jpg"
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Chế Độ Ẩn Danh (Khi viết Review)</label>
                <select 
                  value={anonymitySetting} 
                  onChange={(e) => setAnonymitySetting(e.target.value)}
                  style={{ width: '100%', background: '#1E3E62', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                >
                  <option value="none">Hiển thị đầy đủ (Tên & Avatar thật)</option>
                  <option value="partial">Ẩn danh một phần (Chỉ hiển thị họ tên viết tắt)</option>
                  <option value="full">Ẩn danh hoàn toàn (Hiển thị là Người Dùng HolaMate)</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button 
                  type="submit" 
                  disabled={loadingProfile}
                  style={{ background: 'linear-gradient(135deg, #FF8A00, #FF5722)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(255,87,34,0.3)', transition: 'all 0.2s' }}
                >
                  {loadingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Student Verification */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🎓</span> Xác Thực Sinh Viên FPTU
            </h2>

            {user.student_verified ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981' }}>Đã xác thực Sinh viên thành công!</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                    Mã Sinh Viên: <strong style={{ color: '#fff' }}>{user.student_id}</strong> | Email: <strong style={{ color: '#fff' }}>{user.student_email}</strong>
                  </div>
                </div>
              </div>
            ) : user.student_verification_status === 'pending' ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <span style={{ fontSize: '2rem' }}>⏳</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F59E0B' }}>Yêu cầu đang được kiểm duyệt</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                    Hồ sơ xác thực cho Mã Sinh Viên <strong style={{ color: '#fff' }}>{user.student_id}</strong> đang được Admin phê duyệt. Vui lòng chờ trong chốc lát!
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  Xác thực sinh viên để nhận các ưu đãi đặc quyền, mã giảm giá dành riêng cho FPTU, và có cơ hội mở gian hàng sinh viên miễn phí trên HolaMate!
                </p>

                <form onSubmit={handleRequestVerify} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Mã Số Sinh Viên (Student ID)</label>
                    <input 
                      type="text" 
                      value={studentId} 
                      onChange={(e) => setStudentId(e.target.value.toUpperCase())} 
                      required
                      placeholder="VD: HE181234"
                      style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Email Sinh Viên FPT (@fpt.edu.vn / @fe.edu.vn)</label>
                    <input 
                      type="email" 
                      value={studentEmail} 
                      onChange={(e) => setStudentEmail(e.target.value)} 
                      required
                      placeholder="example@fpt.edu.vn"
                      style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button 
                      type="submit" 
                      disabled={loadingVerify}
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}
                    >
                      {loadingVerify ? 'Đang gửi...' : 'Gửi Yêu Cầu Xác Thực'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Section 3: Report Abuse / Complaints */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⚠️</span> Báo Cáo Tài Khoản Vi Phạm
            </h2>

            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Hãy giúp HolaMate duy trì một cộng đồng lành mạnh. Nếu bạn phát hiện bất kỳ người dùng hoặc cửa hàng nào có hành vi gian lận, spam, ngôn từ kích động, hay bán sản phẩm kém chất lượng, hãy báo cáo ngay cho ban quản trị.
            </p>

            <form onSubmit={handleSendReport} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
              
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="targetType" 
                    value="user" 
                    checked={reportTargetType === 'user'} 
                    onChange={() => { setReportTargetType('user'); setReportedId(''); setSearchQuery(''); }}
                  />
                  Báo cáo Người Dùng
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="targetType" 
                    value="seller" 
                    checked={reportTargetType === 'seller'} 
                    onChange={() => { setReportTargetType('seller'); setReportedId(''); setSearchQuery(''); }}
                  />
                  Báo cáo Người Bán / Cửa Hàng
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Tìm Kiếm Tài Khoản Bị Báo Cáo (Tên hoặc Email)</label>
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Gõ ít nhất 2 ký tự để tìm kiếm..."
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />

                {/* Dropdown search results */}
                {searchQuery.trim().length >= 2 && (
                  <div style={{
                    background: '#1E3E62',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    marginTop: 8,
                    maxHeight: 180,
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                  }}>
                    {searchLoading ? (
                      <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Đang tìm kiếm...</div>
                    ) : searchList.length === 0 ? (
                      <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Không tìm thấy tài khoản phù hợp</div>
                    ) : (
                      searchList.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setReportedId(item.id);
                            setSearchQuery(`${item.name} (${item.email})`);
                            setSearchList([]);
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: reportedId === item.id ? 'rgba(242,112,36,0.15)' : 'transparent',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = reportedId === item.id ? 'rgba(242,112,36,0.15)' : 'transparent'}
                        >
                          <img 
                            src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`} 
                            alt="" 
                            style={{ width: 30, height: 30, borderRadius: '50%' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{item.email}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Lý Do Báo Cáo</label>
                <select 
                  value={reportReason} 
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  style={{ width: '100%', background: '#1E3E62', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                >
                  <option value="">-- Chọn lý do báo cáo --</option>
                  <option value="spam">Spam / Đăng tin rác</option>
                  <option value="harassment">Quấy rối / Ngôn từ kích động</option>
                  <option value="fraud">Gian lận / Lừa đảo tiền bạc</option>
                  <option value="bad_food_quality">Chất lượng đồ ăn quá kém / Không hợp vệ sinh</option>
                  <option value="wrong_info">Cung cấp thông tin giả mạo / Sai sự thật</option>
                  <option value="other">Lý do khác</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 8, fontWeight: 600 }}>Mô Tả Chi Tiết (Không bắt buộc)</label>
                <textarea 
                  rows="4" 
                  value={reportDescription} 
                  onChange={(e) => setReportDescription(e.target.value)} 
                  placeholder="Cung cấp thêm chi tiết hoặc bằng chứng cụ thể..."
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button 
                  type="submit" 
                  disabled={loadingReport}
                  style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(239,68,68,0.3)', transition: 'all 0.2s' }}
                >
                  {loadingReport ? 'Đang gửi...' : 'Gửi Báo Cáo'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default UserProfile;
