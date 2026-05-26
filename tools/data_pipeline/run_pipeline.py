#!/usr/bin/env python3
"""
HanoMate Pipeline — Interactive CLI Dashboard
==============================================
Giao diện dòng lệnh đẹp để chạy, kiểm tra và phân tích pipeline.

Cách dùng:
  python run_pipeline.py                    # Menu tương tác
  python run_pipeline.py --quick            # Chạy nhanh với mock data
  python run_pipeline.py --source shopeefood # Chỉ chạy 1 nguồn
  python run_pipeline.py --analyze          # Phân tích dữ liệu hiện có trong DB
"""

import sys
import json
import time
import argparse
import logging
from datetime import datetime
from pathlib import Path

# ── Setup logging đẹp hơn ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("hanomate.runner")

# ── Colors (ANSI) ─────────────────────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    BLUE   = "\033[94m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    PURPLE = "\033[95m"
    DIM    = "\033[2m"

def p(text, color=C.RESET):
    print(f"{color}{text}{C.RESET}")

def header(title):
    w = 64
    p("═" * w, C.BLUE)
    p(f"  {title}", C.BOLD + C.BLUE)
    p("═" * w, C.BLUE)

def section(title):
    p(f"\n{'─' * 50}", C.DIM)
    p(f"  {title}", C.CYAN + C.BOLD)
    p("─" * 50, C.DIM)

def ok(msg):    p(f"  ✅  {msg}", C.GREEN)
def warn(msg):  p(f"  ⚠️   {msg}", C.YELLOW)
def err(msg):   p(f"  ❌  {msg}", C.RED)
def info(msg):  p(f"  ℹ️   {msg}", C.CYAN)
def step(n, total, msg): p(f"  [{n}/{total}] {msg}", C.PURPLE)


# ── Source runners ────────────────────────────────────────────────────────────

def run_single_source(source_name: str, dry_run: bool = True) -> list[dict]:
    """Chạy một scraper đơn lẻ và trả về kết quả."""
    from config import DRY_RUN

    scrapers = {
        "shopeefood": ("shopeefood_scraper", "ShopeeFoodScraper"),
        "tiktok":     ("tiktok_scraper",     "TikTokScraper"),
        "facebook":   ("facebook_scraper",   "FacebookScraper"),
        "instagram":  ("instagram_scraper",  "InstagramScraper"),
    }

    if source_name not in scrapers:
        err(f"Nguồn không hợp lệ: {source_name}. Chọn: {list(scrapers.keys())}")
        return []

    module_name, class_name = scrapers[source_name]
    try:
        import importlib
        mod = importlib.import_module(module_name)
        cls = getattr(mod, class_name)
        scraper = cls()
        info(f"Đang chạy {source_name} scraper...")
        t0 = time.time()
        results = scraper.scrape()
        elapsed = time.time() - t0
        ok(f"{source_name}: {len(results)} entries thu thập ({elapsed:.1f}s)")
        return results
    except Exception as e:
        err(f"Lỗi chạy {source_name}: {e}")
        return []


def run_full_pipeline(dry_run: bool = True, parallel: bool = True, sources: list = None) -> dict:
    """Chạy full pipeline."""
    from master_orchestrator import MasterOrchestrator

    if sources:
        # Override scrapers nếu chỉ chọn 1 số nguồn
        from instagram_scraper import InstagramScraper
        from tiktok_scraper import TikTokScraper
        from facebook_scraper import FacebookScraper
        from shopeefood_scraper import ShopeeFoodScraper

        src_map = {
            "instagram":  InstagramScraper,
            "tiktok":     TikTokScraper,
            "facebook":   FacebookScraper,
            "shopeefood": ShopeeFoodScraper,
        }
        orch = MasterOrchestrator(dry_run=dry_run, parallel=parallel)
        orch.scrapers = {s: src_map[s]() for s in sources if s in src_map}
    else:
        orch = MasterOrchestrator(dry_run=dry_run, parallel=parallel)

    return orch.run()


# ── Analysis functions ────────────────────────────────────────────────────────

