import os
import re
import csv
import sys
import time
import json
import base64
import random
import urllib.parse
import urllib.request
import subprocess
from pathlib import Path
from dotenv import load_dotenv

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Force UTF-8 on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

# Paths
ROOT_DIR = Path(__file__).parent.parent.parent
BACKEND_ENV_PATH = ROOT_DIR / "backend" / ".env"
CSV_PATH = ROOT_DIR / "backend" / "data_import" / "vendors_template.csv"
CHROME_PROFILE_DIR = Path(__file__).parent / "chrome_profile"

# Load env variables
if BACKEND_ENV_PATH.exists():
    load_dotenv(BACKEND_ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
VIETMAP_API_KEY = os.getenv("VIETMAP_API_KEY", "")

# Facebook Groups
GROUP_URLS = [
    "https://www.facebook.com/groups/966715394202687?locale=vi_VN",
    "https://www.facebook.com/groups/1301677703935713?locale=vi_VN",
    "https://www.facebook.com/groups/fuhoalacc?locale=vi_VN",
    "https://www.facebook.com/groups/hoalacfu?locale=vi_VN",
    "https://www.facebook.com/groups/1440203522931298?locale=vi_VN",
    "https://www.facebook.com/groups/711074033824564?locale=vi_VN",
    "https://www.facebook.com/groups/2628117447444518?locale=vi_VN",
    "https://www.facebook.com/groups/2000474166996642?locale=vi_VN",
    "https://www.facebook.com/groups/752407209225812?locale=vi_VN"
]

# Coordinates
HOLA_LAT = 21.01354
HOLA_LNG = 105.52522

def update_env_cookie(cookie_str):
    """Save the cookies string to the backend .env file."""
    if not BACKEND_ENV_PATH.exists():
        print(f"❌ File .env không tồn tại tại: {BACKEND_ENV_PATH}")
        return
        
    content = BACKEND_ENV_PATH.read_text(encoding='utf-8')
    if "FACEBOOK_COOKIE" in content:
        content = re.sub(r'FACEBOOK_COOKIE\s*=.*', f'FACEBOOK_COOKIE="{cookie_str}"', content)
    else:
        content += f'\nFACEBOOK_COOKIE="{cookie_str}"\n'
    BACKEND_ENV_PATH.write_text(content, encoding='utf-8')
    print("✅ Đã lưu/Cập nhật FACEBOOK_COOKIE vào file .env!")

def setup_driver(headless=False):
    """Configure and initialize Chrome Driver with persistent profile."""
    print("🌐 Khởi động Chrome WebDriver...")
    chrome_options = Options()
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR.absolute()}")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    if headless:
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-dev-shm-usage")
    
    # Avoid bot detection
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    
    # Initialize service and driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.maximize_window()
    return driver

