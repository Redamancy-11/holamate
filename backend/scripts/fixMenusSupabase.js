const fs = require('fs');
const path = require('path');
const { pool } = require('../config/pg');

// Defined specific menus
const CATEGORY_MENUS = {
  bun_bo_hue: [
    { name: 'Bún Bò Huế Đặc Biệt', price: 45000, description: 'Bún bò Huế đầy đủ gồm giò heo, tiết, chả cua, thịt nạm.' },
    { name: 'Bún Bò Huế Chả Cua', price: 35000, description: 'Bún bò Huế với chả cua thơm bùi và thịt bò nạm.' },
    { name: 'Bún Bò Huế Sườn Sụn', price: 40000, description: 'Bún bò Huế sườn non dai giòn, nước dùng cay nồng.' },
    { name: 'Bún Bò Huế Móng Giò', price: 40000, description: 'Bún bò Huế móng heo hầm nhừ béo ngậy.' },
    { name: 'Chả cua gọi thêm', price: 8000, description: 'Một viên chả cua Huế đặc trưng.' },
    { name: 'Móng giò gọi thêm', price: 12000, description: 'Một móng heo hầm nhừ gọi thêm.' },
    { name: 'Quẩy giòn ăn kèm', price: 3000, description: 'Một chiếc quẩy giòn nhúng nước dùng.' },
    { name: 'Nước quất đá mát lạnh', price: 15000, description: 'Nước quất vắt mát lạnh ngọt thanh.' },
    { name: 'Trà đá truyền thống', price: 3000, description: 'Trà đá giải khát bình dân.' }
  ],
  pho: [
    { name: 'Phở Bò Tái Lăn Cổ Truyền', price: 45000, description: 'Bánh phở tươi, thịt bò xào lăn tỏi thơm phức.' },
    { name: 'Phở Bò Tái Chín', price: 40000, description: 'Thịt bò tái chín ngọt thịt, nước dùng hầm xương trong vắt.' },
    { name: 'Phở Bò Gầu Nạm', price: 42000, description: 'Thịt nạm và gầu bò giòn ngậy hấp dẫn.' },
    { name: 'Phở Gà Ta Xé Phay', price: 35000, description: 'Thịt gà ta da giòn dai, lá chanh xắt nhỏ.' },
    { name: 'Phở Gà Đùi Cánh Đặc Biệt', price: 45000, description: 'Thịt đùi và cánh gà ta chắc ngọt.' },
    { name: 'Trứng chần lòng đào (1 quả)', price: 7000, description: 'Trứng chần hành trần lòng đào béo ngậy.' },
    { name: 'Đĩa quẩy giòn (3 chiếc)', price: 10000, description: 'Quẩy giòn ăn kèm phở bún.' },
    { name: 'Nước nhân trần đá', price: 5000, description: 'Nước nhân trần thanh nhiệt.' },
    { name: 'Trà đá Thái Nguyên', price: 3000, description: 'Trà đá mát lạnh.' }
  ],
  bun_dau: [
    { name: 'Mẹt Bún Đậu Đầy Đủ Mẹ Ngô', price: 50000, description: 'Đậu rán giòn, thịt chân giò luộc, chả cốm, nem rán, bún lá và mắm tôm pha.' },
    { name: 'Mẹt Bún Đậu Chả Cốm', price: 40000, description: 'Bún đậu rán giòn ăn kèm chả cốm Hà Nội.' },
    { name: 'Mẹt Bún Đậu Thịt Luộc', price: 40000, description: 'Bún đậu với thịt chân giò luộc thái mỏng.' },
    { name: 'Đĩa nem chua rán giòn (5 chiếc)', price: 35000, description: 'Nem chua bọc bột chiên giòn chấm tương ớt.' },
    { name: 'Chả cốm rán gọi thêm', price: 15000, description: 'Một phần chả cốm rán nóng hổi.' },
    { name: 'Thịt chân giò luộc gọi thêm', price: 20000, description: 'Một đĩa thịt chân giò luộc thêm.' },
    { name: 'Trà tắc khổng lồ', price: 15000, description: 'Trà tắc chua ngọt thơm mát.' },
    { name: 'Sữa chua nếp cẩm', price: 20000, description: 'Sữa chua mát lạnh nếp cẩm dẻo bùi.' }
  ],
  bun_cha: [
    { name: 'Bún Chả Hà Nội (Suất đặc biệt)', price: 45000, description: 'Chả băm và chả miếng nướng than hoa, bún tươi, nước mắm pha nóng hổi.' },
    { name: 'Bún Chả Hà Nội (Suất thường)', price: 35000, description: 'Chả nướng than hoa truyền thống kèm rau sống.' },
    { name: 'Nem cua bể Hải Phòng (1 chiếc)', price: 15000, description: 'Nem cua bể chiên giòn rụm nhân cua biển ú nu.' },
    { name: 'Thịt chả nướng gọi thêm', price: 20000, description: 'Thêm chả băm hoặc chả miếng nướng.' },
    { name: 'Bún tươi gọi thêm', price: 5000, description: 'Một đĩa bún tươi thêm.' },
    { name: 'Nước quất mật ong', price: 15000, description: 'Quất tươi pha mật ong ngọt thanh mát lạnh.' },
    { name: 'Trà đá Thái Nguyên', price: 3000, description: 'Trà đá mát giải khát.' }
  ],
  mi_cay: [
    { name: 'Mì Cay Hải Sản Seoul (Cấp 0-7)', price: 49000, description: 'Mì cay tôm, mực, chả cá, nấm kim châm chua cay đậm đà.' },
    { name: 'Mì Cay Bò Mỹ Seoul (Cấp 0-7)', price: 45000, description: 'Mì cay thịt ba chỉ bò Mỹ cuộn nấm.' },
    { name: 'Mì Cay Đùi Gà Seoul (Cấp 0-7)', price: 45000, description: 'Mì cay với thịt đùi gà chiên xé.' },
    { name: 'Mì Cay Thập Cẩm Seoul (Cấp 0-7)', price: 49000, description: 'Mì cay đầy đủ xúc xích, bò, hải sản và rau nấm.' },
    { name: 'Kimbap chiên giòn', price: 30000, description: 'Cơm cuộn Hàn Quốc chiên giòn kèm sốt.' },
    { name: 'Trà sữa Thái xanh trân châu', price: 25000, description: 'Trà sữa Thái xanh thơm mát kèm trân châu.' },
    { name: 'Trà đào thạch đào', price: 20000, description: 'Trà đào thơm ngọt mát giải cay.' }
  ],
  bun_ca: [
    { name: 'Bún Cá Cay Hải Phòng', price: 40000, description: 'Cá rô phi chiên giòn tan, chả cá thu dai bùi và nước dùng cay chua.' },
    { name: 'Bún Cá Rô Đồng Chiên Giòn', price: 35000, description: 'Bún cá rô đồng chiên giòn ruột ngọt lịm.' },
    { name: 'Bún Lòng Cá Giòn Sần Sật', price: 45000, description: 'Bún lòng cá rô đồng xào giòn đậm đà.' },
    { name: 'Bún Hải Sản Thập Cẩm', price: 45000, description: 'Bún hải sản mực tôm chả cá thu ngọt nước.' },
    { name: 'Trà đá giải nhiệt', price: 3000, description: 'Trà đá Hà Nội quen thuộc.' }
  ],
  com_tam: [
    { name: 'Cơm Tấm Sườn Bì Chả Đặc Biệt', price: 45000, description: 'Cơm tấm sườn cốt lết nướng mật ong, bì thính, chả trứng chưng.' },
    { name: 'Cơm Tấm Sườn Nướng Mật Ong', price: 40000, description: 'Cơm tấm kèm sườn cốt lết nướng thơm phức.' },
    { name: 'Cơm Tấm Đùi Gà Nướng Lu', price: 50000, description: 'Cơm tấm kèm đùi gà góc tư nướng vàng giòn.' },
    { name: 'Cơm Tấm Ba Chỉ Heo Quay Giòn Da', price: 45000, description: 'Cơm tấm kèm heo quay giòn da chấm xì dầu.' },
    { name: 'Sườn nướng gọi thêm', price: 22000, description: 'Sườn cốt lết nướng thơm ngon.' },
    { name: 'Trứng ốp la thêm', price: 5000, description: 'Trứng gà chiên lòng đào lòng đỏ dẻo.' },
    { name: 'Canh chua dứa bát thêm', price: 8000, description: 'Canh chua mát đưa cơm giải ngấy.' },
    { name: 'Nước sâm dứa hạt chia', price: 15000, description: 'Nước sâm mát lạnh hạt chia bùi bùi.' }
  ],
  com_rang_binh_dan: [
    { name: 'Cơm Rang Dưa Bò Hạt Giòn', price: 45000, description: 'Cơm chiên hạt tơi giòn xào thịt bò dưa chua.' },
    { name: 'Cơm Rang Thập Cẩm Lạp Sườn Giò', price: 35000, description: 'Cơm chiên thập cẩm nhiều màu sắc thơm ngon.' },
    { name: 'Cơm Gà Xối Mỡ Giòn Rụm', price: 40000, description: 'Cơm chiên ăn kèm đùi gà chiên giòn tan nóng hổi.' },
    { name: 'Cơm Sườn Sụn Rim Chua Ngọt', price: 45000, description: 'Sườn sụn giòn sần sật rim sốt chua ngọt.' },
    { name: 'Cơm Bò Xào Sả Ớt Cay Nồng', price: 40000, description: 'Thịt bò xào sả ớt đậm đà đưa cơm.' },
    { name: 'Cơm Thịt Kho Tàu Trứng Cút', price: 35000, description: 'Cơm thịt kho nhừ kèm trứng cút kho đậm vị.' },
    { name: 'Canh cải xanh bát thêm', price: 8000, description: 'Canh cải thanh mát đưa cơm.' },
    { name: 'Coca-Cola lon lạnh', price: 15000, description: 'Nước ngọt giải khát có ga.' },
    { name: 'Trà đá giải nhiệt', price: 3000, description: 'Trà đá bình dân.' }
  ],
  bbq_hotpot: [
    { name: 'Buffet Nướng Lẩu Sinh Viên (Set Basic)', price: 139000, description: 'Thả ga ba chỉ bò Mỹ, thịt dải heo, nầm heo sốt BBQ, lòng gà và lẩu Thái.' },
    { name: 'Buffet Nướng Lẩu Premium (Set Hải Sản)', price: 189000, description: 'Thêm tôm sú, mực trứng sa tế, bạch tuộc sốt cay và sườn sụn non.' },
    { name: 'Set Lẩu Thái chua cay (2 người ăn)', price: 199000, description: 'Nồi lẩu Thái chua cay kèm bò cuộn nấm và rau nấm xanh mát.' },
    { name: 'Set Lẩu Riêu cua sườn sụn (3 người ăn)', price: 299000, description: 'Lẩu riêu cua tươi béo ngậy ngọt nước, sườn sụn giòn ngon.' },
    { name: 'Ba chỉ bò Mỹ cuộn nấm (Đĩa thêm)', price: 59000, description: 'Ba chỉ bò cuộn nấm kim châm tươi ngọt.' },
    { name: 'Đĩa khoai tây chiên lắc phô mai', price: 35000, description: 'Khoai tây chiên giòn rụm bột phô mai béo mặn ngọt.' },
    { name: 'Đĩa ngô chiên bơ ngậy', price: 30000, description: 'Hạt ngô chiên giòn béo ngậy.' },
    { name: 'Bia hơi Hà Nội (Ca 1 lít)', price: 25000, description: 'Bia hơi mát lạnh giải nhiệt tụ tập.' },
    { name: 'Coca-Cola lon lạnh', price: 15000, description: 'Nước ngọt giải khát có ga.' }
  ],
  chicken: [
    { name: 'Gà Rán Giòn Cay (2 Miếng)', price: 45000, description: 'Gà rán tẩm gia vị giòn vàng cay thơm.' },
    { name: 'Gà Rán Sốt Cay Hàn Quốc (3 Miếng)', price: 59000, description: 'Gà rán phủ sốt cay ngọt Hàn Quốc rắc vừng.' },
    { name: 'Combo Gà Rán + Khoai Tây + Pepsi', price: 55000, description: 'Combo tiết kiệm cơm gà rán kèm nước.' },
    { name: 'Burger Bò Phô Mai Cổ Điển', price: 35000, description: 'Bánh mì kẹp thịt bò nướng và lát phô mai béo.' },
    { name: 'Cánh gà chiên mắm đường', price: 42000, description: 'Cánh gà chiên giòn rim mắm tỏi thơm lừng.' },
    { name: 'Khoai tây chiên bơ tỏi', price: 20000, description: 'Khoai tây chiên thơm ngậy tỏi.' },
    { name: 'Nước ngọt Pepsi lon', price: 15000, description: 'Giải nhiệt ga mát lạnh.' }
  ],
  cafe_tea_drinks: [
    { name: 'Cà Phê Phin Đen Đá', price: 20000, description: 'Cà phê đen pha phin truyền thống đậm vị hạt Robusta.' },
    { name: 'Cà Phê Phin Sữa Đá', price: 25000, description: 'Cà phê phin sữa đặc thơm ngon béo ngậy.' },
    { name: 'Bạc Xỉu Đá Hola', price: 29000, description: 'Sữa tươi, sữa đặc và một chút cà phê phin nhẹ thơm.' },
    { name: 'Cà Phê Muối Kem Béo', price: 25000, description: 'Cà phê phin kết hợp lớp kem muối mặn ngọt béo ngậy.' },
    { name: 'Cà Phê Cốt Dừa Đá Xay', price: 35000, description: 'Nước cốt dừa thơm béo đá xay quyện espresso.' },
    { name: 'Trà Đào Cam Sả Hola', price: 35000, description: 'Trà đào thanh mát hương sả tươi và cam vàng.' },
    { name: 'Trà Sen Vàng Kem Sữa', price: 45000, description: 'Trà ô long thanh nhẹ kèm hạt sen bùi dẻo.' },
    { name: 'Trà Sữa Trân Châu Hoàng Kim', price: 35000, description: 'Trà sữa ngọt béo thơm trà kèm trân châu giòn dai.' },
    { name: 'Trà Sữa Matcha Trân Châu', price: 40000, description: 'Trà sữa vị matcha Nhật Bản trân châu đen.' },
    { name: 'Sữa Tươi Trân Châu Đường Đen', price: 35000, description: 'Sữa tươi thanh trùng cùng trân châu sốt đường đen đậm đà.' },
    { name: 'Nước cam vắt nguyên chất', price: 30000, description: 'Cam tươi vắt giàu vitamin C giải nhiệt.' },
    { name: 'Bánh Croissant Bơ Pháp', price: 28000, description: 'Bánh sừng bò nướng bơ giòn xốp thơm lừng.' },
    { name: 'Bánh bông lan trứng muối chảy', price: 35000, description: 'Bánh ngọt kèm sốt dầu trứng muối béo ngậy chà bông.' },
    { name: 'Hạt hướng dương rang thảo mộc', price: 15000, description: 'Hạt hướng dương cắn nhâm nhi tán gẫu.' }
  ],
  snacks_street_food: [
    { name: 'Nem chua rán giòn (Đĩa 5 chiếc)', price: 30000, description: 'Nem chua chiên giòn chấm tương ớt cay cay.' },
    { name: 'Xúc xích nướng than hoa (1 chiếc)', price: 15000, description: 'Xúc xích nướng than thơm ngon nức mũi.' },
    { name: 'Tokbokki phô mai cay ngọt', price: 35000, description: 'Bánh gạo Hàn Quốc dẻo cay kèm phô mai sợi.' },
    { name: 'Bánh tráng trộn bò khô', price: 20000, description: 'Bánh tráng trộn xoài chua, khô bò, trứng cút.' },
    { name: 'Khoai tây lốc xoáy phô mai', price: 25000, description: 'Khoai tây giòn xoắn ốc phết bột phô mai.' },
    { name: 'Trứng cút chiên bơ tỏi', price: 20000, description: 'Trứng cút rán giòn béo thơm hương bơ tỏi.' },
    { name: 'Chân gà sả ớt rút xương', price: 35000, description: 'Chân gà rút xương ngâm sả ớt chua ngọt.' },
    { name: 'Mẹt xiên que thập cẩm (5 xiên)', price: 30000, description: 'Thịt xiên, bò viên chiên nướng mỡ hành.' },
    { name: 'Trà chanh đá khổng lồ', price: 15000, description: 'Trà chanh thanh mát giải nhiệt sinh viên.' }
  ]
};

