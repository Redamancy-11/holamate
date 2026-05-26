"""
HanoMate Data Pipeline — Master Orchestrator
==============================================
Bộ điều phối trung tâm: chạy tất cả scrapers → merge → tính numpy median → ghi MongoDB.

Thuật toán lõi:
- Thu thập dữ liệu từ 3 nguồn (TikTok, Facebook, ShopeeFood)
- Normalize tên vendor + tên món
- Group theo (vendor_name_normalized, item_name)
- Tính numpy median + IQR (loại outlier)
- Upsert vào MongoDB Vendor + PriceReport collections

Kết nối trực tiếp với cùng MongoDB mà backend Node.js đang sử dụng.
"""

import sys
import re
import time
import json
import logging
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

import numpy as np
from pymongo import UpdateOne
from tqdm import tqdm

from config import (
    get_db,
    close_db,
    DRY_RUN,
    now_utc,
)
from tiktok_scraper import TikTokScraper
from facebook_scraper import FacebookScraper
from shopeefood_scraper import ShopeeFoodScraper
from instagram_scraper import InstagramScraper

log = logging.getLogger("hanomate.orchestrator")

# ── Thuật toán Median + IQR ──────────────────────────────────────────────────


def compute_consensus_price(prices: list[float]) -> dict:
    """
    Tính giá đồng thuận từ nhiều nguồn, sử dụng numpy median + IQR.

    Thuật toán:
    1. Tính Q1, Q3 và IQR (Interquartile Range)
    2. Loại outlier ngoài [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
    3. Tính median từ dữ liệu đã lọc

    Args:
        prices: Danh sách giá từ nhiều nguồn

    Returns:
        dict với median, mean, std, n_sources, outliers_removed
    """
    if not prices:
        return {
            "median": 0.0,
            "mean": 0.0,
            "std": 0.0,
            "n_sources": 0,
            "outliers_removed": 0,
            "confidence": "none",
        }

    arr = np.array(prices, dtype=np.float64)

    if len(arr) == 1:
        return {
            "median": float(arr[0]),
            "mean": float(arr[0]),
            "std": 0.0,
            "n_sources": 1,
            "outliers_removed": 0,
            "confidence": "low",
        }

    # Tính IQR
    q1, q3 = np.percentile(arr, [25, 75])
    iqr = q3 - q1

    # Filter outliers
    if iqr > 0:
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        filtered = arr[(arr >= lower_bound) & (arr <= upper_bound)]
    else:
        # IQR = 0 → tất cả giá giống nhau hoặc rất gần
        filtered = arr

    if len(filtered) == 0:
        filtered = arr  # Fallback: dùng tất cả nếu lọc hết

    outliers_removed = len(arr) - len(filtered)

    # Xác định confidence level
    n = len(filtered)
    std = float(np.std(filtered))
    median = float(np.median(filtered))
    cv = std / median if median > 0 else float("inf")  # Coefficient of variation

    if n >= 3 and cv < 0.2:
        confidence = "high"
    elif n >= 2 and cv < 0.5:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "median": median,
        "mean": float(np.mean(filtered)),
        "std": std,
        "n_sources": int(n),
        "outliers_removed": int(outliers_removed),
        "confidence": confidence,
    }


# ── Normalization & Grouping ─────────────────────────────────────────────────


def normalize_item_name(name: str) -> str:
    """Chuẩn hóa tên món ăn để so khớp."""
    if not name or name == "general":
        return "general"

    name = name.lower().strip()
    # Bỏ các ký tự đặc biệt, giữ dấu tiếng Việt (\w bao gồm Unicode trong Python 3)
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def group_entries(entries: list[dict]) -> dict[tuple, list[dict]]:
    """
    Group entries theo (vendor_name_normalized, item_name_normalized).
    Trả về dict với key = (vendor, item) và value = list entries.
    """
    groups = defaultdict(list)

    for entry in entries:
        vendor = entry.get("vendor_name_normalized", "").strip()
        item = normalize_item_name(entry.get("item_name", "general"))

        if not vendor:
            continue

        groups[(vendor, item)].append(entry)

    return dict(groups)


# ── MongoDB Sync ─────────────────────────────────────────────────────────────


