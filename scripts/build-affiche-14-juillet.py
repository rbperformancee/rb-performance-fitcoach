#!/usr/bin/env python3
"""
Affiche scolaire — 14 juillet en espagnol (V3 paysage).
Format A4 paysage 1754×1240 px (150 dpi), PDF prêt à imprimer.
Images : Tour Eiffel (gauche hero), Drapeau France (top gauche).
Marianne retirée.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
DOWNLOADS = ROOT / "Downloads"
OUTPUT_PDF = DOWNLOADS / "Affiche-14-Juillet-Espagnol.pdf"
OUTPUT_PNG = DOWNLOADS / "Affiche-14-Juillet-Espagnol.png"

EIFFEL_PATH = DOWNLOADS / "eiffel tower.jpeg"
FLAG_PATH = DOWNLOADS / "shopping.png"

BLEU = (0, 38, 84)
ROUGE = (237, 41, 57)
BLANC = (255, 255, 255)
NOIR = (20, 20, 20)
GRIS = (90, 90, 90)
GRIS_CLAIR = (220, 220, 220)

W, H = 1754, 1240  # A4 paysage 150 dpi
BAND_H = 70        # bandes top/bottom

# Zone texte (colonne droite)
TEXT_X_START = 740
TEXT_X_END = W - 80
TEXT_CENTER = (TEXT_X_START + TEXT_X_END) // 2

def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"InterDisplay-{weight}.ttf"), size)

def text_size(draw, txt, fnt):
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]

def center_text_in_right(draw, txt, fnt, y, color):
    w, _ = text_size(draw, txt, fnt)
    x = TEXT_CENTER - w // 2
    draw.text((x, y), txt, font=fnt, fill=color)
    return y + int(fnt.size * 1.1)

def left_text_right_col(draw, txt, fnt, y, color, x_start=None):
    if x_start is None:
        x_start = TEXT_X_START + 30
    draw.text((x_start, y), txt, font=fnt, fill=color)
    return y + int(fnt.size * 1.1)

# ─── Build canvas ────────────────────────────────────────────────────────────
img = Image.new("RGB", (W, H), BLANC)
d = ImageDraw.Draw(img)

# Bandes horizontales bleu (top) + rouge (bottom)
d.rectangle((0, 0, W, BAND_H), fill=BLEU)
d.rectangle((0, H - BAND_H, W, H), fill=ROUGE)

# ─── COLONNE GAUCHE : Tour Eiffel + drapeau ──────────────────────────────────
# Tour Eiffel centrée dans colonne gauche
eiffel_img = Image.open(EIFFEL_PATH).convert("RGB")
eiffel_target_h = 750
eiffel_target_w = int(eiffel_img.width * eiffel_target_h / eiffel_img.height)
eiffel_img = eiffel_img.resize((eiffel_target_w, eiffel_target_h), Image.LANCZOS)
# Cadrer Tour Eiffel dans col gauche (centre x ~ 370)
eiffel_x = 370 - eiffel_target_w // 2
eiffel_y = (H - eiffel_target_h) // 2 + 10
img.paste(eiffel_img, (eiffel_x, eiffel_y))

# Drapeau France au-dessus de la Tour Eiffel (small)
flag_img = Image.open(FLAG_PATH).convert("RGBA")
flag_target_w = 180
flag_target_h = int(flag_img.height * flag_target_w / flag_img.width)
flag_img = flag_img.resize((flag_target_w, flag_target_h), Image.LANCZOS)
flag_x = 370 - flag_target_w // 2
flag_y = 110
img.paste(flag_img, (flag_x, flag_y), flag_img if flag_img.mode == "RGBA" else None)

# ─── COLONNE DROITE : texte ──────────────────────────────────────────────────
y = 120  # marge top

# TITRE
title_font = font("Black", 76)
y = center_text_in_right(d, "¡VIVA EL", title_font, y, BLEU)
y = center_text_in_right(d, "14 DE JULIO!", title_font, y, BLEU)

# SOUS-TITRE
y += 15
subtitle_font = font("Bold", 32)
y = center_text_in_right(d, "Fiesta Nacional de Francia", subtitle_font, y, NOIR)

# Séparateur tricolore
y += 25
sep_y = y
sep_center = TEXT_CENTER
d.rectangle((sep_center - 180, sep_y, sep_center - 50, sep_y + 4), fill=BLEU)
d.rectangle((sep_center - 50, sep_y, sep_center + 50, sep_y + 4), fill=GRIS_CLAIR)
d.rectangle((sep_center + 50, sep_y, sep_center + 180, sep_y + 4), fill=ROUGE)
y += 30

# SLOGAN tricolore
slogan_font = font("Bold", 30)
slogan_parts = [("Libertad", BLEU), ("  ·  ", NOIR), ("Igualdad", NOIR), ("  ·  ", NOIR), ("Fraternidad", ROUGE)]
total_w = sum(text_size(d, t, slogan_font)[0] for t, _ in slogan_parts)
x = TEXT_CENTER - total_w // 2
for txt, color in slogan_parts:
    d.text((x, y), txt, font=slogan_font, fill=color)
    w, _ = text_size(d, txt, slogan_font)
    x += w
y += int(slogan_font.size * 1.6)

# TEXTE PRINCIPAL
text_font = font("Medium", 24)
text_lines = [
    "Celebremos juntos el símbolo",
    "de nuestra historia y de nuestra democracia.",
]
for line in text_lines:
    y = center_text_in_right(d, line, text_font, y, NOIR)
y += 30

# INFOS PRATIQUES
infos_title_font = font("Black", 28)
y = center_text_in_right(d, "EVENTOS DEL DÍA", infos_title_font, y, BLEU)
y += 20

infos_font = font("Bold", 22)
infos = [
    ("◆", "14 de julio · Día festivo"),
    ("◆", "Desfile militar por la mañana"),
    ("◆", "Bailes populares en todos los barrios"),
    ("◆", "Fuegos artificiales a las 22h30"),
    ("◆", "¡Una fiesta para todos!"),
]
# Largeur max
max_w = 0
for _, label in infos:
    w, _ = text_size(d, label, infos_font)
    max_w = max(max_w, w)
x_start = TEXT_CENTER - (max_w + 40) // 2
for bullet, label in infos:
    d.text((x_start, y), bullet, font=infos_font, fill=ROUGE)
    d.text((x_start + 40, y), label, font=infos_font, fill=NOIR)
    y += int(infos_font.size * 1.45)

y += 30

# CTA encadré
cta_top = y
cta_h = 130
cta_left = TEXT_X_START + 50
cta_right = TEXT_X_END - 50
d.rectangle((cta_left, cta_top, cta_right, cta_top + cta_h), outline=ROUGE, width=4)

cta_font = font("Black", 24)
y += 22
y = center_text_in_right(d, "¡No dejemos morir nuestra tradición!", cta_font, y, BLEU)
y += 8
center_text_in_right(d, "¡Celebrémoslo todos juntos!", cta_font, y, ROUGE)

# Date 14·07 en bas centre (sur la bande rouge)
date_font = font("Black", 20)
date_txt = "14 · 07"
dw, _ = text_size(d, date_txt, date_font)
d.text(((W - dw) // 2, H - BAND_H + 22), date_txt, font=date_font, fill=BLANC)

# ─── Export ──────────────────────────────────────────────────────────────────
img.save(OUTPUT_PNG)
img.save(OUTPUT_PDF, resolution=150.0)

print(f"PNG : {OUTPUT_PNG}")
print(f"PDF : {OUTPUT_PDF}")
