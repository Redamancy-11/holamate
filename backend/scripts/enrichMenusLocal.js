const fs = require('fs');
const path = require('path');

const OVERRIDE_PATH = path.resolve(__dirname, '../data/local_vendors_override.json');

// Pool of items for different restaurant types
const ITEM_POOLS = {
  cafe_tea: [
    { name: "Cà phê đen đá đậm vị", price: 20000, desc: "Cà phê đen pha phin truyền thống từ hạt Robusta đậm đà." },
    { name: "Cà phê sữa đá truyền thống", price: 25000, desc: "Cà phê phin kết hợp sữa đặc béo ngậy thơm ngon." },
    { name: "Bạc xỉu đá Hola", price: 29000, desc: "Hương vị sữa đặc béo ngậy kết hợp một chút cafe nhẹ nhàng." },
    { name: "Cà phê muối béo ngậy", price: 25000, desc: "Lớp kem muối mặn mà độc đáo hòa cùng vị đắng của cà phê." },
    { name: "Cà phê cốt dừa đá xay", price: 35000, desc: "Sự kết hợp thơm mát bùi béo giữa nước cốt dừa và espresso." },
    { name: "Trà đào cam sả Hola", price: 35000, desc: "Trà đào ngọt mát hòa quyện hương sả nồng nàn và cam tươi." },
    { name: "Trà sen vàng hạt sen", price: 45000, desc: "Trà ô long thanh mát kết hợp hạt sen thơm bùi và kem sữa béo." },
    { name: "Trà dâu tây kem cheese", price: 45000, desc: "Trà dâu chua ngọt sảng khoái với lớp kem cheese ngậy mịn." },
    { name: "Trà sữa trân châu hoàng kim", price: 39000, desc: "Trà sữa đậm đà kèm trân châu hoàng kim dai giòn sần sật." },
    { name: "Sữa tươi trân châu đường đen", price: 40000, desc: "Sữa tươi thanh trùng cùng sốt đường đen thượng hạng đậm vị." },
    { name: "Matcha Latte kem phô mai", price: 45000, desc: "Bột matcha Nhật Bản nguyên chất cùng sữa tươi và kem phô mai." },
    { name: "Sinh tố việt quất sữa chua", price: 45000, desc: "Sinh tố việt quất chua ngọt kết hợp sữa chua thanh mát ngon miệng." },
    { name: "Sinh tố bơ sáp Đắk Lắk", price: 40000, desc: "Sinh tố quả bơ béo ngậy, ngọt ngào, giàu dinh dưỡng." },
    { name: "Nước cam vắt nguyên chất", price: 30000, desc: "Nước cam tươi nhiều vitamin C giải nhiệt cực tốt." },
    { name: "Trà quất mật ong giải khát", price: 25000, desc: "Trà quất thơm mát kết hợp vị ngọt dịu của mật ong rừng." },
    { name: "Bánh Croissant bơ tỏi", price: 29000, desc: "Bánh sừng bò thơm phức hương bơ tỏi nướng giòn rụm." },
    { name: "Bánh bông lan trứng muối chà bông", price: 35000, desc: "Bánh ngọt xốp mềm kèm sốt dầu trứng và chà bông mặn ngọt." },
    { name: "Tiramisu truyền thống", price: 38000, desc: "Bánh kem vị cà phê cacao ngọt ngào, mềm mịn rã trong miệng." },
    { name: "Đĩa hạt hướng dương tẩm vị", price: 15000, desc: "Hạt hướng dương rang giòn thơm thảo mộc lý tưởng để nhâm nhi." },
    { name: "Đĩa khô bò xé sợi chanh", price: 35000, desc: "Khô bò sợi dai ngon cay nồng vắt thêm chanh thơm." },
    { name: "Trà chanh truyền thống", price: 15000, desc: "Trà xanh thanh mát, chanh tươi và đường giải khát sinh viên." }
  ],
  noodle: [
    { name: "Phở bò tái lăn đặc biệt", price: 45000, desc: "Thịt bò xào lăn tỏi thơm lừng, bánh phở mềm dẻo, nước dùng béo ngọt." },
    { name: "Phở bò chín truyền thống", price: 40000, desc: "Nước dùng phở ninh xương bò thơm nồng hương quế hồi, thịt bò chín mềm." },
    { name: "Phở gà ta xé phay", price: 40000, desc: "Thịt gà ta da giòn dai, lá chanh thơm mát, nước dùng thanh ngọt tự nhiên." },
    { name: "Bún bò Huế đầy đủ", price: 45000, desc: "Bún sợi to, thịt bò nạm, chả cua Huế bùi ngậy, tiết heo và giò khoanh." },
    { name: "Bún dọc mùng sườn mọc", price: 35000, desc: "Sườn heo ninh mềm, mọc thịt viên nấm hương dai giòn và dọc mùng giòn mát." },
    { name: "Bún cá cay Hải Phòng", price: 40000, desc: "Cá rô chiên giòn, chả cá thu dai ngon cùng nước dùng chua cay đặc trưng." },
    { name: "Mì cay Seoul 7 cấp độ", price: 49000, desc: "Sợi mì Hàn Quốc cay nồng kèm tôm mực, bò, xúc xích và nấm." },
    { name: "Bún chả Hà Nội (Suất đặc biệt)", price: 45000, desc: "Chả băm và chả miếng nướng than hoa thơm lừng kèm bún và đu đủ chua ngọt." },
    { name: "Bún đậu mắm tôm đầy đủ mẹt", price: 50000, desc: "Đậu rán giòn, thịt chân giò luộc, chả cốm, nem rán, bún lá và mắm tôm pha tắc chanh." },
    { name: "Quẩy nóng giòn thêm (3 chiếc)", price: 10000, desc: "Quẩy chiên nóng hổi giòn xốp để nhúng nước dùng phở bún." },
    { name: "Trứng chần hành trần (1 quả)", price: 7000, desc: "Trứng gà chần lòng đào cùng đầu hành thơm ngọt bổ dưỡng." },
    { name: "Đĩa rau sống ăn thêm", price: 5000, desc: "Rau kinh giới, húng quế, xà lách rửa sạch ăn kèm bún phở." },
    { name: "Nước quất đá mát lạnh", price: 15000, desc: "Nước quất vắt thơm mát kết hợp vị chua ngọt giải nhiệt." },
    { name: "Trà đá truyền thống", price: 3000, desc: "Trà xanh Thái Nguyên ướp đá giải khát bình dân nhất." }
  ],
  rice: [
    { name: "Cơm tấm sườn bì chả đặc biệt", price: 45000, desc: "Sườn cốt lết nướng than mật ong thơm lừng, bì heo trộn thính và chả trứng chưng." },
    { name: "Cơm tấm đùi gà nướng lu", price: 50000, desc: "Đùi gà lớn nướng lu vàng giòn da, thịt bên trong mềm ngọt đậm đà." },
    { name: "Cơm rang dưa bò giòn rụm", price: 45000, desc: "Cơm rang tơi giòn tan xào cùng dưa chua và thịt bò mềm thơm tỏi." },
    { name: "Cơm rang thập cẩm giò lạp sườn", price: 35000, desc: "Cơm rang hạt tơi màu vàng óng với giò, lạp sườn, đậu hà lan và cà rốt." },
    { name: "Cơm gà xối mỡ giòn da", price: 40000, desc: "Cơm chiên hồng ngọc kèm đùi gà chiên xối mỡ nóng hổi giòn tan." },
    { name: "Cơm bò xào sả ớt cay nồng", price: 40000, desc: "Thịt bò xào sả ớt cay nồng tỏi thơm ăn kèm cơm trắng nóng hổi." },
    { name: "Cơm heo quay kho tộ", price: 45000, desc: "Heo quay da giòn kho nước màu đậm vị thơm ngon hấp dẫn." },
    { name: "Cơm sườn sụn rim chua ngọt", price: 45000, desc: "Sườn sụn giòn sần sật rim cùng sốt me chua ngọt đậm vị cơm." },
    { name: "Trứng ốp la thêm (1 quả)", price: 5000, desc: "Trứng gà chiên lòng đào lòng đỏ dẻo ngậy." },
    { name: "Canh chua dứa thịt băm (Bát thêm)", price: 8000, desc: "Canh chua thanh mát đưa cơm giải ngấy." },
    { name: "Đĩa Kim chi Hàn Quốc ăn thêm", price: 10000, desc: "Kim chi cải thảo giòn cay nồng vị Hàn Quốc." },
    { name: "Nước ngọt Coca-Cola (Lon)", price: 15000, desc: "Nước ngọt có ga ướp lạnh sảng khoái cực đã." },
    { name: "Trà đá truyền thống", price: 3000, desc: "Trà đá thanh mát giải nhiệt." }
  ],
  bbq_hotpot: [
    { name: "Buffet Nướng Lẩu Sinh Viên (Set Basic)", price: 139000, desc: "Thả ga ba chỉ bò Mỹ, thịt dải heo, nầm heo sốt BBQ, lòng mề gà và lẩu thái chua cay." },
    { name: "Buffet Nướng Lẩu Premium (Set Hải Sản)", price: 189000, desc: "Thêm tôm sú, mực trứng sa tế, bạch tuộc sốt cay và sườn sụn non." },
    { name: "Set Lẩu Thái chua cay (2 người ăn)", price: 199000, desc: "Nồi lẩu Thái chua cay kèm khay thịt bò cuộn nấm và rau nấm tươi ngon." },
    { name: "Set Lẩu Riêu cua sườn sụn (3 người ăn)", price: 299000, desc: "Riêu cua đồng tươi béo ngậy ngọt nước, sườn sụn heo giòn giòn kèm bắp bò." },
    { name: "Đĩa Ba chỉ bò Mỹ cuộn nấm (Thêm)", price: 59000, desc: "Thịt ba chỉ bò Mỹ vân mỡ đều, cuộn nấm kim châm ngọt nước." },
    { name: "Đĩa Mực ống sốt sa tế nướng (Thêm)", price: 79000, desc: "Mực ống tươi dày thịt nướng cay nồng sa tế." },
    { name: "Mẹt Gà ri đắp đất nướng lu", price: 280000, desc: "Gà ri đồi chắc ngọt thịt bọc đất nướng lu mật ong thơm phức nguyên con." },
    { name: "Đĩa Khoai tây chiên lắc phô mai", price: 35000, desc: "Khoai tây chiên vàng giòn rụm lắc bột phô mai mặn ngọt." },
    { name: "Đĩa Ngô chiên bơ thơm ngậy", price: 30000, desc: "Hạt ngô ngọt bao bột chiên bơ vàng giòn thơm nồng." },
    { name: "Đĩa bánh mì bơ nướng mật ong", price: 20000, desc: "Bánh mì cắt lát phết bơ mật ong nướng giòn ngọt thơm." },
    { name: "Bia hơi Hà Nội (Ca 1 lít lạnh)", price: 25000, desc: "Bia hơi mát rượi thích hợp liên hoan tụ tập bạn bè nhóm ktx." },
    { name: "Rượu nếp cái hoa vàng (Bình 500ml)", price: 40000, desc: "Hương vị nếp thơm ngọt êm dịu truyền thống." },
    { name: "Coca-Cola (Lon lạnh)", price: 15000, desc: "Nước ngọt giải khát ăn lẩu nướng sảng khoái." }
  ],
  sweets_bakery: [
    { name: "Bánh mì Pate chả nóng giòn", price: 20000, desc: "Bánh mì vỏ giòn ruột xốp kèm pate gan tự làm thơm phức, chả lụa và đu đủ." },
    { name: "Bánh mì gà xé xíu mật ong", price: 25000, desc: "Thịt gà xé trộn xá xíu sốt mật ong thơm lừng béo ngậy." },
    { name: "Bánh mì que Hải Phòng (Combo 5 chiếc)", price: 25000, desc: "Bánh mì que nhỏ giòn phết pate gan và tương ớt chí chương trứ danh." },
    { name: "Bánh bông lan trứng muối chà bông sốt ngậy", price: 35000, desc: "Bánh ngọt thơm, trứng muối bùi béo kết hợp sốt ngậy chà bông mặn ngọt." },
    { name: "Bánh sừng bò Croissant bơ Pháp", price: 28000, desc: "Vỏ ngoài giòn xếp lớp bơ bùi ngậy rã thơm trong khoang miệng." },
    { name: "Cupcake dâu tây kem tươi", price: 20000, desc: "Bánh muffin xốp mềm phủ lớp kem tươi và quả dâu chua ngọt." },
    { name: "Bánh Tiramisu cốt cafe cacao", price: 38000, desc: "Bánh ngọt vị đắng cafe cacao kem béo mịn màng tinh tế." },
    { name: "Bánh su kem vani nhỏ xinh (Set 5 cái)", price: 20000, desc: "Vỏ bánh dai dai nhân kem sữa vani ngọt mát béo ngậy tan chảy." },
    { name: "Trà sữa Matcha Nhật Bản", price: 35000, desc: "Trà sữa thơm đậm vị Matcha giải nhiệt ngọt ngào." },
    { name: "Trà đào chanh sả", price: 30000, desc: "Trà trái cây thơm đào cam sả giải khát." }
  ],
  general: [
    { name: "Bún đậu mắm tôm mẹt đầy đủ", price: 45000, desc: "Đậu chiên giòn, thịt chân giò luộc, chả cốm đặc sản kèm mắm tôm chanh tắc." },
    { name: "Cơm rang thập cẩm giòn rụm", price: 35000, desc: "Cơm rang hạt vàng tơi giòn chiên cùng chả giò lạp sườn và hành phi." },
    { name: "Bún chả nướng than hoa (Suất thường)", price: 40000, desc: "Thịt nướng thơm ngậy kèm bún tươi và nước chấm đu đủ chua ngọt." },
    { name: "Phở bò chín tái giòn ngon", price: 40000, desc: "Bánh phở tươi ngon nước dùng hầm xương ngọt ngào tự nhiên." },
    { name: "Mì cay hải sản kim chi Hàn Quốc", price: 49000, desc: "Tôm mực xúc xích ăn kèm mì gói cay thơm nức lòng." },
    { name: "Đĩa khoai tây chiên bơ", price: 30000, desc: "Món ăn vặt giòn rụm bùi ngậy béo thơm." },
    { name: "Đĩa nem chua rán giòn thơm (5 chiếc)", price: 35000, desc: "Nem chua bọc bột chiên giòn kèm tương ớt cay nồng." },
    { name: "Trà đào cam sả Hola giải nhiệt", price: 30000, desc: "Trà trái cây thơm ngọt sảng khoái đầu lưỡi." },
    { name: "Coca-Cola lon ướp đá lạnh", price: 15000, desc: "Lon giải khát có ga ăn kèm cơm mì cực hợp." },
    { name: "Trà đá Thái Nguyên thơm mát", price: 3000, desc: "Giải nhiệt mát lạnh bình dân." }
  ]
};

