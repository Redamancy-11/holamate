import requests

SEARCHES = {
    'phoco': 'phố cổ hà nội',
    'hoankiem': 'hồ hoàn kiếm',
    'hotay': 'hồ tây',
    'tranquoc': 'chùa trấn quốc',
    'vanmieu': 'văn miếu',
}

headers = {'User-Agent': 'hanomate-image-crawler/1.0 (https://example.com)'}
for key, term in SEARCHES.items():
    url = 'https://vi.wikipedia.org/w/api.php'
    params = {
        'action': 'query',
        'list': 'search',
        'srsearch': term,
        'format': 'json',
        'srlimit': 5,
    }
    r = requests.get(url, params=params, headers=headers, timeout=20)
    print('---', key, term, r.status_code)
    try:
        data = r.json()
        for item in data.get('query', {}).get('search', []):
            print('   ', item['title'])
    except Exception as e:
        print('JSON error', e)
