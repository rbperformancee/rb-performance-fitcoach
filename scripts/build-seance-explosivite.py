#!/usr/bin/env python3
"""Fiche séance standalone — BLOC EXPLOSIVITÉ · FORCE À FROID.
Même DA que les séances du book MÉTHODE ATHLÈTE COMPLET."""

from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                 Spacer, Table, TableStyle, HRFlowable, KeepTogether)

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
PHOSPHOR_DIR = ROOT / "fitcoach_updated/scripts/fonts/Phosphor"
OUTPUT = ROOT / "Downloads/Seance-Explosivite-Force-A-Froid.pdf"

# ─── PALETTE ─────────────────────────────────────────────────────────────────
CYAN = HexColor('#02D1BA')
CYAN_DARK = HexColor('#00A38F')
NOIR = HexColor('#141414')
GRIS_DARK = HexColor('#5A5A5A')
PAPIER = HexColor('#FAF8F3')
PAPIER_2 = HexColor('#F2EFE8')
BLANC = HexColor('#FFFFFF')
ENCRE = HexColor('#080C14')

# ─── FONTS ───────────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('Inter-Reg', str(FONT_DIR / 'InterDisplay-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Inter-Med', str(FONT_DIR / 'InterDisplay-Medium.ttf')))
pdfmetrics.registerFont(TTFont('Inter-Bold', str(FONT_DIR / 'InterDisplay-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Inter-Black', str(FONT_DIR / 'InterDisplay-Black.ttf')))

# ─── PAGE ────────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN_INNER = 22 * mm
MARGIN_OUTER = 18 * mm
MARGIN_TOP = 24 * mm
MARGIN_BOTTOM = 28 * mm
FRAME_W = PAGE_W - MARGIN_INNER - MARGIN_OUTER  # ≈ 164mm
FRAME_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM

# ─── HEADER / FOOTER PAGE ────────────────────────────────────────────────────
def draw_brand_top_left(canvas):
    canvas.saveState()
    canvas.setFillColor(NOIR)
    canvas.setFont('Inter-Black', 8.5)
    x = MARGIN_INNER
    y = PAGE_H - 12 * mm
    canvas.drawString(x, y, "RB")
    w = pdfmetrics.stringWidth("RB", 'Inter-Black', 8.5)
    canvas.drawString(x + w, y, ".")
    w += pdfmetrics.stringWidth(".", 'Inter-Black', 8.5)
    canvas.drawString(x + w, y, "PERFORM")
    w += pdfmetrics.stringWidth("PERFORM", 'Inter-Black', 8.5)
    canvas.setFillColor(CYAN)
    canvas.drawString(x + w, y, ".")
    canvas.restoreState()


def on_page(canvas, doc):
    canvas.saveState()
    # Fond papier
    canvas.setFillColor(PAPIER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Eyebrow chapitre
    canvas.setFillColor(GRIS_DARK)
    canvas.setFont('Inter-Bold', 8)
    canvas.drawString(MARGIN_INNER, PAGE_H - 12 * mm,
                       "BLOC EXPLOSIVITÉ  ·  FORCE À FROID")
    # Brand top right
    canvas.setFillColor(NOIR)
    canvas.setFont('Inter-Black', 8.5)
    label = "RB.PERFORM."
    cyan_dot_x = PAGE_W - MARGIN_OUTER - pdfmetrics.stringWidth(".", 'Inter-Black', 8.5)
    canvas.drawRightString(PAGE_W - MARGIN_OUTER, PAGE_H - 12 * mm, label)
    # Filet sous header
    canvas.setStrokeColor(HexColor('#D8D3C5'))
    canvas.setLineWidth(0.3)
    canvas.line(MARGIN_INNER, PAGE_H - 15 * mm,
                PAGE_W - MARGIN_OUTER, PAGE_H - 15 * mm)
    # Footer
    canvas.setFont('Inter-Bold', 8)
    canvas.setFillColor(GRIS_DARK)
    canvas.drawString(MARGIN_INNER, 15 * mm, "RB.PERFORM·  FICHE SÉANCE")
    canvas.setFillColor(CYAN_DARK)
    canvas.drawRightString(PAGE_W - MARGIN_OUTER, 15 * mm,
                             "rb-perform.com")
    canvas.restoreState()


# ─── EXO CARD ────────────────────────────────────────────────────────────────
_exo_counter = [0]


def exo_card(name, series, reps, intens, recup):
    """Card style séance — fond blanc, padding 14mm, miniature vidéo droite, filet cyan sous nom."""
    _exo_counter[0] += 1
    idx = _exo_counter[0]

    num_s = ParagraphStyle('e_num', fontName='Inter-Black', fontSize=8.5,
                             textColor=CYAN_DARK, alignment=TA_LEFT, leading=10,
                             spaceAfter=3)
    nom_s = ParagraphStyle('e_nom', fontName='Inter-Black', fontSize=12,
                             textColor=NOIR, alignment=TA_LEFT, leading=14)
    val_s = ParagraphStyle('e_val', fontName='Inter-Reg', fontSize=9,
                             textColor=NOIR, alignment=TA_LEFT, leading=12)

    params_2x2 = [
        [Paragraph(f"<b>Répétitions :</b> {series} × {reps}", val_s),
         Paragraph(f"<b>Intensité :</b> {intens}", val_s)],
        [Paragraph(f"<b>Tempo :</b> X", val_s),
         Paragraph(f"<b>Repos :</b> {recup}", val_s)],
    ]
    params_t = Table(params_2x2, colWidths=[50 * mm, 50 * mm])
    params_t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))

    text_left = [
        Paragraph(f"·  EXERCICE {idx:02d}", num_s),
        Paragraph(name.upper(), nom_s),
        HRFlowable(width=32 * mm, thickness=1, color=CYAN_DARK,
                    spaceBefore=2, spaceAfter=4, hAlign='LEFT'),
        params_t,
    ]

    play_s = ParagraphStyle('e_play', fontName='Inter-Black', fontSize=18,
                              textColor=CYAN, alignment=TA_CENTER, leading=20)
    thumb = Table([[Paragraph("▶", play_s)]],
                    colWidths=[40 * mm], rowHeights=[22 * mm])
    thumb.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ENCRE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    inner = Table([[text_left, thumb]], colWidths=[110 * mm, 42 * mm])
    inner.setStyle(TableStyle([
        ('VALIGN', (0, 0), (0, 0), 'TOP'),
        ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    card = Table([[inner]], colWidths=[164 * mm])
    card.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BLANC),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.4, HexColor('#E8E4D8')),
    ]))
    return KeepTogether([card, Spacer(1, 1.5 * mm)])


