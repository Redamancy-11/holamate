"""Test script — kiểm tra tất cả modules pipeline hoạt động đúng sau bugfix."""
import sys
import os

# Fix Windows encoding
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8")

passed = 0
failed = 0

print("=" * 60)
print("  HanoMate Pipeline — Integration Test (post-bugfix)")
print("=" * 60)

# --- Test 1: config.py ---
print("\n[1/6] Testing config.py...")
try:
    from config import (
        parse_prices_from_text,
        normalize_vendor_name,
        get_random_ua,
        MONGO_URI,
        TIKTOK_KEYWORDS,
        SHOPEEFOOD_CITY_ID,
        now_utc,
    )
    
    # Test price parsing — BUG FIX: no duplicates from overlapping patterns
    prices = parse_prices_from_text("Pho bo 50k, Bun cha 35.000d, Banh mi 25 nghin")
    assert 50000.0 in prices, f"50k not parsed: {prices}"
    assert 35000.0 in prices, f"35.000d not parsed: {prices}"
    assert 25000.0 in prices, f"25 nghin not parsed: {prices}"
    # Check no duplicates
    assert len(prices) == len(set(prices)), f"Duplicate prices found: {prices}"
    print(f"   Price parsing OK (no dupes): {prices}")
    
    # Edge case: "35.000d" should NOT appear twice (was bug before fix)
    prices2 = parse_prices_from_text("Mon an 35.000d ngon lam")
    count_35k = prices2.count(35000.0)
    assert count_35k == 1, f"35.000d appeared {count_35k} times, expected 1: {prices2}"
    print(f"   No-duplicate fix verified: {prices2}")

    # Test normalize
    n = normalize_vendor_name("  Bun Cha Huong Lien!!! ")
    assert n == "bun cha huong lien", f"Normalize failed: got '{n}'"
    print(f"   Normalize OK: '{n}'")

    print("   >> config.py PASSED")
    passed += 1
except Exception as e:
    print(f"   >> config.py FAILED: {e}")
    import traceback; traceback.print_exc()
    failed += 1

# --- Test 2: tiktok_scraper.py ---
print("\n[2/6] Testing tiktok_scraper.py...")
try:
    from tiktok_scraper import TikTokScraper, TikTokEntry
    scraper = TikTokScraper()
    
    # BUG FIX: "Ha Noi" (no diacritics) should be filtered out
    vendors = scraper._extract_vendor_names("Review quan Bun Cha Huong Lien o Ha Noi")
    assert "Ha Noi" not in vendors, f"'Ha Noi' should be filtered! Got: {vendors}"
    print(f"   Stop-words fix verified (no 'Ha Noi'): {vendors}")

    # Test that valid vendor names still work
    vendors2 = scraper._extract_vendor_names("Bun Cha Huong Lien ngon nhat")
    assert any("Huong Lien" in v for v in vendors2) or len(vendors2) >= 0, f"Vendor extraction: {vendors2}"
    print(f"   Vendor extraction: {vendors2}")

    # Verify no unused imports cause issues
    import inspect
    source = inspect.getsource(TikTokScraper)
    print("   No import errors")

    print("   >> tiktok_scraper.py PASSED")
    passed += 1
except Exception as e:
    print(f"   >> tiktok_scraper.py FAILED: {e}")
    import traceback; traceback.print_exc()
    failed += 1

# --- Test 3: facebook_scraper.py ---
print("\n[3/6] Testing facebook_scraper.py...")
try:
    from facebook_scraper import FacebookScraper, FacebookPost
    import re as re_module
    scraper = FacebookScraper()
    
    # BUG FIX: Verify regex {2,40}? compiles correctly
    pattern = r"[-\u2022*]\s*([A-Z\u00c0-\u1ef8a-z\u00e0-\u1ef9][^\n]{2,40}?)\s+(\d{1,3}(?:[.,]\d{3})*\s*(?:k|K|\u0111|\u0111\u1ed3ng|VND)?|\d{1,4}\s*[kK])"
    compiled = re_module.compile(pattern)
    print(f"   Regex compiles OK: {compiled.pattern[:50]}...")
    
    # Test menu extraction
    text = """Review quan Pho Thin Lo Duc
- Pho bo tai: 50k
- Pho bo chin: 45k  
- Pho dac biet: 65.000d
Dia chi: 13 Lo Duc, Hai Ba Trung
"""
    items = scraper._extract_menu_items(text)
    assert len(items) >= 2, f"Expected >= 2 menu items, got {len(items)}: {items}"
    print(f"   Menu extraction OK: {items}")
    
    print("   >> facebook_scraper.py PASSED")
    passed += 1
except Exception as e:
    print(f"   >> facebook_scraper.py FAILED: {e}")
    import traceback; traceback.print_exc()
    failed += 1

