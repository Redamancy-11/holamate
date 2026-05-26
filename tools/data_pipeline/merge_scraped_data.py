import json
import sys
from pathlib import Path

# Force UTF-8 encoding on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def normalize_name(name):
    if not name:
        return ""
    import re
    return re.sub(r"\s+", " ", name.lower().strip())

def main():
    pipeline_dir = Path(__file__).parent
    maps_path = pipeline_dir / "scraped_maps_vendors.json"
    fb_path = pipeline_dir / "scraped_fb_vendors.json"
    output_path = pipeline_dir / "scraped_vendors.json"
    
    merged = []
    seen = set()
    
    # 1. Load Maps data
    if maps_path.exists():
        try:
            with open(maps_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for v in data:
                        norm = normalize_name(v.get("name"))
                        if norm and norm not in seen:
                            seen.add(norm)
                            merged.append(v)
            print(f"Loaded {len(merged)} vendors from Google Maps.")
        except Exception as e:
            print(f"Error loading maps vendors: {e}")
            
    # 2. Load FB data
    fb_count = 0
    if fb_path.exists():
        try:
            with open(fb_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for v in data:
                        norm = normalize_name(v.get("name"))
                        if norm and norm not in seen:
                            seen.add(norm)
                            merged.append(v)
                            fb_count += 1
            print(f"Loaded {fb_count} additional vendors from Facebook.")
        except Exception as e:
            print(f"Error loading FB vendors: {e}")
            
    # 3. Write unified output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        
    print(f"🎉 Merged dataset has {len(merged)} total vendors. Saved to {output_path}")

if __name__ == "__main__":
    main()
