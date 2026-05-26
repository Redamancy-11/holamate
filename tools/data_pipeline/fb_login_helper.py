import os
import re
import sys
import time
import subprocess
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

# Force UTF-8 on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

# Path to backend .env
_backend_env = Path(__file__).parent.parent.parent / "backend" / ".env"

def update_env_cookie(cookie_str):
    if not _backend_env.exists():
        print(f"❌ File .env không tồn tại tại: {_backend_env}")
        return
        
    content = _backend_env.read_text(encoding='utf-8')
    if "FACEBOOK_COOKIE" in content:
        # Replace existing cookie
        content = re.sub(r'FACEBOOK_COOKIE\s*=.*', f'FACEBOOK_COOKIE="{cookie_str}"', content)
    else:
        # Append cookie
        content += f'\nFACEBOOK_COOKIE="{cookie_str}"\n'
    _backend_env.write_text(content, encoding='utf-8')
    print("✅ Đã lưu FACEBOOK_COOKIE vào file .env!")

def find_visible_element(driver, by, value):
    try:
        elems = driver.find_elements(by, value)
        for elem in elems:
            if elem.is_displayed() and elem.is_enabled():
                return elem
    except:
        pass
    return None

def login_and_get_cookie():
    email = "ducnguyenha0810@gmail.com"
    password = "tuan22082004@"
    
    print("🌐 Khởi động Chrome WebDriver...")
    chrome_options = Options()
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    # Giữ cửa sổ hiển thị để người dùng có thể xem hoặc nhập mã xác nhận nếu Facebook yêu cầu
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(options=chrome_options)
    try:
        print("🔗 Điều hướng tới trang đăng nhập Facebook di động...")
        driver.get("https://m.facebook.com/login.php")
        time.sleep(3)
        
        print("⌨️  Đang điền thông tin đăng nhập...")
        email_elem = (
            find_visible_element(driver, By.NAME, "email") or
            find_visible_element(driver, By.CSS_SELECTOR, "input[type='email']") or
            find_visible_element(driver, By.CSS_SELECTOR, "input[type='text']")
        )
        if not email_elem:
            raise Exception("Không tìm thấy ô nhập email hiển thị.")
            
        email_elem.clear()
        email_elem.send_keys(email)
        
        pass_elem = (
            find_visible_element(driver, By.NAME, "pass") or
            find_visible_element(driver, By.CSS_SELECTOR, "input[type='password']")
        )
        if not pass_elem:
            raise Exception("Không tìm thấy ô nhập mật khẩu hiển thị.")
            
        pass_elem.clear()
        pass_elem.send_keys(password)
        
        print("🖱️  Tìm và nhấn nút đăng nhập...")
        login_btn = None
        for selector in [
            (By.NAME, "login"),
            (By.CSS_SELECTOR, "button[type='submit']"),
            (By.CSS_SELECTOR, "input[type='submit']"),
            (By.ID, "loginbutton"),
            (By.XPATH, "//button[@value='Đăng nhập']"),
            (By.XPATH, "//button[@value='Log In']")
        ]:
            try:
                btn = find_visible_element(driver, *selector)
                if btn:
                    login_btn = btn
                    break
            except:
                continue
                
        # Toàn diện quét tất cả các phần tử có chữ Đăng nhập / Submit
        if not login_btn:
            try:
                all_elems = driver.find_elements(By.TAG_NAME, "button") + driver.find_elements(By.TAG_NAME, "input")
                for elem in all_elems:
                    if elem.is_displayed() and elem.is_enabled():
                        val = (elem.get_attribute("value") or "").lower()
                        text = (elem.text or "").lower()
                        name = (elem.get_attribute("name") or "").lower()
                        type_attr = (elem.get_attribute("type") or "").lower()
                        if "login" in name or "login" in val or "login" in text or "đăng nhập" in val or "đăng nhập" in text or type_attr == "submit":
                            login_btn = elem
                            break
            except Exception as e:
                print(f"⚠️ Quét nút nâng cao lỗi: {e}")
                
        if not login_btn:
            raise Exception("Không tìm thấy nút Đăng nhập hiển thị trên trang Facebook.")
            
        login_btn.click()
        
        print("⏳ Chờ đăng nhập hoàn tất (Nếu trình duyệt yêu cầu nhập mã OTP/phê duyệt thiết bị, bạn hãy thực hiện trên cửa sổ Chrome vừa hiện lên nhé)...")
        
        # Chờ tối đa 60s để người dùng phê duyệt đăng nhập
        logged_in = False
        for i in range(12):
            time.sleep(5)
            cookies = driver.get_cookies()
            if any(c['name'] == 'c_user' for c in cookies):
                logged_in = True
                break
            print(f"  ...Đang kiểm tra trạng thái đăng nhập ({i+1}/12)...")
        
        if not logged_in:
            print("⚠️  Vẫn chưa phát hiện đăng nhập thành công. Chờ thêm 20 giây nữa để bạn hoàn tất...")
            time.sleep(20)
            cookies = driver.get_cookies()
            if any(c['name'] == 'c_user' for c in cookies):
                logged_in = True
                
        if logged_in:
            cookies = driver.get_cookies()
            cookie_parts = [f"{c['name']}={c['value']}" for c in cookies]
            cookie_str = "; ".join(cookie_parts)
            print("🎉 Đăng nhập Facebook thành công!")
            update_env_cookie(cookie_str)
            return True
        else:
            print("❌ Đăng nhập thất bại hoặc quá thời gian chờ.")
            return False
            
    except Exception as e:
        print(f"❌ Gặp lỗi khi tự động đăng nhập: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    success = login_and_get_cookie()
    if success:
        # Tự động gọi script cào dữ liệu chính
        scraper_script = Path(__file__).parent / "fb_group_to_csv.py"
        print("\n🔄 Bắt đầu chạy fb_group_to_csv.py để quét bài đăng và OCR menu...")
        subprocess.run([sys.executable, str(scraper_script)])
