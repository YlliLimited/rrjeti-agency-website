"""Builds the social share images (1200x630) for both languages."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'new')
OUT = os.path.join(ROOT, 'assets', 'img', 'og')
os.makedirs(OUT, exist_ok=True)
FONTS = 'C:/Windows/Fonts/'
def font(names, size):
    for n in names:
        p = os.path.join(FONTS, n)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

W, H = 1200, 630
TEXT = {
    'sq': ('Ti rritesh.', 'Ne marrim 10%.', 'Agjencia e parë në Kosovë me marketing me përqindje'),
    'en': ('You grow.', 'We take 10%.', 'The first agency in Kosovo to offer percentage-based marketing'),
}
for lang, (l1, l2, sub) in TEXT.items():
    im = Image.new('RGB', (W, H), '#EEF1F3')
    glow = Image.new('RGB', (W, H), '#EEF1F3')
    g = ImageDraw.Draw(glow)
    g.ellipse((700, -180, 1380, 500), fill='#9fd9d9')
    g.ellipse((-260, 330, 300, 900), fill='#c9d4ff')
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(120)), 0.9)
    d = ImageDraw.Draw(im)
    logo = Image.open(os.path.join(ROOT, 'assets', 'img', 'rrjeti-logo.webp')).convert('RGBA')
    logo.thumbnail((260, 60))
    im.paste(logo, (80, 70), logo)
    big = font(['seguibl.ttf', 'segoeuib.ttf', 'arialbd.ttf'], 108)
    d.text((76, 170), l1, font=big, fill='#0E1215')
    d.text((76, 290), l2, font=big, fill='#135C66')
    d.text((80, 470), sub, font=font(['segoeuisb.ttf', 'segoeui.ttf', 'arial.ttf'], 30), fill='#3D464E')
    d.text((80, 540), 'rrjetiagency.com', font=font(['segoeuib.ttf', 'arialbd.ttf'], 26), fill='#135C66')
    im.save(os.path.join(OUT, f'og-{lang}.jpg'), quality=86, optimize=True, progressive=True)
print('og images written')
