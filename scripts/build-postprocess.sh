#!/usr/bin/env bash
# Post-process du build Vercel :
#  1. Duplique build/index.html (PWA app) vers build/app.html
#  2. Override build/index.html avec landing.html (landing publique)
#  3. Injecte META_PIXEL_ID dans toutes les pages stratégiques (landing,
#     PWA, founding, etc.) si l'env var est définie.
#
# Si META_PIXEL_ID est absent ou invalide, les guards JS interne empêchent
# le pixel de charger côté client — le build reste valide.
#
# Appelé depuis vercel.json buildCommand après react-scripts build.

set -e

cp build/index.html build/app.html
cp public/landing.html build/index.html

if [ -n "${META_PIXEL_ID}" ]; then
  # Pages où injecter le pixel ID. Ajoute d'autres .html ici si tu veux
  # élargir le tracking (alternative-trainerize, comparison, blog, etc.).
  for f in build/index.html build/app.html build/founding.html; do
    [ -f "$f" ] && sed -i "s/__META_PIXEL_ID__/${META_PIXEL_ID}/g" "$f"
  done
fi
