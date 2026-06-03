import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  getVendors,
  createOrder,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  deleteOrder
} from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const normalizeVietnamese = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
};

const OrderFood = () => {
  const { user, sellerUser, loading: authLoading, setShowAuthModal, notificationClickedOrder, setNotificationClickedOrder } = useContext(AuthContext);
  const activeUser = user || sellerUser;
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('dish'); // 'dish' | 'vendor'

  // Checkout form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('Ký túc xá Dom A');
  const [customAddress, setCustomAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Prefill customer name when user changes
  useEffect(() => {
    if (activeUser) {
      setCustomerName(activeUser.name || '');
      setCustomerPhone(activeUser.phone || '');
    }
  }, [activeUser]);

  // Placed order tracking state (for customer)
  const [activeOrder, setActiveOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const trackingMapContainerRef = useRef(null);
  const trackingMapRef = useRef(null);

  // Get user coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.warn('Geolocation lookup failed in OrderFood:', error.message);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  }, []);

  // Draw delivery route map when activeOrder changes
  useEffect(() => {
    if (!activeOrder || !trackingMapContainerRef.current) return;

    // Cleanup previous map
    if (trackingMapRef.current) {
      try { trackingMapRef.current.remove(); } catch (e) { }
      trackingMapRef.current = null;
    }

    // Find vendor coords from vendors list
    const matchedVendor = vendors.find(v => (v.id || v._id) === activeOrder.vendor);
    const vendorCoords = matchedVendor?.coords && matchedVendor.coords.length === 2
      ? matchedVendor.coords
      : [105.52522, 21.01354];

    const customerCoords = activeOrder.deliveryLongitude && activeOrder.deliveryLatitude
      ? [activeOrder.deliveryLongitude, activeOrder.deliveryLatitude]
      : userCoords || [105.52522, 21.01354];

    const map = L.map(trackingMapContainerRef.current, {
      center: [customerCoords[1], customerCoords[0]],
      zoom: 14,
      zoomControl: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    trackingMapRef.current = map;

    // Store marker
    const storeEl = document.createElement('div');
    storeEl.innerHTML = `<span style="font-size:1.6rem;display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:rgba(11,20,37,0.95);border:2px solid #F27024;border-radius:50%;box-shadow:0 3px 10px rgba(242,112,36,0.5);">🏪</span>`;
    const storeIcon = L.divIcon({
      html: storeEl,
      className: 'store-tracking-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    L.marker([vendorCoords[1], vendorCoords[0]], { icon: storeIcon }).addTo(map);

    // Customer marker
    const custEl = document.createElement('div');
    custEl.innerHTML = `<span style="font-size:1.6rem;display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:rgba(11,20,37,0.95);border:2px solid #10B981;border-radius:50%;box-shadow:0 3px 10px rgba(16,185,129,0.5);">📍</span>`;
    const custIcon = L.divIcon({
      html: custEl,
      className: 'cust-tracking-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    L.marker([customerCoords[1], customerCoords[0]], { icon: custIcon }).addTo(map);

    // Fetch and render OSRM route
    const fetchRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${vendorCoords[0]},${vendorCoords[1]};${customerCoords[0]},${customerCoords[1]}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.round(route.duration / 60);

          const infoEl = document.getElementById('buyer-route-info');
          if (infoEl) infoEl.innerHTML = `🏁 <strong>${distKm} km</strong> &nbsp;|&nbsp; ⏱️ ~<strong>${durMin} phút</strong> giao hàng`;

          // L.geoJSON automatically converts [lng, lat] coordinate ordering in GeoJSON
          const geojsonLayer = L.geoJSON(route.geometry, {
            style: {
              color: '#F27024',
              weight: 5,
              opacity: 0.85
            }
          }).addTo(map);

          map.fitBounds(geojsonLayer.getBounds(), { padding: [50, 50] });
        }
      } catch (err) {
        console.warn('Route fetch error:', err);
      }
    };

    fetchRoute();

    return () => {
      try { map.remove(); } catch (e) { }
    };
  }, [activeOrder, vendors, userCoords]);

  // Fetch vendors on mount
  useEffect(() => {
    const fetchVendorsList = async () => {
      try {
        setLoading(true);
        const response = await getVendors();
        const vendorsList = Array.isArray(response) ? response : (response?.data || []);

        // Filter to keep only curated peak Hanoi vendors OR custom seller shops
        const peakIds = [
          'highlands-hola',
          'cafe-bao-cap',
          'bay-coffee',
          'twitter-beans',
          '1988-bbq',
          'bun-dau-hola',
          'com-tam-ktx',
          'ga-ri-phu-binh',
          'lau-cua-hoalac'
        ];

        const filtered = vendorsList.filter(v =>
          peakIds.includes(v.id) || v.owner_id || v.ownerId
        );

        setVendors(filtered);
        if (filtered.length > 0) {
          setSelectedVendor(filtered[0]);
        }
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setError('Không thể tải danh sách cửa hàng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    fetchVendorsList();
  }, []);

  // Fetch buyer order history
  useEffect(() => {
    if (!activeUser) return;
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const history = await getMyOrders();
        setOrderHistory(Array.isArray(history) ? history : []);
      } catch (err) {
        console.warn('Could not fetch order history:', err.message);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [activeUser, activeOrder]);

  // Listen for notification clicks to auto-select/track an order
  useEffect(() => {
    if (notificationClickedOrder) {
      const found = orderHistory.find(o => o._id === notificationClickedOrder._id);
      if (found) {
        setActiveOrder(found);
      } else {
        getOrderById(notificationClickedOrder._id)
          .then(order => {
            setActiveOrder(order);
          })
          .catch(err => console.warn('Could not load order from notification:', err.message));
      }
      setNotificationClickedOrder(null);
    }
  }, [notificationClickedOrder, orderHistory, setNotificationClickedOrder]);

  // Reorder handler
  const handleReorder = (order) => {
    const matchedVendor = vendors.find(v => (v.id || v._id) === order.vendor);
    if (!matchedVendor) {
      alert('Không tìm thấy cửa hàng này nữa.');
      return;
    }
    
    const currentSelId = selectedVendor?.id || selectedVendor?._id;
    const vId = matchedVendor.id || matchedVendor._id;
    if (cart.length > 0 && currentSelId !== vId) {
      if (!window.confirm('Đặt lại đơn hàng này sẽ thay thế giỏ hàng hiện tại của bạn. Tiếp tục?')) {
        return;
      }
    }

    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    
    const standardAddresses = [
      "Ký túc xá Dom A",
      "Ký túc xá Dom B",
      "Ký túc xá Dom C",
      "Ký túc xá Dom D",
      "Ký túc xá Dom E",
      "Ký túc xá Dom F",
      "Tòa nhà Alpha",
      "Tòa nhà Beta"
    ];
    if (standardAddresses.includes(order.deliveryAddress)) {
      setDeliveryAddress(order.deliveryAddress);
      setCustomAddress('');
    } else {
      setDeliveryAddress('Khác');
      setCustomAddress(order.deliveryAddress);
    }
    
    setSelectedVendor(matchedVendor);
    
    const reorderItems = order.items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
    setCart(reorderItems);
    setActiveOrder(null);

    // Scroll to menu section
    setTimeout(() => {
      const menuEl = document.getElementById('vendor-menu-section');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }, 150);

    alert('Đã chọn lại các món từ đơn cũ. Bạn có thể bấm nút + ở thực đơn bên dưới để đặt thêm món nếu muốn!');
  };

  // Hide order from history (buyer)
  const handleDeleteOrderHistory = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này khỏi lịch sử?')) return;
    try {
      await deleteOrder(orderId);
      const history = await getMyOrders();
      setOrderHistory(Array.isArray(history) ? history : []);
      if (activeOrder && activeOrder._id === orderId) {
        setActiveOrder(null);
      }
    } catch (err) {
      alert('Không thể xóa đơn hàng khỏi lịch sử: ' + (err.response?.data?.error || err.message));
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
      await updateOrderStatus(orderId, 'cancelled');
      // Refresh order history
      const history = await getMyOrders();
      setOrderHistory(Array.isArray(history) ? history : []);
      if (activeOrder && activeOrder._id === orderId) {
        setActiveOrder(null);
      }
    } catch (err) {
      alert('Không thể hủy đơn hàng: ' + (err.response?.data?.error || err.message));
    }
  };

  // Poll active order status
  useEffect(() => {
    if (!activeOrder) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getOrderById(activeOrder._id);
        setActiveOrder(updated);
        if (updated.status === 'completed' || updated.status === 'cancelled') {
          clearInterval(interval);
        }
      } catch (err) {
        console.warn('Error polling order status:', err.message);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  // Cart operations
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) {
        return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemName, delta) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.name === itemName) {
          const nextQty = i.quantity + delta;
          return nextQty > 0 ? { ...i, quantity: nextQty } : null;
        }
        return i;
      }).filter(Boolean);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Switch restaurant resets cart
  const handleSelectVendor = (vendor) => {
    const vId = vendor.id || vendor._id;
    const currentSelId = selectedVendor?.id || selectedVendor?._id;
    if (cart.length > 0 && currentSelId !== vId) {
      if (window.confirm('Thay đổi cửa hàng sẽ xóa giỏ hàng hiện tại của bạn. Bạn có muốn tiếp tục không?')) {
        setCart([]);
        setSelectedVendor(vendor);
      }
    } else {
      setSelectedVendor(vendor);
    }
  };

  // Switch restaurant and add item from search page
  const handleAddSearchItemToCart = (item, vendor) => {
    const vId = vendor.id || vendor._id;
    const currentSelId = selectedVendor?.id || selectedVendor?._id;
    if (cart.length > 0 && currentSelId !== vId) {
      if (window.confirm(`Thêm món từ ${vendor.name} sẽ xóa giỏ hàng hiện tại của bạn tại ${selectedVendor.name}. Bạn có muốn tiếp tục?`)) {
        setCart([]);
        setSelectedVendor(vendor);
        addToCart(item);
      }
    } else {
      setSelectedVendor(vendor);
      addToCart(item);
    }
  };

  // Place order submission
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!cart.length) return;

    const finalAddress = deliveryAddress === 'Khác' ? customAddress : deliveryAddress;
    if (!customerName.trim() || !customerPhone.trim() || !finalAddress.trim()) {
      alert('Vui lòng điền đầy đủ thông tin giao hàng!');
      return;
    }

    try {
      setTrackingLoading(true);
      const payload = {
        vendorId: selectedVendor.id || selectedVendor._id,
        items: cart,
        customerName,
        customerPhone,
        deliveryAddress: finalAddress,
        customerNote,
        deliveryLongitude: userCoords ? userCoords[0] : null,
        deliveryLatitude: userCoords ? userCoords[1] : null
      };
      const response = await createOrder(payload);
      setActiveOrder(response);
      setCart([]); // Clear cart after success
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Đặt hàng thất bại: ' + (err.response?.data?.error || err.message));
    } finally {
      setTrackingLoading(false);
    }
  };

  // Helper formatting for currency
  const formatPrice = (price) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  // Order status details helper
  const getStatusStepInfo = (status) => {
    const steps = [
      { id: 'pending', label: 'Tiếp nhận', desc: 'Chờ người bán duyệt đơn', icon: '📝' },
      { id: 'preparing', label: 'Chuẩn bị', desc: 'Nhà bếp đang chế biến món ăn', icon: '🍳' },
      { id: 'delivering', label: 'Đang giao', desc: 'Shipper đang giao hàng đến bạn', icon: '🛵' },
      { id: 'completed', label: 'Hoàn thành', desc: 'Giao hàng thành công! Chúc bạn ngon miệng!', icon: '✨' }
    ];

    let activeIdx = 0;
    if (status === 'preparing') activeIdx = 1;
    else if (status === 'delivering') activeIdx = 2;
    else if (status === 'completed') activeIdx = 3;

    return { steps, activeIdx };
  };

  // Search Results computations
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim() || searchMode !== 'vendor') return vendors;
    const query = normalizeVietnamese(searchQuery.trim());
    return vendors.filter(v => normalizeVietnamese(v.name || '').includes(query));
  }, [vendors, searchQuery, searchMode]);

  const matchedDishItems = useMemo(() => {
    if (!searchQuery.trim() || searchMode !== 'dish') return [];
    const query = normalizeVietnamese(searchQuery.trim());
    const results = [];
    vendors.forEach(vendor => {
      const menu = Array.isArray(vendor.menu) ? vendor.menu : [];
      menu.forEach(item => {
        if (normalizeVietnamese(item.name || '').includes(query)) {
          results.push({
            vendor,
            item
          });
        }
      });
    });
    return results;
  }, [vendors, searchQuery, searchMode]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0704', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #F27024', borderRadius: '50%', width: 50, height: 50, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }



  return (
    <div style={{
      minHeight: '100vh', background: '#0b0704', color: '#fff',
      backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(242,112,36,0.12) 0%, transparent 60%)',
      paddingTop: 100, paddingBottom: 60
    }}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }} className="animate-fade-up">
          <span className="badge" style={{ background: 'rgba(242,112,36,0.15)', color: '#F27024', border: '1px solid rgba(242,112,36,0.25)', marginBottom: 14, display: 'inline-flex' }}>
            🍔 HolaFood Delivery
          </span>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, marginBottom: 12 }}>
            HanoMate Order Center
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', maxWidth: 600, margin: '0 auto', marginBottom: 24 }}>
            Đặt đồ ăn giao tận phòng KTX Hòa Lạc nhanh chóng, tiện lợi.
          </p>
        </div>

        {activeOrder ? (
          /* Tracking Mode View */
          <div style={{ maxWidth: 700, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32 }} className="animate-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Mã Đơn Hàng</span>
                <h3 style={{ color: '#FF9800', margin: '4px 0 0 0', fontFamily: 'monospace', fontSize: '1.2rem' }}>{activeOrder._id}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.4)' }}>Trạng thái</span>
                <div style={{
                  background: activeOrder.status === 'completed' ? 'rgba(16,185,129,0.18)' : activeOrder.status === 'cancelled' ? 'rgba(239,68,68,0.18)' : 'rgba(242,112,36,0.18)',
                  color: activeOrder.status === 'completed' ? '#10B981' : activeOrder.status === 'cancelled' ? '#EF4444' : '#F27024',
                  padding: '4px 12px', borderRadius: 20, fontSize: '.8rem', fontWeight: 700, marginTop: 4, display: 'inline-block'
                }}>
                  {activeOrder.status === 'pending' && 'Chờ Duyệt Đơn'}
                  {activeOrder.status === 'preparing' && 'Đang Chuẩn Bị'}
                  {activeOrder.status === 'delivering' && 'Đang Giao Hàng'}
                  {activeOrder.status === 'completed' && 'Hoàn Thành'}
                  {activeOrder.status === 'cancelled' && 'Đã Hủy'}
                </div>
              </div>
            </div>

            {/* Stepper Timeline */}
            {activeOrder.status !== 'cancelled' && (
              <div style={{ marginBottom: 36 }}>
                {(() => {
                  const { steps, activeIdx } = getStatusStepInfo(activeOrder.status);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {steps.map((s, idx) => {
                        const isPast = idx < activeIdx;
                        const isCurrent = idx === activeIdx;
                        return (
                          <div key={s.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative' }}>
                            {idx < steps.length - 1 && (
                              <div style={{
                                position: 'absolute', left: 19, top: 40, bottom: -20, width: 2,
                                background: idx < activeIdx ? '#F27024' : 'rgba(255,255,255,0.1)'
                              }} />
                            )}
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%',
                              background: isCurrent ? 'linear-gradient(135deg,#F27024,#FF5722)' : isPast ? 'rgba(242,112,36,0.2)' : 'rgba(255,255,255,0.05)',
                              border: isCurrent ? 'none' : isPast ? '2px solid #F27024' : '2px solid rgba(255,255,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                              boxShadow: isCurrent ? '0 0 16px rgba(242,112,36,0.4)' : 'none'
                            }}>
                              {s.icon}
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '1.02rem', color: isCurrent ? '#FF9800' : isPast ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                                {s.label}
                              </h4>
                              <p style={{ margin: 0, fontSize: '.84rem', color: isCurrent ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }}>
                                {s.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Order details summary */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 28 }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '.95rem', color: 'rgba(255,255,255,0.6)' }}>Chi Tiết Đơn Hàng từ: <strong style={{ color: '#fff' }}>{activeOrder.vendorName}</strong></h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item.name} <strong style={{ color: '#FF9800' }}>x{item.quantity}</strong></span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, fontWeight: 700, fontSize: '1.05rem' }}>
                <span>Tổng Thanh Toán:</span>
                <span style={{ color: '#FF9800' }}>{formatPrice(activeOrder.totalAmount)}</span>
              </div>
            </div>

            {/* Delivery address info */}
            <div style={{ marginBottom: 28, fontSize: '.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              <div>📍 <strong>Người nhận:</strong> {activeOrder.customerName} — {activeOrder.customerPhone}</div>
              <div style={{ marginTop: 4 }}>🏠 <strong>Địa chỉ giao:</strong> {activeOrder.deliveryAddress}</div>
              {activeOrder.sellerNote && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 8, color: '#FCA5A5', fontSize: '.84rem' }}>
                  💬 <strong>Ghi chú từ quán:</strong> {activeOrder.sellerNote}
                </div>
              )}
            </div>

            {/* Delivery Route Map */}
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🗺️ Theo dõi hành trình giao hàng
              </h4>
              <div id="buyer-route-info" style={{ fontSize: '.85rem', color: '#10B981', background: 'rgba(16,185,129,0.06)', padding: '8px 12px', borderRadius: 8, marginBottom: 10, display: 'inline-block' }}>
                ⌛ Đang tính toán tuyến đường...
              </div>
              <div
                ref={trackingMapContainerRef}
                style={{ width: '100%', height: 280, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
              />
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '.8rem', color: 'rgba(255,255,255,0.5)' }}>
                <span>🏪 = Cửa hàng</span>
                <span>📍 = Vị trí của bạn</span>
                <span style={{ color: '#F27024' }}>━━ = Tuyến đường</span>
              </div>
            </div>

            {/* Reset screen */}
            <button
              onClick={() => setActiveOrder(null)}
              className="btn"
              style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '12px 0', borderRadius: 50, fontWeight: 600, cursor: 'pointer' }}
            >
              Đặt Đơn Hàng Mới
            </button>
          </div>
        ) : (
          /* Normal Shop View */
          <div className="order-grid">

            {/* Left Main (Search, Restaurant List & Menus) */}
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ width: 44, height: 44, border: '4px solid rgba(242,112,36,0.15)', borderTopColor: '#F27024', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>Đang tải danh sách quán ăn...</p>
                </div>
              ) : error ? (
                <div style={{ padding: 24, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, textAlign: 'center', color: '#EF4444' }}>
                  {error}
                </div>
              ) : (
                <div>

                  {/* Search Bar Container */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 20,
                    padding: '20px 24px',
                    marginBottom: 32
                  }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🔍 Tìm Kiếm Nhanh</span>
                    </h3>

                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <button
                        onClick={() => { setSearchMode('dish'); }}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: '.84rem', cursor: 'pointer',
                          border: searchMode === 'dish' ? '1px solid #F27024' : '1px solid rgba(255,255,255,0.08)',
                          background: searchMode === 'dish' ? 'rgba(242,112,36,0.1)' : 'transparent',
                          color: searchMode === 'dish' ? '#FF9800' : 'rgba(255,255,255,0.6)',
                          transition: 'all 0.2s'
                        }}
                      >
                        🍔 Tìm Món Ăn
                      </button>
                      <button
                        onClick={() => { setSearchMode('vendor'); }}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: '.84rem', cursor: 'pointer',
                          border: searchMode === 'vendor' ? '1px solid #F27024' : '1px solid rgba(255,255,255,0.08)',
                          background: searchMode === 'vendor' ? 'rgba(242,112,36,0.1)' : 'transparent',
                          color: searchMode === 'vendor' ? '#FF9800' : 'rgba(255,255,255,0.6)',
                          transition: 'all 0.2s'
                        }}
                      >
                        🏪 Tìm Cửa Hàng
                      </button>
                    </div>

                    {/* Input Field */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={searchMode === 'dish' ? "Nhập món ăn bạn thèm... (VD: bún đậu, trà sen, nướng)" : "Nhập tên cửa hàng... (VD: Highlands, Bay, Bao Cấp)"}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 16px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(242,112,36,0.2)',
                          borderRadius: 12,
                          color: '#fff',
                          fontSize: '.9rem',
                          outline: 'none'
                        }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                            fontSize: '1.2rem', cursor: 'pointer', padding: 0
                          }}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Render Logic Based on Search Mode and Query */}
                  {searchMode === 'dish' && searchQuery.trim() !== '' ? (
                    /* MATCHING DISH ITEMS LIST */
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                        <span>🍔 Kết Quả Tìm Món Ăn ({matchedDishItems.length})</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{ background: 'none', border: 'none', color: '#F27024', fontSize: '.84rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Quay lại thực đơn mặc định
                        </button>
                      </h3>

                      {matchedDishItems.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' }}>
                          <span style={{ fontSize: '2rem' }}>🔍</span>
                          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: '.9rem' }}>Không tìm thấy món ăn nào khớp với từ khóa "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="menu-grid" style={{ marginBottom: 32 }}>
                          {matchedDishItems.map(({ vendor, item }, idx) => (
                            <div
                              key={idx}
                              style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 16, padding: '16px 20px',
                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12
                              }}
                            >
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '.95rem', fontWeight: 700 }}>{item.name}</h4>
                                <div style={{ fontSize: '.76rem', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span>🏪 Bán bởi:</span>
                                  <strong style={{ color: '#FF9800' }}>{vendor.name}</strong>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <span style={{ color: '#FF9800', fontWeight: 700, fontSize: '.9rem' }}>{formatPrice(item.price)}</span>
                                <button
                                  onClick={() => handleAddSearchItemToCart(item, vendor)}
                                  style={{
                                    padding: '6px 12px', borderRadius: 8,
                                    background: 'linear-gradient(135deg,#F27024,#FF5722)',
                                    border: 'none', color: '#fff', fontSize: '.8rem', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    transition: 'all 0.18s ease'
                                  }}
                                >
                                  <span>+</span> Thêm giỏ
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* DEFAULT CHOOSE RESTAURANT AND SELECT MENU VIEW */
                    <div>
                      {/* Restaurant Row tabs */}
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>1. Chọn Cửa Hàng</h3>

                      {filteredVendors.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)', marginBottom: 32 }}>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.88rem' }}>Không tìm thấy cửa hàng nào khớp với từ khóa "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
                          {filteredVendors.map(v => {
                            const vId = v.id || v._id;
                            const currentSelId = selectedVendor?.id || selectedVendor?._id;
                            const isSelected = currentSelId === vId;
                            return (
                              <div
                                key={vId}
                                onClick={() => handleSelectVendor(v)}
                                style={{
                                  background: isSelected ? 'rgba(242,112,36,0.15)' : 'rgba(255,255,255,0.03)',
                                  border: isSelected ? '2px solid #F27024' : '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 16, padding: '16px', cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <span style={{ background: 'rgba(255,255,255,0.1)', color: '#FF9800', fontSize: '.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                                    {v.category}
                                  </span>
                                  <span style={{ color: '#FFD700', fontSize: '.8rem', fontWeight: 700 }}>
                                    ★ {v.rating || '5.0'}
                                  </span>
                                </div>
                                <h4 style={{ fontSize: '.92rem', fontWeight: 700, margin: '0 0 6px 0', color: isSelected ? '#FF9800' : '#fff' }}>{v.name}</h4>
                                <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.5)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  📍 {v.address ? v.address.split(',')[0] : 'KTX Hòa Lạc'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected Restaurant Menu */}
                      {selectedVendor && (
                        <div id="vendor-menu-section">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 20 }}>
                            <div>
                              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>2. Thực Đơn: {selectedVendor.name}</h3>
                              <p style={{ margin: '4px 0 0 0', fontSize: '.8rem', color: 'rgba(255,255,255,0.5)' }}>{selectedVendor.tips}</p>
                            </div>
                            <span style={{ fontSize: '.82rem', color: '#10B981', fontWeight: 600 }}>● Đang mở cửa</span>
                          </div>

                          {/* Vendor Contact and Notes Info */}
                          {(selectedVendor.phone || selectedVendor.note || selectedVendor.hours || selectedVendor.address) && (
                            <div style={{
                              background: 'rgba(242,112,36,0.04)',
                              border: '1px solid rgba(242,112,36,0.15)',
                              borderRadius: 16,
                              padding: '16px 20px',
                              marginBottom: 24,
                              fontSize: '.85rem',
                              lineHeight: 1.6,
                              color: 'rgba(255,255,255,0.8)'
                            }}>
                              {selectedVendor.phone && (
                                <div style={{ marginBottom: 6 }}>
                                  📞 <strong>Điện thoại liên hệ:</strong> <span style={{ color: '#FF9800', fontWeight: 700 }}>{selectedVendor.phone}</span>
                                </div>
                              )}
                              {selectedVendor.hours && (
                                <div style={{ marginBottom: 6 }}>
                                  🕒 <strong>Giờ mở cửa:</strong> {selectedVendor.hours}
                                </div>
                              )}
                              {selectedVendor.address && (
                                <div style={{ marginBottom: 6 }}>
                                  📍 <strong>Địa chỉ:</strong> {selectedVendor.address}
                                </div>
                              )}
                              {selectedVendor.note && (
                                <div style={{
                                  marginTop: 10,
                                  paddingTop: 10,
                                  borderTop: '1px dashed rgba(242,112,36,0.2)',
                                  color: '#ffb74d',
                                  fontStyle: 'italic'
                                }}>
                                  📣 <strong>Lời nhắn từ cửa hàng:</strong> "{selectedVendor.note}"
                                </div>
                              )}
                            </div>
                          )}

                          <div className="menu-grid">
                            {(selectedVendor.menu || []).map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 16, padding: '16px 20px',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                              >
                                <div>
                                  <h4 style={{ margin: '0 0 6px 0', fontSize: '.95rem', fontWeight: 700 }}>{item.name}</h4>
                                  <span style={{ color: '#FF9800', fontWeight: 700, fontSize: '.9rem' }}>{formatPrice(item.price)}</span>
                                </div>
                                <button
                                  onClick={() => addToCart(item)}
                                  style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: 'linear-gradient(135deg,#F27024,#FF5722)',
                                    border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 900,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.18s ease'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Right Cart panel */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, position: 'sticky', top: 96, height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>🛒 Giỏ Hàng</span>
                {cart.length > 0 && <span style={{ background: '#F27024', color: '#fff', fontSize: '.75rem', padding: '2px 8px', borderRadius: 10 }}>{cart.length} món</span>}
              </h3>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '2.5rem' }}>🍲</span>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.84rem', marginTop: 12, marginHorizontal: 12 }}>Chưa có món nào. Hãy click nút "+" bên cạnh món ăn để chọn!</p>
                </div>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ maxWidth: '60%' }}>
                        <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '.75rem', color: '#FF9800', fontWeight: 600 }}>{formatPrice(item.price)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => updateQuantity(item.name, -1)} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>-</button>
                        <span style={{ fontSize: '.85rem', fontWeight: 700 }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.name, 1)} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total and Checkout form */}
              {cart.length > 0 && (
                !activeUser ? (
                  <div style={{ marginTop: 20, textAlign: 'center', padding: '24px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '.95rem', marginBottom: 20 }}>
                      <span>Tổng cộng:</span>
                      <span style={{ color: '#FF9800' }}>{formatPrice(getCartTotal())}</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.84rem', marginBottom: 16 }}>Bạn cần đăng nhập để đặt đồ ăn giao tận phòng.</p>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(true)}
                      style={{
                        width: '100%', padding: '12px 0', borderRadius: 50,
                        background: 'linear-gradient(135deg,#F27024,#FF5722)',
                        border: 'none', color: '#fff', fontWeight: 700, fontSize: '.86rem',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(242,112,36,0.2)',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      Đăng nhập / Đăng ký ngay
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePlaceOrder}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '.95rem', marginBottom: 20 }}>
                      <span>Tổng cộng:</span>
                      <span style={{ color: '#FF9800' }}>{formatPrice(getCartTotal())}</span>
                    </div>

                    <h4 style={{ fontSize: '.82rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, marginBottom: 12 }}>Thông tin giao hàng</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                      <input
                        type="text"
                        placeholder="Họ và tên của bạn"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '.85rem' }}
                      />
                      <input
                        type="tel"
                        placeholder="Số điện thoại"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '.85rem' }}
                      />

                      <select
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        style={{ background: 'rgba(5,10,25,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 10px', color: '#fff', fontSize: '.85rem', cursor: 'pointer' }}
                      >
                        <option value="Ký túc xá Dom A">Ký túc xá Dom A (FPTU)</option>
                        <option value="Ký túc xá Dom B">Ký túc xá Dom B (FPTU)</option>
                        <option value="Ký túc xá Dom C">Ký túc xá Dom C (FPTU)</option>
                        <option value="Ký túc xá Dom D">Ký túc xá Dom D (FPTU)</option>
                        <option value="Ký túc xá Dom E">Ký túc xá Dom E (FPTU)</option>
                        <option value="Ký túc xá Dom F">Ký túc xá Dom F (FPTU)</option>
                        <option value="Tòa nhà Alpha">Tòa giảng đường Alpha</option>
                        <option value="Tòa nhà Beta">Tòa giảng đường Beta</option>
                        <option value="Khác">Khu vực khác (Nhập chi tiết)</option>
                      </select>

                      {deliveryAddress === 'Khác' && (
                        <input
                          type="text"
                          placeholder="Nhập địa chỉ giao hàng chi tiết"
                          required
                          value={customAddress}
                          onChange={e => setCustomAddress(e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '.85rem' }}
                        />
                      )}

                      <textarea
                        placeholder="Ghi chú cho quán (Ví dụ: không hành, nhiều cay, phòng 201 Dom A...)"
                        value={customerNote}
                        onChange={e => setCustomerNote(e.target.value)}
                        rows={2}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={trackingLoading}
                      style={{
                        width: '100%', padding: '14px 0', borderRadius: 50,
                        background: 'linear-gradient(135deg,#F27024,#FF5722)',
                        border: 'none', color: '#fff', fontWeight: 700, fontSize: '.9rem',
                        cursor: 'pointer', boxShadow: '0 8px 24px rgba(242,112,36,0.3)',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {trackingLoading ? 'Đang gửi đơn hàng...' : 'Đặt Hàng Ngay 🚀'}
                    </button>
                  </form>
                )
              )}

              {/* Buyer Order History */}
              {activeUser && (
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '16px 20px' }}>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                      width: '100%', background: 'none', border: 'none', color: '#FF9800',
                      fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center', padding: '4px 0'
                    }}
                  >
                    <span>📋 Lịch sử đơn hàng ({orderHistory.length})</span>
                    <span style={{ transition: 'transform 0.2s', transform: showHistory ? 'rotate(180deg)' : 'none' }}>▼</span>
                  </button>

                  {showHistory && (
                    <div style={{ marginTop: 14 }}>
                      {historyLoading ? (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem', textAlign: 'center' }}>Đang tải...</p>
                      ) : orderHistory.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.82rem', textAlign: 'center' }}>Chưa có đơn hàng nào.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                          {orderHistory.map(order => {
                            const statusColors = {
                              pending: '#F59E0B', preparing: '#3B82F6',
                              delivering: '#8B5CF6', completed: '#10B981', cancelled: '#EF4444'
                            };
                            const statusLabels = {
                              pending: 'Chờ duyệt', preparing: 'Đang nấu',
                              delivering: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy'
                            };
                            return (
                              <div key={order._id} style={{
                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12, padding: '12px 14px', fontSize: '.82rem', position: 'relative'
                              }}>
                                {/* Close/delete x button for completed/cancelled orders */}
                                {(order.status === 'completed' || order.status === 'cancelled') && (
                                  <button
                                    onClick={() => handleDeleteOrderHistory(order._id)}
                                    style={{
                                      position: 'absolute', top: 10, right: 10,
                                      background: 'none', border: 'none', color: '#EF4444',
                                      fontSize: '1.15rem', cursor: 'pointer', fontWeight: 'bold',
                                      padding: '2px 6px', transition: 'all 0.2s', zIndex: 5
                                    }}
                                    title="Xóa khỏi lịch sử"
                                    onMouseEnter={e => e.currentTarget.style.color = '#ff5c5c'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#EF4444'}
                                  >
                                    &times;
                                  </button>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingRight: (order.status === 'completed' || order.status === 'cancelled') ? 24 : 0 }}>
                                  <span style={{ fontWeight: 700, color: '#fff' }}>{order.vendorName}</span>
                                  <span style={{
                                    background: `${statusColors[order.status]}22`,
                                    color: statusColors[order.status],
                                    padding: '2px 8px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700
                                  }}>
                                    {statusLabels[order.status] || order.status}
                                  </span>
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.76rem', marginBottom: 4 }}>
                                  {order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                                </div>
                                {order.sellerNote && (
                                  <div style={{ color: '#FCA5A5', fontSize: '.76rem', marginBottom: 6, background: 'rgba(239,68,68,0.05)', padding: '4px 8px', borderRadius: 4 }}>
                                    💬 Ghi chú từ quán: {order.sellerNote}
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                  <span style={{ color: '#FF9800', fontWeight: 700 }}>{formatPrice(order.totalAmount)}</span>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {/* Reorder Button */}
                                    <button
                                      onClick={() => handleReorder(order)}
                                      style={{
                                        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                        color: '#10B981', padding: '3px 8px', borderRadius: 6,
                                        fontSize: '.72rem', fontWeight: 600, cursor: 'pointer'
                                      }}
                                    >
                                      Đặt lại + ➕
                                    </button>

                                    {order.status === 'pending' && (
                                      <button
                                        onClick={() => handleCancelOrder(order._id)}
                                        style={{
                                          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                          color: '#EF4444', padding: '3px 8px', borderRadius: 6,
                                          fontSize: '.72rem', fontWeight: 600, cursor: 'pointer'
                                        }}
                                      >
                                        Hủy đơn
                                      </button>
                                    )}
                                    {(order.status === 'pending' || order.status === 'preparing' || order.status === 'delivering') && (
                                      <button
                                        onClick={() => setActiveOrder(order)}
                                        style={{
                                          background: 'rgba(242,112,36,0.15)', border: '1px solid rgba(242,112,36,0.3)',
                                          color: '#F27024', padding: '3px 8px', borderRadius: 6,
                                          fontSize: '.72rem', fontWeight: 600, cursor: 'pointer'
                                        }}
                                      >
                                        Theo dõi
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '.7rem', marginTop: 4 }}>
                                  {new Date(order.createdAt).toLocaleString('vi-VN')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default OrderFood;
