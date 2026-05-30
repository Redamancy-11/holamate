import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  getStudentStoreMy,
  updateStudentStoreMy,
  addStudentStoreMenuItem,
  updateStudentStoreMenuItem,
  deleteStudentStoreMenuItem,
  getStudentStoreOrders,
  updateStudentStoreOrderStatus
} from '../services/api';
import vietmapgl from '@vietmap/vietmap-gl-js/dist/vietmap-gl';
import '@vietmap/vietmap-gl-js/dist/vietmap-gl.css';

const StudentStoreDashboard = () => {
  const { user, loading: authLoading, setShowAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'menu' | 'profile' | 'stats'
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Map state
  const [storeCoords, setStoreCoords] = useState([105.52522, 21.01354]);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    store_name: '',
    description: '',
    category: 'Cửa hàng sinh viên',
    phone: '',
    address: 'KTX FPT Hoà Lạc',
    operating_hours: '08:00 - 22:00'
  });

  // Menu items modal
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null for new, item object for editing
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Món chính',
    image: '',
    is_available: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const prevOrdersCountRef = useRef(0);
  const audioCtxRef = useRef(null);

  // sound chime for new orders
  const playChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playTone(523.25, now, 0.3); // C5
      playTone(659.25, now + 0.12, 0.4); // E5
    } catch (e) {
      console.warn('Cannot play notification audio:', e);
    }
  };

  const showFlashMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const loadStoreData = async () => {
    try {
      const res = await getStudentStoreMy();
      if (res.success && res.store) {
        const s = res.store;
        setStore(s);
        setProfileForm({
          store_name: s.store_name || '',
          description: s.description || '',
          category: s.category || 'Cửa hàng sinh viên',
          phone: s.phone || '',
          address: s.address || 'KTX FPT Hoà Lạc',
          operating_hours: s.operating_hours || '08:00 - 22:00'
        });
        if (s.longitude && s.latitude) {
          setStoreCoords([s.longitude, s.latitude]);
        }
      }
    } catch (err) {
      console.warn('Lấy thông tin shop thất bại:', err.message);
    }
  };

  const loadOrders = async (silent = false) => {
    try {
      const res = await getStudentStoreOrders();
      if (res.success && Array.isArray(res.orders)) {
        const sorted = res.orders.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
        
        if (silent && sorted.length > prevOrdersCountRef.current) {
          const newOrders = sorted.filter(o => o.status === 'pending');
          if (newOrders.length > 0) {
            playChime();
            showFlashMessage('Bạn có đơn hàng mới từ khách hàng!', 'success');
          }
        }
        setOrders(sorted);
        prevOrdersCountRef.current = sorted.length;
      }
    } catch (err) {
      console.warn('Lấy danh sách đơn hàng thất bại:', err.message);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'student_store') return;
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadStoreData(), loadOrders()]);
      setIsLoading(false);
    };
    init();
  }, [user]);

  // Poll for new orders
  useEffect(() => {
    if (!user || user.role !== 'student_store' || activeTab !== 'orders') return;
    const interval = setInterval(() => {
      loadOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  // Initialize Map
  useEffect(() => {
    if (activeTab !== 'profile' || !mapContainerRef.current || isLoading) return;

    if (mapRef.current) {
      try { mapRef.current.remove(); } catch (e) { }
      mapRef.current = null;
    }

    const map = new vietmapgl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: storeCoords,
      zoom: 15,
    });

    map.addControl(new vietmapgl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    const el = document.createElement('div');
    el.innerHTML = `<span style="font-size:1.8rem;display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:rgba(8,12,28,0.95);border:2px solid #FF9800;border-radius:50%;cursor:pointer;box-shadow:0 4px 12px rgba(242,112,36,0.5);">🎓</span>`;

    const marker = new vietmapgl.Marker({ element: el, draggable: true })
      .setLngLat(storeCoords)
      .addTo(map);

    markerRef.current = marker;

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setStoreCoords([lngLat.lng, lngLat.lat]);
    });

    map.on('click', (e) => {
      const coords = [e.lngLat.lng, e.lngLat.lat];
      marker.setLngLat(coords);
      setStoreCoords(coords);
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) { }
        mapRef.current = null;
      }
    };
  }, [activeTab, isLoading]);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const base64 = await compressImage(file);
      setMenuForm(prev => ({ ...prev, image: base64 }));
      showFlashMessage('Đã tải lên hình ảnh món ăn thành công', 'success');
    } catch (err) {
      showFlashMessage('Lỗi tải hình ảnh', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...profileForm,
        longitude: storeCoords[0],
        latitude: storeCoords[1]
      };
      const res = await updateStudentStoreMy(payload);
      if (res.success) {
        showFlashMessage('Cập nhật thông tin cửa hàng thành công!', 'success');
        await loadStoreData();
      }
    } catch (err) {
      showFlashMessage('Không thể lưu thông tin: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) {
      alert('Vui lòng điền tên món và giá bán');
      return;
    }
    setIsSaving(true);
    try {
      if (editingItem) {
        // Update
        const res = await updateStudentStoreMenuItem(editingItem.id, menuForm);
        if (res.success) {
          showFlashMessage(`Đã cập nhật món "${menuForm.name}"`, 'success');
          setShowMenuModal(false);
          await loadStoreData();
        }
      } else {
        // Create
        const res = await addStudentStoreMenuItem(menuForm);
        if (res.success) {
          showFlashMessage(`Đã thêm món "${menuForm.name}" thành công`, 'success');
          setShowMenuModal(false);
          await loadStoreData();
        }
      }
    } catch (err) {
      showFlashMessage('Lỗi khi lưu món ăn: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa món "${name}"?`)) return;
    try {
      const res = await deleteStudentStoreMenuItem(itemId);
      if (res.success) {
        showFlashMessage(`Đã xóa món "${name}"`, 'warning');
        await loadStoreData();
      }
    } catch (err) {
      showFlashMessage('Lỗi khi xóa món ăn', 'error');
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      const res = await updateStudentStoreOrderStatus(orderId, newStatus);
      if (res.success) {
        showFlashMessage(`Đã chuyển đơn hàng sang trạng thái mới!`, 'success');
        await loadOrders();
        await loadStoreData(); // Update revenue & order count stats
      }
    } catch (err) {
      showFlashMessage('Lỗi cập nhật trạng thái đơn hàng', 'error');
    }
  };

  const openMenuModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setMenuForm({
        name: item.name || '',
        description: item.description || '',
        price: item.price || '',
        category: item.category || 'Món chính',
        image: item.image || '',
        is_available: item.is_available ?? true
      });
    } else {
      setEditingItem(null);
      setMenuForm({
        name: '',
        description: '',
        price: '',
        category: 'Món chính',
        image: '',
        is_available: true
      });
    }
    setShowMenuModal(true);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1425', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(242,112,36,0.1)', borderTopColor: '#F27024', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Đang xác thực thông tin...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'student_store') {
    return (
      <div style={{ minHeight: '100vh', background: '#0B1425', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 60px' }}>
        <div style={{ maxWidth: 450, width: '100%', padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(242,112,36,0.2)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>🎓</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 12 }}>Kênh Cửa Hàng Sinh Viên</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Chào mừng bạn đến với Kênh quản lý cửa hàng tự doanh của Sinh viên FPT. Vui lòng đăng nhập bằng tài khoản Cửa hàng sinh viên để tiếp tục.
          </p>
          <button onClick={() => setShowAuthModal(true)} style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', boxShadow: '0 8px 16px rgba(242,112,36,0.25)', transition: 'all 0.2s' }}>
            Đăng nhập / Đăng ký cửa hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070D19', color: '#fff', fontFamily: 'Inter, sans-serif', paddingTop: 90, paddingBottom: 60, backgroundImage: 'radial-gradient(circle at 80% 10%, rgba(242,112,36,0.08) 0%, transparent 50%)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        
        {/* Flash Message Banner */}
        {message.text && (
          <div style={{
            position: 'fixed', top: 90, right: 20, zIndex: 1000,
            padding: '14px 20px', borderRadius: 12,
            background: message.type === 'success' ? '#10B981' : message.type === 'warning' ? '#F59E0B' : message.type === 'error' ? '#EF4444' : '#3B82F6',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.25s ease-out'
          }}>
            {message.type === 'success' ? '✓ ' : '⚠️ '} {message.text}
          </div>
        )}

        {/* Dashboard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 30, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.8rem' }}>🎓</span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: 0 }}>Cửa Hàng Sinh Viên</h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: '4px 0 0' }}>
              Chào mừng, <strong style={{ color: '#FF9800' }}>{store?.store_name || user.name}</strong> {store?.student_id && store.student_id !== 'N/A' && `(Mã SV: ${store.student_id})`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/map')} style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🗺️ Xem bản đồ Hola
            </button>
          </div>
        </div>

        {/* Quick Statistics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng số đơn hàng</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '2rem', fontWeight: 800, color: '#FF9800' }}>{store?.total_orders || 0}</h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng Doanh Thu</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '2rem', fontWeight: 800, color: '#10B981' }}>{(store?.total_revenue || 0).toLocaleString()}đ</h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đánh giá trung bình</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '2rem', fontWeight: 800, color: '#F59E0B' }}>⭐ {store?.rating?.toFixed(1) || '5.0'}</h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 22 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng số món</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '2rem', fontWeight: 800, color: '#3B82F6' }}>{store?.menu?.length || 0} món</h3>
          </div>
        </div>

        {/* Dashboard Content Container */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 30, alignItems: 'start' }}>
          
          {/* Left Navigation Bar */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setActiveTab('orders')} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
              background: activeTab === 'orders' ? 'rgba(242,112,36,0.12)' : 'transparent',
              color: activeTab === 'orders' ? '#FF9800' : 'rgba(255,255,255,0.6)',
              fontWeight: 700, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              🛍️ Quản lý đơn hàng
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('menu')} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
              background: activeTab === 'menu' ? 'rgba(242,112,36,0.12)' : 'transparent',
              color: activeTab === 'menu' ? '#FF9800' : 'rgba(255,255,255,0.6)',
              fontWeight: 700, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              🍳 Thực đơn của shop
            </button>
            <button onClick={() => setActiveTab('profile')} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
              background: activeTab === 'profile' ? 'rgba(242,112,36,0.12)' : 'transparent',
              color: activeTab === 'profile' ? '#FF9800' : 'rgba(255,255,255,0.6)',
              fontWeight: 700, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              ⚙️ Cấu hình cửa hàng
            </button>
            <button onClick={() => setActiveTab('stats')} style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
              background: activeTab === 'stats' ? 'rgba(242,112,36,0.12)' : 'transparent',
              color: activeTab === 'stats' ? '#FF9800' : 'rgba(255,255,255,0.6)',
              fontWeight: 700, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              📊 Thống kê doanh số
            </button>
          </div>

          {/* Right Panel Main Content */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 24, padding: 28, minHeight: 400 }}>
            
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(242,112,36,0.1)', borderTopColor: '#F27024', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <>
                {/* 1. ORDERS TAB */}
                {activeTab === 'orders' && (
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px', color: '#fff' }}>Đơn hàng của cửa hàng</h2>
                    
                    {orders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🛒</span>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>Cửa hàng của bạn chưa nhận được đơn hàng nào.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {orders.map((order) => (
                          <div key={order.id || order._id} style={{
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20,
                            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20
                          }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FF9800' }}>#{order.id?.substring(0, 8) || order._id?.substring(0, 8)}</span>
                                <span style={{
                                  fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                                  background: order.status === 'pending' ? 'rgba(245,158,11,0.15)' : order.status === 'preparing' ? 'rgba(59,130,246,0.15)' : order.status === 'delivering' ? 'rgba(139,92,246,0.15)' : order.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: order.status === 'pending' ? '#F59E0B' : order.status === 'preparing' ? '#3B82F6' : order.status === 'delivering' ? '#8B5CF6' : order.status === 'completed' ? '#10B981' : '#EF4444'
                                }}>
                                  {order.status === 'pending' ? 'Chờ xử lý' : order.status === 'preparing' ? 'Đang chuẩn bị' : order.status === 'delivering' ? 'Đang giao hàng' : order.status === 'completed' ? 'Đã hoàn thành' : 'Đã huỷ'}
                                </span>
                              </div>
                              
                              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#E2D7B5' }}>
                                👤 Khách hàng: <strong>{order.customer_name || order.customerName}</strong>
                              </p>
                              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                                📞 SĐT: <strong>{order.customer_phone || order.customerPhone}</strong>
                              </p>
                              <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                                🏠 Địa chỉ: <strong>{order.delivery_address || order.deliveryAddress}</strong>
                              </p>

                              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                                {order.items && Array.isArray(order.items) ? (
                                  order.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: idx === order.items.length - 1 ? 0 : 6 }}>
                                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item.name} <strong style={{ color: '#FF9800' }}>x{item.quantity}</strong></span>
                                      <span style={{ fontWeight: 600 }}>{(item.price * item.quantity).toLocaleString()}đ</span>
                                    </div>
                                  ))
                                ) : (
                                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Không tìm thấy chi tiết món</p>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', minWidth: 160, textAlign: 'right' }}>
                              <div>
                                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Tổng thanh toán</span>
                                <h4 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{(order.total_amount || order.totalAmount || 0).toLocaleString()}đ</h4>
                              </div>

                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                                {order.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleOrderStatusChange(order.id || order._id, 'preparing')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                      Duyệt & Nấu
                                    </button>
                                    <button onClick={() => handleOrderStatusChange(order.id || order._id, 'cancelled')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                      Từ chối
                                    </button>
                                  </>
                                )}
                                {order.status === 'preparing' && (
                                  <button onClick={() => handleOrderStatusChange(order.id || order._id, 'delivering')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#8B5CF6', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    🛵 Bắt đầu giao hàng
                                  </button>
                                )}
                                {order.status === 'delivering' && (
                                  <button onClick={() => handleOrderStatusChange(order.id || order._id, 'completed')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    ✓ Đã giao thành công
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. MENU TAB */}
                {activeTab === 'menu' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>Thực đơn của quán</h2>
                      <button onClick={() => openMenuModal()} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        ＋ Thêm món mới
                      </button>
                    </div>

                    {!store?.menu || store.menu.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)', border: '1.5px dashed rgba(255,255,255,0.06)', borderRadius: 18 }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🍳</span>
                        <p style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Quán của bạn chưa có món ăn nào.</p>
                        <button onClick={() => openMenuModal()} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FF9800', background: 'transparent', color: '#FF9800', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                          Thêm món đầu tiên
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                        {store.menu.map((item) => (
                          <div key={item.id} style={{
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                          }}>
                            {item.image ? (
                              <img src={item.image} alt={item.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: 160, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🍔</div>
                            )}

                            <div style={{ padding: 16, flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{item.name}</h3>
                                <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.95rem' }}>{item.price.toLocaleString()}đ</span>
                              </div>
                              <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{item.description || 'Không có mô tả'}</p>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  fontSize: '0.73rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                  background: item.is_available ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                  color: item.is_available ? '#10B981' : '#EF4444'
                                }}>
                                  {item.is_available ? 'Còn hàng' : 'Hết hàng'}
                                </span>
                                <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)' }}>| {item.category}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <button onClick={() => openMenuModal(item)} style={{ flex: 1, padding: 12, background: 'transparent', border: 'none', color: '#3B82F6', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                Sửa
                              </button>
                              <button onClick={() => handleDeleteItem(item.id, item.name)} style={{ flex: 1, padding: 12, background: 'transparent', border: 'none', color: '#EF4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                Xóa
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PROFILE CONFIG TAB */}
                {activeTab === 'profile' && (
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px', color: '#fff' }}>Cấu hình thông tin cửa hàng</h2>
                    
                    <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Tên cửa hàng</label>
                          <input type="text" value={profileForm.store_name} onChange={e => setProfileForm(p => ({ ...p, store_name: e.target.value }))} required
                            style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Danh mục chính</label>
                          <input type="text" value={profileForm.category} onChange={e => setProfileForm(p => ({ ...p, category: e.target.value }))}
                            style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Số điện thoại liên hệ</label>
                          <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} required
                            style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Giờ mở/đóng cửa</label>
                          <input type="text" value={profileForm.operating_hours} onChange={e => setProfileForm(p => ({ ...p, operating_hours: e.target.value }))}
                            style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Mô tả ngắn</label>
                        <textarea value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} rows={3}
                          style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Địa chỉ cụ thể (tại Hola)</label>
                        <input type="text" value={profileForm.address} onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))} required
                          style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                      </div>

                      {/* Map Coordinate Picker */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Ghim vị trí của shop trên bản đồ Hola (Kéo thả chấm cam để thay đổi vị trí)</label>
                        
                        <div ref={mapContainerRef} style={{ width: '100%', height: 260, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8 }}>
                          <span>Kinh độ (Lng): <strong>{storeCoords[0].toFixed(6)}</strong></span>
                          <span>Vĩ độ (Lat): <strong>{storeCoords[1].toFixed(6)}</strong></span>
                        </div>
                      </div>

                      <button type="submit" disabled={isSaving} style={{
                        padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#F27024,#FF5722)', border: 'none',
                        color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', alignSelf: 'flex-start',
                        minWidth: 160, boxShadow: '0 4px 12px rgba(242,112,36,0.2)', transition: 'all 0.2s'
                      }}>
                        {isSaving ? '⏳ Đang lưu...' : '✓ Lưu cấu hình'}
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. STATISTICS TAB */}
                {activeTab === 'stats' && (
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px', color: '#fff' }}>Báo cáo kết quả kinh doanh</h2>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24, marginBottom: 24 }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Doanh số theo tháng</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Giá trị đơn trung bình (AOV)</span>
                          <strong style={{ color: '#fff' }}>
                            {store?.total_orders ? Math.round(store.total_revenue / store.total_orders).toLocaleString() : 0}đ
                          </strong>
                        </div>
                        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tỷ lệ giao hàng hoàn thành</span>
                          <strong style={{ color: '#10B981' }}>
                            {orders.length ? Math.round((orders.filter(o => o.status === 'completed').length / orders.length) * 100) : 100}%
                          </strong>
                        </div>
                        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tỷ lệ huỷ đơn</span>
                          <strong style={{ color: '#EF4444' }}>
                            {orders.length ? Math.round((orders.filter(o => o.status === 'cancelled').length / orders.length) * 100) : 0}%
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Menu Item Form Modal */}
      {showMenuModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{
            background: '#0B1425', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, maxWidth: 500, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                {editingItem ? 'Sửa món ăn' : 'Thêm món ăn mới'}
              </h3>
              <button onClick={() => setShowMenuModal(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Tên món ăn</label>
                <input type="text" value={menuForm.name} onChange={e => setMenuForm(m => ({ ...m, name: e.target.value }))} required placeholder="VD: Trà đào cam sả"
                  style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Giá bán (đ)</label>
                  <input type="number" value={menuForm.price} onChange={e => setMenuForm(m => ({ ...m, price: e.target.value }))} required placeholder="VD: 25000"
                    style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Danh mục</label>
                  <input type="text" value={menuForm.category} onChange={e => setMenuForm(m => ({ ...m, category: e.target.value }))} required placeholder="VD: Đồ uống"
                    style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Mô tả ngắn</label>
                <textarea value={menuForm.description} onChange={e => setMenuForm(m => ({ ...m, description: e.target.value }))} rows={2} placeholder="Nêu nguyên liệu, định lượng..."
                  style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Hình ảnh món ăn</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage}
                  style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }} />
                {menuForm.image && (
                  <img src={menuForm.image} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={menuForm.is_available} onChange={e => setMenuForm(m => ({ ...m, is_available: e.target.checked }))} id="is_available_chk" />
                <label htmlFor="is_available_chk" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>Món này đang có sẵn phục vụ khách</label>
              </div>

              <button type="submit" disabled={isSaving || uploadingImage} style={{
                padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#F27024,#FF5722)', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: 10, transition: 'all 0.2s'
              }}>
                {isSaving ? '⏳ Đang lưu...' : '✓ Lưu lại'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentStoreDashboard;