def analyze_results(entries: list[dict]):
    """In bảng phân tích kết quả đẹp."""
    if not entries:
        warn("Không có dữ liệu để phân tích.")
        return

    section("📊 PHÂN TÍCH KẾT QUẢ")

    # Thống kê theo nguồn
    from collections import Counter, defaultdict
    import statistics

    sources = Counter(e.get("source") for e in entries)
    p(f"\n  {'Nguồn':<20} {'Entries':>10} {'%':>8}", C.BOLD)
    p("  " + "─" * 40)
    for src, count in sources.most_common():
        pct = count / len(entries) * 100
        bar = "█" * int(pct / 5)
        p(f"  {src:<20} {count:>10,} {pct:>7.1f}% {bar}", C.CYAN)

    # Top vendors theo số lần xuất hiện
    vendor_counts = Counter(e.get("vendor_name_normalized", "") for e in entries if e.get("vendor_name_normalized"))
    section("🏆 TOP 10 VENDOR PHỔ BIẾN NHẤT")
    p(f"\n  {'Tên vendor':<35} {'Mentions':>10} {'Nguồn':>15}", C.BOLD)
    p("  " + "─" * 62)
    for vendor, count in vendor_counts.most_common(10):
        vendor_entries = [e for e in entries if e.get("vendor_name_normalized") == vendor]
        srcs = set(e.get("source", "") for e in vendor_entries)
        p(f"  {vendor:<35} {count:>10,} {', '.join(srcs):>15}")

    # Phân tích giá
    prices = [e.get("price") for e in entries if e.get("price") and e["price"] > 0]
    if prices:
        section("💰 PHÂN TÍCH GIÁ")
        p(f"\n  Số điểm giá:    {len(prices):,}", C.GREEN)
        p(f"  Trung bình:     {statistics.mean(prices):>10,.0f} VND")
        p(f"  Median:         {statistics.median(prices):>10,.0f} VND")
        p(f"  Thấp nhất:      {min(prices):>10,.0f} VND")
        p(f"  Cao nhất:       {max(prices):>10,.0f} VND")
        if len(prices) >= 2:
            p(f"  Độ lệch chuẩn: {statistics.stdev(prices):>10,.0f} VND")

        # Phân phối giá
        section("📈 PHÂN PHỐI GIÁ")
        ranges = [
            ("< 30,000đ",         [p for p in prices if p < 30000]),
            ("30,000 – 80,000đ",  [p for p in prices if 30000 <= p < 80000]),
            ("80,000 – 200,000đ", [p for p in prices if 80000 <= p < 200000]),
            ("200,000 – 500,000đ",[p for p in prices if 200000 <= p < 500000]),
            ("> 500,000đ",        [p for p in prices if p >= 500000]),
        ]
        for label, bucket in ranges:
            pct = len(bucket) / len(prices) * 100 if prices else 0
            bar = "█" * max(1, int(pct / 4))
            p(f"  {label:<25} {len(bucket):>6,} entries  {pct:>5.1f}%  {bar}")

    # Sample entries
    section("🔍 5 ENTRIES MẪU")
    for i, e in enumerate(entries[:5]):
        p(f"\n  [{i+1}] {e.get('vendor_name', 'N/A')} ({e.get('source', '?')})", C.BOLD)
        p(f"      Giá: {e.get('price', 'N/A'):,.0f}đ" if e.get('price') else "      Giá: N/A")
        p(f"      Địa chỉ: {e.get('address', 'N/A')}")
        if e.get("raw_text"):
            p(f"      Text: {e['raw_text'][:80]}...", C.DIM)


def analyze_db():
    """Phân tích dữ liệu hiện có trong MongoDB."""
    section("🗄️  PHÂN TÍCH DATABASE MONGODB")
    try:
        from config import get_db, close_db
        db = get_db()

        vendors = list(db["vendors"].find({}, {"name": 1, "category": 1, "rating": 1, "priceRange": 1}))
        reports = list(db["pricereports"].find({}, {"itemName": 1, "price": 1, "isVerified": 1, "reportedBy": 1}))

        ok(f"Vendors trong DB: {len(vendors)}")
        ok(f"PriceReports trong DB: {len(reports)}")

        if vendors:
            p(f"\n  {'Tên Vendor':<35} {'Category':<20} {'Rating':>8} {'Giá min':>12}", C.BOLD)
            p("  " + "─" * 80)
            for v in vendors[:15]:
                pr = v.get("priceRange", {})
                price_min = f"{pr.get('min', 0):,.0f}đ" if pr.get("min") else "N/A"
                p(f"  {v.get('name','N/A'):<35} {v.get('category','N/A'):<20} {v.get('rating', 0):>8.1f} {price_min:>12}")

        verified = sum(1 for r in reports if r.get("isVerified"))
        p(f"\n  Verified reports: {verified}/{len(reports)}", C.GREEN)
        close_db()

    except Exception as e:
        err(f"Không thể kết nối DB: {e}")
        info("Đảm bảo MongoDB đang chạy: mongod --port 27017")


# ── Interactive menu ──────────────────────────────────────────────────────────

