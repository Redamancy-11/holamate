import os
import json
import urllib.request
import urllib.parse
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent.parent / "backend" / ".env")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY", "")

# Step 1: Search places
params = {
    "engine": "google_maps",
    "q": "quán ăn ngon Hoà Lạc",
    "api_key": SERPAPI_API_KEY
}
url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode("utf-8"))
    places = data.get("place_results", []) or data.get("local_results", [])
    if not places:
        print("No places found.")
        exit(0)
    
    first_place = places[0]
    data_id = first_place.get("data_id")
    name = first_place.get("title")
    print(f"First place: {name}, data_id: {data_id}")

# Step 2: Query google_maps_photos for Menu
menu_photo_params = {
    "engine": "google_maps_photos",
    "data_id": data_id,
    "category_id": "CgIYIQ", # Menu category ID
    "api_key": SERPAPI_API_KEY
}
menu_photo_url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(menu_photo_params)
menu_photo_req = urllib.request.Request(menu_photo_url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(menu_photo_req) as response:
        menu_photo_data = json.loads(response.read().decode("utf-8"))
        
        # Save output
        with open("tools/data_pipeline/inspect_menu_photos.json", "w", encoding="utf-8") as f:
            json.dump(menu_photo_data, f, ensure_ascii=False, indent=2)
            
        print("Saved menu photos data to tools/data_pipeline/inspect_menu_photos.json")
        
        photos = menu_photo_data.get("photos", [])
        print(f"Total Menu photos retrieved: {len(photos)}")
        if photos:
            print("First Menu photo image URL:")
            print(photos[0].get("image"))
except Exception as e:
    print(f"Error fetching menu photos: {e}")
