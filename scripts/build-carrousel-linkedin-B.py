#!/usr/bin/env python3
"""
RB Perform — Carrousel LinkedIn B : "100k abonnés. 0 idée."
Format LinkedIn portrait 4:5 → 1080x1350, PDF multi-pages, 6 slides.
Charte alignée IG : #080c14 / #02d1ba / Inter Display.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
VAULT_OUT = ROOT / ("Library/CloudStorage/OneDrive-Personnel/Documents/"
                   "RB PERFORM APP/OBSIDIAN/RB-Perform/"
                   "02_Marketing/LinkedIn/Carrousels")
VAULT_OUT.mkdir(parents=True, exist_ok=True)
OUTPUT_PDF = VAULT_OUT / "Carrousel-B-100k-abonnes.pdf"
PNG_DIR = VAULT_OUT / "Carrousel-B-PNG"
PNG_DIR.mkdir(exist_ok=True)

BG     = (8, 12, 20)
CYAN   = (2, 209, 186)
WHITE  = (240, 240, 240)
DIM_55 = (144, 146, 149)
DIM_45 = (119, 121, 126)

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
    big_font = font("Black", 130)
    sub_font = font("Black", 72)
    # "100k abonnés." en cyan énorme
    center_text(d, "100k abonnés.", big_font, 400, WHITE)
    # "0 idée" en cyan
    center_text(d, "0 idée", big_font, 580, CYAN)
    # "de ce que tu gagnes / vraiment." en plus petit
    sub_lines = ["de ce que tu gagnes", "vraiment."]
    y = 760
    for line in sub_lines:
        center_text(d, line, sub_font, y, WHITE)
        y += int(sub_font.size * 0.98)
    swipe_font = font("Bold", 22)
    center_text(d, "swipe →", swipe_font, H - PAD - 90, DIM_45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_pourquoi(num, total, tag, title_lines, sub_lines):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, tag)
    title_font = font("Black", 78)
    t_h = int(title_font.size * 0.95) * len(title_lines)
    sub_font = font("Medium", 30)
    s_h = int(sub_font.size * 1.45) * len(sub_lines)
    gap = 80
    total_h = t_h + gap + s_h
    y0 = (H - total_h) // 2 - 20
    y_after = draw_lines_centered(d, title_lines, title_font, y0, WHITE, factor=0.95)
    sub_y = y_after + 40
    for line in sub_lines:
        center_text(d, line, sub_font, sub_y, DIM_55 if line else BG)
        sub_y += int(sub_font.size * 1.45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_solution(num, total):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, "À la place")
    title_font = font("Black", 70)
    title_lines = ["L'audience ne paye pas.", "Trois chiffres le font."]
    t_h = int(title_font.size * 0.95) * len(title_lines)
    y0 = 290
    y_after = draw_lines_centered(d, title_lines, title_font, y0, WHITE, factor=0.95)
    # 3 bullets avec flèche cyan
    bullet_font = font("Bold", 46)
    items = ["Revenu net mensuel", "Taux de rétention", "Prévision 90 jours"]
    bullet_y = y_after + 100
    line_h = 80
    # Mesurer le bloc pour centrer
    max_w = 0
    for it in items:
        w, _ = text_size(d, f"→  {it}", bullet_font)
        max_w = max(max_w, w)
    x_start = (W - max_w) // 2
    for it in items:
        arrow = "→"
        aw, _ = text_size(d, arrow, bullet_font)
        d.text((x_start, bullet_y), arrow, font=bullet_font, fill=CYAN)
        d.text((x_start + aw + 24, bullet_y), it, font=bullet_font, fill=WHITE)
        bullet_y += line_h
    sub_font = font("Medium", 28)
    sub_y = bullet_y + 60
    sub_lines = [
        "Le jour où tu pilotes ces trois —",
        "l'audience devient un bonus,",
        "plus un piège.",
    ]
    for line in sub_lines:
        center_text(d, line, sub_font, sub_y, DIM_55)
        sub_y += int(sub_font.size * 1.45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_cta(num, total):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, "À toi")
    title_font = font("Black", 64)
    title_lines = ["Combien d'abonnés", "peux-tu échanger", "contre un mois solide ?"]
    t_h = int(title_font.size * 0.95) * len(title_lines)
    y0 = 340
    draw_lines_centered(d, title_lines, title_font, y0, WHITE, factor=0.95)
    cta_font = font("Black", 58)
    cta_y = y0 + t_h + 100
    center_text(d, "Écris-moi en DM.", cta_font, cta_y, CYAN)
    sub_font = font("Medium", 28)
    sub_y = cta_y + 100
    center_text(d, "Si t'es en train de comparer les deux,", sub_font, sub_y, DIM_55)
    sub_y += int(sub_font.size * 1.45)
    center_text(d, "on peut en parler.", sub_font, sub_y, DIM_55)
    draw_brand_footer(d, num, total)
    return img


TOTAL = 6
slides = [
    render_slide_hook(1, TOTAL),
    render_slide_pourquoi(2, TOTAL, "1 / 3",
        ["Tes 100k abonnés", "te disent rien", "sur ton revenu réel."],
        ["L'engagement ne se dépose pas en banque.",
         "Tu peux faire 200 likes par post",
         "et ne pas savoir",
         "si ton mois est dans le vert."]),
    render_slide_pourquoi(3, TOTAL, "2 / 3",
        ["Tes 100k abonnés", "ne voient pas", "tes clients partir."],
        ["Un client peut décrocher",
         "sans laisser de trace",
         "dans tes stats Instagram.",
         "",
         "Pendant ce temps,",
         "tu poses encore tes sondages aux 100k."]),
    render_slide_pourquoi(4, TOTAL, "3 / 3",
        ["Tes 100k abonnés", "ne te diront pas", "si ton mois prochain tient."],
        ["La portée du dernier reel",
         "ne prédit pas le revenu de juin.",
         "",
         "Tu navigues à vue,",
         "avec une métrique qui flatte",
         "mais ne décide rien."]),
    render_slide_solution(5, TOTAL),
    render_slide_cta(6, TOTAL),
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
