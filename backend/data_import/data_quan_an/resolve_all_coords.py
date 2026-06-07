import asyncio
from playwright.async_api import async_playwright
import json
import os
import time
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

CHECKPOINT_FILE = 'place_coords.json'
CONCURRENCY = 6  # Lower concurrency to prevent bot detection

async def resolve_coords(context, place):
    title = place['title']
    url = place.get('url')
    place_id = place.get('placeId')
    
    if not url or not place_id:
        return place_id, None, None
        
    page = await context.new_page()
    # Block ONLY image/font/media to save bandwidth
    await page.route("**/*", lambda route: route.continue_() if route.request.resource_type not in ["image", "font", "media"] else route.abort())
    
    # Random offset to avoid simultaneous requests
    await asyncio.sleep(random.uniform(0.1, 2.0))
    
    lat, lng = None, None
    try:
        await page.goto(url, wait_until="load", timeout=25000)
        
        # Poll page URL for coordinates
        for _ in range(50):
            current_url = page.url
            if "/sorry/" in current_url or "google.com/sorry" in current_url:
                print(f"  [BLOCKED] Bot detection triggered for: {title}")
                break
            
            match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', current_url)
            if match:
                test_lat = float(match.group(1))
                test_lng = float(match.group(2))
                # Check if it is NOT the default center coordinate (20.3259904)
                if abs(test_lat - 20.3259904) > 0.01:
                    lat, lng = test_lat, test_lng
                    break
            await asyncio.sleep(0.3)
            
    except Exception as e:
        # print(f"Error for {title}: {e}")
        pass
    finally:
        try:
            await page.close()
        except:
            pass
            
    return place_id, lat, lng

async def main():
    import random
    # Load all places
    with open('hoalac_restaurants_db.json', 'r', encoding='utf-8') as f:
        places = json.load(f)
        
    # Load checkpoint
    coords_db = {}
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
                coords_db = json.load(f)
            print(f"Loaded checkpoint with {len(coords_db)} coordinates.")
        except Exception as e:
            print(f"Error loading checkpoint: {e}")

    # Filter places that still need coordinates
    # Also ignore places that we already checked and decided are not F&B? 
    # No, let's resolve all of them.
    places_to_resolve = [p for p in places if p.get('placeId') not in coords_db]
    print(f"Total places: {len(places)}. Already resolved: {len(coords_db)}. Remaining: {len(places_to_resolve)}.")
    
    if not places_to_resolve:
        print("All coordinates are already resolved!")
        return

    # Process in batches
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use a real user agent
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        
        total = len(places_to_resolve)
        for i in range(0, total, CONCURRENCY):
            batch = places_to_resolve[i:i+CONCURRENCY]
            print(f"Resolving batch {i//CONCURRENCY + 1}/{(total + CONCURRENCY - 1)//CONCURRENCY} (indices {i} to {i+len(batch)})...")
            
            start_time = time.time()
            tasks = [resolve_coords(context, place) for place in batch]
            results = await asyncio.gather(*tasks)
            end_time = time.time()
            
            # Save results to checkpoint
            resolved_count = 0
            for pid, lat, lng in results:
                if pid and lat is not None and lng is not None:
                    coords_db[pid] = {'lat': lat, 'lng': lng}
                    resolved_count += 1
            
            # Write checkpoint
            with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
                json.dump(coords_db, f, ensure_ascii=False, indent=2)
                
            print(f"Batch completed in {end_time - start_time:.2f}s. Successfully resolved {resolved_count}/{len(batch)} places. Total resolved: {len(coords_db)}/{len(places)}")
            # Random wait between batches
            await asyncio.sleep(random.uniform(2.0, 5.0))
            
        await browser.close()
    
    print("All coordinates resolved and saved to checkpoint!")

if __name__ == "__main__":
    import random
    asyncio.run(main())
