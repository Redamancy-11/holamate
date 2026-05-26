"""
HanoMate Data Pipeline — Instagram Scraper
==========================================
Cào posts Instagram liên quan đến ẩm thực Hà Nội.
Sử dụng Instagram Basic Display API + scraping công khai (không cần auth cho hashtags).

Strategy:
1. Scrape hashtag pages công khai (#hanoifood, #anuonghanoi, v.v.)
2. Extract: tên quán (từ caption), giá, địa chỉ, engagement
3. Fallback: dùng mock data phong phú khi bị rate-limit
"""

import re
import time
import json
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx

from config import get_random_ua, parse_prices_from_text, normalize_vendor_name, now_utc

log = logging.getLogger("hanomate.instagram")

INSTAGRAM_HASHTAGS = [
    "fpthoalac", "reviewhoalac", "holaers",
    "dhfpthoalac", "sinhvienfpt", "hoalacfood",
]
INSTAGRAM_MAX_POSTS = 30


@dataclass
class InstagramPost:
    post_id: str = ""
    shortcode: str = ""
    caption: str = ""
    hashtags: list[str] = field(default_factory=list)
    likes: int = 0
    comments_count: int = 0
    timestamp: int = 0
    location_name: str = ""
    location_address: str = ""
    author: str = ""
    image_url: str = ""
    vendor_names: list[str] = field(default_factory=list)
    prices: list[float] = field(default_factory=list)


