import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, {
  postLocationPing,
  detectIpLocation,
  getVendors,
  createOrder,
  getOrderById
} from '../services/api';

const HOLA_CENTER = [105.52522, 21.01354];

const HOLA_LANDMARKS = [
  { id: 1, name: 'Tòa nhà Alpha', coords: [105.52522, 21.01354], category: 'landmark', emoji: '🏢', description: 'Tòa nhà biểu tượng của Đại học FPT với kiến trúc xanh độc đáo.', tips: 'Nơi tập trung ban giám hiệu và phòng dịch vụ sinh viên.' },
  { id: 2, name: 'Thư viện Beta', coords: [105.52735, 21.01312], category: 'explore', emoji: '📚', description: 'Không gian tự học hiện đại với hàng ngàn đầu sách và view hồ cực đẹp.', tips: 'Mở cửa từ 8h - 21h hàng ngày.' },
  { id: 3, name: 'Hồ Sen & Cầu Tình Yêu', coords: [105.52680, 21.01380], category: 'landmark', emoji: '🌉', description: 'Địa điểm check-in lãng mạn cho các cặp đôi sinh viên Hola.', tips: 'Đẹp nhất khi hoàng hôn xuống, gió mát rượi.' },
  {
    id: 4, name: 'Highlands Coffee Hola', coords: [105.52620, 21.01420], category: 'food', emoji: '☕', description: 'Quán cafe quen thuộc của dân Hola nằm ngay trong campus.', tips: 'Nơi tụ tập buôn chuyện và làm bài tập lý tưởng của sinh viên.',
    menu: [
      { name: 'Phin Sữa Đá', price: 29000, description: 'Cà phê phin đậm đà kết hợp với sữa đặc béo ngậy.' },
      { name: 'Trà Sen Vàng', price: 45000, description: 'Trà ô long thanh mát kết hợp hạt sen thơm bùi và kem sữa.' },
      { name: 'Bạc Xỉu Đá', price: 29000, description: 'Hương vị béo ngậy từ sữa kết hợp cafe phin nhẹ nhàng.' }
    ]
  },
  {
    id: 5, name: 'Bay Coffee & Tea', coords: [105.52890, 21.01890], category: 'food', emoji: '🍵', description: 'Quán cafe view hồ Tân Xã siêu đẹp và thoáng mát bên ngoài trường.', tips: 'Trà sữa và cafe muối cực ngon, giá rất sinh viên.',
    menu: [
      { name: 'Cà Phê Muối', price: 25000, description: 'Cà phê phin béo ngậy kết hợp lớp kem muối mặn đặc biệt.' },
      { name: 'Trà Đào Cam Sả', price: 30000, description: 'Trà đào ngọt ngào thơm nồng hương sả và cam tươi.' },
      { name: 'Matcha Latte', price: 35000, description: 'Bột matcha Nhật Bản nguyên chất hòa quyện cùng sữa tươi.' }
    ]
  },
  { id: 6, name: 'Hồ Tân Xã', coords: [105.53420, 21.02100], category: 'explore', emoji: '🌅', description: 'Hồ nước tự nhiên rộng lớn ngoài khu công nghệ cao.', tips: 'Nơi lý tưởng để chạy bộ buổi chiều và đạp xe ngắm hoàng hôn.' },
  {
    id: 7, name: '1988 BBQ Tân Xã', coords: [105.53050, 21.02050], category: 'food', emoji: '🥩', description: 'Quán nướng lẩu buffet được yêu thích nhất của sinh viên FPT.', tips: 'Giá từ 129k - 159k/người buffet nướng lẩu tẹt ga.',
    menu: [
      { name: 'Suất Buffet Nướng Lẩu Sinh Viên', price: 129000, description: 'Thả ga ba chỉ bò Mỹ, thịt dải heo nướng, gà sốt, hải sản và lẩu thái chua cay.' },
      { name: 'Combo Ba Chỉ Bò Nhúng Lẩu', price: 89000, description: 'Khay bò lớn kèm rau nấm tươi ngon cho nhóm nhỏ.' }
    ]
  },
  {
    id: 8, name: 'Gà Ri Phú Bình', coords: [105.51850, 21.00900], category: 'food', emoji: '🍗', description: 'Đặc sản gà ri nổi tiếng vùng Thạch Thất nướng đắp đất thơm ngon.', tips: 'Nên đi nhóm đông để gọi gà và chia tiền hợp lý.',
    menu: [
      { name: 'Mẹt Gà Ri Đắp Đất Nướng', price: 220000, description: 'Gà ri nguyên con bọc đất nướng thơm lừng thịt gà ngọt lịm.' },
      { name: 'Gà Ri Hấp Lá Chanh (Nửa Con)', price: 110000, description: 'Thịt gà hấp mềm thơm mùi lá chanh tươi.' }
    ]
  },
  { id: 9, name: 'Đồi Thông Hola', coords: [105.52350, 21.01250], category: 'explore', emoji: '🌲', description: 'Khu đồi thông lãng mạn nằm sát mép hồ sen campus.', tips: 'Thích hợp để chụp ảnh kỷ yếu và dạo mát.' },
  {
    id: 10, name: 'Twitter Beans Coffee', coords: [105.52980, 21.01520], category: 'food', emoji: '🥤', description: 'Quán cafe sang xịn mịn nằm tại tòa nhà Viettel công nghệ cao.', tips: 'Bánh sừng bò ăn kèm rất thơm ngon.',
    menu: [
      { name: 'Americano Đá', price: 35000, description: 'Espresso đậm đà pha loãng với nước tinh khiết lạnh.' },
      { name: 'Bánh Croissant Bơ Pháp', price: 28000, description: 'Bánh sừng bò thơm ngậy mùi bơ, giòn xốp.' },
      { name: 'Caramel Macchiato', price: 55000, description: 'Sữa tươi kem béo ngọt ngào hương caramel kết hợp Espresso.' }
    ]
  }
];

const CATEGORIES = [
  { key: 'all', label: 'Tất cả', emoji: '📍' },
  { key: 'landmark', label: 'Landmarks', emoji: '🏢' },
  { key: 'food', label: 'Ẩm thực', emoji: '🍜' },
  { key: 'explore', label: 'Khám phá', emoji: '🧭' },
];

const normalizeVietnamese = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
};