# ─── BUILD ───────────────────────────────────────────────────────────────────
def build():
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=MARGIN_INNER, rightMargin=MARGIN_OUTER,
        topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
    )
    frame = Frame(MARGIN_INNER, MARGIN_BOTTOM, FRAME_W, FRAME_H,
                   showBoundary=0, leftPadding=0, rightPadding=0,
                   topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='seance', frames=[frame], onPage=on_page)])

    story = []

    # Header séance — eyebrow + titre 2 lignes + filet
    eb_s = ParagraphStyle('hd_eb', fontName='Inter-Bold', fontSize=9.5,
                            textColor=CYAN_DARK, alignment=TA_LEFT, leading=12,
                            spaceAfter=8, letterSpacing=2)
    story.append(Paragraph("· S É A N C E · M U S C U · E X P L O S I V I T É ·", eb_s))

    title_h = ParagraphStyle('hd_t1', fontName='Inter-Black', fontSize=24,
                              textColor=NOIR, alignment=TA_LEFT, leading=28,
                              spaceAfter=0)
    title_b = ParagraphStyle('hd_t2', fontName='Inter-Black', fontSize=24,
                              textColor=CYAN_DARK, alignment=TA_LEFT, leading=28,
                              spaceAfter=4)
    story.append(Paragraph("BLOC EXPLOSIVITÉ.", title_h))
    story.append(Paragraph("FORCE À FROID.", title_b))
    story.append(HRFlowable(width=42 * mm, thickness=1.5, color=NOIR,
                              spaceBefore=0, spaceAfter=4, hAlign='LEFT'))

    intro_s = ParagraphStyle('hd_i', fontName='Inter-Reg', fontSize=9.5,
                              textColor=NOIR, alignment=TA_LEFT, leading=13,
                              spaceAfter=0)
    story.append(Paragraph(
        "Force-vitesse à pleine intensité, peu de reps, repos longs. "
        "Recruter les fibres rapides à <b>froid</b>, sans fatigue métabolique. "
        "Exécution explosive sur chaque rep.",
        intro_s))

    # Volume / Durée hero stats (compact)
    story.append(Spacer(1, 4 * mm))
    stat_n = ParagraphStyle('st_n', fontName='Inter-Black', fontSize=15,
                              textColor=BLANC, alignment=TA_CENTER, leading=17,
                              spaceAfter=1)
    stat_l = ParagraphStyle('st_l', fontName='Inter-Bold', fontSize=7,
                              textColor=HexColor('#A8E5DC'), alignment=TA_CENTER,
                              leading=9)
    stats_cells = [
        [Paragraph("5", stat_n), Paragraph("EXOS", stat_l)],
        [Paragraph("17", stat_n), Paragraph("SÉRIES TOTAL", stat_l)],
        [Paragraph("~55 min", stat_n), Paragraph("DURÉE", stat_l)],
    ]
    st_t = Table([stats_cells], colWidths=[54 * mm, 55 * mm, 55 * mm])
    st_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CYAN_DARK),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEAFTER', (0, 0), (0, 0), 0.5, HexColor('#7DD8C7')),
        ('LINEAFTER', (1, 0), (1, 0), 0.5, HexColor('#7DD8C7')),
    ]))
    story.append(st_t)

    story.append(Spacer(1, 4 * mm))

    # ─── 5 EXOS ──────────────────────────────────────────────────────────
    exos = [
        ("Seated jump to box (unilatéral)", "3", "3 reps/jambe",
         "100 % explosif", "2 min"),
        ("Clean + box step-up", "3", "3 reps/jambe",
         "Charge moyenne · vitesse max", "2 min"),
        ("Fente arrière Zercher + knee drive", "3", "5 reps/côté",
         "Charge contrôlée · drive max", "2 min"),
        ("Dead-start split squat sur pins", "4", "5 reps",
         "Charge lourde · départ arrêt", "2 min 30"),
        ("Power shrug trap bar", "4", "3 reps",
         "Charge max · accélération", "3 min"),
    ]
    for nom, series, reps, intens, recup in exos:
        story.append(exo_card(nom, series, reps, intens, recup))

    # Footer note finale
    story.append(Spacer(1, 4 * mm))
    note_s = ParagraphStyle('ftn', fontName='Inter-Med', fontSize=9.5,
                              textColor=NOIR, alignment=TA_LEFT, leading=14,
                              leftIndent=14, backColor=HexColor('#EEF9F7'),
                              borderPadding=(10, 12, 10, 12))
    note_t = Table([[Paragraph(
        "<b><font color='#00A38F'>RÈGLE.</font></b>  Si tu sens la vitesse "
        "baisser sur 2 reps consécutives, tu arrêtes la série. La force à "
        "froid ne se travaille pas à la fatigue.",
        note_s)]], colWidths=[164 * mm])
    note_t.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(note_t)

    doc.build(story)
    print(f"✓ Saved: {OUTPUT}")


if __name__ == '__main__':
    build()
