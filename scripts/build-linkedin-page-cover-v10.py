#!/usr/bin/env python3
"""
RB Perform — Cover LinkedIn Page Entreprise V10 (charte alignée IG)
1128x191 px (retina 2256x382). Reprend le LAYOUT V9 (brand top-right en gros
+ tagline 1 ligne + pillars), avec la vraie charte (#080c14 / #02d1ba / Inter).
Safe zone logo carré bas-gauche LinkedIn 2026 : x:0-260, y:60-191 libre.
Tout le contenu textuel aligné DROITE.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
VAULT_OUT = ROOT / ("Library/CloudStorage/OneDrive-Personnel/Documents/"
                   "RB PERFORM APP/OBSIDIAN/RB-Perform/"
                   "02_Marketing/LinkedIn/Page")
VAULT_OUT.mkdir(parents=True, exist_ok=True)
OUTPUT_1X = VAULT_OUT / "linkedin-page-cover-v10.png"
OUTPUT_2X = VAULT_OUT / "linkedin-page-cover-v10-2x.png"

BG     = (8, 12, 20)
CYAN   = (2, 209, 186)
WHITE  = (240, 240, 240)
DIM_75 = (190, 192, 195)
DIM_55 = (144, 146, 149)

W, H = 1128, 191
PAD_RIGHT = 50

def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"InterDisplay-{weight}.ttf"), size)

def text_size(draw, txt, fnt):
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]

# ── Fond plat (pas de halo — cover trop fine, le halo ressemblerait à un dégradé) ──
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# ── Dot cyan décoratif top-left de la zone droite (rappel V9) ────────────────
dot_x = 540
dot_y = 28
d.ellipse((dot_x - 4, dot_y - 4, dot_x + 4, dot_y + 4), fill=CYAN)

# ── Brand "RB.PERFORM." top-right, GROS (focus principal de la cover) ────────
brand_font = font("Black", 38)
brand_parts = [("RB", WHITE), (".", CYAN), ("PERFORM", WHITE), (".", CYAN)]
total_w = sum(text_size(d, t, brand_font)[0] for t, _ in brand_parts)
x_brand = W - PAD_RIGHT - total_w
y_brand = 24
for txt, color in brand_parts:
    d.text((x_brand, y_brand), txt, font=brand_font, fill=color)
    w, _ = text_size(d, txt, brand_font)
    x_brand += w

# ── Tagline sur 1 ligne dessous, right-aligned ───────────────────────────────
tag_font = font("Black", 26)
tag_dim_font = font("Bold", 26)
# Composer : "Tu coaches.  " (dim) + "RB Perform" (cyan) + " pilote ton business." (white)
parts = [
    ("Tu coaches.  ", DIM_75, tag_dim_font),
    ("RB Perform", CYAN, tag_font),
    (" pilote ton business.", WHITE, tag_font),
]
total_w = sum(text_size(d, t, f)[0] for t, _, f in parts)
x = W - PAD_RIGHT - total_w
y_tagline = 87
for txt, color, f in parts:
    d.text((x, y_tagline), txt, font=f, fill=color)
    w, _ = text_size(d, txt, f)
    x += w

# ── Pillars right-aligned ────────────────────────────────────────────────────
pillar_font = font("Bold", 16)
sep_font = font("Black", 16)
pillars = ["Revenu temps réel", "Alertes départ", "0% commission"]
sep = "  ·  "
sep_w, _ = text_size(d, sep, sep_font)

total_pw = 0
for i, p in enumerate(pillars):
    w, _ = text_size(d, p, pillar_font)
    total_pw += w
    if i < len(pillars) - 1:
        total_pw += sep_w

x = W - PAD_RIGHT - total_pw
y_pillars = 140
for i, p in enumerate(pillars):
    d.text((x, y_pillars), p, font=pillar_font, fill=WHITE)
    w, _ = text_size(d, p, pillar_font)
    x += w
    if i < len(pillars) - 1:
        d.text((x, y_pillars), sep, font=sep_font, fill=CYAN)
        x += sep_w

img.save(OUTPUT_1X)
img_2x = img.resize((W * 2, H * 2), Image.LANCZOS)
img_2x.save(OUTPUT_2X)
print(f"Cover 1x : {OUTPUT_1X}")
print(f"Cover 2x : {OUTPUT_2X}")
