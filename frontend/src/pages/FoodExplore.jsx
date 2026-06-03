import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getVendors, getStudentStoresPublic, getCommunityReviews, getMyOrders } from '../services/api';

const FoodExplore = () => {
  const navigate = useNavigate();
  const { user, sellerUser } = useContext(AuthContext);
  const activeUser = user || sellerUser;
  
  const [activeTab, setActiveTab] = useState('restaurants'); // 'restaurants' or 'stalls'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [restaurants, setRestaurants] = useState([]);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Orders history states
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Selected Vendor/Stall details modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemReviews, setItemReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Filters for Restaurants
  const [resType, setResType] = useState('all'); // all, cơm, bún, trà sữa, cafe, ăn vặt, đồ uống
  const [resMaxPrice, setResMaxPrice] = useState(150000);
  const [resOpenOnly, setResOpenOnly] = useState(false);
  const [resShipping, setResShipping] = useState('all'); // all, ship, noship

  // Filters for Student Stalls
  const [stallType, setStallType] = useState('all'); // all, đồ ăn, đồ uống, trưng bày
  const [stallMaxPrice, setStallMaxPrice] = useState(100000);
  const [stallStatus, setStallStatus] = useState('all'); // all, available, preorder

  const fetchOrders = async () => {
    if (!activeUser) return;
    try {
      setOrdersLoading(true);
      const res = await getMyOrders();
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn('Error fetching orders in FoodExplore:', err.message);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchOrders();
  }, [activeUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resData = await getVendors();
      const vendorsList = Array.isArray(resData) ? resData : (resData?.data || []);
      const normRes = vendorsList.filter(v => v.source !== 'student' && v.category !== 'Cửa hàng sinh viên');
      setRestaurants(normRes);

      const stallData = await getStudentStoresPublic();
      setStalls(stallData.data || []);
    } catch (err) {
      console.error('Fetch exploration data error:', err);
      setError('Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenItemDetails = async (item, type) => {
    const isStall = type === 'stall';
    // Normalize properties so we can reuse detail layout
    const normalized = {
      id: item.id || item.vendor_id,
      vendor_id: item.vendor_id || item.id,
      name: item.name || item.store_name,
      category: item.category,
      description: item.description || item.note || 'Không có mô tả.',
      hours: item.operating_hours || item.hours || 'Chưa cập nhật',
      address: item.address || 'Hòa Lạc, Thạch Thất, Hà Nội',
      phone: item.phone || 'Chưa cập nhật',
      rating: item.rating || 5.0,
      longitude: item.longitude || 105.525,
      latitude: item.latitude || 21.013,
      menu: item.menu || [],
      isStall: isStall,
      student_id: item.student_id || null,
      avatar: item.avatar || null,
      meeting_point: item.address || 'Khu vực KTX FPT',
      source: isStall ? 'student' : 'vendor',
      rawItem: item
    };

    setSelectedItem(normalized);
    setLoadingReviews(true);
    try {
      // Get community reviews filtered by target ID
      const revs = await getCommunityReviews(
        isStall ? { student_store_id: item.id } : { vendor_id: item.id }
      );
      setItemReviews(revs.data || []);
    } catch (err) {
      console.error('Fetch reviews error:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Helper images
  const getBannerImage = (category, name) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('cơm')) return 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=600&q=80';
    if (cat.includes('bún') || cat.includes('phở') || cat.includes('mì')) return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80';
    if (cat.includes('trà sữa') || cat.includes('milk tea')) return 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=600&q=80';
    if (cat.includes('cafe') || cat.includes('cà phê')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80';
    if (cat.includes('ăn vặt') || cat.includes('xiên')) return 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80';
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
  };

  const getStallImage = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('uống') || cat.includes('nước')) return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80';
    if (cat.includes('trưng bày') || cat.includes('phụ kiện') || cat.includes('đồ dùng')) return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80';
    return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80'; // cake/sweets
  };

  // Check opening status helper
  const isCurrentlyOpen = (hoursStr) => {
    if (!hoursStr || hoursStr === 'Chưa cập nhật') return true;
    try {
      const match = hoursStr.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
      if (!match) return true;
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const startMin = parseInt(match[1]) * 60 + parseInt(match[2]);
      const endMin = parseInt(match[3]) * 60 + parseInt(match[4]);
      return currentMin >= startMin && currentMin <= endMin;
    } catch (_) {
      return true;
    }
  };

  // Filtered Restaurants
  const filteredRestaurants = restaurants.filter(res => {
    // Search query matches name, category, or any dish name
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = res.name.toLowerCase().includes(q);
      const matchCategory = res.category.toLowerCase().includes(q);
      const matchMenu = (res.menu || []).some(item => item.name.toLowerCase().includes(q));
      if (!matchName && !matchCategory && !matchMenu) return false;
    }
    // Food type filter (optimized category match)
    if (resType !== 'all') {
      const cat = res.category.toLowerCase();
      const name = res.name.toLowerCase();
      const menu = res.menu || [];
      const hasFoodType = (keyword, engKeyword = '') => {
        const matchesCat = cat.includes(keyword) || (engKeyword && cat.includes(engKeyword));
        const matchesName = name.includes(keyword) || (engKeyword && name.includes(engKeyword));
        const matchesMenu = menu.some(item => {
          const itemLower = item.name.toLowerCase();
          return itemLower.includes(keyword) || (engKeyword && itemLower.includes(engKeyword));
        });
        return matchesCat || matchesName || matchesMenu;
      };

      if (resType === 'cơm' && !hasFoodType('cơm', 'rice')) return false;
      if (resType === 'bún' && !hasFoodType('bún') && !hasFoodType('phở') && !hasFoodType('mì', 'noodle')) return false;
      if (resType === 'trà sữa' && !hasFoodType('trà sữa', 'milk tea') && !hasFoodType('trân châu')) return false;
      if (resType === 'cafe' && !hasFoodType('cafe') && !hasFoodType('cà phê', 'coffee')) return false;
      if (resType === 'ăn vặt' && !hasFoodType('ăn vặt') && !hasFoodType('nem chua') && !hasFoodType('bánh') && !hasFoodType('khoai tây') && !hasFoodType('quẩy') && !hasFoodType('mẹt')) return false;
      if (resType === 'đồ uống' && !hasFoodType('uống') && !hasFoodType('nước') && !hasFoodType('trà') && !hasFoodType('cafe') && !hasFoodType('cà phê') && !hasFoodType('bia') && !hasFoodType('coca') && !hasFoodType('sữa')) return false;
    }
    // Price range filter
    const menuPrices = (res.menu || []).map(m => m.price || 0);
    const minPrice = menuPrices.length ? Math.min(...menuPrices) : (res.priceRange?.min || res.priceMin || 20000);
    if (minPrice > resMaxPrice) return false;

    // Opening status
    if (resOpenOnly && !isCurrentlyOpen(res.hours || res.operating_hours)) return false;

    // Shipping status
    if (resShipping !== 'all') {
      const hasShip = !res.address?.toLowerCase().includes('không ship') && !res.note?.toLowerCase().includes('không ship');
      if (resShipping === 'ship' && !hasShip) return false;
      if (resShipping === 'noship' && hasShip) return false;
    }

    return true;
  });

  // Filtered Student Stalls
  const filteredStalls = stalls.filter(stall => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = stall.store_name.toLowerCase().includes(q);
      const matchCategory = (stall.category || '').toLowerCase().includes(q);
      const matchMenu = (stall.menu || []).some(item => item.name.toLowerCase().includes(q));
      if (!matchName && !matchCategory && !matchMenu) return false;
    }
    // Product type
    if (stallType !== 'all') {
      const cat = (stall.category || '').toLowerCase();
      const name = (stall.store_name || '').toLowerCase();
      const menu = stall.menu || [];
      const hasStallType = (keyword) => {
        const matchesCat = cat.includes(keyword);
        const matchesName = name.includes(keyword);
        const matchesMenu = menu.some(item => item.name.toLowerCase().includes(keyword));
        return matchesCat || matchesName || matchesMenu;
      };

      if (stallType === 'đồ ăn' && !hasStallType('ăn') && !hasStallType('bánh') && !hasStallType('cơm') && !hasStallType('mì') && !hasStallType('nem')) return false;
      if (stallType === 'đồ uống' && !hasStallType('uống') && !hasStallType('nước') && !hasStallType('trà') && !hasStallType('sữa') && !hasStallType('cafe') && !hasStallType('cà phê')) return false;
      if (stallType === 'trưng bày' && !hasStallType('trưng bày') && !hasStallType('phụ kiện') && !hasStallType('quà') && !hasStallType('sách') && !hasStallType('vở') && !hasStallType('đồ dùng')) return false;
    }
    // Price range
    // Check menu items prices
    const menuPrices = (stall.menu || []).map(m => m.price || 0);
    const minPrice = menuPrices.length ? Math.min(...menuPrices) : 15000;
    if (minPrice > stallMaxPrice) return false;

    // Availability status
    if (stallStatus !== 'all') {
      const isAvailable = (stall.menu || []).some(m => m.is_available);
      if (stallStatus === 'available' && !isAvailable) return false;
      if (stallStatus === 'preorder' && isAvailable) return false; // simple fallback
    }

    return true;
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0704',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(242, 112, 36, 0.08) 0%, transparent 50%)',
      paddingTop: '100px',
      paddingBottom: '60px',
      color: '#fff'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }} className="animate-fade-up">
          <span style={{
            background: 'rgba(242,112,36,0.15)',
            color: '#F27024',
            border: '1px solid rgba(242,112,36,0.3)',
            borderRadius: '50px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            🍔 Khám Phá Ẩm Thực Hola
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, marginBottom: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ăn Gì Hôm Nay?
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '600px', margin: '0 auto 30px', fontSize: '0.98rem' }}>
            Tổng hợp danh sách các quán ăn ngon quanh Tân Xã và các gian hàng kinh doanh đầy sáng tạo của các bạn sinh viên FPT Hòa Lạc.
          </p>

          {/* Search bar & Tab switches */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '650px',
            margin: '0 auto'
          }}>
            <div style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px',
              padding: '6px 6px 6px 20px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>🔍</span>
              <input
                type="text"
                placeholder="Tìm tên món ăn, quán nướng, trà sữa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  flex: 1,
                  fontSize: '0.95rem'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    marginRight: '12px', cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tab Swinger */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '50px',
              padding: '4px',
              width: '100%',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
            }}>
              <button
                onClick={() => { setActiveTab('restaurants'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  transition: 'all 0.3s ease',
                  background: activeTab === 'restaurants' ? 'linear-gradient(135deg, #F27024, #FF5722)' : 'transparent',
                  color: activeTab === 'restaurants' ? '#fff' : 'rgba(255,255,255,0.6)'
                }}
              >
                Quán Ăn & Cafe 🍔
              </button>
              <button
                onClick={() => { setActiveTab('stalls'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  transition: 'all 0.3s ease',
                  background: activeTab === 'stalls' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
                  color: activeTab === 'stalls' ? '#fff' : 'rgba(255,255,255,0.6)'
                }}
              >
                Gian Hàng Sinh Viên 🎓
              </button>
            </div>
          </div>
        </div>

        {/* Outer Split Layout: Filters on Left, Grid on Right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '30px',
          alignItems: 'start'
        }} className="reveal">
          
          {/* Filters Sidebar */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px',
            padding: '24px',
            position: 'sticky',
            top: '100px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎛️</span> Bộ Lọc Tìm Kiếm
              </span>
              <button
                onClick={() => {
                  if (activeTab === 'restaurants') {
                    setResType('all');
                    setResMaxPrice(150000);
                    setResOpenOnly(false);
                    setResShipping('all');
                  } else {
                    setStallType('all');
                    setStallMaxPrice(100000);
                    setStallStatus('all');
                  }
                }}
                style={{
                  background: 'none', border: 'none', color: '#F27024',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Đặt lại
              </button>
            </div>

            {/* Dynamic filters by active tab */}
            {activeTab === 'restaurants' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Category select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>LOẠI ĐỒ ĂN</label>
                  <select
                    value={resType}
                    onChange={e => setResType(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.88rem'
                    }}
                  >
                    <option value="all">Tất cả danh mục</option>
                    <option value="cơm">Cơm (cơm rang, cơm thố...)</option>
                    <option value="bún">Bún, Phở, Mì</option>
                    <option value="trà sữa">Trà sữa</option>
                    <option value="cafe">Cafe & Cà phê</option>
                    <option value="ăn vặt">Ăn vặt & Đồ chiên</option>
                    <option value="đồ uống">Nước ép & Đồ uống khác</option>
                  </select>
                </div>

                {/* Price Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>
                    <span>GIÁ TỐI ĐA</span>
                    <span style={{ color: '#F27024' }}>{resMaxPrice.toLocaleString()}đ</span>
                  </div>
                  <input
                    type="range"
                    min="15000"
                    max="250000"
                    step="5000"
                    value={resMaxPrice}
                    onChange={e => setResMaxPrice(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#F27024' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <input
                      type="number"
                      min="15000"
                      max="250000"
                      value={resMaxPrice}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setResMaxPrice(val);
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>đ</span>
                  </div>
                </div>

                {/* Opening checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={resOpenOnly}
                    onChange={e => setResOpenOnly(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#F27024' }}
                  />
                  <span>Đang mở cửa</span>
                </label>

                {/* Shipping Radio */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>GIAO HÀNG</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { val: 'all', lbl: 'Tất cả' },
                      { val: 'ship', lbl: 'Có ship tận nơi' },
                      { val: 'noship', lbl: 'Mua mang về / ăn tại quán' }
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="shipping"
                          value={opt.val}
                          checked={resShipping === opt.val}
                          onChange={() => setResShipping(opt.val)}
                          style={{ accentColor: '#F27024' }}
                        />
                        <span>{opt.lbl}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Category select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>LOẠI SẢN PHẨM</label>
                  <select
                    value={stallType}
                    onChange={e => setStallType(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.88rem'
                    }}
                  >
                    <option value="all">Tất cả sản phẩm</option>
                    <option value="đồ ăn">Đồ ăn tự làm (bánh, cơm hộp...)</option>
                    <option value="đồ uống">Nước uống đóng chai, pha chế</option>
                    <option value="trưng bày">Sản phẩm trưng bày & quà lưu niệm</option>
                  </select>
                </div>

                {/* Price Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>
                    <span>GIÁ TỐI ĐA</span>
                    <span style={{ color: '#10B981' }}>{stallMaxPrice.toLocaleString()}đ</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="150000"
                    step="5000"
                    value={stallMaxPrice}
                    onChange={e => setStallMaxPrice(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#10B981' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <input
                      type="number"
                      min="5000"
                      max="150000"
                      value={stallMaxPrice}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setStallMaxPrice(val);
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>đ</span>
                  </div>
                </div>

                {/* Stall Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>TRẠNG THÁI</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { val: 'all', lbl: 'Tất cả' },
                      { val: 'available', lbl: 'Sản phẩm có sẵn' },
                      { val: 'preorder', lbl: 'Cần đặt trước (Pre-order)' }
                    ].map(opt => (
                      <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="stallStatus"
                          value={opt.val}
                          checked={stallStatus === opt.val}
                          onChange={() => setStallStatus(opt.val)}
                          style={{ accentColor: '#10B981' }}
                        />
                        <span>{opt.lbl}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Buyer Order History Section */}
            {activeUser && (
              <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span>📋</span> Lịch Sử Đơn Hàng
                </span>
                {ordersLoading ? (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Đang tải...</div>
                ) : orders.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Bạn chưa có đơn hàng nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                    {orders.slice(0, 5).map(order => {
                      const statusColors = {
                        pending: '#F59E0B', preparing: '#3B82F6',
                        delivering: '#8B5CF6', completed: '#10B981', cancelled: '#EF4444'
                      };
                      const statusLabels = {
                        pending: 'Chờ duyệt', preparing: 'Đang nấu',
                        delivering: 'Đang giao', completed: 'Xong', cancelled: 'Đã hủy'
                      };
                      return (
                        <div key={order._id} style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontSize: '0.78rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                              {order.vendorName}
                            </strong>
                            <span style={{
                              color: statusColors[order.status] || '#ccc',
                              fontSize: '0.68rem',
                              fontWeight: 700
                            }}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: '6px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#F27024' }}>{(order.totalAmount || 0).toLocaleString()}đ</strong>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => navigate('/order', { state: { reorder: order } })}
                                style={{
                                  background: 'rgba(16,185,129,0.12)',
                                  border: '1px solid rgba(16,185,129,0.25)',
                                  color: '#10B981',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Đặt lại
                              </button>
                              {(order.status === 'pending' || order.status === 'preparing' || order.status === 'delivering') && (
                                <button
                                  onClick={() => navigate('/order', { state: { trackOrder: order } })}
                                  style={{
                                    background: 'rgba(242,112,36,0.12)',
                                    border: '1px solid rgba(242,112,36,0.25)',
                                    color: '#F27024',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Theo dõi
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {orders.length > 5 && (
                      <button
                        onClick={() => navigate('/order')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#F27024',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                          marginTop: '4px'
                        }}
                      >
                        Xem tất cả lịch sử →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grid View */}
          <div>
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <div className="spinner" style={{ borderTopColor: activeTab === 'restaurants' ? '#F27024' : '#10B981', margin: '0 auto 16px' }} />
                <span>Đang tải danh sách quán ăn...</span>
              </div>
            ) : error ? (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '16px', color: '#EF4444', textAlign: 'center' }}>
                {error}
              </div>
            ) : (
              <>
                {/* Count Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                    Tìm thấy <strong style={{ color: activeTab === 'restaurants' ? '#F27024' : '#10B981' }}>
                      {activeTab === 'restaurants' ? filteredRestaurants.length : filteredStalls.length}
                    </strong> địa điểm phù hợp
                  </span>
                </div>

                {activeTab === 'restaurants' ? (
                  /* Standard Restaurants Grid */
                  filteredRestaurants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px', color: 'rgba(255,255,255,0.4)' }}>
                      Không tìm thấy quán ăn nào khớp với bộ lọc của bạn 🔍
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: '20px'
                    }}>
                      {filteredRestaurants.map(res => {
                        const isOpen = isCurrentlyOpen(res.hours || res.operating_hours);
                        return (
                          <div
                            key={res.id}
                            onClick={() => handleOpenItemDetails(res, 'restaurant')}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '20px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242,112,36,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
                          >
                            <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                              <img
                                src={getBannerImage(res.category, res.name)}
                                alt={res.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                                <span style={{
                                  background: isOpen ? '#10B981' : '#EF4444',
                                  color: '#fff', fontSize: '0.68rem', fontWeight: 800,
                                  padding: '4px 10px', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}>
                                  {isOpen ? 'MỞ CỬA' : 'ĐÓNG CỬA'}
                                </span>
                              </div>
                            </div>
                            <div style={{ padding: '16px' }}>
                              <div style={{ fontSize: '0.78rem', color: '#F27024', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                {res.category}
                              </div>
                              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', marginBottom: '8px', lineHeight: '1.3' }}>
                                {res.name}
                              </h3>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>📍</span> {res.address}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                  Giá từ: <span style={{ color: '#F27024' }}>{(res.priceRange?.min || 20000).toLocaleString()}đ</span>
                                </span>
                                <span style={{ fontSize: '0.82rem', color: '#FFB800', fontWeight: 700 }}>
                                  ★ {res.rating || 5.0}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Student Stalls Grid */
                  filteredStalls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px', color: 'rgba(255,255,255,0.4)' }}>
                      Không tìm thấy gian hàng sinh viên nào khớp với bộ lọc 🎓
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: '20px'
                    }}>
                      {filteredStalls.map(stall => {
                        const menuPrices = (stall.menu || []).map(m => m.price || 0);
                        const minPrice = menuPrices.length ? Math.min(...menuPrices) : 15000;
                        return (
                          <div
                            key={stall.id}
                            onClick={() => handleOpenItemDetails(stall, 'stall')}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '20px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
                          >
                            <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                              <img
                                src={getStallImage(stall.category)}
                                alt={stall.store_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                <span style={{
                                  background: 'rgba(0, 0, 0, 0.6)',
                                  backdropFilter: 'blur(8px)',
                                  color: '#10B981', fontSize: '0.68rem', fontWeight: 800,
                                  padding: '4px 10px', borderRadius: '50px', border: '1px solid rgba(16,185,129,0.4)'
                                }}>
                                  STUDENT STALL
                                </span>
                              </div>
                            </div>
                            <div style={{ padding: '16px' }}>
                              <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                {stall.category || 'Món sinh viên'}
                              </div>
                              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', marginBottom: '8px', lineHeight: '1.3' }}>
                                {stall.store_name}
                              </h3>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🏫</span> {stall.address || 'Khu vực KTX FPT'}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                  Giá chỉ từ: <span style={{ color: '#10B981' }}>{minPrice.toLocaleString()}đ</span>
                                </span>
                                <span style={{ fontSize: '0.82rem', color: '#FFB800', fontWeight: 700 }}>
                                  ★ {stall.rating || 5.0}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Selected Item Detail Dialog Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }} onClick={() => setSelectedItem(null)}>
          <div style={{
            background: '#0F0B09',
            border: `1px solid ${selectedItem.isStall ? 'rgba(16,185,129,0.2)' : 'rgba(242,112,36,0.2)'}`,
            borderRadius: '24px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Banner block */}
            <div style={{ height: '220px', position: 'relative', overflow: 'hidden' }}>
              <img
                src={selectedItem.isStall ? getStallImage(selectedItem.category) : getBannerImage(selectedItem.category, selectedItem.name)}
                alt={selectedItem.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #0F0B09)' }} />
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  position: 'absolute', top: '20px', right: '20px',
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#EF4444'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
              >
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div style={{ padding: '0 30px 40px 30px' }}>
              
              {/* Header Titles */}
              <div style={{ marginTop: '-40px', position: 'relative', zIndex: 1, display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div style={{
                  width: '90px', height: '90px', borderRadius: '20px',
                  background: '#1F1815', border: `2px solid ${selectedItem.isStall ? '#10B981' : '#F27024'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', flexShrink: 0
                }}>
                  {selectedItem.isStall ? '🎓' : '🍔'}
                </div>
                <div>
                  <div style={{
                    fontSize: '0.78rem', color: selectedItem.isStall ? '#10B981' : '#F27024',
                    fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px'
                  }}>
                    {selectedItem.category} {selectedItem.isStall ? '(Sinh Viên Tự Do)' : '(Cửa Hàng Đối Tác)'}
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#fff' }}>
                    {selectedItem.name}
                  </h2>
                </div>
              </div>

              {/* Grid 2-column description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '30px' }}>
                
                {/* Left: General & Menu */}
                <div>
                  <h4 style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '8px' }}>GIỚI THIỆU</h4>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6', marginBottom: '24px' }}>
                    {selectedItem.description}
                  </p>

                  <h4 style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '14px' }}>DANH SÁCH THỰC ĐƠN</h4>
                  {selectedItem.menu && selectedItem.menu.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedItem.menu.map((menuItem, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                              {menuItem.name}
                            </div>
                            {menuItem.description && (
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                                {menuItem.description}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: selectedItem.isStall ? '#10B981' : '#F27024' }}>
                              {menuItem.price.toLocaleString()}đ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', italic: 'true' }}>
                      Cửa hàng chưa cập nhật chi tiết thực đơn trên ứng dụng.
                    </p>
                  )}

                  {/* Ordering / Contact Actions */}
                  <div style={{ marginTop: '24px' }}>
                    {selectedItem.isStall ? (
                      <a
                        href={`https://zalo.me/${selectedItem.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 28px',
                          fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                        }}
                      >
                        💬 Nhắn Zalo Liên Hệ
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItem(null);
                          navigate(`/order?vendor=${selectedItem.id}`);
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          background: 'linear-gradient(135deg, #F27024, #FF5722)',
                          color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 28px',
                          fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(242,112,36,0.3)'
                        }}
                      >
                        🛒 Đặt Món Trực Tuyến
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Metadata & Mock Map */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <h4 style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '1px', marginTop: 0, marginBottom: '14px' }}>THÔNG TIN ĐỊA ĐIỂM</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>🕒 <strong>Giờ bán:</strong> {selectedItem.hours}</div>
                      <div>📍 <strong>Địa chỉ:</strong> {selectedItem.address}</div>
                      <div>📞 <strong>Điện thoại:</strong> {selectedItem.phone}</div>
                      {selectedItem.isStall ? (
                        <div>📍 <strong>Điểm hẹn:</strong> {selectedItem.meeting_point}</div>
                      ) : (
                        <div>🛵 <strong>Giao hàng:</strong> Hỗ trợ ship tận nơi KTX & Campus</div>
                      )}
                    </div>
                  </div>

                  {/* OpenStreetMap Mock / Display Card */}
                  <div style={{
                    height: '180px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {/* Visual OSM render using standard static map display */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: '#18120F',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center', padding: '15px'
                    }}>
                      <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📍</span>
                      <strong style={{ fontSize: '0.8rem', color: '#fff', marginBottom: '4px' }}>
                        Toạ độ Hola Map
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                        Lat: {selectedItem.latitude.toFixed(5)} / Lon: {selectedItem.longitude.toFixed(5)}
                      </span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${selectedItem.latitude}&mlon=${selectedItem.longitude}#map=17/${selectedItem.latitude}/${selectedItem.longitude}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          marginTop: '10px', fontSize: '0.72rem', color: selectedItem.isStall ? '#10B981' : '#F27024',
                          fontWeight: 700, textDecoration: 'underline'
                        }}
                      >
                        Mở Bản đồ lớn →
                      </a>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom: Community Reviews for this vendor */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    Đánh Giá Từ Cộng Đồng ({itemReviews.length})
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      navigate('/reviews?write=true');
                    }}
                    style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px', padding: '6px 14px', color: '#fff',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                  >
                    ✍️ Viết Đánh Giá
                  </button>
                </div>

                {loadingReviews ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    Đang tải review...
                  </div>
                ) : itemReviews.length === 0 ? (
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                    Chưa có đánh giá nào cho quán này. Hãy là người đầu tiên chia sẻ cảm nhận của bạn!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {itemReviews.map(review => (
                      <div
                        key={review.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '16px',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <img
                              src={review.reviewer_avatar || 'https://ui-avatars.com/api/?name=An+Danh'}
                              alt="Avatar"
                              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                {review.reviewer_name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                                {new Date(review.created_at).toLocaleDateString('vi-VN')}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.85rem', color: '#FFB800', fontWeight: 700 }}>
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </span>
                            {review.review_type === 'dish' && (
                              <span style={{ fontSize: '0.7rem', color: '#FF9800', fontWeight: 600, background: 'rgba(255,152,0,0.1)', padding: '2px 8px', borderRadius: '50px', marginTop: '4px' }}>
                                Món ăn: {review.dish_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', margin: 0 }}>
                          {review.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodExplore;
