# 📩 Pre-Call Email — Template

À envoyer 1-2h avant chaque call de candidature pour :
- Réduire le no-show (touchpoint supplémentaire)
- Pré-charger l'autorité (testimonials avant le call)
- Cadrer l'objectif (pas une vente, un diagnostic)
- Donner une raison de répondre s'il peut pas venir

---

## Subject lines (alternatives à tester)

- `À tout de suite {{PRENOM}} ⚡` ← celle utilisée actuellement
- `On se parle à {{HEURE}} {{PRENOM}}`
- `{{PRENOM}}, dernière ligne droite avant notre call`

---

## Template HTML/texte

```text
Subject: À tout de suite {{PRENOM}} ⚡

---

Hâte de te parler à {{HEURE}}.

Avant ça, 3 minutes pour comprendre comment je bosse —
et pourquoi ça marche.

4 résultats récents :

→ ALEXIS · Rugby XIII
   +20 kg sur toutes ses perfs. Signé pro aux Dragons Catalans
   3 mois après le début du suivi.
   « Je n'ai jamais été aussi fort. »

→ MUHAMMED · Joueur pro · Turquie
   « Les programmes sont parfaits. Les résultats sont
   incroyables. Je n'ai jamais progressé aussi vite. »

→ LÉO · Transformation physique
   De 107 kg à 91 kg (−16 kg).
   « Sans Rayan, je n'aurais jamais pu atteindre cet objectif.
   Son aide au quotidien vaut de l'or. C'est le meilleur. »

→ SÉNAN · Prise de muscle
   Transformation physique complète.
   « Un accompagnement complet. Rayan m'a poussé à atteindre
   le meilleur de moi-même. »

Pas de hasard : programme calibré, vidéos d'exécution
corrigées, ajustements semaine par semaine. Mon œil direct
sur ta progression — pas un PDF, pas un bot.

L'objectif du call : comprendre où tu en es, où tu veux
aller, et te dire si je peux t'amener là.

Si tu peux pas venir, réponds-moi maintenant — on cale autre
chose. Je préfère ça à un no-show.

À tout de suite,

Rayan
@rb_perform · rbperform.com
```

---

## Merge tags

| Tag | Source | Exemple |
|---|---|---|
| `{{PRENOM}}` | `coaching_applications.nom_prenom` (premier mot) | "Raphaël" |
| `{{HEURE}}` | Slot booké via WhatsApp | "12h" |
| `{{SPORT}}` (optionnel) | Pour personnaliser un testimonial | "basket 3x3" |

---

## Variantes selon profil

### Athlète sport collectif → mets en avant ALEXIS + MUHAMMED
Ces 2 cas sont des athlètes professionnels signés pros — ce que le prospect veut probablement.

### Transformation physique → mets en avant LÉO + SÉNAN
Le before/after en kg parle plus que le palmarès sportif.

### Mixte / pas clair → garde les 4
Couvre toutes les bases.

---

## Pourquoi cette structure marche

- **Pas de prix mentionné** → respect règle [[rbperform-no-public-pricing]]
- **Pas de CTA "réserve maintenant"** → le call est déjà booké, le mail vise juste à le préparer
- **Témoignages courts + nominatifs** → crédibles (pas des "John D.")
- **"Mon œil direct, pas un PDF, pas un bot"** → différenciation high-touch vs apps gratuites
- **"Te dire si je peux t'amener là"** → sélection frame (= tu choisis, pas eux)
- **"Si tu peux pas venir, réponds-moi"** → professionnalisme + réduit le no-show de 30-40%

---

## Quand envoyer

- **Idéal** : 1-2h avant le call
- **Trop tôt** (12h avant) : il oublie
- **Trop tard** (10 min avant) : il l'ouvre pendant le call et c'est trop tard

→ **Set timer / cron** pour envoyer automatiquement à T-90 min après chaque booking.