def interactive_menu():
    """Menu tương tác chính."""
    header("🏙️  HanoMate Data Pipeline Dashboard")
    p(f"\n  Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", C.DIM)

    while True:
        p("\n  Chọn hành động:", C.BOLD)
        options = [
            ("1", "🚀 Chạy FULL pipeline (tất cả 4 nguồn) — DRY RUN",  "full_dry"),
            ("2", "💾 Chạy FULL pipeline → GHI VÀO DB",                 "full_db"),
            ("3", "📸 Chỉ chạy Instagram scraper",                       "instagram"),
            ("4", "🎵 Chỉ chạy TikTok scraper",                          "tiktok"),
            ("5", "👥 Chỉ chạy Facebook scraper",                         "facebook"),
            ("6", "🍜 Chỉ chạy ShopeeFood scraper",                       "shopeefood"),
            ("7", "📊 Phân tích kết quả pipeline",                        "analyze"),
            ("8", "🗄️  Xem dữ liệu trong MongoDB",                        "db"),
            ("9", "💡 Xem sample entries từ mỗi nguồn",                   "sample"),
            ("0", "❌ Thoát",                                              "exit"),
        ]
        for key, label, _ in options:
            color = C.GREEN if key in ("1", "2") else C.CYAN
            p(f"    [{key}] {label}", color)

        choice = input(f"\n{C.BOLD}  Nhập lựa chọn: {C.RESET}").strip()

        if choice == "0":
            p("\n  👋 Tạm biệt!\n", C.YELLOW)
            break

        elif choice == "1":
            section("🚀 Full Pipeline — DRY RUN")
            warn("Chế độ DRY RUN: chỉ log, không ghi DB")
            stats = run_full_pipeline(dry_run=True, parallel=True)
            ok(f"Hoàn tất! {stats.get('total_raw_entries', 0)} entries, {stats.get('total_groups', 0)} groups")

        elif choice == "2":
            section("💾 Full Pipeline → GHI DB")
            confirm = input(f"  {C.RED}Xác nhận ghi vào MongoDB? [y/N]: {C.RESET}").strip().lower()
            if confirm == "y":
                stats = run_full_pipeline(dry_run=False, parallel=True)
                ok(f"Hoàn tất! Vendors: {stats.get('vendor_stats', {}).get('total', 0)}, Reports: {stats.get('report_stats', {}).get('total', 0)}")
            else:
                warn("Đã hủy.")

        elif choice in ("3", "4", "5", "6"):
            src_map = {"3": "instagram", "4": "tiktok", "5": "facebook", "6": "shopeefood"}
            src = src_map[choice]
            section(f"Chạy {src} scraper")
            results = run_single_source(src, dry_run=True)
            if results:
                analyze_results(results)
                save = input(f"\n  Lưu kết quả ra file JSON? [y/N]: ").strip().lower()
                if save == "y":
                    fname = f"output_{src}_{int(time.time())}.json"
                    with open(fname, "w", encoding="utf-8") as f:
                        json.dump(results, f, ensure_ascii=False, indent=2)
                    ok(f"Đã lưu → {fname}")

        elif choice == "7":
            section("📊 Phân tích pipeline")
            info("Đang thu thập dữ liệu từ tất cả nguồn (mock/sample)...")
            all_entries = []
            for src in ["instagram", "shopeefood"]:
                entries = run_single_source(src, dry_run=True)
                all_entries.extend(entries[:20])  # Lấy sample nhỏ để phân tích nhanh
            analyze_results(all_entries)

        elif choice == "8":
            analyze_db()

        elif choice == "9":
            section("💡 Sample entries từ mỗi nguồn")
            for src in ["instagram", "shopeefood", "tiktok"]:
                p(f"\n  === {src.upper()} ===", C.BOLD + C.PURPLE)
                results = run_single_source(src, dry_run=True)
                for e in results[:2]:
                    p(f"  • {e.get('vendor_name','?')} | {e.get('price','N/A')}đ | {e.get('address','N/A')}")
                    p(f"    {e.get('raw_text','')[:100]}", C.DIM)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="HanoMate Pipeline Dashboard")
    parser.add_argument("--quick",   action="store_true", help="Chạy nhanh Instagram + ShopeeFood, dry-run")
    parser.add_argument("--source",  type=str, help="Chỉ chạy 1 nguồn: tiktok/facebook/shopeefood/instagram")
    parser.add_argument("--analyze", action="store_true", help="Phân tích DB hiện có")
    parser.add_argument("--full-db", action="store_true", help="Chạy full pipeline ghi DB (production)")
    parser.add_argument("--output",  type=str, help="Lưu kết quả ra file JSON")
    args = parser.parse_args()

    if args.analyze:
        header("🗄️  HanoMate DB Analyzer")
        analyze_db()
        return

    if args.source:
        header(f"🔍 HanoMate — {args.source.upper()} Scraper")
        results = run_single_source(args.source)
        analyze_results(results)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            ok(f"Đã lưu → {args.output}")
        return

    if args.quick:
        header("⚡ HanoMate — Quick Run (Instagram + ShopeeFood)")
        all_entries = []
        for src in ["instagram", "shopeefood"]:
            entries = run_single_source(src, dry_run=True)
            all_entries.extend(entries)
        analyze_results(all_entries)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(all_entries, f, ensure_ascii=False, indent=2)
            ok(f"Đã lưu {len(all_entries)} entries → {args.output}")
        return

    if args.full_db:
        header("💾 HanoMate — Full Pipeline (WRITE TO DB)")
        stats = run_full_pipeline(dry_run=False, parallel=True)
        ok(f"Hoàn tất! Stats: {json.dumps(stats, ensure_ascii=False, indent=2)}")
        return

    # Default: interactive menu
    interactive_menu()


if __name__ == "__main__":
    main()