// Non-food categories that should have empty menus
const NON_FOOD_CATEGORIES = [
  'Supermarket', 'Variety store', 'Grocery store', 'Convenience store',
  'Home goods store', 'Store', 'Real estate developer', 'Bus stop',
  'Car wash', 'Hostel', 'Senior high school', 'attraction', 'Gas station',
  'Spa', 'Gym', 'Hair salon', 'Clothing store', 'Electronics store'
];

// Smart classifier based on name and category
const classifyVendor = (name, category) => {
  const n = (name || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // If non-food, return null (empty menu)
  if (NON_FOOD_CATEGORIES.includes(category)) {
    return [];
  }

  const selectedCategories = [];

  // Check name and category for matching keywords
  if (n.includes('bún bò') || n.includes('bun bo')) {
    selectedCategories.push('bun_bo_hue');
  }
  if (n.includes('bún đậu') || n.includes('bun dau')) {
    selectedCategories.push('bun_dau');
  }
  if (n.includes('bún chả') || n.includes('bun cha')) {
    selectedCategories.push('bun_cha');
  }
  if (n.includes('bún cá') || n.includes('bun ca')) {
    selectedCategories.push('bun_ca');
  }
  if (n.includes('phở') || n.includes('pho') || n.includes('gia truyền')) {
    // Avoid mapping phở if already matched with bún bò or bún cá unless it has both
    if (!selectedCategories.includes('bun_bo_hue') && !selectedCategories.includes('bun_ca')) {
      selectedCategories.push('pho');
    }
  }
  if (n.includes('mì cay') || n.includes('mỳ cay') || n.includes('mi cay')) {
    selectedCategories.push('mi_cay');
  }
  if (n.includes('cơm tấm') || n.includes('com tam')) {
    selectedCategories.push('com_tam');
  }
  if (n.includes('cơm rang') || n.includes('com rang')) {
    selectedCategories.push('com_rang_binh_dan');
  }
  if (n.includes('cơm') || n.includes('com') || n.includes('quán cơm') || n.includes('bình dân') || cat.includes('cơm') || cat.includes('rice')) {
    if (!selectedCategories.includes('com_tam') && !selectedCategories.includes('com_rang_binh_dan')) {
      selectedCategories.push('com_rang_binh_dan');
    }
  }
  if (n.includes('lẩu') || n.includes('nướng') || n.includes('bbq') || n.includes('lau') || n.includes('nuong') || cat.includes('lẩu') || cat.includes('nướng') || cat.includes('bbq')) {
    selectedCategories.push('bbq_hotpot');
  }
  if (n.includes('gà rán') || n.includes('fried chicken') || n.includes('burger') || n.includes('kfc') || n.includes('lotteria') || cat.includes('fried chicken') || cat.includes('chicken')) {
    selectedCategories.push('chicken');
  }
  if (n.includes('cà phê') || n.includes('cafe') || n.includes('coffee') || n.includes('trà sữa') || n.includes('tea') || n.includes('sinh tố') || n.includes('juice') || n.includes('chè') || n.includes('che') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea') || cat.includes('drink') || cat.includes('cendol')) {
    selectedCategories.push('cafe_tea_drinks');
  }
  if (n.includes('ăn vặt') || n.includes('an vat') || n.includes('xiên bẩn') || n.includes('nem chua') || n.includes('tokbokki') || cat.includes('snack') || cat.includes('bistro')) {
    selectedCategories.push('snacks_street_food');
  }

  // If no category matched but it's an food/drink vendor, do a generic fallback based on name or category
  if (selectedCategories.length === 0) {
    if (cat.includes('noodle') || n.includes('bún') || n.includes('phở') || n.includes('mì')) {
      selectedCategories.push('pho'); // Default to pho/noodle
    } else if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) {
      selectedCategories.push('cafe_tea_drinks');
    } else if (cat.includes('rice') || n.includes('cơm')) {
      selectedCategories.push('com_rang_binh_dan');
    } else {
      // Default fallback is a balanced combination of rice + noodle or snack
      selectedCategories.push('com_rang_binh_dan');
    }
  }

  // Merge the menus of selected categories (e.g. Bún Bò Huế - Cơm Rang Đức Duy get items from both)
  let mergedMenu = [];
  selectedCategories.forEach(catKey => {
    const catMenu = CATEGORY_MENUS[catKey] || [];
    catMenu.forEach(item => {
      // Avoid duplicates
      if (!mergedMenu.some(m => m.name.toLowerCase() === item.name.toLowerCase())) {
        mergedMenu.push(item);
      }
    });
  });

  // Limit menu size to max 15-20 items for cleanliness
  return mergedMenu.slice(0, 18);
};

