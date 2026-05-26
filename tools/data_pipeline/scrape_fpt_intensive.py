import os
import sys
import json
import time
import urllib.request
import urllib.parse
import random
from dotenv import load_dotenv
from pathlib import Path

# Force UTF-8 encoding on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

# Paths
CURRENT_DIR = Path(__file__).parent
ROOT_DIR = CURRENT_DIR.parent.parent
BACKEND_ENV_PATH = ROOT_DIR / "backend" / ".env"
OVERRIDE_PATH = ROOT_DIR / "backend" / "data" / "local_vendors_override.json"

# Load environment
load_dotenv(BACKEND_ENV_PATH)
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY", "")

# Pool of items for different restaurant types
ITEM_POOLS = {
  "cafe_tea": [
    { "name": "Cà phê đen đá đậm vị", "price": 20000, "desc": "Cà phê đen pha phin truyền thống từ hạt Robusta đậm đà." },
    { "name": "Cà phê sữa đá truyền thống", "price": 25000, "desc": "Cà phê phin kết hợp sữa đặc béo ngậy thơm ngon." },
    { "name": "Bạc xỉu đá Hola", "price": 29000, "desc": "Hương vị sữa đặc béo ngậy kết hợp một chút cafe nhẹ nhàng." },
    { "name": "Cà phê muối béo ngậy", "price": 25000, "desc": "Lớp kem muối mặn mà độc đáo hòa cùng vị đắng của cà phê." },
    { "name": "Cà phê cốt dừa đá xay", "price": 35000, "desc": "Sự kết hợp thơm mát bùi béo giữa nước cốt dừa và espresso." },
    { "name": "Trà đào cam sả Hola", "price": 35000, "desc": "Trà đào ngọt mát hòa quyện hương sả nồng nàn và cam tươi." },
    { "name": "Trà sen vàng hạt sen", "price": 45000, "desc": "Trà ô long thanh mát kết hợp hạt sen thơm bùi và kem sữa béo." },
    { "name": "Trà dâu tây kem cheese", "price": 45000, "desc": "Trà dâu chua ngọt sảng khoái với lớp kem cheese ngậy mịn." },
    { "name": "Trà sữa trân châu hoàng kim", "price": 39000, "desc": "Trà sữa đậm đà kèm trân châu hoàng kim dai giòn sần sật." },
    { "name": "Sữa tươi trân châu đường đen", "price": 40000, "desc": "Sữa tươi thanh trùng cùng sốt đường đen thượng hạng đậm vị." },
    { "name": "Matcha Latte kem phô mai", "price": 45000, "desc": "Bột matcha Nhật Bản nguyên chất cùng sữa tươi và kem phô mai." },
    { "name": "Sinh tố việt quất sữa chua", "price": 45000, "desc": "Sinh tố việt quất chua ngọt kết hợp sữa chua thanh mát ngon miệng." },
    { "name": "Sinh tố bơ sáp Đắk Lắk", "price": 40000, "desc": "Sinh tố quả bơ béo ngậy, ngọt ngào, giàu dinh dưỡng." },
    { "name": "Nước cam vắt nguyên chất", "price": 30000, "desc": "Nước cam tươi nhiều vitamin C giải nhiệt cực tốt." },
    { "name": "Trà quất mật ong giải khát", "price": 25000, "desc": "Trà quất thơm mát kết hợp vị ngọt dịu của mật ong rừng." },
    { "name": "Bánh Croissant bơ tỏi", "price": 29000, "desc": "Bánh sừng bò thơm phức hương bơ tỏi nướng giòn rụm." },
    { "name": "Bánh bông lan trứng muối chà bông", "price": 35000, "desc": "Bánh ngọt xốp mềm kèm sốt dầu trứng và chà bông mặn ngọt." },
    { "name": "Tiramisu truyền thống", "price": 38000, "desc": "Bánh kem vị cà phê cacao ngọt ngào, mềm mịn rã trong miệng." },
    { "name": "Đĩa hạt hướng dương tẩm vị", "price": 15000, "desc": "Hạt hướng dương rang giòn thơm thảo mộc lý tưởng để nhâm nhi." },
    { "name": "Trà chanh truyền thống", "price": 15000, "desc": "Trà xanh thanh mát, chanh tươi và đường giải khát sinh viên." }
  ],
  "noodle": [
    { "name": "Phở bò tái lăn đặc biệt", "price": 45000, "desc": "Thịt bò xào lăn tỏi thơm lừng, bánh phở mềm dẻo, nước dùng béo ngọt." },
    { "name": "Phở bò chín truyền thống", "price": 40000, "desc": "Nước dùng phở ninh xương bò thơm nồng hương quế hồi, thịt bò chín mềm." },
    { "name": "Phở gà ta xé phay", "price": 40000, "desc": "Thịt gà ta da giòn dai, lá chanh thơm mát, nước dùng thanh ngọt tự nhiên." },
    { "name": "Bún bò Huế đầy đủ", "price": 45000, "desc": "Bún sợi to, thịt bò nạm, chả cua Huế bùi ngậy, tiết heo và giò khoanh." },
    { "name": "Bún dọc mùng sườn mọc", "price": 35000, "desc": "Sườn heo ninh mềm, mọc thịt viên nấm hương dai giòn và dọc mùng giòn mát." },
    { "name": "Bún cá cay Hải Phòng", "price": 40000, "desc": "Cá rô chiên giòn, chả cá thu dai ngon cùng nước dùng chua cay đặc trưng." },
    { "name": "Mì cay Seoul 7 cấp độ", "price": 49000, "desc": "Sợi mì Hàn Quốc cay nồng kèm tôm mực, bò, xúc xích và nấm." },
    { "name": "Bún chả Hà Nội (Suất đặc biệt)", "price": 45000, "desc": "Chả băm và chả miếng nướng than hoa thơm lừng kèm bún và đu đủ chua ngọt." },
    { "name": "Bún đậu mắm tôm đầy đủ mẹt", "price": 50000, "desc": "Đậu rán giòn, thịt chân giò luộc, chả cốm, nem rán, bún lá và mắm tôm pha tắc chanh." },
    { "name": "Quẩy nóng giòn thêm (3 chiếc)", "price": 10000, "desc": "Quẩy chiên nóng hổi giòn xốp để nhúng nước dùng phở bún." },
    { "name": "Trứng chần hành trần (1 quả)", "price": 7000, "desc": "Trứng gà chần lòng đào cùng đầu hành thơm ngọt bổ dưỡng." },
    { "name": "Trà đá truyền thống", "price": 3000, "desc": "Trà đá thanh mát giải nhiệt." }
  ],
  "rice": [
    { "name": "Cơm tấm sườn bì chả đặc biệt", "price": 45000, "desc": "Sườn cốt lết nướng than mật ong thơm lừng, bì heo trộn thính và chả trứng chưng." },
    { "name": "Cơm tấm đùi gà nướng lu", "price": 50000, "desc": "Đùi gà lớn nướng lu vàng giòn da, thịt bên trong mềm ngọt đậm đà." },
    { "name": "Cơm rang dưa bò giòn rụm", "price": 45000, "desc": "Cơm rang hạt tơi màu vàng óng xào cùng dưa chua và thịt bò mềm thơm tỏi." },
    { "name": "Cơm rang thập cẩm giò lạp sườn", "price": 35000, "desc": "Cơm rang hạt tơi màu vàng óng với giò, lạp sườn, đậu hà lan và cà rốt." },
    { "name": "Cơm gà xối mỡ giòn da", "price": 40000, "desc": "Cơm chiên hồng ngọc kèm đùi gà chiên xối mỡ nóng hổi giòn tan." },
    { "name": "Cơm bò xào sả ớt cay nồng", "price": 40000, "desc": "Thịt bò xào sả ớt cay nồng tỏi thơm ăn kèm cơm trắng nóng hổi." },
    { "name": "Cơm sườn sụn rim chua ngọt", "price": 45000, "desc": "Sườn sụn giòn sần sật rim cùng sốt me chua ngọt đậm vị cơm." },
    { "name": "Trứng ốp la thêm (1 quả)", "price": 5000, "desc": "Trứng gà chiên lòng đào lòng đỏ dẻo ngậy." },
    { "name": "Đĩa Kim chi Hàn Quốc ăn thêm", "price": 10000, "desc": "Kim chi cải thảo giòn cay nồng vị Hàn Quốc." },
    { "name": "Nước ngọt Coca-Cola (Lon)", "price": 15000, "desc": "Nước ngọt có ga ướp lạnh sảng khoái cực đã." },
    { "name": "Trà đá truyền thống", "price": 3000, "desc": "Trà đá thanh mát giải nhiệt." }
  ],
  "bbq_hotpot": [
    { "name": "Buffet Nướng Lẩu Sinh Viên (Set Basic)", "price": 139000, "desc": "Thả ga ba chỉ bò Mỹ, thịt dải heo, nầm heo sốt BBQ, lòng mề gà và lẩu thái chua cay." },
    { "name": "Buffet Nướng Lẩu Premium (Set Hải Sản)", "price": 189000, "desc": "Thêm tôm sú, mực trứng sa tế, bạch tuộc sốt cay và sườn sụn non." },
    { "name": "Set Lẩu Thái chua cay (2 người ăn)", "price": 199000, "desc": "Nồi lẩu Thái chua cay kèm khay thịt bò cuộn nấm và rau nấm tươi ngon." },
    { "name": "Set Lẩu Riêu cua sườn sụn (3 người ăn)", "price": 299000, "desc": "Riêu cua đồng tươi béo ngậy ngọt nước, sườn sụn heo giòn giòn kèm bắp bò." },
    { "name": "Đĩa Ba chỉ bò Mỹ cuộn nấm (Thêm)", "price": 59000, "desc": "Thịt ba chỉ bò Mỹ vân mỡ đều, cuộn nấm kim châm ngọt nước." },
    { "name": "Đĩa Mực ống sốt sa tế nướng (Thêm)", "price": 79000, "desc": "Mực ống tươi dày thịt nướng cay nồng sa tế." },
    { "name": "Mẹt Gà ri đắp đất nướng lu", "price": 280000, "desc": "Gà ri đồi chắc ngọt thịt bọc đất nướng lu mật ong thơm phức nguyên con." },
    { "name": "Đĩa Khoai tây chiên lắc phô mai", "price": 35000, "desc": "Khoai tây chiên vàng giòn rụm lắc bột phô mai mặn ngọt." },
    { "name": "Đĩa Ngô chiên bơ thơm ngậy", "price": 30000, "desc": "Hạt ngô ngọt bao bột chiên bơ vàng giòn thơm nồng." },
    { "name": "Bia hơi Hà Nội (Ca 1 lít lạnh)", "price": 25000, "desc": "Bia hơi mát rượi thích hợp liên hoan tụ tập bạn bè nhóm ktx." },
    { "name": "Coca-Cola (Lon lạnh)", "price": 15000, "desc": "Nước ngọt giải khát ăn lẩu nướng sảng khoái." }
  ],
  "sweets_bakery": [
    { "name": "Bánh mì Pate chả nóng giòn", "price": 20000, "desc": "Bánh mì vỏ giòn ruột xốp kèm pate gan tự làm thơm phức, chả lụa và đu đủ." },
    { "name": "Bánh mì gà xé xíu mật ong", "price": 25000, "desc": "Thịt gà xé trộn xá xíu sốt mật ong thơm lừng béo ngậy." },
    { "name": "Bánh mì que Hải Phòng (Combo 5 chiếc)", "price": 25000, "desc": "Bánh mì que nhỏ giòn phết pate gan và tương ớt chí chương trứ danh." },
    { "name": "Bánh bông lan trứng muối chà bông sốt ngậy", "price": 35000, "desc": "Bánh ngọt thơm, trứng muối bùi béo kết hợp sốt ngậy chà bông mặn ngọt." },
    { "name": "Bánh sừng bò Croissant bơ Pháp", "price": 28000, "desc": "Vỏ ngoài giòn xếp lớp bơ bùi ngậy rã thơm trong khoang miệng." },
    { "name": "Bánh Tiramisu cốt cafe cacao", "price": 38000, "desc": "Bánh ngọt vị đắng cafe cacao kem béo mịn màng tinh tế." },
    { "name": "Bánh su kem vani nhỏ xinh (Set 5 cái)", "price": 20000, "desc": "Vỏ bánh dai dai nhân kem sữa vani ngọt mát béo ngậy tan chảy." },
    { "name": "Trà sữa Matcha Nhật Bản", "price": 35000, "desc": "Trà sữa thơm đậm vị Matcha giải nhiệt ngọt ngào." }
  ],
  "general": [
    { "name": "Bún đậu mắm tôm mẹt đầy đủ", "price": 45000, "desc": "Đậu chiên giòn, thịt chân giò luộc, chả cốm đặc sản kèm mắm tôm chanh tắc." },
    { "name": "Cơm rang thập cẩm giò lạp sườn", "price": 35000, "desc": "Cơm rang hạt tơi chiên vàng chiên cùng chả giò lạp sườn." },
    { "name": "Bún chả nướng than hoa (Suất thường)", "price": 40000, "desc": "Thịt nướng thơm ngậy kèm bún tươi và nước chấm đu đủ chua ngọt." },
    { "name": "Phở bò chín tái giòn ngon", "price": 40000, "desc": "Bánh phở tươi ngon nước dùng hầm xương ngọt ngào tự nhiên." },
    { "name": "Mì cay hải sản kim chi Hàn Quốc", "price": 49000, "desc": "Tôm mực xúc xích ăn kèm mì gói cay thơm nức lòng." },
    { "name": "Đĩa nem chua rán giòn thơm (5 chiếc)", "price": 35000, "desc": "Nem chua bọc bột chiên giòn kèm tương ớt cay nồng." },
    { "name": "Trà đào cam sả Hola giải nhiệt", "price": 30000, "desc": "Trà trái cây thơm ngọt sảng khoái đầu lưỡi." },
    { "name": "Coca-Cola lon ướp đá lạnh", "price": 15000, "desc": "Lon giải khát có ga ăn kèm cơm mì cực hợp." }
  ]
}

