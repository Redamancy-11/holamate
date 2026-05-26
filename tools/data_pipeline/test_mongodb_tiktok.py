#!/usr/bin/env python3
"""
Quick test: check MongoDB connection and verify TikTok data insertion
"""

from config import get_db, close_db
import json

try:
    db = get_db()
    
    # Check vendors collection
    vendor_count = db['vendors'].count_documents({})
    print(f"✅ MongoDB connected. Vendors in DB: {vendor_count}")
    
    # Sample TikTok vendors
    tiktok_vendors = db['vendors'].find({'sources': {'$in': ['tiktok']}}).limit(5)
    tiktok_list = list(tiktok_vendors)
    print(f"\n📱 TikTok vendors in DB: {len(tiktok_list)}")
    if tiktok_list:
        for v in tiktok_list[:2]:
            print(f"  - {v.get('name', 'N/A')} ({v.get('category', 'N/A')}) | Rating: {v.get('rating', 'N/A')}")
    
    # Check price reports
    report_count = db['pricereports'].count_documents({})
    print(f"\n💰 PriceReports in DB: {report_count}")
    
    tiktok_reports = db['pricereports'].find({'reportedBy': {'$regex': 'tiktok'}}).limit(3)
    tiktok_report_list = list(tiktok_reports)
    if tiktok_report_list:
        for r in tiktok_report_list[:2]:
            print(f"  - {r.get('itemName', 'N/A')}: {r.get('price', 'N/A')} VND | Source: {r.get('reportedBy', 'N/A')}")
    
    close_db()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