def verify_login(driver):
    """Check if logged in, or prompt manual login."""
    print("🔗 Kiểm tra trạng thái đăng nhập Facebook...")
    driver.get("https://www.facebook.com/")
    time.sleep(4)
    
    cookies = driver.get_cookies()
    is_logged_in = any(c['name'] == 'c_user' for c in cookies)
    
    if not is_logged_in:
        print("🔑 Không tìm thấy phiên đăng nhập cũ.")
        # Try automatic login if credentials exist in env or helper
        email = os.getenv("FACEBOOK_EMAIL", "ducnguyenha0810@gmail.com")
        password = os.getenv("FACEBOOK_PASSWORD", "anhtuan22082004")
        
        try:
            email_field = driver.find_elements(By.ID, "email")
            pass_field = driver.find_elements(By.ID, "pass")
            
            if email_field and pass_field:
                print("⌨️  Điền tài khoản và mật khẩu...")
                email_field[0].clear()
                email_field[0].send_keys(email)
                pass_field[0].clear()
                pass_field[0].send_keys(password)
                pass_field[0].send_keys(Keys.ENTER)
                time.sleep(5)
        except Exception as e:
            print(f"⚠️  Không thể tự điền form đăng nhập: {e}")
            
        # Poll and wait for manual user intervention (2FA/approval)
        print("\n⚠️  FACEBOOK YÊU CẦU ĐĂNG NHẬP / XÁC THỰC 2FA / PHÊ DUYỆT THIẾT BỊ.")
        print("👉 Vui lòng thực hiện đăng nhập trên cửa sổ Chrome đang mở.")
        print("👉 Sau khi đăng nhập thành công và nhìn thấy trang chủ Facebook, hãy quay lại đây và nhấn ENTER để tiếp tục...")
        input("👉 Nhấn phím ENTER để tiếp tục...")
        
        cookies = driver.get_cookies()
        is_logged_in = any(c['name'] == 'c_user' for c in cookies)
        
        if not is_logged_in:
            print("⚠️  Vẫn chưa phát hiện thấy phiên đăng nhập. Vui lòng đăng nhập lại trên Chrome...")
            input("👉 Nhấn phím ENTER lần nữa để kiểm tra lại...")
            cookies = driver.get_cookies()
            is_logged_in = any(c['name'] == 'c_user' for c in cookies)
            
        if not is_logged_in:
            raise Exception("❌ Không thể xác nhận trạng thái đăng nhập Facebook. Tiến trình bị hủy.")
            
    print("🎉 Facebook đã đăng nhập thành công!")
    
    # Try to dismiss messenger PIN dialog right after login
    try:
        # Import By if not present, but it's already there
        btns = driver.find_elements(By.XPATH, "//*[contains(text(), 'Tạm bỏ qua') or contains(text(), 'Not now') or contains(text(), 'Tạm bỏ')]")
        if btns:
            print("💬 Phát hiện hộp thoại Messenger PIN. Đang nhấp 'Tạm bỏ qua'...")
            driver.execute_script("arguments[0].click();", btns[0])
            time.sleep(2)
    except:
        pass

    # Get cookie string
    cookies = driver.get_cookies()
    cookie_parts = [f"{c['name']}={c['value']}" for c in cookies]
    cookie_str = "; ".join(cookie_parts)
    update_env_cookie(cookie_str)
    return cookie_str

def dismiss_messenger_pin_dialog(driver):
    """Dismiss Messenger PIN restore dialog if visible."""
    try:
        btns = driver.find_elements(By.XPATH, "//*[contains(text(), 'Tạm bỏ qua') or contains(text(), 'Not now') or contains(text(), 'Tạm bỏ')]")
        if btns:
            print("💬 Phát hiện hộp thoại Messenger PIN. Đang nhấp 'Tạm bỏ qua'...")
            driver.execute_script("arguments[0].click();", btns[0])
            time.sleep(2)
            return True
    except Exception as e:
        print(f"⚠️  Lỗi khi bỏ qua thông báo Messenger PIN: {e}")
    return False

def get_group_path_segment(url):
    """Extract path like /groups/966715394202687 or /groups/fuhoalacc."""
    match = re.search(r"(/groups/[^/?#]+)", url)
    return match.group(1) if match else "/groups/"

