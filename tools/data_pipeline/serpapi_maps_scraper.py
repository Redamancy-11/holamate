import os
import sys
import json
import time
import urllib.request
import urllib.parse
from dotenv import load_dotenv
from pathlib import Path

# Force UTF-8 encoding on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent.parent
BACKEND_ENV_PATH = ROOT_DIR / "backend" / ".env"
load_dotenv(BACKEND_ENV_PATH)

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def search_google_maps(query):
    print(f"Searching Google Maps via SerpAPI for: {query}...")
    params = {
        "engine": "google_maps",
        "q": query,
        "api_key": SERPAPI_API_KEY
    }
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("place_results", []) or data.get("local_results", [])
    except Exception as e:
        print(f"❌ Error calling SerpAPI for query '{query}': {e}")
        return []

def download_image_as_base64(url):
    try:
        # If it's a googleusercontent URL, request a smaller size for faster performance
        if "googleusercontent.com" in url:
            if "=" in url:
                base_url = url.split("=")[0]
                url = base_url + "=w800"
        
        print(f"   Downloading photo for OCR...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as response:
            import base64
            return base64.b64encode(response.read()).decode("utf-8")
    except Exception as e:
        print(f"   ⚠️ Error downloading image: {e}")
        return None

def fetch_menu_photos(data_id):
    if not SERPAPI_API_KEY or not data_id:
        return []
    
    # Query photos categories first to see if Menu category exists
    params = {
        "engine": "google_maps_photos",
        "data_id": data_id,
        "api_key": SERPAPI_API_KEY
    }
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
            categories = data.get("categories", [])
            menu_cat = None
            for cat in categories:
                title = (cat.get("title") or "").lower()
                if "menu" in title or "thực đơn" in title or "bảng giá" in title:
                    menu_cat = cat
                    break
            
            # If Menu category found, query with its category_id
            if menu_cat:
                cat_id = menu_cat.get("id")
                print(f"   📸 Found Menu category (ID: {cat_id}). Fetching menu photos...")
                params["category_id"] = cat_id
                url_cat = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
                req_cat = urllib.request.Request(url_cat, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req_cat, timeout=12) as response_cat:
                    data_cat = json.loads(response_cat.read().decode("utf-8"))
                    photos = data_cat.get("photos", [])
                    return [p.get("image") for p in photos if p.get("image")][:12]
            else:
                # If no Menu category, try Food & drink
                food_cat = None
                for cat in categories:
                    title = (cat.get("title") or "").lower()
                    if "food" in title or "đồ ăn" in title or "drink" in title or "uống" in title:
                        food_cat = cat
                        break
                if food_cat:
                    cat_id = food_cat.get("id")
                    print(f"   📸 No Menu category, using Food & drink category (ID: {cat_id})...")
                    params["category_id"] = cat_id
                    url_cat = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
                    req_cat = urllib.request.Request(url_cat, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req_cat, timeout=12) as response_cat:
                        data_cat = json.loads(response_cat.read().decode("utf-8"))
                        photos = data_cat.get("photos", [])
                        return [p.get("image") for p in photos if p.get("image")][:12]
                
                # Otherwise, return general photos
                photos = data.get("photos", [])
                if photos:
                    print(f"   📸 No Menu or Food/Drink category. Using top {min(12, len(photos))} general photos...")
                    return [p.get("image") for p in photos if p.get("image")][:12]
    except Exception as e:
        print(f"   ⚠️ Error fetching photos: {e}")
        
    return []

def extract_menu_from_photos(image_urls, name, category, text_context=""):
    if not GEMINI_API_KEY or not image_urls:
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={GEMINI_API_KEY}"
    
    parts = []
    
    prompt = f"""
    Bạn là trợ lý AI chuyên gia phân tích hình ảnh thực đơn nhà hàng (OCR) kết hợp với thông tin văn bản mô tả để tạo danh sách thực đơn CHI TIẾT, ĐẦY ĐỦ VÀ CHÍNH XÁC nhất.
    Tên quán: {name}
    Thể loại: {category}
    
    Thông tin văn bản bổ sung về quán (nếu có mô tả món hoặc review):
    \"\"\"
    {text_context}
    \"\"\"
    
    NHIỆM VỤ CỦA BẠN:
    1. Đọc và nhận dạng TOÀN BỘ tất cả các món ăn, thức uống, món ăn kèm, đồ tráng miệng, combo và giá tiền tương ứng từ hình ảnh thực đơn. Bạn không được tóm tắt hay lược bỏ bất kỳ món nào. Kể cả thực đơn có hàng chục hay hàng trăm món, bạn phải quét và liệt kê đầy đủ từng món một từ tất cả các ảnh được cung cấp.
    2. Kết hợp với các món ăn/đồ uống được liệt kê trong phần "Thông tin văn bản bổ sung" ở trên (nếu có và nếu có giá hoặc ước lượng giá).
    3. Hợp nhất, loại bỏ trùng lặp và chuẩn hóa dữ liệu.
    4. Trả về kết quả là một mảng JSON các đối tượng chứa:
       - "name": Tên món ăn/đồ uống (Viết hoa chữ cái đầu mỗi từ, chuẩn hóa tiếng Việt, sửa lỗi chính tả nhẹ, loại bỏ số thứ tự).
       - "price": Giá tiền (Phải là kiểu NUMBER nguyên. Quy đổi viết tắt như "k", "K", "đ", ".", "," thành số nguyên đầy đủ. Ví dụ: "30k" hoặc "30.000" -> 30000. Nếu không rõ giá hoặc không ghi giá, hãy ước lượng giá hợp lý dựa trên loại quán hoặc để mặc định 35000 cho đồ ăn và 25000 cho đồ uống).
    
    TRẢ VỀ KẾT QUẢ:
    - Chỉ trả về duy nhất 1 mảng JSON chứa các đối tượng có cấu trúc:
    [
      {{
        "name": "Tên Món Ăn",
        "price": 30000
      }}
    ]
    - Không bao gồm bất kỳ văn bản, lời giải thích hay thẻ markdown nào ngoài mảng JSON này.
    """
    
    parts.append({"text": prompt})
    
    valid_images = 0
    for img_url in image_urls:
        base64_data = download_image_as_base64(img_url)
        if base64_data:
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": base64_data
                }
            })
            valid_images += 1
            
    if valid_images == 0:
        print("   ⚠️ No valid menu images could be downloaded. Skipping OCR.")
        return None
        
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    retries = 3
    delay = 1.5
    for attempt in range(retries):
        time.sleep(delay)
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=35) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                text = text.strip()
                
                menu = json.loads(text)
                if isinstance(menu, list) and len(menu) > 0:
                    print(f"   ✨ Gemini OCR successfully extracted {len(menu)} menu items!")
                    return menu
        except Exception as e:
            if "429" in str(e):
                backoff = delay * (2 ** attempt)
                print(f"   ⚠️ Gemini OCR API rate limit hit (429). Retrying in {backoff}s...")
                time.sleep(backoff)
            else:
                print(f"   ⚠️ Gemini OCR attempt {attempt+1} failed: {e}")
                
    return None