// Map vendor category text to our item pool keys
const getPoolKey = (category, name) => {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('trà') || cat.includes('tea') || cat.includes('nước') || cat.includes('sinh tố')) {
    return 'cafe_tea';
  }
  if (cat.includes('bún') || cat.includes('phở') || cat.includes('mì') || cat.includes('noodle') || n.includes('bún') || n.includes('phở') || n.includes('mỳ')) {
    return 'noodle';
  }
  if (cat.includes('cơm') || cat.includes('rice') || n.includes('cơm') || n.includes('tấm')) {
    return 'rice';
  }
  if (cat.includes('lẩu') || cat.includes('nướng') || cat.includes('bbq') || cat.includes('gà ri') || cat.includes('nhà hàng') || n.includes('lẩu') || n.includes('nướng') || n.includes('bbq') || n.includes('gà ri')) {
    return 'bbq_hotpot';
  }
  if (cat.includes('bánh mì') || cat.includes('sweets') || cat.includes('bánh') || cat.includes('bakery') || n.includes('bánh')) {
    return 'sweets_bakery';
  }
  return 'general';
};

const run = () => {
  if (!fs.existsSync(OVERRIDE_PATH)) {
    console.error(`File local_vendors_override.json not found at ${OVERRIDE_PATH}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));
  console.log(`Loaded ${data.length} vendors from local overrides.`);

  let enrichedCount = 0;

  data.forEach((vendor) => {
    const existingMenu = vendor.menu || [];
    
    // If the menu is too small, let's enrich it to have 18-26 items
    if (existingMenu.length < 15) {
      const poolKey = getPoolKey(vendor.category, vendor.name);
      const pool = ITEM_POOLS[poolKey] || ITEM_POOLS.general;
      
      // Keep existing menu items, avoid duplication by name
      const enrichedMenu = [...existingMenu];
      
      // Shuffle pool items randomly to create a unique selection for this vendor
      const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
      
      // Target count between 18 and 25 items
      const targetCount = 18 + Math.floor(Math.random() * 8); // 18 to 25 items
      
      for (const item of shuffledPool) {
        if (enrichedMenu.length >= targetCount) break;
        
        const exists = enrichedMenu.some(existing => existing.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        if (!exists) {
          // Adjust price slightly (+/- 2000đ or 5000đ) to make it unique per store
          const priceDiffs = [-3000, -2000, 0, 2000, 3000, 5000];
          const diff = priceDiffs[Math.floor(Math.random() * priceDiffs.length)];
          const adjustedPrice = Math.max(10000, item.price + diff);

          enrichedMenu.push({
            name: item.name,
            price: adjustedPrice,
            description: item.desc || "Hương vị hấp dẫn được chuẩn bị tỉ mỉ từ nguyên liệu tươi sạch hàng ngày."
          });
        }
      }

      vendor.menu = enrichedMenu;
      enrichedCount++;
      console.log(`Enriched "${vendor.name}" (${vendor.category} -> Pool: ${poolKey}) to ${enrichedMenu.length} items.`);
    }
  });

  // Write changes back to disk
  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n==================================================`);
  console.log(`SUCCESS! Enriched ${enrichedCount} vendors locally.`);
  console.log(`Total vendors: ${data.length}`);
};

run();