def select_discussion_tab(driver, group_url):
    """Ensure the 'Thảo luận' (Discussion) tab is active in the group view."""
    try:
        # Dismiss overlays/notifications dropdowns by hitting ESCAPE
        try:
            driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
            time.sleep(1)
        except:
            pass
            
        group_path = get_group_path_segment(group_url)
        
        # First, search for elements with role="tab" or inside tablists
        tabs = driver.find_elements(By.XPATH, f"//div[@role='tablist']//a[contains(@href, '{group_path}')] | //a[@role='tab' and contains(@href, '{group_path}')]")
        
        for tab in tabs:
            try:
                href = tab.get_attribute("href") or ""
                # Exclude non-discussion suffixes
                non_discussion = ['/media', '/files', '/events', '/members', '/about', '/rules', '/rooms', '/announcements', '/featured']
                is_discussion = not any(suffix in href.lower() for suffix in non_discussion)
                
                if is_discussion and tab.is_displayed():
                    driver.execute_script("arguments[0].click();", tab)
                    print(f"👉 Đã nhấp vào tab thảo luận nhóm qua link: {href}")
                    time.sleep(5)
                    return True
            except:
                pass
                
        # If we are stuck on the Media tab, the tablist is missing. Look for the group title link to go home.
        group_home_links = driver.find_elements(By.XPATH, f"//a[contains(@href, '{group_path}') and (text() != '' or @role='link')]")
        for link in group_home_links:
            try:
                href = link.get_attribute("href") or ""
                # Exclude sub-pages to get the base group link
                non_discussion = ['/media', '/files', '/events', '/members', '/about', '/rules', '/rooms', '/announcements', '/featured']
                is_discussion = not any(suffix in href.lower() for suffix in non_discussion)
                if is_discussion and link.is_displayed():
                    driver.execute_script("arguments[0].click();", link)
                    print(f"👉 Đã nhấp vào link tiêu đề nhóm để chuyển về Thảo luận: {href}")
                    time.sleep(5)
                    return True
            except:
                pass

        # Fallback to text matching within the main layout area
        links = driver.find_elements(By.XPATH, f"//div[@role='main']//*[text()='Thảo luận' or text()='Discussion']")
        for link in links:
            try:
                if link.is_displayed():
                    target = link
                    if link.tag_name != 'a':
                        try:
                            target = link.find_element(By.XPATH, "./ancestor::a[1]")
                        except:
                            pass
                    driver.execute_script("arguments[0].click();", target)
                    print("👉 Đã nhấp vào tab 'Thảo luận' (Discussion) qua text trong role='main'!")
                    time.sleep(5)
                    return True
            except:
                pass
    except Exception as e:
        print(f"⚠️ Không thể click chuyển tab Thảo luận: {e}")
    return False

def expand_elements(driver):
    """Find and expand 'See more' and first-level comments in loaded feed."""
    print("🔄 Đang mở rộng các bài đăng và bình luận ẩn...")
    
    # 1. Expand "Xem thêm" text
    see_mores = driver.find_elements(By.XPATH, "//div[@role='button' and (text()='Xem thêm' or text()='See more' or contains(text(), 'Xem thêm'))]")
    for btn in see_mores[:20]: # limit to avoid hanging
        try:
            driver.execute_script("arguments[0].click();", btn)
            time.sleep(0.3)
        except:
            pass
            
    # 2. Expand comments (Click 'Xem thêm bình luận' or similar button)
    comment_btns = driver.find_elements(By.XPATH, "//span[contains(text(), 'Xem thêm bình luận') or contains(text(), 'Xem tất cả') or contains(text(), 'View more comments') or contains(text(), 'bình luận trước')]")
    for btn in comment_btns[:15]:
        try:
            driver.execute_script("arguments[0].click();", btn)
            time.sleep(0.5)
        except:
            pass