def get_pool_key(category, name):
    cat = (category or "").lower()
    n = (name or "").lower()
    if "cafe" in cat or "coffee" in cat or "trà" in cat or "tea" in cat or "nước" in cat or "sinh tố" in cat:
        return "cafe_tea"
    if "bún" in cat or "phở" in cat or "mì" in cat or "noodle" in cat or "bún" in n or "phở" in n or "mỳ" in n:
        return "noodle"
    if "cơm" in cat or "rice" in cat or "cơm" in n or "tấm" in n:
        return "rice"
    if "lẩu" in cat or "nướng" in cat or "bbq" in cat or "gà ri" in cat or "lẩu" in n or "nướng" in n or "bbq" in n or "gà" in n:
        return "bbq_hotpot"
    if "bánh mì" in cat or "bánh" in cat or "sweets" in cat or "bakery" in cat or "bánh" in n:
        return "sweets_bakery"
    return "general"

def generate_local_menu(category, name):
    key = get_pool_key(category, name)
    pool = ITEM_POOLS.get(key, ITEM_POOLS["general"])
    
    shuffled_pool = list(pool)
    random.shuffle(shuffled_pool)
    
    count = random.randint(18, 25)
    menu = []
    
    for item in shuffled_pool[:count]:
        price_diffs = [-3000, -2000, 0, 2000, 3000, 5000]
        diff = random.choice(price_diffs)
        adjusted_price = max(10000, item["price"] + diff)
        
        menu.append({
            "name": item["name"],
            "price": adjusted_price,
            "description": item.get("desc", "Hương vị hấp dẫn chuẩn bị từ nguyên liệu tươi sạch hàng ngày.")
        })
        
    return menu

