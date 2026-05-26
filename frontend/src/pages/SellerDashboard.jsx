import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getVendorById, updateVendor, getOrdersByVendor, getSellerOrders, updateOrderStatus, scanVendorMenu } from '../services/api';
import vietmapgl from '@vietmap/vietmap-gl-js/dist/vietmap-gl';
import '@vietmap/vietmap-gl-js/dist/vietmap-gl.css';

const SellerDashboard = () => {
  const { user, loading: authLoading, setShowAuthModal, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'store', or 'guide'
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCoords, setIsSavingCoords] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Store coordinates
  const [storeCoords, setStoreCoords] = useState([105.52522, 21.01354]);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [sellerCancelNote, setSellerCancelNote] = useState('');

  const miniMapContainerRef = useRef(null);
  const miniMapRef = useRef(null);
  const miniMapMarkerRef = useRef(null);

  // Delivery routing map states & refs
  const [routingOrder, setRoutingOrder] = useState(null);
  const routingMapContainerRef = useRef(null);
  const routingMapRef = useRef(null);

  // Store profile edit fields
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeNote, setStoreNote] = useState('');
  const [menu, setMenu] = useState([]);

  // Menu item modal/form fields
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null for new, index number for editing
  const [itemForm, setItemForm] = useState({ name: '', price: '', description: '', image: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isScanningMenu, setIsScanningMenu] = useState(false);

  // For sound and polling notifications
  const prevOrdersCountRef = useRef(0);
  const audioCtxRef = useRef(null);

  // Sound generator using Web Audio API (chime sound)
  const playChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Generate a double chime tone (high frequency, pleasant)
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
      console.warn('Could not play notification audio:', e);
    }
  };

  const compressImageToBase64 = (file, maxWidth = 500, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ tải lên tệp tin hình ảnh (PNG, JPG, JPEG)');
      return;
    }

    setUploadingImage(true);
    try {
      const base64 = await compressImageToBase64(file);
      setItemForm(prev => ({ ...prev, image: base64 }));
    } catch (err) {
      console.error('Lỗi nén ảnh:', err);
      alert('Không thể tải ảnh này lên. Hãy thử ảnh khác.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOcrMenuUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ tải lên tệp tin hình ảnh (PNG, JPG, JPEG)');
      return;
    }

    setIsScanningMenu(true);
    showFlashMessage('Đang xử lý và tải lên tệp hình ảnh thực đơn...', 'info');

    try {
      // Compress and convert to base64 with a larger max width for higher OCR accuracy
      const base64 = await compressImageToBase64(file, 1200, 0.85);
      
      showFlashMessage('Đang phân tích hình ảnh thực đơn. Quá trình này có thể mất 5 - 15 giây...', 'info');
      
      const res = await scanVendorMenu(vendor?.id || vendor?._id || user?.vendor_id, { imageBase64: base64 });
      const menuItems = res && res.success && Array.isArray(res.menu) ? res.menu : (Array.isArray(res) ? res : null);
      if (menuItems) {
        if (menuItems.length === 0) {
          showFlashMessage('Không thể tìm thấy món ăn nào từ hình ảnh này. Hãy thử chụp ảnh rõ nét hơn hoặc tự thêm món.', 'warning');
        } else {
          const confirmMerge = window.confirm(`Hệ thống đã nhận diện được ${menuItems.length} món từ hình ảnh thực đơn. Bạn có muốn THÊM các món này vào thực đơn hiện tại của quán không?`);
          
          if (confirmMerge) {
            const formattedScanned = menuItems.map(item => ({
              name: item.name || 'Món mới',
              price: Number(item.price) || 0,
              description: item.description || '',
              image: '' // user direction: seller optionally uploads image later, do not auto-generate images.
            }));
            setMenu(prevMenu => [...prevMenu, ...formattedScanned]);
            showFlashMessage(`Đã thêm thành công ${menuItems.length} món vào thực đơn tạm thời. Hãy nhấn "Lưu thay đổi" (cột bên trái) để áp dụng vĩnh viễn!`, 'success');
          }
        }
      } else {
        showFlashMessage('Gặp lỗi khi xử lý thực đơn. Vui lòng kiểm tra lại hình ảnh hoặc thử lại.', 'error');
      }
    } catch (err) {
      console.error('Error scanning menu OCR:', err);
      showFlashMessage(err.response?.data?.error || 'Lỗi kết nối khi tải thực đơn lên hệ thống.', 'error');
    } finally {
      setIsScanningMenu(false);
      e.target.value = '';
    }
  };

  // Redirect checks removed in favor of in-place UI auth prompts

  const loadVendorInfo = async () => {
    if (!user?.vendor_id) return;
    try {
      const res = await getVendorById(user.vendor_id);
      if (res.success && res.data) {
        const v = res.data;
        setVendor(v);
        setStoreName(v.name || '');
        setStoreCategory(v.category || '');
        setStoreAddress(v.address || '');
        setStorePhone(v.phone || '');
        setStoreNote(v.note || '');
        setMenu(v.menu || []);
        if (v.coords && Array.isArray(v.coords) && v.coords.length === 2) {
          setStoreCoords(v.coords);
        } else {
          setStoreCoords([105.52522, 21.01354]);
        }
      }
    } catch (err) {
      console.error('Error fetching vendor:', err);
    }
  };

  // Load Orders Info
  const loadOrdersInfo = async (silent = false) => {
    if (!user?.vendor_id) return;
    try {
      // Use the auth-protected seller endpoint first, fallback to vendor filter
      let res;
      try {
        res = await getSellerOrders();
      } catch (e) {
        res = await getOrdersByVendor(user.vendor_id);
      }
      if (Array.isArray(res)) {
        // Sort: newest orders first
        const sorted = [...res].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Notification chime logic
        if (silent) {
          const newPendingCount = sorted.filter(o => o.status === 'pending').length;
          const oldPendingCount = orders.filter(o => o.status === 'pending').length;
          
          if (newPendingCount > oldPendingCount || sorted.length > prevOrdersCountRef.current) {
            playChime();
            showFlashMessage('Bạn có đơn hàng mới chưa xử lý!', 'success');
          }
        }
        
        setOrders(sorted);
        prevOrdersCountRef.current = sorted.length;
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadVendorInfo(), loadOrdersInfo()]);
      setIsLoading(false);
    };
    init();
  }, [user]);

  // Poll for new orders every 10 seconds
  useEffect(() => {
    if (!user?.vendor_id || activeTab !== 'orders') return;
    const interval = setInterval(() => {
      loadOrdersInfo(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [user, orders, activeTab]);

  const showFlashMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Initialize Mini Map for Coordinate Picker in "Vị trí & Cách hoạt động" tab
  useEffect(() => {
    if (activeTab !== 'guide' || !miniMapContainerRef.current) return;

    // Destroy existing map if present
    if (miniMapRef.current) {
      try {
        miniMapRef.current.remove();
      } catch (err) {
        console.warn(err);
      }
      miniMapRef.current = null;
    }

    const initialCoords = storeCoords;

    const map = new vietmapgl.Map({
      container: miniMapContainerRef.current,
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
      center: initialCoords,
      zoom: 15,
    });

    map.addControl(new vietmapgl.NavigationControl(), 'bottom-right');
    miniMapRef.current = map;

    // Create marker element
    const el = document.createElement('div');
    el.innerHTML = `<span style="font-size:1.8rem;display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:rgba(8,12,28,0.95);border:2px solid #F27024;border-radius:50%;cursor:pointer;box-shadow:0 4px 12px rgba(242,112,36,0.5);">🏪</span>`;

    const marker = new vietmapgl.Marker({ element: el, draggable: true })
      .setLngLat(initialCoords)
      .addTo(map);

    miniMapMarkerRef.current = marker;

    // Auto detect user location on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLng = position.coords.longitude;
          const userLat = position.coords.latitude;
          if (userLng > 104.0 && userLng < 106.5 && userLat > 20.0 && userLat < 22.0) {
            const gpsCoords = [userLng, userLat];
            setStoreCoords(gpsCoords);
            marker.setLngLat(gpsCoords);
            map.setCenter(gpsCoords);
            showFlashMessage('Đã tự động định vị và ghim vị trí hiện tại của bạn trên bản đồ!', 'success');
          }
        },
        (error) => {
          console.warn('Geolocation auto-detect failed:', error.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // Listen to dragend
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setStoreCoords([lngLat.lng, lngLat.lat]);
    });

    // Listen to click on map to position marker
    map.on('click', (e) => {
      const coords = [e.lngLat.lng, e.lngLat.lat];
      marker.setLngLat(coords);
      setStoreCoords(coords);
    });

    return () => {
      if (miniMapRef.current) {
        try {
          miniMapRef.current.remove();
        } catch (err) {
          console.warn(err);
        }
        miniMapRef.current = null;
      }
    };
  }, [activeTab]);


  // Initialize Delivery Routing Map Modal logic
  useEffect(() => {
    if (!routingOrder || !routingMapContainerRef.current) return;

    if (routingMapRef.current) {
      try {
        routingMapRef.current.remove();
      } catch (err) {
        console.warn(err);
      }
      routingMapRef.current = null;
    }

    const startCoords = storeCoords;
    const endCoords = [
      routingOrder.deliveryLongitude || 105.52522,
      routingOrder.deliveryLatitude || 21.01354
    ];

    const map = new vietmapgl.Map({
      container: routingMapContainerRef.current,
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
      center: startCoords,
      zoom: 14,
    });

    routingMapRef.current = map;

    // Custom Store Marker
    const storeEl = document.createElement('div');
    storeEl.innerHTML = `<span style="font-size:1.8rem;display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:rgba(11,20,37,0.95);border:2px solid #F27024;border-radius:50%;box-shadow:0 4px 14px rgba(242,112,36,0.6);">🏪</span>`;
    const storeMarker = new vietmapgl.Marker({ element: storeEl })
      .setLngLat(startCoords)
      .addTo(map);

    // Custom Buyer Marker
    const customerEl = document.createElement('div');
    customerEl.innerHTML = `<span style="font-size:1.8rem;display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:rgba(11,20,37,0.95);border:2px solid #10B981;border-radius:50%;box-shadow:0 4px 14px rgba(16,185,129,0.6);">🛵</span>`;
    const customerMarker = new vietmapgl.Marker({ element: customerEl })
      .setLngLat(endCoords)
      .addTo(map);

    const drawRoute = async (fromCoords, toCoords) => {
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}?overview=full&geometries=geojson`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const routeGeometry = route.geometry;
          const distanceKm = (route.distance / 1000).toFixed(2);
          const durationMins = Math.round(route.duration / 60);

          const infoEl = document.getElementById('routing-info-bar');
          if (infoEl) {
            infoEl.innerHTML = `🏁 Quãng đường: <strong>${distanceKm} km</strong> | ⏱️ Thời gian dự kiến: <strong>${durationMins} phút</strong>`;
          }

          const bounds = new vietmapgl.LngLatBounds();
          bounds.extend(fromCoords);
          bounds.extend(toCoords);
          map.fitBounds(bounds, { padding: 60 });

          if (map.getSource('route')) {
            map.getSource('route').setData({
              type: 'Feature',
              properties: {},
              geometry: routeGeometry
            });
          } else {
            map.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: routeGeometry
              }
            });

            map.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#F27024',
                'line-width': 6,
                'line-opacity': 0.85
              }
            });
          }
        }
      } catch (err) {
        console.error('Error fetching routing geometry:', err);
      }
    };

    map.on('load', () => {
      drawRoute(startCoords, endCoords);
    });

    window.recalculateFromGPS = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const gpsCoords = [position.coords.longitude, position.coords.latitude];
            storeMarker.setLngLat(gpsCoords);
            drawRoute(gpsCoords, endCoords);
            showFlashMessage('Đã cập nhật tuyến đường từ GPS thực tế của bạn!', 'success');
          },
          (error) => {
            alert('Không thể lấy GPS hiện tại: ' + error.message);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      } else {
        alert('Trình duyệt không hỗ trợ định vị GPS.');
      }
    };

    return () => {
      if (map) {
        try {
          map.remove();
        } catch (e) {}
      }
      delete window.recalculateFromGPS;
    };
  }, [routingOrder]);

  const handleSaveCoords = async () => {
    if (!user?.vendor_id) return;
    setIsSavingCoords(true);
    try {
      const payload = {
        name: storeName,
        category: storeCategory,
        address: storeAddress,
        phone: storePhone,
        note: storeNote,
        menu: menu,
        coords: storeCoords
      };
      const res = await updateVendor(user.vendor_id, payload);
      if (res.success) {
        showFlashMessage('Đã cập nhật tọa độ cửa hàng thành công!', 'success');
        setVendor(res.data);
      } else {
        showFlashMessage(res.message || 'Không thể lưu tọa độ.', 'error');
      }
    } catch (err) {
      console.error('Error saving coords:', err);
      showFlashMessage('Lỗi server khi lưu tọa độ cửa hàng.', 'error');
    } finally {
      setIsSavingCoords(false);
    }
  };

  // Save Store Profile Changes (to Server)
  const handleSaveStoreProfile = async (e) => {
    if (e) e.preventDefault();
    if (!user?.vendor_id) return;

    setIsSaving(true);
    try {
      const payload = {
        name: storeName,
        category: storeCategory,
        address: storeAddress,
        phone: storePhone,
        note: storeNote,
        menu: menu,
        coords: storeCoords
      };
      const res = await updateVendor(user.vendor_id, payload);
      if (res.success) {
        showFlashMessage('Đã lưu mọi thay đổi cửa hàng thành công!', 'success');
        setVendor(res.data);
      } else {
        showFlashMessage(res.message || 'Không thể lưu thay đổi.', 'error');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      showFlashMessage(err.response?.data?.message || 'Lỗi server khi lưu thông tin cửa hàng.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Status Changer for Orders
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res) {
        showFlashMessage(`Đã cập nhật trạng thái đơn hàng sang: ${getStatusLabel(newStatus)}`, 'success');
        loadOrdersInfo();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      showFlashMessage('Lỗi khi cập nhật trạng thái đơn hàng.', 'error');
    }
  };

  // Menu Item Actions (Local State modifications)
  const openItemModal = (index = null) => {
    if (index !== null) {
      setEditingIndex(index);
      setItemForm({ ...menu[index] });
    } else {
      setEditingIndex(null);
      setItemForm({ name: '', price: '', description: '', image: '' });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price) {
      alert('Vui lòng điền tên và giá tiền món ăn');
      return;
    }

    const updatedMenu = [...menu];
    const itemData = {
      name: itemForm.name,
      price: Number(itemForm.price),
      description: itemForm.description,
      image: itemForm.image || ''
    };

    if (editingIndex !== null) {
      updatedMenu[editingIndex] = itemData;
      showFlashMessage(`Đã sửa đổi món "${itemData.name}" trong danh mục tạm thời. Hãy ấn Lưu Thay Đổi.`, 'info');
    } else {
      updatedMenu.push(itemData);
      showFlashMessage(`Đã thêm món "${itemData.name}" vào danh mục tạm thời. Hãy ấn Lưu Thay Đổi.`, 'info');
    }

    setMenu(updatedMenu);
    setShowItemModal(false);
  };

  const handleDeleteItem = (index) => {
    const name = menu[index].name;
    if (window.confirm(`Bạn có chắc muốn xóa món "${name}"?`)) {
      const updatedMenu = menu.filter((_, i) => i !== index);
      setMenu(updatedMenu);
      showFlashMessage(`Đã xóa món "${name}". Nhớ nhấn "Lưu thay đổi" để áp dụng vĩnh viễn.`, 'warning');
    }
  };

  // Utilities
  const getStatusLabel = (s) => {
    switch (s) {
      case 'pending': return 'Chờ xử lý';
      case 'preparing': return 'Đang chuẩn bị';
      case 'delivering': return 'Đang giao hàng';
      case 'completed': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return s;
    }
  };

  const getStatusStyle = (s) => {
    switch (s) {
      case 'pending': return { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' };
      case 'preparing': return { background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' };
      case 'delivering': return { background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' };
      case 'completed': return { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' };
      case 'cancelled': return { background: 'rgba(239,68,68,0.15)', color: '#EF6868', border: '1px solid rgba(239,68,68,0.3)' };
      default: return {};
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1425', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(242,112,36,0.1)', borderTopColor: '#F27024', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Đang tải xác thực...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B1425', color: '#fff',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(242,112,36,0.12) 0%, transparent 60%)',
        paddingTop: 100, paddingBottom: 60, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ maxWidth: 450, width: '100%', margin: '0 20px', padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(242,112,36,0.2)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>🏪</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 12 }}>Kênh Người Bán (Seller)</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Chào mừng bạn đến với Kênh người bán HolaMate. Vui lòng đăng nhập với tài khoản Người bán để bắt đầu nhận đơn hàng và quản lý thực đơn của quán.
          </p>
          <button 
            onClick={() => setShowAuthModal(true)} 
            style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', boxShadow: '0 8px 16px rgba(242,112,36,0.25)', transition: 'transform 0.2s', fontFamily: 'Inter, sans-serif' }}
          >
            Đăng nhập / Đăng ký Kênh Người Bán
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== 'seller') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B1425', color: '#fff',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(242,112,36,0.12) 0%, transparent 60%)',
        paddingTop: 100, paddingBottom: 60, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ maxWidth: 450, width: '100%', margin: '0 20px', padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 12 }}>Yêu Cầu Tài Khoản Người Bán</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Tài khoản hiện tại của bạn không phải là tài khoản <strong>Người bán (Seller)</strong>. Hãy đăng nhập bằng tài khoản người bán hoặc liên hệ admin để đăng ký mở gian hàng nhé!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              onClick={() => { logout(); setShowAuthModal(true); }} 
              style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', boxShadow: '0 8px 16px rgba(242,112,36,0.25)', transition: 'transform 0.2s', fontFamily: 'Inter, sans-serif' }}
            >
              Đăng nhập tài khoản khác
            </button>
            <button 
              onClick={() => navigate('/')} 
              style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'Inter, sans-serif' }}
            >
              Quay lại Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1425', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(242,112,36,0.1)', borderTopColor: '#F27024', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Đang tải dữ liệu cửa hàng...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #111D36, #090E1A)', color: '#fff', paddingTop: 100, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header Store Title */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 36, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #F27024, #FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 4px 14px rgba(242,112,36,0.4)' }}>
              🏪
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{vendor?.name || 'Cửa hàng của bạn'}</h1>
              <p style={{ margin: '6px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
                📍 {vendor?.address || 'Hòa Lạc'} | 📞 {vendor?.phone || 'Chưa cập nhật SĐT'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button 
              onClick={() => { setActiveTab('orders'); playChime(); }}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                background: activeTab === 'orders' ? 'linear-gradient(135deg, #F27024, #E05F15)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'orders' ? '#fff' : 'rgba(255,255,255,0.7)',
                transition: 'all 0.25s', boxShadow: activeTab === 'orders' ? '0 4px 14px rgba(242,112,36,0.3)' : 'none'
              }}
            >
              Đơn hàng ({orders.length})
            </button>
            <button 
              onClick={() => setActiveTab('store')}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                background: activeTab === 'store' ? 'linear-gradient(135deg, #F27024, #E05F15)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'store' ? '#fff' : 'rgba(255,255,255,0.7)',
                transition: 'all 0.25s', boxShadow: activeTab === 'store' ? '0 4px 14px rgba(242,112,36,0.3)' : 'none'
              }}
            >
              Cửa hàng & Thực đơn
            </button>
            <button 
              onClick={() => setActiveTab('guide')}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                background: activeTab === 'guide' ? 'linear-gradient(135deg, #F27024, #E05F15)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'guide' ? '#fff' : 'rgba(255,255,255,0.7)',
                transition: 'all 0.25s', boxShadow: activeTab === 'guide' ? '0 4px 14px rgba(242,112,36,0.3)' : 'none'
              }}
            >
              Cách hoạt động & Vị trí 🗺️
            </button>
          </div>
        </div>

        {/* Global Action Messages */}
        {message.text && (
          <div style={{
            padding: '16px 20px', borderRadius: 16, marginBottom: 24, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 12,
            background: message.type === 'success' ? 'rgba(16,185,129,0.12)' : message.type === 'warning' ? 'rgba(245,158,11,0.12)' : message.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
            color: message.type === 'success' ? '#10B981' : message.type === 'warning' ? '#F59E0B' : message.type === 'error' ? '#EF4444' : '#3B82F6',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : message.type === 'warning' ? 'rgba(245,158,11,0.2)' : message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <span>💡</span> {message.text}
          </div>
        )}

        {/* ==================== TAB 1: MANAGE ORDERS ==================== */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📝</span> Tổng hợp đơn đặt hàng
            </h2>

            {orders.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 20, padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🥡</div>
                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>Hiện chưa có đơn đặt hàng nào.</p>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>Đơn hàng từ người mua sẽ tự động xuất hiện tại đây.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {orders.map((order) => (
                  <div key={order._id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 24,
                    display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 24, transition: 'all 0.3s',
                    boxShadow: order.status === 'pending' ? '0 0 20px rgba(245,158,11,0.1)' : 'none',
                    position: 'relative'
                  }}>
                    {order.status === 'pending' && (
                      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6, background: '#F59E0B', color: '#000', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000', display: 'inline-block', animation: 'ping 1s infinite' }} />
                        MỚI
                      </div>
                    )}

                    {/* Dấu x để hủy đơn nhanh */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button 
                        onClick={() => {
                          setCancellingOrderId(order._id);
                          setSellerCancelNote('');
                        }}
                        style={{
                          position: 'absolute',
                          top: 20,
                          right: order.status === 'pending' ? 85 : 20,
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                          border: 'none',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          zIndex: 5
                        }}
                        title="Hủy đơn hàng"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      >
                        &times;
                      </button>
                    )}

                    {/* Order Details Column */}
                    <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF7A00' }}>#{order._id}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                          📅 {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      {/* Customer contact card */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Người nhận</div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>👨‍💼 {order.customerName}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Số điện thoại</div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>📞 {order.customerPhone}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Địa chỉ giao hàng</div>
                          <div style={{ fontWeight: 500, color: '#CBD5E1', fontSize: '0.9rem', lineHeight: 1.4 }}>📍 {order.deliveryAddress}</div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Món ăn đặt mua:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', background: 'rgba(255,255,255,0.01)', padding: '6px 12px', borderRadius: 8 }}>
                              <span style={{ fontWeight: 500 }}>{item.name} <span style={{ color: '#F27024', fontWeight: 600 }}>x{item.quantity}</span></span>
                              <span style={{ color: '#CBD5E1' }}>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {order.customerNote && (
                        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 8, fontSize: '0.85rem', color: '#FCA5A5' }}>
                          💬 <strong>Ghi chú:</strong> {order.customerNote}
                        </div>
                      )}

                      {order.sellerNote && (
                        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 8, fontSize: '0.85rem', color: '#FCA5A5', marginTop: 6 }}>
                          💬 <strong>Phản hồi của bạn:</strong> {order.sellerNote}
                        </div>
                      )}
                    </div>

                    {/* Action & Total Column */}
                    <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', minWidth: 200, gap: 16 }}>
                      
                      {/* Price and Status badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tổng cộng</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{order.totalAmount.toLocaleString('vi-VN')}đ</div>
                        <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, marginTop: 10, ...getStatusStyle(order.status) }}>
                          {getStatusLabel(order.status)}
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button 
                          onClick={() => setRoutingOrder(order)}
                          style={{
                            alignSelf: 'flex-end',
                            background: 'rgba(242,112,36,0.1)',
                            color: '#F27024',
                            border: '1px solid rgba(242,112,36,0.3)',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(242,112,36,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(242,112,36,0.1)'}
                        >
                          🗺️ Bản đồ giao hàng
                        </button>
                        <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end' }}>Thay đổi trạng thái:</label>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                          {order.status === 'pending' && (
                            <button onClick={() => handleStatusChange(order._id, 'preparing')} style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              Chuẩn bị 🍳
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button onClick={() => handleStatusChange(order._id, 'delivering')} style={{ background: '#8B5CF6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              Giao hàng 🚴‍♂️
                            </button>
                          )}
                          {order.status === 'delivering' && (
                            <button onClick={() => handleStatusChange(order._id, 'completed')} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              Hoàn thành ✅
                            </button>
                          )}
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button 
                              onClick={() => {
                                setCancellingOrderId(order._id);
                                setSellerCancelNote('');
                              }} 
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Hủy 🚫
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: STORE PROFILE & MENU MANAGEMENT ==================== */}
        {activeTab === 'store' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgGridTemplateColumns: '350px 1fr', gap: 32 }}>
            <style>{`
              @media (min-width: 992px) {
                .store-layout { display: grid; grid-template-columns: 380px 1fr; gap: 32; }
              }
            `}</style>
            <div className="store-layout">
              {/* Store details form */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28, height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
                  🏢 Thông tin cửa hàng
                </h3>
                
                <form onSubmit={handleSaveStoreProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Tên cửa hàng</label>
                    <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Danh mục sản phẩm</label>
                    <input type="text" value={storeCategory} onChange={(e) => setStoreCategory(e.target.value)} required placeholder="Ví dụ: Đồ ăn & Đồ uống"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Địa chỉ</label>
                    <input type="text" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} required
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Số điện thoại</label>
                    <input type="text" value={storePhone} onChange={(e) => setStorePhone(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Ghi chú / Giờ mở cửa</label>
                    <textarea value={storeNote} onChange={(e) => setStoreNote(e.target.value)} rows={3} placeholder="Ví dụ: Mở cửa 8:00 - 22:00"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
                  </div>

                  <button type="submit" disabled={isSaving}
                    style={{
                      marginTop: 10, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                      background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                      opacity: isSaving ? 0.7 : 1, transition: 'all 0.2s'
                    }}
                  >
                    {isSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                  </button>
                </form>
              </div>

              {/* Menu items lists */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    🍔 Thực đơn món ăn & Đồ uống
                  </h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="ocr-menu-file-upload"
                      onChange={handleOcrMenuUpload}
                      style={{ display: 'none' }}
                    />
                    <button 
                      onClick={() => document.getElementById('ocr-menu-file-upload').click()}
                      disabled={isScanningMenu}
                      style={{
                        padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(242,112,36,0.4)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        background: 'rgba(242,112,36,0.05)', color: '#F27024', display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.25s', opacity: isScanningMenu ? 0.7 : 1
                      }}
                    >
                      {isScanningMenu ? 'Đang xử lý...' : '📤 Upload Menu'}
                    </button>
                    <button onClick={() => openItemModal()}
                      style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #F27024, #FF8C00)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 12px rgba(242,112,36,0.3)'
                      }}
                    >
                      ➕ Thêm món mới
                    </button>
                  </div>
                </div>

                {menu.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍽️</div>
                    <p style={{ margin: 0, fontWeight: 500 }}>Chưa có món ăn nào trong thực đơn.</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Hãy thêm món ăn/nước uống đầu tiên của bạn.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {menu.map((item, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', height: '100%', transition: 'all 0.2s'
                      }}>
                        <div style={{ width: '100%', height: 160, background: '#111D33', overflow: 'hidden', position: 'relative' }}>
                          <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} />
                          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 8, fontWeight: 700, color: '#10B981', fontSize: '0.95rem' }}>
                            {item.price.toLocaleString('vi-VN')}đ
                          </div>
                        </div>

                        <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{item.name}</h4>
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {item.description || 'Chưa có mô tả chi tiết món ăn.'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                            <button onClick={() => openItemModal(idx)}
                              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                              ✍️ Sửa
                            </button>
                            <button onClick={() => handleDeleteItem(idx)}
                              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Notice that local changes must be saved */}
                {menu.length > 0 && (
                  <div style={{ marginTop: 24, padding: 16, background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.2)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: '#F59E0B' }}>
                      ⚠️ Bạn đã sửa đổi danh sách thực đơn? Đừng quên ấn <strong>Lưu thay đổi</strong> ở cột thông tin cửa hàng để cập nhật lên hệ thống.
                    </span>
                    <button onClick={() => handleSaveStoreProfile()}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#000', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Lưu ngay
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: HOW IT WORKS & STORE MAP ==================== */}
        {activeTab === 'guide' && (
          <div>
            <style>{`
              @media (min-width: 992px) {
                .guide-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 32px; }
              }
            `}</style>
            
            <div className="guide-layout">
              {/* Stepper column */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
                  📖 Quy trình hoạt động của HanoMate
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { step: '1', title: 'Khách hàng đặt món 📱', desc: 'Khách chọn món ăn từ thực đơn của bạn trên trang Bản Đồ hoặc Đặt Đồ. Đơn hàng sẽ tự động gửi tới hệ thống.' },
                    { step: '2', title: 'Cửa hàng nhận thông báo 🔔', desc: 'Âm thanh thông báo tự động reo lên tại Kênh Người Bán. Bạn duyệt đơn sang trạng thái "Chuẩn bị" để tiến hành làm đồ ăn.' },
                    { step: '3', title: 'Chế biến & Giao hàng 🍳', desc: 'Đồ ăn sau khi chế biến xong sẽ chuyển sang trạng thái "Đang giao". Tài xế Hola sẽ mang tới địa chỉ của khách hàng (VD: KTX Dom A).' },
                    { step: '4', title: 'Hoàn thành đơn hàng ✅', desc: 'Khách hàng nhận đồ ăn nóng hổi và trả tiền. Trạng thái đơn được chuyển sang "Hoàn thành" để tổng hợp doanh thu.' }
                  ].map((s) => (
                    <div key={s.step} style={{ display: 'flex', gap: 16 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: 'rgba(242,112,36,0.1)', border: '1px solid #F27024',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F27024', fontWeight: 800, flexShrink: 0
                      }}>
                        {s.step}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{s.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map coordinate picker column */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
                    📍 Định vị tọa độ cửa hàng
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.48)' }}>
                    Nhấp chuột hoặc kéo thả biểu tượng Cửa hàng 🏪 trên bản đồ để ghim chính xác vị trí kinh doanh của bạn quanh Hola.
                  </p>
                </div>

                <div 
                  ref={miniMapContainerRef} 
                  style={{ width: '100%', height: 320, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
                />

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Tọa độ hiện tại:</div>
                    <div style={{ fontWeight: 600, color: '#F27024', fontFamily: 'monospace' }}>
                      Kinh độ: {storeCoords[0].toFixed(5)} | Vĩ độ: {storeCoords[1].toFixed(5)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const gpsCoords = [position.coords.longitude, position.coords.latitude];
                              setStoreCoords(gpsCoords);
                              if (miniMapMarkerRef.current) {
                                miniMapMarkerRef.current.setLngLat(gpsCoords);
                              }
                              if (miniMapRef.current) {
                                miniMapRef.current.setCenter(gpsCoords);
                              }
                              showFlashMessage('Đã cập nhật tọa độ từ GPS của thiết bị!', 'success');
                            },
                            (err) => {
                              alert('Không thể định vị GPS: ' + err.message);
                            },
                            { enableHighAccuracy: true, timeout: 8000 }
                          );
                        } else {
                          alert('Trình duyệt không hỗ trợ định vị GPS.');
                        }
                      }}
                      style={{
                        padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(242,112,36,0.5)',
                        background: 'rgba(242,112,36,0.1)', color: '#F27024', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      📍 Định vị thiết bị
                    </button>
                    <button 
                      onClick={handleSaveCoords}
                      disabled={isSavingCoords}
                      style={{
                        padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                        opacity: isSavingCoords ? 0.7 : 1, transition: 'all 0.2s'
                      }}
                    >
                      {isSavingCoords ? 'Đang lưu...' : '📌 Lưu vị trí này'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==================== ADD / EDIT MENU ITEM MODAL ==================== */}
      {showItemModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(11,25,44,0.75)', backdropFilter: 'blur(10px)', padding: 20
        }}>
          <div style={{
            background: '#111D36', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, width: '100%', maxWidth: 460, padding: 32, position: 'relative',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)', color: '#fff'
          }}>
            <button onClick={() => setShowItemModal(false)} style={{
              position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: 'none',
              width: 32, height: 32, borderRadius: '50%', color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              &times;
            </button>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24, color: '#fff' }}>
              {editingIndex !== null ? '✍️ Chỉnh sửa món ăn' : '➕ Thêm món ăn mới'}
            </h3>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Tên món ăn <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="text" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Giá bán (VNĐ) <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required min={1000}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Hình ảnh món ăn</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="menu-item-image-file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {itemForm.image ? (
                  <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img 
                      src={itemForm.image} 
                      alt="Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      onClick={() => document.getElementById('menu-item-image-file').click()}
                    >
                      <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>🔄 Đổi ảnh khác</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setItemForm(prev => ({ ...prev, image: '' }))}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.8)', border: 'none', width: 26, height: 26, borderRadius: '50%', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => document.getElementById('menu-item-image-file').click()}
                    style={{ 
                      width: '100%', 
                      height: 120, 
                      borderRadius: 12, 
                      border: '2px dashed rgba(242,112,36,0.3)', 
                      background: 'rgba(242,112,36,0.02)',
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      gap: 8
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(242,112,36,0.06)'; e.currentTarget.style.borderColor = '#F27024'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(242,112,36,0.02)'; e.currentTarget.style.borderColor = 'rgba(242,112,36,0.3)'; }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>📷</span>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                      {uploadingImage ? 'Đang tải lên...' : 'Tải ảnh từ máy tính (PNG, JPG)'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Mô tả chi tiết món ăn</label>
                <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={3} placeholder="Mô tả nguyên liệu, hương vị..."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowItemModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', cursor: 'pointer', fontWeight: 600 }}
                >
                  Đóng
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #F27024, #FF8C00)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {editingIndex !== null ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== DELIVERY ROUTING MAP MODAL ==================== */}
      {routingOrder && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,8,22,0.85)', backdropFilter: 'blur(12px)', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 700, background: '#0B1425', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 20
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>🗺️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                    Tuyến đường giao hàng
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>Đơn hàng: #{routingOrder._id}</span>
                </div>
              </div>
              <button 
                onClick={() => setRoutingOrder(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Recipient Details & Route stats */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: '0.9rem' }}>
                <div>👨‍💼 Người nhận: <strong>{routingOrder.customerName}</strong></div>
                <div>📞 SĐT: <strong>{routingOrder.customerPhone}</strong></div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                📍 Địa chỉ: {routingOrder.deliveryAddress}
              </div>
              {/* OSRM Route Info */}
              <div id="routing-info-bar" style={{ fontSize: '0.85rem', color: '#10B981', background: 'rgba(16,185,129,0.06)', padding: '8px 12px', borderRadius: 8, marginTop: 4, display: 'inline-block', width: 'fit-content' }}>
                ⌛ Đang tính toán tuyến đường giao hàng...
              </div>
            </div>

            {/* Map Container */}
            <div 
              ref={routingMapContainerRef}
              style={{ width: '100%', height: 380, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
            />

            {/* Action controls */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  if (window.recalculateFromGPS) window.recalculateFromGPS();
                }}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(242,112,36,0.4)',
                  background: 'rgba(242,112,36,0.05)', color: '#F27024', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                📡 Tuyến đường từ GPS thực tế của tôi
              </button>
              <button 
                onClick={() => setRoutingOrder(null)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CANCEL ORDER WITH NOTE MODAL ==================== */}
      {cancellingOrderId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,8,22,0.85)', backdropFilter: 'blur(12px)', padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 450, background: '#0B1425', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 24, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>🚫</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  Hủy đơn hàng #{cancellingOrderId}
                </h3>
              </div>
              <button 
                onClick={() => setCancellingOrderId(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                Lý do hủy đơn (gửi đến người mua):
              </label>
              <textarea 
                value={sellerCancelNote}
                onChange={(e) => setSellerCancelNote(e.target.value)}
                placeholder="Ví dụ: Quán hết món này rồi ạ, mong quý khách thông cảm..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setCancellingOrderId(null)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await updateOrderStatus(cancellingOrderId, 'cancelled', sellerCancelNote);
                    if (res) {
                      showFlashMessage('Đã hủy đơn hàng và gửi phản hồi đến người mua!', 'success');
                      setCancellingOrderId(null);
                      setSellerCancelNote('');
                      loadOrdersInfo();
                    }
                  } catch (err) {
                    console.error('Error cancelling order:', err);
                    showFlashMessage('Lỗi khi hủy đơn hàng.', 'error');
                  }
                }}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
                }}
              >
                Xác nhận Hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellerDashboard;
