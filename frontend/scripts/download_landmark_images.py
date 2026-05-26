from pathlib import Path
import requests
from PIL import Image
from io import BytesIO

LANDMARKS = {
    'phoco.png': 'Khu_phố_cổ_Hà_Nội',
    'hoankiem.png': 'Hồ_Hoàn_Kiếm',
    'hotay.png': 'Hồ_Tây',
    'tranquoc.png': 'Chùa_Trấn_Quốc',
    'vanmieu.png': 'Văn_Miếu_–_Quốc_Tử_Giám',
}

OUT_DIR = Path('public/images')
OUT_DIR.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'hanomate-image-crawler/1.0 (https://example.com)'}

for filename, page in LANDMARKS.items():
    api_url = 'https://vi.wikipedia.org/w/api.php'
    params = {
        'action': 'query',
        'titles': page,
        'prop': 'pageimages',
        'piprop': 'original',
        'format': 'json',
    }
    print(f'Querying page image for {page}')
    r = requests.get(api_url, params=params, headers=HEADERS, timeout=20)
    r.raise_for_status()
    data = r.json()
    pages = data.get('query', {}).get('pages', {})
    image_url = None
    for page_id, info in pages.items():
        if 'original' in info:
            image_url = info['original']['source']
    if not image_url:
        raise SystemExit(f'No pageimage for {page}')
    print(' Selected', image_url)
    r2 = requests.get(image_url, headers=HEADERS, timeout=20)
    r2.raise_for_status()
    out_path = OUT_DIR / filename
    if image_url.lower().endswith('.png'):
        out_path.write_bytes(r2.content)
    else:
        image = Image.open(BytesIO(r2.content)).convert('RGB')
        image.save(out_path, format='PNG')
    print(' Saved', out_path)