def generate_menu_items(name, category):
    """Uses Gemini API to generate a rich, realistic menu for a local food establishment."""
    if not GEMINI_API_KEY:
        print("⚠️ GEMINI_API_KEY not configured, using fallback menu.")
        return get_fallback_menu(category)
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"""
    Hãy tạo một danh sách thực đơn cực kỳ ĐẦY ĐỦ, CHI TIẾT và PHONG PHÚ gồm từ 25 đến 40 món ăn hoặc đồ uống tiêu biểu, thực tế và phổ biến bán tại quán sau ở Việt Nam:
    Tên quán: {name}
    Thể loại: {category}
    
    Yêu cầu trả về định dạng JSON thuần túy dưới dạng một mảng các đối tượng chứa "name" (tên món cụ thể, hấp dẫn, viết hoa chữ cái đầu mỗi từ) và "price" (giá tiền hợp lý, thực tế của quán bình dân hoặc tầm trung ở Việt Nam, là số nguyên, đơn vị VND, ví dụ: 35000, 45000, 120000).
    Chú ý chỉ trả về JSON hợp lệ, không bọc trong thẻ ```json. Không kèm giải thích gì thêm.
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    retries = 3
    delay = 1.5
    for attempt in range(retries):
        time.sleep(delay)
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=25) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                text = text.strip()
                
                menu = json.loads(text)
                if isinstance(menu, list) and len(menu) > 0:
                    return menu
        except Exception as e:
            if "429" in str(e):
                backoff = delay * (2 ** attempt)
                print(f"⚠️ Gemini API rate limit hit (429). Retrying in {backoff}s...")
                time.sleep(backoff)
            else:
                print(f"⚠️ Gemini failed to generate menu for {name}: {e}. Retrying...")
                
    print(f"❌ Failed to generate menu via Gemini for {name} after {retries} attempts. Using detailed fallback.")
    return get_fallback_menu(category)

def get_fallback_menu(category):
    category = (category or "").lower()
    if any(k in category for k in ["cafe", "cà phê", "coffee", "trà sữa", "tea", "juice", "sinh tố"]):
        return [
            {"name": "Bạc xỉu đá cốt dừa", "price": 29000},
            {"name": "Cà phê sữa đá truyền thống", "price": 25000},
            {"name": "Cà phê muối Hola", "price": 32000},
            {"name": "Trà đào cam sả đặc biệt", "price": 39000},
            {"name": "Trà sữa trân châu đường đen", "price": 45000},
            {"name": "Trà sen vàng kem cheese", "price": 49000},
            {"name": "Trà quất mật ong đá", "price": 25000},
            {"name": "Freeze Trà Xanh Highlands", "price": 55000},
            {"name": "Sinh tố bơ sáp sữa dừa", "price": 45000},
            {"name": "Nước cam vắt nguyên chất", "price": 35000}
        ]
    elif any(k in category for k in ["lẩu", "nướng", "hotpot", "bbq", "dê", "bò"]):
        return [
            {"name": "Set Lẩu Thái Thập Cẩm (Vừa)", "price": 280000},
            {"name": "Set Lẩu Gà Lá Giang (Vừa)", "price": 250000},
            {"name": "Ba chỉ bò Mỹ cuộn nấm kim châm (Đĩa)", "price": 79000},
            {"name": "Sườn sụn heo tươi (Đĩa)", "price": 89000},
            {"name": "Bạch tuộc nướng muối ớt", "price": 120000},
            {"name": "Dải sườn heo nướng tảng", "price": 150000},
            {"name": "Viên lẩu thập cẩm tổng hợp", "price": 69000},
            {"name": "Đậu hũ phô mai (Đĩa)", "price": 45000},
            {"name": "Ngô ngọt chiên bơ tỏi", "price": 35000},
            {"name": "Khoai tây chiên lắc phô mai", "price": 35000},
            {"name": "Bia Hà Nội (Lon)", "price": 20000},
            {"name": "Coca Cola lạnh (Lon)", "price": 15000}
        ]
    elif any(k in category for k in ["bún", "phở", "mì", "noodle", "cháo"]):
        return [
            {"name": "Bún đậu mắm tôm thập cẩm đặc biệt", "price": 55000},
            {"name": "Phở bò chín/tái lăn truyền thống", "price": 40000},
            {"name": "Phở bò sốt vang đặc biệt", "price": 45000},
            {"name": "Bún chả Hà Nội nem cua bể", "price": 50000},
            {"name": "Phở gà ta xé phay", "price": 38000},
            {"name": "Bún sườn mọc móng giò", "price": 45000},
            {"name": "Cháo lòng tiết canh trọn bộ", "price": 35000},
            {"name": "Quẩy giòn nóng hổi (Đĩa)", "price": 10000},
            {"name": "Trà đá mát lạnh", "price": 3000}
        ]
    elif any(k in category for k in ["gà", "chicken", "vịt"]):
        return [
            {"name": "Gà ri nướng lu mật ong (Nửa con)", "price": 140000},
            {"name": "Gà ri hấp lá chanh Kinh Bắc (Nửa con)", "price": 130000},
            {"name": "Gà rang muối Hola giòn rụm", "price": 160000},
            {"name": "Lẩu gà hầm ngải cứu sâm đất", "price": 290000},
            {"name": "Cánh gà chiên mắm cay", "price": 75000},
            {"name": "Khoai tây lắc phô mai", "price": 30000},
            {"name": "Xôi nếp nương cốt dừa", "price": 25000},
            {"name": "Coca Cola lon lạnh", "price": 15000}
        ]
    else:
        return [
            {"name": "Cơm rang dưa bò giòn", "price": 45000},
            {"name": "Cơm tấm sườn bì chả đặc biệt", "price": 45000},
            {"name": "Cơm đùi gà xối mỡ giòn bì", "price": 40000},
            {"name": "Cơm rang thập cẩm Dương Châu", "price": 40000},
            {"name": "Mì xào bò rau cải Hola", "price": 40000},
            {"name": "Canh cà chua trứng thịt băm", "price": 20000},
            {"name": "Rau cải mèo xào tỏi thơm", "price": 30000},
            {"name": "Trà chanh đá mát lạnh", "price": 15000},
            {"name": "Nước vối đá giải nhiệt", "price": 5000}
        ]

def main():
    if not SERPAPI_API_KEY:
        print("❌ SERPAPI_API_KEY is missing! Cannot run scraper.")
        return

    # Expand queries to find significantly more diverse food and drink spots in Hoa Lac
    queries = [
        "quán ăn ngon Hoà Lạc", 
        "nhà hàng Hoà Lạc", 
        "bún phở Hoà Lạc", 
        "quán cafe trà sữa Hoà Lạc",
        "lẩu nướng lẩu đuôi bò Hoà Lạc",
        "gà ri Hoà Lạc",
        "ăn vặt bánh mỳ bánh xèo Hoà Lạc",
        "cơm văn phòng cơm rang Hoà Lạc",
        "quán bia quán nhậu Hoà Lạc"
    ]
    raw_results = []
    
    for q in queries:
        places = search_google_maps(q)
        print(f"Found {len(places)} places for query '{q}'")
        raw_results.extend(places)
        
    seen_names = set()
    scraped_vendors = []
    
    for place in raw_results:
        if not isinstance(place, dict):
            continue
        name = place.get("title")
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())
        
        gps = place.get("gps_coordinates") or {}
        lat = gps.get("latitude")
        lng = gps.get("longitude")
        
        # Fallback coordinates for Hoa Lac area if missing
        if lat is None or lng is None:
            lat = 21.013 + (hash(name) % 100) / 10000.0
            lng = 105.526 + (hash(name) % 100) / 10000.0
            
        category = place.get("type") or "Quán ăn"
        address = place.get("address") or "Khu công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội"
        rating = place.get("rating")
        phone = place.get("phone")
        
        # Format tags
        tags = [category.lower(), "hoalac"]
        if "cà phê" in category.lower() or "cafe" in category.lower() or "tea" in category.lower() or "trà" in category.lower():
            tags.append("drinks")
        else:
            tags.append("food")
            
        # Build text context from description, service options, reviews etc.
        context_parts = []
        if place.get("description"):
            context_parts.append(f"Mô tả: {place['description']}")
        
        reviews_data = place.get("reviews")
        if isinstance(reviews_data, list):
            review_texts = []
            for r in reviews_data:
                if isinstance(r, dict) and r.get("snippet"):
                    review_texts.append(r["snippet"])
                elif isinstance(r, str):
                    review_texts.append(r)
            if review_texts:
                context_parts.append("Đánh giá khách hàng: " + " | ".join(review_texts))
                
        if place.get("extensions") and isinstance(place["extensions"], list):
            ext_strs = []
            for e in place["extensions"]:
                if isinstance(e, dict):
                    ext_strs.append(str(e.get("text", e)))
                else:
                    ext_strs.append(str(e))
            context_parts.append("Thông tin thêm: " + ", ".join(ext_strs))
            
        text_context = "\n".join(context_parts)
            
        # Fetch photo URLs
        photo_urls = []
        data_id = place.get("data_id")
        if data_id:
            print(f"🔍 Fetching menu photos for '{name}'...")
            photo_urls = fetch_menu_photos(data_id)
        
        vendor = {
            "id": name.lower().replace(" ", "-").replace("/", "-").replace("&", "and").replace("'", "").replace(",", "").replace(".", ""),
            "name": name,
            "category": category,
            "address": address,
            "district": "Thạch Thất",
            "rating": float(rating) if rating else 4.0,
            "latitude": float(lat),
            "longitude": float(lng),
            "phone": phone,
            "tags": tags,
            "tips": f"Quán được đánh giá {rating} sao trên Google Maps." if rating else "Quán ăn tiện lợi khu vực Hola.",
            "photo_urls": photo_urls,
            "text_context": text_context,
            "menu": []
        }
        print(f"Scraped & Geocoded metadata: {name} (Photos found: {len(photo_urls)})")
        scraped_vendors.append(vendor)
        
        # Small delay between SerpAPI requests to avoid rate issues
        time.sleep(0.5)
        
    output_path = Path(__file__).parent / "temp_scraped_vendors.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scraped_vendors, f, ensure_ascii=False, indent=2)
        
    print(f"🎉 Successfully scraped metadata for {len(scraped_vendors)} vendors and saved to {output_path}")

if __name__ == "__main__":
    main()