class InstagramScraper:
    """
    Scraper Instagram cho dữ liệu ẩm thực Hà Nội.

    Flow:
    1. Thử scrape hashtag pages công khai (Instagram web API)
    2. Nếu bị block → dùng mock data phong phú để vẫn có dữ liệu chạy pipeline
    """

    GRAPHQL_URL = "https://www.instagram.com/api/graphql"
    HASHTAG_URL = "https://www.instagram.com/explore/tags/{hashtag}/?__a=1&__d=dis"

    def __init__(self):
        self.client = httpx.Client(
            timeout=20.0,
            follow_redirects=True,
            headers={
                "User-Agent": get_random_ua(),
                "Accept": "*/*",
                "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
                "Referer": "https://www.instagram.com/",
                "X-IG-App-ID": "936619743392459",
            },
        )
        self._use_mock = False

    def _fetch_hashtag_posts(self, hashtag: str) -> list[dict]:
        """Lấy posts từ hashtag page công khai."""
        try:
            url = self.HASHTAG_URL.format(hashtag=hashtag)
            resp = self.client.get(url)

            if resp.status_code in (401, 403, 429):
                log.warning(f"Instagram rate-limited cho #{hashtag} ({resp.status_code}). Dùng mock data.")
                self._use_mock = True
                return []

            if resp.status_code != 200:
                log.debug(f"Instagram #{hashtag}: status {resp.status_code}")
                return []

            data = resp.json()
            # Try different JSON paths Instagram uses
            edges = (
                data.get("graphql", {}).get("hashtag", {}).get("edge_hashtag_to_media", {}).get("edges", [])
                or data.get("data", {}).get("recent", {}).get("sections", [])
            )

            posts = []
            for edge in edges[:INSTAGRAM_MAX_POSTS]:
                node = edge.get("node", edge)
                caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
                caption = caption_edges[0].get("node", {}).get("text", "") if caption_edges else ""

                posts.append({
                    "id": str(node.get("id", "")),
                    "shortcode": node.get("shortcode", ""),
                    "caption": caption,
                    "likes": node.get("edge_liked_by", {}).get("count", 0) or node.get("like_count", 0),
                    "comments": node.get("edge_media_to_comment", {}).get("count", 0) or node.get("comment_count", 0),
                    "timestamp": node.get("taken_at_timestamp", 0) or node.get("taken_at", 0),
                    "location": node.get("location") or {},
                })

            return posts

        except Exception as e:
            log.debug(f"Lỗi fetch Instagram #{hashtag}: {e}")
            self._use_mock = True
            return []

    def _extract_vendors_from_caption(self, caption: str) -> list[str]:
        """Trích xuất tên quán từ caption Instagram."""
        vendors = []
        # Pattern @mention (tên quán hay tag address)
        mentions = re.findall(r"@([\w.]{3,30})", caption)
        # Pattern "tại [Tên Quán]" / "ở [Tên Quán]"
        at_patterns = re.findall(r"(?:tại|ở|check.in|visit)\s+([A-ZÀ-Ỹ][^\n,\.!?]{2,40})", caption)
        # Emoji location + tên
        loc_patterns = re.findall(r"📍\s*([^\n,\.!?]{3,50})", caption)

        vendors.extend(mentions)
        vendors.extend(at_patterns)
        vendors.extend(loc_patterns)

        stop = {"fpthoalac", "reviewhoalac", "food", "hoalac", "vietnam", "holaers"}
        return [v.strip() for v in vendors if v.lower().strip() not in stop][:5]

    def _estimate_rating(self, likes: int, comments: int) -> float:
        total = likes + comments * 3
        if total > 5000: return 4.8
        if total > 1000: return 4.5
        if total > 300:  return 4.2
        return 3.8

    def _get_mock_data(self) -> list[dict]:
        """
        Mock data phong phú — dùng khi Instagram bị rate-limit.
        Dữ liệu được tổng hợp từ các nguồn công khai về ẩm thực FPT Hoà Lạc.
        """
        return [
            {
                "id": "ig_mock_001", "shortcode": "mock001",
                "caption": "🍵 Bay Coffee & Tea view hồ Tân Xã chill thực sự! Ca phê muối 25k siêu béo, sinh viên Hola nhất định phải thử #fpthoalac #baycoffee",
                "likes": 1250, "comments": 40, "timestamp": 1715000000,
                "location": {"name": "Bay Coffee & Tea", "address": "Hồ Tân Xã, Thạch Thất"},
            },
            {
                "id": "ig_mock_002", "shortcode": "mock002",
                "caption": "🥩 Buffet nướng lẩu 1988 BBQ Tân Xã siêu ngon rẻ! 129k/suất nướng tẹt ga, tha hồ ăn uống cuối tuần #1988bbq #reviewhoalac",
                "likes": 890, "comments": 21, "timestamp": 1715100000,
                "location": {"name": "1988 BBQ Tân Xã", "address": "Tân Xã, Thạch Thất"},
            },
            {
                "id": "ig_mock_003", "shortcode": "mock003",
                "caption": "☕ Trải nghiệm Highlands Coffee Hola nằm ngay trong khuôn viên trường FPT. Phin sữa đá 29k đậm đà tỉnh ngủ học bài #highlandshola #holaers",
                "likes": 1520, "comments": 80, "timestamp": 1715200000,
                "location": {"name": "Highlands Coffee Hola", "address": "Campus FPT University"},
            },
            {
                "id": "ig_mock_004", "shortcode": "mock004",
                "caption": "🥤 Bánh sừng bò + Americano đá mát lạnh tại Twitter Beans Coffee Viettel. 35k cực kỳ xịn mịn #twitterbeans #reviewhoalac",
                "likes": 2200, "comments": 62, "timestamp": 1715300000,
                "location": {"name": "Twitter Beans Coffee", "address": "Tòa nhà Viettel, Khu CNC Hoà Lạc"},
            },
            {
                "id": "ig_mock_005", "shortcode": "mock005",
                "caption": "🍜 Suất bún đậu mắm tôm đầy đủ chỉ 35k tại Bún Đậu Mam Tom Hola Tân Xã. Ăn no nê giá học sinh sinh viên #bundauhola #streetfood",
                "likes": 930, "comments": 18, "timestamp": 1715400000,
                "location": {"name": "Bún Đậu Mam Tom Hola", "address": "Khu dịch vụ Tân Xã"},
            },
            {
                "id": "ig_mock_006", "shortcode": "mock006",
                "caption": "🍗 Đặc sản Gà Ri Phú Bình nướng đắp đất cực kỳ thơm phức. 220k/con, đi 4 người chia ra quá rẻ #garihoalac #gaphubinh",
                "likes": 1850, "comments": 89, "timestamp": 1715500000,
                "location": {"name": "Gà Ri Phú Bình", "address": "Thạch Thất, Hà Nội"},
            },
            {
                "id": "ig_mock_007", "shortcode": "mock007",
                "caption": "🍱 Cơm Tấm KTX FPT siêu nhanh gọn. Sườn trứng 30k phục vụ siêu tốc tại Dom A #comtamktx #sinhvienfpt",
                "likes": 780, "comments": 29, "timestamp": 1715600000,
                "location": {"name": "Cơm Tấm KTX FPT", "address": "Dom A KTX FPT"},
            },
            {
                "id": "ig_mock_008", "shortcode": "mock008",
                "caption": "🍲 Nồi lẩu cua đồng nghi ngút khói tại Lẩu Cua Đồng Hoà Lạc. 250k/nồi đầy gạch cua siêu chất lượng #laucuadong #hoalacfood",
                "likes": 520, "comments": 14, "timestamp": 1715700000,
                "location": {"name": "Lẩu Cua Đồng Hoà Lạc", "address": "Quốc lộ 21, Thạch Thất"},
            },
        ]

    def scrape(self) -> list[dict]:
        """Chạy scraper Instagram: hashtags → extract → pipeline format."""
        log.info(f"📸 Bắt đầu cào Instagram — Hashtags: {INSTAGRAM_HASHTAGS}")
        all_posts: list[InstagramPost] = []

        # Thử scrape thật
        for tag in INSTAGRAM_HASHTAGS[:3]:
            log.info(f"  🔍 Đang scrape #{tag}")
            raw_posts = self._fetch_hashtag_posts(tag)

            if self._use_mock:
                log.info("  ⚡ Chuyển sang mock data (Instagram rate-limited)")
                break

            for raw in raw_posts:
                caption = raw.get("caption", "")
                location = raw.get("location", {})

                post = InstagramPost(
                    post_id=raw.get("id", ""),
                    shortcode=raw.get("shortcode", ""),
                    caption=caption,
                    hashtags=re.findall(r"#(\w+)", caption),
                    likes=raw.get("likes", 0),
                    comments_count=raw.get("comments", 0),
                    timestamp=raw.get("timestamp", 0),
                    location_name=location.get("name", "") if location else "",
                    location_address=location.get("address", "") if location else "",
                )
                post.vendor_names = self._extract_vendors_from_caption(caption)
                post.prices = parse_prices_from_text(caption)

                if location and location.get("name"):
                    post.vendor_names.insert(0, location["name"])

                if post.vendor_names or post.prices:
                    all_posts.append(post)

            time.sleep(2.0)

        # Dùng mock data nếu không crawl được
        if self._use_mock or not all_posts:
            log.info("  📦 Đang load mock Instagram data...")
            mock_raw = self._get_mock_data()
            for raw in mock_raw:
                caption = raw.get("caption", "")
                location = raw.get("location", {})
                post = InstagramPost(
                    post_id=raw.get("id", ""),
                    caption=caption,
                    likes=raw.get("likes", 0),
                    comments_count=raw.get("comments", 0),
                    location_name=location.get("name", "") if location else "",
                    location_address=location.get("address", "") if location else "",
                )
                post.vendor_names = self._extract_vendors_from_caption(caption)
                if location and location.get("name"):
                    post.vendor_names.insert(0, location["name"])
                post.prices = parse_prices_from_text(caption)
                all_posts.append(post)

        # Convert to pipeline format
        raw_results = []
        for post in all_posts:
            rating = self._estimate_rating(post.likes, post.comments_count)
            for vendor_name in (post.vendor_names or ["Unknown"]):
                for price in (post.prices or [None]):
                    raw_results.append({
                        "source": "instagram",
                        "vendor_name": vendor_name,
                        "vendor_name_normalized": normalize_vendor_name(vendor_name),
                        "item_name": "general",
                        "price": price,
                        "rating": rating,
                        "address": post.location_address or None,
                        "raw_text": post.caption[:500],
                        "metadata": {
                            "post_id": post.post_id,
                            "likes": post.likes,
                            "comments": post.comments_count,
                            "location_name": post.location_name,
                            "hashtags": post.hashtags[:10],
                            "is_mock": self._use_mock,
                        },
                        "scraped_at": now_utc().isoformat(),
                    })

        log.info(f"📸 Instagram hoàn tất: {len(all_posts)} posts → {len(raw_results)} entries (mock={self._use_mock})")
        return raw_results


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="HanoMate Instagram Scraper")
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    scraper = InstagramScraper()
    results = scraper.scrape()

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        log.info(f"💾 Đã lưu {len(results)} entries → {args.output}")
    else:
        print(json.dumps(results[:3], ensure_ascii=False, indent=2))
        print(f"\n... Tổng cộng {len(results)} entries")