def upsert_vendors(db, groups: dict[tuple, list[dict]], dry_run: bool = False) -> dict:
    """
    Upsert vendors vào MongoDB.
    Schema khớp với backend/models/Vendor.js:
    - name, category, address, location (GeoJSON Point), rating, priceRange
    """
    vendor_map: dict[str, dict] = {}  # normalized_name → vendor data

    # Tổng hợp thông tin vendor từ tất cả entries
    for (vendor_norm, item_name), entries in groups.items():
        if vendor_norm not in vendor_map:
            # Lấy thông tin vendor từ entry đầu tiên có đầy đủ data
            best_entry = max(entries, key=lambda e: 1 if e.get("address") else 0)

            vendor_map[vendor_norm] = {
                "name": best_entry.get("vendor_name", vendor_norm),
                "category": _infer_category(entries),
                "address": best_entry.get("address", ""),
                "coordinates": best_entry.get("coordinates"),
                "rating": 0.0,
                "prices": [],
                "sources": set(),
            }

        # Tích lũy rating và prices
        for entry in entries:
            if entry.get("rating"):
                vendor_map[vendor_norm]["prices"].append(entry.get("price", 0))
            vendor_map[vendor_norm]["sources"].add(entry.get("source", "unknown"))
            if entry.get("rating"):
                # Running average cho rating
                current = vendor_map[vendor_norm]["rating"]
                if current == 0:
                    vendor_map[vendor_norm]["rating"] = entry["rating"]
                else:
                    vendor_map[vendor_norm]["rating"] = (current + entry["rating"]) / 2

    # Tạo bulk operations
    operations = []
    for vendor_norm, data in vendor_map.items():
        # Tính price range
        valid_prices = [p for p in data["prices"] if p and p > 0]
        price_range = {}
        if valid_prices:
            price_range = {
                "min": float(min(valid_prices)),
                "max": float(max(valid_prices)),
            }

        # Tạo GeoJSON location nếu có coordinates
        location = None
        if data["coordinates"] and data["coordinates"].get("lng") and data["coordinates"].get("lat"):
            location = {
                "type": "Point",
                "coordinates": [
                    float(data["coordinates"]["lng"]),
                    float(data["coordinates"]["lat"]),
                ],
            }

        update_doc = {
            "$set": {
                "name": data["name"],
                "category": data["category"],
                "address": data["address"] or "",
                "rating": round(data["rating"], 1),
                "priceRange": price_range,
                "updatedAt": now_utc(),
            },
            "$setOnInsert": {
                "createdAt": now_utc(),
            },
        }

        if location:
            update_doc["$set"]["location"] = location

        operations.append(
            UpdateOne(
                {"name": {"$regex": f"^{re.escape(data['name'])}$", "$options": "i"}},
                update_doc,
                upsert=True,
            )
        )

    # Execute bulk
    stats = {"upserted": 0, "modified": 0, "total": len(operations)}

    if not dry_run and operations:
        result = db["vendors"].bulk_write(operations, ordered=False)
        stats["upserted"] = result.upserted_count
        stats["modified"] = result.modified_count
        log.info(
            f"  📦 Vendors: {stats['upserted']} mới, "
            f"{stats['modified']} cập nhật (tổng {stats['total']})"
        )
    else:
        log.info(f"  📦 [DRY-RUN] Vendors: {stats['total']} sẽ được upsert")

    return stats


def create_price_reports(
    db, groups: dict[tuple, list[dict]], dry_run: bool = False
) -> dict:
    """
    Tạo PriceReport từ dữ liệu đã tính median.
    Schema khớp với backend/models/PriceReport.js:
    - vendor (ObjectId ref), itemName, price, currency, reportedBy, isVerified,
      verificationCount, notes
    """
    reports_to_insert = []

    for (vendor_norm, item_name), entries in tqdm(
        groups.items(), desc="  💰 Tạo PriceReports", unit="group"
    ):
        # Lấy tất cả giá từ entries
        prices = [e["price"] for e in entries if e.get("price") and e["price"] > 0]
        if not prices:
            continue

        # Tính consensus price bằng numpy
        consensus = compute_consensus_price(prices)

        if consensus["median"] <= 0:
            continue

        # Tìm vendor ObjectId
        vendor_name = entries[0].get("vendor_name", vendor_norm)
        vendor_doc = db["vendors"].find_one(
            {"name": {"$regex": f"^{re.escape(vendor_name)}$", "$options": "i"}}
        )

        if not vendor_doc:
            # Vendor chưa được upsert → skip
            log.debug(f"     Vendor '{vendor_name}' chưa có trong DB, skip")
            continue

        vendor_id = vendor_doc["_id"]

        # Xác định verification
        sources = set(e.get("source", "") for e in entries)
        n_sources = len(sources)
        is_verified = n_sources >= 2 and consensus["confidence"] in ("high", "medium")

        # Notes tổng hợp
        notes_parts = [
            f"Pipeline auto-sync | {n_sources} nguồn ({', '.join(sources)})",
            f"Median: {consensus['median']:,.0f} VND",
            f"Mean: {consensus['mean']:,.0f} VND",
            f"Std: {consensus['std']:,.0f}",
            f"Confidence: {consensus['confidence']}",
        ]
        if consensus["outliers_removed"] > 0:
            notes_parts.append(
                f"Đã loại {consensus['outliers_removed']} outlier(s)"
            )

        report = {
            "vendor": vendor_id,
            "itemName": item_name if item_name != "general" else vendor_name,
            "price": consensus["median"],
            "currency": "VND",
            "reportedBy": f"pipeline:{','.join(sorted(sources))}",
            "isVerified": is_verified,
            "verificationCount": n_sources,
            "notes": " | ".join(notes_parts),
            "createdAt": now_utc(),
            "updatedAt": now_utc(),
        }

        reports_to_insert.append(report)

    # Bulk insert
    stats = {"inserted": 0, "total": len(reports_to_insert)}

    if not dry_run and reports_to_insert:
        result = db["pricereports"].insert_many(reports_to_insert, ordered=False)
        stats["inserted"] = len(result.inserted_ids)
        log.info(f"  💰 PriceReports: {stats['inserted']} mới tạo")
    else:
        log.info(f"  💰 [DRY-RUN] PriceReports: {stats['total']} sẽ được tạo")

    return stats