const MapExplore = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  // Basic states
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [initCoords, setInitCoords] = useState(null);
  const [activeMapLayer, setActiveMapLayer] = useState('streets');
  const tileLayerRef = useRef(null);

  // ShopeeFood States
  const [dbVendors, setDbVendors] = useState([]);
  const [cart, setCart] = useState({ vendorId: null, vendorName: '', items: [] });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  // Helper to compute distance in km (Haversine)
  const haversineKm = useCallback((lon1, lat1, lon2, lat2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  // Merge static landmarks and dynamic database vendors (all vendors included)
  const allMapPlaces = React.useMemo(() => {
    const places = [...HOLA_LANDMARKS];

    dbVendors.forEach((vendor) => {
      if (!vendor.coords || vendor.coords.length !== 2) return;

      // Skip if already exists in landmarks
      const exists = places.some(
        p => p.name.toLowerCase() === vendor.name.toLowerCase() ||
          (p.coords && p.coords.length === 2 &&
            p.coords[0] === vendor.coords[0] && p.coords[1] === vendor.coords[1])
      );
      if (exists) return;

      const rawCat = (vendor.category || '').toLowerCase();
      let mapCategory = 'food';
      let mapEmoji = '🍜';

      if (rawCat.includes('cafe') || rawCat.includes('coffee') || rawCat.includes('trà') || rawCat.includes('tea') || rawCat.includes('tiệm nước') || rawCat.includes('giải khát')) {
        mapEmoji = '☕';
      } else if (rawCat.includes('nướng') || rawCat.includes('lẩu') || rawCat.includes('bbq') || rawCat.includes('nướng lẩu')) {
        mapEmoji = '🥩';
      } else if (rawCat.includes('bánh mì') || rawCat.includes('croissant') || rawCat.includes('bánh')) {
        mapEmoji = '🥖';
      } else if (rawCat.includes('ăn vặt') || rawCat.includes('snack') || rawCat.includes('chè')) {
        mapEmoji = '🍿';
      }

      places.push({
        id: vendor.id || vendor._id,
        name: vendor.name,
        coords: vendor.coords,
        category: mapCategory,
        emoji: mapEmoji,
        description: vendor.address || 'Cửa hàng ẩm thực trên hệ thống HolaMate.',
        tips: vendor.tips || 'Đặt món nhanh chóng, giao hàng tận phòng KTX.',
        menu: vendor.menu || []
      });
    });

    return places;
  }, [dbVendors]);

  const searchSuggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = normalizeVietnamese(searchQuery.trim());
    return allMapPlaces.filter(p =>
      normalizeVietnamese(p.name).includes(query) ||
      normalizeVietnamese(p.description || '').includes(query) ||
      (p.menu || []).some(m => normalizeVietnamese(m.name || '').includes(query))
    ).slice(0, 5);
  }, [allMapPlaces, searchQuery]);

  const filteredLandmarks = React.useMemo(() => {
    const hasSearch = !!searchQuery.trim();
    const query = hasSearch ? normalizeVietnamese(searchQuery.trim()) : '';

    return allMapPlaces.filter(l => {
      // 1. Category Filter
      const matchesCategory = activeCategory === 'all' || l.category === activeCategory;
      if (!matchesCategory) return false;

      // 2. Default View (no search query)
      if (!hasSearch) {
        // Keep static landmarks. For DB vendors, limit to 8km to avoid map lag
        const isStatic = HOLA_LANDMARKS.some(p => p.id === l.id || p.name === l.name);
        if (!isStatic && l.coords) {
          const dist = haversineKm(HOLA_CENTER[0], HOLA_CENTER[1], l.coords[0], l.coords[1]);
          return dist <= 8; // Only show dynamic vendors within 8km by default
        }
        return true;
      }

      // 3. Active Search View (matches everything in database)
      const matchesName = normalizeVietnamese(l.name).includes(query);
      const matchesDesc = normalizeVietnamese(l.description || '').includes(query);
      const matchesTips = normalizeVietnamese(l.tips || '').includes(query);
      const matchesMenu = (l.menu || []).some(m => normalizeVietnamese(m.name || '').includes(query));

      return matchesName || matchesDesc || matchesTips || matchesMenu;
    });
  }, [allMapPlaces, activeCategory, searchQuery, haversineKm]);

  // Load vendors list from DB to match IDs
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await getVendors();
        if (res?.success && res.data) {
          setDbVendors(res.data);
        }
      } catch (err) {
        console.warn('Lấy vendor từ database thất bại, sử dụng dữ liệu tĩnh:', err);
      }
    };
    fetchVendors();
  }, []);

  // Prefill address when userAddress updates
  useEffect(() => {
    if (userAddress) {
      setDeliveryAddress(userAddress);
    }
  }, [userAddress]);

  // Order status polling / simulation
  useEffect(() => {
    if (!activeOrder || activeOrder._id.startsWith('mock_')) return;

    const interval = setInterval(async () => {
      try {
        const data = await getOrderById(activeOrder._id);
        if (data) {
          setActiveOrder(data);
          if (data.status === 'completed' || data.status === 'cancelled') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.warn('Lỗi cập nhật trạng thái đơn hàng:', err.message);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  // Thêm/cập nhật user marker bằng Leaflet
  const addUserMarker = useCallback((coords) => {
    if (!mapRef.current) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement('div');
    el.innerHTML = `<span style="font-size:1.8rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));cursor:pointer;">📍</span>`;

    const userIcon = L.divIcon({
      html: el,
      className: 'user-marker-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    const marker = L.marker([coords[1], coords[0]], { icon: userIcon })
      .bindPopup('<div style="color:#111;font-weight:700;font-size:0.8rem;padding:2px 4px;font-family:Inter,sans-serif;">📍 Vị trí giao hàng của bạn</div>', { offset: L.point(0, -28) })
      .addTo(mapRef.current);

    userMarkerRef.current = marker;
    marker.openPopup();
  }, []);

  const handleGeolocationSuccess = async (pos) => {
    const coords = [pos.coords.longitude, pos.coords.latitude];
    const locationForAI = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setUserLocation(coords);
    setLocating(false);
    localStorage.setItem('hanomate_chat_location', JSON.stringify(locationForAI));

    if (mapRef.current) {
      mapRef.current.flyTo([coords[1], coords[0]], 16, { duration: 1.5 });
      addUserMarker(coords);
    }

    try {
      const response = await postLocationPing({
        coords,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      if (response?.address) {
        setUserAddress(response.address);
      } else {
        setUserAddress(`Đã xác định vị trí: ${response.address || 'Hà Nội'}`);
      }
    } catch (e) {
      console.warn('Không gửi được tọa độ lên server:', e.message || e);
      setUserAddress(`Đã xác định vị trí tại: ${pos.coords.latitude.toFixed(5)}°N, ${pos.coords.longitude.toFixed(5)}°E`);
    }
  };

  // Định vị bằng Geolocation API miễn phí của trình duyệt
  const locateUser = () => {
    if (!navigator.geolocation) {
      // Fallback to IP-based detection if browser doesn't support geolocation
      fallbackToIpDetection('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setLocating(true);
    setLocError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        handleGeolocationSuccess(pos);
      },
      async (err) => {
        console.warn('Định vị GPS thất bại:', err);
        // Try IP-based fallback instead of just showing error
        if (err.code === 1) {
          // Permission denied - try IP fallback
          await fallbackToIpDetection('GPS bị chặn quyền truy cập. Đang dùng định vị theo IP...');
        } else if (err.code === 2) {
          await fallbackToIpDetection('Không thể xác định vị trí GPS. Đang dùng định vị theo IP...');
        } else if (err.code === 3) {
          await fallbackToIpDetection('Quá thời gian quét GPS. Đang dùng định vị theo IP...');
        } else {
          await fallbackToIpDetection('Gặp lỗi khi định vị thiết bị. Đang dùng định vị theo IP...');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };

  // Fallback: Use IP-based geolocation when GPS fails
  const fallbackToIpDetection = async (warningMsg) => {
    setLocError('');
    try {
      const ipData = await detectIpLocation();
      if (ipData?.success && ipData.coords) {
        const coords = ipData.coords;
        setUserLocation(coords);
        setLocating(false);
        localStorage.setItem('hanomate_chat_location', JSON.stringify({ latitude: coords[1], longitude: coords[0] }));

        if (mapRef.current) {
          mapRef.current.flyTo([coords[1], coords[0]], 15, { duration: 1.5 });
          addUserMarker(coords);
        }
        setUserAddress(ipData.address || `Vị trí: ${coords[1].toFixed(5)}°N, ${coords[0].toFixed(5)}°E`);
        return;
      }
      throw new Error('IP detection failed');
    } catch (e) {
      console.warn('IP detection cũng thất bại:', e);
      setLocating(false);
      setLocError(warningMsg || 'Không thể xác định vị trí. Vui lòng chọn vị trí trên bản đồ.');
    }
  };

  // Đăng ký sự kiện click trên bản đồ để chọn vị trí thủ công
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = async (e) => {
      // Only handle clicks when in location picking mode
      if (!isPickingLocation) return;

      const coords = [e.latlng.lng, e.latlng.lat];
      setUserLocation(coords);
      setIsPickingLocation(false);

      const locationForAI = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      localStorage.setItem('hanomate_chat_location', JSON.stringify(locationForAI));

      addUserMarker(coords);

      setUserAddress('Đang xác định địa chỉ...');
      try {
        const response = await postLocationPing({
          coords,
          accuracy: 10,
          timestamp: Date.now(),
        });
        if (response?.address) {
          setUserAddress(`${response.address} (Chọn thủ công)`);
        } else {
          setUserAddress('Đã xác định vị trí (Chọn thủ công).');
        }
      } catch (err) {
        setUserAddress('Đã xác định vị trí (Chọn thủ công - Ngoại tuyến).');
      }
    };

    mapRef.current.on('click', handleMapClick);
    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [isPickingLocation, addUserMarker]);

  // Thay đổi cursor của container bản đồ khi đang trong chế độ chọn vị trí
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isPickingLocation) {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else {
      mapContainerRef.current.style.cursor = '';
    }
  }, [isPickingLocation]);

  // Quét định vị lấy GPS thực tế của người dùng ngay khi mount (hoàn toàn miễn phí qua Geolocation API)
  useEffect(() => {
    // 1. Kiểm tra cache cũ của người dùng
    const cached = localStorage.getItem('hanomate_user_last_coords');
    if (cached) {
      try {
        setInitCoords(JSON.parse(cached));
        return;
      } catch (_) { }
    }

    // 2. Định vị GPS thực tế
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setInitCoords([pos.coords.longitude, pos.coords.latitude]);
        },
        async (err) => {
          console.warn('Định vị GPS thất bại hoặc bị từ chối:', err);
          // Try IP-based fallback
          try {
            const ipData = await detectIpLocation();
            if (ipData?.success && ipData.coords) {
              setInitCoords(ipData.coords);
              return;
            }
          } catch (e) {
            console.warn('IP detection fallback cũng thất bại:', e);
          }
          setInitCoords(HOLA_CENTER);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    } else {
      // No geolocation API - try IP fallback
      detectIpLocation()
        .then(ipData => {
          if (ipData?.success && ipData.coords) {
            setInitCoords(ipData.coords);
          } else {
            setInitCoords(HOLA_CENTER);
          }
        })
        .catch(() => setInitCoords(HOLA_CENTER));
    }
  }, []);

  // Map tile layer definitions
  const MAP_TILES = {
    streets: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri', maxZoom: 18 },
    terrain: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '© OpenTopoMap', maxZoom: 17 },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© CartoDB', maxZoom: 19 },
  };

  // Switch map tile layer
  const switchMapLayer = useCallback((layerKey) => {
    if (!mapRef.current || !MAP_TILES[layerKey]) return;
    setActiveMapLayer(layerKey);
    const tile = MAP_TILES[layerKey];
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    tileLayerRef.current = L.tileLayer(tile.url, { maxZoom: tile.maxZoom, attribution: tile.attr }).addTo(mapRef.current);
  }, []);

  // Khởi tạo bản đồ khi đã lấy được tọa độ bắt đầu (initCoords)
  useEffect(() => {
    if (!initCoords || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [initCoords[1], initCoords[0]],
      zoom: 15,
      zoomControl: false
    });

    const defaultTile = MAP_TILES.streets;
    tileLayerRef.current = L.tileLayer(defaultTile.url, { maxZoom: defaultTile.maxZoom, attribution: defaultTile.attr }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    // Thêm user marker và lưu trạng thái vị trí
    addUserMarker(initCoords);
    setUserLocation(initCoords);
    localStorage.setItem('hanomate_user_last_coords', JSON.stringify(initCoords));
    localStorage.setItem('hanomate_chat_location', JSON.stringify({ latitude: initCoords[1], longitude: initCoords[0] }));

    // Giải mã tọa độ sang địa chỉ bằng API
    postLocationPing({ coords: initCoords, accuracy: 10, timestamp: Date.now() })
      .then(res => {
        if (res?.address) {
          setUserAddress(res.address);
        } else {
          setUserAddress(`Vị trí: ${initCoords[1].toFixed(5)}°N, ${initCoords[0].toFixed(5)}°E`);
        }
      })
      .catch(() => {
        setUserAddress(`Vị trí: ${initCoords[1].toFixed(5)}°N, ${initCoords[0].toFixed(5)}°E`);
      });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initCoords, addUserMarker]);

  // Gộp kết quả tìm kiếm (local + OSM) hoặc danh sách lọc theo category để hiển thị trên bản đồ
  const displayPlacesList = React.useMemo(() => {
    if (searchResults && searchResults.length > 0) {
      // Luôn giữ toàn bộ các quán ở database và static landmarks trên bản đồ
      const basePlaces = [...allMapPlaces];

      // Lấy các kết quả OSM mới (không phải local) để hiển thị cùng
      const osmPlaces = searchResults
        .filter(r => !r.isLocal)
        .map((r, index) => ({
          id: r.place?.id || `osm_${index}_${r.coords?.[0] || 0}_${r.coords?.[1] || 0}`,
          name: r.name,
          description: r.address,
          emoji: '📍',
          tips: 'Địa điểm từ bản đồ vệ tinh',
          coords: r.coords,
          category: 'explore',
          menu: [],
          isOsm: true // Nhãn để hiển thị marker màu xanh biển
        }));

      // Gộp lại và loại bỏ trùng lặp nếu trùng tọa độ
      const combined = [...basePlaces];
      osmPlaces.forEach(osmP => {
        const isDuplicate = combined.some(p => 
          p.coords && p.coords.length === 2 && 
          Math.abs(p.coords[0] - osmP.coords[0]) < 0.0001 && 
          Math.abs(p.coords[1] - osmP.coords[1]) < 0.0001
        );
        if (!isDuplicate) {
          combined.push(osmP);
        }
      });

      return combined.filter(p => p.coords && p.coords.length === 2);
    }
    return filteredLandmarks;
  }, [searchResults, allMapPlaces, filteredLandmarks]);

  // Cập nhật markers khi displayPlacesList hoặc selectedPlace thay đổi (Sử dụng đối chiếu reconciliation để tránh lag, giật màn hình)
  useEffect(() => {
    if (!mapRef.current) return;

    // Khởi tạo Map lưu trữ markers nếu chưa tồn tại
    if (!(markersRef.current instanceof Map)) {
      markersRef.current = new Map();
    }

    const displayPlaces = [...displayPlacesList];
    if (selectedPlace && selectedPlace.coords && selectedPlace.coords.length === 2) {
      const exists = displayPlaces.some(p => p.id === selectedPlace.id || p.name.toLowerCase() === selectedPlace.name.toLowerCase());
      if (!exists) {
        displayPlaces.push(selectedPlace);
      }
    }

    // Tạo tập hợp các khóa hoạt động cho các địa điểm cần hiển thị
    const activeKeys = new Set();
    displayPlaces.forEach(place => {
      if (place.coords && place.coords.length === 2) {
        const key = place.id || place.name;
        activeKeys.add(String(key));
      }
    });

    // 1. Loại bỏ các marker không còn nằm trong danh sách cần hiển thị
    markersRef.current.forEach((marker, key) => {
      if (!activeKeys.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });

    // 2. Thêm các marker mới chưa có trên bản đồ
    displayPlaces.forEach(place => {
      if (!place.coords || place.coords.length !== 2) return;
      const key = String(place.id || place.name);

      // Nếu đã có marker cho địa điểm này, bỏ qua không tạo lại để tránh chớp nháy
      if (markersRef.current.has(key)) {
        return;
      }

      const el = document.createElement('div');
      const isOsm = !!place.isOsm;
      const themeColor = isOsm ? 'rgba(59,130,246,0.85)' : 'rgba(242,112,36,0.85)';
      const themeShadow = isOsm ? 'rgba(59,130,246,0.3)' : 'rgba(242,112,36,0.3)';
      const hoverShadow = isOsm ? 'rgba(59,130,246,0.6)' : 'rgba(242,112,36,0.6)';

      el.innerHTML = `<span style="font-size:0.92rem;display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(8,12,28,0.92);border:1.5px solid ${themeColor};border-radius:50%;cursor:pointer;box-shadow:0 3px 10px ${themeShadow};transition:transform .2s ease, box-shadow .2s ease;">${place.emoji || '🍜'}</span>`;
      
      el.addEventListener('mouseenter', () => { 
        if (el.firstChild) {
          el.firstChild.style.transform = 'scale(1.25)'; 
          el.firstChild.style.boxShadow = `0 4px 14px ${hoverShadow}`; 
        }
        // Smoothly open the right panel on hover/pointing without shifting the map view
        setSelectedPlace(place);
        setIsCheckoutMode(false);
      });
      el.addEventListener('mouseleave', () => { 
        if (el.firstChild) {
          el.firstChild.style.transform = 'scale(1)'; 
          el.firstChild.style.boxShadow = `0 3px 10px ${themeShadow}`; 
        }
      });

      const placeIcon = L.divIcon({
        html: el,
        className: 'place-marker-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([place.coords[1], place.coords[0]], { icon: placeIcon })
        .addTo(mapRef.current);

      // Thêm Tooltip hiển thị tên quán khi trỏ chuột vào (hover)
      marker.bindTooltip(`<div style="font-weight:700;color:#fff;background:#0b0704;border:1px solid #F27024;padding:4px 8px;border-radius:8px;font-family:Inter,sans-serif;font-size:0.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.5);">${place.name}</div>`, {
        direction: 'top',
        offset: L.point(0, -10),
        opacity: 0.95,
        permanent: false
      });

      // Click opens the right panel with full info + menu
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPlace(place);
        setIsCheckoutMode(false);
        if (mapRef.current) {
          mapRef.current.flyTo([place.coords[1], place.coords[0]], 16, { duration: 0.8 });
        }
      });

      markersRef.current.set(key, marker);
    });
  }, [displayPlacesList, selectedPlace]);

  const flyToPlace = useCallback((place) => {
    if (!mapRef.current) return;
    setSelectedPlace(place);
    setIsCheckoutMode(false);
    mapRef.current.flyTo([place.coords[1], place.coords[0]], 16, { duration: 1.5 });
  }, []);

  // Map Search: prioritize local database vendors first, fallback to OSM Nominatim API
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    // 1. Search local matches in allMapPlaces
    const query = normalizeVietnamese(searchQuery.trim());
    const localMatches = allMapPlaces.filter(p =>
      normalizeVietnamese(p.name).includes(query) ||
      normalizeVietnamese(p.description || '').includes(query) ||
      (p.menu || []).some(m => normalizeVietnamese(m.name || '').includes(query))
    ).map(p => {
      const matchedItems = p.menu
        ? p.menu.filter(m => normalizeVietnamese(m.name || '').includes(query))
        : [];
      return {
        name: p.name,
        address: matchedItems.length > 0
          ? `🍜 Có bán: ${matchedItems.map(m => m.name).slice(0, 2).join(', ')}`
          : (p.description || p.tips || 'Cửa hàng trên hệ thống HolaMate'),
        coords: p.coords,
        isLocal: true,
        place: p
      };
    });

    try {
      // 2. Query Nominatim OSM Geocoding API with viewbox bias around current map center (like Google Maps)
      let viewboxParam = '';
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        const lat = center.lat;
        const lng = center.lng;
        // Approx 8km bounding box around the current map center
        const left = lng - 0.08;
        const right = lng + 0.08;
        const top = lat + 0.08;
        const bottom = lat - 0.08;
        viewboxParam = `&viewbox=${left},${top},${right},${bottom}&bounded=0`;
      } else {
        // Fallback viewbox around FPT Hoa Lac
        viewboxParam = '&viewbox=105.44,21.09,105.60,20.93&bounded=0';
      }

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=8&accept-language=vi&countrycodes=vn${viewboxParam}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'HolaMate App' } });
      const data = await res.json();

      const osmResults = data.map(d => ({
        name: d.display_name.split(',')[0],
        address: d.display_name.split(',').slice(1, 3).join(',').trim(),
        coords: [parseFloat(d.lon), parseFloat(d.lat)],
        isLocal: false
      }));

      // Combine local matches first, then Nominatim results
      const combined = [...localMatches];
      osmResults.forEach(osm => {
        const alreadyExists = combined.some(l =>
          l.name.toLowerCase() === osm.name.toLowerCase() ||
          (l.coords && osm.coords && l.coords[0] === osm.coords[0] && l.coords[1] === osm.coords[1])
        );
        if (!alreadyExists) {
          combined.push(osm);
        }
      });

      if (combined.length > 0) {
        setSearchResults(combined);
      } else {
        setSearchResults([{ name: 'Không tìm thấy địa điểm', address: 'Thử từ khóa khác quanh Hola', coords: null }]);
      }
    } catch {
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      } else {
        setSearchResults([{ name: 'Lỗi kết nối mạng', address: 'Kiểm tra internet và thử lại', coords: null }]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, allMapPlaces]);

  const flyToSearchResult = useCallback((result) => {
    if (!result.coords || !mapRef.current) return;

    // Do NOT clear search results or query box, keeping the context intact (Google Maps style)
    mapRef.current.flyTo([result.coords[1], result.coords[0]], 16, { duration: 1.5 });

    if (result.isLocal && result.place) {
      setSelectedPlace(result.place);
      setIsCheckoutMode(false);
      return;
    }

    // Fallback for custom search place (e.g. from Google Maps/OSM)
    const searchPlace = {
      id: result.place?.id || `search_${normalizeVietnamese(result.name)}_${result.coords?.[0] || 0}_${result.coords?.[1] || 0}`,
      name: result.name,
      description: result.address,
      emoji: '📍',
      tips: 'Địa điểm từ bản đồ vệ tinh',
      coords: result.coords,
      category: 'explore',
      menu: []
    };
    setSelectedPlace(searchPlace);
    setIsCheckoutMode(false);
  }, []);


  // Cart Handlers
  const handleAddToCart = (vendor, item) => {
    if (user && user.role === 'seller') {
      alert('Tài khoản chủ quán (Người bán) chỉ có quyền quản lý cửa hàng, không thể đặt mua đồ ăn!');
      return;
    }
    if (cart.vendorId && cart.vendorId !== vendor.id) {
      if (!window.confirm(`Bạn muốn đổi sang đặt món tại ${vendor.name}? Giỏ hàng hiện tại của bạn tại ${cart.vendorName} sẽ bị xóa.`)) {
        return;
      }
      setCart({
        vendorId: vendor.id,
        vendorName: vendor.name,
        items: [{ ...item, quantity: 1 }]
      });
      return;
    }

    setCart(prev => {
      const existing = prev.items.find(i => i.name === item.name);
      let updatedItems;
      if (existing) {
        updatedItems = prev.items.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        updatedItems = [...prev.items, { ...item, quantity: 1 }];
      }
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        items: updatedItems
      };
    });
  };

  const updateCartQuantity = (itemName, delta) => {
    setCart(prev => {
      const updated = prev.items.map(i => {
        if (i.name === itemName) {
          const nq = i.quantity + delta;
          return nq > 0 ? { ...i, quantity: nq } : null;
        }
        return i;
      }).filter(Boolean);

      if (updated.length === 0) {
        return { vendorId: null, vendorName: '', items: [] };
      }
      return { ...prev, items: updated };
    });
  };

  // Order placement handler
  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin: Họ tên, Số điện thoại và Địa chỉ giao hàng!');
      return;
    }

    // Match vendor ID in DB, prioritizing exact ID from cart
    const matchingVendor = dbVendors.find(v => v.name.toLowerCase().includes(cart.vendorName.toLowerCase()));
    const vendorId = cart.vendorId || matchingVendor?.id || matchingVendor?._id || '664f331f456789abcd123456';

    const orderPayload = {
      vendorId,
      items: cart.items,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryLongitude: userLocation ? userLocation[0] : null,
      deliveryLatitude: userLocation ? userLocation[1] : null
    };

    try {
      const res = await createOrder(orderPayload);
      if (res) {
        setActiveOrder(res);
        setCart({ vendorId: null, vendorName: '', items: [] });
        setIsCheckoutMode(false);
      }
    } catch (err) {
      console.warn('Đặt hàng online lỗi, kích hoạt trình giả lập đơn hàng offline...', err.message);
      // Offline fallback simulator
      const mockOrder = {
        _id: 'mock_' + Date.now(),
        vendorName: cart.vendorName,
        items: cart.items,
        totalAmount: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        customerName,
        customerPhone,
        deliveryAddress,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      setActiveOrder(mockOrder);
      setCart({ vendorId: null, vendorName: '', items: [] });
      setIsCheckoutMode(false);

      // Transition stages offline
      setTimeout(() => {
        setActiveOrder(prev => (prev && prev._id === mockOrder._id) ? { ...prev, status: 'preparing' } : prev);
      }, 7000);
      setTimeout(() => {
        setActiveOrder(prev => (prev && prev._id === mockOrder._id) ? { ...prev, status: 'delivering' } : prev);
      }, 16000);
      setTimeout(() => {
        setActiveOrder(prev => (prev && prev._id === mockOrder._id) ? { ...prev, status: 'completed' } : prev);
      }, 28000);
    }
  };

  const getStatusStepIndex = (status) => {
    const map = { pending: 0, preparing: 1, delivering: 2, completed: 3 };
    return map[status] ?? 0;
  };

  // Styles object — panels use high z-index to stay above map tiles & markers
  const S = {
    sidebar: {
      position: 'absolute',
      top: 20,
      left: windowWidth < 480 ? 10 : 20,
      width: windowWidth < 480 ? 'calc(100% - 20px)' : 360,
      maxHeight: 'calc(100vh - 112px)',
      background: 'rgba(11,7,4,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(242,112,36,0.25)',
      borderRadius: 16,
      zIndex: 1500,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      transition: 'all .3s ease',
    },
    rightPanel: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: windowWidth < 480 ? '100%' : 380,
      height: '100%',
      background: 'rgba(11,7,4,0.97)',
      backdropFilter: 'blur(18px)',
      borderLeft: '1px solid rgba(242,112,36,0.18)',
      zIndex: 1600,
      display: 'flex',
      flexDirection: 'column',
      transform: selectedPlace ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform .3s ease',
      boxShadow: '-8px 0 35px rgba(0,0,0,0.5)',
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 72px)', marginTop: 72, display: 'flex', overflow: 'hidden' }}>
      <style>{`
        @keyframes userPulse { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.4);opacity:0} }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseOrange { 0% { box-shadow: 0 0 0 0 rgba(242,112,36, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(242,112,36, 0); } 100% { box-shadow: 0 0 0 0 rgba(242,112,36, 0); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Left Sidebar */}
      <div style={S.sidebar}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 10px', borderBottom: '1px solid rgba(242,112,36,0.12)' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FF9800', margin: 0 }}>🗺️ Bản Đồ Hola</h2>
            <p style={{ margin: '2px 0 0', fontSize: '.7rem', color: 'rgba(255,255,255,.4)' }}>{filteredLandmarks.length} địa điểm quanh bạn</p>
          </div>
          <button onClick={() => setSidebarOpen(prev => !prev)} style={{
            background: 'rgba(242,112,36,0.1)', border: '1px solid rgba(242,112,36,0.25)',
            color: '#F27024', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700
          }}>
            {sidebarOpen ? '▲ Thu nhỏ' : '▼ Mở rộng'}
          </button>
        </div>

        {/* GPS Button */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(242,112,36,0.08)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={locateUser} disabled={locating} style={{
              flex: 2, padding: '10px 8px', borderRadius: 10, border: 'none',
              background: locating ? 'rgba(255,255,255,.06)' : 'linear-gradient(135deg,#F27024,#FF5722)',
              color: locating ? '#aaa' : '#fff', fontWeight: 700, fontSize: '.78rem', cursor: locating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              boxShadow: locating ? 'none' : '0 4px 10px rgba(242,112,36,0.2)', fontFamily: 'Inter,sans-serif',
              transition: 'all 0.2s ease',
            }}>
              {locating ? '⏳ Đang định vị...' : '📍 Định vị tự động'}
            </button>
            <button onClick={() => setIsPickingLocation(prev => !prev)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10,
              border: isPickingLocation ? '1px solid #FF5722' : '1px solid rgba(242,112,36,0.3)',
              background: isPickingLocation ? 'rgba(242,112,36,0.2)' : 'rgba(255,255,255,0.05)',
              color: '#FF9800', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              fontFamily: 'Inter,sans-serif',
              transition: 'all 0.2s ease',
            }}>
              {isPickingLocation ? '🛑 Hủy' : '🎯 Bản đồ'}
            </button>
          </div>

          {isPickingLocation && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 6,
              background: 'rgba(242,112,36,0.1)', border: '1px dashed rgba(242,112,36,0.4)',
              fontSize: '.72rem', color: '#FF9800', textAlign: 'center',
            }}>
              👉 Click bất kỳ điểm nào trên bản đồ để chọn vị trí.
            </div>
          )}

          {userLocation && (
            <div style={{ marginTop: 8, fontSize: '.72rem', color: '#10B981', textAlign: 'center', fontWeight: 500 }}>
              ✓ Đã định vị: {userLocation[1].toFixed(5)}°N, {userLocation[0].toFixed(5)}°E
            </div>
          )}
          {userAddress && (
            <div style={{ marginTop: 6, fontSize: '.72rem', color: '#E2D7B5', textAlign: 'center', lineHeight: 1.3, padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              🏠 {userAddress}
            </div>
          )}
          {locError && <div style={{ marginTop: 6, fontSize: '.7rem', color: '#FCA5A5', textAlign: 'center' }}>⚠️ {locError}</div>}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 20px 8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm quán ăn, món ăn, địa danh..."
              style={{ width: '100%', padding: '8px 28px 8px 12px', borderRadius: 8, border: '1px solid rgba(242,112,36,0.25)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: '.84rem', fontFamily: 'Inter,sans-serif', outline: 'none' }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
              >
                &times;
              </button>
            )}
            {searchSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200,
                background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(242, 112, 36, 0.35)', borderRadius: 8,
                marginTop: 4, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.55)',
                maxHeight: '200px', overflowY: 'auto'
              }}>
                {searchSuggestions.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => {
                      flyToPlace(place);
                      setSearchQuery(place.name);
                    }}
                    style={{
                      padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(242,112,36,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{place.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{place.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {place.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSearch} disabled={isSearching} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.84rem' }}>
            {isSearching ? '⏳' : '🔍'}
          </button>
        </div>

        {/* Collapsible List Container (Only rendered when sidebarOpen is true) */}
        {sidebarOpen && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease' }}>
            {/* Search Results or Category Filters */}
            {searchResults.length > 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 6px', borderBottom: '1px solid rgba(242,112,36,0.08)' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#FF9800', letterSpacing: '0.05em' }}>🔍 KẾT QUẢ TÌM KIẾM ({searchResults.length})</span>
                  <button 
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✕ Xóa
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => flyToSearchResult(r)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10, cursor: r.coords ? 'pointer' : 'default',
                      background: selectedPlace?.name.toLowerCase() === r.name.toLowerCase() ? 'rgba(242,112,36,.12)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${selectedPlace?.name.toLowerCase() === r.name.toLowerCase() ? 'rgba(242,112,36,.45)' : 'rgba(255,255,255,.06)'}`,
                      transition: 'all .2s ease',
                    }}>
                      <div style={{ fontSize: '1.2rem', flexShrink: 0, width: 28, textAlign: 'center' }}>
                        {r.isLocal ? (r.place?.emoji || '🍜') : '📍'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#fff', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          {r.name}
                          {r.isLocal && <span style={{ fontSize: '0.58rem', background: 'rgba(242,112,36,0.2)', color: '#FF9800', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>Hệ thống</span>}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.42)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {r.address}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Category Filter */}
                <div style={{ display: 'flex', gap: 4, padding: '10px 20px', flexWrap: 'wrap' }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
                      padding: '6px 10px', borderRadius: 16, fontFamily: 'Inter,sans-serif',
                      border: `1px solid ${activeCategory === cat.key ? '#F27024' : 'rgba(242,112,36,.15)'}`,
                      background: activeCategory === cat.key ? 'rgba(242,112,36,.15)' : 'rgba(255,255,255,.04)',
                      color: activeCategory === cat.key ? '#FF9800' : 'rgba(255,255,255,.55)',
                      fontSize: '.74rem', fontWeight: 600, cursor: 'pointer',
                    }}>{cat.emoji} {cat.label}</button>
                  ))}
                </div>

                {/* Places List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredLandmarks.map(place => (
                    <div key={place.id} onClick={() => flyToPlace(place)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10, cursor: 'pointer',
                      background: selectedPlace?.id === place.id ? 'rgba(242,112,36,.12)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${selectedPlace?.id === place.id ? 'rgba(242,112,36,.45)' : 'rgba(255,255,255,.06)'}`,
                      transition: 'all .2s ease',
                    }}>
                      <div style={{ fontSize: '1.2rem', flexShrink: 0, width: 28, textAlign: 'center' }}>{place.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#fff', marginBottom: 2 }}>{place.name}</div>
                        <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.42)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{place.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} style={{ flex: 1, width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
        {!initCoords && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(11,7,4,0.95)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{ width: 48, height: 48, border: '4px solid rgba(242,112,36,0.15)', borderTopColor: '#F27024', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>Đang xác định vị trí của bạn...</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: 6, fontFamily: 'Inter,sans-serif' }}>Vui lòng đồng ý cấp quyền truy cập GPS nếu được hỏi</div>
          </div>
        )}
      </div>

      {/* Map Layer Switcher */}
      <div style={{
        position: 'absolute', top: 16, right: selectedPlace ? (windowWidth < 480 ? 16 : 400) : 16, zIndex: 1400,
        display: 'flex', flexDirection: 'column', gap: 4,
        background: 'rgba(11,7,4,0.92)', backdropFilter: 'blur(12px)',
        borderRadius: 14, padding: 6, border: '1px solid rgba(242,112,36,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'right 0.3s ease',
      }}>
        {[
          { key: 'streets', label: '🗺️', title: 'Bản đồ' },
          { key: 'satellite', label: '🛰️', title: 'Vệ tinh' },
          { key: 'terrain', label: '⛰️', title: 'Địa hình' },
          { key: 'dark', label: '🌙', title: 'Tối' },
        ].map(layer => (
          <button
            key={layer.key}
            onClick={() => switchMapLayer(layer.key)}
            title={layer.title}
            style={{
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: activeMapLayer === layer.key
                ? 'linear-gradient(135deg,#F27024,#FF5722)'
                 : 'rgba(255,255,255,0.06)',
              color: activeMapLayer === layer.key ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: '1.1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: activeMapLayer === layer.key ? '0 4px 12px rgba(242,112,36,0.3)' : 'none',
            }}
          >
            {layer.label}
          </button>
        ))}
      </div>

      <Link to="/planner" state={{ location: userLocation }} style={{
        position: 'absolute', bottom: 24, left: windowWidth < 480 ? 10 : 400, zIndex: 1400,
        padding: '14px 18px', borderRadius: 999, background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 800, textDecoration: 'none', boxShadow: '0 20px 45px rgba(242,112,36,0.28)',
        transition: 'left 0.3s ease',
      }}>
        💬 Chat với AI (Gợi Ý Món Ăn)
      </Link>

      {/* Right Drawer / ShopeeFood Order Panel */}
      <div style={S.rightPanel}>
        {selectedPlace && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

            {/* Header info */}
            <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(242,112,36,0.12)', position: 'relative' }}>
              <button onClick={() => { setSelectedPlace(null); setIsCheckoutMode(false); }} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(242,112,36,.1)', border: '1px solid rgba(242,112,36,.2)', color: '#F27024', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

              <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>{selectedPlace.emoji}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px', paddingRight: 32 }}>{selectedPlace.name}</h3>
              <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.5, margin: '0 0 10px' }}>{selectedPlace.description}</p>

              {selectedPlace.tips && (
                <div style={{ background: 'rgba(242,112,36,.08)', border: '1px solid rgba(242,112,36,.2)', borderRadius: 10, padding: '8px 12px', fontSize: '.76rem', color: '#FF9800', lineHeight: 1.5 }}>
                  💡 {selectedPlace.tips}
                </div>
              )}
            </div>

            {/* Content view depending on state */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 80px' }}>

              {/* VIEW 1: ACTIVE ORDER TRACKING (Live ShopeeFood Tracker) */}
              {activeOrder ? (
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(242,112,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', animation: 'pulseOrange 2s infinite' }}>
                      <span style={{ fontSize: '2rem' }}>🏍️</span>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Đơn Hàng HolaFood</h4>
                    <p style={{ fontSize: '.74rem', color: '#10B981', margin: 0 }}>Mã đơn: #{activeOrder._id.slice(-6).toUpperCase()}</p>
                  </div>

                  {/* Steps Progress bar */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
                    <h5 style={{ fontSize: '.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trạng thái giao hàng</h5>

                    {[
                      { key: 'pending', label: 'Chờ nhà hàng nhận đơn', desc: 'Nhà hàng đang kiểm tra món ăn...' },
                      { key: 'preparing', label: 'Đang chuẩn bị món', desc: 'Nhà hàng đang chế biến nóng hổi...' },
                      { key: 'delivering', label: 'Đang giao hàng', desc: 'Tài xế Hola đang mang đồ ăn đến KTX...' },
                      { key: 'completed', label: 'Đã giao hàng thành công', desc: 'Chúc bạn ngon miệng nhé! ❤️' }
                    ].map((step, idx) => {
                      const curIdx = getStatusStepIndex(activeOrder.status);
                      const isCompleted = idx < curIdx;
                      const isActive = idx === curIdx;

                      return (
                        <div key={step.key} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: idx === 3 ? 0 : 20 }}>

                          {/* Vertical Connector Line */}
                          {idx !== 3 && (
                            <div style={{
                              position: 'absolute', left: 10, top: 22, bottom: 0, width: 2,
                              background: isCompleted ? '#10B981' : 'rgba(255,255,255,0.1)',
                            }} />
                          )}

                          {/* Node Icon */}
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                            background: isCompleted ? '#10B981' : isActive ? '#F27024' : 'rgba(255,255,255,0.1)',
                            border: isActive ? '3px solid rgba(242,112,36,0.3)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isCompleted ? '#fff' : '#000', fontSize: '.6rem', fontWeight: 800
                          }}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          {/* Text description */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '.84rem', fontWeight: 700, color: isActive ? '#FF9800' : isCompleted ? '#10B981' : 'rgba(255,255,255,0.5)', transition: 'color 0.3s ease' }}>
                              {step.label} {isActive && '⚡'}
                            </div>
                            <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary order details */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, fontSize: '.78rem', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8, marginBottom: 8, fontSize: '.8rem' }}>Chi tiết giao hàng</div>
                    <div style={{ marginBottom: 6 }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Người nhận:</span> {activeOrder.customerName}</div>
                    <div style={{ marginBottom: 6 }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Số điện thoại:</span> {activeOrder.customerPhone}</div>
                    <div style={{ marginBottom: 12 }}><span style={{ color: 'rgba(255,255,255,0.45)' }}>Địa chỉ giao:</span> {activeOrder.deliveryAddress}</div>

                    <div style={{ fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8, marginBottom: 8, fontSize: '.8rem' }}>Đã chọn từ {activeOrder.vendorName}</div>
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{item.name} x{item.quantity}</span>
                        <span>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#FF9800', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '.85rem' }}>
                      <span>Tổng cộng:</span>
                      <span>{activeOrder.totalAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <button onClick={() => setActiveOrder(null)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, marginTop: 20, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                    Quay Lại Bản Đồ
                  </button>
                </div>

              ) : isCheckoutMode ? (

                // VIEW 2: CHECKOUT SCREEN (ShopeeFood Delivery Details Form)
                <div style={{ animation: 'slideUp 0.3s ease' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>🛒 Thông Tin Đơn Hàng</h4>

                  {/* Cart review */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
                    <div style={{ fontSize: '.76rem', color: '#FF9800', fontWeight: 700, marginBottom: 10 }}>Cửa hàng: {cart.vendorName}</div>
                    {cart.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                          <div style={{ fontSize: '.84rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{item.price.toLocaleString('vi-VN')}đ/món</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => updateCartQuantity(item.name, -1)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>-</button>
                          <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#fff', minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.name, 1)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#FF9800', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 10, fontSize: '.9rem' }}>
                      <span>Tổng tiền hàng:</span>
                      <span>{cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  {/* Delivery Inputs */}
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>🛵 Địa Chỉ Nhận Hàng</h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Họ tên người nhận *</label>
                      <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nhập họ tên sinh viên/cán bộ..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(242,112,36,0.2)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: '.84rem', outline: 'none' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Số điện thoại liên hệ *</label>
                      <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ví dụ: 0987654321..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(242,112,36,0.2)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: '.84rem', outline: 'none' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Vị trí nhận đồ (VD: Phòng 302 KTX Dom A) *</label>
                      <textarea rows={3} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Ghi rõ số phòng KTX, khu giảng đường để shipper dễ tìm..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(242,112,36,0.2)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: '.84rem', outline: 'none', resize: 'none', fontFamily: 'Inter,sans-serif' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button onClick={() => setIsCheckoutMode(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 700, cursor: 'pointer' }}>Quay lại</button>
                    <button onClick={handlePlaceOrder} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(242,112,36,0.3)' }}>Đặt Hàng Ngay</button>
                  </div>
                </div>

              ) : (

                // VIEW 3: STANDARD VENDOR INFO & SHOPEEFOOD MENU LIST
                <div>
                  {(selectedPlace.category === 'food' || selectedPlace.category === 'Cafe' || selectedPlace.category === 'cafe' || selectedPlace.category === 'Ăn uống' || selectedPlace.category === 'ăn uống' || selectedPlace.menu) && (
                    <div>
                      <h4 style={{ fontSize: '.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🍔 Thực Đơn (HolaFood)</h4>

                      {selectedPlace.menu && selectedPlace.menu.length > 0 ? (
                        <div>
                          {selectedPlace.menu.map((item, idx) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: 12, marginBottom: 8, transition: 'all 0.2s ease',
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: '#fff', fontSize: '.84rem' }}>{item.name}</div>
                                <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.48)', marginTop: 2 }}>{item.description}</div>
                                <div style={{ fontWeight: 800, color: '#FF9800', fontSize: '.83rem', marginTop: 4 }}>
                                  {item.price.toLocaleString('vi-VN')}đ
                                </div>
                              </div>
                              <button onClick={() => handleAddToCart(selectedPlace, item)} style={{
                                padding: '6px 12px', borderRadius: 8, border: 'none',
                                background: 'rgba(242,112,36,0.14)', color: '#FF9800', fontWeight: 700, fontSize: '.76rem',
                                cursor: 'pointer', transition: 'all 0.2s ease',
                              }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#F27024'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(242,112,36,0.14)'; e.currentTarget.style.color = '#FF9800'; }}>
                                + Thêm
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: '.8rem' }}>
                          Cửa hàng chưa cập nhật menu chi tiết.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reviews Section */}
                  {selectedPlace.reviews && selectedPlace.reviews.length > 0 && (
                    <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
                      <h4 style={{ fontSize: '.84rem', fontWeight: 800, color: '#FF9800', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        💬 Đánh Giá Minh Bạch ({selectedPlace.reviews.length})
                      </h4>
                      {selectedPlace.reviews.map((rev, revIdx) => (
                        <div key={revIdx} style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: 10, padding: '10px 12px', marginBottom: 8, fontSize: '.76rem', color: 'rgba(255,255,255,0.7)',
                          lineHeight: 1.5, textAlign: 'left',
                        }}>
                          {rev}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom floating cart bar for current food place */}
            {!activeOrder && !isCheckoutMode && cart.vendorId === selectedPlace.id && cart.items.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, width: '100%',
                background: 'rgba(18,12,8,0.95)', borderTop: '1px solid rgba(242,112,36,0.25)',
                padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 -4px 15px rgba(0,0,0,0.5)', zIndex: 12
              }}>
                <div>
                  <div style={{ fontSize: '.84rem', fontWeight: 700, color: '#fff' }}>
                    🛒 Giỏ hàng: {cart.items.reduce((sum, item) => sum + item.quantity, 0)} món
                  </div>
                  <div style={{ fontSize: '.78rem', color: '#FF9800', fontWeight: 800, marginTop: 2 }}>
                    {cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('vi-VN')}đ
                  </div>
                </div>

                <button onClick={() => setIsCheckoutMode(true)} style={{
                  padding: '10px 18px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff',
                  fontWeight: 800, fontSize: '.8rem', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(242,112,36,0.3)'
                }}>
                  Mua Hàng →
                </button>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};

export default MapExplore;
