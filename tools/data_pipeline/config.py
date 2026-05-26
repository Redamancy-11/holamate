"""
HanoMate Data Pipeline — Config chung
=====================================
Module quản lý cấu hình, kết nối MongoDB, logging, và constants dùng chung.
Kết nối trực tiếp vào cùng database mà backend Node.js đang sử dụng.
"""

import os
import re
import logging
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient
from fake_useragent import UserAgent

# ── Load .env ──────────────────────────────────────────────────────────────────
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
else:
    # Fallback: dùng .env của backend
    _backend_env = Path(__file__).parent.parent.parent / "backend" / ".env"
    if _backend_env.exists():
        load_dotenv(_backend_env)

# ── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/hanomate")

_client = None
_db = None


def get_db():
    """Lấy instance MongoDB database (singleton)."""
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGO_URI)
        _db = _client.get_database()
        logging.info(f"✅ Kết nối MongoDB: {MONGO_URI}")
    return _db


def close_db():
    """Đóng kết nối MongoDB."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logging.info("🔒 Đã đóng kết nối MongoDB")


# ── Logging ────────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s │ %(levelname)-7s │ %(name)-20s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger("hanomate.pipeline")

# ── Constants ──────────────────────────────────────────────────────────────────
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"

# TikTok
TIKTOK_KEYWORDS = [
    kw.strip()
    for kw in os.getenv(
        "TIKTOK_SEARCH_KEYWORDS",
        "fpthoalac,reviewhoalac,holaers,dhfpthoalac",
    ).split(",")
]
TIKTOK_MAX_VIDEOS = int(os.getenv("TIKTOK_MAX_VIDEOS_PER_KEYWORD", "30"))

# Facebook
FACEBOOK_GROUP_SLUGS = [
    s.strip()
    for s in os.getenv(
        "FACEBOOK_GROUP_SLUGS",
        "reviewhoalac,sinhvienfpthoalac",
    ).split(",")
]
FACEBOOK_MAX_POSTS = int(os.getenv("FACEBOOK_MAX_POSTS_PER_GROUP", "50"))
FACEBOOK_COOKIE = os.getenv("FACEBOOK_COOKIE", "")

# ShopeeFood
SHOPEEFOOD_CITY_ID = int(os.getenv("SHOPEEFOOD_CITY_ID", "217"))
SHOPEEFOOD_MAX_RESTAURANTS = int(os.getenv("SHOPEEFOOD_MAX_RESTAURANTS", "100"))
SHOPEEFOOD_CATEGORY_IDS = [
    int(c.strip())
    for c in os.getenv("SHOPEEFOOD_CATEGORY_IDS", "1,2,3").split(",")
]

# ── User-Agent ─────────────────────────────────────────────────────────────────
try:
    _ua = UserAgent()
except Exception:
    _ua = None


def get_random_ua() -> str:
    """Trả về user-agent ngẫu nhiên để tránh bị block."""
    if _ua:
        return _ua.random
    return (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    )


# ── Price Parsing (Việt Nam) ──────────────────────────────────────────────────
# Patterns: 50k, 50K, 50.000đ, 50,000 VND, 50 nghìn, 50 ngàn, 150.000 - 200.000
_PRICE_PATTERNS = [
    # 50k / 50K
    r"(\d{1,4})\s*[kK](?:\b|đ)",
    # 50.000đ / 50,000đ / 50000đ
    r"(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|đồng|vnd|vnđ)",
    # 50.000 / 50,000 (standalone, >= 4 digits pattern)
    r"(\d{1,3}(?:[.,]\d{3})+)(?:\s|$|[^%\d])",
    # 50 nghìn / 50 ngàn
    r"(\d{1,4})\s*(?:nghìn|ngàn|ngan|nghin)",
    # 1 triệu / 1.5 triệu
    r"(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:triệu|trieu|tr)\b",
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in _PRICE_PATTERNS]


def parse_prices_from_text(text: str) -> list[float]:
    """
    Trích xuất tất cả giá tiền (VND) từ text tiếng Việt.
    Trả về list số tiền đã chuẩn hóa về đơn vị VND.
    """
    prices = []
    if not text:
        return prices

    # Track matched spans to avoid duplicate matches from overlapping patterns
    matched_spans: set[tuple[int, int]] = set()

    for i, pattern in enumerate(_COMPILED_PATTERNS):
        for match in pattern.finditer(text):
            # Skip if this span overlaps with an already-matched span
            span = (match.start(1), match.end(1))
            if any(s[0] <= span[0] < s[1] or s[0] < span[1] <= s[1] for s in matched_spans):
                continue

            raw = match.group(1)
            try:
                if i == 0:  # Xk pattern
                    prices.append(float(raw) * 1000)
                elif i == 4:  # X triệu pattern
                    val = float(raw.replace(",", "."))
                    prices.append(val * 1_000_000)
                elif i == 3:  # X nghìn pattern
                    prices.append(float(raw) * 1000)
                else:  # Dạng có dấu chấm/phẩy ngăn cách hàng nghìn
                    cleaned = raw.replace(".", "").replace(",", "")
                    val = float(cleaned)
                    if val >= 1000:  # Chỉ lấy giá >= 1000 VND
                        prices.append(val)
                matched_spans.add(span)
            except (ValueError, TypeError):
                continue

    return prices


def normalize_vendor_name(name: str) -> str:
    """Chuẩn hóa tên vendor để so khớp giữa các nguồn."""
    if not name:
        return ""
    # Lowercase, bỏ dấu câu, chuẩn hóa khoảng trắng
    name = name.lower().strip()
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def now_utc() -> datetime:
    """Trả về thời gian UTC hiện tại."""
    return datetime.now(timezone.utc)