# ── Helper Functions ─────────────────────────────────────────────────────────


def _infer_category(entries: list[dict]) -> str:
    """Suy luận category từ metadata entries."""
    categories = []

    for entry in entries:
        meta = entry.get("metadata", {})
        cats = meta.get("categories", [])
        if isinstance(cats, list):
            categories.extend(cats)

        # Từ ShopeeFood categories
        dish_cat = meta.get("dish_category", "")
        if dish_cat:
            categories.append(dish_cat)

    if categories:
        # Trả về category phổ biến nhất
        from collections import Counter

        most_common = Counter(categories).most_common(1)
        if most_common:
            return most_common[0][0]

    # Fallback: suy từ item names
    item_names = " ".join(e.get("item_name", "") for e in entries).lower()
    if any(w in item_names for w in ["phở", "bún", "mì", "cơm", "bánh"]):
        return "Đồ ăn"
    elif any(w in item_names for w in ["trà", "cà phê", "nước", "sinh tố", "bia"]):
        return "Đồ uống"
    elif any(w in item_names for w in ["bánh", "chè", "kem"]):
        return "Tráng miệng"

    return "Ẩm thực"


# ── Main Orchestrator ────────────────────────────────────────────────────────


class MasterOrchestrator:
    """
    Bộ điều phối trung tâm của pipeline.

    Chạy tất cả scrapers → merge → normalize → compute median → sync MongoDB.
    """

    def __init__(self, dry_run: bool = False, parallel: bool = True):
        self.dry_run = dry_run or DRY_RUN
        self.parallel = parallel
        self.scrapers = {
            "tiktok": TikTokScraper(),
            "facebook": FacebookScraper(),
            "shopeefood": ShopeeFoodScraper(),
            "instagram": InstagramScraper(),
        }

    def _run_scraper(self, name: str, scraper) -> list[dict]:
        """Chạy 1 scraper và bắt lỗi."""
        try:
            log.info(f"▶️  Đang chạy {name} scraper...")
            start = time.time()
            results = scraper.scrape()
            elapsed = time.time() - start
            log.info(f"✅ {name}: {len(results)} entries ({elapsed:.1f}s)")
            return results
        except Exception as e:
            log.error(f"❌ {name} scraper lỗi: {e}")
            return []

    def collect_data(self) -> list[dict]:
        """
        Thu thập dữ liệu từ tất cả scrapers.
        Chạy song song nếu self.parallel = True.
        """
        all_entries: list[dict] = []

        if self.parallel:
            log.info("🔄 Chạy scrapers song song (ThreadPoolExecutor)...")
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {
                    executor.submit(self._run_scraper, name, scraper): name
                    for name, scraper in self.scrapers.items()
                }

                for future in as_completed(futures):
                    name = futures[future]
                    try:
                        results = future.result()
                        all_entries.extend(results)
                    except Exception as e:
                        log.error(f"❌ Lỗi chạy {name}: {e}")
        else:
            log.info("🔄 Chạy scrapers tuần tự...")
            for name, scraper in self.scrapers.items():
                results = self._run_scraper(name, scraper)
                all_entries.extend(results)

        return all_entries

    def run(self) -> dict:
        """
        Chạy toàn bộ pipeline end-to-end.

        Returns:
            dict: Thống kê tổng hợp.
        """
        banner = """
╔══════════════════════════════════════════════════════════════╗
║       🏙️  HanoMate Data Pipeline — Master Orchestrator       ║
║  Nguồn: TikTok + Facebook + ShopeeFood + Instagram          ║
╚══════════════════════════════════════════════════════════════╝
        """
        print(banner)

        if self.dry_run:
            log.warning("⚠️  CHẾ ĐỘ DRY-RUN: không ghi dữ liệu vào database")

        start_time = time.time()
        stats = {
            "started_at": now_utc().isoformat(),
            "dry_run": self.dry_run,
            "sources": {},
            "total_raw_entries": 0,
            "total_groups": 0,
            "vendor_stats": {},
            "report_stats": {},
            "errors": [],
        }

        # ── Bước 1: Thu thập dữ liệu ──
        log.info("━" * 60)
        log.info("📥 BƯỚC 1: Thu thập dữ liệu từ các nguồn")
        log.info("━" * 60)

        all_entries = self.collect_data()
        stats["total_raw_entries"] = len(all_entries)

        # Thống kê theo nguồn
        for entry in all_entries:
            source = entry.get("source", "unknown")
            stats["sources"][source] = stats["sources"].get(source, 0) + 1

        log.info(f"\n📊 Tổng raw entries: {len(all_entries)}")
        for source, count in stats["sources"].items():
            log.info(f"   • {source}: {count} entries")

        if not all_entries:
            log.warning("⚠️  Không có dữ liệu nào để xử lý!")
            return stats

        # ── Bước 2: Normalize & Group ──
        log.info("\n" + "━" * 60)
        log.info("🔄 BƯỚC 2: Normalize & Group dữ liệu")
        log.info("━" * 60)

        groups = group_entries(all_entries)
        stats["total_groups"] = len(groups)
        log.info(f"   Tạo được {len(groups)} nhóm (vendor, item)")

        # In top 10 nhóm lớn nhất
        sorted_groups = sorted(groups.items(), key=lambda x: len(x[1]), reverse=True)
        log.info("\n   Top 10 nhóm có nhiều entry nhất:")
        for (vendor, item), entries in sorted_groups[:10]:
            sources = set(e.get("source", "") for e in entries)
            prices = [e["price"] for e in entries if e.get("price")]
            log.info(
                f"   • {vendor} / {item}: "
                f"{len(entries)} entries, {len(sources)} nguồn, "
                f"giá: {[f'{p:,.0f}' for p in prices[:5]]}"
            )

        # ── Bước 3: Tính Median & Ghi MongoDB ──
        log.info("\n" + "━" * 60)
        log.info("💾 BƯỚC 3: Tính Median → Sync MongoDB")
        log.info("━" * 60)

        db = get_db() if not self.dry_run else None

        if db is not None or self.dry_run:
            # Dùng mock db cho dry-run
            if self.dry_run:
                db = _MockDB()

            # Upsert vendors
            stats["vendor_stats"] = upsert_vendors(db, groups, self.dry_run)

            # Tạo price reports
            stats["report_stats"] = create_price_reports(db, groups, self.dry_run)

        # ── Hoàn tất ──
        elapsed = time.time() - start_time
        stats["completed_at"] = now_utc().isoformat()
        stats["elapsed_seconds"] = round(elapsed, 2)

        log.info("\n" + "━" * 60)
        summary = f"""
🏁 PIPELINE HOÀN TẤT ({elapsed:.1f}s)
   ├── Raw entries:    {stats['total_raw_entries']}
   ├── Groups:         {stats['total_groups']}
   ├── Vendors upsert: {stats['vendor_stats'].get('total', 0)}
   ├── PriceReports:   {stats['report_stats'].get('total', 0)}
   └── Dry-run:        {'Có' if self.dry_run else 'Không'}
"""
        log.info(summary)
        log.info("━" * 60)

        # Đóng kết nối
        if not self.dry_run:
            close_db()

        return stats