def crawl_group(driver, group_url, max_posts=15):
    """Navigate to group feed, scroll, and scrape posts details."""
    print(f"\n📡 Đang quét nhóm: {group_url}...")
    driver.get(group_url)
    time.sleep(3)
    print(f"👉 URL sau khi tải lần 1: {driver.current_url}")
    
    # Reset SPA route state for each group to ensure clean landing on Discussion
    try:
        driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
        time.sleep(0.5)
        driver.refresh()
        time.sleep(5)
        print(f"👉 URL sau khi refresh: {driver.current_url}")
    except Exception as e:
        print(f"⚠️  Lỗi khi clear/refresh: {e}")
        
    print(f"   Tiêu đề trang hiện tại: {driver.title}")
    
    # Dismiss blocking dialogs
    dismiss_messenger_pin_dialog(driver)
    
    # Switch to Discussion tab if not already there
    select_discussion_tab(driver, group_url)
    
    # Explicit wait for feed to load
    print("   Chờ feed tải dữ liệu bài viết...")
    for attempt in range(15):
        articles = driver.find_elements(By.XPATH, "//div[@role='article']")
        # Check if any article actually contains visible text (to ignore loading skeleton widgets)
        real_articles = [a for a in articles if a.text and len(a.text.strip()) > 50]
        if real_articles:
            print(f"   Feed đã tải xong sau {attempt+1} giây (phát hiện {len(real_articles)} bài viết thực tế).")
            break
        time.sleep(1)
        
    # Scroll to load feed
    scrolls = int(max_posts / 3) + 1
    for i in range(scrolls):
        print(f"   Scroll feed ({i+1}/{scrolls})...")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3.5)
        # Dismiss PIN dialog periodically if it pops up during scroll
        if i % 2 == 0:
            dismiss_messenger_pin_dialog(driver)
        
    # Expand hidden texts/comments
    expand_elements(driver)
    
    # Get post articles on Desktop Layout
    posts_elements = driver.find_elements(By.XPATH, "//div[@role='article']")
    
    # Fallback 1: Children of role="feed" container
    if not posts_elements:
        feed = driver.find_elements(By.XPATH, "//div[@role='feed']")
        if feed:
            posts_elements = feed[0].find_elements(By.XPATH, "./div")
            
    # Fallback 2: data-ad-preview messages parents
    if not posts_elements:
        posts_elements = driver.find_elements(By.CSS_SELECTOR, "div[data-ad-preview='message']")
        new_posts = []
        for p in posts_elements:
            try:
                parent = p.find_element(By.XPATH, "./ancestor::div[@role='article' or contains(@class, 'userContentWrapper')][1]")
                if parent not in new_posts:
                    new_posts.append(parent)
            except:
                pass
        posts_elements = new_posts
        
    # Extract outerHTML of all elements immediately to prevent stale reference errors
    post_htmls = []
    for p in posts_elements:
        try:
            html = p.get_attribute("outerHTML")
            if html:
                post_htmls.append(html)
        except:
            pass
            
    print(f"   Lấy được HTML của {len(post_htmls)} khối bài viết để phân tích.")
    
    from bs4 import BeautifulSoup
    scraped_posts = []
    
    for idx, html in enumerate(post_htmls):
        try:
            soup = BeautifulSoup(html, "html.parser")
            full_text = soup.get_text(separator=" ") or ""
            text_len = len(full_text.strip())
            
            # Filter empty skeleton articles
            if text_len < 50:
                continue
                
            # Exclude menu items
            if "Đóng" in full_text[:15] or "Chia sẻ" in full_text[:10] and len(full_text) < 100:
                continue
                
            # Extract image URLs
            images = []
            for img in soup.find_all("img"):
                src = img.get("src")
                if src and "scontent" in src:
                    # Ignore common small icons/emojis in url
                    if "emoji" not in src.lower() and "rsrc.php" not in src.lower():
                        images.append(src)
            unique_images = list(dict.fromkeys(images))
            
            # Post link / ID finder
            post_id = f"post_{int(time.time())}_{idx}"
            for link in soup.find_all("a"):
                href = link.get("href") or ""
                id_match = re.search(r"(?:story_fbid=|permalink/|posts/)(\d+)", href)
                if id_match:
                    post_id = id_match.group(1)
                    break
            
            print(f"      [Post {len(scraped_posts)}] Đã quét thành công: ID {post_id}, {text_len} ký tự, {len(unique_images)} ảnh")
            scraped_posts.append({
                "post_id": post_id,
                "text": full_text,
                "images": unique_images
            })
            
            # Stop if we have reached max_posts
            if len(scraped_posts) >= max_posts:
                break
        except Exception as e:
            continue

    # Save page source and screenshot for debugging if 0 blocks found
    if not scraped_posts:
        debug_path = Path(__file__).parent / "debug_page.html"
        screenshot_path = Path(__file__).parent / "debug_screenshot.png"
        try:
            with open(debug_path, "w", encoding="utf-8") as df:
                df.write(driver.page_source)
            driver.save_screenshot(str(screenshot_path))
            print(f"⚠️  Phát hiện 0 bài đăng. Đã lưu debug_page.html và debug_screenshot.png")
        except Exception as de:
            print(f"⚠️  Không thể lưu thông tin debug: {de}")
            
    print(f"✅ Thu thập thành công {len(scraped_posts)} bài đăng từ nhóm.")
    return scraped_posts