const run = async () => {
  console.log('🔌 Connecting to Postgres/Supabase...');
  const client = await pool.connect();
  
  try {
    // 1. Fetch all vendors in DB
    const res = await client.query('SELECT id, name, category, menu FROM vendors');
    const vendors = res.rows;
    console.log(`Fetched ${vendors.length} vendors from Supabase.`);

    let updateCount = 0;
    for (const v of vendors) {
      const correctMenu = classifyVendor(v.name, v.category);
      
      // Update DB record
      await client.query('UPDATE vendors SET menu = $1, updated_at = now() WHERE id = $2', [
        JSON.stringify(correctMenu),
        v.id
      ]);
      
      console.log(`✨ Updated database: "${v.name}" [${v.category}] -> assigned ${correctMenu.length} menu items.`);
      updateCount++;
    }
    console.log(`\nSuccessfully updated ${updateCount} vendor records in Supabase!`);

    // 2. Also synchronize with backend/data/local_vendors_override.json to keep offline files clean
    const overridePath = path.resolve(__dirname, '../data/local_vendors_override.json');
    if (fs.existsSync(overridePath)) {
      console.log(`\nSyncing with local json file: ${overridePath}...`);
      const localData = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
      let localUpdateCount = 0;
      localData.forEach(vendor => {
        const correctMenu = classifyVendor(vendor.name, vendor.category);
        vendor.menu = correctMenu;
        localUpdateCount++;
      });
      fs.writeFileSync(overridePath, JSON.stringify(localData, null, 2), 'utf8');
      console.log(`Successfully synced ${localUpdateCount} vendors in local_vendors_override.json!`);
    }

    // 3. Also synchronize with backend/data_import/vendors_template.csv
    const csvPath = path.resolve(__dirname, '../data_import/vendors_template.csv');
    if (fs.existsSync(csvPath)) {
      console.log(`\nSyncing with CSV template: ${csvPath}...`);
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      
      // Simple parse of lines
      const lines = csvContent.split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',');
        const nameIdx = headers.indexOf('name');
        const catIdx = headers.indexOf('category');
        const menuIdx = headers.indexOf('menu');

        if (nameIdx !== -1 && catIdx !== -1 && menuIdx !== -1) {
          const updatedLines = [lines[0]];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // To handle quotes in CSV, let's do a simple split that respects quotes or fallback
            // Since it's a synchronization, we can reconstruct the line
            // Let's parse columns robustly
            let fields = [];
            let field = '';
            let inQuotes = false;
            for (let cIdx = 0; cIdx < line.length; cIdx++) {
              const char = line[cIdx];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                fields.push(field);
                field = '';
              } else {
                field += char;
              }
            }
            fields.push(field);

            if (fields.length >= Math.max(nameIdx, catIdx, menuIdx)) {
              const name = fields[nameIdx].replace(/^"|"$/g, '').trim();
              const category = fields[catIdx].replace(/^"|"$/g, '').trim();
              
              const correctMenu = classifyVendor(name, category);
              const csvMenuStr = correctMenu.map(item => `${item.name}:${item.price >= 1000 ? (item.price/1000) + 'k' : item.price}`).join(';');
              
              // Update menu field
              fields[menuIdx] = `"${csvMenuStr}"`;
              
              // Wrap address or other fields in quotes if they contain commas
              fields = fields.map((f, index) => {
                if (index !== menuIdx) {
                  const cleaned = f.replace(/^"|"$/g, '').trim();
                  if (cleaned.includes(',')) {
                    return `"${cleaned}"`;
                  }
                  return cleaned;
                }
                return f;
              });

              updatedLines.push(fields.join(','));
            } else {
              updatedLines.push(line);
            }
          }
          fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf8');
          console.log(`Successfully synced CSV template: ${csvPath}!`);
        }
      }
    }

  } catch (err) {
    console.error('Error during menu repair:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
};

run();
