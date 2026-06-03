#!/usr/bin/env python3
"""
RB Perform — Carrousel LinkedIn A : "Les 3 chiffres"
Format LinkedIn portrait 4:5 → 1080x1350 px par slide, PDF multi-pages.
Charte alignée IG : #080c14 fond plat / #02d1ba cyan / Inter Display.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
VAULT_OUT = ROOT / ("Library/CloudStorage/OneDrive-Personnel/Documents/"
                   "RB PERFORM APP/OBSIDIAN/RB-Perform/"
                   "02_Marketing/LinkedIn/Carrousels")
VAULT_OUT.mkdir(parents=True, exist_ok=True)
OUTPUT_PDF = VAULT_OUT / "Carrousel-A-3-chiffres.pdf"
PNG_DIR = VAULT_OUT / "Carrousel-A-PNG"
PNG_DIR.mkdir(exist_ok=True)

BG     = (8, 12, 20)
CYAN   = (2, 209, 186)
WHITE  = (240, 240, 240)
DIM_55 = (144, 146, 149)
DIM_45 = (119, 121, 126)
DIM_35 = (94, 97, 102)

W, H = 1080, 1350
PAD = 80

def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"InterDisplay-{weight}.ttf"), size)

def text_size(draw, txt, fnt):
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]

def center_text(draw, txt, fnt, y, color):
    w, _ = text_size(draw, txt, fnt)
    draw.text(((W - w) // 2, y), txt, font=fnt, fill=color)

def draw_lines_centered(draw, lines, fnt, y_start, color, factor=0.95):
    y = y_start
    line_h = int(fnt.size * factor)
    for line in lines:
        if line:
            center_text(draw, line, fnt, y, color)
        y += line_h
    return y

def draw_brand_footer(draw, slide_num, total):
    y = H - PAD - 18
    brand_font = font("Black", 22)
    parts = [("RB", WHITE), (".", CYAN), ("PERFORM", WHITE), (".", CYAN)]
    x = PAD
    for txt, color in parts:
        draw.text((x, y), txt, font=brand_font, fill=color)
        w, _ = text_size(draw, txt, brand_font)
        x += w
    num_font = font("Bold", 16)
    num_txt = f"{slide_num:02d} / {total:02d}"
    w, _ = text_size(draw, num_txt, num_font)
    draw.text((W - PAD - w, y + 4), num_txt, font=num_font, fill=DIM_45)

def draw_tag(draw, tag_text, y=180):
    dot_font = font("Black", 32)
    label_font = font("Bold", 20)
    label = " ".join(tag_text.upper())
    dot_w, _ = text_size(draw, "·", dot_font)
    label_w, _ = text_size(draw, label, label_font)
    gap = 18
    total_w = dot_w + gap + label_w
    x = (W - total_w) // 2
    draw.text((x, y - 8), "·", font=dot_font, fill=CYAN)
    draw.text((x + dot_w + gap, y + 4), label, font=label_font, fill=DIM_55)

def render_slide_hook(num, total):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    hook_font = font("Black", 100)
    lines = ["3 chiffres séparent", "un coach qui dure", "d'un coach", "qui ferme."]
    total_h = int(hook_font.size * 0.95) * len(lines)
    y0 = (H - total_h) // 2 - 80
    draw_lines_centered(d, lines, hook_font, y0, WHITE, factor=0.95)
    sub_font = font("Bold", 38)
    center_text(d, "La plupart en ignorent 2.", sub_font, y0 + total_h + 50, CYAN)
    swipe_font = font("Bold", 22)
    center_text(d, "swipe →", swipe_font, H - PAD - 90, DIM_45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_intro(num, total, tag, big_lines, sub_lines):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, tag)
    big_font = font("Black", 76)
    total_h = int(big_font.size * 0.96) * len(big_lines)
    y0 = (H - total_h) // 2 - 60
    draw_lines_centered(d, big_lines, big_font, y0, WHITE, factor=0.96)
    sub_font = font("Medium", 30)
    sub_y = y0 + total_h + 70
    for line in sub_lines:
        center_text(d, line, sub_font, sub_y, DIM_55)
        sub_y += int(sub_font.size * 1.45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_metric(num, total, tag, title_lines, sub_lines):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, tag)
    title_font = font("Black", 84)
    t_h = int(title_font.size * 0.95) * len(title_lines)
    sub_font = font("Medium", 30)
    s_h = int(sub_font.size * 1.45) * len(sub_lines)
    gap = 80
    total_h = t_h + gap + s_h
    y0 = (H - total_h) // 2 - 20
    y_after = draw_lines_centered(d, title_lines, title_font, y0, WHITE, factor=0.95)
    sub_y = y_after + gap - int(title_font.size * 0.95) + 20
    for line in sub_lines:
        center_text(d, line, sub_font, sub_y, DIM_55 if line else BG)
        sub_y += int(sub_font.size * 1.45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_recap(num, total):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, "Récap")
    title_font = font("Black", 64)
    center_text(d, "Les 3 chiffres :", title_font, 290, WHITE)
    li_font = font("Bold", 48)
    items = [
        ("1.", "Revenu net mensuel"),
        ("2.", "Taux de rétention"),
        ("3.", "Valeur vie client"),
    ]
    max_w = 0
    for n, lbl in items:
        w, _ = text_size(d, f"{n}  {lbl}", li_font)
        max_w = max(max_w, w)
    x_start = (W - max_w) // 2
    y = 420
    for n, lbl in items:
        nw, _ = text_size(d, n, li_font)
        d.text((x_start, y), n, font=li_font, fill=CYAN)
        d.text((x_start + nw + 22, y), lbl, font=li_font, fill=WHITE)
        y += 84
    cta_font = font("Black", 50)
    cta_y = y + 80
    for line in ["Tu n'as pas ces 3 chiffres", "sous la main aujourd'hui ?"]:
        center_text(d, line, cta_font, cta_y, WHITE)
        cta_y += int(cta_font.size * 0.98)
    cta_y += 36
    center_text(d, "Écris-moi en DM.", font("Black", 54), cta_y, CYAN)
    draw_brand_footer(d, num, total)
    return img


TOTAL = 7
slides = [
    render_slide_hook(1, TOTAL),
    render_slide_intro(2, TOTAL, "Enjeu",
        ["Sans ces 3 chiffres,", "tu ne pilotes pas", "ton business.", "Tu l'encaisses."],
        ["Le solde de ton compte ne te dit pas",
         "si tu gagnes ou si tu meurs en silence."]),
    render_slide_metric(3, TOTAL, "1 / 3", ["REVENU", "MENSUEL NET"],
        ["Pas ce que tes clients ont payé.",
         "Ce qui te reste, une fois outils,",
         "charges sociales, impôts déduits.",
         "",
         "Tant que tu ne l'as pas calculé,",
         "tu ne le connais pas."]),
    render_slide_metric(4, TOTAL, "2 / 3", ["TAUX DE", "RÉTENTION"],
        ["Combien de tes clients de janvier",
         "sont encore là en juin.",
         "",
         "Décide si tu remplis ou si tu vides",
         "ton planning chaque mois."]),
    render_slide_metric(5, TOTAL, "3 / 3", ["VALEUR VIE", "D'UN CLIENT"],
        ["Ce qu'un client te rapporte",
         "sur toute la relation.",
         "",
         "Détermine combien tu peux investir",
         "pour en gagner un nouveau,",
         "sans te ruiner."]),
    render_slide_intro(6, TOTAL, "Bascule",
        ["Avec ces 3 chiffres,", "tu sais 3 mois", "à l'avance", "si ton année tient."],
        ["Tu arrêtes de réagir au mois en cours.",
         "Tu commences à décider."]),
    render_slide_recap(7, TOTAL),
]

slides[0].save(
    OUTPUT_PDF,
    save_all=True,
    append_images=slides[1:],
    resolution=150.0,
)

for i, img in enumerate(slides, 1):
    img.save(PNG_DIR / f"slide-{i:02d}.png")

print(f"PDF  : {OUTPUT_PDF}")
print(f"PNGs : {PNG_DIR}")
