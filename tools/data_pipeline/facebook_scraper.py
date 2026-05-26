"""
HanoMate Data Pipeline — Facebook Scraper
==========================================
Cào bài viết và bình luận từ các Facebook Groups về ăn uống / du lịch Hà Nội.
Trích xuất: tên quán, giá, địa chỉ, review text.

Sử dụng Facebook mobile web endpoint (không cần Graph API).
Có thể chạy không cần auth (giới hạn) hoặc dùng cookie để cào sâu hơn.
"""

import re
import time
import json
import logging
from typing import Optional
from dataclasses import dataclass, field

import httpx
from bs4 import BeautifulSoup

from config import (
    FACEBOOK_GROUP_SLUGS,
    FACEBOOK_MAX_POSTS,
    FACEBOOK_COOKIE,
    parse_prices_from_text,
    normalize_vendor_name,
    now_utc,
)

log = logging.getLogger("hanomate.facebook")

# ── Data Structures ───────────────────────────────────────────────────────────


@dataclass
class FacebookPost:
    """Một bài viết từ Facebook Group."""

    post_id: str = ""
    group_slug: str = ""
    author_name: str = ""
    content: str = ""
    timestamp: str = ""
    reactions_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    images: list[str] = field(default_factory=list)
    comments: list[str] = field(default_factory=list)

    # Extracted
    vendor_names: list[str] = field(default_factory=list)
    prices: list[float] = field(default_factory=list)
    addresses: list[str] = field(default_factory=list)
    menu_items: list[dict] = field(default_factory=list)


# ── Facebook Scraper ──────────────────────────────────────────────────────────


