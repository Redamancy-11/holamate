import os
import urllib.request
import json
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.parent
BACKEND_ENV_PATH = ROOT_DIR / "backend" / ".env"
load_dotenv(BACKEND_ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
print("API KEY:", GEMINI_API_KEY[:10] + "...")

# Test gemini-2.5-flash
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
payload = {
    "contents": [{"parts": [{"text": "Hello, write a 3-word greeting."}]}]
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode('utf-8')[:200])
except Exception as e:
    print("Error:", e)
    if hasattr(e, "read"):
        print("Response Body:", e.read().decode('utf-8'))
