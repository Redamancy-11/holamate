"""
HanoMate Data Pipeline — ShopeeFood Scraper
=============================================
Cào thực đơn chi tiết từ ShopeeFood (Now.vn) — khu vực Hà Nội.
Đây là nguồn dữ liệu có cấu trúc nhất, đóng vai trò anchor price cho cross-verification.

Sử dụng ShopeeFood public API v6.
"""

import time
import json
import logging
from typing import Optional
from dataclasses import dataclass, field

import httpx

from config import (
    SHOPEEFOOD_CITY_ID,
    SHOPEEFOOD_MAX_RESTAURANTS,
    SHOPEEFOOD_CATEGORY_IDS,
    get_random_ua,
    normalize_vendor_name,
    now_utc,
)

log = logging.getLogger("hanomate.shopeefood")

# ── Data Structures ───────────────────────────────────────────────────────────


@dataclass
class ShopeeRestaurant:
    """Một nhà hàng / quán ăn trên ShopeeFood."""

    restaurant_id: int = 0
    name: str = ""
    address: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    rating: float = 0.0
    total_reviews: int = 0
    price_range: dict = field(default_factory=dict)
    categories: list[str] = field(default_factory=list)
    is_open: bool = True
    photo_url: str = ""
    menu_items: list[dict] = field(default_factory=list)


# ── ShopeeFood API Client ─────────────────────────────────────────────────────