class FacebookScraper:
    """
    Scraper cho Facebook Groups sử dụng mobile web interface.

    Flow:
    1. Truy cập trang group mobile
    2. Parse HTML để lấy bài viết
    3. Extract nội dung + comments
    4. Trích xuất giá & tên quán từ text
    """

    MOBILE_BASE = "https://m.facebook.com"

    def __init__(self):
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Linux; Android 13; Pixel 7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Mobile Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
        }

        cookies = {}
        if FACEBOOK_COOKIE:
            # Parse cookie string "key1=val1; key2=val2"
            for pair in FACEBOOK_COOKIE.split(";"):
                pair = pair.strip()
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    cookies[k.strip()] = v.strip()

        self.client = httpx.Client(
            timeout=30.0,
            follow_redirects=True,
            headers=headers,
            cookies=cookies,
        )

    def _fetch_group_page(self, group_slug: str, cursor: Optional[str] = None) -> str:
        """Lấy HTML trang group Facebook mobile."""
        url = f"{self.MOBILE_BASE}/groups/{group_slug}/"
        if cursor:
            url += f"?bacr={cursor}"

        try:
            resp = self.client.get(url)
            if resp.status_code != 200:
                log.warning(
                    f"Facebook trả về {resp.status_code} cho group '{group_slug}'"
                )
                return ""
            return resp.text
        except Exception as e:
            log.error(f"Lỗi fetch group '{group_slug}': {e}")
            return ""

    def _parse_posts_from_html(self, html: str, group_slug: str) -> list[FacebookPost]:
        """Parse bài viết từ HTML mobile Facebook."""
        if not html:
            return []

        soup = BeautifulSoup(html, "lxml")
        posts = []

        # Facebook mobile wraps posts in article tags or specific div structures
        # Tìm các khối bài viết
        post_elements = soup.find_all("article") or soup.find_all(
            "div", {"data-ft": True}
        )

        if not post_elements:
            # Fallback: tìm theo class pattern phổ biến
            post_elements = soup.find_all("div", class_=re.compile(r"story_body"))

        for elem in post_elements:
            try:
                post = FacebookPost(group_slug=group_slug)

                # Extract post ID
                link = elem.find("a", href=re.compile(r"/story\.php|/permalink/"))
                if link:
                    href = link.get("href", "")
                    id_match = re.search(r"(?:story_fbid=|permalink/)(\d+)", href)
                    if id_match:
                        post.post_id = id_match.group(1)

                # Extract content
                content_div = (
                    elem.find("div", {"data-ft": '{"tn":"*s"}'})
                    or elem.find("p")
                    or elem
                )
                post.content = content_div.get_text(separator="\n", strip=True)

                # Extract author
                author_tag = elem.find("strong") or elem.find("h3")
                if author_tag:
                    post.author_name = author_tag.get_text(strip=True)

                # Extract reactions/comments count từ footer
                footer = elem.find("footer") or elem.find(
                    "div", class_=re.compile(r"footer|reaction")
                )
                if footer:
                    footer_text = footer.get_text()
                    reaction_match = re.search(r"(\d+)\s*(?:like|thích|cảm xúc)", footer_text, re.I)
                    comment_match = re.search(r"(\d+)\s*(?:comment|bình luận)", footer_text, re.I)
                    if reaction_match:
                        post.reactions_count = int(reaction_match.group(1))
                    if comment_match:
                        post.comments_count = int(comment_match.group(1))

                # Extract images
                img_tags = elem.find_all("img", src=re.compile(r"scontent"))
                post.images = [img["src"] for img in img_tags][:5]

                if post.content and len(post.content) > 20:
                    posts.append(post)

            except Exception as e:
                log.debug(f"Lỗi parse post element: {e}")
                continue

        return posts

    def _extract_menu_items(self, text: str) -> list[dict]:
        """
        Trích xuất menu items từ text bài viết.
        Pattern: "Tên món: 50k" hoặc "Tên món - 50.000đ"
        """
        items = []
        seen: set[tuple[str, float]] = set()  # (normalized_name, price) để tránh trùng

        # Pattern: dòng có tên món + giá
        patterns = [
            # "Bún chả: 35k", "Phở bò - 50.000đ"
            r"([A-ZÀ-Ỹa-zà-ỹ][^\n:–\-]{2,40})\s*[:\-–]\s*(\d{1,3}(?:[.,]\d{3})*\s*(?:k|K|đ|đồng|VND|nghìn|ngàn)?|\d{1,4}\s*[kK])",
            # Dạng list: "- Bún chả 35k"
            r"[-•*]\s*([A-ZÀ-Ỹa-zà-ỹ][^\n]{2,40}?)\s+(\d{1,3}(?:[.,]\d{3})*\s*(?:k|K|đ|đồng|VND)?|\d{1,4}\s*[kK])",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            for name, price_str in matches:
                prices = parse_prices_from_text(price_str)
                if prices:
                    clean_name = name.strip().rstrip(":- ")
                    key = (clean_name.lower(), prices[0])
                    if key not in seen:
                        seen.add(key)
                        items.append(
                            {
                                "item_name": clean_name,
                                "price": prices[0],
                            }
                        )

        return items

    def _extract_vendor_names(self, text: str) -> list[str]:
        """Trích xuất tên quán từ bài viết Facebook."""
        vendors = []

        patterns = [
            # "Review quán X", "Quán X ở Y"
            r"(?:[Rr]eview|đánh giá|giới thiệu)\s+(?:quán|tiệm|nhà hàng)?\s*([A-ZÀ-Ỹ][^\.,;!\?\n]{2,40})",
            # "Quán X", "Tiệm Y", "Nhà hàng Z"
            r"(?:quán|tiệm|nhà\s*hàng|quán\s*ăn|bún|phở|bánh|cơm|chè)\s+([A-ZÀ-Ỹ][^\.,;!\?\n]{2,30})",
            # Tên riêng in hoa đầu dòng (thường là tên quán trong review)
            r"^([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4})\s*[-–:]",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            vendors.extend(matches)

        stop_words = {
            "Hà Nội", "Việt Nam", "Sài Gòn", "Hồ Chí Minh",
            "Review Ăn", "Ăn Gì", "Đi Đâu", "Bao Nhiêu",
            "Mọi Người", "Các Bạn", "Chúc Mừng",
        }
        vendors = [v.strip() for v in vendors if v.strip() not in stop_words]

        return list(set(vendors))[:5]

    def _extract_addresses(self, text: str) -> list[str]:
        """Trích xuất địa chỉ từ text."""
        addresses = []

        patterns = [
            # "Địa chỉ: 123 phố ABC"
            r"(?:địa chỉ|ĐC|đ/c|add|address)\s*[:\-]\s*([^\n]{5,80})",
            # "số 123 đường/phố ABC"
            r"((?:số\s+)?\d{1,4}\s+(?:đường|phố|ngõ|ngách)\s+[^\n,;]{3,50})",
            # "123 ABC, quận X"
            r"(\d{1,4}\s+[A-ZÀ-Ỹ][^\n,]{3,30},\s*(?:quận|phường|Q\.|P\.)\s+[^\n,;]{2,20})",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            addresses.extend([a.strip() for a in matches])

        return list(set(addresses))[:3]

    def scrape(self) -> list[dict]:
        """
        Chạy scraper: duyệt groups → parse posts → extract data.

        Returns:
            list[dict]: Danh sách raw price entries theo format chuẩn pipeline.
        """
        log.info(f"📘 Bắt đầu cào Facebook — Groups: {FACEBOOK_GROUP_SLUGS}")
        raw_results = []

        for group_slug in FACEBOOK_GROUP_SLUGS:
            log.info(f"  📋 Đang cào group: {group_slug}")

            # Fetch trang đầu
            html = self._fetch_group_page(group_slug)
            posts = self._parse_posts_from_html(html, group_slug)
            log.info(f"     Tìm thấy {len(posts)} bài viết")

            for post in posts[:FACEBOOK_MAX_POSTS]:
                # Extract data từ content
                full_text = post.content

                post.vendor_names = self._extract_vendor_names(full_text)
                post.prices = parse_prices_from_text(full_text)
                post.addresses = self._extract_addresses(full_text)
                post.menu_items = self._extract_menu_items(full_text)

                # Extract từ comments (nếu có)
                for comment in post.comments:
                    post.prices.extend(parse_prices_from_text(comment))
                    post.vendor_names.extend(self._extract_vendor_names(comment))

                post.vendor_names = list(set(post.vendor_names))
                post.prices = list(set(post.prices))

                # Nếu có menu items cụ thể → tạo entry cho mỗi item
                if post.menu_items:
                    for vendor_name in post.vendor_names or ["unknown"]:
                        for item in post.menu_items:
                            raw_results.append(
                                {
                                    "source": "facebook",
                                    "vendor_name": vendor_name,
                                    "vendor_name_normalized": normalize_vendor_name(
                                        vendor_name
                                    ),
                                    "item_name": item["item_name"],
                                    "price": item["price"],
                                    "rating": self._estimate_rating(post),
                                    "address": (
                                        post.addresses[0] if post.addresses else None
                                    ),
                                    "raw_text": post.content[:500],
                                    "metadata": {
                                        "post_id": post.post_id,
                                        "group": group_slug,
                                        "author": post.author_name,
                                        "reactions": post.reactions_count,
                                    },
                                    "scraped_at": now_utc().isoformat(),
                                }
                            )
                # Nếu không có menu → dùng giá chung
                elif post.vendor_names and post.prices:
                    for vendor_name in post.vendor_names:
                        for price in post.prices:
                            raw_results.append(
                                {
                                    "source": "facebook",
                                    "vendor_name": vendor_name,
                                    "vendor_name_normalized": normalize_vendor_name(
                                        vendor_name
                                    ),
                                    "item_name": "general",
                                    "price": price,
                                    "rating": self._estimate_rating(post),
                                    "address": (
                                        post.addresses[0] if post.addresses else None
                                    ),
                                    "raw_text": post.content[:500],
                                    "metadata": {
                                        "post_id": post.post_id,
                                        "group": group_slug,
                                        "author": post.author_name,
                                        "reactions": post.reactions_count,
                                    },
                                    "scraped_at": now_utc().isoformat(),
                                }
                            )

                time.sleep(2.0)  # Rate limiting giữa các post

            time.sleep(5.0)  # Nghỉ giữa các group

        log.info(f"📘 Facebook hoàn tất: {len(raw_results)} entries")
        return raw_results

    def _estimate_rating(self, post: FacebookPost) -> float:
        """Ước lượng rating dựa trên reactions."""
        if post.reactions_count > 100:
            return 4.5
        elif post.reactions_count > 50:
            return 4.0
        elif post.reactions_count > 20:
            return 3.5
        else:
            return 3.0


# ── CLI Entry Point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="HanoMate Facebook Scraper")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ log kết quả, không ghi DB",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Lưu kết quả ra file JSON",
    )
    args = parser.parse_args()

    scraper = FacebookScraper()
    results = scraper.scrape()

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        log.info(f"💾 Đã lưu {len(results)} entries → {args.output}")
    else:
        print(json.dumps(results[:5], ensure_ascii=False, indent=2))
        print(f"\n... Tổng cộng {len(results)} entries")
