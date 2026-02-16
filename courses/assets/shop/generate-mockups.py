#!/usr/bin/env python3
"""Generate branded product mockup images for AutoNateAI shop. v3"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, random, math

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(ASSETS_DIR, 'logo-transparent.png')
WOMEN_TEE_SRC = "/Users/mymac/Downloads/ChatGPT Image Feb 16, 2026, 01_18_02 AM.png"

SIZE = 800
CX, CY = SIZE // 2, SIZE // 2

ICE = (79, 195, 247)
DEEP = (10, 10, 20)
WHITE = (255, 255, 255)
RED = (239, 83, 80)
GREEN = (102, 187, 106)
PURPLE = (171, 71, 188)


def load_logo():
    return Image.open(LOGO_PATH).convert('RGBA')


def make_bg(accent=ICE):
    """Pure dark background with pixel-level radial vignette — no overlapping shapes."""
    img = Image.new('RGB', (SIZE, SIZE), DEEP)
    px = img.load()
    # Very subtle radial glow — compute per-pixel
    for y in range(SIZE):
        for x in range(SIZE):
            dx = (x - CX) / 300
            dy = (y - CY + 30) / 300
            d = math.sqrt(dx*dx + dy*dy)
            if d < 1.0:
                f = (1.0 - d) ** 2  # smooth quadratic falloff
                blend = f * 0.06  # very subtle — max 6% blend
                r = int(DEEP[0] + (accent[0] - DEEP[0]) * blend)
                g = int(DEEP[1] + (accent[1] - DEEP[1]) * blend)
                b = int(DEEP[2] + (accent[2] - DEEP[2]) * blend)
                px[x, y] = (r, g, b)
    return img.convert('RGBA')


def add_stars(img, seed=42, count=70):
    random.seed(seed)
    draw = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = random.randint(5, SIZE-5), random.randint(5, SIZE-5)
        b = random.randint(50, 160)
        sz = random.choice([1, 1, 2])
        c = (ICE[0], ICE[1], ICE[2], b) if random.random() > 0.4 else (b, b, b, b)
        draw.ellipse([x, y, x+sz, y+sz], fill=c)


def get_font(size):
    for fp in ['/Library/Fonts/SF-Pro-Display-Bold.otf',
               '/System/Library/Fonts/Helvetica.ttc',
               '/System/Library/Fonts/SFCompactDisplay.ttf']:
        if os.path.exists(fp):
            try: return ImageFont.truetype(fp, size)
            except: continue
    return ImageFont.load_default()


def text_c(draw, text, y, size=24, color=WHITE, alpha=255):
    """Draw centered text."""
    font = get_font(size)
    bb = draw.textbbox((0, 0), text, font=font)
    w = bb[2] - bb[0]
    draw.text(((SIZE-w)//2, y), text, fill=(*color, alpha), font=font)


def draw_tee(draw, yoff=0, c=ICE, alpha=50):
    """T-shirt silhouette."""
    t = 165 + yoff
    pts = [
        (CX-145, t), (CX-205, t+45), (CX-205, t+140), (CX-145, t+140),
        (CX-145, t+395), (CX+145, t+395), (CX+145, t+140),
        (CX+205, t+140), (CX+205, t+45), (CX+145, t),
        (CX+50, t+35), (CX-50, t+35),
    ]
    outline_c = (*c, alpha)
    fill_c = (*c, alpha // 5)
    draw.polygon(pts, outline=outline_c, fill=fill_c)
    # Neckline
    draw.arc([CX-52, t+12, CX+52, t+58], 0, 180, fill=(*c, alpha//2), width=1)
    # Seam lines
    draw.line([(CX, t+35), (CX, t+395)], fill=(*c, alpha//6), width=1)


def draw_hoodie(draw, yoff=0, c=ICE, alpha=50):
    t = 150 + yoff
    pts = [
        (CX-155, t+28), (CX-220, t+70), (CX-220, t+195), (CX-155, t+170),
        (CX-160, t+420), (CX+160, t+420), (CX+155, t+170),
        (CX+220, t+195), (CX+220, t+70), (CX+155, t+28),
    ]
    draw.polygon(pts, outline=(*c, alpha), fill=(*c, alpha//5))
    # Hood
    draw.arc([CX-90, t-60, CX+90, t+60], 180, 0, fill=(*c, alpha), width=2)
    # Drawstrings
    draw.line([(CX-15, t+55), (CX-15, t+120)], fill=(*c, alpha//3), width=1)
    draw.line([(CX+15, t+55), (CX+15, t+120)], fill=(*c, alpha//3), width=1)
    # Pocket
    draw.rounded_rectangle([CX-65, t+285, CX+65, t+330], radius=8,
                           outline=(*c, alpha//2), width=1)


def draw_mug(draw, yoff=0, c=ICE, alpha=50):
    t = 215 + yoff
    draw.rounded_rectangle([CX-115, t, CX+115, t+280], radius=18,
                           outline=(*c, alpha), fill=(*c, alpha//5), width=2)
    # Handle
    draw.arc([CX+90, t+60, CX+185, t+215], 270, 90, fill=(*c, alpha), width=2)
    # Steam
    for i, sx in enumerate([CX-25, CX, CX+25]):
        for j in range(4):
            y1 = t - 15 - j * 12 - i * 4
            a = max(alpha // 3 - j * 6, 5)
            draw.arc([sx-6, y1-8, sx+6, y1+8], 200, 340, fill=(*c, a), width=1)


def bottom_bar(draw, text):
    draw.rectangle([0, SIZE - 52, SIZE, SIZE], fill=(0, 0, 0, 200))
    text_c(draw, text, SIZE - 36, size=11, color=WHITE, alpha=140)


def paste_logo(img, logo, size, y):
    """Resize and center-paste logo onto image."""
    # Maintain aspect ratio
    lw, lh = logo.size
    ratio = lw / lh
    if ratio > 1:
        nw = size
        nh = int(size / ratio)
    else:
        nh = size
        nw = int(size * ratio)
    lr = logo.resize((nw, nh), Image.LANCZOS)
    img.paste(lr, ((SIZE - nw) // 2, y), lr)
    return img


# ─── GENERATORS ───

def gen_tee(name, subtitle, accent, filename):
    logo = load_logo()
    img = make_bg(accent)
    add_stars(img, seed=hash(filename) % 9999)

    draw = ImageDraw.Draw(img)
    draw_tee(draw, yoff=10, c=accent, alpha=55)

    paste_logo(img, logo, 240, 205)

    draw = ImageDraw.Draw(img)
    text_c(draw, 'AUTONATEAI', 440, size=16, color=WHITE, alpha=160)
    text_c(draw, name, 468, size=28, color=accent)
    text_c(draw, subtitle, 508, size=14, color=WHITE, alpha=100)
    bottom_bar(draw, 'PREMIUM TEE  ·  100% COTTON  ·  UNISEX FIT')

    img.convert('RGB').save(os.path.join(ASSETS_DIR, filename), quality=90)
    print(f'  ✓ {filename}')


def gen_hoodie(name, subtitle, accent, filename):
    logo = load_logo()
    img = make_bg(accent)
    add_stars(img, seed=hash(filename) % 9999)

    draw = ImageDraw.Draw(img)
    draw_hoodie(draw, yoff=5, c=accent, alpha=55)

    paste_logo(img, logo, 220, 215)

    draw = ImageDraw.Draw(img)
    text_c(draw, 'AUTONATEAI', 430, size=16, color=WHITE, alpha=160)
    text_c(draw, name, 458, size=26, color=accent)
    text_c(draw, subtitle, 496, size=14, color=WHITE, alpha=100)
    bottom_bar(draw, 'PREMIUM HOODIE  ·  HEAVYWEIGHT FLEECE  ·  UNISEX')

    img.convert('RGB').save(os.path.join(ASSETS_DIR, filename), quality=90)
    print(f'  ✓ {filename}')


def gen_mug(name, subtitle, filename):
    logo = load_logo()
    img = make_bg(ICE)
    add_stars(img, seed=hash(filename) % 9999)

    draw = ImageDraw.Draw(img)
    draw_mug(draw, yoff=0, c=ICE, alpha=50)

    paste_logo(img, logo, 140, 280)

    draw = ImageDraw.Draw(img)
    text_c(draw, 'AUTONATEAI', 170, size=14, color=WHITE, alpha=140)
    text_c(draw, name, 535, size=24, color=ICE)
    text_c(draw, subtitle, 567, size=13, color=WHITE, alpha=100)
    bottom_bar(draw, 'CERAMIC MUG  ·  11 OZ  ·  DISHWASHER SAFE')

    img.convert('RGB').save(os.path.join(ASSETS_DIR, filename), quality=90)
    print(f'  ✓ {filename}')


def gen_stickers(filename):
    logo = load_logo()
    img = make_bg(PURPLE)
    add_stars(img, seed=77, count=50)

    draw = ImageDraw.Draw(img)
    random.seed(88)
    for (sx, sy, ss) in [(CX-165, 200, 135), (CX+65, 185, 120),
                          (CX-75, 370, 130), (CX+105, 385, 110), (CX-180, 440, 105)]:
        draw.rounded_rectangle([sx, sy, sx+ss, sy+ss], radius=14,
                               outline=(*PURPLE, 30), fill=(*PURPLE, 8), width=2)

    paste_logo(img, logo, 190, 250)

    draw = ImageDraw.Draw(img)
    text_c(draw, 'AUTONATEAI', 175, size=14, color=WHITE, alpha=140)
    text_c(draw, 'STICKER PACK', 478, size=24, color=PURPLE)
    text_c(draw, '10 Premium Die-Cut Stickers', 510, size=13, color=WHITE, alpha=100)
    bottom_bar(draw, 'PACK OF 10  ·  VINYL  ·  WATERPROOF  ·  UV RESISTANT')

    img.convert('RGB').save(os.path.join(ASSETS_DIR, filename), quality=90)
    print(f'  ✓ {filename}')


def gen_coasters(filename):
    logo = load_logo()
    img = make_bg(ICE)
    add_stars(img, seed=55, count=50)

    draw = ImageDraw.Draw(img)
    for (cx, cy, r) in [(CX-80, CY-50, 100), (CX+45, CY-70, 100),
                          (CX-50, CY+55, 100), (CX+70, CY+35, 100)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*ICE, 28), fill=(*ICE, 7), width=2)

    paste_logo(img, logo, 160, 270)

    draw = ImageDraw.Draw(img)
    text_c(draw, 'AUTONATEAI', 185, size=14, color=WHITE, alpha=140)
    text_c(draw, 'DEV COASTER SET', 492, size=22, color=ICE)
    text_c(draw, 'Set of 4 Cork-Backed Coasters', 522, size=13, color=WHITE, alpha=100)
    bottom_bar(draw, 'SET OF 4  ·  CORK-BACKED  ·  DEVELOPER THEMED')

    img.convert('RGB').save(os.path.join(ASSETS_DIR, filename), quality=90)
    print(f'  ✓ {filename}')


def reformat_women_tee(filename):
    src = Image.open(WOMEN_TEE_SRC).convert('RGBA')
    img = Image.new('RGBA', (SIZE, SIZE), DEEP)
    add_stars(img, seed=33, count=40)

    # Crop to front tee
    sw, sh = src.size
    front = src.crop((0, int(sh*0.02), int(sw*0.55), int(sh*0.98)))
    th = int(SIZE * 0.85)
    aspect = front.width / front.height
    tw = min(int(th * aspect), SIZE - 60)
    th = int(tw / aspect)
    front = front.resize((tw, th), Image.LANCZOS)
    img.paste(front, ((SIZE-tw)//2, (SIZE-th)//2 - 5), front)

    draw = ImageDraw.Draw(img)
    bottom_bar(draw, 'WOMEN IN TECH COLLECTION  ·  PREMIUM TEE')

    img.convert('RGB').save(os.path.join(ASSETS_DIR, filename), quality=92)
    print(f'  ✓ {filename} (reformatted)')


if __name__ == '__main__':
    print('Generating AutoNateAI shop mockups v3...\n')

    gen_tee('AI NEXUS', 'Represent the Future of Technology', ICE, 'ai-nexus-tee.png')
    gen_tee('FUTURE OF AI', 'Limited Edition Design', GREEN, 'future-ai-tee.png')
    gen_tee('CIRCUIT BOARD', 'For the Hardware-Minded Dev', ICE, 'circuit-tee.png')
    gen_tee('AI ORIGIN DROP', 'Exclusive Limited Edition', RED, 'ai-origin-drop-tee.png')

    gen_hoodie('MATRIX DEV', 'Live in the Matrix', ICE, 'matrix-dev-hoodie.png')
    gen_hoodie('BOT LIFE', 'We Bot Dat Life', PURPLE, 'bot-life-hoodie.png')

    gen_mug('AI SYNTAX MUG', 'Fuel Your Coding Sessions', 'ai-syntax-mug.png')
    gen_stickers('sticker-pack.png')
    gen_coasters('dev-coaster-set.png')

    reformat_women_tee('women-in-tech-tee.png')

    print('\nDone!')