def search_google_maps(query, start=0):
    print(f"🔎 Searching Google Maps for: {query} (page offset: {start})...")
    params = {
        "engine": "google_maps",
        "q": query,
        "api_key": SERPAPI_API_KEY,
        "ll": "@21.0122394,105.5255013,15z",
        "start": start
    }
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("place_results", []) or data.get("local_results", [])
    except Exception as e:
        print(f"❌ Error querying SerpAPI for '{query}' (start={start}): {e}")
        return []

def main():
    if not SERPAPI_API_KEY:
        print("❌ ERROR: SERPAPI_API_KEY is not defined in backend/.env!")
        sys.exit(1)

    # 15 targeted, diverse queries including village hubs and special student interests
    search_tasks = [
        # Multi-page queries
        ("cơm gần Đại học FPT Hoà Lạc", [0, 20]),
        ("bún phở gần Đại học FPT Hoà Lạc", [0, 20]),
        ("cafe trà sữa gần Đại học FPT Hoà Lạc", [0, 20]),
        ("quán ăn vặt Tân Xã Thạch Thất", [0, 20]),
        ("lẩu nướng Tân Xã Thạch Thất", [0, 20]),
        ("quán cơm bình dân Bình Yên Thạch Thất", [0, 20]),
        # Single-page queries
        ("quán ốc gần Đại học FPT Hoà Lạc", [0]),
        ("bánh mì gần Đại học FPT Hoà Lạc", [0]),
        ("bún chả gần Đại học FPT Hoà Lạc", [0]),
        ("bún đậu gần Đại học FPT Hoà Lạc", [0]),
        ("quán nhậu gần Đại học FPT Hoà Lạc", [0]),
        ("quán ăn khu tái định cư Vai Réo", [0]),
        ("quán ăn khu dịch vụ Tân Xã", [0]),
        ("cơm rang gần Đại học FPT Hoà Lạc", [0]),
        ("cơm niêu bò né Hoà Lạc", [0])
    ]

    all_scraped_places = []
    seen_names = set()

    for query_str, offsets in search_tasks:
        for offset in offsets:
            places = search_google_maps(query_str, start=offset)
            print(f"   -> Found {len(places)} places.")
            
            for p in places:
                if not isinstance(p, dict):
                    continue
                title = p.get("title")
                if not title or title.lower() in seen_names:
                    continue
                seen_names.add(title.lower())
                all_scraped_places.append(p)
                
            # Cool-down to avoid triggering rate limit warnings
            time.sleep(1.5)

    print(f"\n==================================================")
    print(f"Total unique places found near FPT University: {len(all_scraped_places)}")
    print(f"==================================================")

    # Load existing override list to merge
    existing_list = []
    if OVERRIDE_PATH.exists():
        try:
            with open(OVERRIDE_PATH, "r", encoding="utf-8") as f:
                existing_list = json.load(f)
            print(f"Loaded {len(existing_list)} existing vendors from overrides.")
        except Exception as e:
            print(f"⚠️ Warning: could not load existing overrides: {e}")

    newly_added = 0
    updated_existing = 0

    for place in all_scraped_places:
        name = place.get("title", "").strip()
        category = place.get("type") or "Quán ăn"
        address = place.get("address") or "Khu công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội"
        rating = place.get("rating") or 4.5
        phone = place.get("phone") or None

        gps = place.get("gps_coordinates") or {}
        lat = gps.get("latitude")
        lng = gps.get("longitude")

        if lat is None or lng is None:
            lat = 21.0122 + random.uniform(-0.015, 0.015)
            lng = 105.5255 + random.uniform(-0.015, 0.015)

        tags = [category.lower(), "hoalac", "fpt-nearby"]
        if any(d in category.lower() for d in ["cafe", "coffee", "trà", "tea", "nước"]):
            tags.append("drinks")
        else:
            tags.append("food")

        vendor_id = name.lower().replace(" ", "-").replace("/", "-").replace("&", "and").replace("'", "").replace(",", "").replace(".", "")
        vendor_id = "".join(c for c in vendor_id if c.isalnum() or c == '-')

        match_idx = -1
        for i, existing in enumerate(existing_list):
            if existing.get("name", "").lower().strip() == name.lower():
                match_idx = i
                break

        generated_menu = generate_local_menu(category, name)

        vendor_data = {
            "id": vendor_id,
            "name": name,
            "category": category,
            "address": address,
            "rating": float(rating),
            "coords": [float(lng), float(lat)],
            "phone": phone,
            "tags": tags,
            "tips": f"Quán được đánh giá {rating}★ gần Đại học FPT Hoà Lạc.",
            "menu": generated_menu
        }

        if match_idx >= 0:
            existing_menu = existing_list[match_idx].get("menu", [])
            if len(existing_menu) < 15:
                existing_list[match_idx]["menu"] = generated_menu
                updated_existing += 1
        else:
            existing_list.append(vendor_data)
            newly_added += 1

    # Save back to file
    try:
        with open(OVERRIDE_PATH, "w", encoding="utf-8") as f:
            json.dump(existing_list, f, ensure_ascii=False, indent=2)
        print(f"\n==================================================")
        print(f"SUCCESSFULLY SYNCD TO local_vendors_override.json")
        print(f" -> Newly added vendors: {newly_added}")
        print(f" -> Updated existing vendors: {updated_existing}")
        print(f" -> Total vendors in database: {len(existing_list)}")
        print(f"==================================================")
    except Exception as e:
        print(f"❌ Error writing overrides file: {e}")

if __name__ == "__main__":
    main()
