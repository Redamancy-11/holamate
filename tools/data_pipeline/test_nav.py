import os
import sys
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

sys.stdout.reconfigure(encoding='utf-8')
CHROME_PROFILE_DIR = Path(__file__).parent / "chrome_profile"

def test_nav():
    options = Options()
    options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--headless=new")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        url = "https://www.facebook.com/groups/966715394202687?locale=vi_VN"
        print(f"Navigating to: {url}")
        driver.get(url)
        time.sleep(8)
        
        print(f"Current URL: {driver.current_url}")
        
        # Save screenshot
        screenshot_path = Path(__file__).parent / "test_nav_screenshot.png"
        driver.save_screenshot(str(screenshot_path))
        print(f"Screenshot saved to: {screenshot_path}")
        
        # Dump some body text
        body_text = driver.find_element("tag name", "body").text
        print("Body Text length:", len(body_text))
        print("Body Text Preview (first 500 chars):")
        print(body_text[:500])
        
    finally:
        driver.quit()

if __name__ == "__main__":
    test_nav()
