#!/usr/bin/env python3
"""
Génère l'ebook complet "Athlète Explosif" en PDF.
DA hybride : ESSAN (séparateurs dark) + Force et Masse (éditorial crème) + RB Perform (cyan + Inter).
Source : ~/Downloads/ebook debut.docx
Output : ~/Downloads/Ebook-Athlete-Explosif.pdf
"""

from pathlib import Path
from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, NextPageTemplate, KeepTogether, Image as RLImage
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

# ─── PATHS ───────────────────────────────────────────────────────────────────
ROOT = Path.home()
WORD_SOURCE = ROOT / "Downloads/ebook debut.docx"
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
OUTPUT_PDF = ROOT / "Downloads/Ebook-Athlete-Explosif.pdf"

# ─── COULEURS ────────────────────────────────────────────────────────────────
ENCRE = HexColor('#080C14')
ENCRE_2 = HexColor('#0E1521')
PAPIER = HexColor('#FAF8F3')
PAPIER_2 = HexColor('#F2EFE8')
CYAN = HexColor('#02D1BA')
CYAN_LIGHT = HexColor('#7DD8C7')
CYAN_DARK = HexColor('#00A38F')
NOIR = HexColor('#141414')
GRIS_DARK = HexColor('#5A5A5A')
GRIS = HexColor('#9A9A9A')
BLANC = HexColor('#FFFFFF')
# Accent DORÉ pour séances Course/Run (différenciation visuelle des séances Muscu)
DORE = HexColor('#D4A574')
DORE_DARK = HexColor('#B08755')

# ─── POLICES ─────────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('Inter-Reg', str(FONT_DIR / 'InterDisplay-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Inter-Med', str(FONT_DIR / 'InterDisplay-Medium.ttf')))
pdfmetrics.registerFont(TTFont('Inter-Bold', str(FONT_DIR / 'InterDisplay-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Inter-Black', str(FONT_DIR / 'InterDisplay-Black.ttf')))

# Phosphor Icons Fill — icônes vectorielles open source (MIT) pour signatures visuelles
PHOSPHOR_DIR = ROOT / "fitcoach_updated/scripts/fonts/Phosphor"
pdfmetrics.registerFont(TTFont('Phosphor-Fill', str(PHOSPHOR_DIR / 'Phosphor-Fill.ttf')))

# Mapping num chapitre → unicode icon Phosphor Fill (signature visuelle par chapitre)
CHAPTER_ICONS = {
    1 : chr(0xe1c8),  # compass-fill — Intro
    2 : chr(0xe0b6),  # barbell-fill — Bodybuilder vs Athlète
    3 : chr(0xe730),  # person-simple-run-fill — Entraînement
    4 : chr(0xe492),  # timer-fill — Tests physiques
    5 : chr(0xe39c),  # path-fill — Intro programme
    6 : chr(0xe108),  # calendar-fill — ATHLÈTE 90 Programme
    7 : chr(0xeaa4),  # bowl-food-fill — Nutrition
    8 : chr(0xe700),  # pill-fill — Compléments
    9 : chr(0xed5c),  # person-simple-tai-chi-fill — Mobilité
    10: chr(0xe0cc),  # bed-fill — Récupération
    11: chr(0xe74e),  # brain-fill — Mindset
    12: chr(0xe3e8),  # question-fill — FAQ
    13: chr(0xe67e),  # trophy-fill — Conclusion
    14: chr(0xe0e2),  # book-fill — Annexes
}

# Mapping partie → unicode icon
PART_ICONS = {
    'I':   chr(0xe74e),  # brain-fill — COMPRENDRE
    'II':  chr(0xe0b6),  # barbell-fill — S'ENTRAÎNER
    'III': chr(0xe0cc),  # bed-fill — RÉCUPÉRER
}

# ─── DIMENSIONS PAGE ─────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN_INNER = 22 * mm
MARGIN_OUTER = 18 * mm
MARGIN_TOP = 24 * mm
MARGIN_BOTTOM = 28 * mm
# Frame texte = 56% de la largeur (le reste = colonne visuelle)
TEXT_COL_RATIO = 0.56
GUTTER = 8 * mm
TEXT_W = (PAGE_W - MARGIN_INNER - MARGIN_OUTER) * TEXT_COL_RATIO
VISUAL_W = (PAGE_W - MARGIN_INNER - MARGIN_OUTER) * (1 - TEXT_COL_RATIO) - GUTTER
VISUAL_X = MARGIN_INNER + TEXT_W + GUTTER
CONTENT_W = PAGE_W - MARGIN_INNER - MARGIN_OUTER

# ─── STYLES TYPOGRAPHIQUES ───────────────────────────────────────────────────
S_h2 = ParagraphStyle('h2', fontName='Inter-Bold', fontSize=22, leading=28,
                      textColor=CYAN_DARK, spaceAfter=10, spaceBefore=18)
S_h3 = ParagraphStyle('h3', fontName='Inter-Bold', fontSize=15, leading=19,
                      textColor=NOIR, spaceAfter=4, spaceBefore=8)
S_body = ParagraphStyle('body', fontName='Inter-Reg', fontSize=10.5, leading=15,
                        textColor=NOIR, spaceAfter=6, alignment=TA_JUSTIFY)
S_bullet = ParagraphStyle('bullet', fontName='Inter-Reg', fontSize=10.5, leading=15,
                          textColor=NOIR, leftIndent=20, bulletIndent=6,
                          spaceAfter=3, alignment=TA_LEFT,
                          bulletFontName='Inter-Bold', bulletColor=CYAN_DARK)
S_eyebrow = ParagraphStyle('eyebrow', fontName='Inter-Bold', fontSize=9,
                           textColor=CYAN_DARK, spaceAfter=6, alignment=TA_LEFT)
S_note = ParagraphStyle('note', fontName='Inter-Med', fontSize=10, leading=15,
                        textColor=GRIS_DARK, spaceAfter=8, leftIndent=14,
                        rightIndent=8, borderColor=CYAN, borderWidth=0,
                        borderPadding=10, backColor=PAPIER_2,
                        spaceBefore=6)
S_quote = ParagraphStyle('quote', fontName='Inter-Med', fontSize=13, leading=20,
                         textColor=NOIR, leftIndent=20, rightIndent=20,
                         spaceAfter=12, spaceBefore=12, alignment=TA_CENTER)

# ─── BACKGROUNDS DRAWING ─────────────────────────────────────────────────────
def draw_brand_top_left(c, color_text=BLANC, color_dot=CYAN):
    """RB.PERFORM. top-left."""
    c.setFont('Inter-Black', 11)
    x = MARGIN_OUTER
    y = PAGE_H - 14 * mm
    c.setFillColor(color_text)
    c.drawString(x, y, 'RB')
    w = c.stringWidth('RB', 'Inter-Black', 11)
    c.setFillColor(color_dot)
    c.drawString(x + w, y, '.')
    w += c.stringWidth('.', 'Inter-Black', 11)
    c.setFillColor(color_text)
    c.drawString(x + w, y, 'PERFORM')
    w += c.stringWidth('PERFORM', 'Inter-Black', 11)
    c.setFillColor(color_dot)
    c.drawString(x + w, y, '.')

def draw_brand_top_right(c, color_text=NOIR, color_dot=CYAN):
    """RB.PERFORM. top-right."""
    c.setFont('Inter-Black', 9)
    # mesurer largeur totale
    parts = ['RB', '.', 'PERFORM', '.']
    total_w = sum(c.stringWidth(p, 'Inter-Black', 9) for p in parts)
    x = PAGE_W - MARGIN_OUTER - total_w
    y = PAGE_H - 12 * mm
    colors = [color_text, color_dot, color_text, color_dot]
    for part, col in zip(parts, colors):
        c.setFillColor(col)
        c.drawString(x, y, part)
        x += c.stringWidth(part, 'Inter-Black', 9)

def draw_photo_placeholder(canvas, x, y, w, h, label="PHOTO", dim_bg=True):
    """Dessine un placeholder photo discret (fond uni minimal, sans label visible)."""
    if dim_bg:
        canvas.setFillColor(HexColor('#1A2030'))
    else:
        canvas.setFillColor(HexColor('#E5E2DA'))
    canvas.rect(x, y, w, h, fill=1, stroke=0)

def on_seance_page(canvas, doc):
    """Page séance : fond dark uni + footer minimal blanc."""
    canvas.saveState()
    canvas.setFillColor(ENCRE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Footer minimal blanc — branding + numéro de page
    canvas.setFont('Inter-Bold', 7.5)
    canvas.setFillColor(HexColor('#5A6478'))
    canvas.drawString(MARGIN_INNER, 10 * mm,
                       "RB PERFORM  ·  MÉTHODE ATHLÈTE COMPLET")
    canvas.drawRightString(PAGE_W - MARGIN_OUTER, 10 * mm, str(doc.page))
    canvas.restoreState()


def _roman_to_int(r):
    """Convertit un romain (I, II, ..., XIV) en entier."""
    table = {'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,
             'VIII':8,'IX':9,'X':10,'XI':11,'XII':12,'XIII':13,'XIV':14}
    return table.get(r, 0)

# ─── ILLUSTRATIONS ADOBE FIREFLY (fallback → Phosphor Icons si absent) ──────
ILLU_DIR = ROOT / "Downloads/illustrations-rb"

# Mapping num chapitre → nom de fichier illustration Adobe PNG
CHAPTER_ILLU_NAMES = {
    1:  'chap-01-intro.png',
    2:  'chap-02-bb-athlete.png',
    3:  'chap-03-entrainement.png',
    4:  'chap-04-tests.png',
    5:  'chap-05-intro-prog.png',
    6:  'chap-06-programme.png',
    7:  'chap-07-nutrition.png',
    8:  'chap-08-complements.png',
    9:  'chap-09-mobilite.png',
    10: 'chap-10-recup.png',
    11: 'chap-11-mindset.png',
    12: 'chap-12-faq.png',
    13: 'chap-13-conclusion.png',
    14: 'chap-14-annexes.png',
}

PART_ILLU_NAMES = {
    'I':   'partie-1-comprendre.png',
    'II':  'partie-2-entrainer.png',
    'III': 'partie-3-recuperer.png',
}

def _chapter_illu_path(num):
    """Retourne le path de l'illustration Adobe si elle existe, sinon None."""
    name = CHAPTER_ILLU_NAMES.get(num)
    if not name:
        return None
    path = ILLU_DIR / "chapitres" / name
    return path if path.is_file() else None

def _part_illu_path(roman):
    """Retourne le path de l'illustration partie si elle existe, sinon None."""
    name = PART_ILLU_NAMES.get(roman)
    if not name:
        return None
    path = ILLU_DIR / "parties" / name
    return path if path.is_file() else None

def _draw_icon_or_illu(canvas, illu_path, fallback_unicode, x_center, y_center,
                        icon_size_pt=90, illu_size_mm=70):
    """Dessine l'illustration Adobe si dispo, sinon l'icône Phosphor.
    Centré sur (x_center, y_center)."""
    if illu_path:
        from reportlab.lib.utils import ImageReader
        try:
            ir = ImageReader(str(illu_path))
            iw, ih = ir.getSize()
            ratio = ih / iw if iw else 1
            w = illu_size_mm * mm
            h = w * ratio
            canvas.drawImage(str(illu_path),
                              x_center - w/2, y_center - h/2, w, h,
                              mask='auto', preserveAspectRatio=True)
            return
        except Exception:
            pass
    # Fallback Phosphor icon
    if fallback_unicode:
        canvas.setFont('Phosphor-Fill', icon_size_pt)
        canvas.setFillColorRGB(2/255, 209/255, 186/255, alpha=0.85)
        canvas.drawCentredString(x_center, y_center - icon_size_pt/3, fallback_unicode)


def on_dark_page(canvas, doc):
    """Page séparateur : fond dark + numéro romain géant + logo + sommaire.
    Si is_part : design dédié page PARTIE (eyebrow + romain XXL blanc + sous-titre cyan)."""
    canvas.saveState()
    canvas.setFillColor(ENCRE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    roman = _separator_state.get('roman', '')
    is_part = _separator_state.get('is_part', False)
    part_title = _separator_state.get('part_title', '')

    if roman and is_part:
        # ─── PAGE SÉPARATEUR DE PARTIE — design dédié ─────────────────
        # Eyebrow "PARTIE" tout en haut centré
        canvas.setFont('Inter-Bold', 13)
        canvas.setFillColor(CYAN)
        canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.72,
                                  "·  P A R T I E  ·")
        # Numéro romain XXL blanc centré
        canvas.setFont('Inter-Black', 240)
        canvas.setFillColor(BLANC)
        canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.36, roman)
        # Sous-titre cyan en bas
        canvas.setFont('Inter-Black', 38)
        canvas.setFillColor(CYAN)
        canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.20, part_title)
    elif roman:
        # ─── PAGE SÉPARATEUR DE CHAPITRE — numéro romain background ───
        canvas.setFont('Inter-Black', 380)
        canvas.setFillColorRGB(0, 163/255, 143/255, alpha=0.28)
        canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.32, roman)

    # Logo top-left
    draw_brand_top_left(canvas, BLANC, CYAN)
    # Bottom "SOMMAIRE >"
    canvas.setFont('Inter-Bold', 9)
    canvas.setFillColor(GRIS)
    canvas.drawRightString(PAGE_W - MARGIN_OUTER, 15 * mm, 'SOMMAIRE  >')
    canvas.restoreState()

def on_quote_page(canvas, doc):
    """Page citation : fond dark + gros guillemet typographique cyan + logo."""
    canvas.saveState()
    canvas.setFillColor(ENCRE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Gros guillemet « décoratif en background (cyan dark très opaque sur dark)
    canvas.setFillColor(HexColor('#0E2A28'))
    canvas.setFont('Inter-Black', 420)
    canvas.drawString(-40, PAGE_H - 360, "“")
    # Filet horizontal cyan court (haut)
    canvas.setFillColor(CYAN)
    canvas.rect(MARGIN_INNER, PAGE_H - 70 * mm, 28 * mm, 2, fill=1, stroke=0)
    # Logo top-left
    draw_brand_top_left(canvas, BLANC, CYAN)
    canvas.restoreState()

def _draw_photo_box(canvas, x, y, w, h, label="📷", bg=HexColor('#E5E2DA'),
                    border=HexColor('#C5C0B5'), label_color=HexColor('#9A9A9A'),
                    label_size=8):
    """Dessine un placeholder photo discret (fond uni)."""
    canvas.setFillColor(bg)
    canvas.rect(x, y, w, h, fill=1, stroke=0)

def _draw_pull_quote_box(canvas, x, y, w, h):
    """Encadré citation/note cyan."""
    canvas.setFillColor(HexColor('#F0F8F6'))
    canvas.rect(x, y, w, h, fill=1, stroke=0)
    canvas.setFillColor(CYAN)
    canvas.rect(x, y, 3, h, fill=1, stroke=0)
    canvas.setFont('Inter-Bold', 8)
    canvas.setFillColor(HexColor('#00A38F'))
    canvas.drawString(x + 10, y + h - 14, "·  À RETENIR")
    canvas.setFont('Inter-Med', 9)
    canvas.setFillColor(HexColor('#5A5A5A'))
    canvas.drawString(x + 10, y + h - 32, "Citation, stat ou point")
    canvas.drawString(x + 10, y + h - 44, "clé du chapitre.")

def _draw_stat_box(canvas, x, y, w, h, stat="N°", label="STATISTIQUE"):
    """Encadré gros chiffre / stat."""
    canvas.setFillColor(ENCRE)
    canvas.rect(x, y, w, h, fill=1, stroke=0)
    canvas.setFont('Inter-Black', 48)
    canvas.setFillColor(CYAN)
    canvas.drawCentredString(x + w/2, y + h/2 + 4, stat)
    canvas.setFont('Inter-Bold', 8)
    canvas.setFillColor(BLANC)
    canvas.drawCentredString(x + w/2, y + h/2 - 22, label)

def _draw_icon_grid(canvas, x, y, w, h, icons=None):
    """Grille 2x2 d'icônes / mini-placeholders."""
    if icons is None:
        icons = ["◆", "▲", "●", "■"]
    cell_w = (w - 4) / 2
    cell_h = (h - 4) / 2
    for i, icon in enumerate(icons[:4]):
        col, row = i % 2, i // 2
        cx = x + col * (cell_w + 4)
        cy = y + h - (row + 1) * cell_h - row * 4
        canvas.setFillColor(HexColor('#F2EFE8'))
        canvas.rect(cx, cy, cell_w, cell_h, fill=1, stroke=0)
        canvas.setFont('Inter-Black', 20)
        canvas.setFillColor(CYAN_DARK)
        canvas.drawCentredString(cx + cell_w/2, cy + cell_h/2 - 6, icon)

def draw_light_visual_column(canvas, page_num):
    """Colonne visuelle droite : UNE zone photo pleine hauteur (placeholder discret).
    Le user remplacera les zones par ses propres photos après coup."""
    visual_top = PAGE_H - MARGIN_TOP - 10 * mm
    visual_bot = MARGIN_BOTTOM + 10 * mm
    visual_h = visual_top - visual_bot
    _draw_photo_box(canvas, VISUAL_X, visual_bot, VISUAL_W, visual_h, "PHOTO")

def on_light_page(canvas, doc):
    """Page contenu : fond crème + texte gauche + visuel droite + logo + numéro."""
    canvas.saveState()
    canvas.setFillColor(PAPIER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Colonne visuelle droite (alternance photo / citation / mood)
    draw_light_visual_column(canvas, doc.page)
    # Logo top-right
    draw_brand_top_right(canvas, NOIR, CYAN)
    # Page number bottom outer
    canvas.setFont('Inter-Reg', 9)
    canvas.setFillColor(GRIS)
    canvas.drawRightString(PAGE_W - MARGIN_OUTER, 15 * mm, str(doc.page))
    canvas.restoreState()

def draw_enriched_footer(canvas, doc, x_start, w):
    """Footer commun : RB.PERFORM · ÉDITION 2026 (gauche) | ↑ Sommaire · numéro (droite)."""
    foot_y = MARGIN_BOTTOM
    canvas.setFont('Inter-Bold', 8.5)
    canvas.setFillColor(GRIS_DARK)
    canvas.drawString(x_start, foot_y, "RB.PERFORM")
    canvas.setFillColor(CYAN_DARK)
    canvas.setFont('Inter-Black', 8.5)
    canvas.drawString(x_start + 19*mm, foot_y, "·")
    canvas.setFont('Inter-Med', 8.5)
    canvas.setFillColor(GRIS_DARK)
    canvas.drawString(x_start + 22*mm, foot_y, "ÉDITION 2026")
    # Numéro de page à droite
    canvas.setFont('Inter-Black', 9)
    canvas.setFillColor(CYAN_DARK)
    page_str = str(doc.page)
    page_w = canvas.stringWidth(page_str, 'Inter-Black', 9)
    canvas.drawRightString(x_start + w, foot_y, page_str)
    # ↑ Sommaire (cliquable, juste à gauche du numéro de page)
    canvas.setFont('Inter-Bold', 7.5)
    canvas.setFillColor(CYAN_DARK)
    sommaire_text = "↑ SOMMAIRE"
    sommaire_w = canvas.stringWidth(sommaire_text, 'Inter-Bold', 7.5)
    sommaire_x = x_start + w - page_w - 5*mm - sommaire_w
    canvas.drawString(sommaire_x, foot_y, sommaire_text)
    canvas.linkRect("", "sommaire",
                     (sommaire_x - 2, foot_y - 2, sommaire_x + sommaire_w + 2, foot_y + 9),
                     relative=0, thickness=0)

def on_light_full_page(canvas, doc):
    """Page contenu PLEINE LARGEUR : fond crème + logo + footer enrichi."""
    canvas.saveState()
    canvas.setFillColor(PAPIER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_brand_top_right(canvas, NOIR, CYAN)
    draw_enriched_footer(canvas, doc, MARGIN_INNER, CONTENT_W)
    canvas.restoreState()

# Dimensions du frame chapitre (étroit, centré — lisibilité magazine pro)
CHAPTER_TEXT_W = 130 * mm
CHAPTER_TEXT_X = (PAGE_W - CHAPTER_TEXT_W) / 2
CHAPTER_TEXT_TOP_MARGIN = 28 * mm   # plus d'air en haut
CHAPTER_TEXT_BOTTOM_MARGIN = 32 * mm  # plus d'air en bas (filet + numéro)

# État chapitre courant pour running header
_chapter_state = {'num': 0, 'title': ''}
# État séparateur courant pour le numéro romain géant en background
# is_part=True → page séparateur de PARTIE (rendu spécial)
_separator_state = {'roman': '', 'is_part': False, 'part_title': ''}

from reportlab.platypus.flowables import Flowable
class SetChapter(Flowable):
    """Flowable invisible qui met à jour l'état du chapitre courant.
    Placé dans le ChapterSeparator avant le PageBreak final, pour que
    on_chapter_page lise le bon titre au démarrage de la page suivante."""
    def __init__(self, num, title):
        super().__init__()
        self.num = num
        self.title = title
    def wrap(self, availWidth, availHeight):
        return 0, 0
    def draw(self):
        _chapter_state['num'] = self.num
        _chapter_state['title'] = self.title

class SetSeparator(Flowable):
    """Update _separator_state pour la page séparateur dark à venir."""
    def __init__(self, roman, is_part=False, part_title=''):
        super().__init__()
        self.roman = roman
        self.is_part = is_part
        self.part_title = part_title
    def wrap(self, availWidth, availHeight):
        return 0, 0
    def draw(self):
        _separator_state['roman'] = self.roman
        _separator_state['is_part'] = self.is_part
        _separator_state['part_title'] = self.part_title


class PdfBookmark(Flowable):
    """Flowable invisible qui ajoute un bookmark PDF (outline cliquable).
    key : identifiant unique pour les liens internes
    title : libellé affiché dans l'outline du reader PDF
    level : profondeur dans l'outline (0 = top, 1 = sous-section, 2 = sous-sous)
    """
    def __init__(self, key, title, level=0):
        super().__init__()
        self.key = key
        self.title = title
        self.level = level
    def wrap(self, availWidth, availHeight):
        return 0, 0
    def draw(self):
        c = self.canv
        c.bookmarkPage(self.key)
        c.addOutlineEntry(self.title, self.key, level=self.level, closed=False)

def on_chapter_page(canvas, doc):
    """Page chapitre éditoriale : fond crème, running header + filets + pagination pro."""
    canvas.saveState()
    # Fond crème
    canvas.setFillColor(PAPIER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Brand top-right
    draw_brand_top_right(canvas, NOIR, CYAN)

    # Running header : titre chapitre courant en haut à gauche (style éditorial)
    if _chapter_state.get('title'):
        canvas.setFont('Inter-Bold', 8.5)
        canvas.setFillColor(GRIS_DARK)
        roman = ChapterSeparator._roman(_chapter_state['num'])
        header_text = f"CHAPITRE {roman}  ·  {_chapter_state['title'].upper()}"
        canvas.drawString(CHAPTER_TEXT_X, PAGE_H - 14 * mm, header_text)

    # Filet décoratif HAUT (sous le header) — fine ligne crème pâle
    canvas.setStrokeColor(HexColor('#D8D3C5'))
    canvas.setLineWidth(0.3)
    canvas.line(CHAPTER_TEXT_X, PAGE_H - 19 * mm,
                CHAPTER_TEXT_X + CHAPTER_TEXT_W, PAGE_H - 19 * mm)

    # Filet décoratif BAS (au-dessus de la pagination)
    canvas.line(CHAPTER_TEXT_X, MARGIN_BOTTOM + 8 * mm,
                CHAPTER_TEXT_X + CHAPTER_TEXT_W, MARGIN_BOTTOM + 8 * mm)

    # Footer enrichi
    draw_enriched_footer(canvas, doc, CHAPTER_TEXT_X, CHAPTER_TEXT_W)

    canvas.restoreState()

# Dimensions photo droite pleine hauteur (template nutrition)
NUT_TEXT_W = 92 * mm
NUT_GUTTER = 8 * mm
NUT_PHOTO_X = MARGIN_INNER + NUT_TEXT_W + NUT_GUTTER
NUT_PHOTO_W = PAGE_W - NUT_PHOTO_X - MARGIN_OUTER
NUT_PHOTO_Y = MARGIN_BOTTOM
NUT_PHOTO_H = PAGE_H - NUT_PHOTO_Y - MARGIN_TOP

NUT_IMG_DIR = ROOT / "Downloads/Nutrition-Images-Extraites"
TEMOIN_IMG_DIR = ROOT / "Downloads/Temoignages-Images"
NUT_PHOTOS_SEQUENCE = [
    NUT_IMG_DIR / "intro-promesses.jpg",    # INTRO 04 Ce que tu vas apprendre
    NUT_IMG_DIR / "nut-intro-athlete.jpg",  # nutrition 01 Introduction
    NUT_IMG_DIR / "nut-proteines.png",      # nutrition 06 Protéines
    NUT_IMG_DIR / "nut-glucides.jpg",       # nutrition 07 Glucides
    NUT_IMG_DIR / "nut-lipides.jpg",        # nutrition 08 Lipides
    NUT_IMG_DIR / "nut-legumes.jpg",        # nutrition 09 Légumes
    NUT_IMG_DIR / "nut-timing-repas.png",   # nutrition 10 Timing repas
    NUT_IMG_DIR / "hyd-intro.png",          # hydratation 01 Intro
    NUT_IMG_DIR / "hyd-regle.png",          # hydratation 03 Règle d'or
]
_nut_photo_counter = [0]  # incrémenté à chaque rendu de page nutrition_photo

def on_nutrition_photo_page(canvas, doc):
    """Page nutrition avec photo droite pleine hauteur (image réelle ou placeholder)."""
    canvas.saveState()
    canvas.setFillColor(PAPIER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    idx = _nut_photo_counter[0]
    _nut_photo_counter[0] += 1
    img_path = NUT_PHOTOS_SEQUENCE[idx] if idx < len(NUT_PHOTOS_SEQUENCE) else None
    if img_path and img_path.exists():
        # Crop center : on calcule un rect source qui matche le ratio du frame photo
        from reportlab.lib.utils import ImageReader
        ir = ImageReader(str(img_path))
        iw, ih = ir.getSize()
        target_ratio = NUT_PHOTO_W / NUT_PHOTO_H
        src_ratio = iw / ih
        if src_ratio > target_ratio:
            # image plus large : crop horizontal
            new_w = ih * target_ratio
            sx = (iw - new_w) / 2
            sy = 0
            sw, sh = new_w, ih
        else:
            # image plus haute : crop vertical
            new_h = iw / target_ratio
            sx = 0
            sy = (ih - new_h) / 2
            sw, sh = iw, new_h
        # Clip puis dessin (crop via clip path)
        canvas.saveState()
        p = canvas.beginPath()
        p.rect(NUT_PHOTO_X, NUT_PHOTO_Y, NUT_PHOTO_W, NUT_PHOTO_H)
        canvas.clipPath(p, stroke=0, fill=0)
        # Dessin avec cover (étendu pour couvrir le crop)
        draw_w = NUT_PHOTO_W * iw / sw
        draw_h = NUT_PHOTO_H * ih / sh
        draw_x = NUT_PHOTO_X - sx * NUT_PHOTO_W / sw
        draw_y = NUT_PHOTO_Y - (ih - sy - sh) * NUT_PHOTO_H / sh
        canvas.drawImage(str(img_path), draw_x, draw_y, draw_w, draw_h, mask='auto')
        canvas.restoreState()
    else:
        canvas.setFillColor(HexColor('#E8E4D8'))
        canvas.rect(NUT_PHOTO_X, NUT_PHOTO_Y, NUT_PHOTO_W, NUT_PHOTO_H, fill=1, stroke=0)
    draw_brand_top_right(canvas, NOIR, CYAN)
    draw_enriched_footer(canvas, doc, MARGIN_INNER, NUT_TEXT_W)
    canvas.restoreState()

def on_cover_page(canvas, doc):
    """Cover style magazine : photo plein cadre + gradient bas sombre pour lisibilité titre."""
    canvas.saveState()
    # Fond dark
    canvas.setFillColor(ENCRE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Photo plein cadre (placeholder ou vraie photo si déposée)
    cover_img = NUT_IMG_DIR / "cover-rayan.jpg"
    if cover_img.exists():
        from reportlab.lib.utils import ImageReader
        ir = ImageReader(str(cover_img))
        iw, ih = ir.getSize()
        # Cover crop pour remplir la page
        target_ratio = PAGE_W / PAGE_H
        src_ratio = iw / ih
        if src_ratio > target_ratio:
            new_w = ih * target_ratio
            sx = (iw - new_w) / 2
            sw, sh = new_w, ih
        else:
            new_h = iw / target_ratio
            sx = 0
            sy = (ih - new_h) / 2
            sw, sh = iw, new_h
        canvas.saveState()
        p = canvas.beginPath()
        p.rect(0, 0, PAGE_W, PAGE_H)
        canvas.clipPath(p, stroke=0, fill=0)
        draw_w = PAGE_W * iw / sw
        draw_h = PAGE_H * ih / sh
        draw_x = -sx * PAGE_W / sw
        draw_y = 0
        canvas.drawImage(str(cover_img), draw_x, draw_y, draw_w, draw_h, mask='auto')
        canvas.restoreState()
    else:
        # Placeholder photo plein cadre
        draw_photo_placeholder(
            canvas, 0, 0, PAGE_W, PAGE_H,
            label="PHOTO COVER RAYAN — PLEINE PAGE",
            dim_bg=True
        )
    # Gradient bas : assombrir la moitié basse pour lisibilité titre
    # On simule un gradient en empilant des rectangles transparents
    for i in range(20):
        alpha = 0.04 + (i / 20.0) * 0.55  # 0.04 → 0.59
        y = PAGE_H * 0.55 - (i / 20.0) * (PAGE_H * 0.55)
        canvas.setFillColorRGB(8/255, 12/255, 20/255, alpha=alpha)
        canvas.rect(0, y, PAGE_W, PAGE_H * 0.55 / 20, fill=1, stroke=0)

    # ─── SCEAU "ÉDITION 2026 NUMÉROTÉE" (top-right corner) ──────────────
    # Cercle plein cyan dark avec texte concentrique blanc
    sceau_cx = PAGE_W - 28 * mm
    sceau_cy = PAGE_H - 30 * mm
    sceau_r = 18 * mm
    # Cercle plein cyan dark
    canvas.setFillColor(CYAN_DARK)
    canvas.circle(sceau_cx, sceau_cy, sceau_r, fill=1, stroke=0)
    # Cercle intérieur fin pour effet sceau
    canvas.setStrokeColor(CYAN)
    canvas.setLineWidth(0.6)
    canvas.circle(sceau_cx, sceau_cy, sceau_r - 2.5*mm, fill=0, stroke=1)
    # Étoile centrale (icon Phosphor star-fill)
    canvas.setFont('Phosphor-Fill', 18)
    canvas.setFillColor(CYAN)
    canvas.drawCentredString(sceau_cx, sceau_cy + 1.5*mm, chr(0xe46a))  # star-fill
    # Texte "ÉDITION 2026"
    canvas.setFont('Inter-Black', 6.5)
    canvas.setFillColor(BLANC)
    canvas.drawCentredString(sceau_cx, sceau_cy - 3*mm, "ÉDITION 2026")
    # Texte "NUMÉROTÉE"
    canvas.setFont('Inter-Bold', 6)
    canvas.setFillColor(HexColor('#A8E5DC'))
    canvas.drawCentredString(sceau_cx, sceau_cy - 6*mm, "NUMÉROTÉE")

    canvas.restoreState()

# ─── ÉLÉMENTS DE PAGE ────────────────────────────────────────────────────────
class ChapterSeparator:
    """Génère une page séparateur de chapitre (fond dark)."""
    def __init__(self, num, title, story_buffer, next_template='light'):
        self.num = num
        self.title = title
        self.buffer = story_buffer
        self.next_template = next_template
        self._build()

    def _build(self):
        # Pré-set du numéro romain pour le background de la page dark à venir
        self.buffer.append(SetSeparator(self._roman(self.num)))
        # Switch to dark template, page break
        self.buffer.append(NextPageTemplate('dark'))
        self.buffer.append(PageBreak())
        # Bookmark PDF : entrée outline cliquable pour ce chapitre
        self.buffer.append(PdfBookmark(
            key=f"chapter-{self.num}",
            title=f"{self._roman(self.num)} · {self.title}",
            level=0))
        # Spacer pour pousser vers le centre vertical
        self.buffer.append(Spacer(1, 110 * mm))
        # Eyebrow "CHAPITRE X" — centré
        eyebrow_style = ParagraphStyle(
            'sep_eyebrow', fontName='Inter-Bold', fontSize=11,
            textColor=CYAN, alignment=TA_CENTER, spaceAfter=10)
        self.buffer.append(Paragraph(
            f"·  C H A P I T R E  ·  {self._roman(self.num)}", eyebrow_style))
        # Big title — centré
        title_style = ParagraphStyle(
            'sep_title', fontName='Inter-Black', fontSize=44, leading=52,
            textColor=BLANC, alignment=TA_CENTER, spaceAfter=18)
        self.buffer.append(Paragraph(self.title.upper(), title_style))
        # Met à jour l'état chapitre courant AVANT le PageBreak pour que la
        # page suivante affiche le bon running header.
        self.buffer.append(SetChapter(self.num, self.title))
        # Switch to next template for following pages
        self.buffer.append(NextPageTemplate(self.next_template))
        self.buffer.append(PageBreak())

    @staticmethod
    def _roman(n):
        roms = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX',
                'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII']
        return roms[n] if 0 <= n < len(roms) else str(n)

def build_part_separator(story, roman, part_title, next_template='chapter'):
    """Page séparateur de PARTIE — dark plein avec romain XXL blanc + sous-titre.
    Tout est dessiné par on_dark_page via _separator_state(is_part=True)."""
    story.append(SetSeparator(roman, is_part=True, part_title=part_title))
    story.append(NextPageTemplate('dark'))
    story.append(PageBreak())
    # Bookmark PDF de la PARTIE
    story.append(PdfBookmark(
        key=f"partie-{roman}",
        title=f"Partie {roman} · {part_title.rstrip('.')}",
        level=0))
    # Reset le state pour les pages suivantes (le séparateur chapitre qui suit
    # ré-écrira son propre romain en mode is_part=False).
    story.append(SetSeparator('', is_part=False))
    story.append(NextPageTemplate(next_template))

def add_h2(buffer, text):
    """Ajoute un titre H2 avec eyebrow filet cyan."""
    buffer.append(Paragraph(text, S_h2))

def add_h3(buffer, text):
    buffer.append(Paragraph(text, S_h3))

def add_body(buffer, text):
    if text.strip():
        buffer.append(Paragraph(_escape(text), S_body))

def add_body_with_drop_cap(buffer, text):
    """Premier paragraphe de chapitre avec drop cap éditorial."""
    text = text.strip()
    if not text:
        return
    first_char = text[0]
    rest = text[1:]
    cap_style = ParagraphStyle('drop_cap', fontName='Inter-Black', fontSize=48,
                                textColor=CYAN_DARK, leading=44, alignment=TA_LEFT,
                                spaceAfter=0)
    body_style = ParagraphStyle('body_dropr', fontName='Inter-Reg', fontSize=10.5,
                                 leading=16, textColor=NOIR, alignment=TA_JUSTIFY,
                                 spaceAfter=0)
    cap = Paragraph(first_char, cap_style)
    body = Paragraph(_escape(rest), body_style)
    t = Table([[cap, body]], colWidths=[15*mm, 115*mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (0,-1), 'TOP'),
        ('VALIGN', (1,0), (1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (0,-1), 0),
        ('TOPPADDING', (1,0), (1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    buffer.append(t)

def add_bullet(buffer, text):
    """Ajoute un bullet avec puce cyan."""
    if text.strip():
        buffer.append(Paragraph(_escape(text), S_bullet,
                                bulletText='→'))

def _escape(text):
    """Échappe les caractères réservés HTML pour reportlab."""
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;'))

# ─── PARSER DU WORD ──────────────────────────────────────────────────────────
def parse_word(path):
    """Parse le docx en liste d'éléments avec type + texte."""
    import re
    doc = Document(str(path))
    elements = []
    seen_first_h1 = False
    skip_chapter = False
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        style_name = p.style.name if p.style else 'Normal'
        if style_name == 'Heading 1':
            seen_first_h1 = True
            t_lower = text.lower()
            # Skip "1. Préambule + Disclaimer légal" — doublonne le colophon
            if 'préambule' in t_lower and 'disclaimer' in t_lower:
                skip_chapter = True
                continue
            skip_chapter = False
            # Retire préfixe "N." du Word (renumérotation séquentielle gérée plus loin)
            clean = re.sub(r'^\d+\.\s*', '', text).strip()
            # Renames de titres (override du Word)
            renames = {
                'Théorie athlète': "L'entraînement athlétique",
                'Tests baseline': "Tests physiques",
                'Conclusion + CTA': "Conclusion",
            }
            clean = renames.get(clean, clean)
            elements.append(('h1', clean))
        elif not seen_first_h1 or skip_chapter:
            # Skip Title + author avant le 1er chapitre, ou contenu du chapitre 1
            continue
        elif style_name == 'Heading 2':
            elements.append(('h2', text))
        elif style_name == 'Heading 3':
            elements.append(('h3', text))
        elif style_name in ('List Bullet', 'List Paragraph'):
            elements.append(('bullet', text))
        else:
            # Détection note : commence par 📝
            if text.startswith('📝'):
                elements.append(('note', text[2:].strip()))
            else:
                elements.append(('body', text))
    return elements

# ─── PAGE COVER ──────────────────────────────────────────────────────────────
def _make_qr(url, size_mm=22):
    """Génère un QR code reportlab Drawing."""
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size_mm * mm, size_mm * mm,
                transform=[size_mm * mm / w, 0, 0, size_mm * mm / h, 0, 0])
    d.add(qr)
    return d

def _qr_block(url, label_top, label_main, size_mm=22, bg=BLANC, fg=NOIR):
    """Bloc QR + label inline (table 2 cols : QR | label_top / label_main).
    Le label_main est aussi un lien cliquable vers l'URL."""
    qr = _make_qr(url, size_mm)
    lbl_top_s = ParagraphStyle('qr_lt', fontName='Inter-Bold', fontSize=8,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=10,
                                 spaceAfter=2)
    lbl_main_s = ParagraphStyle('qr_lm', fontName='Inter-Black', fontSize=12,
                                  textColor=fg, alignment=TA_LEFT, leading=14)
    lbl_sub_s = ParagraphStyle('qr_ls', fontName='Inter-Reg', fontSize=8,
                                 textColor=GRIS_DARK, alignment=TA_LEFT, leading=10)
    # label_main cliquable + petit lien lisible en dessous
    text_cell = [Paragraph(label_top, lbl_top_s),
                  Paragraph(f'<link href="{url}">{label_main}</link>', lbl_main_s),
                  Paragraph(f'<link href="{url}">scanne ou clique</link>', lbl_sub_s)]
    t = Table([[qr, text_cell]], colWidths=[(size_mm + 4)*mm, 80*mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (-1,-1), bg),
    ]))
    return t

def build_cover(story):
    """Cover style magazine GQ — photo plein cadre + titre asymétrique bas-gauche.
    Hiérarchie : eyebrow prestige · titre XL · pitch · filet · auteur · footer stats."""
    story.append(NextPageTemplate('cover'))
    # Bookmark PDF de la couverture (cible pour retour direct au début)
    story.append(PdfBookmark(key="cover", title="Couverture", level=0))

    # Push contenu vers le bas (style magazine premium)
    story.append(Spacer(1, 128 * mm))

    # Eyebrow prestige (multi-info)
    eyebrow_cover = ParagraphStyle('eyebrow_c', fontName='Inter-Bold', fontSize=10,
                                    textColor=CYAN, alignment=TA_LEFT, spaceAfter=14,
                                    leading=13)
    story.append(Paragraph(
        "ÉDITION 2026  ·  MÉTHODE SIGNATURE  ·  INCLUT ATHLÈTE 90",
        eyebrow_cover))

    # Titre asymétrique style GQ (aligné gauche)
    title_cover = ParagraphStyle('title_c', fontName='Inter-Black', fontSize=52,
                                  leading=54, textColor=BLANC, alignment=TA_LEFT,
                                  spaceAfter=0)
    story.append(Paragraph("MÉTHODE ATHLÈTE", title_cover))
    title_cover_2 = ParagraphStyle('title_c2', fontName='Inter-Black', fontSize=52,
                                    leading=54, textColor=BLANC, alignment=TA_LEFT,
                                    spaceAfter=14)
    story.append(Paragraph("COMPLET<font color='#02D1BA'>.</font>", title_cover_2))

    # Sous-titre pitch
    pitch_style = ParagraphStyle('pitch', fontName='Inter-Med', fontSize=13, leading=18,
                                  textColor=HexColor('#EEF9F7'), alignment=TA_LEFT,
                                  spaceAfter=14)
    story.append(Paragraph(
        "Vitesse, Force, Explosivité — <font color='#02D1BA'>Tout en un.</font>",
        pitch_style))

    # Filet décoratif cyan
    from reportlab.platypus import HRFlowable
    story.append(HRFlowable(width=36*mm, thickness=1.5, color=CYAN,
                             spaceBefore=0, spaceAfter=12))

    # Auteur — signature bas-gauche
    author_style = ParagraphStyle('author', fontName='Inter-Black', fontSize=12,
                                   textColor=BLANC, alignment=TA_LEFT,
                                   leading=15, spaceAfter=2)
    story.append(Paragraph("RAYAN BONTE", author_style))
    sub_author = ParagraphStyle('sub_author', fontName='Inter-Reg', fontSize=9,
                                 textColor=HexColor('#A8E5DC'), alignment=TA_LEFT,
                                 leading=12)
    story.append(Paragraph("RB Perform &nbsp;·&nbsp; Édition 2026", sub_author))

    # Suite : pages titre + colophon + TDM en full width
    story.append(NextPageTemplate('light_full'))
    story.append(PageBreak())

# ─── PAGE TITRE INTÉRIEURE ───────────────────────────────────────────────────
def build_title_page(story):
    """Page de titre intérieure — design édito magazine premium."""
    story.append(Spacer(1, 70 * mm))

    # Eyebrow édition
    eb_t = ParagraphStyle('ti_eb', fontName='Inter-Bold', fontSize=10,
                            textColor=CYAN_DARK, alignment=TA_CENTER, leading=12,
                            spaceAfter=10)
    story.append(Paragraph("·   M É T H O D E   ·   É D I T I O N   2 0 2 6   ·", eb_t))

    # Titre principal XL
    title_style = ParagraphStyle('title_i', fontName='Inter-Black', fontSize=42,
                                  leading=46, textColor=NOIR, alignment=TA_CENTER,
                                  spaceAfter=2)
    story.append(Paragraph("MÉTHODE ATHLÈTE", title_style))
    title_style2 = ParagraphStyle('title_i2', fontName='Inter-Black', fontSize=42,
                                    leading=46, textColor=CYAN_DARK, alignment=TA_CENTER,
                                    spaceAfter=8)
    story.append(Paragraph("COMPLET<font color='#02D1BA'>.</font>", title_style2))

    # Filet décoratif court centré
    from reportlab.platypus import HRFlowable as _HR_t
    story.append(_HR_t(width=32*mm, thickness=1.5, color=CYAN_DARK,
                         spaceBefore=4, spaceAfter=10, hAlign='CENTER'))

    sub_style = ParagraphStyle('sub_i', fontName='Inter-Med', fontSize=13,
                                textColor=GRIS_DARK, alignment=TA_CENTER,
                                spaceAfter=24, leading=18)
    story.append(Paragraph("Vitesse, Force, Explosivité — <b>Tout en un.</b>", sub_style))

    # Mini stats bandeau centré (3 colonnes)
    st_n = ParagraphStyle('ti_stn', fontName='Inter-Black', fontSize=24,
                            textColor=CYAN_DARK, alignment=TA_CENTER, leading=26,
                            spaceAfter=2)
    st_l = ParagraphStyle('ti_stl', fontName='Inter-Bold', fontSize=8,
                            textColor=GRIS_DARK, alignment=TA_CENTER, leading=10)
    st_cells = [
        [Paragraph("14", st_n), Paragraph("CHAPITRES", st_l)],
        [Paragraph("90", st_n), Paragraph("JOURS", st_l)],
        [Paragraph("60", st_n), Paragraph("SÉANCES", st_l)],
    ]
    st_t = Table([st_cells], colWidths=[50*mm, 50*mm, 50*mm])
    st_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEAFTER', (0,0), (-2,0), 0.3, HexColor('#D8D3C5')),
    ]))
    story.append(st_t)
    story.append(Spacer(1, 36 * mm))

    # Signature auteur
    author_style = ParagraphStyle('author_i', fontName='Inter-Black', fontSize=14,
                                   textColor=NOIR, alignment=TA_CENTER, leading=16,
                                   spaceAfter=4)
    story.append(Paragraph("RAYAN BONTE", author_style))
    rb_style = ParagraphStyle('rb_i', fontName='Inter-Bold', fontSize=9,
                               textColor=CYAN_DARK, alignment=TA_CENTER, leading=12)
    story.append(Paragraph("RB Perform &nbsp;·&nbsp; Édition 2026", rb_style))

    story.append(PageBreak())

# ─── PAGE COLOPHON ───────────────────────────────────────────────────────────
def build_colophon(story):
    """Page colophon style 'ours' magazine éditorial."""
    story.append(PdfBookmark(key="mentions-legales", title="Mentions légales", level=0))
    story.append(Spacer(1, 40 * mm))

    # Eyebrow
    eb = ParagraphStyle('eb_col', fontName='Inter-Bold', fontSize=9,
                         textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                         leading=11)
    story.append(Paragraph("·  INFORMATIONS LÉGALES", eb))

    # Titre
    title = ParagraphStyle('t_col', fontName='Inter-Black', fontSize=38,
                            leading=42, textColor=NOIR, alignment=TA_LEFT,
                            spaceAfter=4)
    story.append(Paragraph("MENTIONS LÉGALES<font color='#02D1BA'>.</font>", title))

    # Sous-titre
    sub = ParagraphStyle('s_col', fontName='Inter-Med', fontSize=10.5,
                          leading=13, textColor=GRIS_DARK, alignment=TA_LEFT,
                          spaceAfter=14)
    story.append(Paragraph(
        "MÉTHODE ATHLÈTE COMPLET  ·  Édition 2026  ·  RB Perform", sub))

    from reportlab.platypus import HRFlowable
    story.append(HRFlowable(width="100%", thickness=0.6, color=CYAN_DARK,
                             spaceBefore=0, spaceAfter=12))

    # Fiche éditoriale (style ours magazine — 2 colonnes label / valeur)
    lbl_s = ParagraphStyle('col_lbl', fontName='Inter-Bold', fontSize=8.5,
                             textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                             spaceAfter=2)
    val_s = ParagraphStyle('col_val', fontName='Inter-Med', fontSize=10.5,
                             textColor=NOIR, alignment=TA_LEFT, leading=14)

    fiche = [
        ("DIRECTION ÉDITORIALE", "Rayan Bonte"),
        ("CONCEPTION & RÉDACTION", "Rayan Bonte"),
        ("ÉDITION", "RB Perform"),
        ("FORMAT", "Numérique PDF · A4 portrait"),
        ("TYPOGRAPHIE", "Inter Display (Black / Bold / Medium / Regular)"),
        ("ANNÉE", "2026 · Première édition"),
        ("CONTACT", "Instagram @rb_perform"),
    ]
    for lbl, val in fiche:
        row = Table([[Paragraph(lbl, lbl_s), Paragraph(val, val_s)]],
                    colWidths=[58*mm, 106*mm])
        row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
        ]))
        story.append(row)

    story.append(Spacer(1, 14 * mm))

    # Mentions légales compactes (3 paragraphes)
    leg_lbl = ParagraphStyle('leg_lbl', fontName='Inter-Bold', fontSize=8.5,
                               textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                               leading=11)
    leg_s = ParagraphStyle('leg', fontName='Inter-Reg', fontSize=8.5,
                            leading=12, textColor=GRIS_DARK, alignment=TA_JUSTIFY,
                            spaceAfter=6)
    story.append(Paragraph("·  MENTIONS LÉGALES", leg_lbl))
    story.append(Paragraph(
        "© 2026 Rayan Bonte — RB Perform. Tous droits réservés. Toute "
        "reproduction, intégrale ou partielle, sans l'autorisation expresse "
        "de l'auteur, est interdite.", leg_s))
    story.append(Paragraph(
        "Les informations contenues dans cet ebook sont fournies à titre "
        "éducatif uniquement. Toutes les méthodes présentées sont basées sur "
        "la qualification CQP ALS de l'auteur, son expérience d'athlète et "
        "son contact avec des préparateurs physiques du sport de haut niveau.", leg_s))
    story.append(Paragraph(
        "Avant de commencer ce programme, consulte un médecin si tu as des "
        "antécédents médicaux, des blessures ou des doutes sur ta capacité à "
        "suivre un entraînement intensif.", leg_s))

    story.append(PageBreak())

# ─── PAGE TDM ────────────────────────────────────────────────────────────────
def build_value_page(story):
    """Page valeur — CE QUE TU AS DANS LES MAINS. Pose la valeur perçue avant le sommaire."""
    story.append(PdfBookmark(key="page-valeur", title="Ce que tu as entre les mains", level=0))
    story.append(Spacer(1, 8 * mm))

    eyebrow = ParagraphStyle('vp_eb', fontName='Inter-Bold', fontSize=9,
                              textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                              leading=12)
    story.append(Paragraph("·   M É T H O D E   C O M P L È T E", eyebrow))

    title = ParagraphStyle('vp_t', fontName='Inter-Black', fontSize=42,
                            leading=46, textColor=NOIR, alignment=TA_LEFT, spaceAfter=4)
    story.append(Paragraph("CE QUE TU AS<font color='#02D1BA'>.</font>", title))
    story.append(Paragraph("ENTRE LES MAINS.", ParagraphStyle('vp_t2',
        fontName='Inter-Black', fontSize=42, leading=46, textColor=CYAN_DARK,
        alignment=TA_LEFT, spaceAfter=10)))

    intro = ParagraphStyle('vp_i', fontName='Inter-Med', fontSize=10.5, leading=14,
                            textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=6)
    story.append(Paragraph(
        "Pas un ebook de plus. Une méthode <b>complète, structurée</b>, basée "
        "sur 5 ans d'essais-erreurs que j'ai moi-même réalisés sur le terrain. "
        "Je vais te partager toutes mes connaissances pour te faire gagner un "
        "temps fou.",
        intro))

    # Bandeau stats hero (preuve de densité)
    sh_n = ParagraphStyle('vp_sn', fontName='Inter-Black', fontSize=32,
                            textColor=BLANC, alignment=TA_CENTER, leading=34,
                            spaceAfter=2)
    sh_l = ParagraphStyle('vp_sl', fontName='Inter-Bold', fontSize=8,
                            textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                            leading=11)
    stats = Table([[
        [Paragraph("110", sh_n), Paragraph("PAGES PREMIUM", sh_l)],
        [Paragraph("14", sh_n), Paragraph("CHAPITRES", sh_l)],
        [Paragraph("12", sh_n), Paragraph("RECETTES", sh_l)],
        [Paragraph("90", sh_n), Paragraph("JOURS DE PROGRAMME", sh_l)],
    ]], colWidths=[41*mm, 41*mm, 41*mm, 41*mm])
    stats.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 16),
        ('BOTTOMPADDING', (0,0), (-1,-1), 16),
        ('LINEAFTER', (0,0), (-2,0), 0.5, HexColor('#7DD8C7')),
    ]))
    story.append(stats)
    story.append(Spacer(1, 6 * mm))

    # Liste des composants en grille 2 colonnes
    sec_lbl = ParagraphStyle('vp_sl2', fontName='Inter-Bold', fontSize=9,
                               textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=8,
                               leading=11)
    story.append(Paragraph("·   T O U S   L E S   M O R C E A U X", sec_lbl))

    # Icon Phosphor compact (gauche du numéro pour gagner de la place verticale)
    item_icon = ParagraphStyle('vp_icn', fontName='Phosphor-Fill', fontSize=22,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                                 spaceAfter=0)
    item_n = ParagraphStyle('vp_in', fontName='Inter-Black', fontSize=11,
                              textColor=HexColor('#A8B5C0'), alignment=TA_LEFT,
                              leading=13, spaceAfter=3)
    item_t = ParagraphStyle('vp_it', fontName='Inter-Black', fontSize=10.5,
                              textColor=NOIR, alignment=TA_LEFT, leading=13,
                              spaceAfter=2)
    item_d = ParagraphStyle('vp_id', fontName='Inter-Reg', fontSize=9,
                              textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)

    # items : (numéro, titre, description, bookmark_key cible, icon_unicode)
    items = [
        ("01", "ENTRAÎNEMENT ATHLÉTIQUE",
         "Le spectre force-vitesse. Plyo, sprint, transferts.", "chapter-3",
         chr(0xe730)),  # person-simple-run
        ("02", "ATHLÈTE 90 — PROGRAMME",
         "12 sem · 6 séances/sem · 72 séances. Vidéos exo par exo.", "athlete-90",
         chr(0xe108)),  # calendar
        ("03", "TESTS PHYSIQUES",
         "5 tests baseline pour mesurer ta progression.", "chapter-4",
         chr(0xe492)),  # timer
        ("04", "NUTRITION ATHLÈTE",
         "Macros, timing, hydratation, électrolytes.", "chapter-7",
         chr(0xeaa4)),  # bowl-food
        ("05", "12 RECETTES",
         "Petit-déj, collations, plats. Macros calculés.", "chapter-7",
         chr(0xe516)),  # apple-logo
        ("06", "5 COMPLÉMENTS",
         "Décortiqués : dosage, timing, ce qui marche vs surcoté.", "chapter-8",
         chr(0xe700)),  # pill
        ("07", "MOBILITÉ & RÉCUP",
         "Protocoles sommeil, étirements, retour au calme.", "chapter-9",
         chr(0xed5c)),  # person-simple-tai-chi
        ("08", "MINDSET & FAQ",
         "Habitudes, motivation, troubleshooting concret.", "chapter-11",
         chr(0xe74e)),  # brain
    ]
    rows = []
    for i in range(0, len(items), 2):
        row_cells = []
        for j in range(2):
            n, ttl, ds, key, ico = items[i+j]
            link = f"#{key}"
            row_cells.append([
                Paragraph(f"<link href='{link}'>{n}</link>", item_n),
                Paragraph(f"<link href='{link}'>{ttl}</link>", item_t),
                Paragraph(ds, item_d),
            ])
        rows.append(row_cells)
    grid = Table(rows, colWidths=[82*mm, 82*mm])
    grid.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, HexColor('#C5C0B5')),
    ]))
    story.append(grid)

    story.append(PageBreak())


def build_bonus_echauffement_page(story):
    """Page bonus — Échauffement type universel à faire avant chaque séance."""
    story.append(NextPageTemplate('light_full'))
    story.append(PageBreak())
    story.append(PdfBookmark(key="bonus-echauffement", title="Bonus · Échauffement type", level=0))
    story.append(Spacer(1, 8 * mm))

    eb = ParagraphStyle('be_eb', fontName='Inter-Bold', fontSize=9,
                          textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                          leading=12)
    story.append(Paragraph("·   B O N U S   ·   À   FA I R E   AV A N T   C H A Q U E   S É A N C E", eb))

    t1 = ParagraphStyle('be_t', fontName='Inter-Black', fontSize=38,
                          leading=42, textColor=NOIR, alignment=TA_LEFT, spaceAfter=2)
    story.append(Paragraph("ÉCHAUFFEMENT<font color='#02D1BA'>.</font>", t1))
    story.append(Paragraph("TYPE.", ParagraphStyle('be_t2',
        fontName='Inter-Black', fontSize=38, leading=42, textColor=CYAN_DARK,
        alignment=TA_LEFT, spaceAfter=10)))

    intro = ParagraphStyle('be_i', fontName='Inter-Med', fontSize=11, leading=16,
                            textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=10)
    story.append(Paragraph(
        "Tu skip pas. Jamais. 8-12 minutes qui te coûtent 0 et qui te font "
        "gagner 20 % de perf + divisent ton risque de blessure.",
        intro))

    sec_lbl = ParagraphStyle('be_sl', fontName='Inter-Bold', fontSize=9,
                               textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=4,
                               leading=11)
    item_icon = ParagraphStyle('be_icn', fontName='Phosphor-Fill', fontSize=24,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=26,
                                 spaceAfter=2)
    item_n = ParagraphStyle('be_n', fontName='Inter-Black', fontSize=18,
                              textColor=HexColor('#A8B5C0'), alignment=TA_LEFT,
                              leading=20, spaceAfter=2)
    item_t = ParagraphStyle('be_it', fontName='Inter-Black', fontSize=11,
                              textColor=NOIR, alignment=TA_LEFT, leading=14,
                              spaceAfter=2)
    item_d = ParagraphStyle('be_id', fontName='Inter-Reg', fontSize=10,
                              textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)

    steps = [
        ("01", "MONTÉE CARDIO  ·  3 min",
         "Vélo, rameur, corde à sauter ou marche rapide. Le but : monter la FC progressivement (vers 130-140), augmenter la température corporelle. Pas de sueur perlée, juste tiède.",
         chr(0xe0d6)),  # bicycle
        ("02", "MOBILITÉ ARTICULAIRE  ·  3 min",
         "CARs articulaires (rotations contrôlées) : épaules, hanches, chevilles, poignets. 5 rotations de chaque côté. Lent et amplitude max.",
         chr(0xe094)),  # arrows-clockwise
        ("03", "ACTIVATION DYNAMIQUE  ·  2 min",
         "Selon la séance : Bas du corps → Goblet squat × 8 + hip bridge × 10 + fentes × 6/jambe. Haut du corps → Pompes × 8 + tractions assistées × 5 + face pull bandes × 12.",
         chr(0xe2de)),  # lightning
        ("04", "RAMPES DU PREMIER EXO  ·  2-4 min",
         "Sur ton premier exo lourd (squat, bench, etc.) : 50 % × 8 → 70 % × 5 → 85 % × 3 → charge de travail. Tu réveilles le pattern + le système nerveux.",
         chr(0xe156)),  # chart-line-up
    ]
    rows = []
    for i in range(0, len(steps), 2):
        row_cells = []
        for j in range(2):
            n, ttl, ds, ico = steps[i+j]
            row_cells.append([Paragraph(n, item_n),
                               Paragraph(ttl, item_t),
                               Paragraph(ds, item_d)])
        rows.append(row_cells)
    grid = Table(rows, colWidths=[82*mm, 82*mm])
    grid.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, HexColor('#C5C0B5')),
    ]))
    story.append(grid)

    # Note finale
    story.append(Spacer(1, 8*mm))
    note_s = ParagraphStyle('be_note', fontName='Inter-Med', fontSize=10, leading=14,
                              textColor=NOIR, alignment=TA_LEFT,
                              leftIndent=12, rightIndent=12,
                              backColor=HexColor('#EEF9F7'),
                              borderPadding=(10, 14, 10, 14))
    story.append(Paragraph(
        "<b><font color='#00A38F'>RÈGLE.</font></b>  Tu refuses cet échauffement, "
        "tu refuses 80 % de tes adaptations. Et tu prends 4× plus de risques "
        "de te claquer. C'est l'un des trucs les plus rentables que tu fasses dans ta journée.",
        note_s))


def build_bonus_tracker_page(story):
    """Page bonus — Tracker vierge imprimable pour suivre les charges."""
    story.append(NextPageTemplate('light_full'))
    story.append(PageBreak())
    story.append(PdfBookmark(key="bonus-tracker", title="Bonus · Tracker vierge", level=0))
    story.append(Spacer(1, 8 * mm))

    eb = ParagraphStyle('bt_eb', fontName='Inter-Bold', fontSize=9,
                          textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                          leading=12)
    story.append(Paragraph("·   B O N U S   ·   I M P R I M E   E T   N O T E", eb))

    t1 = ParagraphStyle('bt_t', fontName='Inter-Black', fontSize=38,
                          leading=42, textColor=NOIR, alignment=TA_LEFT, spaceAfter=2)
    story.append(Paragraph("TRACKER<font color='#02D1BA'>.</font>", t1))
    story.append(Paragraph("VIERGE.", ParagraphStyle('bt_t2',
        fontName='Inter-Black', fontSize=38, leading=42, textColor=CYAN_DARK,
        alignment=TA_LEFT, spaceAfter=8)))

    intro = ParagraphStyle('bt_i', fontName='Inter-Reg', fontSize=10.5, leading=15,
                            textColor=NOIR, alignment=TA_LEFT, spaceAfter=10)
    story.append(Paragraph(
        "Imprime cette page. Une ligne par séance. Tu notes ce que tu fais — "
        "charges, RPE, sensations. <b>Tu progresses pas si tu mesures pas.</b>",
        intro))

    # Tableau tracker — 14 lignes vides
    th = ParagraphStyle('bt_th', fontName='Inter-Bold', fontSize=8.5,
                          textColor=BLANC, alignment=TA_CENTER, leading=10)
    td = ParagraphStyle('bt_td', fontName='Inter-Reg', fontSize=8.5,
                          textColor=GRIS_DARK, alignment=TA_LEFT, leading=11)

    rows = [[Paragraph("DATE", th), Paragraph("SÉANCE", th),
             Paragraph("EXO PRINCIPAL", th), Paragraph("SÉRIES × REPS", th),
             Paragraph("CHARGE", th), Paragraph("RPE", th),
             Paragraph("NOTES / SENSATION", th)]]
    for _ in range(14):
        rows.append([Paragraph("&nbsp;", td)] * 7)

    tt = Table(rows, colWidths=[16*mm, 22*mm, 32*mm, 22*mm, 18*mm, 14*mm, 40*mm])
    tt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), CYAN_DARK),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, HexColor('#D8D3C5')),
        ('LINEAFTER', (0,0), (-2,-1), 0.3, HexColor('#E8E4D8')),
    ]))
    story.append(tt)

    # Mini légende RPE
    story.append(Spacer(1, 6*mm))
    leg_s = ParagraphStyle('bt_leg', fontName='Inter-Med', fontSize=9,
                             textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
    story.append(Paragraph(
        "<b>RPE (Rate of Perceived Exertion)</b> — 1 = ridicule · "
        "5 = correct · 7 = ça tape · 8 = ça pique · 9 = très dur (1 rep en réserve) · 10 = max",
        leg_s))


def build_bonus_stack_page(story):
    """Page bonus — Stack matériel recommandé selon niveau."""
    story.append(NextPageTemplate('light_full'))
    story.append(PageBreak())
    story.append(PdfBookmark(key="bonus-stack", title="Bonus · Stack matériel", level=0))
    story.append(Spacer(1, 8 * mm))

    eb = ParagraphStyle('bs_eb', fontName='Inter-Bold', fontSize=9,
                          textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                          leading=12)
    story.append(Paragraph("·   B O N U S   ·   T O N   S E T U P   I D É A L", eb))

    t1 = ParagraphStyle('bs_t', fontName='Inter-Black', fontSize=38,
                          leading=42, textColor=NOIR, alignment=TA_LEFT, spaceAfter=2)
    story.append(Paragraph("STACK<font color='#02D1BA'>.</font>", t1))
    story.append(Paragraph("MATÉRIEL.", ParagraphStyle('bs_t2',
        fontName='Inter-Black', fontSize=38, leading=42, textColor=CYAN_DARK,
        alignment=TA_LEFT, spaceAfter=10)))

    intro = ParagraphStyle('bs_i', fontName='Inter-Med', fontSize=11, leading=16,
                            textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=10)
    story.append(Paragraph(
        "Le matos te coûtera moins cher qu'1 an d'abonnement à une salle "
        "moyenne. Et tu pourras t'entraîner peu importe l'heure, le lieu, l'humeur.",
        intro))

    # 3 colonnes : MINIMUM / CONFORT / PRO
    h_icn = ParagraphStyle('bs_icn', fontName='Phosphor-Fill', fontSize=28,
                             textColor=CYAN_DARK, alignment=TA_CENTER, leading=30,
                             spaceAfter=4)
    h_s = ParagraphStyle('bs_h', fontName='Inter-Black', fontSize=14,
                           textColor=NOIR, alignment=TA_CENTER, leading=16,
                           spaceAfter=4)
    h_p = ParagraphStyle('bs_hp', fontName='Inter-Bold', fontSize=10,
                           textColor=CYAN_DARK, alignment=TA_CENTER,
                           leading=12)
    item_s = ParagraphStyle('bs_it', fontName='Inter-Reg', fontSize=9.5,
                              textColor=NOIR, alignment=TA_LEFT, leading=14,
                              spaceAfter=2)

    minimum_items = [
        "→ Barre olympique 20 kg",
        "→ Disques 2 × 20 kg + 2 × 10 kg + 2 × 5 kg + 2 × 2,5 kg",
        "→ Banc de musculation simple",
        "→ Cage / rack (sinon supports de squat solides)",
        "→ Tapis ou sol antichoc",
        "→ Chrono (téléphone OK)",
        "→ Cahier ou Notes pour tracker",
    ]
    confort_items = [
        "→ Tout le minimum +",
        "→ Disques 2 × 25 kg supplémentaires",
        "→ Bandes élastiques (résistance variable)",
        "→ Plio box (40 / 50 / 60 cm)",
        "→ Médecine ball (8-10 kg)",
        "→ Haltères ajustables (paire 2-30 kg)",
        "→ Rameur ou vélo (cardio à domicile)",
        "→ Montre cardio (FC + récup)",
    ]
    pro_items = [
        "→ Tout le confort +",
        "→ Disques 2 × 25 kg additionnels",
        "→ Power rack complet",
        "→ Câble haute / basse (poulie ajustable)",
        "→ Hex bar / Trap bar (soulevé alternatif)",
        "→ Belt squat (charge sans compression colonne)",
        "→ Sled / Prowler (push/pull cardio puissance)",
        "→ Capteur Vmax type Vitruve (suivi vitesse barre)",
    ]

    col_min = [Paragraph(chr(0xe0b6), h_icn),  # barbell
                Paragraph("MINIMUM", h_s), Paragraph("À partir de 400 €", h_p),
                Spacer(1, 4*mm)] + [Paragraph(t, item_s) for t in minimum_items]
    col_conf = [Paragraph(chr(0xe320), h_icn),  # medal
                 Paragraph("CONFORT", h_s), Paragraph("À partir de 900 €", h_p),
                 Spacer(1, 4*mm)] + [Paragraph(t, item_s) for t in confort_items]
    col_pro = [Paragraph(chr(0xe614), h_icn),  # crown
                Paragraph("PRO", h_s), Paragraph("À partir de 2000 €", h_p),
                Spacer(1, 4*mm)] + [Paragraph(t, item_s) for t in pro_items]

    cols = Table([[col_min, col_conf, col_pro]],
                  colWidths=[55*mm, 55*mm, 54*mm])
    cols.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('LINEAFTER', (0,0), (-2,-1), 0.5, HexColor('#C5C0B5')),
        # Header background sur les 2 premières lignes (titre + sous-titre + spacer)
        ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
    ]))
    story.append(cols)

    # Note finale
    story.append(Spacer(1, 8*mm))
    note_s = ParagraphStyle('bs_note', fontName='Inter-Med', fontSize=10, leading=14,
                              textColor=NOIR, alignment=TA_LEFT,
                              leftIndent=12, rightIndent=12,
                              backColor=HexColor('#EEF9F7'),
                              borderPadding=(10, 14, 10, 14))
    story.append(Paragraph(
        "<b><font color='#00A38F'>ASTUCE.</font></b>  Tu peux faire 90 % du "
        "programme avec uniquement le setup MINIMUM. Charge pas avant d'avoir besoin. "
        "L'argent dans le matos est mieux investi quand tu sais déjà ce qui te manque.",
        note_s))


def build_back_cover(story):
    """4ème de couverture — page dark fermeture premium avec slogan + signature."""
    story.append(NextPageTemplate('cover'))
    story.append(PageBreak())

    # Push contenu vers le centre
    story.append(Spacer(1, 78 * mm))

    eyebrow = ParagraphStyle('bc_eb', fontName='Inter-Bold', fontSize=10,
                              textColor=CYAN, alignment=TA_CENTER, spaceAfter=18,
                              leading=12)
    story.append(Paragraph("·   M É T H O D E   R B   P E R F O R M   ·", eyebrow))

    # Slogan principal
    sl1 = ParagraphStyle('bc_s1', fontName='Inter-Black', fontSize=36, leading=42,
                          textColor=BLANC, alignment=TA_CENTER, spaceAfter=0)
    sl2 = ParagraphStyle('bc_s2', fontName='Inter-Black', fontSize=36, leading=42,
                          textColor=CYAN, alignment=TA_CENTER, spaceAfter=14)
    story.append(Paragraph("TU AS LA MÉTHODE.", sl1))
    story.append(Paragraph("FAIS LE BOULOT.", sl2))

    # Filet
    from reportlab.platypus import HRFlowable
    story.append(HRFlowable(width=40*mm, thickness=1.5, color=CYAN,
                              spaceBefore=4, spaceAfter=18, hAlign='CENTER'))

    # Sous-texte
    sub = ParagraphStyle('bc_sub', fontName='Inter-Med', fontSize=12, leading=18,
                          textColor=HexColor('#EEF9F7'), alignment=TA_CENTER,
                          leftIndent=24, rightIndent=24, spaceAfter=24)
    story.append(Paragraph(
        "Le terrain ne reconnaît pas les intentions. Que les actes.",
        sub))

    # Footer triple : signature · contact · marque
    sig_a = ParagraphStyle('bc_sa', fontName='Inter-Black', fontSize=10,
                            textColor=BLANC, alignment=TA_CENTER, leading=14,
                            spaceAfter=2)
    sig_b = ParagraphStyle('bc_sb', fontName='Inter-Bold', fontSize=8.5,
                            textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                            leading=11)
    story.append(Spacer(1, 18 * mm))
    story.append(Paragraph("RAYAN BONTE", sig_a))
    story.append(Paragraph("Fondateur · RB Perform", sig_b))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("@rb_perform &nbsp;·&nbsp; rb-perform.com", sig_b))


def build_toc(story, chapters):
    """Table des matières — design éditorial premium avec parties en hero romain.
    Inclut numéros de page + liens cliquables vers bookmarks PDF des chapitres/parties."""
    # Bookmark sur le sommaire (cible centrale pour retour rapide)
    story.append(PdfBookmark(key="sommaire", title="Sommaire", level=0))
    story.append(Spacer(1, 14 * mm))

    eyebrow = ParagraphStyle('eb_toc', fontName='Inter-Bold', fontSize=9,
                              textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                              leading=12)
    story.append(Paragraph("RB PERFORM  ·  ÉDITION 2026", eyebrow))

    title = ParagraphStyle('t_toc', fontName='Inter-Black', fontSize=52,
                            leading=56, textColor=NOIR, alignment=TA_LEFT, spaceAfter=4)
    story.append(Paragraph("SOMMAIRE<font color='#02D1BA'>.</font>", title))

    sub = ParagraphStyle('s_toc', fontName='Inter-Med', fontSize=10.5, leading=13,
                          textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=10)
    story.append(Paragraph(
        "Trois parties &nbsp;·&nbsp; Quatorze chapitres &nbsp;·&nbsp; ATHLÈTE 90 — Programme 12 semaines",
        sub))

    parts = {
        1: ("I", "COMPRENDRE.", "Pose les fondations mentales et techniques.", 8),
        4: ("II", "S'ENTRAÎNER.", "Le programme, la nutrition, les compléments.", 29),
        9: ("III", "RÉCUPÉRER.", "Mobilité, sommeil, mental, durer toute la saison.", 81),
    }

    # Mapping num chapitre → page (cover dark) — shift +1 après ajout page Édito Rayan
    chapter_pages = {
        1: 9, 2: 15, 3: 20,
        4: 30, 5: 34, 6: 38, 7: 50, 8: 69,
        9: 82, 10: 87, 11: 92, 12: 97, 13: 102, 14: 106,
    }

    # Harmonisation casse + nettoyage titres
    title_overrides = {
        6: "ATHLÈTE 90 — Programme",
        8: "Compléments alimentaires",
        12: "FAQ & Troubleshooting",
    }

    part_roman_style = ParagraphStyle('toc_pr', fontName='Inter-Black', fontSize=20,
                                        textColor=CYAN_DARK, alignment=TA_LEFT,
                                        leading=22, spaceAfter=0)
    part_eb_style = ParagraphStyle('toc_pe', fontName='Inter-Black', fontSize=11,
                                     textColor=CYAN_DARK, alignment=TA_LEFT,
                                     spaceAfter=3, leading=13)
    part_t_style = ParagraphStyle('toc_pt', fontName='Inter-Black', fontSize=18,
                                    textColor=NOIR, alignment=TA_LEFT,
                                    spaceAfter=2, leading=20)
    part_d_style = ParagraphStyle('toc_pd', fontName='Inter-Reg', fontSize=9.5,
                                    textColor=GRIS_DARK, alignment=TA_LEFT,
                                    spaceAfter=0, leading=12)
    part_pg_style = ParagraphStyle('toc_ppg', fontName='Inter-Bold', fontSize=10,
                                     textColor=CYAN_DARK, alignment=TA_RIGHT,
                                     leading=14)

    toc_num_style = ParagraphStyle('toc_n', fontName='Inter-Black', fontSize=11,
                                     textColor=CYAN_DARK, alignment=TA_LEFT, leading=15)
    toc_text_style = ParagraphStyle('toc_t', fontName='Inter-Med', fontSize=10.5,
                                      textColor=NOIR, alignment=TA_LEFT, leading=15)
    toc_pg_style = ParagraphStyle('toc_pg', fontName='Inter-Bold', fontSize=10,
                                    textColor=GRIS_DARK, alignment=TA_RIGHT, leading=15)
    toc_dot_style = ParagraphStyle('toc_dot', fontName='Inter-Reg', fontSize=8,
                                     textColor=HexColor('#C5C0B5'), alignment=TA_LEFT,
                                     leading=15)

    # Style icon TOC (mini Phosphor à côté de chaque ligne)
    toc_icon_style = ParagraphStyle('toc_icn', fontName='Phosphor-Fill', fontSize=14,
                                       textColor=CYAN_DARK, alignment=TA_CENTER, leading=16)

    for i, ch in enumerate(chapters, 1):
        if i in parts:
            roman, part_t, part_d, part_pg = parts[i]
            # Wrap chaque cellule dans un lien vers le bookmark "partie-X"
            part_link = f"#partie-{roman}"
            roman_cell = Paragraph(
                f"<link href='{part_link}'>{roman}</link>", part_roman_style)
            text_cell = [
                Paragraph(
                    f"<link href='{part_link}'>PARTIE {roman}</link>", part_eb_style),
                Paragraph(
                    f"<link href='{part_link}'>{part_t}</link>", part_t_style),
                Paragraph(part_d, part_d_style),
            ]
            pg_cell = Paragraph(
                f"<link href='{part_link}'>p.{part_pg:02d}</link>", part_pg_style)
            head_row = Table([[roman_cell, text_cell, pg_cell]],
                             colWidths=[14*mm, 132*mm, 18*mm])
            head_row.setStyle(TableStyle([
                ('VALIGN', (0,0), (1,0), 'MIDDLE'),
                ('VALIGN', (2,0), (2,0), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 9),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('LINEABOVE', (0,0), (-1,0), 0.4, HexColor('#D8D3C5')),
            ]))
            story.append(head_row)

        # Titre harmonisé + page chapitre + lien interne vers bookmark chapter-i
        ch_title = title_overrides.get(i, ch)
        ch_page = chapter_pages.get(i)
        chap_link = f"#chapter-{i}"
        row = [
            Paragraph(
                f"<link href='{chap_link}'>{i:02d}</link>", toc_num_style),
            Paragraph(
                f"<link href='{chap_link}'>{ch_title}</link>", toc_text_style),
            Paragraph(
                f"<link href='{chap_link}'>p.{ch_page:02d}</link>" if ch_page else "",
                toc_pg_style),
        ]
        t = Table([row], colWidths=[14*mm, 131*mm, 19*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LINEBELOW', (0,0), (-1,0), 0.2, HexColor('#E8E4D8')),
        ]))
        story.append(t)

    # Pas de PageBreak ici : le ChapterSeparator du chapitre 1 fera le saut
    # en switchant vers 'dark', évitant une page vide intermédiaire.


def build_how_to_use_page(story):
    """Page 'Comment utiliser cette méthode' — guide d'orientation lecteur."""
    story.append(NextPageTemplate('light_full'))
    story.append(PageBreak())
    # Bookmark de la page
    story.append(PdfBookmark(
        key="how-to-use", title="Comment utiliser cette méthode", level=0))
    story.append(Spacer(1, 14 * mm))

    eyebrow = ParagraphStyle('htu_eb', fontName='Inter-Bold', fontSize=9,
                              textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                              leading=12)
    story.append(Paragraph("·   M O D E   D ' E M P L O I", eyebrow))

    t1 = ParagraphStyle('htu_t', fontName='Inter-Black', fontSize=42,
                          leading=46, textColor=NOIR, alignment=TA_LEFT, spaceAfter=2)
    story.append(Paragraph("COMMENT UTILISER<font color='#02D1BA'>.</font>", t1))
    story.append(Paragraph("CETTE MÉTHODE.", ParagraphStyle('htu_t2',
        fontName='Inter-Black', fontSize=42, leading=46, textColor=CYAN_DARK,
        alignment=TA_LEFT, spaceAfter=12)))

    intro = ParagraphStyle('htu_i', fontName='Inter-Med', fontSize=11, leading=16,
                            textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=10)
    story.append(Paragraph(
        "Cette méthode est faite pour être <b>utilisée, pas juste lue</b>. "
        "Voici comment l'exploiter à fond.",
        intro))

    # 4 étapes / conseils en grille 2x2
    step_n = ParagraphStyle('htu_n', fontName='Inter-Black', fontSize=24,
                              textColor=CYAN_DARK, alignment=TA_LEFT, leading=26,
                              spaceAfter=2)
    step_t = ParagraphStyle('htu_st', fontName='Inter-Black', fontSize=12,
                              textColor=NOIR, alignment=TA_LEFT, leading=14,
                              spaceAfter=4)
    step_d = ParagraphStyle('htu_sd', fontName='Inter-Reg', fontSize=10,
                              textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)

    steps = [
        ("01", "LIS DANS L'ORDRE",
         "Les 14 chapitres sont structurés pour construire ta compréhension "
         "étape par étape. Commence par "
         "<link href='#chapter-1'><font color='#00A38F'><b>l'Intro</b></font></link>, "
         "termine par les <link href='#chapter-14'><font color='#00A38F'><b>Annexes</b></font></link>.",
         chr(0xe0e2)),  # book
        ("02", "TESTE-TOI EN PREMIER",
         "Avant tout entraînement, fais les 5 tests baseline du "
         "<link href='#chapter-4'><font color='#00A38F'><b>chapitre Tests physiques</b></font></link>. "
         "C'est ton point de départ mesurable.",
         chr(0xe492)),  # timer
        ("03", "ATTAQUE LE PROGRAMME",
         "Une fois tes tests J0 notés, lance "
         "<link href='#athlete-90'><font color='#00A38F'><b>ATHLÈTE 90</b></font></link> "
         "— 12 semaines, 6 séances/sem (4 muscu + 2 course). Va à "
         "l'<link href='#index-seances'><font color='#00A38F'><b>index séances</b></font></link> "
         "pour naviguer vite.",
         chr(0xe2de)),  # lightning
        ("04", "REVIENS AUX CHAPITRES",
         "Pendant le programme, reviens consulter "
         "<link href='#chapter-7'><font color='#00A38F'><b>Nutrition</b></font></link>, "
         "<link href='#chapter-10'><font color='#00A38F'><b>Récup</b></font></link>, "
         "<link href='#chapter-11'><font color='#00A38F'><b>Mindset</b></font></link>. "
         "Ces chapitres sont tes outils — pas une lecture unique.",
         chr(0xe094)),  # arrows-clockwise
    ]
    step_icon = ParagraphStyle('htu_icn', fontName='Phosphor-Fill', fontSize=24,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=26,
                                 spaceAfter=2)
    rows = []
    for i in range(0, len(steps), 2):
        row_cells = []
        for j in range(2):
            n, ttl, ds, ico = steps[i+j]
            row_cells.append([Paragraph(n, step_n),
                               Paragraph(ttl, step_t),
                               Paragraph(ds, step_d)])
        rows.append(row_cells)
    grid = Table(rows, colWidths=[82*mm, 82*mm])
    grid.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, HexColor('#C5C0B5')),
    ]))
    story.append(grid)

    # Note finale : navigation interactive
    story.append(Spacer(1, 10 * mm))
    note_s = ParagraphStyle('htu_note', fontName='Inter-Med', fontSize=10, leading=14,
                              textColor=NOIR, alignment=TA_LEFT,
                              leftIndent=12, rightIndent=12,
                              backColor=HexColor('#EEF9F7'),
                              borderPadding=(10, 14, 10, 14))
    story.append(Paragraph(
        "<b><font color='#00A38F'>PDF 100 % INTERACTIF.</font></b> &nbsp; "
        "Tous les <font color='#00A38F'><b>termes en cyan</b></font> sont "
        "cliquables vers leur chapitre. Le footer <b>↑ SOMMAIRE</b> de chaque "
        "page te ramène au sommaire en 1 clic. L'outline du reader PDF te donne "
        "la navigation complète.",
        note_s))


def build_edito_rayan_page(story):
    """Page Édito Rayan — manifeste personnel d'ouverture, ton ADN brut."""
    story.append(NextPageTemplate('light_full'))
    story.append(PageBreak())
    story.append(PdfBookmark(key="edito-rayan", title="Édito — Mot de Rayan", level=0))
    story.append(Spacer(1, 14 * mm))

    eyebrow = ParagraphStyle('ed_eb', fontName='Inter-Bold', fontSize=9,
                              textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=6,
                              leading=12)
    story.append(Paragraph("·   É D I T O   ·   M O T   D E   R AY A N", eyebrow))

    t1 = ParagraphStyle('ed_t', fontName='Inter-Black', fontSize=42,
                          leading=46, textColor=NOIR, alignment=TA_LEFT, spaceAfter=2)
    story.append(Paragraph("PARLONS<font color='#02D1BA'>.</font>", t1))
    story.append(Paragraph("DEUX MINUTES.", ParagraphStyle('ed_t2',
        fontName='Inter-Black', fontSize=42, leading=46, textColor=CYAN_DARK,
        alignment=TA_LEFT, spaceAfter=12)))

    body = ParagraphStyle('ed_b', fontName='Inter-Reg', fontSize=11.5,
                            textColor=NOIR, alignment=TA_JUSTIFY, leading=18,
                            spaceAfter=10)
    body_lead = ParagraphStyle('ed_bl', fontName='Inter-Med', fontSize=13,
                                 textColor=NOIR, alignment=TA_LEFT, leading=20,
                                 spaceAfter=14)

    story.append(Paragraph(
        "Si t'as ouvert ce PDF, c'est que t'as choisi de pas rester "
        "au même niveau. <b>Respect.</b>",
        body_lead))

    story.append(Paragraph(
        "Je suis Rayan. Je joue en semi-pro à Avignon en rugby XIII, et "
        "depuis 5 ans je teste, j'optimise, j'ajuste tout ce qui touche à "
        "la prépa athlétique. Tout ce que tu vas lire ici, je l'ai "
        "testé sur moi en premier. Pas de théorie copiée. Pas de "
        "marketing US. Du vrai. Ce qui marche sur le terrain.",
        body))

    story.append(Paragraph(
        "Cette méthode, c'est pas un livre que tu lis en diagonale en "
        "vacances. C'est un <b>outil</b>. Tu l'utilises. Tu y reviens. "
        "Tu y prends ce dont tu as besoin quand tu en as besoin.",
        body))

    story.append(Paragraph(
        "Je vais pas te promettre que tu vas tout changer en 90 jours. "
        "Je vais te promettre une seule chose : si tu fais ce qu'il y a "
        "dedans — vraiment, pas à moitié — tu seras <b>un athlète "
        "différent à la fin</b>. Plus rapide, plus fort, plus dur à "
        "casser. C'est tout ce qui compte.",
        body))

    story.append(Paragraph(
        "Le reste, c'est toi qui le fais.",
        body))

    # ── Passage personnel : ce que cet ebook représente pour moi ──
    story.append(Paragraph(
        "<b>Écrire cet ebook compte pour moi.</b> Je suis un réel passionné "
        "de sport qui vit pour ça. Le sport m'a tout donné — et je lui "
        "donnerai tout. Alors si mes vidéos t'inspirent, si mon mindset "
        "t'inspire, si j'arrive à te motiver, à te faire bouger : j'ai "
        "tout gagné. Il n'y a rien de plus beau.",
        body))

    story.append(Paragraph(
        "<b>La souffrance sportive, les baisses d'envie, la fatigue — je "
        "les connais.</b> Je suis conscient de chaque effort que je te "
        "demande dans ce livre. Je ne suis pas un prépa qui connaît "
        "que la théorie. Je vis le sport. Je vis les efforts.",
        body))

    story.append(Paragraph(
        "Pendant que tu t'entraînes et que tu enchaînes ces séances, "
        "mets-toi une chose dans un coin de la tête : au moment où tu "
        "t'entraînes, je suis probablement sous une barre, sur une "
        "piste ou au stade en train de transpirer. Je ne compte pas "
        "mes heures. Je vais tout donner pour te motiver et faire au "
        "mieux pour que tu deviennes une <b>vraie machine de guerre</b>, "
        "que tu réalises tes rêves les plus grands.",
        body))

    story.append(Paragraph(
        "Car quand on se prouve quelque chose, quand on réussit "
        "quelque chose, on casse toutes les barrières. Plus rien "
        "n'est impossible. C'est ce que je souhaite que tu retiennes : "
        "<b>tout travail est récompensé un jour ou l'autre</b>, peu "
        "importe le temps que ça prend. Le sport, c'est comme la vie. "
        "On n'est pas tous égaux. Mais si tu travailles et que tu ne "
        "t'arrêtes jamais, <b>tu finiras par être récompensé.</b>",
        body))

    # Signature
    story.append(Spacer(1, 14 * mm))
    from reportlab.platypus import HRFlowable as _HR_ed
    story.append(_HR_ed(width=40 * mm, thickness=1, color=CYAN_DARK,
                          spaceBefore=0, spaceAfter=6, hAlign='LEFT'))
    sig_n = ParagraphStyle('ed_sn', fontName='Inter-Black', fontSize=22,
                             textColor=NOIR, alignment=TA_LEFT, leading=26,
                             spaceAfter=2)
    story.append(Paragraph("Rayan Bonte.", sig_n))
    sig_a = ParagraphStyle('ed_sa', fontName='Inter-Med', fontSize=9.5,
                             textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
    story.append(Paragraph("RB Perform &nbsp;·&nbsp; Édition 2026", sig_a))


# ─── BUILD ───────────────────────────────────────────────────────────────────
def _a_retenir(items, title="À RETENIR"):
    """Encadré 'À RETENIR' premium cyan dark — 3-5 takeaways en fin de chapitre.

    Items : list of strings (1 ligne max chacune)."""
    lbl_s = ParagraphStyle('ar_lbl', fontName='Inter-Bold', fontSize=9,
                             textColor=HexColor('#A8E5DC'), alignment=TA_LEFT,
                             leading=11, spaceAfter=6)
    item_s = ParagraphStyle('ar_it', fontName='Inter-Med', fontSize=10.5,
                              textColor=BLANC, alignment=TA_LEFT, leading=15,
                              leftIndent=14, spaceAfter=4)
    cells = [Paragraph(f"·  {title}", lbl_s)]
    for it in items:
        cells.append(Paragraph(
            f"<font color='#02D1BA'>→</font> &nbsp; {it}", item_s))
    t = Table([[cells]], colWidths=[164*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ]))
    return t


def build_ebook():
    print("Parsing Word source...")
    elements = parse_word(WORD_SOURCE)

    chapters = [text for type_, text in elements if type_ == 'h1']
    print(f"Found {len(chapters)} chapters, {len(elements)} elements total")

    print("Creating PDF document...")

    # Frame pleine largeur (cover, séparateurs, citations)
    full_frame = Frame(MARGIN_INNER, MARGIN_BOTTOM, CONTENT_W,
                       PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
                       id='full', showBoundary=0)
    # Frame étroit pour pages contenu light (texte gauche uniquement)
    text_frame = Frame(MARGIN_INNER, MARGIN_BOTTOM, TEXT_W,
                       PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
                       id='text', showBoundary=0)
    # Frame texte pour pages nutrition avec photo droite pleine hauteur
    nutrition_text_frame = Frame(MARGIN_INNER, MARGIN_BOTTOM, NUT_TEXT_W,
                                  PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
                                  id='nut_text', showBoundary=0)
    # Frame chapitre éditorial : texte centré étroit (~130mm)
    chapter_frame = Frame(CHAPTER_TEXT_X,
                          MARGIN_BOTTOM + 14 * mm,  # au-dessus du filet bas
                          CHAPTER_TEXT_W,
                          PAGE_H - CHAPTER_TEXT_TOP_MARGIN - (MARGIN_BOTTOM + 14*mm),
                          id='chapter', showBoundary=0)

    doc = BaseDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=MARGIN_INNER,
        rightMargin=MARGIN_OUTER,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Athlète Explosif",
        author="Rayan Bonte"
    )

    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[full_frame], onPage=on_cover_page),
        PageTemplate(id='light', frames=[text_frame], onPage=on_light_page),
        PageTemplate(id='light_full', frames=[full_frame], onPage=on_light_full_page),
        PageTemplate(id='dark', frames=[full_frame], onPage=on_dark_page),
        PageTemplate(id='seance', frames=[full_frame], onPage=on_seance_page),
        PageTemplate(id='quote', frames=[full_frame], onPage=on_quote_page),
        PageTemplate(id='nutrition_photo', frames=[nutrition_text_frame],
                     onPage=on_nutrition_photo_page),
        PageTemplate(id='chapter', frames=[chapter_frame], onPage=on_chapter_page),
    ])

    story = []

    # Cover (bascule ensuite vers light_full)
    build_cover(story)

    # Title page (full width)
    build_title_page(story)

    # Colophon (full width)
    build_colophon(story)

    # Page valeur — "CE QUE TU AS DANS LES MAINS"
    build_value_page(story)

    # TDM (full width)
    build_toc(story, chapters)

    # Page "Comment utiliser cette méthode" — guide d'orientation lecteur
    build_how_to_use_page(story)

    # Page Édito — manifeste personnel de Rayan
    build_edito_rayan_page(story)

    # Bascule vers template light (avec visual column) pour le contenu chapitres
    story.append(NextPageTemplate('light_full'))

    # Citations entre chapitres — clés alignées sur la numérotation séquentielle
    # (le chapitre Word #1 "Préambule+Disclaimer" est skippé pour ne pas doublonner le colophon)
    quotes_after_chapter = {
        1: ("L'excellence n'est jamais un accident.", "ARISTOTE"),
        2: ("Je déteste chaque minute de l'entraînement. Mais je me répétais : souffre maintenant, vis le reste de ta vie comme un champion.", "MUHAMMAD ALI"),
        3: ("Tu dois être prêt à faire ce que les autres ne feront jamais.", "USAIN BOLT"),
        5: ("Tu veux une vie différente ? Il faut des habitudes différentes.", ""),
        6: ("Je m'entraîne pendant que les autres dorment.", "CONOR McGREGOR"),
        9: ("Le physique impressionne. La discipline inspire.", ""),
        10: ("Je n'ai jamais perdu. Soit je gagne, soit j'apprends.", "NELSON MANDELA"),
        11: ("Les rêves sans discipline restent des rêves.", "DENZEL WASHINGTON"),
        12: ("Le doute tue plus de rêves que l'échec.", "SUZY KASSEM"),
        13: ("Je ne fuis jamais le travail.", "KOBE BRYANT"),
    }

    def add_quote_page(story, quote, author):
        """Ajoute une page citation pleine page — design édito pur typo."""
        story.append(NextPageTemplate('quote'))
        story.append(PageBreak())
        # Eyebrow décoratif
        story.append(Spacer(1, 78 * mm))
        eb_q = ParagraphStyle('q_eb', fontName='Inter-Bold', fontSize=9,
                                textColor=CYAN, alignment=TA_CENTER,
                                spaceAfter=10)
        story.append(Paragraph("·   C I T A T I O N   ·", eb_q))
        # Citation principale — XL en blanc, italique typo magazine
        quote_style = ParagraphStyle('qp', fontName='Inter-Black', fontSize=24, leading=34,
                                      textColor=BLANC, alignment=TA_CENTER,
                                      leftIndent=18, rightIndent=18, spaceAfter=24)
        story.append(Paragraph(_escape(quote), quote_style))
        # Filet horizontal décoratif (centré, court, cyan)
        from reportlab.platypus import HRFlowable
        story.append(HRFlowable(width=32 * mm, thickness=1.5, color=CYAN,
                                  spaceBefore=4, spaceAfter=14, hAlign='CENTER'))
        if author:
            author_style = ParagraphStyle('qa', fontName='Inter-Bold', fontSize=10,
                                           textColor=CYAN, alignment=TA_CENTER,
                                           leading=14)
            # Espacement entre lettres pour effet "small caps spaced"
            chars = []
            for c in author.upper():
                if c == ' ':
                    chars.append('&nbsp;&nbsp;&nbsp;')
                else:
                    chars.append(c)
            spaced_author = '&nbsp;'.join(chars)
            story.append(Paragraph(spaced_author, author_style))
        story.append(NextPageTemplate('chapter'))

    # Mapping image produit par complément
    COMP_IMG_DIR = ROOT / "Downloads/Compléments-Images-Extraites"

    # Données structurées par complément (design éditorial magazine)
    # Synthèse du PDF source compléments ebbok,force.pdf
    COMPLEMENT_DATA = {
        "whey": {
            "number": "N°01",
            "title": "WHEY",
            "subtitle": "PROTÉINE",
            "tagline": "Forme rapide de protéines, issue du petit-lait.",
            "definition": "Protéine en poudre issue du liquide séparé du lait lors de la fabrication du fromage. Une protéine complète, naturelle, sans risque pour la santé — au même titre que la viande, le poisson ou les œufs.",
            "dosage": "20-30g",
            "dosage_label": "POST-SÉANCE",
            "timing": "1× / JOUR",
            "essential": "OPTIONNEL",
            "benefits": [
                "Assimilation rapide post-entraînement",
                "Facile à utiliser et à transporter",
                "Souvent moins coûteuse que la viande au gramme",
            ],
            "conseil": "Idéale immédiatement après l'entraînement. La quantité dépend de tes apports protéiques totaux sur la journée.",
            "note": "Pas indispensable si ton alimentation couvre tes besoins (viande, poisson, œufs). Un pot chez soi dépanne quand tu manques de temps ou pars en déplacement.",
            "image": "produit-008.png"
        },
        "creatine": {
            "number": "N°02",
            "title": "CRÉATINE",
            "subtitle": "MONOHYDRATE",
            "tagline": "Molécule la plus étudiée du sport. Plus de force, plus de séries.",
            "definition": "Molécule présente en faible quantité dans la viande et le poisson. Dans le muscle, elle se transforme en phosphocréatine — un réservoir d'énergie immédiate pour les efforts courts et intenses (sprints, séries lourdes).",
            "dosage": "3-10g",
            "dosage_label": "SELON POIDS",
            "timing": "1× / JOUR",
            "essential": "NON-NÉGOCIABLE",
            "benefits": [
                "Performance sur les efforts maximaux",
                "Maintien d'efforts intenses plus longtemps",
                "Hydratation cellulaire & synthèse protéique",
                "Gain de force et de masse musculaire",
            ],
            "conseil": "Toute l'année, 3 à 10 g par jour selon ta masse musculaire. À prendre avec des glucides (banane, riz) pour optimiser l'absorption. Pas besoin de phase de charge.",
            "note": "Mécanisme : Créatine → Phosphocréatine → énergie rapide → gain de puissance et masse musculaire.",
            "image": "produit-014.png"
        },
        "omega": {
            "number": "N°03",
            "title": "OMÉGA-3",
            "subtitle": "",
            "tagline": "Acides gras essentiels — cœur, cerveau, récupération.",
            "definition": "Aussi appelés huiles de poisson, composés principalement d'EPA et de DHA. Anti-inflammatoires, ils favorisent la récupération musculaire, la synthèse des protéines, et réduisent les risques cardiovasculaires.",
            "dosage": "2-3g",
            "dosage_label": "PAR JOUR",
            "timing": "AU REPAS",
            "essential": "RECOMMANDÉ",
            "benefits": [
                "Récupération musculaire accélérée",
                "Anti-inflammatoire naturel",
                "Soutien cœur, cerveau, système hormonal",
                "Sensibilité à l'insuline améliorée",
            ],
            "conseil": "2 à 3 g par jour, peut aller jusqu'à 8 g selon les besoins. Choisis un complément combinant EPA + DHA.",
            "note": "Sources naturelles : poissons gras, huîtres, graines de lin & chia, algues, noix.",
            "image": "produit-022.png"
        },
        "magnesium": {
            "number": "N°04",
            "title": "MAGNÉSIUM",
            "subtitle": "",
            "tagline": "Énergie, sommeil, stress. Un pilier du sportif.",
            "definition": "Minéral essentiel pour le métabolisme énergétique, la qualité du sommeil et la régulation du système nerveux. Une carence se traduit par fatigue, crampes, irritabilité, troubles du sommeil.",
            "dosage": "500mg",
            "dosage_label": "ÉLÉMENTAIRE",
            "timing": "LE SOIR",
            "essential": "ESSENTIEL",
            "benefits": [
                "Métabolisme énergétique optimal",
                "Qualité du sommeil améliorée",
                "Régulation du système nerveux",
                "Réduction crampes et irritabilité",
            ],
            "conseil": "Privilégie les formes bien absorbées : Bisglycinate, Citrate, Taurinate. Évite oxyde, sulfate, marin (mal assimilés).",
            "note": "Sources alimentaires : cacao, légumes verts, légumineuses, poissons, noix. 22 % des sportifs de haut niveau sont carencés.",
            "image": "produit-036.png"
        },
        "vitamine d": {
            "number": "N°05",
            "title": "VITAMINE",
            "subtitle": "D3 + K2",
            "tagline": "Vitamine pilier : nerveux, musculaire, immunitaire, neuronal.",
            "definition": "Vitamine essentielle au bon fonctionnement de l'organisme. Souvent en carence en hiver, chez les peaux foncées, les sédentaires et les plus de 50 ans (synthèse divisée par 4 à 70 ans).",
            "dosage": "2000-4000 UI",
            "dosage_label": "PAR JOUR",
            "timing": "OCT → MARS",
            "essential": "INDISPENSABLE",
            "benefits": [
                "Système immunitaire renforcé",
                "Densité osseuse et articulaire",
                "Récupération nerveuse",
                "Humeur et concentration",
            ],
            "conseil": "Apports quotidiens > fortes doses ponctuelles (ampoules 300 000 UI moins bien assimilées). En été : 15 min de soleil le matin. Coupler avec K2 pour fixer le calcium.",
            "note": "Symptômes carence : sommeil dérangé, perte d'appétit, récupération difficile.",
            "image": "produit-053.png"
        },
        "collagene": {
            "number": "N°06",
            "title": "COLLAGÈNE",
            "subtitle": "",
            "tagline": "Solidité & élasticité — peau, os, tendons, cartilage.",
            "definition": "Protéine naturellement présente dans le corps (peau, os, tendons, cartilage). Joue un rôle clé pour la solidité et l'élasticité des tissus, et contribue à réduire l'inflammation.",
            "dosage": "10-15g",
            "dosage_label": "PAR JOUR",
            "timing": "RÉGULIER",
            "essential": "OPTIONNEL",
            "benefits": [
                "Soutient peau, os, tendons, cartilage",
                "Réduit l'inflammation des tissus",
                "Freine la dégénérescence des cartilages",
                "Soutien articulaire (sans miracle)",
            ],
            "conseil": "Son efficacité en supplémentation n'est pas formellement prouvée. Privilégie d'abord les sources alimentaires : poissons gras (collagène marin + oméga-3), viande sur l'os, bouillon d'os.",
            "note": "Boosters naturels : ail, noix de cajou, poivrons, agrumes (riches en Vitamine C qui soutient la production de collagène).",
            "image": ""
        },
    }
    complement_images = {k: COMP_IMG_DIR / v["image"] for k, v in COMPLEMENT_DATA.items()}

    def detect_complement(text):
        """Détecte si un body text est un titre de complément."""
        t = text.lower().strip()
        if t.startswith("1.") and "whey" in t:
            return "whey", "WHEY PROTÉINE"
        if t.startswith("2.") and ("créatine" in t or "creatine" in t):
            return "creatine", "CRÉATINE"
        if t.startswith("3.") and ("oméga" in t or "omega" in t):
            return "omega", "OMÉGA-3"
        if t.startswith("4.") and ("magnésium" in t or "magnesium" in t):
            return "magnesium", "MAGNÉSIUM"
        if t.startswith("5.") and "vitamine d" in t:
            return "vitamine d", "VITAMINE D"
        if t.startswith("6.") and ("collagène" in t or "collagene" in t):
            return "collagene", "COLLAGÈNE"
        return None, None

    def add_complement_page(story, comp_key, _ignored=None):
        """Page complément — UNE page A4 magazine.
        Header inline + titre 2 lignes + tagline + stats bar + 2-col (POURQUOI/image) + note."""
        data = COMPLEMENT_DATA.get(comp_key)
        if not data:
            return
        img_path = COMP_IMG_DIR / data["image"] if data.get("image") else None

        story.append(NextPageTemplate('light_full'))
        story.append(PageBreak())
        # Bookmark PDF du complément (sous-entrée du chapitre 8 Compléments)
        story.append(PdfBookmark(
            key=f"complement-{comp_key}",
            title=f"{data['title']}" + (f" — {data.get('subtitle', '')}" if data.get('subtitle') else ""),
            level=1))
        story.append(Spacer(1, 4 * mm))

        # ─── HEADER INLINE : eyebrow gauche + icon thématique + N° géant droite ──
        # Mapping icon Phosphor par molécule (signature visuelle dans le header)
        complement_icons = {
            'whey':       chr(0xe700),  # pill
            'creatine':   chr(0xe2de),  # lightning (force/explosivité)
            'omega-3':    chr(0xe72a),  # fish-simple
            'vitamine d': chr(0xe472),  # sun
            'magnesium':  chr(0xe330),  # moon (sommeil/récup)
            'collagene':  chr(0xe2a8),  # heart (santé tissus)
        }
        ico_unicode = complement_icons.get(comp_key, chr(0xe700))
        eb_l = ParagraphStyle('eb_cml', fontName='Inter-Bold', fontSize=10,
                              textColor=CYAN_DARK, alignment=TA_LEFT, leading=14)
        ico_st = ParagraphStyle('eb_cmi', fontName='Phosphor-Fill', fontSize=22,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=24)
        eb_r = ParagraphStyle('eb_cmr', fontName='Inter-Black', fontSize=32,
                              textColor=HexColor('#D8D3C5'), alignment=TA_RIGHT, leading=34)
        header_t = Table(
            [[Paragraph("·  COMPLÉMENT", eb_l),
              Paragraph(data['number'], eb_r)]],
            colWidths=[100*mm, 64*mm])
        header_t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LINEBELOW', (0, 0), (-1, 0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(header_t)
        story.append(Spacer(1, 8 * mm))

        # ─── TITRE (1 ou 2 lignes selon subtitle) ────────────────────────
        has_subtitle = bool(data.get('subtitle', '').strip())
        # Taille adaptée : plus grosse en 1 ligne, standard en 2 lignes
        t_size = 50 if not has_subtitle else 44
        t_lead = 52 if not has_subtitle else 46
        tt = ParagraphStyle('tt_cm', fontName='Inter-Black', fontSize=t_size, leading=t_lead,
                            textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(f"{data['title']}<font color='#02D1BA'>.</font>", tt))
        if has_subtitle:
            tt2 = ParagraphStyle('tt_cm2', fontName='Inter-Black', fontSize=t_size, leading=t_lead,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=8)
            story.append(Paragraph(data['subtitle'], tt2))
        else:
            story.append(Spacer(1, 4*mm))

        # ─── TAGLINE ─────────────────────────────────────────────────────
        tag = ParagraphStyle('tag_cm', fontName='Inter-Med', fontSize=13, leading=18,
                              textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=8)
        story.append(Paragraph(data['tagline'], tag))

        # ─── DÉFINITION (Qu'est-ce que c'est ?) ──────────────────────────
        if data.get('definition'):
            def_lbl = ParagraphStyle('def_lbl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=4,
                                      leading=11)
            def_body = ParagraphStyle('def_body', fontName='Inter-Reg', fontSize=10.5,
                                       textColor=NOIR, alignment=TA_LEFT, leading=15,
                                       spaceAfter=10)
            story.append(Paragraph("·  QU'EST-CE QUE C'EST ?", def_lbl))
            story.append(Paragraph(data['definition'], def_body))

        # ─── STATS BAR (3 colonnes pleine largeur — cyan dark bg) ────────
        stat_lbl = ParagraphStyle('s_lbl', fontName='Inter-Bold', fontSize=8,
                                   textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                                   spaceAfter=4, leading=10)
        stat_val = ParagraphStyle('s_val', fontName='Inter-Black', fontSize=20,
                                   textColor=BLANC, alignment=TA_CENTER, leading=24,
                                   spaceAfter=2)
        stat_sub = ParagraphStyle('s_sub', fontName='Inter-Bold', fontSize=7.5,
                                   textColor=HexColor('#A8E5DC'), alignment=TA_CENTER, leading=10)
        col1 = [Paragraph("DOSAGE", stat_lbl),
                Paragraph(data['dosage'], stat_val),
                Paragraph(data['dosage_label'], stat_sub)]
        col2 = [Paragraph("TIMING", stat_lbl),
                Paragraph(data['timing'], stat_val),
                Paragraph("&nbsp;", stat_sub)]
        col3 = [Paragraph("STATUT", stat_lbl),
                Paragraph(data['essential'],
                          ParagraphStyle('s_essential', fontName='Inter-Black', fontSize=13,
                                          textColor=BLANC, alignment=TA_CENTER, leading=16,
                                          spaceAfter=2)),
                Paragraph("&nbsp;", stat_sub)]
        stats_table = Table([[col1, col2, col3]], colWidths=[54*mm, 54*mm, 56*mm])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CYAN_DARK),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
            ('LINEAFTER', (0, 0), (0, -1), 0.5, HexColor('#7DD8C7')),
            ('LINEAFTER', (1, 0), (1, -1), 0.5, HexColor('#7DD8C7')),
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 10 * mm))

        # ─── 2 COLONNES : POURQUOI (gauche) + Image (droite) ─────────────
        sec_lbl_style = ParagraphStyle('sec_lbl', fontName='Inter-Bold', fontSize=10,
                                        textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=8,
                                        leading=12)
        bullet_style = ParagraphStyle('cmp_bul', fontName='Inter-Med', fontSize=11,
                                       textColor=NOIR, alignment=TA_LEFT, leading=17,
                                       spaceAfter=5, leftIndent=10, firstLineIndent=-10)
        # Bénéfices + Conseil pratique (col gauche)
        left_block = [Paragraph("·  POURQUOI", sec_lbl_style)]
        for b in data['benefits']:
            left_block.append(Paragraph(f"<font color='#00A38F'>→</font> &nbsp;{b}", bullet_style))

        if data.get('conseil'):
            left_block.append(Spacer(1, 4*mm))
            conseil_lbl = ParagraphStyle('csl_lbl', fontName='Inter-Bold', fontSize=9,
                                          textColor=CYAN_DARK, alignment=TA_LEFT,
                                          spaceAfter=3, leading=11)
            conseil_body = ParagraphStyle('csl_body', fontName='Inter-Reg', fontSize=10,
                                           textColor=NOIR, alignment=TA_LEFT, leading=14)
            left_block.append(Paragraph("·  CONSEIL PRATIQUE", conseil_lbl))
            left_block.append(Paragraph(data['conseil'], conseil_body))

        # Image produit côté droit
        right_block = []
        if img_path and img_path.is_file():
            try:
                img = RLImage(str(img_path), width=70 * mm, height=92 * mm, kind='proportional')
                img.hAlign = 'CENTER'
                right_block.append(img)
            except Exception as e:
                print(f"  ⚠️ image {comp_key} : {e}")
        else:
            # Placeholder gris pour compléments sans image (collagène)
            ph_lbl = ParagraphStyle('cmp_ph_lbl', fontName='Inter-Bold', fontSize=8.5,
                                     textColor=GRIS, alignment=TA_CENTER)
            ph = Table([[Paragraph("PHOTO<br/>COLLAGÈNE", ph_lbl)]],
                       colWidths=[70*mm], rowHeights=[92*mm])
            ph.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), HexColor('#E8E4D8')),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ]))
            right_block.append(ph)

        cols_table = Table([[left_block, right_block]], colWidths=[92*mm, 72*mm])
        cols_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (0, -1), 'TOP'),
            ('VALIGN', (1, 0), (1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(cols_table)
        story.append(Spacer(1, 6 * mm))

        # ─── NOTE pleine largeur ────────────────────────────────────────
        if data.get('note'):
            note_style = ParagraphStyle('cmp_note', fontName='Inter-Med', fontSize=9.5,
                                         textColor=NOIR, alignment=TA_LEFT, leading=14,
                                         leftIndent=10, rightIndent=10,
                                         borderColor=CYAN_DARK, borderWidth=0,
                                         backColor=HexColor('#EEF9F7'),
                                         borderPadding=(7, 12, 7, 12))
            story.append(Paragraph(f"<b><font color='#00A38F'>À RETENIR.</font></b> &nbsp; {data['note']}", note_style))

        # Retour template chapitre pour la suite
        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION NUTRITION — 10 pages magazine DA RB Perform
    # Reproduit la mise en page de /Users/rayan/Downloads/nutrition.pdf
    # ─────────────────────────────────────────────────────────────────────────
    from reportlab.platypus import HRFlowable

    # Styles locaux nutrition
    NS_eyebrow = ParagraphStyle('ns_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    NS_eyebrow_r = ParagraphStyle('ns_ebr', fontName='Inter-Black', fontSize=22,
                                   textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                   leading=24)
    NS_t_noir = ParagraphStyle('ns_t1', fontName='Inter-Black', fontSize=32, leading=36,
                                textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
    NS_t_cyan = ParagraphStyle('ns_t2', fontName='Inter-Black', fontSize=32, leading=36,
                                textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
    NS_body = ParagraphStyle('ns_body', fontName='Inter-Reg', fontSize=10.5,
                              leading=16, textColor=NOIR, spaceAfter=8,
                              alignment=TA_JUSTIFY)
    NS_lead = ParagraphStyle('ns_lead', fontName='Inter-Med', fontSize=12,
                              leading=18, textColor=GRIS_DARK, spaceAfter=10,
                              alignment=TA_LEFT)
    NS_card_lbl = ParagraphStyle('ns_clbl', fontName='Inter-Bold', fontSize=9,
                                  textColor=CYAN_DARK, alignment=TA_LEFT,
                                  spaceAfter=4, leading=11)
    NS_card_val = ParagraphStyle('ns_cval', fontName='Inter-Med', fontSize=10,
                                  textColor=NOIR, leading=14, alignment=TA_LEFT,
                                  spaceAfter=0)
    NS_section_h = ParagraphStyle('ns_sh', fontName='Inter-Bold', fontSize=13,
                                   textColor=CYAN_DARK, alignment=TA_LEFT,
                                   spaceAfter=6, leading=16)
    NS_stat_big = ParagraphStyle('ns_sb', fontName='Inter-Black', fontSize=64,
                                  textColor=CYAN_DARK, alignment=TA_LEFT,
                                  leading=66)

    def _ns_header(story, num_text):
        """Header inline 'NUTRITION' gauche + N° géant droite + filet."""
        t = Table(
            [[Paragraph("·  NUTRITION", NS_eyebrow), Paragraph(num_text, NS_eyebrow_r)]],
            colWidths=[100*mm, 64*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _ns_header_narrow(story, num_text):
        """Header pour template nutrition_photo (largeur 92mm)."""
        eb_r = ParagraphStyle('ns_ebr_n', fontName='Inter-Black', fontSize=20,
                               textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                               leading=22)
        t = Table(
            [[Paragraph("·  NUTRITION", NS_eyebrow), Paragraph(num_text, eb_r)]],
            colWidths=[52*mm, 40*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _ns_title(story, line1, line2=None, color2=CYAN_DARK):
        story.append(Paragraph(line1, NS_t_noir))
        if line2:
            s = ParagraphStyle('ns_t2x', fontName='Inter-Black', fontSize=32, leading=36,
                                textColor=color2, alignment=TA_LEFT, spaceAfter=0)
            story.append(Paragraph(line2, s))

    def _ns_photo(w_mm, h_mm, label="PHOTO"):
        t = Table([[""]], colWidths=[w_mm*mm], rowHeights=[h_mm*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#E8E4D8')),
        ]))
        return t

    def _ns_new_page(story, n_label, first=False, photo=False):
        target_template = 'nutrition_photo' if photo else 'light_full'
        if not first:
            story.append(NextPageTemplate(target_template))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        # Header largeur réduite si photo droite
        if photo:
            _ns_header_narrow(story, n_label)
        else:
            _ns_header(story, n_label)

    def _ns_card_box(label, value_text, width_mm):
        """Carte info compacte (label cyan + texte noir)."""
        cell = [Paragraph(label, NS_card_lbl), Paragraph(value_text, NS_card_val)]
        t = Table([[cell]], colWidths=[width_mm*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        return t

    def build_nutrition_section(story):
        """10 pages théoriques nutrition (DA RB Perform)."""

        # ═══════ PAGE 1/10 — INTRODUCTION (photo droite) ════════════════════
        _ns_new_page(story, "01 / 10", first=True, photo=True)
        # Titre adapté largeur 92mm (taille réduite)
        nt_l1 = ParagraphStyle('nt_n1', fontName='Inter-Black', fontSize=26, leading=30,
                                textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        nt_l2 = ParagraphStyle('nt_n2', fontName='Inter-Black', fontSize=26, leading=30,
                                textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph("INTRODUCTION", nt_l1))
        story.append(Paragraph("L'ALIMENTATION", nt_l2))
        story.append(Paragraph("EN MUSCULATION", nt_l2))
        story.append(Spacer(1, 8*mm))

        intro_body = ("En musculation, l'entraînement seul ne suffit pas. Le succès "
                       "de ta transformation physique repose sur une nutrition "
                       "stratégique, transformant chaque repas en une opportunité "
                       "de progrès.")
        story.append(Paragraph(intro_body, NS_lead))
        story.append(Spacer(1, 4*mm))
        bullets_data = [
            ("Sculpter ton corps",
             "Apporte les nutriments précis pour une croissance musculaire et / ou une perte de gras importante."),
            ("Booster tes performances",
             "Assure l'énergie nécessaire pour des entraînements intenses et repousse tes limites."),
            ("Accélérer la récupération",
             "Reconstruis tes muscles plus vite et mieux, préparant ton corps au prochain défi."),
        ]
        for h, b in bullets_data:
            story.append(Paragraph(f"<font color='#00A38F'>→</font>  <b>{h}</b>", NS_section_h))
            story.append(Paragraph(b, NS_body))

        # ═══════ PAGE 2/10 — POURQUOI (pleine largeur) ══════════════════════
        _ns_new_page(story, "02 / 10")
        _ns_title(story, "POURQUOI L'ALIMENTATION", "EST-ELLE CRUCIALE ?")
        story.append(Spacer(1, 8*mm))

        body_p1 = ("Le principe de base dans la recherche de performance est que "
                    "<b>l'entraînement seul ne suffit pas</b>. On prend souvent la métaphore "
                    "de l'iceberg pour montrer tout ce qui se cache derrière un physique "
                    "athlétique ou une performance hors norme. L'alimentation fait partie "
                    "de cette face immergée.")
        body_p2 = ("Tu peux utiliser les méthodes d'entraînement les plus avancées : si "
                    "tu ne respectes pas les principes nutritionnels de base, tes efforts "
                    "seront totalement vains.")
        body_p3 = ("On connaît tous cette personne qui s'entraîne depuis des années "
                    "mais qui n'a pas de résultats uniquement parce qu'elle ne surveille "
                    "pas son alimentation. Je te donne ici toutes les clés.")
        left_block = [Paragraph(body_p1, NS_body),
                       Paragraph(body_p2, NS_body),
                       Paragraph(body_p3, NS_body)]

        stat_label = ParagraphStyle('ns_stl', fontName='Inter-Bold', fontSize=10,
                                     textColor=CYAN_DARK, alignment=TA_LEFT, leading=12,
                                     spaceAfter=6)
        stat_desc = ParagraphStyle('ns_std', fontName='Inter-Med', fontSize=11,
                                    textColor=NOIR, alignment=TA_LEFT, leading=16)
        stat_inner = [
            Paragraph("L'ALIMENTATION REPRÉSENTE", stat_label),
            Paragraph("70%", NS_stat_big),
            Spacer(1, 2*mm),
            Paragraph("de tes résultats en musculation. C'est elle qui détermine si tu vas <b>prendre du muscle</b>, <b>perdre du gras</b>, ou stagner.", stat_desc),
        ]
        stat_box = Table([[stat_inner]], colWidths=[76*mm])
        stat_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#EEF9F7')),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        cols = Table([[left_block, stat_box]], colWidths=[88*mm, 76*mm])
        cols.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(cols)

        story.append(Spacer(1, 8*mm))
        story.append(_photo_bandeau(NUT_IMG_DIR / "nut-pourquoi-cruciale.jpg",
                                      "PHOTO BOWL / ATHLÈTE QUI MANGE", h_mm=70))

        # ═══════ PAGE 3/10 — GRAS vs MUSCLE (pleine largeur) ════════════════
        _ns_new_page(story, "03 / 10")
        _ns_title(story, "PEUT-ON TRANSFORMER", "LE GRAS EN MUSCLE ?")
        story.append(Spacer(1, 8*mm))

        q_title = ParagraphStyle('ns_qt', fontName='Inter-Black', fontSize=18, leading=22,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=10)
        q_label = ParagraphStyle('ns_qlbl', fontName='Inter-Bold', fontSize=9,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, spaceAfter=4)
        left_col = [
            Paragraph("RÉPONSE", q_label),
            Paragraph("Non, c'est impossible.", q_title),
            Paragraph("Je vais casser le mythe du <i>« j'aimerais transformer mon gras en muscle »</i>. Pourquoi ? Parce que le gras et le muscle sont <b>deux tissus complètement différents</b>. On ne peut pas « convertir » l'un en l'autre.", NS_body),
        ]
        right_col = [
            Paragraph("MAIS ATTENTION", q_label),
            Paragraph("Recomposition corporelle.", q_title),
            Paragraph("Durant les <b>premières années d'entraînement</b>, il est possible de perdre du gras <b>ET</b> gagner du muscle simultanément, à condition que le déficit calorique reste léger (5-10 %).", NS_body),
        ]
        qr_t = Table([[left_col, right_col]], colWidths=[82*mm, 82*mm])
        qr_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
        ]))
        story.append(qr_t)
        story.append(Spacer(1, 8*mm))
        story.append(_photo_bandeau(NUT_IMG_DIR / "nut-transformation.jpg",
                                      "PHOTO PERSONNE TRANSFORMATION", h_mm=60))

        # ═══════ PAGE 4/10 — DÉFINIR SON OBJECTIF ═══════════════════════════
        _ns_new_page(story, "04 / 10")
        _ns_title(story, "DÉFINIR SON", "OBJECTIF PHYSIQUE")
        story.append(Spacer(1, 4*mm))

        # ─── Pull-quote XL d'ouverture (style édito magazine) ──────────
        pq_n_style = ParagraphStyle('ns_pq', fontName='Inter-Black', fontSize=15,
                                      textColor=CYAN_DARK, alignment=TA_LEFT, leading=20,
                                      spaceAfter=2, leftIndent=10)
        story.append(Paragraph(
            "<font color='#02D1BA'>«</font> &nbsp; Tu peux t'entraîner comme un dieu. "
            "Si tu manges au pif, tu progresses comme un random. "
            "&nbsp;<font color='#02D1BA'>»</font>",
            pq_n_style))
        from reportlab.platypus import HRFlowable as _HR_ns
        story.append(_HR_ns(width=28*mm, thickness=1, color=CYAN_DARK,
                              spaceBefore=4, spaceAfter=10, hAlign='LEFT'))

        story.append(Paragraph("1.  CALCUL DU MÉTABOLISME DE BASE (TMB)", NS_section_h))
        story.append(Paragraph(
            "Mes méthodes préférées et les plus connues pour connaître "
            "ta dépense énergétique sont :", NS_body))

        formula_lbl = ParagraphStyle('ns_fl', fontName='Inter-Bold', fontSize=10,
                                      textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=4)
        formula_txt = ParagraphStyle('ns_ft', fontName='Inter-Med', fontSize=9.5,
                                      textColor=NOIR, alignment=TA_LEFT, leading=14)

        f1 = [Paragraph("HARRIS-BENEDICT (sans taux MG)", formula_lbl),
              Paragraph("<b>Hommes :</b> 66,47 + (13,75 × poids kg) + (5,00 × taille cm) − (6,75 × âge)", formula_txt),
              Spacer(1, 2*mm),
              Paragraph("<b>Femmes :</b> 655,10 + (9,56 × poids kg) + (1,85 × taille cm) − (4,68 × âge)", formula_txt)]
        f2 = [Paragraph("KATCH-McARDLE (avec taux MG)", formula_lbl),
              Paragraph("Calcule d'abord ta <b>masse maigre</b> = poids × (1 − % MG).", formula_txt),
              Spacer(1, 2*mm),
              Paragraph("<b>TMB</b> = masse maigre × 21,6 + 370", formula_txt)]

        formulas = Table([[f1, f2]], colWidths=[82*mm, 82*mm])
        formulas.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(formulas)
        story.append(Spacer(1, 6*mm))

        story.append(Paragraph("2.  NIVEAU D'ACTIVITÉ (multiplier le TMB)", NS_section_h))
        activity = [
            ["Sédentaire", "× 1,2", "Peu ou pas d'exercice, travail de bureau"],
            ["Légèrement actif", "× 1,35", "Sport 1 à 3 jours / semaine"],
            ["Assez actif", "× 1,5", "Sport 6 à 7 jours / semaine"],
            ["Très actif", "× 1,7", "Exercice intense tous les jours"],
            ["Extrême", "× 1,9", "Intense 2× / jour ou plus"],
        ]
        act_t = Table(activity, colWidths=[44*mm, 24*mm, 96*mm])
        act_t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Inter-Bold'),
            ('FONTNAME', (1,0), (1,-1), 'Inter-Black'),
            ('FONTNAME', (2,0), (2,-1), 'Inter-Reg'),
            ('FONTSIZE', (0,0), (-1,-1), 9.5),
            ('TEXTCOLOR', (0,0), (0,-1), NOIR),
            ('TEXTCOLOR', (1,0), (1,-1), CYAN_DARK),
            ('TEXTCOLOR', (2,0), (2,-1), GRIS_DARK),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,0), (-1,-1), [PAPIER_2, HexColor('#EAE6DA')]),
        ]))
        story.append(act_t)

        # ═══════ PAGE 5/10 — AJUSTER SELON OBJECTIFS ════════════════════════
        _ns_new_page(story, "05 / 10")
        _ns_title(story, "AJUSTER SELON", "VOS OBJECTIFS")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "Une fois le TMB et le niveau d'activité connus, on ajuste le total calorique "
            "selon l'objectif visé. Voici les fourchettes que j'utilise :", NS_lead))
        story.append(Spacer(1, 6*mm))

        obj_data = [
            ("PRISE DE MUSCLE",
             "Surplus de 0 à 10 %",
             "Croissance musculaire optimale en limitant la prise de gras (la prise de masse implique presque toujours un peu de gras — le but ici est de la limiter)."),
            ("PERTE DE GRAISSE",
             "Déficit de 15 à 20 %",
             "Rythme soutenu mais durable. Préserve la masse musculaire si tes apports en protéines restent élevés."),
            ("RECOMPOSITION CORPORELLE",
             "Déficit de 5 à 10 %",
             "Construire du muscle ET éliminer la graisse simultanément. Réservé aux premières années d'entraînement."),
            ("PERTE DE GRAISSE RAPIDE",
             "Déficit de 20 % ou plus",
             "Solution pour une courte période uniquement. Risque de perte musculaire et de stagnation hormonale."),
        ]
        obj_lbl = ParagraphStyle('ns_olbl', fontName='Inter-Black', fontSize=11,
                                  textColor=NOIR, alignment=TA_LEFT, spaceAfter=2, leading=14)
        obj_val = ParagraphStyle('ns_oval', fontName='Inter-Bold', fontSize=11,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=4, leading=14)
        obj_desc = ParagraphStyle('ns_odesc', fontName='Inter-Reg', fontSize=10,
                                   textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)
        for lbl, val, desc in obj_data:
            cell = [Paragraph(lbl, obj_lbl),
                    Paragraph(val, obj_val),
                    Paragraph(desc, obj_desc)]
            t = Table([[cell]], colWidths=[164*mm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(t)
            story.append(Spacer(1, 4*mm))

        # ═══════ PAGES 6-9/10 — MACROS (4 pages) ════════════════════════════
        MACROS = [
            {
                "n": "06 / 10",
                "title1": "LES PROTÉINES",
                "title2": "FONDATION MUSCULAIRE",
                "lead": "Quand on pense à une alimentation sportive, la première chose qui vient à l'esprit, c'est qu'il faut consommer des « protéines ». Je te détaille ici à quoi elles servent réellement.",
                "cards": [
                    ("RÔLE ESSENTIEL", "Réparer et reconstruire les tissus musculaires après un entraînement intensif."),
                    ("APPORT ÉNERGÉTIQUE", "1 gramme de protéine = 4 kcal."),
                    ("RECOMMANDATION", "2,2 à 2,5 g par kg de masse maigre pour une récupération optimale."),
                    ("SOURCES PRINCIPALES", "Viandes, poissons, œufs, légumineuses, produits laitiers, protéines végétales."),
                ],
            },
            {
                "n": "07 / 10",
                "title1": "LES GLUCIDES",
                "title2": "CARBURANT DE PERFORMANCE",
                "lead": "Pour moi, les glucides représentent la variable alimentaire la plus importante pour la performance sportive et la transformation physique. La quantité consommée détermine l'intensité de l'effort que tes muscles pourront fournir.",
                "cards": [
                    ("RÔLE ESSENTIEL", "Fournir l'énergie immédiate aux muscles pendant l'effort."),
                    ("APPORT ÉNERGÉTIQUE", "1 gramme = 4 kcal."),
                    ("RECOMMANDATION", "Représentent le reste des calories une fois protéines et lipides fixés."),
                    ("SOURCES ÉNERGÉTIQUES", "Féculents (riz, pâtes, quinoa), tubercules (PDT, patate douce), légumineuses (lentilles, haricots), fruits & légumes."),
                ],
            },
            {
                "n": "08 / 10",
                "title1": "LES LIPIDES",
                "title2": "SANTÉ ET ÉNERGIE",
                "lead": "Les lipides (graisses) ont toujours eu une mauvaise image, pourtant ils représentent la deuxième source d'énergie de l'organisme après les glucides. Assimilés plus lentement, ils sont essentiels — en particulier pour les efforts longs ou une alimentation pauvre en glucides.",
                "cards": [
                    ("FONCTIONS & RÔLES", "Réserve d'énergie concentrée, structure cellulaire, santé du cerveau, mémoire et concentration."),
                    ("APPORT ÉNERGÉTIQUE", "1 gramme = 9 kcal (plus du double des protéines et glucides !)."),
                    ("DOSAGE OPTIMAL", "Minimum 0,8 g par kg de poids de corps pour maintenir les fonctions hormonales."),
                    ("SOURCES VARIÉES", "Huiles végétales, noix, amandes, avocats, poissons gras (saumon, maquereau), graines."),
                ],
            },
            {
                "n": "09 / 10",
                "title1": "LES LÉGUMES",
                "title2": "VITAMINES & FIBRES",
                "lead": "Les légumes sont essentiels au quotidien : ils apportent vitamines, minéraux et fibres pour rester en forme. Conseillés dans tout régime alimentaire, ils ont de nombreux bienfaits.",
                "cards": [
                    ("RÔLE ESSENTIEL", "Aide à la satiété grâce aux fibres, fournissent des vitamines et minéraux essentiels."),
                    ("APPORT ÉNERGÉTIQUE", "Faibles en kcal — peuvent être consommés en grande quantité."),
                    ("RECOMMANDATION", "Varie les légumes pour avoir tous types de nutriments."),
                    ("SOURCES & TYPES", "Verts : brocoli, épinard, petit pois. Secs : lentilles, pois chiches. Racines : carottes, patates douces."),
                ],
            },
        ]
        for m in MACROS:
            _ns_new_page(story, m["n"], photo=True)
            story.append(Paragraph(m["title1"], nt_l1))
            story.append(Paragraph(m["title2"], nt_l2))
            story.append(Spacer(1, 6*mm))
            story.append(Paragraph(m["lead"], NS_lead))
            story.append(Spacer(1, 4*mm))
            # 4 cards empilées en colonne 92mm
            for label, value in m["cards"]:
                story.append(_ns_card_box(label, value, 92))
                story.append(Spacer(1, 3*mm))

        # ═══════ PAGE 10/10 — TIMING REPAS (photo droite) ═══════════════════
        _ns_new_page(story, "10 / 10", photo=True)
        story.append(Paragraph("TIMING OPTIMAL", nt_l1))
        story.append(Paragraph("DE LA RÉPARTITION", nt_l2))
        story.append(Paragraph("DES REPAS", nt_l2))
        story.append(Spacer(1, 6*mm))

        ta_lbl = ParagraphStyle('ns_tal', fontName='Inter-Bold', fontSize=9,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=3)
        ta_h = ParagraphStyle('ns_tah', fontName='Inter-Black', fontSize=12,
                               textColor=NOIR, alignment=TA_LEFT, spaceAfter=4, leading=15)
        ta_body = ParagraphStyle('ns_tabody', fontName='Inter-Reg', fontSize=9.5,
                                  textColor=NOIR, alignment=TA_LEFT, leading=14, spaceAfter=2)

        # Avant et Après empilés (colonne 92mm)
        for lbl, head, body_lines, obj in [
            ("AVANT L'ENTRAÎNEMENT", "1 à 2h avant",
             ["Source de <b>glucides à assimilation rapide</b> :",
              "<font color='#00A38F'>→</font>  Riz blanc, flocons d'avoine",
              "<font color='#00A38F'>→</font>  Pain blanc, fruits, compote"],
             "Optimiser ton énergie pour la séance."),
            ("APRÈS L'ENTRAÎNEMENT", "Dans les heures qui suivent",
             ["Privilégie :",
              "<font color='#00A38F'>→</font>  <b>Protéines</b> pour la récupération",
              "<font color='#00A38F'>→</font>  <b>Glucides rapides</b> (banane, miel, riz)"],
             "Reconstituer le glycogène et préparer la séance suivante."),
        ]:
            cell = [Paragraph(lbl, ta_lbl), Paragraph(head, ta_h)]
            for line in body_lines:
                cell.append(Paragraph(line, ta_body))
            cell.append(Spacer(1, 2*mm))
            cell.append(Paragraph(f"<b>Objectif :</b> {obj}", ta_body))
            t = Table([[cell]], colWidths=[92*mm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 12),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(t)
            story.append(Spacer(1, 3*mm))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  RAPPEL — LA HIÉRARCHIE", NS_section_h))
        recap_items = [
            ("1.", "Détermine ton déficit ou surplus calorique selon ton objectif."),
            ("2.", "Apport en protéines (2,2 à 2,5 g / kg masse maigre)."),
            ("3.", "Minimum vital de lipides (0,8 à 1 g / kg poids de corps)."),
            ("4.", "Reste des calories en glucides pour l'énergie."),
        ]
        recap_body = ParagraphStyle('rcb', fontName='Inter-Reg', fontSize=9.5,
                                      textColor=NOIR, alignment=TA_LEFT, leading=13)
        for num, txt in recap_items:
            row = [Paragraph(f"<font color='#00A38F'><b>{num}</b></font>",
                              ParagraphStyle('rcn', fontName='Inter-Black', fontSize=11,
                                              textColor=CYAN_DARK)),
                   Paragraph(txt, recap_body)]
            t = Table([row], colWidths=[8*mm, 84*mm])
            t.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ]))
            story.append(t)

        # ═════════════════════════════════════════════════════════════════════
        # SECTION RECETTES (intégrée à NUTRITION) — 8 pages
        # ═════════════════════════════════════════════════════════════════════

        REC_eyebrow = ParagraphStyle('rec_eb', fontName='Inter-Bold', fontSize=10,
                                        textColor=CYAN_DARK, alignment=TA_LEFT,
                                        spaceAfter=4, leading=12)
        REC_eyebrow_r = ParagraphStyle('rec_ebr', fontName='Inter-Black', fontSize=22,
                                          textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                          leading=24)

        def _rec_new_page(story, num_label):
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
            story.append(Spacer(1, 4*mm))
            t = Table(
                [[Paragraph("·  RECETTES", REC_eyebrow),
                  Paragraph(num_label, REC_eyebrow_r)]],
                colWidths=[110*mm, 54*mm])
            t.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
            ]))
            story.append(t)
            story.append(Spacer(1, 6*mm))

        def _rec_title(story, line1, line2=None):
            s1 = ParagraphStyle('rec_t1', fontName='Inter-Black', fontSize=34,
                                 leading=38, textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
            s2 = ParagraphStyle('rec_t2', fontName='Inter-Black', fontSize=34,
                                 leading=38, textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
            story.append(Paragraph(line1, s1))
            if line2:
                story.append(Paragraph(line2, s2))

        def _recette_card(name, macros, ingredients, preparation, photo_file=None):
            """Card recette compacte : texte gauche + mini-photo carrée à droite."""
            nom_s = ParagraphStyle('rec_n', fontName='Inter-Black', fontSize=13,
                                     textColor=NOIR, alignment=TA_LEFT, leading=16,
                                     spaceAfter=4)
            macro_s = ParagraphStyle('rec_m', fontName='Inter-Bold', fontSize=8.5,
                                       textColor=CYAN_DARK, alignment=TA_LEFT,
                                       leading=11, spaceAfter=6)
            col_h = ParagraphStyle('rec_h', fontName='Inter-Bold', fontSize=8.5,
                                     textColor=CYAN_DARK, alignment=TA_LEFT,
                                     leading=10, spaceAfter=4)
            col_b = ParagraphStyle('rec_b', fontName='Inter-Reg', fontSize=9,
                                     textColor=NOIR, alignment=TA_LEFT, leading=12,
                                     spaceAfter=1)
            ing_cell = [Paragraph("INGRÉDIENTS", col_h)]
            for i in ingredients:
                ing_cell.append(Paragraph(
                    f"<font color='#00A38F'>→</font>  {i}", col_b))
            prep_cell = [Paragraph("PRÉPARATION", col_h)]
            for step in preparation:
                prep_cell.append(Paragraph(step, col_b))
            # 2 cols ingrédients + préparation (resserrées)
            cols_t = Table([[ing_cell, prep_cell]], colWidths=[44*mm, 50*mm])
            cols_t.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            text_inner = [Paragraph(name, nom_s), Paragraph(macros, macro_s), cols_t]
            # Photo carrée à droite
            photo_path = NUT_IMG_DIR / photo_file if photo_file else None
            photo_cell = _mini_photo_or_placeholder(photo_path, 38, 42,
                                                     f"PHOTO\n{name[:20]}")
            # Layout 2 cols : texte gauche (TOP) | photo droite (centrée verticalement)
            full = Table([[text_inner, photo_cell]], colWidths=[94*mm, 42*mm])
            full.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('LEFTPADDING', (1,0), (1,0), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            card_t = Table([[full]], colWidths=[164*mm])
            card_t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 12),
                ('BOTTOMPADDING', (0,0), (-1,-1), 12),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            return card_t

        # ═══════ PAGE 1/8 — INTRO RECETTES ════════════════════════════════════
        _rec_new_page(story, "01 / 08")
        _rec_title(story, "12 RECETTES.", "RAPIDES & ATHLÈTES.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "12 recettes simples, saines et gourmandes pour chaque moment de "
            "la journée. Petit-déjeuner, collation, dessert et plats principaux. "
            "Toutes sont pensées pour <b>allier plaisir et nutrition</b>.",
            NS_lead))

        story.append(Spacer(1, 6*mm))
        story.append(Paragraph("·  CE QUE TU VAS Y TROUVER", ea_sec_lbl if False else NS_section_h))
        story.append(Spacer(1, 4*mm))

        sommaire_rec = [
            ("01 → 03", "PETIT-DÉJEUNER · COLLATION · DESSERT",
             "6 recettes pour bien démarrer la journée et tenir entre les repas."),
            ("04 → 06", "PLATS PRINCIPAUX",
             "6 recettes complètes — protéines + glucides + légumes."),
            ("07 → 08", "TABLEAU DES ÉQUIVALENCES",
             "Glucides et protéines : comment varier sans recalculer."),
        ]
        for nums, titre, desc in sommaire_rec:
            num_s = ParagraphStyle('rec_sn', fontName='Inter-Black', fontSize=10,
                                     textColor=CYAN_DARK, alignment=TA_LEFT, leading=12)
            tt_s = ParagraphStyle('rec_st', fontName='Inter-Black', fontSize=11,
                                    textColor=NOIR, alignment=TA_LEFT, leading=13, spaceAfter=2)
            d_s = ParagraphStyle('rec_sd', fontName='Inter-Reg', fontSize=9.5,
                                   textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
            row = Table([[Paragraph(nums, num_s),
                          [Paragraph(titre, tt_s), Paragraph(desc, d_s)]]],
                        colWidths=[24*mm, 140*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        # Recettes data (2 par page, 6 pages contenu)
        recettes_pd = [
            # PETIT-DÉJEUNER / COLLATION / DESSERT
            (
                "PANCAKES PROTÉINÉS",
                "432 kcal · 33 g protéines · 45 g glucides · 14 g lipides",
                ["40 g flocons d'avoine", "1 banane", "2 œufs", "30 g whey",
                 "Fruits rouges (optionnel)", "Miel (optionnel)"],
                ["1. Mixer les flocons d'avoine.",
                 "2. Ajouter banane, œufs et whey.",
                 "3. Mixer jusqu'à pâte homogène.",
                 "4. Cuire dans une poêle antiadhésive.",
                 "5. Servir avec fruits rouges et miel."],
                "rec-pancakes.jpg",
            ),
            (
                "OMELETTE HAUTE PROTÉINE",
                "360 kcal · 40 g protéines · 4 g glucides · 20 g lipides",
                ["3 œufs", "100 g blancs d'œufs", "40 g fromage allégé",
                 "Légumes (poivron, épinards...)"],
                ["1. Battre les œufs et blancs.",
                 "2. Ajouter les légumes.",
                 "3. Cuire dans une poêle antiadhésive.",
                 "4. Garnir de fromage allégé."],
                "rec-omelette.jpg",
            ),
            (
                "SMOOTHIE DE RÉCUPÉRATION",
                "395 kcal · 36 g protéines · 38 g glucides · 11 g lipides",
                ["1 banane", "30 g whey", "250 ml lait",
                 "15 g beurre de cacahuète"],
                ["1. Tous les ingrédients dans un blender.",
                 "2. Mixer jusqu'à texture lisse.",
                 "3. Boire immédiatement après l'entraînement."],
                "rec-smoothie.jpg",
            ),
            (
                "FROMAGE BLANC & FLOCONS D'AVOINE",
                "350 kcal · 25 g protéines · 45 g glucides · 8 g lipides",
                ["150 g skyr ou fromage blanc 0 %",
                 "30 g flocons d'avoine", "50 g fruits rouges",
                 "10 g pépites chocolat noir", "1 filet de miel"],
                ["1. Déposer le fromage blanc dans un bol.",
                 "2. Ajouter flocons d'avoine et fruits.",
                 "3. Parsemer de pépites et finir au miel."],
                "rec-fromage-blanc.jpg",
            ),
            (
                "TARTINE BEURRE DE CACAHUÈTE & MIEL",
                "280 kcal · 10 g protéines · 30 g glucides · 12 g lipides",
                ["1 tranche pain complet (40 g)",
                 "15 g beurre de cacahuète 100 %", "1 filet de miel",
                 "Rondelles de banane (optionnel)"],
                ["1. Toaster la tranche de pain complet.",
                 "2. Étaler le beurre de cacahuète.",
                 "3. Ajouter le miel et les rondelles de banane."],
                "rec-tartine.jpg",
            ),
            (
                "CHEESECAKE PROTÉINÉ SANS CUISSON",
                "300 kcal · 25 g protéines · 25 g glucides · 10 g lipides",
                ["30 g flocons d'avoine", "15 g poudre d'amandes",
                 "150 g skyr", "Édulcorant et vanille",
                 "Coulis de fruits rouges"],
                ["1. Mélanger flocons et poudre d'amandes pour la base.",
                 "2. Battre le skyr avec édulcorant et vanille.",
                 "3. Verser sur la base, laisser au frais.",
                 "4. Servir avec coulis de fruits."],
                "rec-cheesecake.jpg",
            ),
        ]

        recettes_plats = [
            (
                "WRAP POULET",
                "365 kcal · 42 g protéines · 30 g glucides · 7 g lipides",
                ["1 tortilla complète", "120 g poulet grillé",
                 "50 g fromage blanc 0 %", "Salade", "Tomate"],
                ["1. Cuire le poulet à la poêle.",
                 "2. Garnir la tortilla avec poulet et légumes.",
                 "3. Ajouter le fromage blanc.",
                 "4. Rouler le wrap."],
                "rec-wrap.jpg",
            ),
            (
                "POULET TIKKA HEALTHY",
                "590 kcal · 50 g protéines · 78 g glucides · 7 g lipides",
                ["150 g poulet", "100 g yaourt grec 0 %",
                 "Paprika · curcuma · ail",
                 "100 g riz basmati cru"],
                ["1. Mariner le poulet (yaourt + épices).",
                 "2. Cuire à la poêle ou au four.",
                 "3. Servir avec le riz basmati."],
                "rec-tikka.jpg",
            ),
            (
                "BOWL SAUMON AVOCAT",
                "620 kcal · 34 g protéines · 64 g glucides · 25 g lipides",
                ["120 g saumon", "80 g riz basmati cru",
                 "70 g avocat", "Concombre"],
                ["1. Cuire le riz.",
                 "2. Couper avocat et concombre.",
                 "3. Assembler le bowl avec le saumon."],
                "rec-bowl-saumon.jpg",
            ),
            (
                "PÂTES COMPLÈTES BOLOGNAISE",
                "560 kcal · 42 g protéines · 72 g glucides · 12 g lipides",
                ["100 g pâtes complètes",
                 "120 g steak haché 5 %",
                 "150 g sauce tomate", "Oignon"],
                ["1. Cuire les pâtes.",
                 "2. Faire revenir la viande avec l'oignon.",
                 "3. Ajouter la sauce tomate.",
                 "4. Mélanger avec les pâtes."],
                "rec-bolognaise.jpg",
            ),
            (
                "SANDWICH PROTÉINÉ AU THON",
                "420 kcal · 40 g protéines · 38 g glucides · 12 g lipides",
                ["80 g pain complet (2 tranches)",
                 "120 g thon au naturel égoutté",
                 "40 g fromage blanc 0 %",
                 "30 g tomate", "20 g salade"],
                ["1. Égoutter le thon, le mélanger au fromage blanc.",
                 "2. Ajouter tomate et salade sur le pain.",
                 "3. Garnir avec le mélange thon / fromage blanc.",
                 "4. Refermer le sandwich."],
                "rec-sandwich.jpg",
            ),
            (
                "BURGER FITNESS",
                "480 kcal · 38 g protéines · 40 g glucides · 18 g lipides",
                ["1 pain burger complet",
                 "120 g steak haché 5 %",
                 "Fromage allégé", "Salade · tomate"],
                ["1. Cuire le steak.",
                 "2. Assembler le burger avec les légumes.",
                 "3. Servir immédiatement."],
                "rec-burger.jpg",
            ),
        ]

        # ═══════ PAGES 2-4 — PETIT-DÉJ / COLLATION / DESSERT ═════════════════
        # 2 recettes par page
        for page_idx in range(3):
            num_label = f"0{page_idx+2} / 08"
            _rec_new_page(story, num_label)
            if page_idx == 0:
                _rec_title(story, "PETIT-DÉJEUNER.", "& COLLATION.")
                story.append(Spacer(1, 6*mm))
            rec1 = recettes_pd[page_idx*2]
            rec2 = recettes_pd[page_idx*2 + 1]
            story.append(_recette_card(*rec1))
            story.append(Spacer(1, 4*mm))
            story.append(_recette_card(*rec2))

        # ═══════ PAGES 5-7 — PLATS PRINCIPAUX ════════════════════════════════
        for page_idx in range(3):
            num_label = f"0{page_idx+5} / 08"
            _rec_new_page(story, num_label)
            if page_idx == 0:
                _rec_title(story, "PLATS", "PRINCIPAUX.")
                story.append(Spacer(1, 6*mm))
            rec1 = recettes_plats[page_idx*2]
            rec2 = recettes_plats[page_idx*2 + 1]
            story.append(_recette_card(*rec1))
            story.append(Spacer(1, 4*mm))
            story.append(_recette_card(*rec2))

        # ═══════ PAGE 8 — TABLEAU ÉQUIVALENCES ═══════════════════════════════
        _rec_new_page(story, "08 / 08")
        _rec_title(story, "TABLEAU DES", "ÉQUIVALENCES.")
        story.append(Spacer(1, 5*mm))

        story.append(Paragraph(
            "Pour 100 g d'un aliment de référence, voici les équivalences "
            "en glucides et protéines. Varie sans avoir à tout recalculer.",
            NS_lead))

        story.append(Spacer(1, 4*mm))

        # Tableau glucides
        story.append(Paragraph("·  GLUCIDES (100 g de référence)", NS_section_h))
        glu_data = [
            ["RÉFÉRENCE", "ÉQUIVALENT 1", "ÉQUIVALENT 2"],
            ["100 g Riz basmati", "60 g Pain complet", "90 g Pâtes"],
            ["100 g Pâtes complètes", "150 g Pomme de terre", "150 g Patate douce"],
            ["100 g Pomme de terre", "70 g Riz basmati", "60 g Pâtes"],
            ["100 g Patate douce", "70 g Riz basmati", "60 g Pâtes"],
        ]
        glu_t = Table(glu_data, colWidths=[60*mm, 52*mm, 52*mm])
        glu_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), CYAN_DARK),
            ('TEXTCOLOR', (0,0), (-1,0), BLANC),
            ('FONTNAME', (0,0), (-1,0), 'Inter-Black'),
            ('FONTSIZE', (0,0), (-1,0), 8.5),
            ('FONTNAME', (0,1), (0,-1), 'Inter-Bold'),
            ('FONTNAME', (1,1), (-1,-1), 'Inter-Reg'),
            ('FONTSIZE', (0,1), (-1,-1), 9.5),
            ('TEXTCOLOR', (0,1), (0,-1), CYAN_DARK),
            ('TEXTCOLOR', (1,1), (-1,-1), NOIR),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [PAPIER_2, HexColor('#EAE6DA')]),
        ]))
        story.append(glu_t)
        story.append(Spacer(1, 5*mm))

        # Tableau protéines
        story.append(Paragraph("·  PROTÉINES (apport équivalent)", NS_section_h))
        prot_data = [
            ["RÉFÉRENCE", "ÉQUIVALENT 1", "ÉQUIVALENT 2"],
            ["100 g Poulet", "100 g Dinde", "100 g Filet de bœuf"],
            ["100 g Saumon", "110 g Cabillaud", "80 g Thon"],
            ["100 g Viande rouge", "100 g Poulet", "3 œufs"],
            ["100 g Tofu ferme", "150 g Lentilles cuites", "180 g Pois chiches cuits"],
        ]
        prot_t = Table(prot_data, colWidths=[60*mm, 52*mm, 52*mm])
        prot_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), CYAN_DARK),
            ('TEXTCOLOR', (0,0), (-1,0), BLANC),
            ('FONTNAME', (0,0), (-1,0), 'Inter-Black'),
            ('FONTSIZE', (0,0), (-1,0), 8.5),
            ('FONTNAME', (0,1), (0,-1), 'Inter-Bold'),
            ('FONTNAME', (1,1), (-1,-1), 'Inter-Reg'),
            ('FONTSIZE', (0,1), (-1,-1), 9.5),
            ('TEXTCOLOR', (0,1), (0,-1), CYAN_DARK),
            ('TEXTCOLOR', (1,1), (-1,-1), NOIR),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [PAPIER_2, HexColor('#EAE6DA')]),
        ]))
        story.append(prot_t)

        story.append(Spacer(1, 5*mm))
        story.append(_a_retenir([
            "1.8-2.2 g de protéines / kg de poids. 4-6 g de glucides / kg les jours d'entraînement.",
            "Mange dans l'heure post-séance. Protéines + glucides obligatoires.",
            "3 L d'eau / jour + sel naturel. L'hydratation pèse 30 % de ta performance.",
            "Sommeil 8h. Sans sommeil, la nutrition la plus parfaite ne sert à rien.",
        ]))

        # Retour au template chapter pour la suite
        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION INTRO — 4 pages magazine premium
    # Texte verbatim du Word, présentation milliardaire
    # ─────────────────────────────────────────────────────────────────────────

    IS_eyebrow = ParagraphStyle('is_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    IS_eyebrow_r = ParagraphStyle('is_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _intro_header(story, num_label, narrow=False):
        if narrow:
            eb_r_n = ParagraphStyle('is_ebr_n', fontName='Inter-Black', fontSize=20,
                                      textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                      leading=22)
            t = Table(
                [[Paragraph("·  INTRODUCTION", IS_eyebrow), Paragraph(num_label, eb_r_n)]],
                colWidths=[52*mm, 40*mm])
        else:
            t = Table(
                [[Paragraph("·  INTRODUCTION", IS_eyebrow),
                  Paragraph(num_label, IS_eyebrow_r)]],
                colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _intro_new_page(story, num_label, first=False, photo=False):
        target = 'nutrition_photo' if photo else 'light_full'
        if not first:
            story.append(NextPageTemplate(target))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _intro_header(story, num_label, narrow=photo)

    def _intro_title(story, line1, line2=None, line3=None, narrow=False):
        size = 26 if narrow else 36
        lead = 30 if narrow else 40
        s1 = ParagraphStyle('is_t1', fontName='Inter-Black', fontSize=size, leading=lead,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('is_t2', fontName='Inter-Black', fontSize=size, leading=lead,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))
        if line3:
            story.append(Paragraph(line3, s2))

    def build_intro_section(story):
        """4 pages magazine premium pour l'Intro. Texte verbatim, présentation milliardaire."""

        # ═══════ PAGE 1/4 — BIENVENUE + PARCOURS (pleine largeur + bandeau) ══
        _intro_new_page(story, "01 / 04", first=True, photo=False)
        _intro_title(story, "BIENVENUE", "CHEZ RB PERFORM.")
        story.append(Spacer(1, 10*mm))

        is_sec_lbl = ParagraphStyle('is_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        narrative_style = ParagraphStyle('is_nar', fontName='Inter-Med', fontSize=12,
                                            textColor=NOIR, alignment=TA_LEFT, leading=17,
                                            spaceAfter=8)
        body_p1 = ParagraphStyle('is_bp1', fontName='Inter-Reg', fontSize=11,
                                    textColor=NOIR, alignment=TA_LEFT, leading=16,
                                    spaceAfter=8)

        story.append(Paragraph(
            "Je m'appelle <b>Rayan Bonte</b>. Rugbyman XIII semi-pro au SOA, "
            "athlète, titulaire du <b>CQP ALS</b>, passionné par la performance physique.",
            narrative_style))
        story.append(Spacer(1, 4*mm))

        story.append(Paragraph(
            "Le sport, je le pratique depuis toujours. J'ai eu la chance de "
            "côtoyer de nombreux athlètes de haut niveau et de tester sur le "
            "terrain les méthodes d'entraînement les plus avancées de la prépa "
            "physique moderne.",
            body_p1))

        story.append(Spacer(1, 6*mm))

        story.append(Paragraph("·  MA MISSION", is_sec_lbl))
        story.append(Paragraph(
            "T'accompagner vers la meilleure version de toi-même, avec des "
            "méthodes d'entraînement qui marchent vraiment. Te partager ma "
            "passion et ma vision de l'entraînement, le plaisir de se "
            "dépasser au quotidien.", narrative_style))

        story.append(Spacer(1, 8*mm))

        # Disclaimer subtil
        discl = ParagraphStyle('is_dscl', fontName='Inter-Reg', fontSize=9,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)
        story.append(Paragraph(
            "Tous les conseils donnés ici ne sont en aucun cas des conseils "
            "médicaux. Ils sont basés sur ma qualification CQP ALS, mon "
            "expérience d'athlète et le contact avec des préparateurs "
            "physiques du sport de haut niveau.", discl))

        story.append(Spacer(1, 10*mm))
        # Bandeau photo bas — Rayan en action / portrait paysage
        story.append(_photo_bandeau(NUT_IMG_DIR / "intro-rayan-bio.jpg",
                                      "PHOTO RAYAN — PORTRAIT PAYSAGE / EN ACTION"))

        # ═══════ PAGE 2/4 — POURQUOI TU ES LÀ (pleine largeur) ══════════════
        _intro_new_page(story, "02 / 04")
        _intro_title(story, "POURQUOI", "TU ES LÀ.")
        story.append(Spacer(1, 10*mm))

        # Quote hero XL — éditorial premium
        quote_style = ParagraphStyle('is_q', fontName='Inter-Black', fontSize=22,
                                       leading=28, textColor=CYAN_DARK, alignment=TA_LEFT,
                                       leftIndent=14, rightIndent=0)
        q_t = Table([[Paragraph(
            "« Si tu lis ce programme, c'est que tu as fait le <b>premier pas</b> "
            "vers ton objectif. Le premier pas vers le changement. »",
            quote_style)]], colWidths=[164*mm])
        q_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t)
        story.append(Spacer(1, 14*mm))

        story.append(Paragraph("·  QUEL EST TON PROFIL ?", is_sec_lbl))
        story.append(Spacer(1, 8*mm))

        # 4 profils en grille 2x2 — formulation 2e personne, voix Rayan
        profils = [
            ("01", "TU VEUX DOMINER LE TERRAIN",
             "Être meilleur que ton adversaire — et c'est ça qui doit te motiver chaque jour."),
            ("02", "TU VEUX TE DÉPASSER",
             "Devenir un meilleur athlète, jour après jour. Pas de plateau, pas de stagnation."),
            ("03", "TU EN AS MARRE",
             "Marre de ton physique, de tes habitudes actuelles. Tu te trouves pas assez performant."),
            ("04", "TU ES AU BON ENDROIT",
             "Quel que soit ton point de départ. Je vais t'expliquer ce qui fera la différence."),
        ]
        n_p_st = ParagraphStyle('is_pn', fontName='Inter-Black', fontSize=22,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                                  spaceAfter=2)
        ct_p_st = ParagraphStyle('is_pt', fontName='Inter-Black', fontSize=11,
                                   textColor=NOIR, alignment=TA_LEFT, spaceAfter=4, leading=14)
        cb_p_st = ParagraphStyle('is_pb', fontName='Inter-Reg', fontSize=9.5,
                                   textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)

        cells = []
        for num, title, body in profils:
            cells.append([Paragraph(num, n_p_st),
                          Paragraph(title, ct_p_st),
                          Paragraph(body, cb_p_st)])

        grid = Table(
            [[cells[0], cells[1]],
             [cells[2], cells[3]]],
            colWidths=[80*mm, 80*mm], rowHeights=[55*mm, 55*mm])
        grid.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ('LINEBEFORE', (1,0), (1,-1), 3, CYAN_DARK),
        ]))
        story.append(grid)

        # ═══════ PAGE 3/4 — FIXE TES OBJECTIFS (pleine largeur) ══════════════
        _intro_new_page(story, "03 / 04")
        _intro_title(story, "FIXE TES", "OBJECTIFS.")
        story.append(Spacer(1, 10*mm))

        # Quote hero
        q_t2 = Table([[Paragraph(
            "« Premier conseil — et il vaut de l'or : fixe-toi des objectifs clairs. "
            "Sur 1 mois. Sur 3 mois. Sur 6 mois. Sur 1 an. »",
            quote_style)]], colWidths=[164*mm])
        q_t2.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t2)
        story.append(Spacer(1, 10*mm))

        expl_style = ParagraphStyle('is_e', fontName='Inter-Reg', fontSize=10,
                                      textColor=GRIS_DARK, alignment=TA_JUSTIFY,
                                      leading=14, spaceAfter=12)
        story.append(Paragraph(
            "Chaque petite réussite compte. Perdre 500 g quand tu veux en perdre 10 "
            "te rapproche de ton objectif. Gagner 2 cm de vertical quand tu veux en "
            "gagner 10, pareil. Savoure chaque étape et tire-en encore plus de motivation.",
            expl_style))

        story.append(Paragraph("·  ÉCRIS-LES MAINTENANT", is_sec_lbl))
        story.append(Spacer(1, 4*mm))

        template_data = [
            ["1 MOIS", "_________________________________________________"],
            ["3 MOIS", "_________________________________________________"],
            ["6 MOIS", "_________________________________________________"],
            ["1 AN",   "_________________________________________________"],
        ]
        template_t = Table(template_data, colWidths=[26*mm, 138*mm])
        template_t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Inter-Black'),
            ('FONTNAME', (1,0), (1,-1), 'Inter-Reg'),
            ('FONTSIZE', (0,0), (-1,-1), 11),
            ('TEXTCOLOR', (0,0), (0,-1), CYAN_DARK),
            ('TEXTCOLOR', (1,0), (1,-1), HexColor('#C5C0B5')),
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
            ('TOPPADDING', (0,0), (-1,-1), 11),
            ('BOTTOMPADDING', (0,0), (-1,-1), 11),
            ('LINEBELOW', (0,0), (-1,-1), 0.3, HexColor('#D8D3C5')),
        ]))
        story.append(template_t)
        story.append(Spacer(1, 10*mm))

        # CTA finale
        cta_style = ParagraphStyle('is_cta', fontName='Inter-Med', fontSize=10.5,
                                     textColor=NOIR, alignment=TA_LEFT, leading=15,
                                     leftIndent=14, borderPadding=(12, 14, 12, 14),
                                     backColor=HexColor('#EEF9F7'))
        cta_t = Table([[Paragraph(
            "<b><font color='#00A38F'>FAIS-LE.</font></b>  Prends une feuille, un stylo, "
            "ou tes notes de téléphone. Écris au minimum 3 objectifs pour les "
            "échéances ci-dessus. <b>Avant de continuer.</b>",
            cta_style)]], colWidths=[164*mm])
        cta_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(cta_t)

        # ═══════ PAGE 4/4 — CE QUE TU VAS APPRENDRE (photo droite) ══════════
        _intro_new_page(story, "04 / 04", photo=True)
        _intro_title(story, "CE QUE TU VAS", "APPRENDRE.", narrow=True)
        story.append(Spacer(1, 8*mm))

        intro_p4 = ParagraphStyle('is_i4', fontName='Inter-Med', fontSize=10,
                                    textColor=GRIS_DARK, alignment=TA_LEFT, leading=14,
                                    spaceAfter=8)
        story.append(Paragraph(
            "Tout ce que j'ai accumulé pendant des années sur l'entraînement "
            "athlétique. Je vais t'éviter de perdre le temps que j'ai perdu — "
            "à chercher, à tester, à me tromper.", intro_p4))
        story.append(Spacer(1, 6*mm))

        promesses = [
            ("01", "Comprendre pourquoi un athlète ne s'entraîne pas comme un bodybuilder."),
            ("02", "Maîtriser les concepts clés : force, puissance, vitesse, pliométrie."),
            ("03", "ATHLÈTE 90 : programme 12 semaines, 6 séances/sem (4 muscu + 2 course), 72 séances, vidéos par exo."),
            ("04", "Une routine nutrition et compléments adaptée à un athlète."),
            ("05", "Les clés de la mobilité et de la récupération pour être performant."),
            ("06", "Le mindset qui sépare ceux qui finissent de ceux qui abandonnent."),
        ]
        pn_st = ParagraphStyle('is_pn4', fontName='Inter-Black', fontSize=13,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=15)
        pb_st = ParagraphStyle('is_pb4', fontName='Inter-Med', fontSize=9.5,
                                 textColor=NOIR, alignment=TA_LEFT, leading=13)
        for num, body in promesses:
            row = Table([[Paragraph(num, pn_st), Paragraph(body, pb_st)]],
                        colWidths=[12*mm, 80*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        # Phrase finale punch
        story.append(Spacer(1, 8*mm))
        final_style = ParagraphStyle('is_fin', fontName='Inter-Bold', fontSize=10,
                                       textColor=CYAN_DARK, alignment=TA_LEFT, leading=14)
        story.append(Paragraph(
            "Pas juste un programme. La <i>compréhension complète</i> de pourquoi "
            "tu fais chaque chose.", final_style))

        # QR vidéo présentation
        story.append(Spacer(1, 8*mm))
        story.append(_qr_block(
            "https://rb-perform.com/intro-video",
            "SCAN VIDÉO", "Présentation de l'ebook.",
            size_mm=22))

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION BODYBUILDER VS ATHLÈTE — 3 pages magazine premium
    # Texte verbatim du Word, présentation milliardaire
    # ─────────────────────────────────────────────────────────────────────────

    BB_eyebrow = ParagraphStyle('bb_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    BB_eyebrow_r = ParagraphStyle('bb_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _bb_header(story, num_label):
        t = Table(
            [[Paragraph("·  BODYBUILDER vs ATHLÈTE", BB_eyebrow),
              Paragraph(num_label, BB_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _bb_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _bb_header(story, num_label)

    def _bb_title(story, line1, line2=None):
        s1 = ParagraphStyle('bb_t1', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('bb_t2', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_bodybuilder_section(story):
        """3 pages magazine — Bodybuilder vs Athlète. Texte verbatim, mise en page premium."""

        # ═══════ PAGE 1/3 — HERO COMPARATIF SPLIT ═════════════════════════════
        _bb_new_page(story, "01 / 03", first=True)
        _bb_title(story, "LA DIFFÉRENCE :", "LES OBJECTIFS.")
        story.append(Spacer(1, 10*mm))

        # Quote hook
        hook_style = ParagraphStyle('bb_hook', fontName='Inter-Med', fontSize=14,
                                      leading=20, textColor=NOIR, alignment=TA_LEFT,
                                      leftIndent=14, rightIndent=0)
        q_t = Table([[Paragraph(
            "« Un athlète ne s'entraîne <b>PAS</b> comme un bodybuilder. "
            "C'est le piège n°1 des athlètes amateurs : ils copient les "
            "programmes qu'ils voient en salle, et finissent forts en salle... "
            "<b>mais lents sur le terrain</b>. »",
            hook_style)]], colWidths=[164*mm])
        q_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t)
        story.append(Spacer(1, 14*mm))

        # Split 2 cols comparatif
        bb_sec_lbl = ParagraphStyle('bb_sl', fontName='Inter-Bold', fontSize=9,
                                       textColor=CYAN_DARK, alignment=TA_LEFT,
                                       spaceAfter=8, leading=11)
        story.append(Spacer(1, 4*mm))

        col_lbl_g = ParagraphStyle('bb_clg', fontName='Inter-Black', fontSize=10,
                                     textColor=GRIS_DARK, alignment=TA_LEFT, leading=12,
                                     spaceAfter=6)
        col_lbl_c = ParagraphStyle('bb_clc', fontName='Inter-Black', fontSize=10,
                                     textColor=CYAN_DARK, alignment=TA_LEFT, leading=12,
                                     spaceAfter=6)
        col_title = ParagraphStyle('bb_ct', fontName='Inter-Black', fontSize=20,
                                     textColor=NOIR, alignment=TA_LEFT, leading=22,
                                     spaceAfter=10)
        col_h = ParagraphStyle('bb_ch', fontName='Inter-Bold', fontSize=9,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                                spaceAfter=3)
        col_v = ParagraphStyle('bb_cv', fontName='Inter-Reg', fontSize=10,
                                textColor=NOIR, alignment=TA_LEFT, leading=14,
                                spaceAfter=8)

        left_col = [
            Paragraph("CÔTÉ MIROIR", col_lbl_g),
            Paragraph("BODYBUILDER", col_title),
            Paragraph("OBJECTIF", col_h),
            Paragraph("S'entraîner pour son physique. Le reflet dans le miroir. Trouver une harmonie visuelle.", col_v),
            Paragraph("APPROCHE", col_h),
            Paragraph("Isoler chaque muscle, le faire grossir séparément.", col_v),
            Paragraph("RÉSULTAT", col_h),
            Paragraph("Beau en salle. Raide sur le terrain.", col_v),
        ]
        right_col = [
            Paragraph("CÔTÉ TERRAIN", col_lbl_c),
            Paragraph("ATHLÈTE", col_title),
            Paragraph("OBJECTIFS", col_h),
            Paragraph("Être performant sur le terrain (rapide, fort, explosif, endurant) et limiter les blessures sur la saison.", col_v),
            Paragraph("APPROCHE", col_h),
            Paragraph("Optimiser la coordination musculaire et neuronale, utiliser l'ensemble du corps.", col_v),
            Paragraph("RÉSULTAT", col_h),
            Paragraph("Efficacité totale en mouvement. Endurance saison.", col_v),
        ]
        split_t = Table([[left_col, right_col]], colWidths=[80*mm, 80*mm])
        split_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (0,-1), PAPIER_2),
            ('BACKGROUND', (1,0), (1,-1), HexColor('#EEF9F7')),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ]))
        story.append(split_t)

        # ═══════ PAGE 2/3 — LE PROBLÈME DE L'ISOLATION ════════════════════════
        _bb_new_page(story, "02 / 03")
        _bb_title(story, "LE PROBLÈME", "DE L'ISOLATION.")
        story.append(Spacer(1, 10*mm))

        body_p2 = ParagraphStyle('bb_b2', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=10)
        story.append(Paragraph(
            "Le bodybuilder se fout d'être fonctionnel. Il veut être beau. "
            "Il isole chaque muscle, les travaille séparément. Résultat : à long "
            "terme, problème de coordination entre les groupes musculaires.",
            body_p2))
        story.append(Paragraph(
            "T'as déjà vu Chris Bumstead courir ? Si oui, tu sais : il est raide, "
            "ça paraît pas naturel. Pourquoi ? Parce que ses muscles n'ont jamais "
            "appris à travailler ensemble.",
            body_p2))

        story.append(Spacer(1, 8*mm))

        # Pull quote magazine
        pull_quote = ParagraphStyle('bb_pq', fontName='Inter-Black', fontSize=18,
                                      textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                                      leftIndent=14)
        pq_t = Table([[Paragraph(
            "« L'entraînement athlétique cherche exactement l'inverse : "
            "optimiser la <b>coordination</b> musculaire et neuronale. »",
            pull_quote)]], colWidths=[164*mm])
        pq_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(pq_t)
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Être capable d'utiliser l'<b>ensemble de son corps</b> de la façon "
            "la plus efficace possible. C'est ça la première grande différence. "
            "Et c'est ça qui change tout sur le terrain.",
            body_p2))

        story.append(Spacer(1, 10*mm))

        # Visualisation simple : 2 boxes opposition
        story.append(Paragraph("·  EN UNE IMAGE", bb_sec_lbl))
        story.append(Spacer(1, 4*mm))

        opp_lbl_g = ParagraphStyle('bb_olg', fontName='Inter-Bold', fontSize=9,
                                     textColor=GRIS_DARK, alignment=TA_CENTER, leading=11)
        opp_lbl_c = ParagraphStyle('bb_olc', fontName='Inter-Bold', fontSize=9,
                                     textColor=BLANC, alignment=TA_CENTER, leading=11)
        opp_h_g = ParagraphStyle('bb_ohg', fontName='Inter-Black', fontSize=16,
                                   textColor=NOIR, alignment=TA_CENTER, leading=20,
                                   spaceAfter=3, spaceBefore=4)
        opp_h_c = ParagraphStyle('bb_ohc', fontName='Inter-Black', fontSize=16,
                                   textColor=BLANC, alignment=TA_CENTER, leading=20,
                                   spaceAfter=3, spaceBefore=4)
        opp_v_g = ParagraphStyle('bb_ovg', fontName='Inter-Med', fontSize=9.5,
                                   textColor=GRIS_DARK, alignment=TA_CENTER, leading=13)
        opp_v_c = ParagraphStyle('bb_ovc', fontName='Inter-Med', fontSize=9.5,
                                   textColor=HexColor('#A8E5DC'), alignment=TA_CENTER, leading=13)

        box_l = [Paragraph("BODYBUILDER", opp_lbl_g),
                  Paragraph("MUSCLES ISOLÉS", opp_h_g),
                  Paragraph("Chaque groupe travaille seul.<br/>Pas de coordination globale.", opp_v_g)]
        box_r = [Paragraph("ATHLÈTE", opp_lbl_c),
                  Paragraph("MUSCLES SYNCHRO", opp_h_c),
                  Paragraph("Tout le corps travaille ensemble.<br/>Force projetée efficacement.", opp_v_c)]

        opp_t = Table([[box_l, box_r]], colWidths=[80*mm, 80*mm])
        opp_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (0,-1), PAPIER_2),
            ('BACKGROUND', (1,0), (1,-1), CYAN_DARK),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ]))
        story.append(opp_t)

        # ═══════ PAGE 3/3 — 3 PIÈGES À ÉVITER ═════════════════════════════════
        _bb_new_page(story, "03 / 03")
        _bb_title(story, "TROIS PIÈGES", "À ÉVITER.")
        story.append(Spacer(1, 10*mm))

        intro_p3 = ParagraphStyle('bb_i3', fontName='Inter-Reg', fontSize=10.5,
                                    textColor=GRIS_DARK, alignment=TA_LEFT, leading=15,
                                    spaceAfter=12)
        story.append(Paragraph(
            "Pendant des années, j'ai vu (et fait) les mêmes erreurs. Je te "
            "préviens d'avance.", intro_p3))

        pieges = [
            ("01",
             "CROIRE QUE PLUS TU ES MUSCLÉ, PLUS TU SERAS FORT SUR LE TERRAIN.",
             "Faux. Les films de superhéros nous ont vendu l'idée que les mecs les plus massifs sont toujours les meilleurs. Dans la réalité : la force et le poids comptent, mais une force mal utilisée ne vaut rien sur le terrain.",
             "La technique, la coordination, la vitesse passent souvent avant."),
            ("02",
             "EN FAIRE TROP. TROP DE TOUT.",
             "Trop de sprints, trop de vitesse, trop de muscu, en pensant que plus tu en fais, meilleur tu deviens.",
             "La progression vient du dosage et de la récupération, pas de l'accumulation."),
            ("03",
             "PASSER TROP DE TEMPS EN SALLE.",
             "Au détriment de la technique et de la pratique du sport. La muscu, c'est un OUTIL au service du sport. Pas un sport en soi (sauf si tu fais du powerlifting).",
             "Si tu sors de salle épuisé et que tu loupes ton entraînement technique de rugby, t'as fait l'inverse de ce qui marche."),
        ]

        pn_st = ParagraphStyle('bb_pn', fontName='Inter-Black', fontSize=26,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=28,
                                 spaceAfter=4)
        pt_st = ParagraphStyle('bb_pt', fontName='Inter-Black', fontSize=13,
                                 textColor=NOIR, alignment=TA_LEFT, leading=16,
                                 spaceAfter=6)
        pb_st = ParagraphStyle('bb_pb', fontName='Inter-Reg', fontSize=9.5,
                                 textColor=NOIR, alignment=TA_LEFT, leading=13,
                                 spaceAfter=6)
        pc_st = ParagraphStyle('bb_pc', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=13)

        for num, title, body, correction in pieges:
            cell = [
                Paragraph(num, pn_st),
                Paragraph(title, pt_st),
                Paragraph(body, pb_st),
                Paragraph(f"→ {correction}", pc_st),
            ]
            t = Table([[cell]], colWidths=[164*mm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 12),
                ('BOTTOMPADDING', (0,0), (-1,-1), 12),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(t)
            story.append(Spacer(1, 6*mm))

        # Punch finale
        punch_style = ParagraphStyle('bb_punch', fontName='Inter-Bold', fontSize=11,
                                       textColor=CYAN_DARK, alignment=TA_LEFT, leading=14)
        story.append(Paragraph(
            "Garde ces 3 pièges en tête. On va construire le programme pour les éviter.",
            punch_style))

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION L'ENTRAÎNEMENT ATHLÉTIQUE — 7 pages magazine premium
    # Texte verbatim du Word, photos par catégorie
    # ─────────────────────────────────────────────────────────────────────────

    EA_eyebrow = ParagraphStyle('ea_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    EA_eyebrow_r = ParagraphStyle('ea_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _ea_header(story, num_label, narrow=False):
        if narrow:
            eb_r_n = ParagraphStyle('ea_ebr_n', fontName='Inter-Black', fontSize=20,
                                      textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                      leading=22)
            t = Table(
                [[Paragraph("·  ATHLÉTIQUE", EA_eyebrow), Paragraph(num_label, eb_r_n)]],
                colWidths=[52*mm, 40*mm])
        else:
            t = Table(
                [[Paragraph("·  L'ENTRAÎNEMENT ATHLÉTIQUE", EA_eyebrow),
                  Paragraph(num_label, EA_eyebrow_r)]],
                colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _ea_new_page(story, num_label, first=False, photo=False):
        target = 'nutrition_photo' if photo else 'light_full'
        if not first:
            story.append(NextPageTemplate(target))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _ea_header(story, num_label, narrow=photo)

    def _ea_title(story, line1, line2=None, line3=None, narrow=False):
        size = 26 if narrow else 36
        lead = 30 if narrow else 40
        s1 = ParagraphStyle('ea_t1', fontName='Inter-Black', fontSize=size, leading=lead,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('ea_t2', fontName='Inter-Black', fontSize=size, leading=lead,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))
        if line3:
            story.append(Paragraph(line3, s2))

    def _crop_to_ratio_if_needed(src_path, target_ratio, tolerance=0.05):
        """Si l'image src n'est pas au bon ratio, crop center vers le ratio cible.
        Retourne le path d'origine ou d'un fichier temporaire croppé."""
        import tempfile, hashlib
        from PIL import Image as _PIL_Image
        im = _PIL_Image.open(str(src_path))
        w, h = im.size
        src_ratio = w / h
        if abs(src_ratio - target_ratio) / target_ratio < tolerance:
            return src_path  # déjà au bon ratio
        # Crop center pour matcher le ratio
        if src_ratio > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            box = (left, 0, left + new_w, h)
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            box = (0, top, w, top + new_h)
        cropped = im.crop(box)
        # Cache temp file par hash pour éviter recrop à chaque build
        key = f"{src_path.stem}_{int(target_ratio*100)}_{w}x{h}.jpg"
        tmpdir = Path(tempfile.gettempdir()) / "rb-perform-crops"
        tmpdir.mkdir(exist_ok=True)
        out_path = tmpdir / key
        if not out_path.exists():
            if cropped.mode != 'RGB':
                cropped = cropped.convert('RGB')
            cropped.save(str(out_path), 'JPEG', quality=90)
        return out_path

    def _photo_bandeau(path, label="PHOTO", w_mm=164, h_mm=38):
        """Bandeau photo horizontal pleine largeur (RLImage ou placeholder discret).
        Si l'image source ne match pas le ratio cible, crop center auto via PIL."""
        if path and path.is_file():
            try:
                target_ratio = w_mm / h_mm
                cropped_path = _crop_to_ratio_if_needed(path, target_ratio)
                return RLImage(str(cropped_path), width=w_mm*mm, height=h_mm*mm)
            except Exception:
                pass
        ph = Table([[""]], colWidths=[w_mm*mm], rowHeights=[h_mm*mm])
        ph.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#E8E4D8')),
        ]))
        return ph

    def _photo_split_2(left_path, right_path, left_label="PHOTO GAUCHE",
                       right_label="PHOTO DROITE", w_mm=164, h_mm=70):
        """Split 2 photos côte à côte (RLImage ou placeholders)."""
        col_w = (w_mm - 2) / 2  # 1mm gap entre les 2
        def _make_cell(path, label):
            if path and path.is_file():
                try:
                    return RLImage(str(path), width=col_w*mm, height=h_mm*mm,
                                    kind='proportional')
                except Exception:
                    pass
            ph = Table([[""]], colWidths=[col_w*mm], rowHeights=[h_mm*mm])
            ph.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), HexColor('#E8E4D8')),
            ]))
            return ph
        cells = Table([[_make_cell(left_path, left_label),
                        _make_cell(right_path, right_label)]],
                       colWidths=[col_w*mm, col_w*mm])
        cells.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (0,0), 1),
            ('LEFTPADDING', (1,0), (1,0), 1),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        return cells

    def build_entrainement_athletique_section(story):
        """7 pages magazine — L'entraînement athlétique."""

        ea_sec_lbl = ParagraphStyle('ea_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        ea_body = ParagraphStyle('ea_b', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=8)
        ea_body_n = ParagraphStyle('ea_bn', fontName='Inter-Reg', fontSize=10,
                                     textColor=NOIR, alignment=TA_LEFT, leading=14,
                                     spaceAfter=6)
        ea_pull = ParagraphStyle('ea_pq', fontName='Inter-Black', fontSize=18,
                                   textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                                   leftIndent=14)

        # ═══════ PAGE 1/7 — RÈGLE DES 3 EFFORTS ═══════════════════════════════
        _ea_new_page(story, "01 / 07", first=True)
        _ea_title(story, "FORCE, PUISSANCE,", "VITESSE.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Ces trois mots sont mélangés tout le temps. Dommage — ils décrivent "
            "trois qualités différentes, et tu travailles chacune avec des "
            "<b>méthodes différentes</b>. La méthode la plus simple pour s'y "
            "retrouver : penser en <b>types d'effort</b>, pas en termes scientifiques.",
            ea_body))

        story.append(Spacer(1, 8*mm))

        # 3 efforts en cards horizontales
        ef_lbl = ParagraphStyle('ea_el', fontName='Inter-Bold', fontSize=8.5,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=10,
                                  spaceAfter=4)
        ef_title = ParagraphStyle('ea_et', fontName='Inter-Black', fontSize=13,
                                    textColor=NOIR, alignment=TA_LEFT, leading=15,
                                    spaceAfter=4)
        ef_body = ParagraphStyle('ea_eb_b', fontName='Inter-Reg', fontSize=9.5,
                                   textColor=NOIR, alignment=TA_LEFT, leading=13,
                                   spaceAfter=4)
        ef_out = ParagraphStyle('ea_eo', fontName='Inter-Bold', fontSize=9.5,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=12)

        efforts = [
            ("01", "EFFORT MAXIMAL", "85-100% du 1RM, 1-5 reps.",
             "→ Construit la FORCE pure."),
            ("02", "EFFORT DYNAMIQUE", "≤ 70% du 1RM avec intention de vitesse maximale.",
             "→ Construit la PUISSANCE et la VITESSE."),
            ("03", "EFFORT RÉPÉTÉ", "70-85%, beaucoup de reps près de l'échec.",
             "→ Construit la MASSE et l'endurance de force."),
        ]
        cells = []
        for num, title, body, out in efforts:
            cell = [Paragraph(num, ef_lbl), Paragraph(title, ef_title),
                    Paragraph(body, ef_body), Paragraph(out, ef_out)]
            cells.append(cell)
        eff_t = Table([cells], colWidths=[54*mm, 54*mm, 56*mm])
        eff_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (1,0), (1,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(eff_t)
        story.append(Spacer(1, 12*mm))

        # Pull quote
        pq_t = Table([[Paragraph(
            "« Quand t'es faible, deviens <b>fort</b>. Quand t'es fort, "
            "deviens <b>rapide</b>. Quand t'es rapide, apprends à <b>répéter</b>. »",
            ea_pull)]], colWidths=[164*mm])
        pq_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(pq_t)
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "Un athlète sérieux doit faire <b>les trois</b> dans l'année, "
            "en périodisant. Mais il ne doit <b>jamais arrêter</b> de "
            "travailler une faculté — il gère juste le <b>volume</b> selon "
            "la phase.", ea_body))

        # ═══════ PAGE 2/7 — LE SPECTRE FORCE-VITESSE ══════════════════════════
        _ea_new_page(story, "02 / 07")
        _ea_title(story, "LE SPECTRE", "FORCE-VITESSE.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Voici une vérité physique que personne ne peut contourner.", ea_body))

        story.append(Spacer(1, 6*mm))

        verites = [
            ("PLUS C'EST LOURD",
             "Plus tu déplaces la charge lentement. Ta force max est mobilisée."),
            ("PLUS C'EST LÉGER",
             "Plus tu peux déplacer la charge vite. Ta puissance et vitesse s'expriment."),
        ]
        v_lbl = ParagraphStyle('ea_vl', fontName='Inter-Black', fontSize=12,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=14,
                                 spaceAfter=6)
        v_body = ParagraphStyle('ea_vb', fontName='Inter-Reg', fontSize=10,
                                  textColor=NOIR, alignment=TA_LEFT, leading=14)
        v_cells = []
        for title, body in verites:
            v_cells.append([Paragraph(title, v_lbl), Paragraph(body, v_body)])
        v_t = Table([v_cells], colWidths=[82*mm, 82*mm])
        v_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(v_t)
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Entre les deux extrêmes, il existe un <b>continuum</b>. Pour un "
            "sport collectif comme le rugby, tu dois être bon <b>partout</b> "
            "sur ce spectre. Pas seulement fort. Pas seulement rapide. "
            "<b>Les deux.</b>", ea_body))

        story.append(Spacer(1, 8*mm))
        story.append(Paragraph("·  LE CONTINUUM EN UN COUP D'ŒIL", ea_sec_lbl))
        story.append(Spacer(1, 4*mm))

        # Visual gradient bar — 4 zones du spectre
        zones_spectre = [
            ("FORCE MAX", "85-100 % 1RM", "1-5 reps", HexColor('#00A38F')),
            ("PUISSANCE", "30-70 % 1RM", "intention max", HexColor('#02D1BA')),
            ("VITESSE", "0-30 % 1RM", "explosif", HexColor('#5EE0CF')),
            ("ENDURANCE", "< 30 % 1RM", "longue durée", HexColor('#A8E5DC')),
        ]
        sp_n = ParagraphStyle('sp_n', fontName='Inter-Black', fontSize=10.5,
                                textColor=BLANC, alignment=TA_CENTER, leading=12,
                                spaceAfter=4)
        sp_v = ParagraphStyle('sp_v', fontName='Inter-Bold', fontSize=8,
                                textColor=BLANC, alignment=TA_CENTER, leading=10,
                                spaceAfter=2)
        sp_d = ParagraphStyle('sp_d', fontName='Inter-Reg', fontSize=7.5,
                                textColor=HexColor('#F0FAF8'), alignment=TA_CENTER,
                                leading=10)
        sp_cells = []
        sp_styles = []
        for i, (name, val, desc, color) in enumerate(zones_spectre):
            sp_cells.append([
                Paragraph(name, sp_n),
                Paragraph(val, sp_v),
                Paragraph(desc, sp_d),
            ])
            sp_styles.append(('BACKGROUND', (i,0), (i,0), color))
        sp_t = Table([sp_cells], colWidths=[41*mm, 41*mm, 41*mm, 41*mm],
                      rowHeights=[26*mm])
        sp_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            *sp_styles,
        ]))
        story.append(sp_t)
        story.append(Spacer(1, 10*mm))

        # Bloc implications rugby
        impl_t = Table([[
            Paragraph(
                "<b><font color='#00A38F'>POUR UN RUGBYMAN.</font></b>  "
                "Tu sprintes (vitesse), tu plaques (force), tu enchaînes des "
                "phases de jeu (endurance), tu sautes en touche (puissance). "
                "Tu utilises les <b>4 zones</b> dans un match. Ta prépa "
                "doit toutes les travailler.",
                ParagraphStyle('impl_b', fontName='Inter-Med', fontSize=10.5,
                                textColor=NOIR, alignment=TA_LEFT, leading=15,
                                leftIndent=14, backColor=HexColor('#EEF9F7'),
                                borderPadding=(12, 14, 12, 14)))
        ]], colWidths=[164*mm])
        impl_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(impl_t)

        # ═══════ PAGE 3/7 — LA PUISSANCE (HERO FORMULE Hormozi) ═══════════════
        _ea_new_page(story, "03 / 07")
        _ea_title(story, "LA PUISSANCE.", "EN UNE ÉQUATION.")
        story.append(Spacer(1, 8*mm))

        # HERO ÉQUATION PUISSANCE = FORCE × VITESSE (compact)
        eq_lbl_s = ParagraphStyle('eq_lbl', fontName='Inter-Bold', fontSize=10,
                                    textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                                    spaceAfter=10, leading=12)
        eq_formula_s = ParagraphStyle('eq_f', fontName='Inter-Black', fontSize=40,
                                        textColor=BLANC, alignment=TA_CENTER,
                                        leading=44, spaceAfter=8)
        eq_sub_s = ParagraphStyle('eq_sub', fontName='Inter-Med', fontSize=10.5,
                                    textColor=HexColor('#EEF9F7'), alignment=TA_CENTER,
                                    leading=14)
        eq_inner = [
            Paragraph("LA FORMULE", eq_lbl_s),
            Paragraph("PUISSANCE  =  FORCE  ×  VITESSE", eq_formula_s),
            Paragraph("Deux joueurs squattent 120 kg. Celui qui le fait <b>plus vite</b> saute plus haut, sprinte plus vite, plaque plus fort.",
                       eq_sub_s),
        ]
        eq_box = Table([[eq_inner]], colWidths=[164*mm])
        eq_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 18),
            ('RIGHTPADDING', (0,0), (-1,-1), 18),
            ('TOPPADDING', (0,0), (-1,-1), 18),
            ('BOTTOMPADDING', (0,0), (-1,-1), 18),
        ]))
        story.append(eq_box)
        story.append(Spacer(1, 8*mm))

        # 2 leviers (compact)
        l_lbl = ParagraphStyle('p_ll', fontName='Inter-Black', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=12,
                                 spaceAfter=3)
        l_t = ParagraphStyle('p_lt', fontName='Inter-Black', fontSize=12,
                               textColor=NOIR, alignment=TA_LEFT, leading=14,
                               spaceAfter=4)
        l_b = ParagraphStyle('p_lb', fontName='Inter-Reg', fontSize=9.5,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)
        c1 = [Paragraph("LEVIER 01", l_lbl),
              Paragraph("MOUVEMENTS BALISTIQUES", l_t),
              Paragraph("Sauts, épaulés, lancers de medecine ball. "
                          "Tu ne décélères pas — tu projettes.", l_b)]
        c2 = [Paragraph("LEVIER 02", l_lbl),
              Paragraph("INTENTION DE VITESSE MAX", l_t),
              Paragraph("Même charge lourde — pousse comme si elle "
                          "était légère. C'est le facteur #1 de progression.", l_b)]
        leviers_t = Table([[c1, c2]], colWidths=[82*mm, 82*mm])
        leviers_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(leviers_t)
        story.append(Spacer(1, 5*mm))

        # STOP! erreur classique
        stop_s = ParagraphStyle('p_stop', fontName='Inter-Med', fontSize=10.5,
                                  textColor=NOIR, alignment=TA_LEFT, leading=15,
                                  leftIndent=14, borderPadding=(12, 14, 12, 14),
                                  backColor=HexColor('#EEF9F7'))
        stop_t = Table([[Paragraph(
            "<b><font color='#00A38F'>STOP.</font></b>  Squats à 60 % en mode "
            "\"je vais lentement pour faire propre\" = tu travailles autre "
            "chose que la puissance. <b>L'intention prime sur la charge.</b>",
            stop_s)]], colWidths=[164*mm])
        stop_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(stop_t)

        # ═══════ PAGE 4/7 — PLIOMÉTRIE (TIMELINE 3 ÉTAPES Hormozi) ════════════
        _ea_new_page(story, "04 / 07")
        _ea_title(story, "LA PLIOMÉTRIE.", "COMME UN RESSORT.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Quand tu atterris d'un saut, tes muscles s'étirent rapidement et "
            "<b>stockent de l'énergie élastique</b>. Si tu réagis "
            "immédiatement, tu la récupères. C'est le <b>cycle</b>.",
            ea_body))

        story.append(Spacer(1, 8*mm))

        # TIMELINE 3 ÉTAPES horizontales avec flèches
        step_n = ParagraphStyle('plio_n', fontName='Inter-Black', fontSize=24,
                                  textColor=CYAN_DARK, alignment=TA_CENTER, leading=26,
                                  spaceAfter=4)
        step_t = ParagraphStyle('plio_t', fontName='Inter-Black', fontSize=11,
                                  textColor=NOIR, alignment=TA_CENTER, leading=13,
                                  spaceAfter=4)
        step_b = ParagraphStyle('plio_b', fontName='Inter-Reg', fontSize=9,
                                  textColor=GRIS_DARK, alignment=TA_CENTER, leading=12)
        arrow_s = ParagraphStyle('plio_a', fontName='Inter-Black', fontSize=32,
                                   textColor=CYAN_DARK, alignment=TA_CENTER, leading=34)

        s1 = [Paragraph("01", step_n), Paragraph("ÉTIREMENT", step_t),
               Paragraph("Tu atterris.<br/>Muscles s'allongent vite.", step_b)]
        s2 = [Paragraph("02", step_n), Paragraph("STOCKAGE", step_t),
               Paragraph("Énergie élastique<br/>se charge dans le tissu.", step_b)]
        s3 = [Paragraph("03", step_n), Paragraph("RELÂCHEMENT", step_t),
               Paragraph("Tu rebondis.<br/>L'énergie est restituée.", step_b)]
        ar1 = [Spacer(1, 14*mm), Paragraph("→", arrow_s)]
        ar2 = [Spacer(1, 14*mm), Paragraph("→", arrow_s)]

        tl = Table([[s1, ar1, s2, ar2, s3]],
                    colWidths=[44*mm, 14*mm, 48*mm, 14*mm, 44*mm])
        tl.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (0,-1), PAPIER_2),
            ('BACKGROUND', (2,0), (2,-1), PAPIER_2),
            ('BACKGROUND', (4,0), (4,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ]))
        story.append(tl)
        story.append(Spacer(1, 10*mm))

        # 4 EXERCICES en ligne compacte
        story.append(Paragraph("·  4 EXERCICES POUR TRAVAILLER", ea_sec_lbl))
        exos_data = [
            ["BOX JUMPS", "Saut sur boîte — vertical pur"],
            ["DEPTH JUMPS", "Tombe d'un step, rebondis IMMÉDIATEMENT"],
            ["BROAD JUMPS", "Saut en longueur — horizontal"],
            ["BONDISSEMENTS", "Sauts répétés sur place ou en déplacement"],
        ]
        exos_t = Table(exos_data, colWidths=[42*mm, 122*mm])
        exos_t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Inter-Black'),
            ('FONTNAME', (1,0), (1,-1), 'Inter-Reg'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('TEXTCOLOR', (0,0), (0,-1), NOIR),
            ('TEXTCOLOR', (1,0), (1,-1), GRIS_DARK),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,-2), 0.3, HexColor('#D8D3C5')),
        ]))
        story.append(exos_t)
        story.append(Spacer(1, 8*mm))

        # RÈGLES condensées
        rg_box = ParagraphStyle('plio_rg', fontName='Inter-Med', fontSize=10,
                                  textColor=NOIR, alignment=TA_LEFT, leading=14,
                                  leftIndent=14, borderPadding=(10, 14, 10, 14),
                                  backColor=HexColor('#EEF9F7'))
        story.append(Paragraph(
            "<b><font color='#00A38F'>RÈGLES.</font></b>  "
            "Qualité &gt; quantité (3-5 reps / série) · "
            "Temps au sol <b>COURT</b> · "
            "<b>1-2 séances / semaine MAX</b>",
            rg_box))

        # ═══════ PAGE 5/7 — LA VITESSE (BIG STAT HERO Hormozi) ════════════════
        _ea_new_page(story, "05 / 07")
        _ea_title(story, "LA VITESSE.", "UNE SEULE RÈGLE.")
        story.append(Spacer(1, 10*mm))

        # HERO STATS — 1 MIN / 10 M
        big_n = ParagraphStyle('v_big', fontName='Inter-Black', fontSize=82,
                                 textColor=BLANC, alignment=TA_CENTER, leading=86,
                                 spaceAfter=4)
        big_l = ParagraphStyle('v_bl', fontName='Inter-Bold', fontSize=10,
                                 textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                                 leading=12)
        left_c = [Paragraph("1 MIN", big_n), Paragraph("DE RÉCUP", big_l)]
        right_c = [Paragraph("10 M", big_n), Paragraph("DE SPRINT", big_l)]
        hero = Table([[left_c, right_c]], colWidths=[82*mm, 82*mm])
        hero.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 30),
            ('BOTTOMPADDING', (0,0), (-1,-1), 30),
            ('LINEAFTER', (0,0), (0,-1), 0.6, HexColor('#7DD8C7')),
        ]))
        story.append(hero)
        story.append(Spacer(1, 10*mm))

        # Punch finale dessous
        punch_s = ParagraphStyle('v_pun', fontName='Inter-Med', fontSize=11,
                                   textColor=NOIR, alignment=TA_LEFT, leading=16,
                                   spaceAfter=8)
        story.append(Paragraph(
            "<b>C'est tout.</b>  Récup 1 minute par 10 m de sprint. "
            "Sinon tu ne travailles pas la vitesse, tu travailles la "
            "<b>résistance à la fatigue</b>. Ce n'est pas la même chose.",
            punch_s))

        story.append(Spacer(1, 8*mm))
        story.append(Paragraph("·  APPLICATION RAPIDE", ea_sec_lbl))

        appli_data = [
            ["SPRINT 10 m", "1 min de repos"],
            ["SPRINT 20 m", "2 min de repos"],
            ["SPRINT 30 m", "3 min de repos"],
            ["SPRINT 40 m", "4 min de repos"],
        ]
        ap_tt = Table(appli_data, colWidths=[82*mm, 82*mm])
        ap_tt.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Inter-Med'),
            ('FONTNAME', (1,0), (1,-1), 'Inter-Black'),
            ('FONTSIZE', (0,0), (-1,-1), 11),
            ('TEXTCOLOR', (0,0), (0,-1), NOIR),
            ('TEXTCOLOR', (1,0), (1,-1), CYAN_DARK),
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-2), 0.3, HexColor('#D8D3C5')),
        ]))
        story.append(ap_tt)

        # ═══════ PAGE 6/7 — FILIÈRES (TIMELINE HORIZONTALE Hormozi) ═══════════
        _ea_new_page(story, "06 / 07")
        _ea_title(story, "LES FILIÈRES.", "0 → ∞.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Ton corps a 3 voies pour fabriquer l'énergie. Les 3 travaillent "
            "en parallèle — mais une <b>domine</b> selon la durée de l'effort.",
            ea_body))

        story.append(Spacer(1, 10*mm))

        # TIMELINE HORIZONTALE — 3 zones colorées avec durées
        # Header durées en haut
        dur_s = ParagraphStyle('f_dur', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_CENTER, leading=12)
        dur_row = Table(
            [[Paragraph("0", dur_s), Paragraph("10 s", dur_s),
              Paragraph("2 min", dur_s), Paragraph("∞", dur_s)]],
            colWidths=[2*mm, 54*mm, 54*mm, 54*mm])
        dur_row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            # Le 1er marqueur "0" est aligné gauche, les autres à droite de chaque zone
            ('ALIGN', (0,0), (0,0), 'LEFT'),
            ('ALIGN', (1,0), (-1,0), 'RIGHT'),
        ]))
        story.append(dur_row)

        # Bande horizontale 3 zones colorées
        name_s = ParagraphStyle('f_nh', fontName='Inter-Black', fontSize=14,
                                  textColor=BLANC, alignment=TA_CENTER, leading=16)
        band_row = Table(
            [[Paragraph("ALACTIQUE", name_s),
              Paragraph("LACTIQUE", name_s),
              Paragraph("AÉROBIE", name_s)]],
            colWidths=[54*mm, 54*mm, 56*mm], rowHeights=[18*mm])
        band_row.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), CYAN_DARK),
            ('BACKGROUND', (1,0), (1,0), HexColor('#0E8275')),  # cyan plus foncé
            ('BACKGROUND', (2,0), (2,0), HexColor('#055044')),  # encore plus foncé
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(band_row)

        story.append(Spacer(1, 8*mm))

        # 3 descriptions en dessous, alignées aux zones
        desc_n = ParagraphStyle('f_n2', fontName='Inter-Bold', fontSize=10,
                                  textColor=NOIR, alignment=TA_LEFT, leading=13,
                                  spaceAfter=3)
        desc_b = ParagraphStyle('f_b2', fontName='Inter-Reg', fontSize=9.5,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        col1 = [Paragraph("SPRINT, SAUT, PLAQUAGE", desc_n),
                 Paragraph("Très puissante, très brève. Aucune fatigue chimique.", desc_b)]
        col2 = [Paragraph("EFFORTS INTENSES PROLONGÉS", desc_n),
                 Paragraph("Production de lactates — la sensation de brûlure.", desc_b)]
        col3 = [Paragraph("ENDURANCE", desc_n),
                 Paragraph("Le Bronco rugby. Footing. Tempo run.", desc_b)]
        desc_t = Table([[col1, col2, col3]], colWidths=[54*mm, 54*mm, 56*mm])
        desc_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(desc_t)

        story.append(Spacer(1, 10*mm))
        story.append(Paragraph("·  COMMENT TU TRAVAILLES CHAQUE FILIÈRE", ea_sec_lbl))
        story.append(Spacer(1, 4*mm))

        # 3 formats de travail concrets, alignés aux 3 zones
        prot_n = ParagraphStyle('f_pn', fontName='Inter-Black', fontSize=10.5,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=13,
                                  spaceAfter=3)
        prot_b = ParagraphStyle('f_pb', fontName='Inter-Reg', fontSize=9.5,
                                  textColor=NOIR, alignment=TA_LEFT, leading=12,
                                  spaceAfter=2)
        prot_d = ParagraphStyle('f_pd', fontName='Inter-Bold', fontSize=8.5,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, leading=11)
        prot_col1 = [
            Paragraph("SPRINTS COURTS", prot_n),
            Paragraph("10-30 m départ arrêté", prot_b),
            Paragraph("RÉCUP 1 min / 10 m", prot_d),
        ]
        prot_col2 = [
            Paragraph("RSA (SPRINTS RÉPÉTÉS)", prot_n),
            Paragraph("6 × 40 m / récup 20 s", prot_b),
            Paragraph("BRÛLURE = LACTATES", prot_d),
        ]
        prot_col3 = [
            Paragraph("BRONCO + TEMPO", prot_n),
            Paragraph("1200 m navettes ou footing 30-45 min", prot_b),
            Paragraph("BASE AÉROBIE", prot_d),
        ]
        prot_t = Table([[prot_col1, prot_col2, prot_col3]],
                        colWidths=[54*mm, 54*mm, 56*mm])
        prot_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,0), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (1,0), (1,0), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(prot_t)

        story.append(Spacer(1, 8*mm))

        # Punch finale
        punch_box = ParagraphStyle('f_pun', fontName='Inter-Med', fontSize=10.5,
                                     textColor=NOIR, alignment=TA_LEFT, leading=15,
                                     leftIndent=14, borderPadding=(12, 14, 12, 14),
                                     backColor=HexColor('#EEF9F7'))
        story.append(Paragraph(
            "<b><font color='#00A38F'>POUR UN RUGBYMAN.</font></b>  Tu utilises "
            "les <b>3 filières</b> dans un match (sprints courts, courses moyennes, "
            "efforts soutenus). Ta prépa doit <b>varier les formats</b>. Pas que "
            "du sprint. Pas que du footing.",
            punch_box))

        # ═══════ PAGE 7/7 — APPRENDRE + PRENDRE DU MUSCLE (pleine largeur) ════
        _ea_new_page(story, "07 / 07")
        _ea_title(story, "APPRENDRE.", "CONSTRUIRE.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph("·  APPRENDRE UN NOUVEAU MOUVEMENT", ea_sec_lbl))
        story.append(Paragraph(
            "Quand tu apprends ou re-travailles un mouvement, suis cet ordre. "
            "<b>Toujours.</b>", ea_body))

        story.append(Spacer(1, 4*mm))

        etapes = [
            ("01", "AMPLITUDE COMPLÈTE",
             "Peux-tu faire le mouvement sur toute son amplitude ? Sinon travaille la mobilité d'abord."),
            ("02", "TECHNIQUE PARFAITE",
             "Sur toute l'amplitude, sans charge ou avec barre vide."),
            ("03", "VITESSE",
             "Capacité à exécuter la phase concentrique rapidement (au moins en intention)."),
            ("04", "CHARGE",
             "Augmente le poids SEULEMENT quand 1, 2, 3 sont maîtrisés."),
        ]
        et_n = ParagraphStyle('ea_etn', fontName='Inter-Black', fontSize=14,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=16)
        et_h = ParagraphStyle('ea_eth', fontName='Inter-Black', fontSize=11,
                                 textColor=NOIR, alignment=TA_LEFT, leading=14)
        et_b = ParagraphStyle('ea_etb', fontName='Inter-Reg', fontSize=10,
                                 textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)
        for num, name, desc in etapes:
            row = Table([[Paragraph(num, et_n), Paragraph(name, et_h),
                          Paragraph(desc, et_b)]],
                        colWidths=[14*mm, 50*mm, 100*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        story.append(Spacer(1, 12*mm))

        story.append(Paragraph("·  COMMENT TU PRENDS DU MUSCLE — 3 LEVIERS", ea_sec_lbl))
        story.append(Paragraph(
            "Pour comprendre comment construire de la masse, retiens trois "
            "principes qui fonctionnent <b>en parallèle</b>.", ea_body))

        leviers = [
            ("PROXIMITÉ DE L'ÉCHEC",
             "Être à 1-2 reps de l'échec sur tes séries d'hypertrophie. Sinon stimulus insuffisant."),
            ("TENSION MÉCANIQUE",
             "Charges lourdes — recrute un maximum de fibres musculaires. La base."),
            ("STRESS MÉTABOLIQUE",
             "Charges plus légères, séries longues près de l'échec. Le pump."),
        ]
        lv_n = ParagraphStyle('ea_lvn', fontName='Inter-Black', fontSize=12,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=14,
                                 spaceAfter=4)
        lv_b = ParagraphStyle('ea_lvb', fontName='Inter-Reg', fontSize=9.5,
                                 textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)
        l_cells = []
        for name, body in leviers:
            l_cells.append([Paragraph(name, lv_n), Paragraph(body, lv_b)])
        lev_t = Table([l_cells], colWidths=[54*mm, 54*mm, 56*mm])
        lev_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (1,0), (1,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(lev_t)

        story.append(Spacer(1, 10*mm))
        story.append(_a_retenir([
            "Force ET vitesse — pas l'un sans l'autre. Spectre force-vitesse complet.",
            "1 min de récup par 10 m de sprint, sinon tu travailles la fatigue.",
            "Pliométrie = qualité &gt; quantité. Si la 3e rep est moins haute, stoppe la série.",
            "L'athlétisme se construit sur la base de force. Pas l'inverse.",
        ]))

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION TESTS PHYSIQUES — 3 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    TP_eyebrow = ParagraphStyle('tp_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    TP_eyebrow_r = ParagraphStyle('tp_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _tp_header(story, num_label):
        t = Table(
            [[Paragraph("·  TESTS PHYSIQUES", TP_eyebrow),
              Paragraph(num_label, TP_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _tp_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _tp_header(story, num_label)

    def _tp_title(story, line1, line2=None):
        s1 = ParagraphStyle('tp_t1', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('tp_t2', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_tests_physiques_section(story):
        """3 pages magazine — Tests physiques (baseline)."""

        tp_sec_lbl = ParagraphStyle('tp_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        tp_body = ParagraphStyle('tp_b', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=8)

        # ═══════ PAGE 1/3 — INTRO + MÉTHODE ═══════════════════════════════════
        _tp_new_page(story, "01 / 03", first=True)
        _tp_title(story, "TON POINT", "DE DÉPART.")
        story.append(Spacer(1, 10*mm))

        # Quote hook
        hook_style = ParagraphStyle('tp_hk', fontName='Inter-Med', fontSize=14,
                                      leading=20, textColor=NOIR, alignment=TA_LEFT,
                                      leftIndent=14)
        q_t = Table([[Paragraph(
            "« Sans <b>baseline</b>, pas de progression visible. Sans progression "
            "visible, pas de motivation à tenir 12 semaines. »",
            hook_style)]], colWidths=[164*mm])
        q_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t)
        story.append(Spacer(1, 12*mm))

        story.append(Paragraph(
            "Avant de te lancer dans le programme, tu vas mesurer ton point "
            "de départ. C'est la <b>seule</b> manière de voir tes progrès — "
            "et donc de garder la motivation jusqu'à la fin.",
            tp_body))

        story.append(Spacer(1, 8*mm))

        # 3 dates clés
        story.append(Paragraph("·  TROIS RENDEZ-VOUS AVEC TOI-MÊME", tp_sec_lbl))
        story.append(Spacer(1, 4*mm))

        rdv_lbl = ParagraphStyle('tp_rl', fontName='Inter-Black', fontSize=20,
                                   textColor=CYAN_DARK, alignment=TA_CENTER, leading=22,
                                   spaceAfter=4)
        rdv_n = ParagraphStyle('tp_rn', fontName='Inter-Black', fontSize=11,
                                 textColor=NOIR, alignment=TA_CENTER, leading=14,
                                 spaceAfter=4)
        rdv_d = ParagraphStyle('tp_rd', fontName='Inter-Reg', fontSize=9.5,
                                 textColor=GRIS_DARK, alignment=TA_CENTER, leading=12)

        rdvs = [
            ("J - 1", "JOUR 1", "Tu mesures ta baseline. Le verdict honnête de ton point de départ."),
            ("S - 6", "SEMAINE 6", "Mi-parcours. Tu vois ce qui bouge déjà, ce qui bloque."),
            ("S - 12", "SEMAINE 12", "Fin du programme. Le compteur final. Tes preuves chiffrées."),
        ]
        cells = []
        for lbl, n, d in rdvs:
            cells.append([Paragraph(lbl, rdv_lbl),
                          Paragraph(n, rdv_n),
                          Paragraph(d, rdv_d)])
        rdv_t = Table([cells], colWidths=[54*mm, 54*mm, 56*mm])
        rdv_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 16),
            ('BOTTOMPADDING', (0,0), (-1,-1), 16),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (1,0), (1,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(rdv_t)

        # ═══════ PAGE 2/3 — LES 5 TESTS ═══════════════════════════════════════
        _tp_new_page(story, "02 / 03")
        _tp_title(story, "LES 5 TESTS.", "FAIS-LES TOUS.")
        story.append(Spacer(1, 6*mm))

        intro_p2 = ParagraphStyle('tp_i2', fontName='Inter-Reg', fontSize=10,
                                    textColor=GRIS_DARK, alignment=TA_LEFT, leading=14,
                                    spaceAfter=6)
        story.append(Paragraph(
            "Ces 5 tests couvrent tout ce qu'un athlète doit savoir mesurer : "
            "vitesse, accélération, force haut, force bas, condition.",
            intro_p2))

        tests = [
            ("01", "SPRINT 10 M", "Accélération pure.",
             "Départ debout, chrono manuel ou appli (Sprint Timer).",
             chr(0xe2de)),  # lightning
            ("02", "SPRINT 30 M", "Vitesse max linéaire.",
             "Départ debout, même chrono que le 10 m. Note les 2 temps.",
             chr(0xe730)),  # person-simple-run
            ("03", "1RM SQUAT", "Force du bas du corps.",
             "Ou estimation via série de 3-5 reps max si tu préfères pas tester à 100 %.",
             chr(0xe0b6)),  # barbell
            ("04", "1RM BENCH PRESS", "Force du haut du corps.",
             "Même protocole : 1RM direct ou estimation 3-5 reps max.",
             chr(0xe0b6)),  # barbell
            ("05", "BRONCO (RUGBY)", "Condition physique spécifique.",
             "1200 m en navettes de 60 m en continu. Chrono final.",
             chr(0xe492)),  # timer
        ]
        # Layout : icon + numéro empilés à gauche + texte à droite
        icn_st = ParagraphStyle('tp_icn', fontName='Phosphor-Fill', fontSize=22,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                                  spaceAfter=2)
        n_st = ParagraphStyle('tp_n', fontName='Inter-Black', fontSize=14,
                                textColor=HexColor('#A8B5C0'), alignment=TA_LEFT, leading=16)
        t_st = ParagraphStyle('tp_tn', fontName='Inter-Black', fontSize=12,
                                textColor=NOIR, alignment=TA_LEFT, leading=14,
                                spaceAfter=2)
        b1_st = ParagraphStyle('tp_b1', fontName='Inter-Bold', fontSize=9.5,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=12,
                                 spaceAfter=2)
        b2_st = ParagraphStyle('tp_b2', fontName='Inter-Reg', fontSize=9,
                                 textColor=NOIR, alignment=TA_LEFT, leading=12)

        for num, name, mesure, proto, ico in tests:
            left_cell = [Paragraph(num, n_st)]
            text_cell = [Paragraph(name, t_st), Paragraph(mesure, b1_st),
                          Paragraph(proto, b2_st)]
            row = Table([[left_cell, text_cell]], colWidths=[18*mm, 146*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 9),
                ('BOTTOMPADDING', (0,0), (-1,-1), 9),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(row)
            story.append(Spacer(1, 2*mm))

        # ═══════ PAGE 3/3 — TABLEAU DE PROGRESSION ═══════════════════════════
        _tp_new_page(story, "03 / 03")
        _tp_title(story, "TABLEAU DE", "PROGRESSION.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "Reporte tes scores ici. Imprime cette page, photographie-la, "
            "ou recopie-la sur ton téléphone. Mais <b>écris-les</b>.",
            tp_body))

        story.append(Spacer(1, 4*mm))

        # Table progression
        prog_data = [
            ["TEST", "JOUR 1", "SEMAINE 6", "SEMAINE 12", "Δ"],
            ["Sprint 10 m",     "_______", "_______", "_______", "_______"],
            ["Sprint 30 m",     "_______", "_______", "_______", "_______"],
            ["1RM Squat",       "_______", "_______", "_______", "_______"],
            ["1RM Bench press", "_______", "_______", "_______", "_______"],
            ["Bronco (rugby)",  "_______", "_______", "_______", "_______"],
        ]
        prog_t = Table(prog_data, colWidths=[40*mm, 31*mm, 31*mm, 31*mm, 31*mm])
        prog_t.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0,0), (-1,0), CYAN_DARK),
            ('TEXTCOLOR', (0,0), (-1,0), BLANC),
            ('FONTNAME', (0,0), (-1,0), 'Inter-Black'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            # Body
            ('FONTNAME', (0,1), (0,-1), 'Inter-Bold'),
            ('FONTNAME', (1,1), (-1,-1), 'Inter-Reg'),
            ('FONTSIZE', (0,1), (-1,-1), 10),
            ('TEXTCOLOR', (0,1), (0,-1), NOIR),
            ('TEXTCOLOR', (1,1), (-1,-1), HexColor('#C5C0B5')),
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
            ('ALIGN', (1,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [PAPIER_2, HexColor('#EAE6DA')]),
        ]))
        story.append(prog_t)
        story.append(Spacer(1, 12*mm))

        # Tip box
        tip_style = ParagraphStyle('tp_tip', fontName='Inter-Med', fontSize=10.5,
                                     textColor=NOIR, alignment=TA_LEFT, leading=15,
                                     leftIndent=14, borderPadding=(12, 14, 12, 14),
                                     backColor=HexColor('#EEF9F7'))
        tip_t = Table([[Paragraph(
            "<b><font color='#00A38F'>RÈGLE D'OR.</font></b>  Les mêmes "
            "conditions chaque fois : même heure, même chaussures, même "
            "échauffement, même nourriture. Tes chiffres doivent comparer "
            "des pommes avec des pommes.",
            tip_style)]], colWidths=[164*mm])
        tip_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(tip_t)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION INTRO PROGRAMME — 2 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    IP_eyebrow = ParagraphStyle('ip_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    IP_eyebrow_r = ParagraphStyle('ip_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _ip_header(story, num_label):
        t = Table(
            [[Paragraph("·  LE PROGRAMME", IP_eyebrow),
              Paragraph(num_label, IP_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _ip_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _ip_header(story, num_label)

    def _ip_title(story, line1, line2=None):
        s1 = ParagraphStyle('ip_t1', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('ip_t2', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_intro_programme_section(story):
        """2 pages magazine — Intro programme (vue d'ensemble + planning)."""

        ip_sec_lbl = ParagraphStyle('ip_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        ip_body = ParagraphStyle('ip_b', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=8)

        # ═══════ PAGE 1/2 — LE PROGRAMME EN UN COUP D'ŒIL ═════════════════════
        _ip_new_page(story, "01 / 02", first=True)
        _ip_title(story, "LE PROGRAMME.", "EN UN COUP D'ŒIL.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "<b>90 jours</b> pour transformer ton athlétisme. Pas un programme de "
            "bodybuilder déguisé en prépa physique. Tout est <b>structuré pour "
            "le terrain</b>.", ip_body))

        story.append(Spacer(1, 4*mm))

        # 3 stats hero en bandeau
        st_n = ParagraphStyle('ip_sn', fontName='Inter-Black', fontSize=42,
                                textColor=BLANC, alignment=TA_CENTER, leading=46,
                                spaceAfter=4)
        st_l = ParagraphStyle('ip_sll', fontName='Inter-Bold', fontSize=9,
                                textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                                leading=11)
        stats_cells = [
            [Paragraph("12", st_n), Paragraph("SEMAINES", st_l)],
            [Paragraph("5", st_n), Paragraph("SÉANCES / SEMAINE", st_l)],
            [Paragraph("60", st_n), Paragraph("SÉANCES TOTAL", st_l)],
        ]
        stats_t = Table([stats_cells], colWidths=[54*mm, 54*mm, 56*mm])
        stats_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 16),
            ('BOTTOMPADDING', (0,0), (-1,-1), 16),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#7DD8C7')),
            ('LINEAFTER', (1,0), (1,-1), 0.5, HexColor('#7DD8C7')),
        ]))
        story.append(stats_t)
        story.append(Spacer(1, 12*mm))

        # 4 phases ATHLÈTE 90 (TEST → BLOC 1 → BLOC 2 → TEST)
        story.append(Paragraph("·  QUATRE PHASES, UNE PROGRESSION", ip_sec_lbl))
        story.append(Spacer(1, 4*mm))

        bk_n = ParagraphStyle('ip_bn', fontName='Inter-Black', fontSize=16,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=18,
                                spaceAfter=2)
        bk_t = ParagraphStyle('ip_bt', fontName='Inter-Black', fontSize=10,
                                textColor=NOIR, alignment=TA_LEFT, leading=12,
                                spaceAfter=4)
        bk_b = ParagraphStyle('ip_bb', fontName='Inter-Reg', fontSize=9,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)

        blocs = [
            ("TEST", "S1 · BASELINE",
             "10 tests pour évaluer ton niveau de départ : force, vitesse, puissance, agilité (T-test), endurance (footing)."),
            ("BLOC 1", "S2 → S6 · DÉVELOPPEMENT",
             "Construction des fondations : technique, volume contrôlé, hypertrophie ciblée, base athlétique."),
            ("BLOC 2", "S7 → S11 · INTENSIFICATION",
             "Force max, vitesse, puissance explosive. Tu transformes la base en performance pure."),
            ("TEST", "S12 · RE-TEST",
             "Mêmes 10 tests qu'en S1. Comparaison chiffrée de tes progrès sur 12 semaines."),
        ]
        bk_cells = []
        for n, t_, b in blocs:
            bk_cells.append([Paragraph(n, bk_n), Paragraph(t_, bk_t),
                              Paragraph(b, bk_b)])
        bk_t_table = Table([bk_cells], colWidths=[41*mm, 41*mm, 41*mm, 41*mm])
        bk_t_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (1,0), (1,-1), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (2,0), (2,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(bk_t_table)

        story.append(Spacer(1, 8*mm))
        story.append(_qr_block(
            "https://rb-perform.com/programme-video",
            "SCAN VIDÉO", "Présentation du programme.",
            size_mm=22))

        # ═══════ PAGE 2/2 — TA SEMAINE TYPE ═══════════════════════════════════
        _ip_new_page(story, "02 / 02")
        _ip_title(story, "TA SEMAINE.", "TYPE.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "<b>Cinq séances structurées</b> du lundi au vendredi. Week-end "
            "<b>terrain</b> (match / sortie longue) ou OFF actif. "
            "La récupération fait partie du programme — autant que les séances.",
            ip_body))

        story.append(Spacer(1, 8*mm))

        # Planning 7 jours
        d_n = ParagraphStyle('ip_dn', fontName='Inter-Black', fontSize=10,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=12)
        d_t = ParagraphStyle('ip_dt', fontName='Inter-Black', fontSize=11,
                               textColor=NOIR, alignment=TA_LEFT, leading=14)
        d_b = ParagraphStyle('ip_db', fontName='Inter-Reg', fontSize=9.5,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        d_off = ParagraphStyle('ip_doff', fontName='Inter-Black', fontSize=11,
                                 textColor=HexColor('#C5C0B5'), alignment=TA_LEFT, leading=14)

        planning = [
            ("LUNDI", "FORCE BAS", "Squat, soulevé, fente. Charges max, peu de reps.", False),
            ("MARDI", "VITESSE", "Sprints courts, accélérations, agility.", False),
            ("MERCREDI", "FORCE HAUT", "Développé, tractions, rowing. Force max haut du corps.", False),
            ("JEUDI", "HYPERTROPHIE", "Volume, séries longues, masse musculaire ciblée.", False),
            ("VENDREDI", "CONDITIONING", "Bronco, intervalles, base aérobie selon le bloc.", False),
            ("SAMEDI", "MATCH / SORTIE LONGUE", "Compétition ou sortie longue terrain.", False),
            ("DIMANCHE", "OFF", "Récupération active : mobilité, étirements, sommeil.", True),
        ]
        for jour, titre, desc, is_off in planning:
            title_style = d_off if is_off else d_t
            row = Table([[Paragraph(jour, d_n),
                          Paragraph(titre, title_style),
                          Paragraph(desc, d_b)]],
                        colWidths=[26*mm, 50*mm, 88*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        story.append(Spacer(1, 10*mm))

        # Tip box
        tip_style = ParagraphStyle('ip_tip', fontName='Inter-Med', fontSize=10.5,
                                     textColor=NOIR, alignment=TA_LEFT, leading=15,
                                     leftIndent=14, borderPadding=(12, 14, 12, 14),
                                     backColor=HexColor('#EEF9F7'))
        tip_t = Table([[Paragraph(
            "<b><font color='#00A38F'>FLEXIBILITÉ.</font></b>  Tu peux "
            "<b>décaler les séances</b> selon ton planning. La règle : "
            "ne JAMAIS enchaîner 2 séances intenses sans 1 jour entre les deux. "
            "Et ne JAMAIS sacrifier ton OFF.",
            tip_style)]], colWidths=[164*mm])
        tip_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(tip_t)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION PROGRAMME 8 SEMAINES — 1 page teaser premium
    # ─────────────────────────────────────────────────────────────────────────

    def build_programme_section(story):
        """1 page magazine — Teaser ATHLÈTE 90 + Index séances + 72 fiches."""
        story.append(PdfBookmark(key="athlete-90", title="ATHLÈTE 90 — Le Protocole", level=1))
        story.append(Spacer(1, 4*mm))

        # Header eyebrow
        eb_l = ParagraphStyle('pg_eb', fontName='Inter-Bold', fontSize=10,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=12)
        eb_r = ParagraphStyle('pg_ebr', fontName='Inter-Black', fontSize=22,
                                textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                leading=24)
        hdr = Table([[Paragraph("·  ATHLÈTE 90  ·  LE PROTOCOLE", eb_l),
                      Paragraph("01 / 01", eb_r)]],
                    colWidths=[110*mm, 54*mm])
        hdr.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(hdr)
        story.append(Spacer(1, 8*mm))

        # Titre hero ATHLÈTE 90
        t1 = ParagraphStyle('pg_t1', fontName='Inter-Black', fontSize=44, leading=48,
                              textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        t2 = ParagraphStyle('pg_t2', fontName='Inter-Black', fontSize=44, leading=48,
                              textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=4)
        story.append(Paragraph("ATHLÈTE 90.", t1))
        story.append(Paragraph("LE PROTOCOLE.", t2))

        sub = ParagraphStyle('pg_sub', fontName='Inter-Bold', fontSize=11,
                              textColor=GRIS_DARK, alignment=TA_LEFT, leading=14,
                              spaceAfter=12)
        story.append(Paragraph("12 SEMAINES &nbsp;·&nbsp; 72 SÉANCES &nbsp;·&nbsp; TEST → BLOC 1 → BLOC 2 → TEST", sub))

        body = ParagraphStyle('pg_b', fontName='Inter-Reg', fontSize=11,
                                textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                spaceAfter=4)
        story.append(Paragraph(
            "Le protocole 90 jours qui transforme un mec normal en athlète "
            "sur lequel on se retourne. <b>Athlétisme avant esthétique</b> : on "
            "construit le moteur d'abord, le carrossage suit.",
            body))
        story.append(Spacer(1, 8*mm))

        # Grille 2x4 des 7 promesses (+ 1 cellule vide pour symétrie)
        feat_n = ParagraphStyle('pg_fn', fontName='Inter-Black', fontSize=20,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=22,
                                  spaceAfter=3)
        feat_t = ParagraphStyle('pg_ft', fontName='Inter-Black', fontSize=10.5,
                                  textColor=NOIR, alignment=TA_LEFT, leading=13,
                                  spaceAfter=2)
        feat_d = ParagraphStyle('pg_fd', fontName='Inter-Reg', fontSize=9,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)

        features = [
            ("01", "STRUCTURE",
             "12 semaines · 6 séances/sem (4 muscu + 2 course) · 72 séances détaillées."),
            ("02", "PÉRIODISATION",
             "TEST (S1) → BLOC 1 développement (S2-S6) → BLOC 2 intensification (S7-S11) → TEST (S12)."),
            ("03", "TESTS J0 & J90",
             "10 tests baseline en S1 (incluant T-test + footing), re-tests en S12."),
            ("04", "ATHLÉTISME",
             "Transversal chaque semaine — sprints, sauts, plyo, mobilité."),
            ("05", "NUTRITION",
             "Plan calibré selon ton poids, ton sport, ton objectif."),
            ("06", "VIDÉO HD",
             "Pour chaque exercice. Filmées par moi, technique + variantes."),
        ]
        rows = []
        for i in range(0, 6, 2):
            row_cells = []
            for j in range(2):
                n, ttl, ds = features[i+j]
                row_cells.append([Paragraph(n, feat_n),
                                   Paragraph(ttl, feat_t),
                                   Paragraph(ds, feat_d)])
            rows.append(row_cells)
        grid = Table(rows, colWidths=[82*mm, 82*mm])
        grid.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,-1), 0.5, HexColor('#C5C0B5')),
            ('LINEBELOW', (0,0), (-1,0), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(grid)

        # ─────────────────────────────────────────────────────────────
        # 32 FICHES SÉANCE DÉTAILLÉES (design C — 2 pages/séance)
        # ─────────────────────────────────────────────────────────────
        _render_all_seances(story)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # HELPER : Rendu d'une fiche séance (2 pages premium)
    # ─────────────────────────────────────────────────────────────────────────
    # État partagé pour numéroter les exos dans une séance
    _exo_counter = [0]

    def _ordinal_fr(n):
        """Retourne l'ordinal français : 1 → 1ER, 2 → 2ÈME, etc."""
        if n == 1:
            return "1ER"
        return f"{n}ÈME"

    def _video_thumb_dark(w_mm=38, h_mm=21):
        """Placeholder miniature vidéo 16:9 sur page dark — fond très sombre + play ▶."""
        play_s = ParagraphStyle('vt_p', fontName='Inter-Black', fontSize=18,
                                  textColor=CYAN, alignment=TA_CENTER, leading=20)
        t = Table([[Paragraph("▶", play_s)]],
                   colWidths=[w_mm*mm], rowHeights=[h_mm*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#1A2030')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        return t

    def _exo_row_dark(name, series, reps, recup, sub=None, technique=False):
        """Ligne d'exercice style ESSAN sur fond DARK : thumbnail 16:9 + filet cyan + ordinal + nom + détails.
        sub : sous-titre optionnel (italique gris). technique : ajoute badge (TECHNIQUE) cyan."""
        _exo_counter[0] += 1
        idx = _exo_counter[0]
        ordinal = _ordinal_fr(idx)

        # Styles dark
        ord_s = ParagraphStyle('er_ord', fontName='Inter-Black', fontSize=16,
                                 textColor=BLANC, alignment=TA_LEFT, leading=18)
        name_color = BLANC
        name_html = name.upper()
        if technique:
            name_html += f' &nbsp;<font color="#02D1BA" size="9"><b>(TECHNIQUE)</b></font>'
        name_s = ParagraphStyle('er_n', fontName='Inter-Black', fontSize=12,
                                  textColor=BLANC, alignment=TA_LEFT, leading=14,
                                  spaceAfter=2)
        sub_s = ParagraphStyle('er_sub', fontName='Inter-Med', fontSize=9,
                                 textColor=HexColor('#A8E5DC'), alignment=TA_LEFT,
                                 leading=11, spaceAfter=3)
        det_s = ParagraphStyle('er_d', fontName='Inter-Bold', fontSize=10.5,
                                 textColor=BLANC, alignment=TA_LEFT, leading=13)

        # Bloc droite : nom + (sous-titre) + détails
        right_block = [Paragraph(name_html, name_s)]
        if sub:
            right_block.append(Paragraph(sub, sub_s))
        details = f"{series} séries &nbsp;|&nbsp; {reps} réps &nbsp;|&nbsp; {recup} de repos"
        right_block.append(Paragraph(details, det_s))

        # Layout : thumbnail 38mm | ordinal 22mm | détails 104mm
        # Filet cyan vertical = LINEBEFORE sur la cellule ordinal
        row = Table([[_video_thumb_dark(38, 21),
                       Paragraph(ordinal, ord_s),
                       right_block]],
                     colWidths=[38*mm, 22*mm, 104*mm])
        row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (1,0), (1,0), 8),
            ('LEFTPADDING', (2,0), (2,0), 6),
            ('LINEBEFORE', (1,0), (1,0), 2, CYAN),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))

        # Wrapper avec ligne de séparation grise bas
        wrapper = Table([[row]], colWidths=[164*mm])
        wrapper.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,-1), 0.3, HexColor('#2A3550')),
        ]))
        return wrapper

    # Aliases conservés pour compatibilité (mais non utilisés en dark mode)
    _video_thumbnail = _video_thumb_dark
    _exo_card = lambda name, series, reps, intens, recup: _exo_row_dark(
        name, series, reps, recup, sub=None, technique=False)

    def _exo_card_fm(name, series, reps, intens, recup, is_course=False):
        """Card style Force et Masse : fond BLANC, padding généreux, miniature à droite.
        Accents cyan (muscu) ou doré (course) selon is_course."""
        _exo_counter[0] += 1
        idx = _exo_counter[0]

        accent = DORE_DARK if is_course else CYAN_DARK
        accent_light = DORE if is_course else CYAN

        # Petit numéro accent en haut de card
        num_s = ParagraphStyle('fm_num', fontName='Inter-Black', fontSize=9,
                                 textColor=accent, alignment=TA_LEFT, leading=11,
                                 spaceAfter=4)
        # Nom de l'exo en CAPS Bold
        nom_s = ParagraphStyle('fm_nom', fontName='Inter-Black', fontSize=13,
                                 textColor=NOIR, alignment=TA_LEFT, leading=15)
        val_s = ParagraphStyle('fm_val', fontName='Inter-Reg', fontSize=9.5,
                                 textColor=NOIR, alignment=TA_LEFT, leading=13)

        # Bloc texte gauche : numéro + nom + filet cyan + grille 2x2 (avec Tempo)
        params_2x2 = [
            [Paragraph(f"<b>Répétitions :</b> {series} x {reps}", val_s),
             Paragraph(f"<b>RIR / Intensité :</b> {intens}", val_s)],
            [Paragraph(f"<b>Tempo :</b> X", val_s),
             Paragraph(f"<b>Repos :</b> {recup}", val_s)],
        ]
        params_t = Table(params_2x2, colWidths=[50*mm, 50*mm])
        params_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        # Filet cyan dark sous le nom (accent brand)
        from reportlab.platypus import HRFlowable as _HR
        text_left = [
            Paragraph(f"·  EXERCICE {idx:02d}", num_s),
            Paragraph(name.upper(), nom_s),
            _HR(width=38*mm, thickness=1, color=accent,
                spaceBefore=3, spaceAfter=6, hAlign='LEFT'),
            params_t,
        ]

        # Miniature vidéo : plus compacte (44mm × 26mm)
        play_s = ParagraphStyle('fm_play', fontName='Inter-Black', fontSize=20,
                                  textColor=accent_light, alignment=TA_CENTER, leading=22)
        thumb = Table([[Paragraph("▶", play_s)]],
                       colWidths=[44*mm], rowHeights=[26*mm])
        thumb.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), ENCRE),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))

        # Layout card : texte gauche (108mm) + thumb droite (44mm)
        inner = Table([[text_left, thumb]], colWidths=[108*mm, 44*mm])
        inner.setStyle(TableStyle([
            ('VALIGN', (0,0), (0,0), 'TOP'),
            ('VALIGN', (1,0), (1,0), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (1,0), (1,0), 8),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))

        # Card extérieure : padding réduit pour densifier
        card = Table([[inner]], colWidths=[164*mm])
        card.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BLANC),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 0.4, HexColor('#E8E4D8')),
        ]))
        return KeepTogether([card, Spacer(1, 2*mm)])

    def _render_seance(story, num, semaine, jour, kind, code,
                        title_h, title_b, eyebrow_section,
                        objectif, duree, intensite, materiel,
                        warmup, main_exos, accessoires, finisher,
                        watchpoints, recup):
        """Rend une fiche séance style Force et Masse — crème + cards blanches aérées + miniatures à droite."""

        # Reset compteur exo
        _exo_counter[0] = 0

        # Détection type séance pour couleur d'accent
        is_course = "COURSE" in kind.upper() or "RUN" in kind.upper() or "VITESSE" in title_b.upper()
        accent = DORE_DARK if is_course else CYAN_DARK
        accent_light = DORE if is_course else CYAN
        accent_hex = "#B08755" if is_course else "#02D1BA"

        # Page light_full (fond crème PAPIER, cohérent avec le reste du livre)
        story.append(NextPageTemplate('light_full'))
        story.append(PageBreak())

        # ─── BOOKMARK PDF : entrée outline cliquable pour cette séance ──
        story.append(PdfBookmark(
            key=f"seance-s{semaine:02d}-j{jour}",
            title=f"Sem {semaine:02d} · {jour} · {title_h.replace('.', '').strip()} {title_b.replace('.', '').strip()}",
            level=1))
        story.append(Spacer(1, 4*mm))

        # ─── EYEBROW SITUATIONNEL — couleur selon kind (cyan/doré) ─────
        jours_map = {"LUN": "LUNDI", "MAR": "MARDI", "MER": "MERCREDI",
                      "JEU": "JEUDI", "VEN": "VENDREDI", "SAM": "SAMEDI", "DIM": "DIMANCHE"}
        jour_long = jours_map.get(jour, jour)
        eb_s = ParagraphStyle('hd_eb', fontName='Inter-Bold', fontSize=9.5,
                                textColor=accent, alignment=TA_LEFT,
                                leading=12, spaceAfter=10)
        story.append(Paragraph(
            f"S E M A I N E &nbsp; {semaine:02d}  &nbsp;·&nbsp;  {jour_long}  &nbsp;·&nbsp;  {kind}",
            eb_s))

        # ─── HEADER : Titre gauche + Photo Rayan placeholder droite ─────
        title_full = f"SÉANCE {num} :<br/>{title_h.replace('.', '').strip()} {title_b.replace('.', '').strip()}"
        title_s = ParagraphStyle('hd_t', fontName='Inter-Black', fontSize=20,
                                   textColor=NOIR, alignment=TA_LEFT, leading=24,
                                   spaceAfter=8)
        from reportlab.platypus import HRFlowable as _HR

        intro_s = ParagraphStyle('hd_i', fontName='Inter-Reg', fontSize=10,
                                   textColor=NOIR, alignment=TA_LEFT, leading=14,
                                   spaceAfter=4)
        warm_s = ParagraphStyle('hd_w', fontName='Inter-Reg', fontSize=9.5,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)

        text_block = [
            Paragraph(title_full, title_s),
            _HR(width=55*mm, thickness=1.5, color=NOIR, spaceBefore=0, spaceAfter=8, hAlign='LEFT'),
            Paragraph(objectif, intro_s),
            Spacer(1, 3*mm),
            Paragraph(
                f"Pense à t'<b>échauffer</b> avant la séance et "
                f"<b><font color='{accent_hex}'>clique ici</font></b> "
                f"pour voir l'échauffement complet.",
                warm_s),
        ]

        # Photo placeholder Rayan (65mm × 48mm, plus compact)
        photo_ph = Table([[""]], colWidths=[65*mm], rowHeights=[48*mm])
        photo_ph.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#E5E2DA')),
        ]))

        hdr = Table([[text_block, photo_ph]], colWidths=[99*mm, 65*mm])
        hdr.setStyle(TableStyle([
            ('VALIGN', (0,0), (0,0), 'TOP'),
            ('VALIGN', (1,0), (1,0), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (1,0), (1,0), 8),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(hdr)
        story.append(Spacer(1, 5*mm))

        # ─── LISTE EXOS (main + accessoires fusionnés) ──────────────────
        for nom, series, reps, intens, rec in main_exos:
            story.append(_exo_card_fm(nom, series, reps, intens, rec, is_course=is_course))
        if accessoires:
            for nom, series, reps, intens, rec in accessoires:
                story.append(_exo_card_fm(nom, series, reps, intens, rec, is_course=is_course))
        if finisher:
            for f in finisher:
                story.append(_exo_card_fm(f, "1", "—", "Finisher", "—", is_course=is_course))

        # ─── FOOTER NAVIGATION (Précédente | Index | Suivante) ──────────
        story.append(Spacer(1, 4*mm))
        nav_s = ParagraphStyle('nav_s', fontName='Inter-Bold', fontSize=8.5,
                                 textColor=GRIS_DARK, alignment=TA_CENTER,
                                 leading=11)
        # Liste ordonnée des séances codées pour calculer prev/next
        ordered = sorted(EXISTING_SEANCES, key=lambda x: (x[0], ["LUN","MAR","MER","JEU","VEN","SAM","DIM"].index(x[1])))
        try:
            cur_idx = ordered.index((semaine, jour))
        except ValueError:
            cur_idx = -1
        # Helper : génère un fragment de lien si la séance existe, sinon du texte gris
        def _nav_frag(label, sem_jour=None):
            if sem_jour and _seance_exists(*sem_jour):
                key = f"seance-s{sem_jour[0]:02d}-j{sem_jour[1]}"
                return f"<link href='#{key}'><font color='{accent_hex}'>{label}</font></link>"
            return f"<font color='#9A9A9A'>{label}</font>"

        prev_sj = ordered[cur_idx-1] if cur_idx > 0 else None
        next_sj = ordered[cur_idx+1] if 0 <= cur_idx < len(ordered)-1 else None
        nav_html = (
            f"{_nav_frag('← Séance précédente', prev_sj)}"
            f"&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;"
            f"<link href='#index-seances'><font color='{accent_hex}'>Index séances</font></link>"
            f"&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;"
            f"{_nav_frag('Séance suivante →', next_sj)}"
        )
        story.append(Paragraph(nav_html, nav_s))

    # ─────────────────────────────────────────────────────────────────────────
    # 32 FICHES SÉANCE — DATA + RENDU
    # 4 séances par semaine × 8 semaines = 32 fiches
    # Cycle 1 (S1-S4) : Construction · Cycle 2 (S5-S8) : Intensification
    # ─────────────────────────────────────────────────────────────────────────
    # Liste des séances actuellement codées (clé = (semaine, jour_court))
    # Mettre à jour cette liste quand de nouvelles séances sont ajoutées
    EXISTING_SEANCES = {
        (1, "LUN"), (1, "MAR"), (1, "JEU"), (1, "SAM"),
    }

    def _seance_exists(sem, jour):
        """Retourne True si la séance (sem, jour) est codée et a son bookmark."""
        return (sem, jour) in EXISTING_SEANCES

    def _render_all_seances(story):
        """Boucle sur les séances du programme ATHLÈTE 90 — 12 sem × 6 séances = 72."""
        # ─── Page INDEX SÉANCES (grille 12×5 cliquable) ─────────────────
        _render_index_seances(story)

        # Page séparateur BLOC 1
        _render_cycle_separator(story, "BLOC 1", "DÉVELOPPEMENT", "SEMAINES 2-6",
            "Tu poses les fondations. Force max, technique, volume contrôlé. Charges modérées, qualité parfaite.")

        # SEMAINE 1
        _render_seance_s1_j1(story)
        _render_seance_s1_j2(story)
        _render_seance_s1_j3(story)
        _render_seance_s1_j4(story)

    def _render_index_seances(story):
        """Page INDEX SÉANCES — grille 12 sem × 6 séances = 72 entrées cliquables.
        Pointe vers les bookmarks PDF des séances. Les liens vers des séances non
        encore codées sont affichés en gris (pas cliquables visuellement)."""
        story.append(NextPageTemplate('light_full'))
        story.append(PageBreak())

        # Bookmark de la page index elle-même (cible des footers de navigation)
        story.append(PdfBookmark(
            key="index-seances",
            title="Index des 72 séances",
            level=0))

        story.append(Spacer(1, 8*mm))

        # Eyebrow
        eb_s = ParagraphStyle('ix_eb', fontName='Inter-Bold', fontSize=9.5,
                                textColor=CYAN_DARK, alignment=TA_LEFT,
                                leading=12, spaceAfter=6)
        story.append(Paragraph(
            "·  ATHLÈTE 90  ·  NAVIGATION RAPIDE",
            eb_s))

        # Titre XL
        t1 = ParagraphStyle('ix_t', fontName='Inter-Black', fontSize=38, leading=42,
                              textColor=NOIR, alignment=TA_LEFT, spaceAfter=2)
        story.append(Paragraph("INDEX SÉANCES<font color='#02D1BA'>.</font>", t1))
        sub = ParagraphStyle('ix_s', fontName='Inter-Med', fontSize=11,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=14,
                               spaceAfter=10)
        story.append(Paragraph(
            "Clique sur une séance pour y aller direct. "
            "<b>Cyan</b> = muscu &nbsp;·&nbsp; <b><font color='#B08755'>Doré</font></b> = course.",
            sub))

        # Grille : header (jours) + 12 lignes (semaines)
        jours_order = ["LUN", "MAR", "MER", "JEU", "VEN"]
        # Mapping séances type par jour (template par défaut)
        seance_types = {
            "LUN": ("Force Bas", False),
            "MAR": ("Vitesse", True),
            "MER": ("Force Haut", False),
            "JEU": ("Hypertrophie", False),
            "VEN": ("Conditioning", True),
        }
        # Style cellules
        h_lbl = ParagraphStyle('ix_h', fontName='Inter-Bold', fontSize=8.5,
                                 textColor=BLANC, alignment=TA_CENTER, leading=10)
        w_lbl = ParagraphStyle('ix_w', fontName='Inter-Black', fontSize=11,
                                 textColor=CYAN_DARK, alignment=TA_CENTER, leading=13)

        # Adapter à la structure réelle des séances codées (S1 : LUN/MAR/JEU/SAM pour l'instant)
        jours_order = ["LUN", "MAR", "MER", "JEU", "VEN"]
        # Construction des lignes
        rows = []
        # Header row : "SEM" + jours
        header = [Paragraph("SEM", h_lbl)]
        for j in jours_order:
            jour_full = {"LUN": "LUNDI", "MAR": "MARDI", "MER": "MERCREDI",
                          "JEU": "JEUDI", "VEN": "VENDREDI"}[j]
            header.append(Paragraph(jour_full, h_lbl))
        rows.append(header)

        # 12 lignes de semaines
        for sem in range(1, 13):
            row = [Paragraph(f"{sem:02d}", w_lbl)]
            for j in jours_order:
                label, is_c = seance_types[j]
                col = "#B08755" if is_c else "#00A38F"
                cell_s = ParagraphStyle(f'ix_c_{sem}_{j}', fontName='Inter-Med',
                                          fontSize=8.5, textColor=NOIR,
                                          alignment=TA_CENTER, leading=11)
                # Lien si la séance existe, sinon texte gris
                if _seance_exists(sem, j):
                    cell_html = (
                        f"<link href='#seance-s{sem:02d}-j{j}'>"
                        f"<font color='{col}' size='8'><b>{label}</b></font></link>")
                else:
                    cell_html = f"<font color='#9A9A9A' size='8'>{label}</font>"
                row.append(Paragraph(cell_html, cell_s))
            rows.append(row)

        grid = Table(rows, colWidths=[16*mm, 30*mm, 30*mm, 30*mm, 30*mm, 30*mm])
        grid.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            # Header row
            ('BACKGROUND', (0,0), (-1,0), CYAN_DARK),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            # Body
            ('TOPPADDING', (0,1), (-1,-1), 7),
            ('BOTTOMPADDING', (0,1), (-1,-1), 7),
            ('BACKGROUND', (0,1), (-1,-1), PAPIER_2),
            # Filets entre lignes
            ('LINEBELOW', (0,0), (-1,-2), 0.4, HexColor('#D8D3C5')),
            # Filets entre colonnes
            ('LINEAFTER', (0,0), (-2,-1), 0.3, HexColor('#D8D3C5')),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(grid)

        # Note bas
        note_s = ParagraphStyle('ix_n', fontName='Inter-Reg', fontSize=9,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, leading=12,
                                  spaceBefore=10)
        story.append(Paragraph(
            "<i>Note : les séances WE (samedi/dimanche) sont des matchs ou sorties terrain. "
            "Pas de fiche dédiée — c'est sur le terrain que ça se joue.</i>",
            note_s))

    def _render_cycle_separator(story, label, name, weeks, descr, cycle_num=1):
        """Page séparateur de cycle (light_full, design éditorial enrichi).
        cycle_num : 1 (BLOC 1/Développement), 2 (BLOC 2/Intensification)"""
        story.append(NextPageTemplate('light_full'))
        story.append(PageBreak())
        story.append(Spacer(1, 60*mm))
        eb = ParagraphStyle('cs_eb', fontName='Inter-Bold', fontSize=11,
                              textColor=CYAN_DARK, alignment=TA_CENTER, spaceAfter=12,
                              leading=13)
        story.append(Paragraph(f"·   {label}   ·", eb))
        t1 = ParagraphStyle('cs_t1', fontName='Inter-Black', fontSize=52, leading=58,
                              textColor=NOIR, alignment=TA_CENTER, spaceAfter=4)
        story.append(Paragraph(name, t1))
        w_s = ParagraphStyle('cs_w', fontName='Inter-Black', fontSize=14, leading=18,
                               textColor=CYAN_DARK, alignment=TA_CENTER, spaceAfter=14)
        story.append(Paragraph(weeks, w_s))
        d_s = ParagraphStyle('cs_d', fontName='Inter-Med', fontSize=12, leading=18,
                               textColor=GRIS_DARK, alignment=TA_CENTER,
                               leftIndent=24, rightIndent=24, spaceAfter=16)
        story.append(Paragraph(descr, d_s))
        # Filet décoratif cyan court
        from reportlab.platypus import HRFlowable as _HR_cs
        story.append(_HR_cs(width=28*mm, thickness=1.5, color=CYAN_DARK,
                              spaceBefore=0, spaceAfter=12, hAlign='CENTER'))
        # Stats hero (semaines × séances)
        st_n = ParagraphStyle('cs_stn', fontName='Inter-Black', fontSize=24,
                                textColor=NOIR, alignment=TA_CENTER, leading=26,
                                spaceAfter=2)
        st_l = ParagraphStyle('cs_stl', fontName='Inter-Bold', fontSize=8,
                                textColor=GRIS_DARK, alignment=TA_CENTER,
                                leading=10)
        st_cells = [
            [Paragraph("4", st_n), Paragraph("SEMAINES", st_l)],
            [Paragraph("20", st_n), Paragraph("SÉANCES", st_l)],
            [Paragraph("5", st_n), Paragraph("PAR SEM", st_l)],
        ]
        st_t = Table([st_cells], colWidths=[55*mm, 55*mm, 54*mm])
        st_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEAFTER', (0,0), (-2,0), 0.3, HexColor('#D8D3C5')),
        ]))
        story.append(st_t)

    # ─── SEMAINE 1 — Construction (4 séances) ────────────────────────────────
    def _render_seance_s1_j1(story):
        _render_seance(story,
            num=1, semaine=1, jour="LUN", kind="MUSCU", code="FMB",
            title_h="FORCE MAX.", title_b="BAS DU CORPS.",
            eyebrow_section="·  S1  ·  FORCE MAX BAS",
            objectif="Première séance du cycle. On apprend le geste, on évalue la charge "
                     "que tu peux tenir. Reste à 70-75 % 1RM, garde 2-3 reps en réserve. "
                     "Cette semaine est une calibration — pas une perf.",
            duree="60 min", intensite="MODÉRÉE", materiel="BARRE + RACK",
            warmup=[
                "5 min vélo / corde — montée FC progressive",
                "Mobilité hanche + cheville (CARs, 30s par côté)",
                "Squat à vide × 10 · Goblet squat × 8 · Barre vide × 5",
            ],
            main_exos=[
                ("Back squat barre", "4", "8", "70 % 1RM", "2'30"),
                ("Soulevé de terre", "3", "6", "70 % 1RM", "3 min"),
                ("Hip thrust barre", "3", "10", "65 % 1RM", "2 min"),
            ],
            accessoires=[
                ("Step up haltères", "3", "8 / jambe", "Charge confort", "1'30"),
                ("Leg curl assis", "3", "12", "Charge contrôlée", "1'30"),
                ("Mollets debout machine", "3", "15", "Charge confort", "1 min"),
            ],
            finisher=[
                "Wall sit 3 × 30s (genoux 90°, dos plaqué)",
            ],
            watchpoints=[
                "<b>Squat</b> — talons au sol, genoux dans l'axe des pieds, descente jusqu'à fémur parallèle minimum.",
                "<b>SDT</b> — dos plat, hanche qui recule, barre qui frôle les jambes.",
                "<b>Reste léger cette semaine</b> — tu construis la base technique. Les charges montent dès S2.",
            ],
            recup="Marche 10 min à la fin. Étirements chaîne postérieure (5 min). "
                  "Glucides + protéines dans l'heure. Sommeil 7h+ obligatoire pour absorber la séance.",
        )

    def _render_seance_s1_j2(story):
        _render_seance(story,
            num=2, semaine=1, jour="MAR", kind="COURSE", code="VIT",
            title_h="VITESSE PURE.", title_b="SPRINT & AGILITY.",
            eyebrow_section="·  S1  ·  VITESSE & AGILITY",
            objectif="Réveil des fibres rapides. Sprints courts à intensité maximale. "
                     "Récup complète obligatoire entre chaque sprint. Cette semaine, "
                     "on découvre le travail vitesse — pas de chrono à battre.",
            duree="45 min", intensite="MAXIMALE", materiel="TERRAIN + PLOTS",
            warmup=[
                "8 min jogging progressif + mobilité dynamique (genoux hauts, talons-fesses, skip)",
                "4 × 50 m strides à 80 % vitesse max",
                "Démarrages courts : 3 × 10 m à 90 %",
            ],
            main_exos=[
                ("Sprint 10 m départ semi", "6", "10 m", "100 %", "1 min"),
                ("Sprint 20 m départ semi", "5", "20 m", "100 %", "2 min"),
                ("Sprint 30 m départ semi", "4", "30 m", "100 %", "3 min"),
            ],
            accessoires=[
                ("T-drill agility", "4", "1 passage", "Max vitesse", "2 min"),
                ("Shuttle 5-10-5", "4", "1 passage", "Max vitesse", "2 min"),
            ],
            finisher=[],
            watchpoints=[
                "<b>Récup complète</b> entre chaque sprint. Essoufflé = attends. La qualité prime.",
                "<b>Position de départ</b> — semi-fente, centre gravité bas, premier pas court et explosif.",
                "<b>Si tu sors de coupure</b>, le 1er sprint sera mou. Normal. Ça revient au 3-4e.",
            ],
            recup="Marche 10 min très lente. Étirements ischios + mollets + fléchisseurs hanche "
                  "(10 min). Protéines + glucides dans l'heure. Évite le froid extrême après vitesse.",
        )

    def _render_seance_s1_j3(story):
        _render_seance(story,
            num=3, semaine=1, jour="JEU", kind="MUSCU", code="FMH",
            title_h="FORCE MAX.", title_b="HAUT DU CORPS.",
            eyebrow_section="·  S1  ·  FORCE MAX HAUT",
            objectif="Solliciter pousser, tirer, stabiliser — les 3 patterns du haut du corps "
                     "en sport collectif. Calibration des charges sur Bench et Tractions. "
                     "Reste à 70 % 1RM, technique parfaite.",
            duree="55 min", intensite="MODÉRÉE", materiel="BARRE + BANC + BARRE FIXE",
            warmup=[
                "5 min rameur / vélo (FC progressive)",
                "Rotations épaules + ouverture pectoraux (2 × 10)",
                "Bench à vide × 10 · Tractions assistées × 5",
            ],
            main_exos=[
                ("Développé couché barre", "4", "8", "70 % 1RM", "2'30"),
                ("Tractions pronation", "4", "5-8", "PdC (+ lest si possible)", "2'30"),
                ("Développé militaire debout", "3", "8", "65 % 1RM", "2 min"),
            ],
            accessoires=[
                ("Rowing barre buste penché", "3", "10", "70 % 1RM", "1'30"),
                ("Dips lestés", "3", "8", "PdC + 5-10 kg", "1'30"),
                ("Face pulls câble", "3", "15", "Léger contrôlé", "1 min"),
            ],
            finisher=[
                "Curl biceps + Triceps barre EZ — 3 séries superset 10/10",
            ],
            watchpoints=[
                "<b>Bench</b> — pieds au sol, omoplates serrées, barre sur le bas du pectoral.",
                "<b>Tractions</b> — buste droit, omoplates qui amorcent. Menton au-dessus de la barre.",
                "<b>Dev militaire</b> — pas d'hyperextension lombaire. Si tu cambres : baisse la charge.",
            ],
            recup="Étirements pectoraux + grand dorsal + épaules postérieures (8 min). "
                  "Protéines 30-40 g dans l'heure. Hydratation. Sommeil prioritaire.",
        )

    def _render_seance_s1_j4(story):
        _render_seance(story,
            num=4, semaine=1, jour="SAM", kind="COURSE", code="CDT",
            title_h="CONDITIONING.", title_b="BASE AÉROBIE.",
            eyebrow_section="·  S1  ·  CONDITIONING",
            objectif="Remettre le moteur cardio en route. Tu travailles ta base aérobie — "
                     "celle qui te permet de répéter les efforts en match pendant 80 min. "
                     "Pas de PR à chercher. Régularité avant intensité.",
            duree="40 min", intensite="MODÉRÉE", materiel="TERRAIN / PISTE",
            warmup=[
                "5 min jogging très lent (test de la conversation)",
                "Talons-fesses · montées de genoux · skip · pas chassés (2 × 20 m chacun)",
                "Strides : 3 × 50 m à 70 % vitesse max",
            ],
            main_exos=[
                ("Intervalles 30/30", "1 bloc × 10", "30s effort/30s marche", "85 % FCM en effort", "Sans"),
                ("Récup active", "—", "5 min marche", "FC < 130", "—"),
                ("Intervalles 400 m", "5", "400 m", "Allure 5 km PR + 30s", "2 min marche"),
            ],
            accessoires=[],
            finisher=[
                "10 min jogging très lent (récup active)",
            ],
            watchpoints=[
                "<b>Régularité &gt; vitesse</b> — vise des splits constants, pas un sprint final.",
                "<b>Respiration nasale</b> autant que possible, sauf en phase haute intensité.",
                "<b>FC trop haute au repos le matin</b> ? Réduis le volume de 30 %.",
            ],
            recup="Étirements doux (ischio, mollets, fléchisseurs de hanche) 8-10 min. "
                  "Sel + eau dans l'heure post. Boisson sucrée si la séance était dure. "
                  "Repas glucidique dans les 90 min.",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION MOBILITÉ / ÉTIREMENTS — 3 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    MB_eyebrow = ParagraphStyle('mb_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    MB_eyebrow_r = ParagraphStyle('mb_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _mb_header(story, num_label):
        t = Table(
            [[Paragraph("·  MOBILITÉ", MB_eyebrow),
              Paragraph(num_label, MB_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _mb_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _mb_header(story, num_label)

    def _mb_title(story, line1, line2=None):
        s1 = ParagraphStyle('mb_t1', fontName='Inter-Black', fontSize=34, leading=38,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('mb_t2', fontName='Inter-Black', fontSize=34, leading=38,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_mobilite_section(story):
        """3 pages magazine — Mobilité / Étirements."""

        mb_sec_lbl = ParagraphStyle('mb_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        mb_body = ParagraphStyle('mb_b', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=8)

        # ═══════ PAGE 1/3 — POURQUOI LA MOBILITÉ ══════════════════════════════
        _mb_new_page(story, "01 / 03", first=True)
        _mb_title(story, "POURQUOI LA MOBILITÉ.", "N'EST PAS OPTIONNELLE.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "La mobilité, c'est la capacité de ton corps à bouger sur toute "
            "l'amplitude d'un mouvement, <b>avec contrôle</b>. Pour un athlète, "
            "ce n'est pas un luxe — c'est non négociable.",
            mb_body))

        story.append(Spacer(1, 6*mm))
        story.append(Paragraph("·  TROIS RAISONS DE T'Y METTRE", mb_sec_lbl))
        story.append(Spacer(1, 4*mm))

        raisons = [
            (chr(0xe730), "PERFORMANCE",  # person-simple-run-fill
             "Tu ne peux pas sauter haut si tes chevilles sont raides. Pas squatter profond si tes hanches sont bloquées. Pas plaquer si tes épaules sont fermées."),
            (chr(0xe40c), "PRÉVENTION BLESSURES",  # shield-check-fill
             "Un muscle qui ne peut pas s'étirer va finir par se déchirer. La plupart des blessures musculaires arrivent en bout d'amplitude."),
            (chr(0xe0cc), "RÉCUPÉRATION",  # bed-fill
             "Tissus mobiles = meilleure circulation sanguine = meilleure récupération entre les séances."),
        ]
        r_icn = ParagraphStyle('mb_ricn', fontName='Phosphor-Fill', fontSize=22,
                                 textColor=CYAN_DARK, alignment=TA_CENTER, leading=24)
        r_lbl = ParagraphStyle('mb_rl', fontName='Inter-Black', fontSize=12,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=14,
                                 spaceAfter=4)
        r_body = ParagraphStyle('mb_rb', fontName='Inter-Reg', fontSize=10,
                                  textColor=NOIR, alignment=TA_LEFT, leading=14)
        for icn, lbl, body in raisons:
            text_cell = [Paragraph(lbl, r_lbl), Paragraph(body, r_body)]
            t = Table([[text_cell]], colWidths=[164*mm])
            t.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(t)
            story.append(Spacer(1, 3*mm))

        story.append(Spacer(1, 6*mm))
        punch = ParagraphStyle('mb_pn', fontName='Inter-Bold', fontSize=11,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=15)
        story.append(Paragraph(
            "Erreur n°1 des athlètes amateurs : zéro travail de mobilité. "
            "Ils s'entraînent dur, ils ne s'étirent jamais. Ils plafonnent. "
            "Ils se blessent.", punch))

        story.append(Spacer(1, 10*mm))
        story.append(_photo_bandeau(NUT_IMG_DIR / "mb-stretch.jpg",
                                      "PHOTO ATHLÈTE EN ÉTIREMENT"))

        # ═══════ PAGE 2/3 — LES 3 ZONES (avec mini-photo par zone) ════════════
        _mb_new_page(story, "02 / 03")
        _mb_title(story, "LES 3 ZONES.", "À TRAVAILLER.")
        story.append(Spacer(1, 8*mm))

        zones = [
            ("01", "LES HANCHES", "mb-hanches.jpg",
             "Zone n°1 pour l'athlète. Sprint, saut, squat, changement de direction.",
             ["90/90 : 5 reps / côté",
              "Pigeon stretch : 30-60 s / côté",
              "Hip flexor + Hip CARs"]),
            ("02", "LES CHEVILLES", "mb-chevilles.jpg",
             "Critique pour le squat profond, le sprint, les changements de direction.",
             ["Knee to wall : viser 10-12 cm",
              "Calf raises descente lente : 3 × 10-15",
              "Ankle CARs : 10 cercles / côté"]),
            ("03", "ÉPAULES + T-SPINE", "mb-epaules.jpg",
             "Pour développés, tractions, overhead, plaquages, passes.",
             ["Shoulder dislocates (bâton) : 10 reps",
              "Wall slides : 10 reps",
              "T-spine rotation 4 pattes"]),
        ]
        z_n = ParagraphStyle('mb_zn', fontName='Inter-Black', fontSize=22,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=24)
        z_t = ParagraphStyle('mb_zt', fontName='Inter-Black', fontSize=12,
                               textColor=NOIR, alignment=TA_LEFT, leading=14,
                               spaceAfter=3)
        z_d = ParagraphStyle('mb_zd', fontName='Inter-Reg', fontSize=9.5,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=12,
                               spaceAfter=4)
        z_e = ParagraphStyle('mb_ze', fontName='Inter-Reg', fontSize=9,
                               textColor=NOIR, alignment=TA_LEFT, leading=12,
                               spaceAfter=1)

        for num, name, photo_file, desc, exos in zones:
            num_cell = Paragraph(num, z_n)
            text_cell = [Paragraph(name, z_t), Paragraph(desc, z_d)]
            for ex in exos:
                text_cell.append(Paragraph(
                    f"<font color='#00A38F'>→</font>  {ex}", z_e))
            # Mini-photo carrée à droite
            photo_path = NUT_IMG_DIR / photo_file
            photo_cell = _mini_photo_or_placeholder(photo_path, 36, 38,
                                                    f"PHOTO\n{name}")
            row = Table([[num_cell, text_cell, photo_cell]],
                        colWidths=[22*mm, 104*mm, 38*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('VALIGN', (2,0), (2,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(row)
            story.append(Spacer(1, 3*mm))

        # ═══════ PAGE 3/3 — ROUTINE 10 MIN + ERREUR STATIQUES ════════════════
        _mb_new_page(story, "03 / 03")
        _mb_title(story, "10 MINUTES.", "PAR JOUR.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "Pas le temps ? Voici la version condensée qui couvre l'essentiel. "
            "À faire le matin ou avant ton échauffement.", mb_body))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  TIMELINE 10 MINUTES", mb_sec_lbl))

        timeline = [
            ("0-2 min", "WORLD'S GREATEST STRETCH", "Fente avant + rotation du tronc — 5 reps / côté"),
            ("2-4 min", "HIP CARs", "5 reps / côté"),
            ("4-6 min", "KNEE TO WALL + CALF RAISES", "10 reps / côté"),
            ("6-8 min", "SHOULDER DISLOCATES", "Bâton, 10 reps"),
            ("8-10 min", "T-SPINE ROTATION", "4 pattes, 10 reps / côté"),
        ]
        t_n = ParagraphStyle('mb_tn', fontName='Inter-Black', fontSize=10,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=12)
        t_t = ParagraphStyle('mb_tt', fontName='Inter-Black', fontSize=10.5,
                               textColor=NOIR, alignment=TA_LEFT, leading=13)
        t_d = ParagraphStyle('mb_td', fontName='Inter-Reg', fontSize=9.5,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        for time, name, desc in timeline:
            row = Table([[Paragraph(time, t_n), Paragraph(name, t_t),
                          Paragraph(desc, t_d)]],
                        colWidths=[24*mm, 60*mm, 80*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        story.append(Spacer(1, 10*mm))

        # Warning box étirements statiques
        warn_style = ParagraphStyle('mb_wn', fontName='Inter-Med', fontSize=10.5,
                                      textColor=NOIR, alignment=TA_LEFT, leading=15,
                                      leftIndent=14, borderPadding=(12, 14, 12, 14),
                                      backColor=HexColor('#EEF9F7'))
        warn_t = Table([[Paragraph(
            "<b><font color='#00A38F'>L'ERREUR.</font></b>  Les étirements "
            "<b>statiques</b> AVANT l'entraînement diminuent la production de "
            "force pendant 1 heure. Avant la séance : <b>mobilité dynamique</b> "
            "uniquement. Statiques = APRÈS la séance.",
            warn_style)]], colWidths=[164*mm])
        warn_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(warn_t)

        story.append(Spacer(1, 8*mm))
        story.append(_a_retenir([
            "10 min de mobilité chaque jour OFF. Hanche, cheville, épaule, thoracique.",
            "Étirement statique : seulement APRÈS la séance, jamais avant.",
            "Avant la séance = dynamique uniquement (CARs articulaires, swings).",
            "Mobilité &gt; flexibilité. Tu veux contrôler ta zone d'amplitude, pas juste y aller.",
        ]))

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION RÉCUPÉRATION — 3 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    RC_eyebrow = ParagraphStyle('rc_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    RC_eyebrow_r = ParagraphStyle('rc_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _rc_header(story, num_label):
        t = Table(
            [[Paragraph("·  RÉCUPÉRATION", RC_eyebrow),
              Paragraph(num_label, RC_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _rc_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _rc_header(story, num_label)

    def _rc_title(story, line1, line2=None):
        s1 = ParagraphStyle('rc_t1', fontName='Inter-Black', fontSize=34, leading=38,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('rc_t2', fontName='Inter-Black', fontSize=34, leading=38,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_recuperation_section(story):
        """3 pages magazine — Récupération."""

        rc_sec_lbl = ParagraphStyle('rc_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        rc_body = ParagraphStyle('rc_b', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=8)

        # ═══════ PAGE 1/3 — LES 3 PILIERS ═════════════════════════════════════
        _rc_new_page(story, "01 / 03", first=True)
        _rc_title(story, "TU PROGRESSES.", "QUAND TU RÉCUPÈRES.")
        story.append(Spacer(1, 10*mm))

        # Quote hero XL — éditorial premium
        rc_q = ParagraphStyle('rc_q', fontName='Inter-Black', fontSize=22,
                                leading=28, textColor=CYAN_DARK, alignment=TA_LEFT,
                                leftIndent=14)
        q_t = Table([[Paragraph(
            "« L'entraînement ne récompense pas celui qui en fait le plus. "
            "Il récompense celui qui <b>récupère le mieux</b>. »",
            rc_q)]], colWidths=[164*mm])
        q_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t)
        story.append(Spacer(1, 12*mm))

        story.append(Paragraph(
            "À l'entraînement, tu crées un stimulus. La progression ne se fait "
            "pas pendant la séance. Elle se fait <b>après</b>. C'est le principe "
            "de la <b>surcompensation</b> : tu travailles, tu fatigues, tu "
            "récupères, tu deviens plus fort.",
            rc_body))

        story.append(Spacer(1, 6*mm))
        story.append(Paragraph("·  LES 3 PILIERS", rc_sec_lbl))
        story.append(Spacer(1, 4*mm))

        piliers = [
            (chr(0xe0cc), "01", "SOMMEIL", "8 H MIN",  # bed-fill
             "C'est là que tes fibres se reconstruisent et que tes hormones (testostérone, GH) se sécrètent."),
            (chr(0xeaa4), "02", "ALIMENTATION", "2 H POST",  # bowl-food-fill
             "Fenêtre métabolique : tes cellules assimilent 2-3 fois mieux les nutriments dans les 2h après la séance."),
            (chr(0xe210), "03", "HYDRATATION", "3 L / JOUR",  # drop-fill
             "Influence contraction musculaire, performance et récupération. Si tu as soif, t'es déjà déshydraté."),
        ]
        p_icn = ParagraphStyle('rc_pic', fontName='Phosphor-Fill', fontSize=24,
                                 textColor=CYAN_DARK, alignment=TA_CENTER, leading=26)
        p_n = ParagraphStyle('rc_pn', fontName='Inter-Black', fontSize=22,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=22,
                               spaceAfter=2)
        p_t = ParagraphStyle('rc_pt', fontName='Inter-Black', fontSize=12,
                               textColor=NOIR, alignment=TA_LEFT, leading=14)
        p_v = ParagraphStyle('rc_pv', fontName='Inter-Bold', fontSize=10,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=12,
                               spaceAfter=4)
        p_b = ParagraphStyle('rc_pb', fontName='Inter-Reg', fontSize=9.5,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        for icn, num, name, val, body in piliers:
            text_cell = [Paragraph(num, p_n),
                    Paragraph(f"<b>{name}</b> &nbsp; <font color='#00A38F'>{val}</font>",
                              ParagraphStyle('rc_pcomp', fontName='Inter-Black',
                                              fontSize=12, textColor=NOIR,
                                              alignment=TA_LEFT, leading=14, spaceAfter=4)),
                    Paragraph(body, p_b)]
            t = Table([[text_cell]], colWidths=[164*mm])
            t.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(t)
            story.append(Spacer(1, 3*mm))

        # ═══════ PAGE 2/3 — LE SOMMEIL (détail) ══════════════════════════════
        _rc_new_page(story, "02 / 03")
        _rc_title(story, "LE SOMMEIL.", "TON ARME N°1.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "8 heures min par nuit. <b>Non négociable</b> pour un athlète. "
            "Voici ce qui le contrôle — et ce qui le casse.", rc_body))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  LES PIÈGES À ÉVITER", rc_sec_lbl))

        pieges = [
            ("CAFÉINE",
             "Demi-vie 5-7h. Café à 17h = encore actif à minuit.",
             "→ Pas de caféine après 14h-15h."),
            ("ALCOOL",
             "Dégrade sommeil profond, récupération hormonale, composition corporelle.",
             "→ À éviter en semaine d'entraînement."),
            ("ÉCRANS",
             "Lumière bleue inhibe la mélatonine. Sommeil retardé, moins réparateur.",
             "→ Coupure 1h avant le coucher."),
        ]
        for name, body, sol in pieges:
            cell = [Paragraph(name, p_v),
                    Paragraph(body, p_b),
                    Spacer(1, 2*mm),
                    Paragraph(sol,
                              ParagraphStyle('rc_sol', fontName='Inter-Bold',
                                              fontSize=9.5, textColor=CYAN_DARK,
                                              alignment=TA_LEFT, leading=12))]
            t = Table([[cell]], colWidths=[164*mm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(t)
            story.append(Spacer(1, 3*mm))

        story.append(Spacer(1, 6*mm))

        # Tip box magnésium
        tip_style = ParagraphStyle('rc_tip', fontName='Inter-Med', fontSize=10.5,
                                     textColor=NOIR, alignment=TA_LEFT, leading=15,
                                     leftIndent=14, borderPadding=(12, 14, 12, 14),
                                     backColor=HexColor('#EEF9F7'))
        tip_t = Table([[Paragraph(
            "<b><font color='#00A38F'>L'ARME SECRÈTE.</font></b>  200-300 mg de "
            "magnésium <b>bisglycinate</b> 20-30 min avant le coucher. Effet "
            "calmant sur le système nerveux. 76 % des Français sont carencés.",
            tip_style)]], colWidths=[164*mm])
        tip_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(tip_t)

        story.append(Spacer(1, 8*mm))
        story.append(_photo_bandeau(NUT_IMG_DIR / "rc-sommeil.jpg",
                                      "PHOTO CHAMBRE / SOMMEIL", h_mm=58))

        # ═══════ PAGE 3/3 — PROTOCOLE NUTRITION + SIGNAUX ════════════════════
        _rc_new_page(story, "03 / 03")
        _rc_title(story, "PROTOCOLE 5 ÉTAPES.", "AUTOUR DE LA SÉANCE.")
        story.append(Spacer(1, 8*mm))

        proto = [
            ("EN CONTINU",  "Glucides quotidiens suffisants pour stocks de glycogène pleins."),
            ("1 H AVANT",   "Glucides simples (banane, dattes) + un peu de protéines."),
            ("PENDANT",     "Si > 1 h : 40-60 g glucides / h (boisson maison ou fruits secs)."),
            ("DANS 1 H",    "15-30 g protéines + 45-90 g glucides. Ratio 1/3 protéines, 2/3 glucides."),
            ("2 H APRÈS",   "Repas complet (protéines + glucides + légumes)."),
        ]
        pr_n = ParagraphStyle('rc_prn', fontName='Inter-Black', fontSize=10,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=12)
        pr_b = ParagraphStyle('rc_prb', fontName='Inter-Reg', fontSize=10,
                                textColor=NOIR, alignment=TA_LEFT, leading=13)
        for when, what in proto:
            row = Table([[Paragraph(when, pr_n), Paragraph(what, pr_b)]],
                        colWidths=[34*mm, 130*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 7),
                ('BOTTOMPADDING', (0,0), (-1,-1), 7),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        story.append(Spacer(1, 12*mm))
        story.append(Paragraph("·  SIGNAUX D'OVERTRAINING — CHECKLIST", rc_sec_lbl))
        story.append(Spacer(1, 4*mm))

        signaux = [
            "Fatigue qui s'accumule sans descendre",
            "Récupération de plus en plus longue à charge identique",
            "Inflammations qui persistent (tendons, articulations)",
            "Baisse progressive des performances",
            "Sommeil dégradé sans raison",
            "Irritabilité, motivation qui chute",
            "Système immunitaire affaibli",
            "Rythme cardiaque repos plus élevé que d'habitude (+5 bpm)",
        ]
        sg_st = ParagraphStyle('rc_sg', fontName='Inter-Reg', fontSize=9.5,
                                 textColor=NOIR, alignment=TA_LEFT, leading=13,
                                 spaceAfter=3)
        for sg in signaux:
            story.append(Paragraph(
                f"<font color='#00A38F'>☐</font>  &nbsp; {sg}", sg_st))

        story.append(Spacer(1, 8*mm))
        story.append(Paragraph(
            "<b>3-4 cases cochées en même temps ?</b> Tu es probablement en "
            "sur-sollicitation. Réduis le volume, l'intensité ou la fréquence. "
            "Ajoute du sommeil et de la nutrition.",
            ParagraphStyle('rc_fin', fontName='Inter-Med', fontSize=10,
                             textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)))

        story.append(Spacer(1, 8*mm))
        story.append(_a_retenir([
            "Sommeil 8h MIN. Le levier #1, devant l'entraînement et la nutrition.",
            "Chambre 18-19°C, noire, silencieuse. Pas négociable.",
            "Magnésium bisglycinate 400 mg le soir — récup nerveuse + sommeil profond.",
            "Surentraînement = FC repos +10 bpm le matin. STOP, ne pousse pas.",
        ]))

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION MINDSET — 2 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    MS_eyebrow = ParagraphStyle('ms_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    MS_eyebrow_r = ParagraphStyle('ms_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _ms_header(story, num_label):
        t = Table(
            [[Paragraph("·  MINDSET", MS_eyebrow),
              Paragraph(num_label, MS_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _ms_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _ms_header(story, num_label)

    def _ms_title(story, line1, line2=None):
        s1 = ParagraphStyle('ms_t1', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('ms_t2', fontName='Inter-Black', fontSize=36, leading=40,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_mindset_section(story):
        """2 pages magazine — Mindset."""

        ms_sec_lbl = ParagraphStyle('ms_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        ms_body = ParagraphStyle('ms_b', fontName='Inter-Reg', fontSize=10.5,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=16,
                                   spaceAfter=8)

        # ═══════ PAGE 1/3 — DISCIPLINE > MOTIVATION ═══════════════════════════
        _ms_new_page(story, "01 / 03", first=True)
        _ms_title(story, "DISCIPLINE.", "PAS MOTIVATION.")
        story.append(Spacer(1, 10*mm))

        # Pull quote géante
        ms_q = ParagraphStyle('ms_pq', fontName='Inter-Black', fontSize=22,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=28,
                                leftIndent=14)
        q_t = Table([[Paragraph(
            "« La motivation va et vient. La <b>discipline</b>, elle, doit rester. »",
            ms_q)]], colWidths=[164*mm])
        q_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t)
        story.append(Spacer(1, 12*mm))

        story.append(Paragraph(
            "Tu peux te sentir au top un lundi et complètement vidé un jeudi. "
            "C'est normal. C'est précisément dans ces moments où tu n'as pas "
            "envie que tout se joue. <b>La plupart des gens arrêtent là.</b> "
            "Ne sois pas comme eux.",
            ms_body))

        story.append(Spacer(1, 6*mm))
        story.append(Paragraph("·  4 TRUCS QUAND LA MOTIVATION CHUTE", ms_sec_lbl))
        story.append(Spacer(1, 4*mm))

        trucs = [
            ("01", "RÉDUIS LE SEUIL",
             "Pas envie de la séance complète ? Promets-toi juste l'échauffement. 9/10, tu finiras la séance. L'inertie de démarrer est plus dure que de continuer."),
            ("02", "RECONNECTE-TOI À TON POURQUOI",
             "Pourquoi t'es-tu mis à ça ? Quel objectif tu vises ? Si tu peux pas répondre, tes objectifs sont flous (relis le 1er exercice)."),
            ("03", "CHANGE LE CONTEXTE",
             "Séance impossible ? Va à la salle quand même, fais 30 min de mobilité, mange ton repas, hydrate-toi. La régularité gagne sur l'intensité."),
            ("04", "LANCE UN MICRO-CHALLENGE",
             "Battre tes reps à 80 %, finir un temps de rameur, faire X tractions. Court, atteignable, qui casse la routine."),
        ]
        tr_n = ParagraphStyle('ms_tn', fontName='Inter-Black', fontSize=20,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=22)
        tr_t = ParagraphStyle('ms_tt', fontName='Inter-Black', fontSize=11,
                                textColor=NOIR, alignment=TA_LEFT, leading=13,
                                spaceAfter=3)
        tr_b = ParagraphStyle('ms_tb', fontName='Inter-Reg', fontSize=9.5,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        for num, name, body in trucs:
            num_cell = Paragraph(num, tr_n)
            text_cell = [Paragraph(name, tr_t), Paragraph(body, tr_b)]
            row = Table([[num_cell, text_cell]], colWidths=[22*mm, 142*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(row)
            story.append(Spacer(1, 2*mm))

        # ═══════ PAGE 2/2 — CONCENTRE-TOI + HABITUDES ════════════════════════
        _ms_new_page(story, "02 / 03")
        _ms_title(story, "LA SALLE.", "TERRAIN DE JEU SÉRIEUX.")
        story.append(Spacer(1, 10*mm))

        story.append(Paragraph(
            "La salle, c'est un terrain de jeu. Mais un terrain de jeu "
            "<b>sérieux</b>. Pendant tes séries, sois concentré. Prépare-toi "
            "avant chaque rep. Donne tout.",
            ms_body))

        story.append(Paragraph(
            "Si tu passes tes séances le téléphone à la main — à scroller "
            "entre les séries, à répondre à des messages, à discuter avec ton "
            "pote pendant 5 minutes entre chaque set — tu fais <b>50 % de ta "
            "séance</b>. Et tu y restes 2 fois plus longtemps.",
            ms_body))

        story.append(Spacer(1, 6*mm))

        # Rule box
        rule_style = ParagraphStyle('ms_rl', fontName='Inter-Med', fontSize=10.5,
                                      textColor=NOIR, alignment=TA_LEFT, leading=15,
                                      leftIndent=14, borderPadding=(12, 14, 12, 14),
                                      backColor=HexColor('#EEF9F7'))
        rule_t = Table([[Paragraph(
            "<b><font color='#00A38F'>RÈGLE SIMPLE.</font></b>  1 h 30 max à "
            "la salle. Téléphone en <b>mode avion</b> ou dans le sac. "
            "Concentration à 100 %. Tu sors plus fort, pas plus fatigué.",
            rule_style)]], colWidths=[164*mm])
        rule_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(rule_t)
        story.append(Spacer(1, 12*mm))

        story.append(Paragraph("·  AJOUTE, NE SUPPRIME PAS", ms_sec_lbl))
        story.append(Paragraph(
            "Le cerveau humain a beaucoup de mal avec la soustraction. En "
            "revanche, il est à l'aise avec l'addition. Pour faire émerger "
            "des comportements d'athlète, <b>ajoute</b> des nouvelles habitudes "
            "jusqu'à ce qu'elles prennent le dessus sur les anciennes.",
            ms_body))

        story.append(Spacer(1, 4*mm))

        habs = [
            ("AU LIEU DE", "AJOUTE"),
            ("Virer le Coca",
             "500 ml d'eau + 1 pincée de sel naturel au réveil"),
            ("Arrêter le scroll réseaux",
             "20 min de mobilité après le dîner"),
            ("Couper la malbouffe",
             "Préparer ton meal prep dimanche soir"),
            ("Stopper Netflix tard",
             "Lire 10 pages sur ton sport avant de dormir"),
        ]
        h_t1 = ParagraphStyle('ms_ht1', fontName='Inter-Black', fontSize=9,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=11)
        h_t2 = ParagraphStyle('ms_ht2', fontName='Inter-Black', fontSize=9,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=11)
        h_b1 = ParagraphStyle('ms_hb1', fontName='Inter-Med', fontSize=10,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)
        h_b2 = ParagraphStyle('ms_hb2', fontName='Inter-Bold', fontSize=10,
                                textColor=NOIR, alignment=TA_LEFT, leading=13)

        for i, (left, right) in enumerate(habs):
            if i == 0:
                # Header
                row = Table([[Paragraph(left, h_t1), Paragraph(right, h_t2)]],
                            colWidths=[80*mm, 84*mm])
                row.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 4),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                    ('LINEBELOW', (0,0), (-1,0), 0.5, CYAN_DARK),
                ]))
            else:
                row = Table([[Paragraph(left, h_b1), Paragraph(right, h_b2)]],
                            colWidths=[80*mm, 84*mm])
                row.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
                ]))
            story.append(row)

        story.append(Spacer(1, 8*mm))
        story.append(_a_retenir([
            "Discipline &gt; motivation. La motivation vient et part. La discipline reste.",
            "Quand la motivation chute, réduis le seuil — fais l'échauffement seul.",
            "Téléphone en mode avion à la salle. Focus = +50 % de qualité.",
            "Ajoute, ne supprime pas. Le cerveau gère mieux l'addition.",
        ]))

        # ═══════ PAGE 3/3 — IDENTITÉ D'ATHLÈTE + RÈGLE QUI RÉSUME TOUT ═══════
        _ms_new_page(story, "03 / 03")
        _ms_title(story, "IDENTITÉ.", "QUAND PERSONNE NE REGARDE.")
        story.append(Spacer(1, 6*mm))

        # Pull quote XL plus compact
        ms_q_small = ParagraphStyle('ms_pqs', fontName='Inter-Black', fontSize=17,
                                      textColor=CYAN_DARK, alignment=TA_LEFT, leading=22,
                                      leftIndent=14)
        q_t3 = Table([[Paragraph(
            "« C'est ce que tu fais quand <b>personne ne regarde</b> "
            "qui définit qui tu es vraiment. »",
            ms_q_small)]], colWidths=[164*mm])
        q_t3.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_t3)
        story.append(Spacer(1, 6*mm))

        story.append(Paragraph(
            "L'athlète sérieux, c'est celui qui fait ces choses <b>en silence</b>. "
            "Quand il n'y a rien à prouver. Quand personne ne saura jamais. "
            "Pose-toi la question chaque matin :",
            ms_body))

        story.append(Spacer(1, 4*mm))

        # Quote box centrale dark — la question du matin
        question_style = ParagraphStyle('ms_qb', fontName='Inter-Black', fontSize=13,
                                          textColor=BLANC, alignment=TA_CENTER, leading=18)
        qbox = Table([[Paragraph(
            "« Aujourd'hui, qu'est-ce que je fais qui prouve "
            "que je suis <font color='#02D1BA'>vraiment un athlète</font> ? »",
            question_style)]], colWidths=[164*mm])
        qbox.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), ENCRE),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(qbox)

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(
            "Si la réponse est « <b>rien</b> », tu n'es pas un athlète ce jour-là. "
            "Tu es quelqu'un qui <i>veut être</i> un athlète. Pas pareil.",
            ms_body))

        story.append(Spacer(1, 6*mm))
        story.append(Paragraph("·  LA RÈGLE QUI RÉSUME TOUT", ms_sec_lbl))
        story.append(Spacer(1, 3*mm))

        # 3 lignes "Si tu... — fais-le vraiment" compact
        rule_n = ParagraphStyle('ms_rln', fontName='Inter-Black', fontSize=9.5,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                                  spaceAfter=2)
        rule_b = ParagraphStyle('ms_rlb', fontName='Inter-Med', fontSize=10,
                                  textColor=NOIR, alignment=TA_LEFT, leading=13)
        regles_finales = [
            ("01", "SI TU VAS À LA SALLE",
             "Entraîne-toi <b>vraiment</b>. Pas le téléphone, pas 5 min de discussion entre les sets."),
            ("02", "SI TU MANGES POUR TON CORPS",
             "Mange-le <b>vraiment</b>. Pas en mode dégueulasse devant Netflix."),
            ("03", "SI TU DORS POUR RÉCUPÉRER",
             "Dors <b>vraiment</b>. Pas le téléphone à 1 h du matin."),
        ]
        for num, name, body in regles_finales:
            num_cell = Paragraph(num, ParagraphStyle('rfn', fontName='Inter-Black',
                                                       fontSize=16, textColor=CYAN_DARK,
                                                       alignment=TA_LEFT, leading=18))
            text_cell = [Paragraph(name, rule_n), Paragraph(body, rule_b)]
            row = Table([[num_cell, text_cell]], colWidths=[20*mm, 144*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 12),
                ('TOPPADDING', (0,0), (-1,-1), 7),
                ('BOTTOMPADDING', (0,0), (-1,-1), 7),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(row)
            story.append(Spacer(1, 1.5*mm))

        story.append(Spacer(1, 4*mm))

        # Punch final
        punch_final = ParagraphStyle('ms_pf', fontName='Inter-Black', fontSize=12,
                                       textColor=CYAN_DARK, alignment=TA_LEFT, leading=17,
                                       leftIndent=14)
        pfin = Table([[Paragraph(
            "Tout ce que tu fais à moitié — tu le payes en résultats à moitié.",
            punch_final)]], colWidths=[164*mm])
        pfin.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(pfin)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION FAQ — 3 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    FQ_eyebrow = ParagraphStyle('fq_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    FQ_eyebrow_r = ParagraphStyle('fq_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _fq_header(story, num_label):
        t = Table(
            [[Paragraph("·  FAQ", FQ_eyebrow),
              Paragraph(num_label, FQ_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _fq_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _fq_header(story, num_label)

    def _fq_title(story, line1, line2=None):
        s1 = ParagraphStyle('fq_t1', fontName='Inter-Black', fontSize=32, leading=36,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('fq_t2', fontName='Inter-Black', fontSize=32, leading=36,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def _fq_qa(story, num, question, answer):
        """Rendu Q/R style édito magazine : numéro géant cyan + Q./R. typographiques."""
        # Numéro géant cyan dark
        n_lbl = ParagraphStyle('fq_n', fontName='Inter-Black', fontSize=26,
                                 textColor=CYAN_DARK, alignment=TA_LEFT, leading=28)
        # Question bold noir avec prefix Q.
        q_txt = ParagraphStyle('fq_qt', fontName='Inter-Black', fontSize=12.5,
                                 textColor=NOIR, alignment=TA_LEFT, leading=15,
                                 spaceAfter=6)
        # Réponse regular avec prefix R. cyan
        a_txt = ParagraphStyle('fq_at', fontName='Inter-Reg', fontSize=10,
                                 textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)
        cell_l = Paragraph(num, n_lbl)
        cell_r = [
            Paragraph(
                f"<font color='#00A38F'><b>Q.</b></font> &nbsp; {question}",
                q_txt),
            Paragraph(
                f"<font color='#00A38F'><b>R.</b></font> &nbsp; {answer}",
                a_txt),
        ]
        row = Table([[cell_l, cell_r]], colWidths=[18*mm, 146*mm])
        row.setStyle(TableStyle([
            ('VALIGN', (0,0), (0,0), 'TOP'),
            ('VALIGN', (1,0), (1,0), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#D8D3C5')),
        ]))
        story.append(row)

    def build_faq_section(story):
        """3 pages magazine — FAQ."""

        fq_sec_lbl = ParagraphStyle('fq_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)

        # ═══════ PAGE 1/3 — SUR LE PROGRAMME ══════════════════════════════════
        _fq_new_page(story, "01 / 03", first=True)
        _fq_title(story, "TOUTES LES QUESTIONS.", "QU'ON ME POSE.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph("·  SUR LE PROGRAMME", fq_sec_lbl))

        qa_prog = [
            ("01", "À qui s'adresse ce programme ?",
             "À tous ceux qui veulent transformer leur physique, gagner en force et améliorer leur performance sur le terrain. Débutant ou confirmé — il s'adapte (ajustements charges et volumes selon ton niveau)."),
            ("02", "Combien de séances par semaine ?",
             "6 séances par semaine (4 muscu + 2 course), environ 1 h 30 chacune pour la muscu, 45-60 min pour la course. Si tu peux pas faire 6, vise 4-5. Mieux vaut 4 régulières pendant 12 sem que 6 pendant 3 sem avant de craquer."),
            ("03", "Que signifie « RIR » ?",
             "RIR = Répétitions En Réserve. 2 RIR = tu termines ta série en ayant encore 2 reps avant l'échec. Façon plus précise de doser l'intensité que « jusqu'à l'échec »."),
            ("04", "Hypertrophie vs force ?",
             "HYPERTROPHIE = masse musculaire (70-85 % 1RM, beaucoup de reps). FORCE = puissance pure (85-100 % 1RM, peu de reps). Le programme combine les deux."),
            ("05", "Le programme est-il sécurisé ?",
             "Oui si tu respectes : charges adaptées à ton niveau, bonne technique, temps de repos, échauffement. Ne remplace pas un avis médical. Antécédents ? Consulte avant."),
            ("06", "Adapté en pré-saison rugby ?",
             "C'est même son objectif principal. Si tu as des entraînements terrain, réduis la fréquence muscu à 3-4 / sem. La règle : performance terrain > salle."),
        ]
        for n, q, a in qa_prog:
            _fq_qa(story, n, q, a)

        # ═══════ PAGE 2/3 — NUTRITION + RÉCUP ═════════════════════════════════
        _fq_new_page(story, "02 / 03")
        _fq_title(story, "NUTRITION.", "& RÉCUPÉRATION.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph("·  CARBURANT + REPAIR", fq_sec_lbl))

        qa_nut = [
            ("07", "Besoin de compléments pour progresser ?",
             "Non, ils sont optionnels. Ordre des priorités : créatine > oméga-3 > magnésium > vitamine D > sel naturel. Alimentation solide reste la priorité."),
            ("08", "Que contient le guide nutritionnel ?",
             "Calcul calories, choix d'objectif (PdM / PdG / recompo), répartition macros, timing avant/pendant/après séance + autour des matches, journée 2800 kcal, liste aliments."),
            ("09", "Comment optimiser ma récup et mon lifestyle ?",
             "Les 3 piliers : 8 h de sommeil min, protéines + glucides suffisants, eau + sel naturel. Bonus : écoute ton corps. Régularité > intensité."),
            ("10", "Programme adapté si végétarien / vegan ?",
             "Oui. Adapter via tofu/tempeh/seitan, légumineuses, protéines végétales en poudre, quinoa, oléagineux. Plus de volume alimentaire. B12 obligatoire en vegan."),
            ("11", "Cardio possible en prise de masse ?",
             "Oui, à faible intensité (2-3 × 30-45 min marche/vélo/natation). Objectif : santé cardio + récup + capacités. Pas de HIIT en prise de masse sérieuse."),
        ]
        for n, q, a in qa_nut:
            _fq_qa(story, n, q, a)

        # ═══════ PAGE 3/3 — TROUBLESHOOTING + CONTACT ════════════════════════
        _fq_new_page(story, "03 / 03")
        _fq_title(story, "TROUBLESHOOTING.", "&  CONTACT.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph("·  QUAND ÇA SE PASSE PAS COMME PRÉVU", fq_sec_lbl))

        qa_ts = [
            ("12", "Et si je rate une séance ?",
             "Pas de rattrapage en doublant la suivante. Reprends à la séance suivante normalement. 1 séance ratée : aucun ajustement. 2 d'affilée : priorise les séances principales. 3+ : reviens à 1 sem d'intro à 75-80 %."),
            ("13", "Si je peux pas faire un exercice ?",
             "Remplace par un mouvement de la MÊME famille de pattern (genou / hanche / répulsion / tirage / saut). Priorité aux main lifts. Blessure ? Ne mets pas tout en pause — 80 % du corps reste dispo."),
            ("14", "Fatigué : je force ou je repose ?",
             "FATIGUE PONCTUELLE (mauvaise nuit) → adapter : -15 % top sets, 3 séries au lieu de 4, repos plus longs, garde les main lifts. FATIGUE STRUCTURELLE → réduire ou reposer."),
            ("15", "Combien de séances de sprint / sem ?",
             "HORS-SAISON : 2 séances séparées de 48-72 h. EN SAISON : 1 séance dédiée (le match compte). Récup : 1 min par 10 m de sprint. Sinon tu travailles la fatigue, pas la vitesse."),
            ("16", "Quand re-tester ma baseline ?",
             "Jour 1 / S4 / S8 sur les 5 tests du chapitre 5. Hebdo : marqueurs perceptifs (sommeil, énergie, RPE). Tous les 8-12 sem : test 1RM ou 3RM formel. Pas trop souvent."),
            ("17", "Comment te contacter ?",
             "Direct sur Instagram <b>@rb_perform</b>. Sois précis (contexte, ce que tu as essayé, ta question) = je peux t'aider mieux et plus vite."),
        ]
        for n, q, a in qa_ts:
            _fq_qa(story, n, q, a)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION CONCLUSION + CTA — 2 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    CC_eyebrow = ParagraphStyle('cc_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    CC_eyebrow_r = ParagraphStyle('cc_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _cc_header(story, num_label):
        t = Table(
            [[Paragraph("·  CONCLUSION", CC_eyebrow),
              Paragraph(num_label, CC_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _cc_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _cc_header(story, num_label)

    def _cc_title(story, line1, line2=None):
        s1 = ParagraphStyle('cc_t1', fontName='Inter-Black', fontSize=42, leading=46,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('cc_t2', fontName='Inter-Black', fontSize=42, leading=46,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_conclusion_section(story):
        """2 pages magazine — Conclusion + CTA."""

        cc_sec_lbl = ParagraphStyle('cc_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        cc_body = ParagraphStyle('cc_b', fontName='Inter-Reg', fontSize=11,
                                   textColor=NOIR, alignment=TA_LEFT, leading=17,
                                   spaceAfter=10)

        # ═══════ PAGE 1/2 — JUSQU'AU BOUT ═════════════════════════════════════
        _cc_new_page(story, "01 / 04", first=True)
        _cc_title(story, "JUSQU'AU", "BOUT.")
        story.append(Spacer(1, 6*mm))

        # ─── Pull-quote compact d'ouverture (style édito magazine) ─────
        pq_style = ParagraphStyle('cc_pq', fontName='Inter-Black', fontSize=15,
                                    textColor=CYAN_DARK, alignment=TA_LEFT, leading=20,
                                    spaceAfter=2, leftIndent=4)
        story.append(Paragraph(
            "<font color='#02D1BA'>«</font> &nbsp; Le terrain ne reconnaît pas les "
            "intentions. Que les actes. &nbsp;<font color='#02D1BA'>»</font>",
            pq_style))
        # Filet décoratif sous la pull-quote
        from reportlab.platypus import HRFlowable as _HR_pq
        story.append(_HR_pq(width=28*mm, thickness=1, color=CYAN_DARK,
                             spaceBefore=4, spaceAfter=10, hAlign='LEFT'))

        story.append(Paragraph(
            "Si t'es sur cette page, t'es allé jusqu'au bout. La plupart des "
            "mecs qui achètent un ebook ne dépassent jamais la moitié. "
            "Toi, oui. Déjà ça, c'est un truc.",
            cc_body))

        story.append(Paragraph(
            "Maintenant c'est simple. Soit tu fermes le PDF et dans deux "
            "semaines t'as oublié 80 % de ce que t'as lu. Soit tu mets en "
            "pratique. Je vais pas te mentir : c'est la deuxième option qui "
            "change ta vie sur le terrain.",
            cc_body))

        story.append(Spacer(1, 10*mm))
        story.append(Paragraph("·  CE QUE TU FAIS MAINTENANT", cc_sec_lbl))
        story.append(Spacer(1, 4*mm))

        etapes = [
            ("01", "TU REFAIS LES 5 TESTS",
             "Reviens au <link href='#chapter-4'><font color='#00A38F'><b>chapitre Tests physiques</b></font></link>. Note tes scores S0. Mets un rappel à S4 et S8 dans ton téléphone."),
            ("02", "TU PLANIFIES TES SÉANCES",
             "Cette semaine. Dans ton agenda. Comme un rdv pro qu'on annule pas. C'est le seul vrai engagement. Va voir l'<link href='#index-seances'><font color='#00A38F'><b>index des séances</b></font></link>."),
            ("03", "TU M'ÉCRIS UNE QUESTION",
             "Une seule. La plus importante. DM @rb_perform. Je réponds dès que je peux."),
        ]
        n_st = ParagraphStyle('cc_n', fontName='Inter-Black', fontSize=24,
                                textColor=CYAN_DARK, alignment=TA_LEFT, leading=26)
        t_st = ParagraphStyle('cc_tt', fontName='Inter-Black', fontSize=13,
                                textColor=NOIR, alignment=TA_LEFT, leading=15,
                                spaceAfter=4)
        b_st = ParagraphStyle('cc_bb', fontName='Inter-Reg', fontSize=10,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)
        for num, name, body in etapes:
            num_cell = Paragraph(num, n_st)
            text_cell = [Paragraph(name, t_st), Paragraph(body, b_st)]
            row = Table([[num_cell, text_cell]], colWidths=[18*mm, 146*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 12),
                ('BOTTOMPADDING', (0,0), (-1,-1), 12),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(row)
            story.append(Spacer(1, 3*mm))

        # ═══════ PAGE 2/2 — ÉCRIS-MOI ════════════════════════════════════════
        _cc_new_page(story, "02 / 04")
        _cc_title(story, "ÉCRIS-MOI.", "QUAND TU VEUX.")
        story.append(Spacer(1, 14*mm))

        # CTA 1 — Instagram
        cta1_lbl = ParagraphStyle('cc_c1l', fontName='Inter-Bold', fontSize=9,
                                    textColor=HexColor('#A8E5DC'), alignment=TA_LEFT, leading=11,
                                    spaceAfter=8)
        cta1_big = ParagraphStyle('cc_c1b', fontName='Inter-Black', fontSize=32,
                                    textColor=BLANC, alignment=TA_LEFT, leading=36,
                                    spaceAfter=8)
        cta1_sub = ParagraphStyle('cc_c1s', fontName='Inter-Med', fontSize=11,
                                    textColor=HexColor('#EEF9F7'), alignment=TA_LEFT,
                                    leading=16)
        # QR Instagram (carré blanc sur fond cyan dark)
        qr_insta = _make_qr("https://instagram.com/rb_perform", size_mm=26)
        qr_lbl_s = ParagraphStyle('qr_il', fontName='Inter-Bold', fontSize=8,
                                    textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                                    leading=10, spaceBefore=4)
        qr_cell = Table([[qr_insta], [Paragraph("SCAN", qr_lbl_s)]],
                         colWidths=[30*mm])
        qr_cell.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), BLANC),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (0,0), 2),
            ('BOTTOMPADDING', (0,0), (0,0), 2),
        ]))
        insta_url = "https://instagram.com/rb_perform"
        text_inner = [
            Paragraph("·  INSTAGRAM", cta1_lbl),
            Paragraph(f'<link href="{insta_url}">DM @rb_perform.</link>', cta1_big),
            Paragraph("T'es bloqué quelque part dans le programme ? T'as une "
                       "question précise ? Écris-moi en DM. Sois clair (où "
                       "t'en es, ce que tu vois pas) — je peux t'aider mieux.",
                       cta1_sub),
        ]
        cta1_inner = [Table([[text_inner, qr_cell]], colWidths=[100*mm, 30*mm])]
        cta1_inner[0].setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        cta1_t = Table([[cta1_inner]], colWidths=[164*mm])
        cta1_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
            ('LEFTPADDING', (0,0), (-1,-1), 22),
            ('RIGHTPADDING', (0,0), (-1,-1), 22),
            ('TOPPADDING', (0,0), (-1,-1), 22),
            ('BOTTOMPADDING', (0,0), (-1,-1), 22),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(cta1_t)
        story.append(Spacer(1, 10*mm))

        # CTA 2 — Mini bloc pré-transition vers la page 3/3 (accompagnement complet)
        cta2_sub = ParagraphStyle('cc_c2s', fontName='Inter-Med', fontSize=11,
                                    textColor=GRIS_DARK, alignment=TA_LEFT, leading=16)
        story.append(Paragraph(
            "Cet ebook, c'est <b>la méthode</b>. Mais si tu veux que je te "
            "<b>tienne par la main</b> sur tout le chemin — programme calibré, "
            "vidéos corrigées, ajustements semaine après semaine — tourne la "
            "page.", cta2_sub))

        story.append(Spacer(1, 18*mm))

        # ─── Signature finale premium (style édito magazine) ────────────
        # Filet décoratif court à droite
        from reportlab.platypus import HRFlowable as _HR_sig
        sig_line = _HR_sig(width=40*mm, thickness=1, color=CYAN_DARK,
                             spaceBefore=0, spaceAfter=6, hAlign='RIGHT')
        story.append(sig_line)
        # Petite mention "écrit par" en small caps
        sig_eb = ParagraphStyle('cc_sigeb', fontName='Inter-Bold', fontSize=8,
                                  textColor=CYAN_DARK, alignment=TA_RIGHT, leading=10,
                                  spaceAfter=4)
        story.append(Paragraph(
            "É C R I T &nbsp;&nbsp; P A R", sig_eb))
        # Signature nom XL style script (Inter-Black + italique simulé)
        sig_name = ParagraphStyle('cc_signame', fontName='Inter-Black', fontSize=24,
                                    textColor=NOIR, alignment=TA_RIGHT, leading=28,
                                    spaceAfter=2)
        story.append(Paragraph("Rayan Bonte.", sig_name))
        # Affiliation
        sig_aff = ParagraphStyle('cc_sigaff', fontName='Inter-Med', fontSize=9,
                                   textColor=GRIS_DARK, alignment=TA_RIGHT, leading=12)
        story.append(Paragraph("RB Perform &nbsp;·&nbsp; Édition 2026", sig_aff))

        # ═══════ PAGE 3/4 — RÉSULTATS QUE J'OBTIENS ═══════════════════════════
        _cc_new_page(story, "03 / 04")
        _cc_title(story, "ILS L'ONT", "FAIT.")
        story.append(Spacer(1, 8*mm))

        # Sous-titre intro
        intro_p3 = ParagraphStyle('cc_i3', fontName='Inter-Med', fontSize=12,
                                    textColor=GRIS_DARK, alignment=TA_LEFT, leading=17,
                                    spaceAfter=14)
        story.append(Paragraph(
            "Cinq athlètes. Cinq chemins différents. <b>Une seule méthode.</b>",
            intro_p3))

        # ─── 2 Témoignages featured PRO (Alexis + Muhammed) ───
        ft_lbl = ParagraphStyle('cc_ftl', fontName='Inter-Bold', fontSize=8,
                                  textColor=CYAN_DARK, alignment=TA_LEFT,
                                  leading=10, spaceAfter=4)
        ft_quote = ParagraphStyle('cc_ftq', fontName='Inter-Black', fontSize=12,
                                    textColor=NOIR, alignment=TA_LEFT,
                                    leading=17, spaceAfter=6, leftIndent=2)
        ft_name = ParagraphStyle('cc_ftn', fontName='Inter-Bold', fontSize=10,
                                   textColor=NOIR, alignment=TA_LEFT,
                                   leading=12, spaceAfter=2)
        ft_role = ParagraphStyle('cc_ftr', fontName='Inter-Med', fontSize=8.5,
                                   textColor=GRIS_DARK, alignment=TA_LEFT,
                                   leading=11)

        def _featured_testimony(name, role, quote, photo=None):
            if photo and photo.is_file():
                try:
                    portrait = RLImage(str(photo), width=20*mm, height=20*mm,
                                         kind='proportional')
                except Exception:
                    portrait = Table([[""]], colWidths=[20*mm], rowHeights=[20*mm])
                    portrait.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,-1), HexColor('#1A1A1A')),
                    ]))
            else:
                portrait = Table([[""]], colWidths=[20*mm], rowHeights=[20*mm])
                portrait.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), HexColor('#1A1A1A')),
                ]))
            head = Table([[portrait, [
                Paragraph(name, ft_name),
                Paragraph(role, ft_role),
            ]]], colWidths=[22*mm, 50*mm])
            head.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (0,0), 4),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            return [
                Paragraph("·  TÉMOIGNAGE PRO", ft_lbl),
                Paragraph(
                    f"<font color='#02D1BA'>«</font> &nbsp; {quote} &nbsp;"
                    f"<font color='#02D1BA'>»</font>",
                    ft_quote),
                head,
            ]

        alexis = _featured_testimony(
            "ALEXIS",
            "Rugby XIII pro · Dragons Catalans",
            "+20 kg sur <b>toutes mes perfs</b>. Signé pro aux Dragons "
            "Catalans <b>3 mois plus tard</b>. Je n'ai jamais été "
            "aussi fort.",
            photo=TEMOIN_IMG_DIR / "alexis-portrait.png")
        muhammed = _featured_testimony(
            "MUHAMMED",
            "Joueur professionnel · Turquie",
            "Les programmes sont <b>parfaits</b>. Les résultats sont "
            "incroyables. Je n'ai jamais progressé aussi vite.")

        ft_t = Table([[alexis, muhammed]], colWidths=[80*mm, 80*mm])
        ft_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ('LINEBEFORE', (1,0), (1,-1), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(ft_t)
        story.append(Spacer(1, 10*mm))

        # ─── Bloc Avant / Après transformations ───
        ils_lbl = ParagraphStyle('cc_il', fontName='Inter-Bold', fontSize=9,
                                   textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                                   spaceAfter=4)
        story.append(Paragraph("·  ILS L'ONT FAIT AUSSI", ils_lbl))
        story.append(Spacer(1, 4*mm))

        ba_h = ParagraphStyle('cc_bah', fontName='Inter-Black', fontSize=12,
                                textColor=NOIR, alignment=TA_CENTER, leading=14,
                                spaceAfter=2)
        ba_lbl = ParagraphStyle('cc_balb', fontName='Inter-Bold', fontSize=8,
                                  textColor=CYAN_DARK, alignment=TA_CENTER, leading=10)
        ba_quote = ParagraphStyle('cc_baq', fontName='Inter-Med', fontSize=8.5,
                                    textColor=GRIS_DARK, alignment=TA_CENTER,
                                    leading=11, spaceBefore=2)

        def _avant_apres_cell(name, sport, label, gain_avant, gain_apres, quote,
                                photo_avant=None, photo_apres=None):
            def _photo_or_placeholder(path, placeholder_color):
                if path and path.is_file():
                    try:
                        return RLImage(str(path), width=26*mm, height=38*mm,
                                         kind='proportional')
                    except Exception:
                        pass
                ph = Table([[""]], colWidths=[26*mm], rowHeights=[38*mm])
                ph.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), placeholder_color),
                ]))
                return ph
            ph_avant = _photo_or_placeholder(photo_avant, HexColor('#D8D2C2'))
            ph_apres = _photo_or_placeholder(photo_apres, HexColor('#1A1A1A'))
            photos = Table([[ph_avant, ph_apres]], colWidths=[26*mm, 26*mm])
            photos.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (0,0), 1),
                ('LEFTPADDING', (1,0), (1,0), 1),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            cell = [
                photos,
                Spacer(1, 3),
                Paragraph(f"<b>{name}</b> &nbsp;·&nbsp; {sport}", ba_lbl),
                Paragraph(label, ba_h),
                Paragraph(f"<font color='{CYAN_DARK_HEX}'>« {quote} »</font>", ba_quote),
            ]
            return cell

        CYAN_DARK_HEX = "#00A38F"

        # 3 transformations (clients réels Rayan)
        ba_t = Table([[
            _avant_apres_cell("LÉO", "Muscu", "−16 kg",
                                "107 → 91 kg", "107 → 91 kg",
                                "Sans Rayan, je n'aurais jamais pu atteindre cet objectif. Son aide au quotidien vaut de l'or. C'est le meilleur.",
                                photo_avant=TEMOIN_IMG_DIR / "leo-avant.jpg",
                                photo_apres=TEMOIN_IMG_DIR / "leo-apres-zoom.jpg"),
            _avant_apres_cell("ANDY", "Rugby", "−8 kg",
                                "Sec & rapide", "Sec & rapide",
                                "8 kg en moins sans perdre en perf, juste plus vif sur le terrain."),
            _avant_apres_cell("SÉNAN", "Muscu", "Transformation physique",
                                "Prise de muscle", "Prise de muscle",
                                "Un accompagnement complet. Rayan m'a poussé à atteindre le meilleur de moi-même.",
                                photo_avant=TEMOIN_IMG_DIR / "senan-avant.jpg",
                                photo_apres=TEMOIN_IMG_DIR / "senan-apres.jpg"),
        ]], colWidths=[54*mm, 54*mm, 56*mm])
        ba_t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(ba_t)

        # ═══════ PAGE 4/4 — OFFRE HORMOZI-STYLE ═══════════════════════════════
        _cc_new_page(story, "04 / 04")
        _cc_title(story, "TON TOUR.", "DE SIGNER.")
        story.append(Spacer(1, 8*mm))

        # ─── Bloc vidéo Hormozi : grosse promesse + thumbnail + QR ───
        hv_lbl = ParagraphStyle('cc_hvl', fontName='Inter-Bold', fontSize=9,
                                  textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                                  spaceAfter=4)
        hv_big = ParagraphStyle('cc_hvb', fontName='Inter-Black', fontSize=17,
                                  textColor=NOIR, alignment=TA_LEFT, leading=20,
                                  spaceAfter=6)
        hv_sub = ParagraphStyle('cc_hvs', fontName='Inter-Med', fontSize=10,
                                  textColor=GRIS_DARK, alignment=TA_LEFT, leading=13)

        qr_video = _make_qr("https://rbperform.com/accompagnement", size_mm=26)
        thumb_ph = Table([[""]], colWidths=[48*mm], rowHeights=[27*mm])
        thumb_ph.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#0F0F0F')),
        ]))
        play_lbl = ParagraphStyle('cc_pl', fontName='Inter-Black', fontSize=9,
                                    textColor=CYAN_DARK, alignment=TA_CENTER, leading=11)
        thumb_cell = Table(
            [[thumb_ph], [Paragraph("▶ &nbsp; REGARDE LA VIDÉO", play_lbl)]],
            colWidths=[48*mm])
        thumb_cell.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        video_inner = [
            Paragraph("·  3 MINUTES POUR TOUT COMPRENDRE", hv_lbl),
            Paragraph("Comment je te fais <b>signer pro</b> en 3 mois.", hv_big),
            Paragraph(
                "Ce que tu obtiens, comment je travaille, mes engagements, "
                "et pour qui ce n'est <b>pas</b> fait.", hv_sub),
        ]
        video_block = Table([[thumb_cell, video_inner, qr_video]],
                              colWidths=[50*mm, 86*mm, 28*mm])
        video_block.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
        ]))
        story.append(video_block)
        story.append(Spacer(1, 10*mm))

        # ─── L'OFFRE Hormozi style : ce que tu obtiens ───
        offer_lbl = ParagraphStyle('cc_ofl', fontName='Inter-Bold', fontSize=9,
                                     textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                                     spaceAfter=6)
        offer_big = ParagraphStyle('cc_ofb', fontName='Inter-Black', fontSize=20,
                                     textColor=NOIR, alignment=TA_LEFT, leading=24,
                                     spaceAfter=8)
        offer_bullet = ParagraphStyle('cc_ofbu', fontName='Inter-Med', fontSize=11,
                                        textColor=NOIR, alignment=TA_LEFT, leading=16,
                                        leftIndent=14, spaceAfter=4)
        story.append(Paragraph("·  CE QUE TU OBTIENS", offer_lbl))
        story.append(Paragraph("L'ACCOMPAGNEMENT COMPLET.", offer_big))
        for line in [
            "Ton programme calibré à <b>ton sport</b>, ton niveau, ta saison",
            "Tes vidéos d'exécution <b>analysées et corrigées</b> par moi",
            "Tes ajustements <b>semaine par semaine</b> (charges, repos, intensités)",
            "Ton plan nutrition adapté à <b>tes objectifs</b> (perte, prise, perf)",
            "Mon <b>œil direct</b> sur ta progression — pas un bot, pas un PDF",
        ]:
            story.append(Paragraph(
                f"<font color='#02D1BA'><b>→</b></font> &nbsp; {line}",
                offer_bullet))

        story.append(Spacer(1, 10*mm))

        # ─── CTA FINAL ───
        cta_lbl_f = ParagraphStyle('cc_clf', fontName='Inter-Bold', fontSize=9,
                                     textColor=HexColor('#A8E5DC'), alignment=TA_LEFT,
                                     leading=11, spaceAfter=6)
        cta_big_f = ParagraphStyle('cc_cbf', fontName='Inter-Black', fontSize=22,
                                     textColor=BLANC, alignment=TA_LEFT,
                                     leading=26, spaceAfter=8)
        cta_sub_f = ParagraphStyle('cc_csf', fontName='Inter-Med', fontSize=11,
                                     textColor=HexColor('#EEF9F7'), alignment=TA_LEFT,
                                     leading=15, spaceAfter=6)
        cta_btn = ParagraphStyle('cc_cbtn', fontName='Inter-Black', fontSize=13,
                                   textColor=CYAN_DARK, alignment=TA_CENTER, leading=15)

        btn_cell = Table([[Paragraph(
            "→ &nbsp; <link href='https://rbperform.com/accompagnement'>"
            "POSTULE TON DOSSIER</link>", cta_btn)]],
            colWidths=[140*mm], rowHeights=[18*mm])
        btn_cell.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BLANC),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))

        cta_final = [
            Paragraph("·  PLACES LIMITÉES — SÉLECTION SUR DOSSIER", cta_lbl_f),
            Paragraph("PRÊT À SIGNER ?", cta_big_f),
            Paragraph(
                "Tu postules. Je regarde. Si je dis <b>oui</b>, on attaque. "
                "Si je dis <b>non</b>, je te dis pourquoi et ce que tu peux "
                "travailler seul.",
                cta_sub_f),
            Spacer(1, 4),
            btn_cell,
            Spacer(1, 8),
            Paragraph(
                "« Le meilleur jour pour commencer était hier. Le deuxième, "
                "c'est <b>aujourd'hui.</b> »",
                cta_sub_f),
        ]
        cta_f_t = Table([[cta_final]], colWidths=[164*mm])
        cta_f_t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
            ('LEFTPADDING', (0,0), (-1,-1), 22),
            ('RIGHTPADDING', (0,0), (-1,-1), 22),
            ('TOPPADDING', (0,0), (-1,-1), 22),
            ('BOTTOMPADDING', (0,0), (-1,-1), 22),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(cta_f_t)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION ANNEXES — 3 pages magazine premium
    # ─────────────────────────────────────────────────────────────────────────

    AN_eyebrow = ParagraphStyle('an_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    AN_eyebrow_r = ParagraphStyle('an_ebr', fontName='Inter-Black', fontSize=22,
                                    textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                    leading=24)

    def _an_header(story, num_label):
        t = Table(
            [[Paragraph("·  ANNEXES", AN_eyebrow),
              Paragraph(num_label, AN_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _an_new_page(story, num_label, first=False):
        if not first:
            story.append(NextPageTemplate('light_full'))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        _an_header(story, num_label)

    def _an_title(story, line1, line2=None):
        s1 = ParagraphStyle('an_t1', fontName='Inter-Black', fontSize=34, leading=38,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('an_t2', fontName='Inter-Black', fontSize=34, leading=38,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))

    def build_annexes_section(story):
        """3 pages magazine — Annexes."""

        an_sec_lbl = ParagraphStyle('an_sl', fontName='Inter-Bold', fontSize=9,
                                      textColor=CYAN_DARK, alignment=TA_LEFT,
                                      spaceAfter=6, leading=11)
        an_body = ParagraphStyle('an_b', fontName='Inter-Reg', fontSize=10,
                                   textColor=NOIR, alignment=TA_JUSTIFY, leading=14,
                                   spaceAfter=8)

        # ═══════ PAGE 1/3 — GLOSSAIRE ═════════════════════════════════════════
        _an_new_page(story, "01 / 03", first=True)
        _an_title(story, "GLOSSAIRE.", "DES TERMES TECHNIQUES.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "Tous les termes techniques utilisés dans le programme, expliqués "
            "en une ligne. À garder sous la main.", an_body))

        story.append(Spacer(1, 4*mm))

        # Index alphabétique : terme | définition | chapitre de référence (bookmark key)
        gloss = sorted([
            ("1RM", "Poids maximum que tu peux soulever sur 1 répétition.", "chapter-3"),
            ("BLOC 1", "Phase de développement S2-S6 : technique, volume, hypertrophie ciblée.", "athlete-90"),
            ("BLOC 2", "Phase d'intensification S7-S11 : force max, vitesse, puissance explosive.", "athlete-90"),
            ("BRONCO", "Test cardio rugby : 6 × (60m-40m-20m sans récup). Mesure le RSA.", "chapter-4"),
            ("CMJ", "Counter Movement Jump — saut vertical avec contre-mouvement.", "chapter-4"),
            ("CONCENTRIQUE", "Phase du mouvement où le muscle se contracte (remontée du squat).", "chapter-3"),
            ("CONDITIONING", "Travail cardio général. Base aérobie + intervalles.", "chapter-3"),
            ("EXCENTRIQUE", "Phase où le muscle s'étire sous charge (descente du squat).", "chapter-3"),
            ("HYPERTROPHIE", "Prise de masse musculaire. 70-85 % 1RM, séries longues.", "chapter-3"),
            ("PLIOMÉTRIE", "Sauts et bondissements explosifs pour développer la puissance.", "chapter-3"),
            ("PHASE TEST", "Semaine d'évaluation (S1 et S12) : 10 tests pour mesurer ton niveau et tes progrès.", "athlete-90"),
            ("RFD", "Rate of Force Development — vitesse à laquelle tu produis ta force max.", "chapter-3"),
            ("RIR", "Répétitions En Réserve — combien de reps tu pourrais encore faire après ta série.", "chapter-3"),
            ("RPE", "Rate of Perceived Exertion — note de difficulté ressentie (0 à 10).", "chapter-3"),
            ("RSA", "Repeated Sprint Ability — capacité à répéter des sprints courts.", "chapter-3"),
            ("SOMMEIL PROFOND", "Phase de sommeil clé pour la récup hormonale et la consolidation.", "chapter-10"),
            ("VMA", "Vitesse Maximale Aérobie — repère pour calibrer les intervalles.", "chapter-3"),
            ("ZONE 2", "Cardio basse intensité (FC 60-70 % FCmax). Construit la base aérobie.", "chapter-3"),
        ], key=lambda x: x[0])
        # Transforme en (terme cliquable, définition) — wrapper avec lien interne
        gloss = [(f"<link href='#{key}'>{term}</link>", desc) for term, desc, key in gloss]
        g_n = ParagraphStyle('an_gn', fontName='Inter-Black', fontSize=10.5,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=13)
        g_b = ParagraphStyle('an_gb', fontName='Inter-Reg', fontSize=9.5,
                               textColor=NOIR, alignment=TA_LEFT, leading=13)
        for name, body in gloss:
            row = Table([[Paragraph(name, g_n), Paragraph(body, g_b)]],
                        colWidths=[34*mm, 130*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,0), 0.3, HexColor('#D8D3C5')),
            ]))
            story.append(row)

        # ═══════ PAGE 2/3 — TECHNIQUES D'INTENSIFICATION ══════════════════════
        _an_new_page(story, "02 / 03")
        _an_title(story, "TECHNIQUES.", "D'INTENSIFICATION.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "Pour ceux qui veulent intensifier leurs séances au-delà du "
            "programme de base. À utiliser <b>avec modération</b> — outils "
            "puissants mais coûteux nerveusement.", an_body))

        story.append(Spacer(1, 4*mm))

        techs = [
            ("01", "SÉRIES DÉGRESSIVES",
             "Série classique près de l'échec → 15-20 s repos → −20-30 % de charge → reps jusqu'à l'échec. Tension mécanique + stimulation."),
            ("02", "REST-PAUSE",
             "Série principale → 15-20 s repos sans réduire la charge → max reps → 30-40 s repos → dernière série max. Pousse au-delà de la fatigue."),
            ("03", "TEMPO / NÉGATIFS LENTS",
             "Ralentir l'excentrique (4 s descente, remontée explosive). C'est sur l'excentrique que les dommages musculaires se produisent — donc max stimulation."),
            ("04", "SUPERSETS",
             "Enchaîne 2 exos pour groupes antagonistes sans repos. Ex : tractions + DC. Gain de temps + volume."),
            ("05", "BISETS",
             "Comme supersets mais sur groupes PAS forcément antagonistes. Ex : tirage dos + curl biceps. Intensifie sans rallonger."),
        ]
        t_n = ParagraphStyle('an_tn', fontName='Inter-Black', fontSize=20,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=22)
        t_t = ParagraphStyle('an_tt', fontName='Inter-Black', fontSize=11,
                               textColor=NOIR, alignment=TA_LEFT, leading=13,
                               spaceAfter=2)
        t_b = ParagraphStyle('an_tb', fontName='Inter-Reg', fontSize=9.5,
                               textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        for num, name, body in techs:
            num_cell = Paragraph(num, t_n)
            text_cell = [Paragraph(name, t_t), Paragraph(body, t_b)]
            row = Table([[num_cell, text_cell]], colWidths=[22*mm, 142*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
                ('LEFTPADDING', (0,0), (-1,-1), 14),
                ('RIGHTPADDING', (0,0), (-1,-1), 14),
                ('TOPPADDING', (0,0), (-1,-1), 9),
                ('BOTTOMPADDING', (0,0), (-1,-1), 9),
                ('LINEBEFORE', (0,0), (0,-1), 3, CYAN_DARK),
            ]))
            story.append(row)
            story.append(Spacer(1, 2*mm))

        # ═══════ PAGE 3/3 — THÉORIE AVANCÉE (NERDS) ══════════════════════════
        _an_new_page(story, "03 / 03")
        _an_title(story, "THÉORIE AVANCÉE.", "POUR LES NERDS.")
        story.append(Spacer(1, 8*mm))

        story.append(Paragraph(
            "Les sources et concepts utilisés en préparation physique de haut "
            "niveau. Pour ceux qui veulent <b>creuser</b>.", an_body))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  LA NOMENCLATURE DE ZATSIORSKI", an_sec_lbl))
        story.append(Paragraph(
            "3 types d'effort selon Vladimir Zatsiorski : <b>EFFORTS MAXIMAUX</b> "
            "(85-100 % 1RM), <b>EFFORTS DYNAMIQUES</b> (≤ 70 % avec intention "
            "de vitesse maximale), <b>EFFORTS RÉPÉTÉS</b> (70-85 % beaucoup "
            "de reps).",
            an_body))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  LE CAT (COMPENSATORY ACCELERATION TRAINING)", an_sec_lbl))
        story.append(Paragraph(
            "Principe : sur chaque rep, tu pousses la charge avec une "
            "<b>accélération maximale</b>, peu importe le poids. Gains "
            "supérieurs en force et puissance vs travail à vitesse réduite. "
            "Limite : freinage en fin de mouvement (moins efficace sur "
            "balistique).",
            an_body))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  LE VRT (VARIABLE RESISTANCE TRAINING)", an_sec_lbl))
        story.append(Paragraph(
            "Tu ajoutes une <b>résistance élastique</b> progressive sur la "
            "barre. La charge augmente à mesure que tu remontes → force "
            "l'accélération maximale (CAT automatique). Bénéfices : RFD "
            "augmenté, meilleur transfert vers les gestes explosifs.",
            an_body))

        story.append(Spacer(1, 8*mm))

        # Mini-rappel règle
        rule_style = ParagraphStyle('an_rl', fontName='Inter-Med', fontSize=10.5,
                                      textColor=NOIR, alignment=TA_LEFT, leading=15,
                                      leftIndent=14, borderPadding=(12, 14, 12, 14),
                                      backColor=HexColor('#EEF9F7'))
        rule_t = Table([[Paragraph(
            "<b><font color='#00A38F'>LA RÈGLE LOUIE SIMMONS / FRED MARCÉROU.</font></b><br/>"
            "Quand l'athlète est faible, rends-le fort. Quand il est fort, "
            "rends-le rapide. Quand il est rapide, fais-le répéter.",
            rule_style)]], colWidths=[164*mm])
        rule_t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(rule_t)

        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION HYDRATATION — 3 pages magazine DA RB Perform
    # Remplace le bloc Word "Bonus athlète — Électrolytes & hydratation"
    # ─────────────────────────────────────────────────────────────────────────

    HS_eyebrow = ParagraphStyle('hs_eb', fontName='Inter-Bold', fontSize=10,
                                 textColor=CYAN_DARK, alignment=TA_LEFT,
                                 spaceAfter=4, leading=12)
    HS_eyebrow_r = ParagraphStyle('hs_ebr', fontName='Inter-Black', fontSize=22,
                                   textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                   leading=24)

    def _hyd_header(story, num_label):
        t = Table(
            [[Paragraph("·  HYDRATATION DE L'ATHLÈTE", HS_eyebrow),
              Paragraph(num_label, HS_eyebrow_r)]],
            colWidths=[110*mm, 54*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _hyd_header_narrow(story, num_label):
        """Header pour pages photo droite (col 92mm)."""
        eb_r_n = ParagraphStyle('hs_ebr_n', fontName='Inter-Black', fontSize=20,
                                  textColor=HexColor('#E0DCD0'), alignment=TA_RIGHT,
                                  leading=22)
        t = Table(
            [[Paragraph("·  HYDRATATION", HS_eyebrow), Paragraph(num_label, eb_r_n)]],
            colWidths=[52*mm, 40*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LINEBELOW', (0,0), (-1,0), 0.4, HexColor('#C5C0B5')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6*mm))

    def _hyd_new_page(story, num_label, first=False, photo=False):
        target_template = 'nutrition_photo' if photo else 'light_full'
        if not first:
            story.append(NextPageTemplate(target_template))
            story.append(PageBreak())
        story.append(Spacer(1, 4*mm))
        if photo:
            _hyd_header_narrow(story, num_label)
        else:
            _hyd_header(story, num_label)

    def _hyd_title(story, line1, line2=None, line3=None, narrow=False):
        size = 26 if narrow else 34
        lead = 30 if narrow else 38
        s1 = ParagraphStyle('hs_t1', fontName='Inter-Black', fontSize=size, leading=lead,
                             textColor=NOIR, alignment=TA_LEFT, spaceAfter=0)
        s2 = ParagraphStyle('hs_t2', fontName='Inter-Black', fontSize=size, leading=lead,
                             textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0)
        story.append(Paragraph(line1, s1))
        if line2:
            story.append(Paragraph(line2, s2))
        if line3:
            story.append(Paragraph(line3, s2))

    def _mini_photo_or_placeholder(path, w_mm, h_mm, label="PHOTO"):
        """Retourne RLImage croppée center au ratio cible w/h
        si le fichier existe, sinon un placeholder gris."""
        if path and path.is_file():
            try:
                target_ratio = w_mm / h_mm
                cropped = _crop_to_ratio_if_needed(path, target_ratio)
                img = RLImage(str(cropped), width=w_mm*mm, height=h_mm*mm)
                wrapper = Table([[img]], colWidths=[w_mm*mm], rowHeights=[h_mm*mm])
                wrapper.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ]))
                return wrapper
            except Exception:
                pass
        ph = Table([[""]], colWidths=[w_mm*mm], rowHeights=[h_mm*mm])
        ph.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), HexColor('#E8E4D8')),
        ]))
        return ph

    def build_fondations_avant_supps(story):
        """Bloc remplaçant la section Word "Ce qui te fera plus progresser
        que TOUS ces compléments". Force un PageBreak pour avoir une vraie
        page de clôture éditoriale, plutôt qu'un orphelin de 2 lignes."""
        story.append(PageBreak())
        # Eyebrow + titre éditorial
        eb = ParagraphStyle('fnd_eb', fontName='Inter-Bold', fontSize=9,
                              textColor=CYAN_DARK, alignment=TA_LEFT,
                              spaceAfter=4, leading=11)
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph("·  PRIORITÉS AVANT TOUT", eb))
        ti = ParagraphStyle('fnd_ti', fontName='Inter-Black', fontSize=32,
                              textColor=NOIR, alignment=TA_LEFT, leading=36,
                              spaceAfter=10)
        story.append(Paragraph(
            "Ce qui pèse <font color='#00A38F'>plus</font> que tous ces compléments.",
            ti))

        # Intro compact
        bod = ParagraphStyle('fnd_b', fontName='Inter-Reg', fontSize=10.5,
                              textColor=NOIR, alignment=TA_LEFT, leading=15,
                              spaceAfter=8)
        story.append(Paragraph(
            "Avant d'acheter un seul produit, vérifie que tu coches "
            "<b>ces 3 cases</b>. Si une seule manque, aucune supplémentation "
            "ne sauvera tes performances.",
            bod))

        # 3 cases en grille horizontale
        nm = ParagraphStyle('fnd_n', fontName='Inter-Black', fontSize=18,
                              textColor=CYAN_DARK, alignment=TA_LEFT, leading=20,
                              spaceAfter=2)
        lb = ParagraphStyle('fnd_l', fontName='Inter-Black', fontSize=11,
                              textColor=NOIR, alignment=TA_LEFT, leading=13,
                              spaceAfter=3)
        sb = ParagraphStyle('fnd_s', fontName='Inter-Reg', fontSize=9.5,
                              textColor=GRIS_DARK, alignment=TA_LEFT, leading=12)
        cases = [
            ("01", "SOMMEIL", "Au moins 7 heures par nuit. Non négociable."),
            ("02", "REPAS", "3-4 vrais repas/jour avec assez de protéines."),
            ("03", "HYDRATATION", "Eau + sel naturel quotidiens."),
        ]
        cells = []
        for n, l, s in cases:
            cells.append([Paragraph(n, nm), Paragraph(l, lb), Paragraph(s, sb)])
        tbl = Table([cells], colWidths=[54*mm, 55*mm, 55*mm])
        tbl.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), PAPIER_2),
            ('LEFTPADDING', (0,0), (-1,-1), 14),
            ('RIGHTPADDING', (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 12),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('LINEAFTER', (0,0), (0,0), 0.5, HexColor('#C5C0B5')),
            ('LINEAFTER', (1,0), (1,0), 0.5, HexColor('#C5C0B5')),
        ]))
        story.append(tbl)

        # Punch finale
        story.append(Spacer(1, 10*mm))
        pn = ParagraphStyle('fnd_p', fontName='Inter-Black', fontSize=18,
                              textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                              leftIndent=14)
        pf = Table([[Paragraph(
            "C'est dans cet ordre que tu attaques.<br/>Le reste vient après.",
            pn)]], colWidths=[164*mm])
        pf.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(pf)

        # À RETENIR fin de chapitre
        story.append(Spacer(1, 10*mm))
        story.append(_a_retenir([
            "Créatine + Oméga-3 + Magnésium + D3 = la stack basique de l'athlète.",
            "30-50 €/mois suffisent. Le reste, c'est du marketing.",
            "Sommeil &gt; Repas &gt; Hydratation &gt; Compléments. Dans cet ordre.",
            "Aucun produit ne compense un mauvais sommeil ou une mauvaise alimentation.",
        ]))

    def build_hydration_section(story):
        """3 pages magazine — Hydratation de l'athlète. Premium Ferrari edition."""
        # Avant la 1re page, switch direct en nutrition_photo
        story.append(NextPageTemplate('nutrition_photo'))
        story.append(PageBreak())

        # ═══════ PAGE 1/3 — POURQUOI L'EAU SEULE NE SUFFIT PAS (photo droite) ═
        _hyd_new_page(story, "01 / 03", first=True, photo=True)
        _hyd_title(story, "POURQUOI L'EAU",
                   "SEULE NE", "SUFFIT PAS.", narrow=True)
        story.append(Spacer(1, 10*mm))

        # Quote en italic typographie pure — sans fond — filet cyan gauche
        quote_block_style = ParagraphStyle('hs_qf', fontName='Inter-Med', fontSize=13,
                                             leading=20, textColor=NOIR, alignment=TA_LEFT,
                                             leftIndent=12, rightIndent=0)
        q_table = Table([[Paragraph(
            "« L'eau ne suffit pas à t'hydrater. Boire trop d'eau sans "
            "les minéraux peut te <b>déshydrater encore plus</b>. »",
            quote_block_style)]], colWidths=[92*mm])
        q_table.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LINEBEFORE', (0,0), (0,-1), 2, CYAN_DARK),
        ]))
        story.append(q_table)
        story.append(Spacer(1, 10*mm))

        # Intro body court
        intro_style = ParagraphStyle('hs_intro', fontName='Inter-Reg', fontSize=10,
                                       leading=15, textColor=GRIS_DARK,
                                       alignment=TA_LEFT, spaceAfter=10)
        story.append(Paragraph(
            "L'hydratation ne se résume pas à boire de l'eau — tes cellules ont besoin "
            "de minéraux pour l'absorber et la garder.", intro_style))

        story.append(Spacer(1, 6*mm))

        # Section title
        sec_lbl = ParagraphStyle('hs_sl', fontName='Inter-Bold', fontSize=9,
                                   textColor=CYAN_DARK, alignment=TA_LEFT,
                                   spaceAfter=10, leading=11)
        story.append(Paragraph("·  TROIS RAISONS DE TA CARENCE", sec_lbl))

        # 3 raisons en design ultra-minimaliste — numéro géant + titre + desc
        # Pas de fond, juste filet bas entre les sections (style Ferrari)
        raisons = [
            ("01", "STRESS MODERNE",
             "Le stress chronique appauvrit les minéraux — magnésium et potassium en tête."),
            ("02", "ALIMENTS APPAUVRIS",
             "Les fruits et légumes sont moins denses en nutriments qu'il y a 50 ans."),
            ("03", "EAU SANS MINÉRAUX",
             "Robinet, bouteille, filtrée — souvent dépourvues des minéraux essentiels."),
        ]
        n_st = ParagraphStyle('hs_cn', fontName='Inter-Black', fontSize=24,
                               textColor=CYAN_DARK, alignment=TA_LEFT, leading=24,
                               spaceAfter=0)
        ct_st = ParagraphStyle('hs_ct', fontName='Inter-Black', fontSize=11,
                                textColor=NOIR, alignment=TA_LEFT, spaceAfter=2, leading=14)
        cb_st = ParagraphStyle('hs_cb', fontName='Inter-Reg', fontSize=10,
                                textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)
        for i, (num, title, body) in enumerate(raisons):
            num_cell = Paragraph(num, n_st)
            text_cell = [Paragraph(title, ct_st), Paragraph(body, cb_st)]
            row = Table([[num_cell, text_cell]], colWidths=[16*mm, 76*mm])
            line_bottom = 0.4 if i < len(raisons) - 1 else 0
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LINEBELOW', (0,0), (-1,0), line_bottom, HexColor('#D8D3C5')),
            ]))
            story.append(row)
            if i < len(raisons) - 1:
                story.append(Spacer(1, 2*mm))

        # ═══════ PAGE 2/3 — LES 4 ÉLECTROLYTES (pleine largeur + mini-photos) ═
        _hyd_new_page(story, "02 / 03")
        _hyd_title(story, "LES 4 ÉLECTROLYTES", "À CONNAÎTRE")
        story.append(Spacer(1, 6*mm))

        intro_full = ParagraphStyle('hs_intf', fontName='Inter-Reg', fontSize=10.5,
                                       leading=16, textColor=GRIS_DARK,
                                       alignment=TA_LEFT, spaceAfter=12)
        story.append(Paragraph(
            "Quatre minéraux essentiels que tu perds en transpirant et qu'il faut "
            "remplacer pour rester performant. Apprends-les par cœur.",
            intro_full))

        # 4 lignes : [Badge cyan 32mm] [Texte 96mm] [Mini-photo carrée 32mm]
        electros = [
            ("Na", "SODIUM", "+", "elec-sodium.png",
             "Équilibre des fluides, transmission nerveuse, contraction musculaire. Le discours anti-sel ne s'applique pas à un athlète qui transpire."),
            ("K", "POTASSIUM", "+", "elec-potassium.png",
             "Contraction musculaire, équilibre acido-basique, rythme cardiaque. Perte importante pendant l'effort long."),
            ("Mg", "MAGNÉSIUM", "²⁺", "elec-magnesium.png",
             "300+ réactions biochimiques. Contraction musculaire, production d'ATP, qualité du sommeil."),
            ("Cl", "CHLORURE", "−", "elec-chlorure.png",
             "Équilibre des liquides corporels, pression sanguine. Souvent associé au sodium dans le sel naturel."),
        ]
        sym_box_style = ParagraphStyle('hs_sym', fontName='Inter-Black', fontSize=30,
                                         textColor=BLANC, alignment=TA_CENTER, leading=32)
        sym_charge_style = ParagraphStyle('hs_chg', fontName='Inter-Bold', fontSize=13,
                                            textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                                            leading=14)
        el_name = ParagraphStyle('hs_eln', fontName='Inter-Black', fontSize=13,
                                   textColor=NOIR, alignment=TA_LEFT, spaceAfter=4, leading=15)
        el_desc = ParagraphStyle('hs_eld', fontName='Inter-Reg', fontSize=10,
                                   textColor=GRIS_DARK, alignment=TA_LEFT, leading=14)

        for sym, name, charge, photo_file, desc in electros:
            # Badge cyan dark plein (carré 32×32mm)
            sym_cell = Table(
                [[Paragraph(sym, sym_box_style)],
                 [Paragraph(charge, sym_charge_style)]],
                colWidths=[32*mm], rowHeights=[22*mm, 8*mm])
            sym_cell.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), CYAN_DARK),
                ('VALIGN', (0,0), (0,0), 'MIDDLE'),
                ('VALIGN', (0,1), (0,1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            # Texte (nom + description)
            text_cell = [Paragraph(name, el_name), Paragraph(desc, el_desc)]
            # Mini-photo source alimentaire (32×30mm)
            photo_path = NUT_IMG_DIR / photo_file
            photo_cell = _mini_photo_or_placeholder(photo_path, 32, 30, f"{sym}\nSOURCES")

            row = Table([[sym_cell, text_cell, photo_cell]],
                        colWidths=[32*mm, 96*mm, 36*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (0,0), 'TOP'),
                ('VALIGN', (1,0), (1,0), 'MIDDLE'),
                ('VALIGN', (2,0), (2,0), 'TOP'),
                ('LEFTPADDING', (0,0), (0,0), 0),
                ('LEFTPADDING', (1,0), (1,0), 14),
                ('LEFTPADDING', (2,0), (2,0), 4),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            story.append(row)
            story.append(Spacer(1, 5*mm))

        # ═══════ PAGE 3/3 — PRINCIPE CLÉ (photo droite) ════════════════════════
        _hyd_new_page(story, "03 / 03", photo=True)
        _hyd_title(story, "LE PRINCIPE", "CLÉ.", narrow=True)
        story.append(Spacer(1, 10*mm))

        # Hero stat — design Ferrari (typographie pure, pas de fond saturé)
        rule_lbl_p = ParagraphStyle('hs_rl_p', fontName='Inter-Bold', fontSize=9,
                                       textColor=CYAN_DARK, alignment=TA_LEFT, leading=11,
                                       spaceAfter=8)
        rule_big_p = ParagraphStyle('hs_rb_p', fontName='Inter-Black', fontSize=28,
                                       textColor=NOIR, alignment=TA_LEFT, leading=32,
                                       spaceAfter=8)
        rule_sub_p = ParagraphStyle('hs_rs_p', fontName='Inter-Med', fontSize=10,
                                       textColor=GRIS_DARK, alignment=TA_LEFT, leading=15)

        story.append(Paragraph("·  LA RÈGLE QUI CHANGE TOUT", rule_lbl_p))
        story.append(Paragraph(
            "1 pincée de gros<br/>sel naturel<br/>dans <font color='#00A38F'>500 ml</font> d'eau.",
            rule_big_p))
        story.append(Paragraph(
            "Sel Celtique ou Himalaya. <b>Jamais</b> de sel de table industriel. "
            "À boire chaque matin et avant chaque entraînement.",
            rule_sub_p))

        story.append(Spacer(1, 12*mm))

        # Filet décoratif
        from reportlab.platypus import HRFlowable
        story.append(HRFlowable(width=92*mm, thickness=0.4,
                                 color=HexColor('#D8D3C5'), spaceBefore=0, spaceAfter=8))

        # Section combien d'eau (compact)
        sec_lbl_p = ParagraphStyle('hs_sl_p', fontName='Inter-Bold', fontSize=9,
                                     textColor=CYAN_DARK, alignment=TA_LEFT,
                                     spaceAfter=6, leading=11)
        story.append(Paragraph("·  COMBIEN D'EAU PAR JOUR ?", sec_lbl_p))

        intro_eau_p = ParagraphStyle('hs_ie_p', fontName='Inter-Reg', fontSize=9.5,
                                       textColor=GRIS_DARK, alignment=TA_LEFT, leading=13,
                                       spaceAfter=6)
        story.append(Paragraph(
            "Repère : 1 L pour 22 kg de poids de corps (athlète très actif).",
            intro_eau_p))

        eau_data = [
            ["75 kg", "≈ 3,4 L"],
            ["85 kg", "≈ 3,9 L"],
            ["95 kg", "≈ 4,3 L"],
        ]
        eau_t = Table(eau_data, colWidths=[46*mm, 46*mm])
        eau_t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Inter-Med'),
            ('FONTNAME', (1,0), (1,-1), 'Inter-Black'),
            ('FONTSIZE', (0,0), (-1,-1), 11),
            ('TEXTCOLOR', (0,0), (0,-1), NOIR),
            ('TEXTCOLOR', (1,0), (1,-1), CYAN_DARK),
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 7),
            ('BOTTOMPADDING', (0,0), (-1,-1), 7),
            ('LINEBELOW', (0,0), (-1,-2), 0.3, HexColor('#D8D3C5')),
        ]))
        story.append(eau_t)
        story.append(Spacer(1, 10*mm))

        # Apports par activité — design minimaliste
        story.append(Paragraph("·  APPORTS PAR ACTIVITÉ", sec_lbl_p))
        apports = [
            ("&lt; 2h", "Ton alimentation couvre tes pertes."),
            ("&gt; 2h / chaleur", "Boisson maison : eau + 1 pincée sel + fruits."),
            ("Effort long", "200-400 mg potassium / h (banane, eau coco)."),
            ("Match", "Boire toutes les 15-20 min."),
        ]
        ap_lbl_p = ParagraphStyle('hs_apl_p', fontName='Inter-Bold', fontSize=9,
                                    textColor=CYAN_DARK, alignment=TA_LEFT, spaceAfter=0,
                                    leading=11)
        ap_body_p = ParagraphStyle('hs_apb_p', fontName='Inter-Reg', fontSize=9.5,
                                     textColor=NOIR, alignment=TA_LEFT, leading=12)
        for cond, val in apports:
            row = Table([[Paragraph(cond, ap_lbl_p), Paragraph(val, ap_body_p)]],
                        colWidths=[30*mm, 62*mm])
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            story.append(row)

        # Retour au template chapter pour la suite
        story.append(NextPageTemplate('chapter'))

    # ─────────────────────────────────────────────────────────────────────────

    # Chapitres
    chapter_num = 0
    in_complement = False  # On skip les body originaux quand on est dans une section complément
    in_nutrition_custom = False  # Skip le contenu Word du chapitre Nutrition (remplacé par notre section)
    in_hydration_custom = False  # Skip le contenu Word du bloc Bonus athlète Électrolytes
    in_fondations_custom = False  # Skip le contenu Word du bloc "Ce qui te fera plus progresser"
    in_intro_custom = False  # Skip le contenu Word du chapitre Intro (remplacé)
    in_bb_custom = False  # Skip le contenu Word du chapitre Bodybuilder vs Athlète
    in_ea_custom = False  # Skip le contenu Word du chapitre L'entraînement athlétique
    in_tp_custom = False  # Skip le contenu Word du chapitre Tests physiques
    in_ip_custom = False  # Skip le contenu Word du chapitre Intro programme
    in_pg_custom = False  # Skip le contenu Word du chapitre Programme 8 semaines
    in_mb_custom = False  # Skip le contenu Word du chapitre Mobilité
    in_rc_custom = False  # Skip le contenu Word du chapitre Récupération
    in_ms_custom = False  # Skip le contenu Word du chapitre Mindset
    in_fq_custom = False  # Skip le contenu Word du chapitre FAQ
    in_cc_custom = False  # Skip le contenu Word du chapitre Conclusion
    in_an_custom = False  # Skip le contenu Word du chapitre Annexes
    first_body_in_chapter = False  # Drop cap sur le 1er paragraphe du chapitre
    for type_, text in elements:
        # Reset du skip dès qu'on rencontre un élément structurel
        if type_ in ('h1', 'h2', 'h3'):
            in_complement = False
        if type_ == 'h1':
            # h1 reset les skips de sections custom
            in_nutrition_custom = False
            in_hydration_custom = False
            in_fondations_custom = False
            in_intro_custom = False
            in_bb_custom = False
            in_ea_custom = False
            in_tp_custom = False
            in_ip_custom = False
            in_pg_custom = False
            in_mb_custom = False
            in_rc_custom = False
            in_ms_custom = False
            in_fq_custom = False
            in_cc_custom = False
            in_an_custom = False
            # Si on a un chapitre précédent et qu'il a une citation à insérer après
            if chapter_num in quotes_after_chapter:
                quote, author = quotes_after_chapter[chapter_num]
                add_quote_page(story, quote, author)
            chapter_num += 1
            num = chapter_num
            title_ = text
            # Override titre chap.VI : la source Word dit "Programme 8 semaines"
            # mais le programme actuel est ATHLÈTE 90 (12 sem × 6 séances = 72)
            if chapter_num == 6:
                title_ = "ATHLÈTE 90 — Programme"
            # Injection PARTIE I/II/III avant les chapitres frontières
            if chapter_num == 1:
                build_part_separator(story, "I", "COMPRENDRE.")
            elif chapter_num == 4:
                build_part_separator(story, "II", "S'ENTRAÎNER.")
            elif chapter_num == 9:
                build_part_separator(story, "III", "RÉCUPÉRER.")
            t_strip = title_.lower().strip()
            is_nutrition = t_strip in ('nutrition athlète', 'nutrition')
            is_intro = t_strip == 'intro'
            is_bb = 'bodybuilder' in t_strip and 'athl' in t_strip
            is_ea = t_strip in ("l'entraînement athlétique", 'théorie athlète', "entrainement athletique")
            is_tp = t_strip in ('tests physiques', 'tests baseline')
            is_ip = t_strip == 'intro programme'
            is_pg = 'athlète 90' in t_strip or 'programme 8' in t_strip
            is_mb = 'mobilité' in t_strip or 'étirements' in t_strip
            is_rc = t_strip == 'récupération'
            is_ms = t_strip == 'mindset'
            is_fq = 'faq' in t_strip or 'troubleshooting' in t_strip
            is_cc = 'conclusion' in t_strip
            is_an = t_strip == 'annexes'
            sep_next = 'nutrition_photo' if is_nutrition else (
                       'light_full' if (is_intro or is_bb or is_ea or is_tp or is_ip or is_pg or is_mb
                                        or is_rc or is_ms or is_fq or is_cc or is_an) else 'chapter')
            ChapterSeparator(num, title_, story, next_template=sep_next)
            if is_nutrition:
                build_nutrition_section(story)
                in_nutrition_custom = True
            elif is_intro:
                build_intro_section(story)
                in_intro_custom = True
            elif is_bb:
                build_bodybuilder_section(story)
                in_bb_custom = True
            elif is_ea:
                build_entrainement_athletique_section(story)
                in_ea_custom = True
            elif is_tp:
                build_tests_physiques_section(story)
                in_tp_custom = True
            elif is_ip:
                build_intro_programme_section(story)
                in_ip_custom = True
            elif is_pg:
                build_programme_section(story)
                in_pg_custom = True
            elif is_mb:
                build_mobilite_section(story)
                in_mb_custom = True
            elif is_rc:
                build_recuperation_section(story)
                in_rc_custom = True
            elif is_ms:
                build_mindset_section(story)
                in_ms_custom = True
            elif is_fq:
                build_faq_section(story)
                in_fq_custom = True
            elif is_cc:
                build_conclusion_section(story)
                in_cc_custom = True
            elif is_an:
                build_annexes_section(story)
                in_an_custom = True
            # Active drop cap pour le 1er paragraphe de ce chapitre
            first_body_in_chapter = True
        elif (in_nutrition_custom or in_intro_custom or in_bb_custom or in_ea_custom
              or in_tp_custom or in_ip_custom or in_pg_custom or in_mb_custom or in_rc_custom or in_ms_custom
              or in_fq_custom or in_cc_custom or in_an_custom):
            # Skip tout le contenu Word du chapitre (remplacé par section custom)
            continue
        elif type_ == 'h2':
            t_lower = text.lower()
            # Détecte "Bonus athlète — Électrolytes & hydratation" → injecter section custom
            if 'bonus athlète' in t_lower and ('électrolyt' in t_lower or 'hydrat' in t_lower):
                build_hydration_section(story)
                in_hydration_custom = True
                in_fondations_custom = False
            # Détecte "Ce qui te fera plus progresser que TOUS ces compléments"
            # → bloc custom compact "FONDATIONS AVANT TOUT"
            elif 'plus progresser' in t_lower and 'compléments' in t_lower:
                build_fondations_avant_supps(story)
                in_fondations_custom = True
                in_hydration_custom = False
            else:
                in_hydration_custom = False
                in_fondations_custom = False
                add_h2(story, _escape(text))
        elif in_hydration_custom:
            # Skip tout le contenu Word de la section Hydratation (remplacée)
            continue
        elif in_fondations_custom:
            # Skip body/bullets de la section "Ce qui te fera plus progresser" (remplacée)
            continue
        elif type_ == 'h3':
            add_h3(story, _escape(text))
        elif type_ == 'body':
            # Détection complément
            comp_key, comp_title = detect_complement(text)
            if comp_key:
                add_complement_page(story, comp_key, comp_title)
                in_complement = True  # skip body suivants jusqu'au prochain H2/H3/complément
                first_body_in_chapter = False
            elif in_complement:
                continue  # skip body original (remplacé par notre design)
            elif first_body_in_chapter:
                add_body_with_drop_cap(story, text)
                first_body_in_chapter = False
            else:
                add_body(story, text)
        elif type_ == 'bullet':
            if in_complement:
                continue
            add_bullet(story, text)
        elif type_ == 'note':
            if in_complement:
                continue
            story.append(Paragraph(_escape(text), S_note))

    # Pages bonus en fin de méthode
    build_bonus_echauffement_page(story)
    build_bonus_tracker_page(story)

    # 4ème de couverture — fermeture premium
    build_back_cover(story)

    print("Building PDF...")
    doc.build(story)
    print(f"✓ Saved: {OUTPUT_PDF}")

if __name__ == '__main__':
    build_ebook()
