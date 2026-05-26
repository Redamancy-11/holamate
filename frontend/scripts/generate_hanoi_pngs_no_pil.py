import zlib
import struct
from pathlib import Path

FONT = {
    'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
    'B': [0b11110,0b10001,0b11110,0b10001,0b10001,0b10001,0b11110],
    'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
    'D': [0b11100,0b10010,0b10001,0b10001,0b10001,0b10010,0b11100],
    'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
    'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
    'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
    'I': [0b01110,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
    'K': [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
    'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
    'M': [0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
    'N': [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
    'O': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
    'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
    'Q': [0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
    'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
    'S': [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
    'T': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
    'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
    'V': [0b10001,0b10001,0b10001,0b10001,0b10001,0b01010,0b00100],
    'Y': [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
    ' ': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00000,0b00000],
}


def png_write(filename, width, height, pixels):
    def chunk(chunk_type, data):
        chunk_data = chunk_type + data
        return struct.pack('>I', len(data)) + chunk_data + struct.pack('>I', zlib.crc32(chunk_data) & 0xffffffff)

    raw_data = b''
    for y in range(height):
        raw_data += b'\x00' + bytes(pixels[y*width*3:(y+1)*width*3])
    compressed = zlib.compress(raw_data, level=9)
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))


def blend(bg, fg, alpha):
    return tuple(round(bg[i] + (fg[i] - bg[i]) * alpha) for i in range(3))


def draw_text(pixels, width, height, x, y, text, color, scale=3):
    for ch_i, ch in enumerate(text.upper()):
        pattern = FONT.get(ch, FONT[' '])
        for row, bits in enumerate(pattern):
            for col in range(5):
                if bits & (1 << (4 - col)):
                    for dy in range(scale):
                        for dx in range(scale):
                            px = x + (ch_i * (6 * scale)) + col * scale + dx
                            py = y + row * scale + dy
                            if 0 <= px < width and 0 <= py < height:
                                idx = (py * width + px) * 3
                                pixels[idx:idx+3] = color


def make_image(name, bg, accent, label, label2='HANOI'):
    width, height = 1200, 800
    pixels = bytearray(width * height * 3)
    bg_r, bg_g, bg_b = int(bg[1:3], 16), int(bg[3:5], 16), int(bg[5:7], 16)
    ac_r, ac_g, ac_b = int(accent[1:3], 16), int(accent[3:5], 16), int(accent[5:7], 16)
    for y in range(height):
        t = y / (height - 1)
        r = round(bg_r + (ac_r - bg_r) * t)
        g = round(bg_g + (ac_g - bg_g) * t)
        b = round(bg_b + (ac_b - bg_b) * t)
        for x in range(width):
            idx = (y * width + x) * 3
            pixels[idx:idx+3] = bytes((r, g, b))

    # draw a bright shape in the middle
    for y in range(height // 3, height * 2 // 3):
        for x in range(width // 6, width * 5 // 6):
            dx = (x - width // 2) / (width // 3)
            dy = (y - height // 2) / (height // 5)
            if dx*dx + dy*dy < 1.0:
                idx = (y * width + x) * 3
                pixels[idx:idx+3] = blend((r, g, b), (255, 255, 255), 0.55)

    draw_text(pixels, width, height, 120, 520, label, (255, 255, 255), scale=10)
    draw_text(pixels, width, height, 160, 680, label2, (245, 245, 245), scale=6)
    output = Path('public/images') / name
    png_write(output, width, height, pixels)
    print('saved', output)

if __name__ == '__main__':
    Path('public/images').mkdir(parents=True, exist_ok=True)
    make_image('phoco-new.png', '#111827', '#F97316', 'PHO CO', 'HA NOI')
    make_image('hoankiem-new.png', '#0F172A', '#22C55E', 'HOAN KIEM', 'HA NOI')
    make_image('vanmieu-new.png', '#020617', '#8B5CF6', 'VAN MIEU', 'HA NOI')
    make_image('hotay-new.png', '#0F172A', '#38BDF8', 'HO TAY', 'HA NOI')
    make_image('tranquoc-new.png', '#111827', '#F97316', 'TRAN QUOC', 'HA NOI')