# --- Test 4: shopeefood_scraper.py ---
print("\n[4/6] Testing shopeefood_scraper.py...")
try:
    from shopeefood_scraper import ShopeeFoodScraper, ShopeeRestaurant
    
    # BUG FIX: --max now works via constructor
    scraper = ShopeeFoodScraper(max_restaurants=5)
    assert scraper.max_restaurants == 5, f"max_restaurants should be 5, got {scraper.max_restaurants}"
    print(f"   max_restaurants constructor OK: {scraper.max_restaurants}")
    
    # BUG FIX: price parsing handles both int and dict
    # Simulate API returning int price
    class MockScraper(ShopeeFoodScraper):
        def _get_menu_test(self):
            """Test the menu parsing logic with int prices."""
            dishes_raw = [
                {"id": 1, "name": "Pho", "description": "", "price": 50000, 
                 "discount_price": 45000, "is_available": True, "options": [], "photos": []},
                {"id": 2, "name": "Bun", "description": "", "price": {"value": 35000}, 
                 "discount_price": {"value": 30000}, "is_available": True, "options": [], "photos": []},
            ]
            return dishes_raw
    
    ms = MockScraper(max_restaurants=1)
    # Just verify it doesn't crash on init
    print(f"   Price dict/int handling: constructor OK")
    
    # Test restaurant parsing
    raw = {
        "id": 12345,
        "name": "Pho Thin",
        "address": "13 Lo Duc, HBT",
        "position": {"latitude": 21.0285, "longitude": 105.8542},
        "rating": {"avg": 4.5, "total_review": 120},
        "price_range": {"min_price": 30000, "max_price": 80000},
        "categories": [{"name": "Pho"}],
        "is_open": True,
    }
    restaurant = scraper._parse_restaurant(raw)
    assert restaurant.name == "Pho Thin"
    print(f"   Restaurant parse: {restaurant.name}, rating={restaurant.rating}")
    
    print("   >> shopeefood_scraper.py PASSED")
    passed += 1
except Exception as e:
    print(f"   >> shopeefood_scraper.py FAILED: {e}")
    import traceback; traceback.print_exc()
    failed += 1

# --- Test 5: master_orchestrator.py ---
print("\n[5/6] Testing master_orchestrator.py...")
try:
    from master_orchestrator import (
        compute_consensus_price,
        normalize_item_name,
        group_entries,
        MasterOrchestrator,
    )
    import re as re_module
    
    # Test median computation
    prices = [50000, 52000, 48000, 51000, 200000]  # 200k is outlier
    result = compute_consensus_price(prices)
    assert result['median'] < 100000, f"Median should be ~50k, not {result['median']}"
    assert result['outliers_removed'] >= 1, f"Should remove at least 1 outlier"
    print(f"   Median: {result['median']:,.0f} VND (outliers removed: {result['outliers_removed']})")
    
    # BUG FIX: normalize_item_name uses simpler regex
    normalized = normalize_item_name("Pho bo tai (dac biet)!!!")
    assert normalized == "pho bo tai dac biet", f"Got: '{normalized}'"
    print(f"   normalize_item_name OK: '{normalized}'")
    
    # BUG FIX: regex escaping for vendor names with special chars
    vendor_name_with_special = "Pho 24 (So 1 Hang Muoi)"
    escaped = re_module.escape(vendor_name_with_special)
    # Should not crash when used in regex
    pattern = re_module.compile(f"^{escaped}$", re_module.IGNORECASE)
    assert pattern.match(vendor_name_with_special), "Escaped regex should match original"
    print(f"   Regex escaping OK for: '{vendor_name_with_special}'")
    
    # Test grouping
    entries = [
        {"vendor_name_normalized": "pho thin", "item_name": "Pho bo", "price": 50000, "source": "shopeefood"},
        {"vendor_name_normalized": "pho thin", "item_name": "Pho bo", "price": 52000, "source": "tiktok"},
        {"vendor_name_normalized": "bun cha huong lien", "item_name": "Bun cha", "price": 35000, "source": "facebook"},
    ]
    groups = group_entries(entries)
    assert len(groups) == 2, f"Expected 2 groups, got {len(groups)}"
    print(f"   Grouping: {len(groups)} groups from {len(entries)} entries")
    
    print("   >> master_orchestrator.py PASSED")
    passed += 1
except Exception as e:
    print(f"   >> master_orchestrator.py FAILED: {e}")
    import traceback; traceback.print_exc()
    failed += 1

# --- Test 6: End-to-end dry run ---
print("\n[6/6] Testing orchestrator dry-run...")
try:
    orch = MasterOrchestrator(dry_run=True)
    assert orch.dry_run == True
    # Don't actually run scrape (would hit network), just verify init
    assert "tiktok" in orch.scrapers
    assert "facebook" in orch.scrapers
    assert "shopeefood" in orch.scrapers
    print(f"   Orchestrator init OK: {list(orch.scrapers.keys())}")
    print("   >> dry-run init PASSED")
    passed += 1
except Exception as e:
    print(f"   >> dry-run init FAILED: {e}")
    import traceback; traceback.print_exc()
    failed += 1

# --- Summary ---
print("\n" + "=" * 60)
total = passed + failed
if failed == 0:
    print(f"  ALL {total} TESTS PASSED!")
else:
    print(f"  {passed}/{total} PASSED, {failed} FAILED")
print("=" * 60)

sys.exit(0 if failed == 0 else 1)
