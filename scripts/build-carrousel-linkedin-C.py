#!/usr/bin/env python3
"""
RB Perform — Carrousel LinkedIn C : "5 signes que ton business déraille"
Format LinkedIn portrait 4:5 → 1080x1350, PDF multi-pages, 8 slides.
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
OUTPUT_PDF = VAULT_OUT / "Carrousel-C-5-signes.pdf"
PNG_DIR = VAULT_OUT / "Carrousel-C-PNG"
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
    hook_font = font("Black", 96)
    lines = ["Le business d'un coach", "meurt en silence."]
    total_h = int(hook_font.size * 0.95) * len(lines)
    y0 = (H - total_h) // 2 - 180
    draw_lines_centered(d, lines, hook_font, y0, WHITE, factor=0.95)
    sub_font = font("Bold", 44)
    sub_y = y0 + total_h + 80
    sub_lines = ["Voici à quoi", "ressemble le silence."]
    for line in sub_lines:
        center_text(d, line, sub_font, sub_y, CYAN)
        sub_y += int(sub_font.size * 1.0)
    swipe_font = font("Bold", 22)
    center_text(d, "swipe →", swipe_font, H - PAD - 90, DIM_45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_signe(num, total, tag, title_lines, sub_lines):
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
    draw_tag(d, "Ce qu'il faut faire")
    title_font = font("Black", 64)
    title_lines = ["Le point commun", "de ces 5 signes :",
                   "zéro donnée business", "sous les yeux."]
    t_h = int(title_font.size * 0.95) * len(title_lines)
    y0 = (H - t_h) // 2 - 100
    y_after = draw_lines_centered(d, title_lines, title_font, y0, WHITE, factor=0.95)
    sub_font = font("Medium", 30)
    sub_y = y_after + 60
    sub_lines = [
        "Piloter, c'est 3 chiffres en tête",
        "toute la semaine.",
        "",
        "Revenu net. Rétention. Prévision.",
        "Le reste suit.",
    ]
    for line in sub_lines:
        center_text(d, line, sub_font, sub_y, DIM_55 if line else BG)
        sub_y += int(sub_font.size * 1.45)
    draw_brand_footer(d, num, total)
    return img

def render_slide_cta(num, total):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_tag(d, "À toi")
    title_font = font("Black", 72)
    title_lines = ["Tu coches combien", "de signes sur 5 ?"]
    t_h = int(title_font.size * 0.95) * len(title_lines)
    y0 = 360
    draw_lines_centered(d, title_lines, title_font, y0, WHITE, factor=0.95)
    cta_font = font("Black", 56)
    cta_y = y0 + t_h + 100
    cta_lines = ["Écris-moi le chiffre", "en DM."]
    for line in cta_lines:
        center_text(d, line, cta_font, cta_y, CYAN)
        cta_y += int(cta_font.size * 1.0)
    sub_font = font("Medium", 30)
    cta_y += 30
    center_text(d, "Je te dis quoi regarder en premier.", sub_font, cta_y, DIM_55)
    draw_brand_footer(d, num, total)
    return img


TOTAL = 8
slides = [
    render_slide_hook(1, TOTAL),
    render_slide_signe(2, TOTAL, "1 / 5",
        ["Tu connais ton revenu", "à la fin du mois."],
        ["Pas avant. Pas pendant.",
         "Le solde tombe, tu apprends.",
         "",
         "Tu réagis.",
         "Tu ne pilotes pas."]),
    render_slide_signe(3, TOTAL, "2 / 5",
        ["Tu découvres les départs", "après coup."],
        ["Un client est parti depuis 2 semaines",
         "avant que tu le remarques.",
         "",
         "Pas d'alerte. Pas de signal.",
         "Juste un vide dans le planning."]),
    render_slide_signe(4, TOTAL, "3 / 5",
        ["Tu confonds chiffre", "d'affaires et revenu."],
        ["Tu sais combien tu as facturé.",
         "Tu ne sais pas",
         "ce qui te reste vraiment.",
         "",
         "Tant que tu ne l'as pas calculé,",
         "c'est un chiffre vide."]),
    render_slide_signe(5, TOTAL, "4 / 5",
        ["Tu fixes tes prix", "au feeling."],
        ["Ou pire : en copiant ceux",
         "que tu vois sur Instagram.",
         "",
         "Sans connaître ta marge,",
         "tes coûts, ta capacité.",
         "",
         "C'est un coup de dé, pas une décision."]),
    render_slide_signe(6, TOTAL, "5 / 5",
        ["Tu n'as aucune vision", "à 90 jours."],
        ["Tu pourrais avoir 3 mois de creux",
         "dans 60 jours.",
         "",
         "Tu ne le saurais pas.",
         "Et tu ne pourrais rien faire",
         "pour l'éviter."]),
    render_slide_solution(7, TOTAL),
    render_slide_cta(8, TOTAL),
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
