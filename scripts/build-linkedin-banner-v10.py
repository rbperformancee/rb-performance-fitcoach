#!/usr/bin/env python3
"""
RB Perform — Bannière LinkedIn profil V10 (charte alignée IG)
1584x396 px, fond #080c14 + halo cyan radial subtil, cyan #02d1ba, Inter Display.
Safe zone avatar LinkedIn 2026 : zone bas-gauche (x:0-400, y:200-396) laissée libre.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
VAULT_OUT = ROOT / ("Library/CloudStorage/OneDrive-Personnel/Documents/"
                   "RB PERFORM APP/OBSIDIAN/RB-Perform/"
                   "02_Marketing/LinkedIn/Banner")
VAULT_OUT.mkdir(parents=True, exist_ok=True)
OUTPUT = VAULT_OUT / "linkedin-banner-rb-perform-v10.png"

BG     = (8, 12, 20)
CYAN   = (2, 209, 186)
WHITE  = (240, 240, 240)
DIM_55 = (144, 146, 149)
DIM_75 = (190, 192, 195)

W, H = 1584, 396
SAFE_AVATAR_X = 400

def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"InterDisplay-{weight}.ttf"), size)

def text_size(draw, txt, fnt):
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]

# ── Fond avec halo cyan radial très subtil derrière la tagline ───────────────
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = 900, 220
# Distance ovale (étirée horizontal pour suivre la tagline qui est large)
dist = np.sqrt(((xx - cx) / 700) ** 2 + ((yy - cy) / 200) ** 2)
glow = np.clip(1 - dist, 0, 1) ** 2  # falloff doux quadratique
# Couleurs : BG dans les coins, BG légèrement teinté cyan au centre
base = np.array(BG, dtype=np.float32)
glow_color = np.array((14, 38, 42), dtype=np.float32)  # subtle cyan-teal lift
arr = base * (1 - glow[..., None] * 0.55) + glow_color * (glow[..., None] * 0.55)
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')

d = ImageDraw.Draw(img)

# ── Dot cyan décoratif en haut (rappel tech/SaaS) ────────────────────────────
dot_y = 60
d.ellipse((W - 80 - 350, dot_y - 4, W - 80 - 350 + 8, dot_y + 4), fill=CYAN)

# ── Brand "RB.PERFORM." top-right ────────────────────────────────────────────
brand_font = font("Black", 30)
brand_parts = [("RB", WHITE), (".", CYAN), ("PERFORM", WHITE), (".", CYAN)]
total_w = sum(text_size(d, t, brand_font)[0] for t, _ in brand_parts)
x_brand = W - 80 - total_w
y_brand = 38
for txt, color in brand_parts:
    d.text((x_brand, y_brand), txt, font=brand_font, fill=color)
    w, _ = text_size(d, txt, brand_font)
    x_brand += w

# ── Petite barre verticale cyan, accent visuel à gauche de la tagline ────────
bar_x = SAFE_AVATAR_X + 40
bar_top = 140
bar_bottom = 280
d.rectangle((bar_x, bar_top, bar_x + 4, bar_bottom), fill=CYAN)

# ── Tagline 2 niveaux ────────────────────────────────────────────────────────
text_x = bar_x + 28

super_font = font("Bold", 30)
d.text((text_x, 138), "Tu coaches.", font=super_font, fill=DIM_75)

big_font = font("Black", 58)
d.text((text_x, 188), "RB Perform", font=big_font, fill=CYAN)
rb_w, _ = text_size(d, "RB Perform", big_font)
d.text((text_x + rb_w + 18, 188), "pilote ton business.", font=big_font, fill=WHITE)

# ── Pillars : Revenu · Alertes · 0% commission ───────────────────────────────
pillar_font = font("Bold", 22)
sep_font = font("Black", 22)
pillars = ["Revenu temps réel", "Alertes départ", "0% commission"]
sep = "  ·  "
sep_w, _ = text_size(d, sep, sep_font)

x = text_x
y_pillars = 290
for i, p in enumerate(pillars):
    d.text((x, y_pillars), p, font=pillar_font, fill=WHITE)
    w, _ = text_size(d, p, pillar_font)
    x += w
    if i < len(pillars) - 1:
        d.text((x, y_pillars), sep, font=sep_font, fill=CYAN)
        x += sep_w

# ── CTA chip "→ rbperform.app" bas-droite (fond cyan dilué + bordure 3px) ────
chip_font = font("Black", 20)
chip_text = "→  rbperform.app"
chip_w, chip_h = text_size(d, chip_text, chip_font)
chip_pad_x = 26
chip_pad_y = 14
chip_total_w = chip_w + 2 * chip_pad_x
chip_total_h = chip_h + 2 * chip_pad_y
chip_x = W - 80 - chip_total_w
chip_y = H - 60 - chip_total_h

# Fond cyan ~12% (mix CYAN avec BG)
mix = lambda c1, c2, t: tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
chip_fill = mix(BG, CYAN, 0.12)

d.rounded_rectangle(
    (chip_x, chip_y, chip_x + chip_total_w, chip_y + chip_total_h),
    radius=10,
    fill=chip_fill,
    outline=CYAN,
    width=3,
)
d.text((chip_x + chip_pad_x, chip_y + chip_pad_y - 4), chip_text, font=chip_font, fill=CYAN)

img.save(OUTPUT)
img_2x = img.resize((W * 2, H * 2), Image.LANCZOS)
img_2x.save(VAULT_OUT / "linkedin-banner-rb-perform-v10-2x.png")
print(f"Banner 1x : {OUTPUT}")
print(f"Banner 2x : {VAULT_OUT / 'linkedin-banner-rb-perform-v10-2x.png'}")
