#!/usr/bin/env python3
"""
Cover Force et Masse — DA actuelle RB Perform
A4 portrait 1240x1754 px (150 dpi), fond #080c14 + cyan #02d1ba + Inter Display.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
OUTPUT_DIR = ROOT / "Downloads"
OUTPUT_PDF = OUTPUT_DIR / "Cover-Force-et-Masse-v2.pdf"
OUTPUT_PNG = OUTPUT_DIR / "Cover-Force-et-Masse-v2.png"

BG     = (8, 12, 20)
CYAN   = (2, 209, 186)
WHITE  = (240, 240, 240)
DIM_75 = (190, 192, 195)
DIM_55 = (144, 146, 149)

W, H = 1240, 1754
PAD = 100

def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"InterDisplay-{weight}.ttf"), size)

def text_size(draw, txt, fnt):
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# ─── Brand top-right "RB.PERFORM." ───────────────────────────────────────────
brand_font = font("Black", 28)
brand_parts = [("RB", WHITE), (".", CYAN), ("PERFORM", WHITE), (".", CYAN)]
total_w = sum(text_size(d, t, brand_font)[0] for t, _ in brand_parts)
x = W - PAD - total_w
y_brand = PAD - 20
for txt, color in brand_parts:
    d.text((x, y_brand), txt, font=brand_font, fill=color)
    w, _ = text_size(d, txt, brand_font)
    x += w

# ─── Tag "PROGRAMME ATHLÈTE" top-left ────────────────────────────────────────
tag_label_font = font("Bold", 16)
dot_font = font("Black", 22)
tag_label = " ".join("PROGRAMME · 100% ATHLÈTE".upper())  # letterspaced
# Simplifions : sans letter-spacing extrême
tag_label = "PROGRAMME · 100% ATHLÈTE"
d.text((PAD, y_brand - 4), "·", font=dot_font, fill=CYAN)
d.text((PAD + 24, y_brand + 2), tag_label, font=tag_label_font, fill=DIM_55)

# ─── Barre verticale cyan accent gauche ──────────────────────────────────────
bar_x = PAD - 30
bar_top = 500
bar_bottom = 1100
d.rectangle((bar_x, bar_top, bar_x + 6, bar_bottom), fill=CYAN)

# ─── TITRE PRINCIPAL ÉNORME ──────────────────────────────────────────────────
title_font = font("Black", 152)
y_title = 480

# "PACK COMPLET" en petit dessus
super_font = font("Bold", 28)
d.text((PAD, y_title - 50), "PACK COMPLET", font=super_font, fill=DIM_75)

# Titre énorme en plusieurs lignes
title_lines = [("FORCE", WHITE), ("ET", DIM_55), ("MASSE", WHITE), (".", CYAN)]
# Première ligne : "FORCE"
y = y_title
d.text((PAD, y), "FORCE", font=title_font, fill=WHITE)
y += int(title_font.size * 0.85)
# 2e ligne : "ET" en dim + "MASSE" en blanc + point cyan
et_font = font("Black", 152)
d.text((PAD, y), "ET", font=et_font, fill=DIM_55)
et_w, _ = text_size(d, "ET", et_font)
y += int(et_font.size * 0.85)
# "MASSE." sur 3e ligne avec point cyan
d.text((PAD, y), "MASSE", font=title_font, fill=WHITE)
masse_w, _ = text_size(d, "MASSE", title_font)
# Le point cyan
d.text((PAD + masse_w, y), ".", font=title_font, fill=CYAN)

# ─── Séparateur subtile ──────────────────────────────────────────────────────
sep_y = 1180
d.rectangle((PAD, sep_y, W - PAD, sep_y + 2), fill=DIM_55)

# ─── Pitch / sous-titre ──────────────────────────────────────────────────────
pitch_font = font("Medium", 26)
pitch_lines = [
    "Le programme qui te fait passer un cap",
    "en force et en masse musculaire",
    "en 8 semaines.",
]
y = sep_y + 40
for line in pitch_lines:
    d.text((PAD, y), line, font=pitch_font, fill=DIM_75)
    y += int(pitch_font.size * 1.45)

# ─── Features avec puces cyan ────────────────────────────────────────────────
y += 30
feature_font = font("Bold", 22)
features = [
    "5 séances par semaine",
    "2 cycles structurés de 4 semaines",
    "Vidéos explicatives pour chaque exercice",
    "Guide nutritionnel et complément alimentaire",
    "Optimisation technique : bench + squat",
]
for f in features:
    d.text((PAD, y), "→", font=feature_font, fill=CYAN)
    d.text((PAD + 36, y), f, font=feature_font, fill=WHITE)
    y += int(feature_font.size * 1.6)

# ─── Footer : auteur + édition ───────────────────────────────────────────────
y_footer = H - PAD - 60
author_font = font("Black", 22)
edition_font = font("Medium", 16)
d.text((PAD, y_footer), "RAYAN BONTE", font=author_font, fill=WHITE)
d.text((PAD, y_footer + 32), "RB Perform · Édition 2026", font=edition_font, fill=DIM_55)

# ─── Petit dot cyan décoratif bas-droite ─────────────────────────────────────
dot_y = y_footer + 16
dot_x = W - PAD - 8
d.ellipse((dot_x - 6, dot_y - 6, dot_x + 6, dot_y + 6), fill=CYAN)

# ─── Export ──────────────────────────────────────────────────────────────────
img.save(OUTPUT_PNG)
img.save(OUTPUT_PDF, resolution=150.0)

print(f"PNG : {OUTPUT_PNG}")
print(f"PDF : {OUTPUT_PDF}")
