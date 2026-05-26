from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

assets = [
    ('phoco-new.png', '#111827', '#F97316', 'PHỐ CỔ'),
    ('hoankiem-new.png', '#0F172A', '#22C55E', 'HỒ HOÀN KIẾM'),
    ('vanmieu-new.png', '#020617', '#8B5CF6', 'VĂN MIẾU'),
    ('hotay-new.png', '#0F172A', '#38BDF8', 'HỒ TÂY'),
    ('tranquoc-new.png', '#111827', '#F97316', 'TRẤN QUỐC'),
]

out_dir = Path('public/images')
out_dir.mkdir(parents=True, exist_ok=True)

for name, bg, accent, label in assets:
    path = out_dir / name
    img = Image.new('RGB', (1200, 800), bg)
    draw = ImageDraw.Draw(img)
    bg_r, bg_g, bg_b = int(bg[1:3], 16), int(bg[3:5], 16), int(bg[5:7], 16)
    ac_r, ac_g, ac_b = int(accent[1:3], 16), int(accent[3:5], 16), int(accent[5:7], 16)
    for i in range(img.height):
        r = round(bg_r + (ac_r - bg_r) * (i / img.height))
        g = round(bg_g + (ac_g - bg_g) * (i / img.height))
        b = round(bg_b + (ac_b - bg_b) * (i / img.height))
        draw.line([(0, i), (img.width, i)], fill=(r, g, b))
    try:
        font = ImageFont.truetype('arial.ttf', 96)
        font_small = ImageFont.truetype('arial.ttf', 36)
    except Exception:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()
    w, h = draw.textsize(label, font=font)
    x = (img.width - w) / 2
    y = img.height - 240
    draw.text((x + 4, y + 4), label, font=font, fill=(0, 0, 0))
    draw.text((x, y), label, font=font, fill=(255, 255, 255))
    sub = 'HÀ NỘI'
    w2, h2 = draw.textsize(sub, font=font_small)
    x2 = (img.width - w2) / 2
    draw.text((x2 + 2, y + 104), sub, font=font_small, fill=(0, 0, 0))
    draw.text((x2, y + 100), sub, font=font_small, fill=(255, 255, 255))
    img.save(path)
    print(f'saved {path}')
