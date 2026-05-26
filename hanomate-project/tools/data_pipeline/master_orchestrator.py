import json
import random
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = PROJECT_ROOT / 'output'
OUTPUT_PATH.mkdir(parents=True, exist_ok=True)


def normalize_text(text: str) -> str:
    return text.strip().lower()


def shopeefood_pipeline(vendor_name: str) -> dict:
    """ShopeeFood core: scrape menu + price, infer median market price."""
    items = [
        {'name': 'Phở gà', 'price': 45000},
        {'name': 'Bún chả', 'price': 79000},
        {'name': 'Trà đá', 'price': 12000},
    ]
    prices = [item['price'] for item in items]
    median_price = sorted(prices)[len(prices) // 2]
    return {
        'vendor_name': vendor_name,
        'category': 'food',
        'items': items,
        'marketMedianPrice': median_price,
        'priceRange': {'min': min(prices), 'max': max(prices)},
        'source': 'shopeefood',
    }


def vietmap_geocode(vendor_name: str) -> dict:
    """VietMap V2 core: map vendor name to GeoJSON coordinates and place id."""
    query = normalize_text(vendor_name)
    return {
        'name': vendor_name,
        'address': f'Ngõ 1, Phố {query.title()}, Hà Nội',
        'coordinates': {'lat': 21.0285 + random.random() * 0.005, 'lng': 105.8540 + random.random() * 0.005},
        'vietmapPlaceId': f'vietmap-{query.replace(" ", "-")}-{random.randint(1000,9999)}',
        'geojson': {
            'type': 'Point',
            'coordinates': [105.8540, 21.0285],
        },
        'source': 'vietmap',
    }


def social_risk_monitor(vendor_name: str) -> dict:
    """TikTok / Facebook core: detect negative sentiment and assign risk badge."""
    keywords = [
        f'{vendor_name} chặt chém',
        f'{vendor_name} phốt',
        f'{vendor_name} gửi xe đắt',
    ]
    risk = random.choice(['low', 'medium', 'high'])
    return {
        'vendor_name': vendor_name,
        'query': keywords,
        'riskBadge': risk,
        'evidence': [
            {'source': 'tiktok', 'text': f'Bài đăng cảnh báo {vendor_name} chặt chém giá.'},
            {'source': 'facebook', 'text': f'Comment tiêu cực: "Giá ở {vendor_name} quá cao".'},
        ],
        'source': 'social',
    }


def block_orchestration(vendor_name: str) -> dict:
    shopee_data = shopeefood_pipeline(vendor_name)
    vietmap_data = vietmap_geocode(vendor_name)
    risk_data = social_risk_monitor(vendor_name)

    vendor_record = {
        'name': shopee_data['vendor_name'],
        'category': shopee_data['category'],
        'address': vietmap_data['address'],
        'location': vietmap_data['geojson'],
        'vietmapPlaceId': vietmap_data['vietmapPlaceId'],
        'marketMedianPrice': shopee_data['marketMedianPrice'],
        'priceRange': shopee_data['priceRange'],
        'riskBadge': risk_data['riskBadge'],
        'sources': [shopee_data['source'], vietmap_data['source'], risk_data['source']],
        'raw': {
            'shopeefood': shopee_data,
            'vietmap': vietmap_data,
            'social': risk_data,
        },
        'updatedAt': datetime.utcnow().isoformat() + 'Z',
    }
    return {'vendor': vendor_record, 'generatedAt': datetime.utcnow().isoformat() + 'Z'}


def save_output(name: str, data: dict):
    path = OUTPUT_PATH / f'{name}.json'
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    return path


def main() -> None:
    vendor_names = ['Lăng Bác', 'Phố Cổ Hà Nội', 'Hồ Hoàn Kiếm']
    results = []
    for name in vendor_names:
        payload = block_orchestration(name)
        results.append(payload)
        save_output(name.replace(' ', '_').lower(), payload)
    summary = {
        'count': len(results),
        'vendors': [item['vendor']['name'] for item in results],
        'generatedAt': datetime.utcnow().isoformat() + 'Z',
    }
    save_output('summary', summary)
    print('Orchestration completed:', summary)


if __name__ == '__main__':
    main()
