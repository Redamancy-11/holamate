/**
 * HolaMate RAG Knowledge Base
 * Dữ liệu thực tế về FPT Hoà Lạc — địa điểm, giá cả, tips cho sinh viên
 */

const HANOI_VENDORS = [
  // === CAFE / ĐỒ UỐNG ===
  {
    id: 'highlands-hola',
    name: 'Highlands Coffee Hola',
    category: 'cafe',
    address: 'Campus Đại học FPT, Thạch Thất',
    district: 'fpt-campus',
    price: { min: 29000, max: 59000, unit: 'cup' },
    hours: '7:00-21:30',
    rating: 4.8,
    coords: [105.52620, 21.01420],
    tags: ['campus', 'breakfast', 'coffee'],
    tips: 'Vị trí đắc địa ngay trong trường, thích hợp hẹn bạn bè và họp nhóm nhanh.',
    menu: [
      { name: 'Phin Sữa Đá', price: 29000, description: 'Cà phê phin đậm đà kết hợp với sữa đặc béo ngậy.', image: '/images/streetfood.png' },
      { name: 'Trà Sen Vàng', price: 45000, description: 'Trà ô long thanh mát kết hợp hạt sen thơm bùi và kem sữa.', image: '/images/streetfood.png' },
      { name: 'Bạc Xỉu Đá', price: 29000, description: 'Hương vị béo ngậy từ sữa kết hợp cafe phin nhẹ nhàng.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'cafe-bao-cap',
    name: 'Cà Phê Bao Cấp',
    category: 'cafe',
    address: 'Thôn Tân Xã, Thạch Thất, Hà Nội',
    district: 'tan-xa',
    price: { min: 15000, max: 35000, unit: 'cup' },
    hours: '7:00-22:30',
    rating: 4.8,
    coords: [105.53120, 21.01920],
    tags: ['traditional', 'cheap', 'coffee', 'bao-cap'],
    tips: 'Quán cà phê mang phong cách thời kỳ bao cấp hoài cổ, không gian yên tĩnh và trà đào rất ngon.',
    menu: [
      { name: 'Cà Phê Đen Đá Bao Cấp', price: 15000, description: 'Cà phê đen phin truyền thống đậm đà.', image: '/images/streetfood.png' },
      { name: 'Cà Phê Sữa Đá Bao Cấp', price: 18000, description: 'Cà phê sữa đặc ngọt ngào thơm nồng.', image: '/images/streetfood.png' },
      { name: 'Cà Phê Cốt Dừa Đá Xay', price: 28000, description: 'Cà phê hòa quyện cùng cốt dừa đá xay béo ngậy.', image: '/images/streetfood.png' },
      { name: 'Cà Phê Trứng Bao Cấp', price: 30000, description: 'Lớp kem trứng thơm ngậy trên nền cà phê nóng hổi.', image: '/images/streetfood.png' },
      { name: 'Cà Phê Muối Hà Nội', price: 25000, description: 'Cà phê muối béo mặn độc đáo chuẩn vị phố cổ.', image: '/images/streetfood.png' },
      { name: 'Bạc Xỉu Đá Thạch Thất', price: 20000, description: 'Bạc xỉu ba tầng nhiều sữa thơm dịu.', image: '/images/streetfood.png' },
      { name: 'Trà Đào Sả Bao Cấp', price: 22000, description: 'Trà đào thanh mát với miếng đào giòn ngọt thơm lừng.', image: '/images/streetfood.png' },
      { name: 'Trà Sen Vàng Kem Cheese', price: 35000, description: 'Trà ô long thanh mát kết hợp hạt sen thơm bùi và lớp kem cheese béo ngậy.', image: '/images/streetfood.png' },
      { name: 'Trà Quất Mật Ong Nóng/Đá', price: 18000, description: 'Quất tươi thơm nồng kết hợp mật ong ngọt ngào.', image: '/images/streetfood.png' },
      { name: 'Trà Chanh Phố Cổ', price: 15000, description: 'Trà chanh truyền thống giải nhiệt cực đã.', image: '/images/streetfood.png' },
      { name: 'Bột Sắn Dây Hoa Bưởi', price: 18000, description: 'Đồ uống thanh mát của thời xưa thơm mùi hoa bưởi tự nhiên.', image: '/images/streetfood.png' },
      { name: 'Sinh Tố Bơ Sáp Đắc Lắc', price: 30000, description: 'Bơ sáp béo ngậy xay mịn cùng sữa đặc.', image: '/images/streetfood.png' },
      { name: 'Sinh Tố Xoài Cát Má Đùi', price: 25000, description: 'Xoài chín ngọt lịm xay đá mát lạnh.', image: '/images/streetfood.png' },
      { name: 'Nước Cam Vắt Tươi', price: 25000, description: 'Cam sành vắt nguyên chất bổ sung vitamin C.', image: '/images/streetfood.png' },
      { name: 'Nước Chanh Leo Đá', price: 20000, description: 'Chanh leo chua ngọt mát lạnh sảng khoái.', image: '/images/streetfood.png' },
      { name: 'Cacao Sữa Đá Hỏa Lò', price: 22000, description: 'Cacao đậm đà hòa quyện sữa đặc thơm ngọt.', image: '/images/streetfood.png' },
      { name: 'Trà Sữa Trân Châu Truyền Thống', price: 25000, description: 'Trà sữa đậm vị trà kèm trân châu đen dai giòn.', image: '/images/streetfood.png' },
      { name: 'Đĩa Hạt Hướng Dương Rang', price: 10000, description: 'Hạt hướng dương thơm giòn nhâm nhi buôn chuyện.', image: '/images/streetfood.png' },
      { name: 'Khô Bò Lá Chanh Đặc Biệt', price: 35000, description: 'Thịt bò khô xé sợi thơm nồng lá chanh cay cay.', image: '/images/streetfood.png' },
      { name: 'Nem Chua Rán Hà Nội (10 Cái)', price: 40000, description: 'Nem chua rán nóng hổi giòn rụm chấm tương ớt.', image: '/images/streetfood.png' },
      { name: 'Khoai Tây Chiên Bơ Tỏi', price: 25000, description: 'Khoai tây chiên vàng giòn thơm nồng vị bơ tỏi.', image: '/images/streetfood.png' },
      { name: 'Mì Tôm Chanh Bò Khô Trứng Ốp', price: 25000, description: 'Mì Kokomi chanh chua cay huyền thoại kèm trứng ốp và bò khô.', image: '/images/streetfood.png' },
      { name: 'Bánh Mì Hoa Cúc Phết Bơ', price: 15000, description: 'Bánh mì ngọt thơm bơ béo ngậy.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'bay-coffee',
    name: 'Bay Coffee & Tea',
    category: 'cafe',
    address: 'Hồ Tân Xã, Thạch Thất',
    district: 'tan-xa',
    price: { min: 20000, max: 35000, unit: 'cup' },
    hours: '7:30-22:30',
    rating: 4.9,
    coords: [105.52890, 21.01890],
    tags: ['lake-view', 'salt-coffee', 'chill'],
    tips: 'Quán có view hồ cực rộng, cà phê muối siêu béo ngậy. Giá vô cùng sinh viên.',
    menu: [
      { name: 'Cà Phê Muối', price: 25000, description: 'Cà phê phin béo ngậy kết hợp lớp kem muối mặn đặc biệt.', image: '/images/streetfood.png' },
      { name: 'Trà Đào Cam Sả', price: 30000, description: 'Trà đào ngọt ngào thơm nồng hương sả và cam tươi.', image: '/images/streetfood.png' },
      { name: 'Matcha Latte', price: 35000, description: 'Bột matcha Nhật Bản nguyên chất hòa quyện cùng sữa tươi.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'twitter-beans',
    name: 'Twitter Beans Coffee',
    category: 'cafe',
    address: 'Tòa nhà Viettel, Khu CNC Hoà Lạc',
    district: 'cnc-hoalac',
    price: { min: 35000, max: 65000, unit: 'cup' },
    hours: '8:00-21:00',
    rating: 4.6,
    coords: [105.52980, 21.01520],
    tags: ['premium', 'croissant', 'study'],
    tips: 'Không gian yên tĩnh lý tưởng để học bài tập trung cao độ, bánh sừng bò rất ngon.',
    menu: [
      { name: 'Americano Đá', price: 35000, description: 'Espresso đậm đà pha loãng với nước tinh khiết lạnh.', image: '/images/streetfood.png' },
      { name: 'Bánh Croissant Bơ Pháp', price: 28000, description: 'Bánh sừng bò thơm ngậy mùi bơ, giòn xốp.', image: '/images/streetfood.png' },
      { name: 'Caramel Macchiato', price: 55000, description: 'Sữa tươi kem béo ngọt ngào hương caramel kết hợp Espresso.', image: '/images/streetfood.png' }
    ]
  },

  // === ẨM THỰC / ĂN UỐNG ===
  {
    id: '1988-bbq',
    name: '1988 BBQ Tân Xã',
    category: 'food',
    address: 'Thôn Tân Xã, Thạch Thất',
    district: 'tan-xa',
    price: { min: 129000, max: 159000, unit: 'person' },
    hours: '10:30-22:30',
    rating: 4.7,
    coords: [105.53050, 21.02050],
    tags: ['buffet', 'barbecue', 'hotpot'],
    tips: 'Quán buffet nướng lẩu rẻ nhất cho nhóm sinh viên đi liên hoan, nên đặt bàn trước.',
    menu: [
      { name: 'Suất Buffet Nướng Lẩu Sinh Viên', price: 129000, description: 'Thả ga ba chỉ bò Mỹ, thịt dải heo nướng, gà sốt, hải sản và lẩu thái chua cay.', image: '/images/streetfood.png' },
      { name: 'Combo Ba Chỉ Bò Nhúng Lẩu', price: 89000, description: 'Khay bò lớn kèm rau nấm tươi ngon cho nhóm nhỏ.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'bun-dau-hola',
    name: 'Bún Đậu Mắm Tôm Hola',
    category: 'food',
    address: 'Khu dịch vụ Tân Xã, Thạch Thất',
    district: 'tan-xa',
    price: { min: 30000, max: 45000, unit: 'plate' },
    hours: '10:00-14:00, 17:00-20:00',
    rating: 4.5,
    coords: [105.52800, 21.01750],
    tags: ['lunch', 'noodle', 'cheap'],
    tips: 'Suất bún đậu đầy đủ dồi sụn chiên và thịt chân giò siêu nhiều.',
    menu: [
      { name: 'Mẹt Bún Đậu Đầy Đủ', price: 35000, description: 'Bún lá tươi, đậu hũ chiên giòn, dồi sụn chưng, thịt chân giò luộc và chả cốm.', image: '/images/streetfood.png' },
      { name: 'Mẹt Bún Đậu Thường', price: 25000, description: 'Bún lá và đậu hũ chiên giòn kèm rau thơm.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'com-tam-ktx',
    name: 'Cơm Tấm KTX FPT',
    category: 'food',
    address: 'Dom A KTX FPT Hoà Lạc',
    district: 'fpt-campus',
    price: { min: 25000, max: 35000, unit: 'plate' },
    hours: '10:30-19:30',
    rating: 4.2,
    coords: [105.52450, 21.01320],
    tags: ['quick', 'dorm', 'cheap'],
    tips: 'Nhanh gọn lẹ khi lười đi xa, cơm sườn trứng chiên ngon mắt.',
    menu: [
      { name: 'Cơm Tấm Sườn Nướng Trứng', price: 30000, description: 'Sườn nướng mật ong thơm phức kết hợp trứng ốp la lòng đào.', image: '/images/streetfood.png' },
      { name: 'Cơm Tấm Đùi Gà Sốt Mắm', price: 35000, description: 'Đùi gà chiên mắm đậm đà béo ngậy.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'ga-ri-phu-binh',
    name: 'Gà Ri Phú Bình',
    category: 'food',
    address: 'Yên Bình, Thạch Thất',
    district: 'quoc-lo-21',
    price: { min: 150000, max: 250000, unit: 'portion' },
    hours: '9:00-22:00',
    rating: 4.8,
    coords: [105.51850, 21.00900],
    tags: ['chicken', 'specialty', 'group'],
    tips: 'Đặc sản gà ri đắp đất nướng cực kỳ thơm ngon, thịt gà dai ngọt lịm.',
    menu: [
      { name: 'Mẹt Gà Ri Đắp Đất Nướng', price: 220000, description: 'Gà ri nguyên con bọc đất nướng thơm lừng thịt gà ngọt lịm.', image: '/images/streetfood.png' },
      { name: 'Gà Ri Hấp Lá Chanh (Nửa Con)', price: 110000, description: 'Thịt gà hấp mềm thơm mùi lá chanh tươi.', image: '/images/streetfood.png' }
    ]
  },
  {
    id: 'lau-cua-hoalac',
    name: 'Lẩu Cua Đồng Hoà Lạc',
    category: 'food',
    address: 'Quốc lộ 21, Thạch Thất',
    district: 'quoc-lo-21',
    price: { min: 150000, max: 300000, unit: 'pot' },
    hours: '10:00-22:00',
    rating: 4.7,
    coords: [105.52200, 21.02400],
    tags: ['hotpot', 'traditional', 'dinner'],
    tips: 'Nồi lẩu cua ngập tràn riêu cua, bắp bò tươi nhúng kèm bánh đa đỏ cực ngon.',
    menu: [
      { name: 'Nồi Lẩu Cua Đồng Đặc Biệt (Size S)', price: 180000, description: 'Nồi lẩu đầy ắp riêu cua, bắp bò tươi, sườn sụn và đậu hũ nhúng kèm.', image: '/images/streetfood.png' },
      { name: 'Nồi Lẩu Cua Đồng Đặc Biệt (Size L)', price: 280000, description: 'Dành cho nhóm 4-5 người, thêm ngập riêu cua và sườn sụn.', image: '/images/streetfood.png' }
    ]
  },

  // === LANDMARKS / KHÁM PHÁ ===
  { id: 'alpha-building', name: 'Tòa nhà Alpha (FPT)', category: 'attraction', address: 'Km29 Đại lộ Thăng Long, Thạch Thất', district: 'fpt-campus', price: { min: 0, max: 0, unit: 'free' }, hours: '7:30-17:30', rating: 4.9, coords: [105.52522, 21.01354], tags: ['campus', 'landmark', 'free'], tips: 'Tòa nhà hành chính nổi bật có kiến trúc xanh đạt giải quốc tế. Góc check-in không thể bỏ lỡ.' },
  { id: 'beta-library', name: 'Thư viện Beta (FPT)', category: 'attraction', address: 'Khu giảng đường Beta, Thạch Thất', district: 'fpt-campus', price: { min: 0, max: 0, unit: 'free' }, hours: '8:00-21:00', rating: 4.8, coords: [105.52735, 21.01312], tags: ['study', 'free', 'indoor'], tips: 'Không gian yên tĩnh mát mẻ để tự học, máy lạnh mở suốt ngày.' },
  { id: 'ho-sen-bridge', name: 'Hồ Sen & Cầu Tình Yêu', category: 'attraction', address: 'Campus FPT Hoà Lạc', district: 'fpt-campus', price: { min: 0, max: 0, unit: 'free' }, hours: '24/7', rating: 4.7, coords: [105.52680, 21.01380], tags: ['lake', 'nature', 'free', 'sunset'], tips: 'Góc thư giãn lãng mạn ngắm hoàng hôn tuyệt vời ngay sau giờ học.' },
  { id: 'pine-hill', name: 'Đồi Thông Hola', category: 'attraction', address: 'Mép hồ sen campus FPT', district: 'fpt-campus', price: { min: 0, max: 0, unit: 'free' }, hours: '24/7', rating: 4.6, coords: [105.52350, 21.01250], tags: ['nature', 'photo', 'free'], tips: 'Thích hợp chụp ảnh kỷ yếu phong cách Đà Lạt mộng mơ.' },
  { id: 'tan-xa-lake', name: 'Hồ Tân Xã', category: 'attraction', address: 'Khu CNC Hoà Lạc, Thạch Thất', district: 'tan-xa', price: { min: 0, max: 0, unit: 'free' }, hours: '24/7', rating: 4.8, coords: [105.53420, 21.02100], tags: ['lake', 'running', 'sunset', 'free'], tips: 'Nơi chạy bộ buổi chiều mát mẻ nhất, chiều dài vòng hồ khoảng 4-5km cực đẹp.' }
];

const HANOI_DISTRICTS = {
  'fpt-campus': { name: 'Campus FPT', description: 'Khu vực học tập, thư viện, đồi thông học thuật và các toà KTX.', highlights: ['Tòa nhà Alpha', 'Thư viện Beta', 'Đồi thông Hola'] },
  'tan-xa': { name: 'Khu vực Tân Xã', description: 'Thiên đường ẩm thực giá rẻ nằm sát mép hồ sen đại học FPT.', highlights: ['Hồ Tân Xã', 'Bay Coffee', '1988 BBQ'] },
  'cnc-hoalac': { name: 'Khu Công Nghệ Cao', description: 'Tổ hợp công nghệ phần mềm của F-Soft, Viettel và VNPT.', highlights: ['Twitter Beans Viettel'] },
  'quoc-lo-21': { name: 'Dọc Quốc lộ 21', description: 'Trục đường chính kết nối với các quán gà ri và lẩu cua đồng trứ danh.', highlights: ['Lẩu Cua Đồng', 'Gà Ri Phú Bình'] }
};

const TRAVEL_TIPS = [
  { category: 'transport', tip: 'Hãy tận dụng xe bus số 107 (từ Kim Mã) hoặc xe 74 (từ Mỹ Đình) để di chuyển thẳng tới cổng FPT Hoà Lạc cực rẻ (chỉ 9.000đ/lượt).' },
  { category: 'food', tip: 'Khu vực Tân Xã bán đồ ăn rất rẻ, suất cơm sinh viên dao động 25k-40k. Nên check giá HolaMate trước khi gọi món.' },
  { category: 'study', tip: 'Cần tự học nhóm tập trung nên chọn Thư viện Beta tầng 1, hoặc qua Highlands Hola trong những giờ vắng.' },
  { category: 'sports', tip: 'Hồ Tân Xã là địa điểm lý tưởng nhất để chạy bộ buổi chiều. Nên đi theo nhóm 2-3 người cho vui và an toàn.' },
  { category: 'weather', tip: 'Hoà Lạc thường lạnh hơn trong nội thành Hà Nội khoảng 2-3 độ vào mùa đông, và nắng gắt hơn vào mùa hè. Luôn mang theo áo ấm dự phòng.' }
];

const ITINERARY_TEMPLATES = {
  '1h': { name: '1 giờ', spots: 2, types: ['cafe', 'attraction'] },
  '2h': { name: '2 giờ', spots: 3, types: ['food', 'attraction', 'cafe'] },
  '3h': { name: '3 giờ', spots: 4, types: ['food', 'attraction', 'cafe', 'explore'] },
  '4h': { name: 'Nửa ngày', spots: 5, types: ['food', 'attraction', 'cafe', 'explore', 'explore'] },
  'fullday': { name: 'Cả ngày', spots: 7, types: ['food', 'attraction', 'cafe', 'attraction', 'food', 'explore', 'cafe'] },
};

module.exports = { HANOI_VENDORS, HANOI_DISTRICTS, TRAVEL_TIPS, ITINERARY_TEMPLATES };
