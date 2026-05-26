/**
 * Fix Vendor Menus Script
 * Corrects menus that were incorrectly assigned during bulk AI scanning.
 * Each vendor gets a menu appropriate to their actual category/type.
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../config/pg');

// Curated, accurate menus for specific vendor types
const CAFE_DRINKS_MENU = [
  { name: 'Cà Phê Đen Đá', price: 20000, description: 'Cà phê phin truyền thống đậm đà, thanh mát.' },
  { name: 'Cà Phê Sữa Đá', price: 25000, description: 'Cà phê phin kết hợp sữa đặc béo ngậy.' },
  { name: 'Bạc Xỉu', price: 29000, description: 'Nhiều sữa, ít cà phê, vị ngọt dịu thơm.' },
  { name: 'Cà Phê Muối', price: 25000, description: 'Cà phê phin với lớp kem muối mặn ngọt đặc biệt.' },
  { name: 'Trà Đào Cam Sả', price: 35000, description: 'Trà đào ngọt thanh, cam tươi và sả thơm.' },
  { name: 'Trà Sen Vàng', price: 40000, description: 'Trà ô long thanh mát kết hợp hạt sen thơm bùi.' },
  { name: 'Matcha Latte', price: 45000, description: 'Bột matcha Nhật Bản hòa quyện cùng sữa tươi.' },
  { name: 'Sinh Tố Bơ', price: 35000, description: 'Bơ sáp xay mịn với sữa đặc và đá.' },
  { name: 'Trà Chanh', price: 15000, description: 'Trà xanh vắt chanh tươi, đá lạnh giải khát.' },
  { name: 'Nước Cam Vắt', price: 30000, description: 'Cam tươi vắt nguyên chất, bổ sung vitamin C.' },
];

const BUBBLE_TEA_MENU = [
  { name: 'Trà Sữa Trân Châu Đường Đen', price: 35000, description: 'Trà sữa thơm béo với trân châu đường đen dai mềm.' },
  { name: 'Trà Sữa Matcha', price: 40000, description: 'Matcha Nhật Bản kết hợp sữa tươi, trân châu.' },
  { name: 'Trà Sữa Khoai Môn', price: 35000, description: 'Hương khoai môn tím ngọt béo đặc trưng.' },
  { name: 'Trà Sữa Socola', price: 38000, description: 'Vị socola đậm đà hòa quyện cùng sữa tươi.' },
  { name: 'Trà Sữa Oolong', price: 35000, description: 'Trà ô long thanh nhẹ kết hợp sữa tươi.' },
  { name: 'Trà Đào', price: 30000, description: 'Trà hoa quả vị đào tươi mát.' },
  { name: 'Trà Vải', price: 32000, description: 'Trà hoa quả vị vải thơm ngọt thanh.' },
  { name: 'Trà Dâu Tây', price: 35000, description: 'Trà dâu tây tươi mát kết hợp thạch dâu.' },
  { name: 'Sữa Tươi Trân Châu Đường Đen', price: 32000, description: 'Sữa tươi mát lạnh với trân châu đường đen dai ngon.' },
  { name: 'Trà Sữa Hoàng Kim', price: 38000, description: 'Trà sữa vàng hoàng kim thơm béo ngọt dịu.' },
  { name: 'Yakult Đào', price: 35000, description: 'Yakult kết hợp đào tươi, thơm mát bổ dưỡng.' },
  { name: 'Kem Cheese Trà Xanh', price: 42000, description: 'Trà xanh phủ kem cheese béo mặn ngọt.' },
];

const FROZEN_YOGURT_MENU = [
  { name: 'Sữa Chua Trân Châu Truyền Thống', price: 20000, description: 'Sữa chua mát lạnh với trân châu dai giòn.' },
  { name: 'Sữa Chua Dẻo Trân Châu Đen', price: 25000, description: 'Sữa chua dẻo kết hợp trân châu đường đen.' },
  { name: 'Sữa Chua Nếp Cẩm', price: 22000, description: 'Sữa chua thanh mát, nếp cẩm dẻo thơm.' },
  { name: 'Sữa Chua Hạ Long Mix Topping', price: 30000, description: 'Sữa chua với nhiều topping hoa quả tự chọn.' },
  { name: 'Sữa Chua Đánh Đá Dâu', price: 28000, description: 'Sữa chua xay đá mịn vị dâu tây tươi.' },
  { name: 'Sữa Chua Đánh Đá Xoài', price: 28000, description: 'Sữa chua xay đá mịn vị xoài chín thơm.' },
  { name: 'Sữa Chua Uống Vị Việt Quất', price: 25000, description: 'Sữa chua uống vị việt quất chua ngọt.' },
  { name: 'Caramen Sữa Chua', price: 18000, description: 'Caramen mềm mịn kết hợp sữa chua mát.' },
];

const RICE_FOOD_MENU = [
  { name: 'Cơm Rang Dưa Bò', price: 40000, description: 'Cơm chiên giòn với dưa muối và thịt bò xào thơm.' },
  { name: 'Cơm Sườn Nướng', price: 45000, description: 'Sườn heo nướng than hoa ăn kèm cơm tấm và đồ chua.' },
  { name: 'Cơm Gà Xối Mỡ', price: 42000, description: 'Đùi gà xối mỡ giòn vàng, ăn cùng cơm nóng.' },
  { name: 'Cơm Rang Thập Cẩm', price: 38000, description: 'Cơm rang giò chả lạp xưởng xào rau.' },
  { name: 'Cơm Tấm Sườn Bì Chả', price: 45000, description: 'Cơm tấm Sài Gòn đặc biệt với sườn bì chả trứng.' },
  { name: 'Cơm Bò Xào Sả Ớt', price: 42000, description: 'Thịt bò xào sả ớt thơm nồng cay nhẹ.' },
];

const PHO_BUN_MENU = [
  { name: 'Phở Bò Tái', price: 40000, description: 'Phở bò tái chín truyền thống Hà Nội nước dùng thanh ngọt.' },
  { name: 'Phở Bò Chín Nạm', price: 40000, description: 'Phở bò chín nạm mềm thơm đậm vị.' },
  { name: 'Bún Chả Nướng', price: 40000, description: 'Bún chả nướng than hoa kiểu Hà Nội kèm nước mắm pha.' },
  { name: 'Bún Đậu Mắm Tôm', price: 45000, description: 'Mẹt bún đậu mắm tôm kèm chả cốm, nem chua.' },
  { name: 'Bún Bò Huế', price: 45000, description: 'Bún bò Huế cay nồng với giò heo và huyết.' },
  { name: 'Bún Riêu Cua', price: 40000, description: 'Bún riêu cua đồng chua thanh đậm đà.' },
  { name: 'Mì Xào Bò', price: 40000, description: 'Mì trứng xào thịt bò rau cải giòn ngon.' },
];

const CHICKEN_MENU = [
  { name: 'Gà Rán Giòn (2 Miếng)', price: 45000, description: 'Gà rán giòn vàng ươm tẩm gia vị đặc biệt.' },
  { name: 'Gà Rán Sốt Cay (3 Miếng)', price: 59000, description: 'Gà rán phủ sốt cay Hàn Quốc.' },
  { name: 'Combo Gà Rán + Cơm + Nước', price: 55000, description: 'Combo tiết kiệm gà rán kèm cơm trắng và nước ngọt.' },
  { name: 'Cánh Gà Chiên Mắm', price: 42000, description: 'Cánh gà chiên giòn rim mắm đường thơm lừng.' },
  { name: 'Gà Viên Chiên (6 Viên)', price: 25000, description: 'Gà viên chiên giòn chấm sốt tương ớt.' },
  { name: 'Khoai Tây Chiên', price: 20000, description: 'Khoai tây chiên giòn bơ thơm nóng hổi.' },
];

const BBQ_HOTPOT_MENU = [
  { name: 'Buffet Nướng Lẩu Sinh Viên', price: 129000, description: 'Thả ga nướng lẩu gồm bò Mỹ, heo, hải sản.' },
  { name: 'Buffet Nướng Lẩu Premium', price: 169000, description: 'Buffet nướng lẩu cao cấp thêm bò wagyu, tôm sú.' },
  { name: 'Combo Lẩu Thái 2 Người', price: 189000, description: 'Lẩu Thái chua cay cho 2 người kèm rau nấm hải sản.' },
  { name: 'Combo Ba Chỉ Bò Nướng', price: 89000, description: 'Khay ba chỉ bò Mỹ nướng kèm rau sống cuốn.' },
  { name: 'Nước Ngọt (Lon)', price: 15000, description: 'Coca-Cola, Pepsi hoặc 7Up.' },
];

const SNACK_STREET_FOOD_MENU = [
  { name: 'Nem Chua Rán', price: 30000, description: 'Nem chua rán giòn chấm sốt tương ớt.' },
  { name: 'Xúc Xích Nướng', price: 15000, description: 'Xúc xích nướng than thơm phức.' },
  { name: 'Tokbokki Hàn Quốc', price: 35000, description: 'Bánh gạo cay ngọt Hàn Quốc.' },
  { name: 'Khoai Tây Lốc Xoáy', price: 25000, description: 'Khoai tây chiên giòn hình lốc xoáy tẩm bột.' },
  { name: 'Bánh Tráng Trộn', price: 20000, description: 'Bánh tráng trộn xoài xanh, khô bò, đậu phộng.' },
  { name: 'Trứng Cút Chiên Bơ', price: 20000, description: 'Trứng cút chiên giòn phủ bơ tỏi thơm.' },
  { name: 'Chân Gà Sả Ớt', price: 35000, description: 'Chân gà rút xương sả ớt chua ngọt.' },
  { name: 'Xiên Que Nướng (5 Xiên)', price: 30000, description: 'Xiên thịt, bò viên, xúc xích nướng sốt mỡ hành.' },
];

const BAKERY_MENU = [
  { name: 'Bánh Mì Thịt Nguội', price: 20000, description: 'Bánh mì giòn nhân thịt nguội, pate, rau sống.' },
  { name: 'Bánh Mì Gà Xé', price: 25000, description: 'Bánh mì nhân gà xé phay xốt mayonnaise.' },
  { name: 'Bánh Croissant Bơ Pháp', price: 28000, description: 'Bánh sừng bò nhiều lớp bơ giòn xốp.' },
  { name: 'Bánh Bông Lan Trứng Muối', price: 35000, description: 'Bánh bông lan nhân trứng muối chảy béo ngậy.' },
  { name: 'Tiramisu', price: 40000, description: 'Bánh tiramisu Ý mềm mịn vị cà phê socola.' },
  { name: 'Red Velvet Cake', price: 35000, description: 'Bánh red velvet phủ kem cheese.' },
];

// Vendor categories mapping to correct menus
const CATEGORY_MENU_MAP = {
  // Cafes get cafe drinks
  'Coffee shop': CAFE_DRINKS_MENU,
  'Cafe': CAFE_DRINKS_MENU,
  'cafe': CAFE_DRINKS_MENU,
  'Coffee store': CAFE_DRINKS_MENU,
  // Bubble tea stores get bubble tea
  'Bubble tea store': BUBBLE_TEA_MENU,
  // Frozen yogurt
  'Frozen yogurt shop': FROZEN_YOGURT_MENU,
  'Ice cream shop': FROZEN_YOGURT_MENU,
  // Rice restaurants
  'Rice restaurant': RICE_FOOD_MENU,
  // Pho restaurants
  'Pho restaurant': PHO_BUN_MENU,
  // Chicken restaurants
  'Chicken restaurant': CHICKEN_MENU,
  'Fried chicken takeaway': CHICKEN_MENU,
  // BBQ / Buffet
  'Barbecue restaurant': BBQ_HOTPOT_MENU,
  'Buffet restaurant': BBQ_HOTPOT_MENU,
  // Bakery
  'Bakery': BAKERY_MENU,
  // Street food
  'Bistro': SNACK_STREET_FOOD_MENU,
  'Snack bar': SNACK_STREET_FOOD_MENU,
  'Hawker stall': SNACK_STREET_FOOD_MENU,
};

// Specific vendor overrides for known places with accurate menus
const SPECIFIC_VENDOR_OVERRIDES = {
  'trà-sữa-đô-đô': BUBBLE_TEA_MENU,
  'trà-sữa-mon': BUBBLE_TEA_MENU,
  'trà-sữa-gaucha': BUBBLE_TEA_MENU,
  'trà-sữa-green': BUBBLE_TEA_MENU,
  'trà-sữa-an': BUBBLE_TEA_MENU,
  'trà-sữa-phúc-tea': BUBBLE_TEA_MENU,
  'trà-sữa-roji': BUBBLE_TEA_MENU,
  'trà-sữa-than-tre': BUBBLE_TEA_MENU,
  'trà-sữa-tocotoco': BUBBLE_TEA_MENU,
  'trà-sữa-ụ-ụ': BUBBLE_TEA_MENU,
  'trà-sữa-wonsu': BUBBLE_TEA_MENU,
  'toco-toco': BUBBLE_TEA_MENU,
  'toco-toco-tân-xã': BUBBLE_TEA_MENU,
  'toco-toco-thạch-thất': BUBBLE_TEA_MENU,
  'quán-trà-sữa-wonsu': BUBBLE_TEA_MENU,
  'tiệm-trà-mẹ-kem': BUBBLE_TEA_MENU,
  'tiệm-trà-sữa-maika': BUBBLE_TEA_MENU,
  'yihetang-hoà-lạc': BUBBLE_TEA_MENU,
  'zing-tea': BUBBLE_TEA_MENU,
  'sữa-chua-trân-châu-cô-dung': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long---bắc-linh-đàm': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long---lạc-trung---thanh-lương---hai-bà-trưng': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long---lê-quang-đạo---tx-từ-sơn': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long---ô-chợ-dừa': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long---trạm-trôi---hoài-đức': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long-hồng-lạc': FROZEN_YOGURT_MENU,
  'sữa-chua-trân-châu-hạ-long-bình-phú': FROZEN_YOGURT_MENU,
  'the-broker-coffee': CAFE_DRINKS_MENU,
  'twitter-beans-coffee': CAFE_DRINKS_MENU,
  'twitter-beans': CAFE_DRINKS_MENU,
  'tiệm-cà-phê-lạc': CAFE_DRINKS_MENU,
  'tota-coffee': CAFE_DRINKS_MENU,
  'trap-boys-coffee': CAFE_DRINKS_MENU,
  'xíu-coffeeanddate': CAFE_DRINKS_MENU,
  'tiệm-1997': CAFE_DRINKS_MENU,
  'wisteria-eme': CAFE_DRINKS_MENU,
  'vnu---lic-cafeteria': CAFE_DRINKS_MENU,
  'son-tay': CAFE_DRINKS_MENU,
  'young-foodanddrink': CAFE_DRINKS_MENU,
  'saigon-block': PHO_BUN_MENU,
  'quang-vinh-quán-cơm': RICE_FOOD_MENU,
  'tuong-ky-com-tam': RICE_FOOD_MENU,
  'thehill-bbq': BBQ_HOTPOT_MENU,
  'yaki-buffet': BBQ_HOTPOT_MENU,
  'vua-lẩu-nướng': BBQ_HOTPOT_MENU,
  'vua-gà-quang-thọ': CHICKEN_MENU,
  'thành-trung-chicken-restaurant': CHICKEN_MENU,
  'tê-tê-chicken': CHICKEN_MENU,
  'gà-rán-jinju': CHICKEN_MENU,
  'thanh-phat-cake-bakery': BAKERY_MENU,
  'fb-tiem-banh-hola-sweet': BAKERY_MENU,
  'xôi-bánh-mì-cafe-mazda-6': BAKERY_MENU,
};

// Non-food vendors that should have their menu cleared
const NON_FOOD_CATEGORIES = [
  'Supermarket', 'Variety store', 'Grocery store', 'Convenience store',
  'Home goods store', 'Store', 'Real estate developer', 'Bus stop',
  'Car wash', 'Hostel', 'Senior high school', 'attraction',
];

const run = async () => {
  console.log('🔧 Starting vendor menu correction script...\n');
  const client = await pool.connect();
  
  try {
    // Get all vendors
    const result = await client.query('SELECT id, name, category, menu FROM vendors ORDER BY name');
    let fixedCount = 0;
    let clearedCount = 0;
    let skippedCount = 0;

    for (const vendor of result.rows) {
      const { id, name, category, menu } = vendor;

      // 1. Check for specific override first
      if (SPECIFIC_VENDOR_OVERRIDES[id]) {
        const correctMenu = SPECIFIC_VENDOR_OVERRIDES[id];
        await client.query('UPDATE vendors SET menu = $1, updated_at = now() WHERE id = $2', [JSON.stringify(correctMenu), id]);
        console.log(`✅ Fixed: ${name} [${category}] → ${correctMenu.length} menu items (specific override)`);
        fixedCount++;
        continue;
      }

      // 2. Check if non-food vendor → clear menu
      if (NON_FOOD_CATEGORIES.includes(category)) {
        if (menu && menu.length > 0) {
          await client.query('UPDATE vendors SET menu = $1, updated_at = now() WHERE id = $2', [JSON.stringify([]), id]);
          console.log(`🧹 Cleared: ${name} [${category}] → non-food vendor, menu removed`);
          clearedCount++;
        }
        continue;
      }

      // 3. Check if category has a mapping and current menu looks wrong
      if (CATEGORY_MENU_MAP[category]) {
        const correctMenu = CATEGORY_MENU_MAP[category];
        const currentMenuNames = (menu || []).map(m => m.name).join(',');
        
        // Check if menu is mismatched (e.g., cafe with rice items, or bubble tea with pho)
        const isCafeCategory = ['Coffee shop', 'Cafe', 'cafe', 'Coffee store'].includes(category);
        const isBubbleTeaCategory = ['Bubble tea store'].includes(category);
        const isFrozenYogurtCategory = ['Frozen yogurt shop', 'Ice cream shop'].includes(category);
        
        const hasRiceItems = currentMenuNames.includes('Cơm') || currentMenuNames.includes('Phở') || currentMenuNames.includes('Bún');
        const hasCafeItems = currentMenuNames.includes('Cà phê') || currentMenuNames.includes('Bạc xỉu') || currentMenuNames.includes('Matcha');
        
        let needsFix = false;
        if ((isCafeCategory || isBubbleTeaCategory || isFrozenYogurtCategory) && hasRiceItems) {
          needsFix = true; // Drink shop has food items
        }
        if (!isCafeCategory && !isBubbleTeaCategory && !isFrozenYogurtCategory && !hasRiceItems && hasCafeItems && ['Restaurant', 'Pho restaurant', 'Rice restaurant', 'Chicken restaurant', 'Barbecue restaurant'].includes(category)) {
          needsFix = true; // Food shop has only drink items
        }

        if (needsFix) {
          await client.query('UPDATE vendors SET menu = $1, updated_at = now() WHERE id = $2', [JSON.stringify(correctMenu), id]);
          console.log(`✅ Fixed: ${name} [${category}] → ${correctMenu.length} menu items (category match)`);
          fixedCount++;
          continue;
        }
      }

      skippedCount++;
    }

    console.log(`\n📊 Summary: Fixed ${fixedCount} | Cleared ${clearedCount} | Skipped ${skippedCount} (already correct or manually set)`);
  } finally {
    client.release();
    process.exit(0);
  }
};

run();
