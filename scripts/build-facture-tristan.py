#!/usr/bin/env python3
"""
Facture micro-entreprise — RB Perform / Rayan Bonte → Tristan Joubert.
Format A4 portrait, PDF prêt à transmettre + archiver.
Mention TVA franchise base art. 293 B CGI (auto-entrepreneur).
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path.home()
FONT_DIR = ROOT / "fitcoach_updated/scripts/fonts/Inter"
VAULT_FACTURES = ROOT / "Library/CloudStorage/OneDrive-Personnel/Documents/Coaching/Facture"
VAULT_FACTURES.mkdir(parents=True, exist_ok=True)

# === DONNÉES FACTURE (à ajuster si besoin) ============================
FACTURE_NUM = "FAC-2026-0001-9"
DATE_EMISSION = "24/05/2026"
DATE_PAIEMENT = "24/05/2026"
MODE_PAIEMENT = "Virement bancaire"

CLIENT = {
    "nom": "Tristan Joubert",
    "adresse": "180 avenue Georges Clemenceau",
    "cp_ville": "84200 Carpentras",
    "pays": "France",
}

PRESTATIONS = [
    {
        "designation": "Programme perte de poids",
        "qte": 1,
        "pu_ht": 120.00,
    },
]
# =====================================================================

# Émetteur
EMETTEUR = {
    "nom_commercial": "RB Perform",
    "representant": "Rayan Bonte",
    "adresse": "10 Rue Cardinale",
    "cp_ville": "84000 Avignon",
    "pays": "France",
    "siret": "990 637 803 00018",
    "ape": "6201Z",
    "email": "rayan@rbperform.app",
}

# Calculs
total_ht = sum(p["qte"] * p["pu_ht"] for p in PRESTATIONS)
total_ttc = total_ht  # franchise TVA art. 293 B CGI

# Output (suit format existant FAC-2026-0001-N.pdf)
fname = f"{FACTURE_NUM}.pdf"
OUTPUT_PDF = VAULT_FACTURES / fname
OUTPUT_PNG = VAULT_FACTURES / fname.replace(".pdf", ".png")

# Couleurs
NOIR = (20, 20, 20)
GRIS_FONCE = (60, 60, 60)
GRIS = (120, 120, 120)
GRIS_CLAIR = (220, 220, 220)
CYAN = (2, 209, 186)
BLANC = (255, 255, 255)

W, H = 1240, 1754
M = 90  # marge

def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"InterDisplay-{weight}.ttf"), size)

def text_size(draw, txt, fnt):
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]

img = Image.new("RGB", (W, H), BLANC)
d = ImageDraw.Draw(img)

# ─── EN-TÊTE : Brand + n° facture ────────────────────────────────────────────
# Brand RB.PERFORM. à gauche
brand_font = font("Black", 38)
brand_parts = [("RB", NOIR), (".", CYAN), ("PERFORM", NOIR), (".", CYAN)]
x = M
y = M
for txt, color in brand_parts:
    d.text((x, y), txt, font=brand_font, fill=color)
    w, _ = text_size(d, txt, brand_font)
    x += w

# N° facture à droite
fact_label_font = font("Bold", 16)
fact_num_font = font("Black", 36)
fact_label = "FACTURE"
fact_num = f"N° {FACTURE_NUM}"
w_label, _ = text_size(d, fact_label, fact_label_font)
w_num, _ = text_size(d, fact_num, fact_num_font)
d.text((W - M - w_label, M + 4), fact_label, font=fact_label_font, fill=GRIS)
d.text((W - M - w_num, M + 30), fact_num, font=fact_num_font, fill=NOIR)
date_font = font("Medium", 16)
date_txt = f"Émise le {DATE_EMISSION}"
w_date, _ = text_size(d, date_txt, date_font)
d.text((W - M - w_date, M + 78), date_txt, font=date_font, fill=GRIS)

# Trait séparateur
d.rectangle((M, M + 130, W - M, M + 132), fill=NOIR)

# ─── ÉMETTEUR (gauche) & CLIENT (droite) ─────────────────────────────────────
section_label_font = font("Bold", 14)
body_font = font("Medium", 16)
body_bold_font = font("Bold", 16)

# Émetteur
y = M + 170
d.text((M, y), "ÉMETTEUR", font=section_label_font, fill=CYAN)
y += 28
d.text((M, y), EMETTEUR["nom_commercial"], font=body_bold_font, fill=NOIR)
y += 24
for line in [
    EMETTEUR["representant"],
    "Micro-entrepreneur",
    EMETTEUR["adresse"],
    EMETTEUR["cp_ville"],
    EMETTEUR["pays"],
    f"SIRET : {EMETTEUR['siret']}",
    f"Code APE : {EMETTEUR['ape']}",
    f"Email : {EMETTEUR['email']}",
]:
    d.text((M, y), line, font=body_font, fill=GRIS_FONCE)
    y += 22

# Client (droite)
client_x = W // 2 + 50
y = M + 170
d.text((client_x, y), "CLIENT", font=section_label_font, fill=CYAN)
y += 28
d.text((client_x, y), CLIENT["nom"], font=body_bold_font, fill=NOIR)
y += 24
for line in [
    CLIENT["adresse"],
    CLIENT["cp_ville"],
    CLIENT["pays"],
]:
    d.text((client_x, y), line, font=body_font, fill=GRIS_FONCE)
    y += 22

# ─── TABLEAU PRESTATIONS ─────────────────────────────────────────────────────
table_y = M + 480

# Header
header_font = font("Bold", 14)
header_bg_color = (245, 245, 245)
d.rectangle((M, table_y, W - M, table_y + 44), fill=header_bg_color)
d.text((M + 20, table_y + 14), "DÉSIGNATION", font=header_font, fill=GRIS_FONCE)
d.text((W - M - 480, table_y + 14), "QTÉ", font=header_font, fill=GRIS_FONCE)
d.text((W - M - 360, table_y + 14), "PU HT", font=header_font, fill=GRIS_FONCE)
d.text((W - M - 180, table_y + 14), "TOTAL HT", font=header_font, fill=GRIS_FONCE)

row_y = table_y + 60
row_font = font("Medium", 16)
for p in PRESTATIONS:
    d.text((M + 20, row_y), p["designation"], font=row_font, fill=NOIR)
    d.text((W - M - 480, row_y), str(p["qte"]), font=row_font, fill=NOIR)
    d.text((W - M - 360, row_y), f"{p['pu_ht']:.2f} €", font=row_font, fill=NOIR)
    total_ligne = p["qte"] * p["pu_ht"]
    d.text((W - M - 180, row_y), f"{total_ligne:.2f} €", font=row_font, fill=NOIR)
    row_y += 36

# Trait sous tableau
row_y += 10
d.rectangle((M, row_y, W - M, row_y + 1), fill=GRIS_CLAIR)

# ─── TOTAUX ─────────────────────────────────────────────────────────────────
totaux_y = row_y + 30
label_font_tot = font("Bold", 16)
val_font_tot = font("Bold", 16)
big_font_tot = font("Black", 22)

d.text((W - M - 360, totaux_y), "Total HT", font=label_font_tot, fill=GRIS_FONCE)
d.text((W - M - 180, totaux_y), f"{total_ht:.2f} €", font=val_font_tot, fill=NOIR)

totaux_y += 30
tva_mention = "TVA non applicable, art. 293 B du CGI"
d.text((M, totaux_y), tva_mention, font=row_font, fill=GRIS)
d.text((W - M - 360, totaux_y), "TVA", font=label_font_tot, fill=GRIS_FONCE)
d.text((W - M - 180, totaux_y), "—", font=val_font_tot, fill=NOIR)

totaux_y += 50
# Total TTC encadré
d.rectangle((W - M - 380, totaux_y - 8, W - M, totaux_y + 38), fill=(248, 248, 248))
d.text((W - M - 360, totaux_y + 2), "TOTAL TTC", font=label_font_tot, fill=NOIR)
d.text((W - M - 180, totaux_y), f"{total_ht:.2f} €", font=big_font_tot, fill=NOIR)

# ─── INFOS PAIEMENT ──────────────────────────────────────────────────────────
pay_y = totaux_y + 100
d.text((M, pay_y), "PAIEMENT", font=section_label_font, fill=CYAN)
pay_y += 28
d.text((M, pay_y), f"Mode : {MODE_PAIEMENT}", font=body_font, fill=NOIR)
pay_y += 24
d.text((M, pay_y), f"Date du paiement : {DATE_PAIEMENT}", font=body_font, fill=NOIR)
pay_y += 24
# Statut PAYÉE
statut_font = font("Black", 18)
d.rectangle((M, pay_y, M + 130, pay_y + 32), fill=CYAN)
d.text((M + 22, pay_y + 5), "PAYÉE", font=statut_font, fill=BLANC)

# ─── MENTIONS LÉGALES ────────────────────────────────────────────────────────
mentions_y = H - M - 200
d.rectangle((M, mentions_y - 20, W - M, mentions_y - 19), fill=GRIS_CLAIR)
mentions_font = font("Medium", 11)
mentions_lines = [
    "Pénalités de retard (Loi LME du 04/08/2008) : 3 fois le taux d'intérêt légal en vigueur.",
    "Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 €.",
    "Pas d'escompte pour règlement anticipé.",
    "Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM).",
    "TVA non applicable, art. 293 B du Code Général des Impôts — Micro-entrepreneur en franchise de TVA.",
]
for line in mentions_lines:
    d.text((M, mentions_y), line, font=mentions_font, fill=GRIS)
    mentions_y += 18

# ─── FOOTER : signature + remerciement ───────────────────────────────────────
footer_y = H - M - 60
footer_font = font("Bold", 14)
center_txt = "Merci de votre confiance — RB Perform"
w_footer, _ = text_size(d, center_txt, footer_font)
d.text(((W - w_footer) // 2, footer_y), center_txt, font=footer_font, fill=GRIS_FONCE)

# ─── Export ──────────────────────────────────────────────────────────────────
img.save(OUTPUT_PNG)
img.save(OUTPUT_PDF, resolution=150.0)

print(f"PDF  : {OUTPUT_PDF}")
print(f"PNG  : {OUTPUT_PNG}")
