import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  adminLogin,
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  getAdminSellers,
  updateAdminSeller,
  deleteAdminSeller,
  getAdminVendors,
  updateAdminVendor,
  deleteAdminVendor,
  getAdminOrders,
  updateAdminOrder,
  getAdminFinance,
  updateAdminCommission,
  setAdminVendorPartner
} from '../services/api';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');

  // Active Tab: 'overview' | 'users' | 'sellers' | 'vendors' | 'orders' | 'finance'
  const [activeTab, setActiveTab] = useState('overview');

  // Stats Data
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [sellersList, setSellersList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [financeData, setFinanceData] = useState(null);

  // New Vendor detailed statistics & partnership states
  const [selectedVendorForStats, setSelectedVendorForStats] = useState(null);
  const [partnerModalVendor, setPartnerModalVendor] = useState(null);
  const [partnerSellerName, setPartnerSellerName] = useState('');
  const [partnerSellerEmail, setPartnerSellerEmail] = useState('');
  const [partnerSellerPassword, setPartnerSellerPassword] = useState('');
  const [partnerSellerPhone, setPartnerSellerPhone] = useState('');

  // Commission Modal states
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [editingVendorName, setEditingVendorName] = useState('');
  const [commissionInputRate, setCommissionInputRate] = useState('');

  // Filter and loading states
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Load Admin session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('hanomate_admin_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAdminUser(parsed);
        setIsAdminLoggedIn(true);
      } catch (err) {
        localStorage.removeItem('hanomate_admin_user');
      }
    }
  }, []);

  // Fetch data depending on tab
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    fetchTabData();
  }, [isAdminLoggedIn, activeTab, orderStatusFilter]);

  const fetchTabData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeTab === 'overview') {
        const res = await getAdminStats();
        setStats(res);
      } else if (activeTab === 'users') {
        const res = await getAdminUsers(searchQuery);
        setUsersList(res.users || []);
      } else if (activeTab === 'sellers') {
        const res = await getAdminSellers(searchQuery);
        setSellersList(res.sellers || []);
      } else if (activeTab === 'vendors') {
        const res = await getAdminVendors(searchQuery);
        setVendorsList(res.vendors || []);
        const ordRes = await getAdminOrders('all', '', 1);
        setOrdersList(ordRes.orders || []);
      } else if (activeTab === 'orders') {
        const res = await getAdminOrders(orderStatusFilter, searchQuery);
        setOrdersList(res.orders || []);
      } else if (activeTab === 'finance') {
        const res = await getAdminFinance();
        setFinanceData(res);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Không thể lấy dữ liệu tab: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const data = await adminLogin(loginEmail, loginPassword, requires2fa ? verificationCode : undefined);
      if (data.requires2fa) {
        setRequires2fa(true);
        setDevCodeHint(data.devCode || '');
        setSuccessMsg('Mã xác thực đã được gửi về email!');
        setTimeout(() => setSuccessMsg(''), 3500);
        return;
      }
      localStorage.setItem('hanomate_admin_user', JSON.stringify(data));
      setAdminUser(data);
      setIsAdminLoggedIn(true);
      setSuccessMsg('Đăng nhập Admin thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Đăng nhập Admin thất bại.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hanomate_admin_user');
    setAdminUser(null);
    setIsAdminLoggedIn(false);
    navigate('/');
  };

  // Inline Quick Actions
  const handleToggleAdminStatus = async (userId, currentVal) => {
    try {
      await updateAdminUser(userId, { is_admin: !currentVal });
      fetchTabData();
      showSuccess('Cập nhật quyền Admin thành công');
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteUserClick = async (userId) => {
    if (!window.confirm('Xác nhận xóa tài khoản người dùng này?')) return;
    try {
      await deleteAdminUser(userId);
      fetchTabData();
      showSuccess('Đã xóa người dùng khỏi hệ thống');
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteSellerClick = async (sellerId) => {
    if (!window.confirm('Xác nhận xóa tài khoản người bán và gian hàng liên kết?')) return;
    try {
      await deleteAdminSeller(sellerId);
      fetchTabData();
      showSuccess('Đã xóa người bán và gian hàng');
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateVendorStatus = async (vendorId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminVendor(vendorId, { status: nextStatus });
      fetchTabData();
      showSuccess(`Đã ${nextStatus === 'active' ? 'mở khóa' : 'khóa'} cửa hàng`);
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const handleOpenCommissionModal = (vendorId, vendorName, currentRate) => {
    setEditingVendorId(vendorId);
    setEditingVendorName(vendorName);
    setCommissionInputRate(currentRate !== undefined && currentRate !== null ? currentRate.toString() : '10');
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    if (!editingVendorId) return;
    const rate = parseFloat(commissionInputRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Tỉ lệ chiết khấu phải từ 0% đến 100%');
      return;
    }
    try {
      await updateAdminCommission(editingVendorId, rate);
      setEditingVendorId(null);
      fetchTabData();
      showSuccess('Cập nhật tỉ lệ chiết khấu thành công');
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateAdminOrder(orderId, { status: newStatus });
      fetchTabData();
      showSuccess('Cập nhật trạng thái đơn hàng thành công');
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const handleOpenPartnerModal = (vendor) => {
    setPartnerModalVendor(vendor);
    setPartnerSellerName(vendor.name + ' Owner');
    setPartnerSellerEmail('');
    setPartnerSellerPassword('');
    setPartnerSellerPhone(vendor.phone || '');
  };

  const handleSetPartnerSubmit = async (e) => {
    e.preventDefault();
    if (!partnerSellerEmail || !partnerSellerPassword) {
      alert('Vui lòng cung cấp đầy đủ Email và Mật khẩu đăng nhập');
      return;
    }
    try {
      await setAdminVendorPartner(partnerModalVendor.id, {
        sellerName: partnerSellerName,
        sellerEmail: partnerSellerEmail,
        sellerPassword: partnerSellerPassword,
        sellerPhone: partnerSellerPhone
      });
      setPartnerModalVendor(null);
      fetchTabData();
      showSuccess(`Đã nâng cấp cửa hàng "${partnerModalVendor.name}" thành đối tác thành công!`);
    } catch (err) {
      showError(err.response?.data?.error || err.message);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // UI Format Helpers
  const formatPrice = (val) => {
    return (val || 0).toLocaleString('vi-VN') + 'đ';
  };

  // Login Screen if not authenticated
  if (!isAdminLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 20 }}>
        <form onSubmit={handleLogin} style={{ maxWidth: 400, width: '100%', padding: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '3rem', textShadow: '0 0 20px rgba(242,112,36,0.3)', marginBottom: 12, textAlign: 'center' }}>🛡️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', marginBottom: 24, color: '#fff' }}>HanoMate Admin Portal</h2>
          
          {errorMsg && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 12, fontSize: '0.85rem', marginBottom: 16 }}>{errorMsg}</div>}
          {successMsg && <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', borderRadius: 12, fontSize: '0.85rem', marginBottom: 16 }}>{successMsg}</div>}
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Email quản trị:</label>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={requires2fa} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none', opacity: requires2fa ? 0.5 : 1 }} placeholder="admin@hanomate.vn" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Mật khẩu:</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required disabled={requires2fa} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none', opacity: requires2fa ? 0.5 : 1 }} placeholder="••••••••" />
          </div>

          {requires2fa && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#10B981', fontWeight: 600, marginBottom: 6 }}>Mã xác thực bảo mật (2FA):</label>
              <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required maxLength={6} style={{ width: '100%', padding: '12px 14px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#fff', outline: 'none', letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }} placeholder="123456" />
            </div>
          )}

          {requires2fa && devCodeHint && (
            <div style={{ padding: '10px 14px', background: 'rgba(242,112,36,0.15)', border: '1px solid rgba(242,112,36,0.3)', borderRadius: 12, fontSize: '0.8rem', color: '#F7A072', marginBottom: 20 }}>
              Mã xác thực đã được lưu vào file <code>admin_2fa_code.txt</code>. Mã test nhanh: <strong>{devCodeHint}</strong>
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #F27024, #FF5722)', color: '#fff', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 8px 16px rgba(242,112,36,0.2)' }}>
            {requires2fa ? 'Xác minh & Đăng nhập' : 'Xác thực Quản trị viên'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#090D1A', color: '#E2E8F0', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: 260, background: '#0F172A', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <span style={{ fontSize: '1.8rem' }}>🛡️</span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>HanoMate Admin</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>Hệ thống quản trị</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'overview', label: 'Dashboard Tổng quan', icon: '📊' },
              { key: 'users', label: 'Quản lý Người dùng', icon: '👥' },
              { key: 'sellers', label: 'Quản lý Đối tác', icon: '🏪' },
              { key: 'vendors', label: 'Danh sách Cửa hàng', icon: '🍲' },
              { key: 'orders', label: 'Quản lý Đơn hàng', icon: '📦' },
              { key: 'finance', label: 'Tài chính & Hoa hồng', icon: '💰' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setSearchQuery(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: activeTab === item.key ? 'linear-gradient(135deg, #F27024, #E05F15)' : 'transparent',
                  color: activeTab === item.key ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600, fontSize: '0.88rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, marginBottom: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{adminUser?.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{adminUser?.email}</div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px 16px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            🚪 Đăng xuất Admin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: 40, overflowY: 'auto' }}>
        
        {/* Messages */}
        {successMsg && <div style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(16,185,129,0.95)', color: '#fff', padding: '12px 24px', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 1000, fontWeight: 600 }}>{successMsg}</div>}
        {errorMsg && <div style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(239,68,68,0.95)', color: '#fff', padding: '12px 24px', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 1000, fontWeight: 600 }}>{errorMsg}</div>}

        {/* Tab content renderer */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(242,112,36,0.1)', borderTopColor: '#F27024', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Đang đồng bộ dữ liệu...</span>
          </div>
        ) : (
          <div>
            
            {/* SEARCH AND FILTER BAR (For lists) */}
            {activeTab !== 'overview' && activeTab !== 'finance' && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Nhập từ khóa tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: 260, padding: '12px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                />
                
                {activeTab === 'orders' && (
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    style={{ padding: '12px 18px', background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="preparing">Đang chuẩn bị</option>
                    <option value="delivering">Đang giao</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                )}

                <button onClick={fetchTabData} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                  Tìm kiếm 🔍
                </button>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && stats && (
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 28 }}>Tổng quan Hệ sinh thái</h1>
                
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 36 }}>
                  {[
                    { title: 'Người dùng (Buyers)', value: stats.users?.total, desc: `+${stats.users?.new30d} mới (30 ngày)`, icon: '👥' },
                    { title: 'Đối tác (Sellers)', value: stats.sellers?.total, desc: `+${stats.sellers?.new30d} mới (30 ngày)`, icon: '🏪' },
                    { title: 'Cửa hàng (Vendors)', value: stats.vendors?.total, desc: 'Tổng số gian hàng', icon: '🍲' },
                    { title: 'Đơn hàng (Orders)', value: stats.orders?.total, desc: `${stats.orders?.completed} thành công`, icon: '📦' },
                    { title: 'Hoa hồng thu về', value: formatPrice(stats.orders?.totalCommission), desc: 'Từ các cửa hàng đối tác', icon: '💰', highlight: true }
                  ].map((card, i) => (
                    <div key={i} style={{ background: card.highlight ? 'rgba(242,112,36,0.06)' : 'rgba(255,255,255,0.02)', border: card.highlight ? '1px solid rgba(242,112,36,0.2)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{card.title}</span>
                        <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.highlight ? '#FF8A00' : '#fff', marginBottom: 6 }}>{card.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{card.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Subsections */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                  {/* Top selling vendors */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>🔥 Top 10 đối tác doanh thu cao nhất</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {stats.topVendors?.map((v, idx) => (
                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{idx + 1}. {v.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{v.address}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', color: '#10B981', fontWeight: 800 }}>{formatPrice(v.revenue)}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{v.orderCount} đơn hàng</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue last days list */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>📅 Lịch sử doanh số 30 ngày gần đây</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                      {stats.revenueByDay?.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 10 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(r.date).toLocaleDateString('vi-VN')}</span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.88rem', color: '#FFB800', fontWeight: 700, marginRight: 10 }}>{formatPrice(r.revenue)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>({r.orders} đơn)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USER MANAGEMENT */}
            {activeTab === 'users' && (
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 20 }}>Danh sách Người dùng</h1>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 24, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        <th style={{ padding: '12px 16px' }}>Họ tên</th>
                        <th style={{ padding: '12px 16px' }}>Email</th>
                        <th style={{ padding: '12px 16px' }}>Vai trò</th>
                        <th style={{ padding: '12px 16px' }}>Đăng nhập</th>
                        <th style={{ padding: '12px 16px' }}>Quyền Admin</th>
                        <th style={{ padding: '12px 16px' }}>Ngày tạo</th>
                        <th style={{ padding: '12px 16px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#fff' }}>{u.name}</td>
                          <td style={{ padding: '14px 16px' }}>{u.email}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem' }}>Buyer</span>
                          </td>
                          <td style={{ padding: '14px 16px', textTransform: 'capitalize' }}>{u.provider}</td>
                          <td style={{ padding: '14px 16px' }}>{u.is_admin ? '✅ Admin' : '❌ Thường'}</td>
                          <td style={{ padding: '14px 16px' }}>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                          <td style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
                            <button onClick={() => handleToggleAdminStatus(u.id, u.is_admin)} style={{ padding: '6px 12px', background: 'rgba(242,112,36,0.1)', color: '#F27024', border: '1px solid rgba(242,112,36,0.2)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Set Admin</button>
                            <button onClick={() => handleDeleteUserClick(u.id)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: SELLER PARTNERS */}
            {activeTab === 'sellers' && (
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 20 }}>Danh sách Đối tác (Sellers)</h1>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 24, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        <th style={{ padding: '12px 16px' }}>Đối tác</th>
                        <th style={{ padding: '12px 16px' }}>Liên hệ</th>
                        <th style={{ padding: '12px 16px' }}>Tên Cửa hàng</th>
                        <th style={{ padding: '12px 16px' }}>Địa chỉ</th>
                        <th style={{ padding: '12px 16px' }}>Chiết khấu</th>
                        <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 16px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellersList.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#fff' }}>{s.name}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div>{s.email}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{s.phone || 'Chưa cập nhật SĐT'}</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 500, color: '#FFB800' }}>{s.vendor_name || 'Chưa khởi tạo'}</td>
                          <td style={{ padding: '14px 16px' }}>{s.vendor_address || 'Chưa cập nhật'}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 700 }}>{s.commission_rate || 10}%</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              background: s.vendor_status === 'suspended' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                              color: s.vendor_status === 'suspended' ? '#EF4444' : '#10B981',
                              padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem'
                            }}>{s.vendor_status === 'suspended' ? 'Đã khóa' : 'Hoạt động'}</span>
                          </td>
                          <td style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
                            <button onClick={() => handleUpdateVendorStatus(s.vendor_id, s.vendor_status)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>{s.vendor_status === 'suspended' ? 'Mở khóa' : 'Khóa shop'}</button>
                            <button onClick={() => handleOpenCommissionModal(s.vendor_id, s.vendor_name || 'Đối tác', s.commission_rate)} style={{ padding: '6px 12px', background: 'rgba(242,112,36,0.1)', color: '#F27024', border: '1px solid rgba(242,112,36,0.2)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>% Hoa hồng</button>
                            <button onClick={() => handleDeleteSellerClick(s.id)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: VENDOR SHOPS LISTING */}
            {activeTab === 'vendors' && (
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 20 }}>Danh sách Cửa hàng (Vendors)</h1>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 24, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        <th style={{ padding: '12px 16px' }}>Cửa hàng</th>
                        <th style={{ padding: '12px 16px' }}>Nhóm dịch vụ</th>
                        <th style={{ padding: '12px 16px' }}>Địa chỉ</th>
                        <th style={{ padding: '12px 16px' }}>Đánh giá</th>
                        <th style={{ padding: '12px 16px' }}>Tổng đơn</th>
                        <th style={{ padding: '12px 16px' }}>Tổng doanh thu</th>
                        <th style={{ padding: '12px 16px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorsList.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td 
                            style={{ padding: '14px 16px', fontWeight: 600, color: '#F27024', cursor: 'pointer', textDecoration: 'underline' }} 
                            onClick={() => setSelectedVendorForStats(v)}
                            title="Bấm để xem thống kê chi tiết"
                          >
                            {v.name} 📊
                          </td>
                          <td style={{ padding: '14px 16px' }}>{v.category}</td>
                          <td style={{ padding: '14px 16px' }}>{v.address}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#FFB800' }}>⭐ {v.rating || '5.0'}</td>
                          <td style={{ padding: '14px 16px' }}>{v.order_count || 0}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10B981' }}>{formatPrice(v.revenue)}</td>
                          <td style={{ padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button onClick={() => handleOpenCommissionModal(v.id, v.name, v.commission_rate)} style={{ padding: '6px 12px', background: 'rgba(242,112,36,0.1)', color: '#F27024', border: '1px solid rgba(242,112,36,0.2)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                              Chiết khấu ({v.commission_rate !== undefined && v.commission_rate !== null ? v.commission_rate : 10}%)
                            </button>
                            {v.owner_id ? (
                              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>Đối tác chính thức 🤝</span>
                            ) : (
                              <>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Chưa là đối tác</span>
                                <button onClick={() => handleOpenPartnerModal(v)} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Set Đối tác 🤝</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: SYSTEM ORDERS */}
            {activeTab === 'orders' && (
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 20 }}>Quản lý Đơn hàng toàn hệ thống</h1>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 24, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        <th style={{ padding: '12px 16px' }}>Mã đơn</th>
                        <th style={{ padding: '12px 16px' }}>Cửa hàng</th>
                        <th style={{ padding: '12px 16px' }}>Khách hàng</th>
                        <th style={{ padding: '12px 16px' }}>Chi tiết</th>
                        <th style={{ padding: '12px 16px' }}>Thành tiền</th>
                        <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 16px' }}>Cập nhật trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.map(o => {
                        const statusColors = {
                          pending: '#F59E0B', preparing: '#3B82F6',
                          delivering: '#8B5CF6', completed: '#10B981', cancelled: '#EF4444'
                        };
                        const statusLabels = {
                          pending: 'Chờ duyệt', preparing: 'Chuẩn bị',
                          delivering: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy'
                        };
                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 700 }}>#{o.id.substring(o.id.length - 6)}</td>
                            <td style={{ padding: '14px 16px', fontWeight: 600 }}>{o.vendor_name}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ color: '#fff', fontWeight: 500 }}>{o.customer_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{o.customer_phone}</div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {o.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#FFB800' }}>{formatPrice(o.total_amount)}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                color: statusColors[o.status],
                                background: `${statusColors[o.status]}15`,
                                padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem'
                              }}>{statusLabels[o.status]}</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                style={{ padding: '6px 10px', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                              >
                                <option value="pending">Chờ duyệt</option>
                                <option value="preparing">Chuẩn bị</option>
                                <option value="delivering">Đang giao</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="cancelled">Hủy đơn</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: FINANCE & COMMISSIONS */}
            {activeTab === 'finance' && financeData && (
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 28 }}>Đối soát Doanh thu & Chiết khấu</h1>

                {/* Finance Overview Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 36 }}>
                  <div style={{ background: 'rgba(242,112,36,0.03)', border: '1px solid rgba(242,112,36,0.15)', borderRadius: 24, padding: 28 }}>
                    <div style={{ fontSize: '0.85rem', color: '#F27024', marginBottom: 8, fontWeight: 500 }}>TỔNG HOA HỒNG THU VỀ (HanoMate Share)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFB800' }}>{formatPrice(financeData.overview?.totalCommission)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>Tính theo tỉ lệ chiết khấu riêng của từng cửa hàng đối tác (chỉ tính các cửa hàng được set làm đối tác)</div>
                  </div>
                </div>

                {/* Vendor commission listing */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>💼 Chi tiết dòng tiền của từng Đối tác</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                        <th style={{ padding: '12px 16px' }}>Cửa hàng</th>
                        <th style={{ padding: '12px 16px' }}>Mức chiết khấu</th>
                        <th style={{ padding: '12px 16px' }}>Số đơn thành công</th>
                        <th style={{ padding: '12px 16px' }}>Tổng doanh thu gộp</th>
                        <th style={{ padding: '12px 16px' }}>Hoa hồng hệ thống thu</th>
                        <th style={{ padding: '12px 16px' }}>Doanh thu thực nhận (cửa hàng)</th>
                        <th style={{ padding: '12px 16px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeData.vendorRevenues?.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#fff' }}>{v.name}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 700 }}>{v.commissionRate}%</td>
                          <td style={{ padding: '14px 16px' }}>{v.orderCount} đơn</td>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{formatPrice(v.revenue)}</td>
                          <td style={{ padding: '14px 16px', color: '#FFB800', fontWeight: 700 }}>{formatPrice(v.commission)}</td>
                          <td style={{ padding: '14px 16px', color: '#10B981', fontWeight: 800 }}>{formatPrice(v.revenue - v.commission)}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <button onClick={() => handleUpdateCommission(v.id)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Sửa chiết khấu</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

      {/* MODAL 1: Vendor Detailed Statistics */}
      {selectedVendorForStats && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>📊 Thống kê Cửa hàng: {selectedVendorForStats.name}</h2>
              <button onClick={() => setSelectedVendorForStats(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>&times;</button>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tổng doanh thu (Gross)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{formatPrice(selectedVendorForStats.revenue)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Chiết khấu hệ thống</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F27024' }}>{selectedVendorForStats.commission_rate || 10}%</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Doanh thu thực nhận (Net)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFB800' }}>
                  {formatPrice(selectedVendorForStats.revenue - (selectedVendorForStats.revenue * (selectedVendorForStats.commission_rate || 10) / 100))}
                </div>
              </div>
            </div>

            {/* General details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 12, margin: 0 }}>Thông tin chung</h3>
                <p style={{ fontSize: '0.85rem', margin: '6px 0', color: 'rgba(255,255,255,0.8)' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Danh mục:</span> {selectedVendorForStats.category}</p>
                <p style={{ fontSize: '0.85rem', margin: '6px 0', color: 'rgba(255,255,255,0.8)' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Địa chỉ:</span> {selectedVendorForStats.address}</p>
                <p style={{ fontSize: '0.85rem', margin: '6px 0', color: 'rgba(255,255,255,0.8)' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Số điện thoại:</span> {selectedVendorForStats.phone || 'Chưa cập nhật'}</p>
                <p style={{ fontSize: '0.85rem', margin: '6px 0', color: 'rgba(255,255,255,0.8)' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Đánh giá:</span> ⭐ {selectedVendorForStats.rating || '5.0'}</p>
                <p style={{ fontSize: '0.85rem', margin: '6px 0', color: 'rgba(255,255,255,0.8)' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Trạng thái:</span> 
                  <span style={{ marginLeft: 6, color: selectedVendorForStats.status === 'active' ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                    {selectedVendorForStats.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                  </span>
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 12, margin: 0 }}>Thực đơn ({selectedVendorForStats.menu?.length || 0} món)</h3>
                <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedVendorForStats.menu?.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: 4 }}>
                      <span>{m.name}</span>
                      <span style={{ color: '#FFB800', fontWeight: 600 }}>{formatPrice(m.price)}</span>
                    </div>
                  ))}
                  {(!selectedVendorForStats.menu || selectedVendorForStats.menu.length === 0) && (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }}>Chưa có món ăn nào</div>
                  )}
                </div>
              </div>
            </div>

            {/* Orders list */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 12, margin: 0 }}>Đơn đặt hàng ({ordersList.filter(o => o.vendor_id === selectedVendorForStats.id).length} đơn)</h3>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                      <th style={{ padding: '8px 12px' }}>Mã đơn</th>
                      <th style={{ padding: '8px 12px' }}>Khách hàng</th>
                      <th style={{ padding: '8px 12px' }}>Món đặt</th>
                      <th style={{ padding: '8px 12px' }}>Thành tiền</th>
                      <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.filter(o => o.vendor_id === selectedVendorForStats.id).map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>#{o.id.substring(o.id.length - 6)}</td>
                        <td style={{ padding: '10px 12px' }}>{o.customer_name}</td>
                        <td style={{ padding: '10px 12px' }}>{o.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#FFB800' }}>{formatPrice(o.total_amount)}</td>
                        <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{o.status}</td>
                      </tr>
                    ))}
                    {ordersList.filter(o => o.vendor_id === selectedVendorForStats.id).length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Chưa có đơn hàng nào</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Upgrade Vendor to Seller Partner */}
      {partnerModalVendor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <form onSubmit={handleSetPartnerSubmit} style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32, maxWidth: 500, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>🤝 Phê duyệt Đối tác: {partnerModalVendor.name}</h2>
              <button type="button" onClick={() => setPartnerModalVendor(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>&times;</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 20, lineHeight: 1.6 }}>
              Hành động này sẽ chuyển trạng thái của cửa hàng <strong>{partnerModalVendor.name}</strong> sang hoạt động, đồng thời cấp tài khoản quản trị (Seller) cho cửa hàng này.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Tên người đại diện:</label>
              <input type="text" value={partnerSellerName} onChange={(e) => setPartnerSellerName(e.target.value)} required style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email đăng nhập (Duy nhất):</label>
              <input type="email" value={partnerSellerEmail} onChange={(e) => setPartnerSellerEmail(e.target.value)} required placeholder="VD: owner@gmail.com" style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Mật khẩu khởi tạo:</label>
              <input type="password" value={partnerSellerPassword} onChange={(e) => setPartnerSellerPassword(e.target.value)} required placeholder="Tối thiểu 6 ký tự" style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Số điện thoại liên hệ:</label>
              <input type="text" value={partnerSellerPhone} onChange={(e) => setPartnerSellerPhone(e.target.value)} placeholder="0987xxxxxx" style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setPartnerModalVendor(null)} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Hủy bỏ</button>
              <button type="submit" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #F27024, #FF5722)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Phê duyệt & Tạo đối tác</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Update Vendor Commission Rate */}
      {editingVendorId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <form onSubmit={handleCommissionSubmit} style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32, maxWidth: 450, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>⚙️ Cập nhật Chiết khấu</h2>
              <button type="button" onClick={() => setEditingVendorId(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}>&times;</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 20, lineHeight: 1.6 }}>
              Thiết lập phần trăm chiết khấu mới cho cửa hàng <strong>{editingVendorName}</strong>. Mức chiết khấu này sẽ được áp dụng cho toàn bộ các đơn hàng hoàn thành tiếp theo.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Tỉ lệ chiết khấu (%) :</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.1"
                  value={commissionInputRate} 
                  onChange={(e) => setCommissionInputRate(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '12px 35px 12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', outline: 'none', fontSize: '1.1rem', fontWeight: 700 }} 
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>%</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingVendorId(null)} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Hủy bỏ</button>
              <button type="submit" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #F27024, #FF5722)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .hover-underline:hover { text-decoration: underline !important; opacity: 0.85; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
