import httpx, re
from config import get_random_ua
url='https://www.tiktok.com/tag/anuonghanoi'
headers={
    'User-Agent': get_random_ua(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    'Referer': 'https://www.google.com',
}
with httpx.Client(timeout=30.0, follow_redirects=True, headers=headers) as client:
    r = client.get(url)
    t = r.text
    ids = re.findall(r'<script[^>]+id="([^"]+)"', t)
    print('count', len(ids))
    print(ids[:20])
    print('has JSON script', any('application/json' in m for m in ids))
    m = re.search(r'<script[^>]+type="application/json"[^>]*>(.*?)</script>', t, re.S)
    print('first json script len', len(m.group(1)) if m else 'none')
    print('window.__data pos', t.find('window.__data'))
    print('SIGI_STATE pos', t.find('SIGI_STATE'))