class _MockDB:
    """Mock DB cho chế độ dry-run."""

    def __getitem__(self, name):
        return self

    def find_one(self, *args, **kwargs):
        from bson import ObjectId
        return {"_id": ObjectId()}

    def bulk_write(self, *args, **kwargs):
        class Result:
            upserted_count = 0
            modified_count = 0
        return Result()

    def insert_many(self, docs, **kwargs):
        class Result:
            inserted_ids = docs
        return Result()


# ── CLI Entry Point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="HanoMate Data Pipeline — Master Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ sử dụng:
  python master_orchestrator.py                    # Chạy đầy đủ
  python master_orchestrator.py --dry-run          # Chỉ log, không ghi DB
  python master_orchestrator.py --sequential       # Chạy scrapers tuần tự
  python master_orchestrator.py --output stats.json # Lưu thống kê
        """,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ log kết quả, không ghi DB",
    )
    parser.add_argument(
        "--sequential",
        action="store_true",
        help="Chạy scrapers tuần tự thay vì song song",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Lưu thống kê pipeline ra file JSON",
    )
    args = parser.parse_args()

    orchestrator = MasterOrchestrator(
        dry_run=args.dry_run,
        parallel=not args.sequential,
    )

    stats = orchestrator.run()

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        log.info(f"📄 Thống kê đã lưu → {args.output}")

    sys.exit(0 if not stats.get("errors") else 1)