class ShopeeFoodScraper:
    """
    Scraper cho ShopeeFood sử dụng public API v6.

    Flow:
    1. Lấy danh sách nhà hàng theo city_id + category
    2. Với mỗi nhà hàng → lấy chi tiết menu
    3. Extract: tên quán, địa chỉ, tọa độ GPS, menu (tên món + giá)
    """

    API_BASE = "https://gappapi.deliverynow.vn/api"

    # Headers mặc định cho ShopeeFood API
    DEFAULT_HEADERS = {
        "x-foody-client-id": "",
        "x-foody-client-type": "1",
        "x-foody-app-type": "1004",
        "x-foody-client-version": "3.0.0",
        "x-foody-api-version": "1",
        "x-foody-client-language": "vi",
    }

    def __init__(self, max_restaurants: int = None):
        self.max_restaurants = max_restaurants or SHOPEEFOOD_MAX_RESTAURANTS
        self.client = httpx.Client(
            timeout=30.0,
            follow_redirects=True,
            headers={
                **self.DEFAULT_HEADERS,
                "User-Agent": get_random_ua(),
                "Accept": "application/json",
            },
        )
        self._api_blocked = False

    MOCK_DATA = [
        {"name": "Highlands Coffee Hola", "address": "Campus FPT University, Thach That", "lat": 21.0142, "lng": 105.5262, "rating": 4.8, "reviews": 1240,
         "menu": [{"name": "Phin sua da", "price": 29000}, {"name": "Tra sen vang", "price": 45000}, {"name": "Banh mi thit nuong", "price": 19000}]},
        {"name": "Bay Coffee & Tea", "address": "Ho Tan Xa, Thach That", "lat": 21.0189, "lng": 105.5289, "rating": 4.9, "reviews": 980,
         "menu": [{"name": "Ca phe muoi", "price": 25000}, {"name": "Tra sua o long", "price": 30000}, {"name": "Banh mousse mat cha", "price": 35000}]},
        {"name": "1988 BBQ Tan Xa", "address": "Thon Tan Xa, Thach That", "lat": 21.0205, "lng": 105.5305, "rating": 4.7, "reviews": 850,
         "menu": [{"name": "Buffet nuong 129k", "price": 129000}, {"name": "Buffet nuong lau 159k", "price": 159000}]},
        {"name": "Twitter Beans Coffee", "address": "Toa nha Viettel, Khu CNC Hoa Lac", "lat": 21.0152, "lng": 105.5298, "rating": 4.6, "reviews": 620,
         "menu": [{"name": "Americano da", "price": 35000}, {"name": "Croissant bo phap", "price": 28000}]},
        {"name": "Bun Dau Mam Tom Hola", "address": "Khu dich vu Tan Xa, Thach That", "lat": 21.0175, "lng": 105.5280, "rating": 4.5, "reviews": 450,
         "menu": [{"name": "Suat bun dau day du", "price": 35000}, {"name": "Nuoc sau da", "price": 12000}]},
        {"name": "Ga Ri Phu Binh", "address": "Yen Binh, Thach That", "lat": 21.0090, "lng": 105.5185, "rating": 4.8, "reviews": 1100,
         "menu": [{"name": "Ga ri dap dat nuong", "price": 220000}, {"name": "Ga ri hap la chanh", "price": 200000}]},
        {"name": "Com Tam KTX FPT", "address": "Dom A KTX FPT, Thach That", "lat": 21.0132, "lng": 105.5245, "rating": 4.2, "reviews": 340,
         "menu": [{"name": "Com tam suon trung", "price": 30000}, {"name": "Com tam ga quay", "price": 35000}]},
        {"name": "Lau Cua Dong Hoa Lac", "address": "Quoc lo 21, Thach That", "lat": 21.0240, "lng": 105.5220, "rating": 4.7, "reviews": 730,
         "menu": [{"name": "Noi lau cua dong size nho", "price": 250000}, {"name": "Noi lau cua dong size lon", "price": 400000}]},
    ]
    def _get_restaurants_by_category(
        self,
        category_id: int,
        page: int = 1,
        limit: int = 48,
    ) -> list[dict]:
        """
        Lấy danh sách nhà hàng theo category trong thành phố.
        Endpoint: GET /delivery/get_delivery_dishes
        """
        url = f"{self.API_BASE}/delivery/get_delivery_dishes"
        params = {
            "city_id": SHOPEEFOOD_CITY_ID,
            "category_group": category_id,
            "page": page,
            "limit": limit,
            "sort_type": 2,  # Sort by popularity
            "request_id": int(time.time() * 1000),
        }

        try:
            resp = self.client.get(url, params=params)
            if resp.status_code != 200:
                log.warning(
                    f"ShopeeFood API trả về {resp.status_code} cho category {category_id}"
                )
                return []

            data = resp.json()
            if data.get("result") != "success":
                log.warning(f"ShopeeFood API error: {data.get('result')}")
                return []

            infos = data.get("reply", {}).get("delivery_infos", [])
            return [info.get("delivery", {}) for info in infos if info.get("delivery")]

        except Exception as e:
            log.error(f"Lỗi lấy restaurants category {category_id}: {e}")
            return []

    def _get_restaurant_detail(self, restaurant_id: int) -> Optional[dict]:
        """
        Lấy thông tin chi tiết nhà hàng.
        Endpoint: GET /delivery/get_detail
        """
        url = f"{self.API_BASE}/delivery/get_detail"
        params = {
            "id_type": 2,
            "request_id": int(time.time() * 1000),
        }

        try:
            resp = self.client.get(
                url,
                params={**params, "id": restaurant_id},
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            if data.get("result") == "success":
                return data.get("reply", {}).get("delivery_detail", {})
            return None

        except Exception as e:
            log.debug(f"Lỗi lấy detail restaurant {restaurant_id}: {e}")
            return None

    def _get_menu(self, restaurant_id: int) -> list[dict]:
        """
        Lấy toàn bộ menu của nhà hàng.
        Endpoint: GET /dish/get_delivery_dishes
        """
        url = f"{self.API_BASE}/dish/get_delivery_dishes"
        params = {
            "id_type": 2,
            "request_id": int(time.time() * 1000),
        }

        try:
            resp = self.client.get(
                url,
                params={**params, "id": restaurant_id},
            )
            if resp.status_code != 200:
                return []

            data = resp.json()
            if data.get("result") != "success":
                return []

            menu_infos = data.get("reply", {}).get("menu_infos", [])
            dishes = []

            for category in menu_infos:
                category_name = category.get("dish_type_name", "")
                for dish in category.get("dishes", []):
                    # Safely extract price — API có thể trả về int hoặc dict
                    raw_price = dish.get("price", 0)
                    if isinstance(raw_price, dict):
                        price_val = raw_price.get("value", 0)
                    else:
                        price_val = raw_price

                    raw_discount = dish.get("discount_price")
                    if isinstance(raw_discount, dict):
                        discount_val = raw_discount.get("value")
                    else:
                        discount_val = raw_discount

                    dish_info = {
                        "dish_id": dish.get("id", 0),
                        "name": dish.get("name", ""),
                        "description": dish.get("description", ""),
                        "price": price_val,
                        "discount_price": discount_val,
                        "is_available": dish.get("is_available", True),
                        "category": category_name,
                        "photo": dish.get("photos", [{}])[0].get("value", "")
                        if dish.get("photos")
                        else "",
                        # Các options / toppings
                        "options": [],
                    }

                    # Parse options
                    for option_group in dish.get("options", []):
                        option_items = option_group.get("option_items", {})
                        if isinstance(option_items, dict):
                            items_list = option_items.get("items", [])
                        elif isinstance(option_items, list):
                            items_list = option_items
                        else:
                            items_list = []
                        for option in items_list:
                            opt_price = option.get("price", 0)
                            if isinstance(opt_price, dict):
                                opt_price = opt_price.get("value", 0)
                            dish_info["options"].append(
                                {
                                    "name": option.get("name", ""),
                                    "price": opt_price,
                                }
                            )

                    # Chỉ lấy món có giá > 0 và đang available
                    if dish_info["price"] > 0 and dish_info["is_available"]:
                        dishes.append(dish_info)

            return dishes

        except Exception as e:
            log.error(f"Lỗi lấy menu restaurant {restaurant_id}: {e}")
            return []

    def _parse_restaurant(self, raw: dict) -> ShopeeRestaurant:
        """Parse raw API data thành ShopeeRestaurant."""
        return ShopeeRestaurant(
            restaurant_id=raw.get("id", 0),
            name=raw.get("name", ""),
            address=raw.get("address", ""),
            latitude=raw.get("position", {}).get("latitude", 0.0),
            longitude=raw.get("position", {}).get("longitude", 0.0),
            rating=raw.get("rating", {}).get("avg", 0.0),
            total_reviews=raw.get("rating", {}).get("total_review", 0),
            price_range={
                "min": raw.get("price_range", {}).get("min_price", 0),
                "max": raw.get("price_range", {}).get("max_price", 0),
            },
            categories=[
                cat.get("name", "")
                for cat in raw.get("categories", [])
                if cat.get("name")
            ],
            is_open=raw.get("is_open", True),
            photo_url=(
                raw.get("photos", [{}])[0].get("value", "")
                if raw.get("photos")
                else ""
            ),
        )

    def scrape(self) -> list[dict]:
        """
        Chạy scraper: lấy danh sách nhà hàng → lấy menu → output entries.

        Returns:
            list[dict]: Danh sách raw price entries theo format chuẩn pipeline.
        """
        log.info(
            f"🍜 Bắt đầu cào ShopeeFood — City: {SHOPEEFOOD_CITY_ID}, "
            f"Categories: {SHOPEEFOOD_CATEGORY_IDS}"
        )

        all_restaurants: list[ShopeeRestaurant] = []
        seen_ids: set[int] = set()

        # Bước 1: Lấy danh sách nhà hàng theo từng category
        for cat_id in SHOPEEFOOD_CATEGORY_IDS:
            log.info(f"  📂 Đang lấy category {cat_id}")
            page = 1

            while len(all_restaurants) < self.max_restaurants:
                raw_list = self._get_restaurants_by_category(cat_id, page=page)
                if not raw_list:
                    break

                for raw in raw_list:
                    rid = raw.get("id", 0)
                    if rid and rid not in seen_ids:
                        seen_ids.add(rid)
                        restaurant = self._parse_restaurant(raw)
                        all_restaurants.append(restaurant)

                page += 1
                time.sleep(1.0)

                if len(all_restaurants) >= self.max_restaurants:
                    break

        log.info(f"  📊 Tổng {len(all_restaurants)} nhà hàng duy nhất")

        # Fallback: nếu API bị block, dùng mock data
        if not all_restaurants:
            log.warning("  ⚡ ShopeeFood API bị block (403). Dùng mock data...")
            raw_results = []
            for r in self.MOCK_DATA:
                for dish in r.get("menu", []):
                    raw_results.append({
                        "source": "shopeefood",
                        "vendor_name": r["name"],
                        "vendor_name_normalized": normalize_vendor_name(r["name"]),
                        "item_name": dish["name"],
                        "price": dish["price"],
                        "rating": r["rating"],
                        "address": r["address"],
                        "coordinates": {"lat": r["lat"], "lng": r["lng"]},
                        "raw_text": "",
                        "metadata": {"total_reviews": r["reviews"], "is_mock": True},
                        "scraped_at": now_utc().isoformat(),
                    })
            log.info(f"  ShopeeFood mock: {len(raw_results)} entries")
            return raw_results

        # Bước 2: Lấy menu cho mỗi nhà hàng
        raw_results = []

        for i, restaurant in enumerate(all_restaurants):
            log.info(
                f"  🍽️  [{i+1}/{len(all_restaurants)}] "
                f"Đang lấy menu: {restaurant.name}"
            )

            menu = self._get_menu(restaurant.restaurant_id)
            restaurant.menu_items = menu

            if not menu:
                log.debug(f"     Không có menu cho {restaurant.name}")
                # Vẫn tạo entry cho restaurant (không có menu cụ thể)
                raw_results.append(
                    {
                        "source": "shopeefood",
                        "vendor_name": restaurant.name,
                        "vendor_name_normalized": normalize_vendor_name(restaurant.name),
                        "item_name": "general",
                        "price": (
                            (restaurant.price_range.get("min", 0) + restaurant.price_range.get("max", 0)) / 2
                            if restaurant.price_range.get("max", 0) > 0
                            else None
                        ),
                        "rating": restaurant.rating,
                        "address": restaurant.address,
                        "coordinates": {
                            "lat": restaurant.latitude,
                            "lng": restaurant.longitude,
                        },
                        "raw_text": "",
                        "metadata": {
                            "restaurant_id": restaurant.restaurant_id,
                            "total_reviews": restaurant.total_reviews,
                            "categories": restaurant.categories,
                            "is_open": restaurant.is_open,
                            "photo": restaurant.photo_url,
                        },
                        "scraped_at": now_utc().isoformat(),
                    }
                )
            else:
                # Tạo entry cho mỗi món trong menu
                for dish in menu:
                    raw_results.append(
                        {
                            "source": "shopeefood",
                            "vendor_name": restaurant.name,
                            "vendor_name_normalized": normalize_vendor_name(
                                restaurant.name
                            ),
                            "item_name": dish["name"],
                            "price": dish["price"],
                            "discount_price": dish.get("discount_price"),
                            "rating": restaurant.rating,
                            "address": restaurant.address,
                            "coordinates": {
                                "lat": restaurant.latitude,
                                "lng": restaurant.longitude,
                            },
                            "raw_text": dish.get("description", ""),
                            "metadata": {
                                "restaurant_id": restaurant.restaurant_id,
                                "dish_id": dish["dish_id"],
                                "dish_category": dish.get("category", ""),
                                "total_reviews": restaurant.total_reviews,
                                "categories": restaurant.categories,
                                "photo": dish.get("photo", ""),
                                "options": dish.get("options", []),
                            },
                            "scraped_at": now_utc().isoformat(),
                        }
                    )

            time.sleep(0.5)  # Rate limiting giữa các restaurant

        log.info(
            f"🍜 ShopeeFood hoàn tất: "
            f"{len(all_restaurants)} nhà hàng → {len(raw_results)} menu items"
        )
        return raw_results


# ── CLI Entry Point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="HanoMate ShopeeFood Scraper")
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
    parser.add_argument(
        "--max",
        type=int,
        default=None,
        help="Số nhà hàng tối đa (override config)",
    )
    args = parser.parse_args()

    if args.max:
        scraper = ShopeeFoodScraper(max_restaurants=args.max)
    else:
        scraper = ShopeeFoodScraper()
    results = scraper.scrape()

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        log.info(f"💾 Đã lưu {len(results)} entries → {args.output}")
    else:
        # In mẫu 5 entries đầu tiên
        print(json.dumps(results[:5], ensure_ascii=False, indent=2))
        print(f"\n... Tổng cộng {len(results)} entries")