def download_image_as_base64(img_url):
    """Download image and return base64 string + mime type + local path."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        req = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            img_data = resp.read()
            img_dir = ROOT_DIR / "backend" / "data_import" / "menu_images"
            img_dir.mkdir(parents=True, exist_ok=True)
            
            safe_name = f"fb_{int(time.time())}_{hash(img_url) % 1000}.jpg"
            local_path = img_dir / safe_name
            with open(local_path, "wb") as f:
                f.write(img_data)
                
            b64_str = base64.b64encode(img_data).decode('utf-8')
            return b64_str, "image/jpeg", local_path
    except Exception as e:
        print(f"⚠️  Lỗi tải ảnh {img_url[:40]}: {e}")
        return None, None, None

def analyze_post_with_gemini(post_text, image_b64=None, mime_type=None):
    """Call Gemini 1.5 Flash API to extract food vendor data."""
    if not GEMINI_API_KEY:
        print("⚠️  Chưa cấu hình GEMINI_API_KEY trong .env. Bỏ qua phân tích AI.")
        return None
        
    prompt = (
        "Bạn là trợ lý AI chuyên nghiệp phân tích bài đăng Facebook và bình luận về ẩm thực tại khu vực Hòa Lạc (Thạch Thất, Hà Nội).\n"
        "Nhiệm vụ:\n"
        "1. Đọc văn bản bài đăng (bao gồm cả nội dung bài viết và phần bình luận bên dưới) và quét ảnh thực đơn/quán ăn (nếu có).\n"
        "2. Xác định xem bài đăng có giới thiệu, review hoặc quảng cáo một quán ăn, quán cafe hoặc tiệm đồ uống cụ thể ở khu vực Hòa Lạc hay không.\n"
        "3. Nếu CÓ, hãy trích xuất thông tin chi tiết dưới dạng JSON gồm:\n"
        "   - name: Tên quán (Chuẩn hóa viết hoa chữ cái đầu, rõ ràng, không kèm ký hiệu lạ).\n"
        "   - category: Phân loại quán, chọn một trong hai giá trị duy nhất: 'Cafe' hoặc 'Ăn uống'.\n"
        "   - addressHint: Gợi ý địa chỉ từ bài viết/bình luận (Ví dụ: 'Hồ Tân Xã', 'Cổng trường Đại học FPT', 'Thôn 3 Bình Yên'). Nếu không nhắc tới địa chỉ, hãy ghi trống.\n"
        "   - priceMin: Giá thấp nhất dự đoán trong menu (VNĐ).\n"
        "   - priceMax: Giá cao nhất dự đoán trong menu (VNĐ).\n"
        "   - menu: Thực đơn món ăn kèm giá tiền, định dạng là danh sách JSON [{\"name\": \"Tên món\", \"price\": giá_tiền}]. Hãy quét kỹ trên ảnh hoặc trong văn bản.\n"
        "   - tips: 1 mẹo nhỏ hoặc tóm tắt điểm đặc trưng nhất của quán từ bài đăng (tối đa 15 từ).\n"
        "   - reviews: Mảng chứa tối đa 3 câu đánh giá khách quan rút ra từ nội dung bài đăng/bình luận (Ví dụ: [\"Đồ ăn ngon giá rẻ\", \"Phục vụ hơi chậm lúc đông\"])\n"
        "Hãy trả về duy nhất một chuỗi JSON hợp lệ theo định dạng sau (không markdown, không bọc ```json):\n"
        "{\n"
        "  \"name\": \"Tên quán\",\n"
        "  \"category\": \"Cafe hoặc Ăn uống\",\n"
        "  \"addressHint\": \"Hồ Tân Xã\",\n"
        "  \"priceMin\": 25000,\n"
        "  \"priceMax\": 120000,\n"
        "  \"menu\": [{\"name\": \"Trà chanh\", \"price\": 15000}],\n"
        "  \"tips\": \"Nổi tiếng cà phê muối ngậy béo\",\n"
        "  \"reviews\": [\"Review 1\", \"Review 2\"]\n"
        "}\n"
        "Nếu bài viết KHÔNG liên quan tới quán ăn/cà phê nào cụ thể hoặc thông tin quá sơ sài, hãy trả về chuỗi JSON rỗng: {}"
    )
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
    parts = [{"text": f"{prompt}\n\nNỘI DUNG BÀI ĐĂNG & BÌNH LUẬN FACEBOOK:\n{post_text}"}]
    
    if image_b64 and mime_type:
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": image_b64
            }
        })
        
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_data = json.loads(response.read().decode('utf-8'))
                candidate = resp_data['candidates'][0]['content']['parts'][0]['text']
                candidate = re.sub(r'^```json\s*|\s*```$', '', candidate.strip())
                # Add a delay between calls to respect rate limits
                time.sleep(6.0)
                return json.loads(candidate)
        except Exception as e:
            is_429 = hasattr(e, "code") and e.code == 429
            if is_429 and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 30
                print(f"⚠️  Gemini API bị giới hạn tần suất (429). Thử lại sau {wait_time} giây...")
                time.sleep(wait_time)
                continue
                
            print(f"⚠️  Gemini API phân tích lỗi (Lần thử {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
                continue
            return None

def geocode_location(vendor_name, address_hint):
    """Geocode vendor location using VietMap Search API or OSM Nominatim."""
    # Build query
    clean_name = re.sub(r'["\']', '', vendor_name).strip()
    query = f"{clean_name} {address_hint}".strip()
    
    # Try VietMap Geocode Search first if API key is present
    if VIETMAP_API_KEY:
        try:
            # Query VietMap Place Search API
            # https://api.vietmap.vn/v2/search
            enc_query = urllib.parse.quote(f"{query} Thạch Thất Hà Nội")
            url = f"https://api.vietmap.vn/v2/search?q={enc_query}&key={VIETMAP_API_KEY}&limit=1"
            
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get("data") or data.get("results") or []
                if results and len(results) > 0:
                    first = results[0]
                    # Check latitude/longitude
                    lat = first.get("lat") or first.get("latitude")
                    lng = first.get("lng") or first.get("longitude") or first.get("lon")
                    addr = first.get("address") or first.get("display_name") or first.get("formatted_address")
                    if lat and lng:
                        print(f"🗺️  VietMap Geocoded: '{vendor_name}' -> {lat}, {lng}")
                        return float(lat), float(lng), addr
        except Exception as e:
            print(f"⚠️  Lỗi VietMap search: {e}. Chuyển sang OSM...")

    # Fallback to OpenStreetMap Nominatim
    search_queries = [
        f"{clean_name} Hòa Lạc Thạch Thất Hà Nội",
        f"{clean_name} Thạch Thất Hà Nội",
        f"{address_hint} Hòa Lạc Thạch Thất Hà Nội" if address_hint else None
    ]
    
    for q in search_queries:
        if not q:
            continue
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(q)}&format=json&limit=1"
            headers = {"User-Agent": "HanoMateScraper/2.0 (ducnguyenha0810@gmail.com)"}
            req = urllib.request.Request(url, headers=headers)
            time.sleep(1.2) # Rate limit compliance
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                if data and len(data) > 0:
                    lat = float(data[0]['lat'])
                    lng = float(data[0]['lon'])
                    addr = data[0]['display_name']
                    print(f"🗺️  OSM Geocoded: '{vendor_name}' -> {lat}, {lng}")
                    return lat, lng, addr
        except Exception as e:
            continue
            
    # Hard fallback to randomized location around FPT campus
    print(f"🗺️  Không thể định vị '{vendor_name}', tạo tọa độ ngẫu nhiên quanh trường...")
    import random
    offset_lat = HOLA_LAT + random.uniform(-0.006, 0.006)
    offset_lng = HOLA_LNG + random.uniform(-0.006, 0.006)
    addr = f"{address_hint or 'Hòa Lạc'}, Thạch Thất, Hà Nội"
    return round(offset_lat, 5), round(offset_lng, 5), addr

def deduplicate_csv():
    """Read CSV, group by vendor name, keep best record and write back."""
    print("🧹 Tiến hành làm sạch và khử trùng lặp file CSV...")
    if not CSV_PATH.exists():
        return
        
    rows = []
    with open(CSV_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        for r in reader:
            if r:
                rows.append(r)
                
    if not headers or not rows:
        return
        
    # Group by normalized name
    unique_vendors = {}
    for r in rows:
        name = r[0].strip()
        norm_name = name.lower()
        
        # Merge menu items if duplicate found
        if norm_name in unique_vendors:
            existing = unique_vendors[norm_name]
            # Keep the row with coords if existing lacks it
            try:
                lat_exist = float(existing[2])
                lat_new = float(r[2])
                # If existing coordinates are just default HOLA campus and new coordinates are different, replace
                if abs(lat_exist - HOLA_LAT) < 0.0001 and abs(lat_new - HOLA_LAT) > 0.0001:
                    existing[2] = r[2]
                    existing[3] = r[3]
                    existing[4] = r[4]
            except:
                pass
                
            # Combine menus
            menu_exist = existing[8] or ""
            menu_new = r[8] or ""
            items = {}
            for item in menu_exist.split(";") + menu_new.split(";"):
                if ":" in item:
                    k, v = item.split(":", 1)
                    items[k.strip()] = v.strip()
            existing[8] = ";".join([f"{k}:{v}" for k, v in items.items() if k])
            
            # Combine reviews
            reviews_exist = existing[10] or ""
            reviews_new = r[10] or ""
            rev_set = set(reviews_exist.split(" | ") + reviews_new.split(" | "))
            existing[10] = " | ".join([rev for rev in rev_set if rev])
        else:
            unique_vendors[norm_name] = r
            
    # Write back
    with open(CSV_PATH, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for r in unique_vendors.values():
            writer.writerow(r)
            
    print(f"🧹 Khử trùng lặp hoàn tất! Còn {len(unique_vendors)} quán ăn duy nhất trong CSV database.")

def run_seeder():
    """Trigger the NodeJS database seeder script."""
    seeder_script = ROOT_DIR / "backend" / "data_import" / "import_csv.js"
    print("🔄 Chạy Node.js importer để cập nhật cơ sở dữ liệu và file offline...")
    try:
        subprocess.run(["node", str(seeder_script)], check=True)
        print("✅ Đồng bộ cơ sở dữ liệu hoàn tất!")
    except Exception as e:
        print(f"❌ Lỗi chạy Node.js importer: {e}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="HanoMate Facebook Selenium Multimodal Scraper")
    parser.add_argument("--max-posts", type=int, default=15, help="Số bài viết tối đa mỗi group")
    parser.add_argument("--no-headless", action="store_true", help="Không chạy Chrome ở chế độ headless (hiện cửa sổ)")
    args = parser.parse_args()
    
    headless = not args.no_headless
    print("🚀 Bắt đầu HanoMate Selenium Facebook Multimodal Scraper...")
    
    driver = None
    try:
        driver = setup_driver(headless=headless)
        verify_login(driver)
        
        # Clear localStorage and sessionStorage to avoid SPA routing stickiness
        try:
            print("🧹 Đang dọn dẹp bộ nhớ đệm LocalStorage/SessionStorage...")
            driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
            time.sleep(1)
        except Exception as e:
            print(f"⚠️ Không thể dọn dẹp bộ nhớ đệm: {e}")
            
        all_posts = []
        for url in GROUP_URLS:
            try:
                group_posts = crawl_group(driver, url, max_posts=args.max_posts)
                all_posts.extend(group_posts)
            except Exception as e:
                print(f"❌ Lỗi khi cào group {url}: {e}")
                
        # Close driver since crawling is done
        driver.quit()
        driver = None
        
        if not all_posts:
            print("⚠️ Không thu thập được bài viết nào từ các nhóm Facebook.")
            return
            
        print(f"\n📊 Đã thu thập tổng cộng {len(all_posts)} bài đăng.")
        print("💡 Tiến hành phân tích dữ liệu & OCR bằng Gemini 1.5 Flash...")
        
        # Load existing vendors names to skip duplicate requests to Gemini
        existing_vendors = set()
        if CSV_PATH.exists():
            with open(CSV_PATH, mode='r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None)
                for r in reader:
                    if r:
                        existing_vendors.add(r[0].strip().lower())
                        
        new_vendors_count = 0
        
        with open(CSV_PATH, mode='a', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            
            for idx, post in enumerate(all_posts):
                print(f"\n📝 [{idx+1}/{len(all_posts)}] Đang phân tích bài đăng ID: {post['post_id']}...")
                
                # Check if has images and download first image
                img_b64 = None
                mime_type = None
                local_path = None
                if post["images"]:
                    img_url = post["images"][0]
                    print(f"   🖼️  Tải ảnh menu/quán ăn: {img_url[:40]}...")
                    img_b64, mime_type, local_path = download_image_as_base64(img_url)
                    if local_path:
                        print(f"   💾 Lưu ảnh tại: {local_path.name}")
                        
                # Analyze using Gemini
                data = analyze_post_with_gemini(post["text"], img_b64, mime_type)
                
                if not data or not data.get("name"):
                    print("   ℹ️ Bài viết không chứa thông tin quán ăn mới hoặc bị AI bỏ qua.")
                    continue
                    
                vendor_name = data["name"].strip()
                norm_name = vendor_name.lower()
                
                if norm_name in existing_vendors:
                    print(f"   ℹ️ Quán '{vendor_name}' đã tồn tại trong CSV. Bỏ qua.")
                    continue
                    
                print(f"   ✨ AI phát hiện quán mới: '{vendor_name}' ({data.get('category')})")
                
                # Geocode coordinates
                lat, lng, address = geocode_location(vendor_name, data.get("addressHint", ""))
                
                # Format menu
                menu_items = data.get("menu", [])
                menu_str = ";".join([f"{item['name']}:{item['price']}" for item in menu_items if 'name' in item and 'price' in item])
                if not menu_str:
                    menu_str = "Món Đặc Biệt:35000;Đồ Uống Kèm:15000"
                    
                # Format reviews
                reviews = data.get("reviews", [])
                reviews_str = " | ".join(reviews) if reviews else "Được chia sẻ trên nhóm review ẩm thực Hòa Lạc."
                
                row = [
                    vendor_name,
                    data.get("category", "Ăn uống"),
                    lat,
                    lng,
                    address or "Hòa Lạc, Thạch Thất, Hà Nội",
                    data.get("priceMin", 20000),
                    data.get("priceMax", 100000),
                    4.5, # Default starting rating
                    menu_str,
                    data.get("tips", "AI gợi ý quán ngon từ Facebook."),
                    reviews_str
                ]
                
                writer.writerow(row)
                existing_vendors.add(norm_name)
                new_vendors_count += 1
                print(f"   ✅ Đã lưu quán '{vendor_name}' vào CSV.")
                
        print(f"\n💾 Đã thêm {new_vendors_count} quán ăn mới từ Facebook!")
        
        # Cleanup CSV and Seeding
        deduplicate_csv()
        run_seeder()
        
    except Exception as e:
        print(f"❌ Lỗi nghiêm trọng trong quá trình chạy: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

if __name__ == "__main__":
    main()
