import os
import re
import csv
import sys
import time
import urllib.parse
import urllib.request
import json
import base64
import subprocess
from pathlib import Path

# Add current folder to path
sys.path.append(str(Path(__file__).parent))
sys.stdout.reconfigure(encoding='utf-8')

from facebook_scraper import FacebookScraper
from config import FACEBOOK_GROUP_SLUGS

# Hola Center coordinates default fallback
HOLA_LAT = 21.01354
HOLA_LNG = 105.52522

# Get Gemini Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def geocode_osm(vendor_name):
    """
    Query Nominatim OpenStreetMap for vendor coordinates in Hoa Lac.
    """
    clean_name = re.sub(r'["\']', '', vendor_name).strip()
    query = f"{clean_name} Hoa Lac Thach That Hanoi"
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
    
    headers = {
        "User-Agent": "HolaMateFBGeocoder/1.0 (ducnguyenha0810@gmail.com)"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        time.sleep(1.0) # Rate limit compliance
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lng = float(data[0]['lon'])
                addr = data[0]['display_name']
                print(f"🗺️  Geocoded: '{vendor_name}' -> {lat}, {lng}")
                return lat, lng, addr
    except Exception as e:
        print(f"⚠️  Could not geocode '{vendor_name}' via OSM: {e}")
    
    # Fallback to slightly offset coordinates around campus
    import random
    offset_lat = HOLA_LAT + random.uniform(-0.005, 0.005)
    offset_lng = HOLA_LNG + random.uniform(-0.005, 0.005)
    return round(offset_lat, 5), round(offset_lng, 5), "Hòa Lạc, Thạch Thất, Hà Nội"

def download_image_as_base64(img_url):
    """
    Download a Facebook image and return (base64_data, mime_type).
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        req = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            img_data = resp.read()
            # Save a local archive of the menu image for verification
            img_dir = Path(__file__).parent.parent.parent / "backend" / "data_import" / "menu_images"
            img_dir.mkdir(parents=True, exist_ok=True)
            
            # Create a simple safe filename
            safe_name = f"menu_{int(time.time())}_{hash(img_url) % 10000}.jpg"
            local_path = img_dir / safe_name
            with open(local_path, "wb") as f:
                f.write(img_data)
            
            b64_str = base64.b64encode(img_data).decode('utf-8')
            return b64_str, "image/jpeg", local_path
    except Exception as e:
        print(f"⚠️  Lỗi tải ảnh {img_url[:40]}...: {e}")
        return None, None, None

def analyze_post_with_gemini(post_text, image_b64=None, mime_type=None):
    """
    Uses Gemini 1.5 Flash Multimodal API to parse the post text and OCR the menu image.
    """
    if not GEMINI_API_KEY:
        print("⚠️  Chưa cấu hình GEMINI_API_KEY trong .env. Bỏ qua phân tích AI.")
        return None

    prompt = (
        "Bạn là trợ lý AI bóc tách thực đơn quán ăn tại Hòa Lạc từ bài đăng Facebook.\n"
        "Nhiệm vụ:\n"
        "1. Đọc văn bản bài đăng (post text) và quét hình ảnh thực đơn/bảng giá đính kèm (nếu có).\n"
        "2. Trích xuất cấu trúc quán ăn gồm:\n"
        "   - Tên quán (name): Tên chính xác, rõ ràng.\n"
        "   - Danh mục (category): Chọn 'Cafe' hoặc 'Ăn uống'.\n"
        "   - Giá thấp nhất (priceMin) & Giá cao nhất (priceMax).\n"
        "   - Thực đơn chi tiết (menu): Một danh sách món và giá dưới dạng số nguyên (Ví dụ: [{\"name\": \"Trà đào\", \"price\": 25000}]).\n"
        "   - Đánh giá (reviews): Mảng chứa tối đa 3 câu đánh giá khách quan rút ra từ nội dung bài đăng/comments.\n"
        "Hãy trả về duy nhất một chuỗi JSON hợp lệ theo định dạng sau (không markdown, không bọc ```json):\n"
        "{\n"
        "  \"name\": \"Tên quán\",\n"
        "  \"category\": \"Cafe hoặc Ăn uống\",\n"
        "  \"priceMin\": 20000,\n"
        "  \"priceMax\": 100000,\n"
        "  \"menu\": [{\"name\": \"Món A\", \"price\": 25000}],\n"
        "  \"reviews\": [\"Đánh giá 1\", \"Đánh giá 2\"]\n"
        "}"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    # Construct Gemini multimodal parts
    parts = []
    
    # Text instruction + post text content
    parts.append({"text": f"{prompt}\n\nNỘI DUNG BÀI ĐĂNG FACEBOOK:\n{post_text}"})
    
    # Image part if base64 is available
    if image_b64 and mime_type:
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": image_b64
            }
        })
        
    payload = {
        "contents": [{
            "parts": parts
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=25) as response:
            resp_data = json.loads(response.read().decode('utf-8'))
            candidate = resp_data['candidates'][0]['content']['parts'][0]['text']
            # Clean possible markdown wrapping
            candidate = re.sub(r'^```json\s*|\s*```$', '', candidate.strip())
            return json.loads(candidate)
    except Exception as e:
        print(f"⚠️  Gemini API bóc tách lỗi: {e}")
        return None

def run():
    print("🚀 Bắt đầu quét dữ liệu & OCR menu ảnh từ Facebook Groups Hòa Lạc...")
    
    cookie = os.getenv("FACEBOOK_COOKIE", "")
    if not cookie:
        print("⚠️  CẢNH BÁO: Chưa cấu hình FACEBOOK_COOKIE trong .env.")
        print("👉 Script sẽ chạy ở chế độ công khai (không đăng nhập), kết quả có thể bị giới hạn.")
    
    scraper = FacebookScraper()
    
    # To run a realistic demo, we can crawl group pages.
    # The FacebookScraper returns article objects which we can enrich with Gemini OCR.
    print(f"📡 Đang tải các bài đăng từ các nhóm: {FACEBOOK_GROUP_SLUGS}...")
    
    # Fetch using the scraper client
    posts = []
    for slug in FACEBOOK_GROUP_SLUGS:
        html = scraper._fetch_group_page(slug)
        group_posts = scraper._parse_posts_from_html(html, slug)
        posts.extend(group_posts)
        
    if not posts:
        print("❌ Không tìm thấy bài đăng nào mới. Hãy bổ sung cookie vào file cấu hình để cào bài đăng.")
        return
        
    print(f"📊 Tìm thấy {len(posts)} bài viết. Tiến hành tải ảnh và bóc tách menu bằng Gemini AI...")

    # Load existing CSV file names to check duplicate
    csv_path = Path(__file__).parent.parent.parent / "backend" / "data_import" / "vendors_template.csv"
    existing_vendors = set()
    
    if csv_path.exists():
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None) # Skip headers
            for row in reader:
                if row:
                    existing_vendors.add(row[0].strip().lower())

    new_rows_count = 0
    
    with open(csv_path, mode='a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        
        for post in posts:
            post_content = post.content or ""
            if len(post_content.strip()) < 15:
                continue
                
            print(f"\n📝 Phân tích bài đăng của {post.author_name or 'Ẩn danh'}...")
            
            # Fetch the first image (commonly the menu card)
            img_b64 = None
            mime_type = None
            local_img_path = None
            if post.images:
                print(f"🖼️  Đang tải ảnh menu: {post.images[0][:50]}...")
                img_b64, mime_type, local_img_path = download_image_as_base64(post.images[0])
                if local_img_path:
                    print(f"💾 Đã lưu ảnh menu cục bộ: {local_img_path.name}")
            
            # Query Gemini to extract everything
            data = analyze_post_with_gemini(post_content, img_b64, mime_type)
            
            if not data or not data.get("name"):
                print("⚠️  AI không trích xuất được thông tin quán ăn hợp lệ từ bài đăng này.")
                continue
                
            vendor_name = data["name"].strip()
            name_key = vendor_name.lower()
            
            if name_key in existing_vendors:
                print(f"ℹ️  Bỏ qua quán '{vendor_name}' vì đã tồn tại trong file CSV.")
                continue
                
            print(f"✨ Phát hiện quán mới: '{vendor_name}' ({data.get('category')})")
            
            # Geocode via Nominatim
            lat, lng, address = geocode_osm(vendor_name)
            
            # Format menu
            menu_items = data.get("menu", [])
            menu_str = ";".join([f"{item['name']}:{item['price']}" for item in menu_items if 'name' in item and 'price' in item])
            if not menu_str:
                menu_str = "Món Đặc Biệt:35000;Đồ Uống Kèm:15000"
                
            # Format reviews
            reviews = data.get("reviews", [])
            reviews_str = " | ".join(reviews) if reviews else "Được chia sẻ trên nhóm review ẩm thực Hòa Lạc."
            
            # Write to CSV
            row = [
                vendor_name,
                data.get("category", "Ăn uống"),
                lat,
                lng,
                address or "Hòa Lạc, Thạch Thất, Hà Nội",
                data.get("priceMin", 15000),
                data.get("priceMax", 120000),
                4.5,
                menu_str,
                "Bóc tách bằng Gemini Multimodal OCR từ ảnh menu Facebook.",
                reviews_str
            ]
            writer.writerow(row)
            existing_vendors.add(name_key)
            new_rows_count += 1
            print(f"✅ Đã thêm quán '{vendor_name}' vào file CSV database.")

    print(f"\n💾 Đồng bộ thành công {new_rows_count} quán ăn mới bóc tách từ ảnh Facebook vào file CSV!")

    # Run Node database sync script
    node_script_path = Path(__file__).parent.parent.parent / "backend" / "data_import" / "import_csv.js"
    print("🔄 Chạy Node database seeder...")
    try:
        subprocess.run(["node", str(node_script_path)], check=True)
        print("✅ Đồng bộ cơ sở dữ liệu và file cục bộ hoàn tất!")
    except Exception as e:
        print(f"❌ Chạy Node importer thất bại: {e}")

if __name__ == "__main__":
    run()
