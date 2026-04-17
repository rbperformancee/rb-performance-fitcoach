# AUDIT CTA — Landing Page RB Perform

> Audit read-only · 17 avril 2026
> Fichier : `public/landing.html`

---

## 1. Inventaire exhaustif des CTAs

| # | Texte | Section | Destination | Type | Statut |
|---|-------|---------|-------------|------|--------|
| 1 | Connexion | Nav | `/login` | Auth | ⚠️ Route relative — dépend du backend |
| 2 | Rejoindre RB Perform → | Menu overlay | `https://rb-perfor.vercel.app` | Signup externe | ✓ |
| 3 | Entrer | Hero | Section Système (JS) | Navigation interne | ✓ |
| 4 | Démarrer | Bento | `https://rb-perfor.vercel.app/?coach=true` | Signup externe | ✓ |
| 5 | Explorer la démo coach → | Explorer | `/demo` | Démo | ⚠️ Route relative |
| 6 | Explorer la démo client → | Explorer | `/demo-client` | Démo | ⚠️ Route relative |
| 7 | Rejoindre → | Pricing (Founding Coach) | `/register` | Signup | ⚠️ Route relative |
| 8 | Commencer | Pricing (Starter) | `/signup?plan=starter` | Checkout | ⚠️ Route relative |
| 9 | Commencer | Pricing (Pro) | `/signup?plan=pro` | Checkout | ⚠️ Route relative |
| 10 | Commencer | Pricing (Elite) | `/signup?plan=elite` | Checkout | ⚠️ Route relative |
| 11 | Commencer | Sticky CTA bar | `https://rb-perfor.vercel.app/?coach=true` | Signup externe | ✓ |
| 12 | Accéder à l'app → | Footer | `https://rb-perfor.vercel.app` | Externe | ✓ |
| 13 | Voir la démo | Black Mirror (dynamique) | Section Explorer (JS) | Navigation interne | ✓ |
| 14 | Quiz result CTA | Quiz (dynamique) | `https://rb-perfor.vercel.app/?coach=true&plan=X` | Signup externe | ✓ |

*CTAs non-conversion (navigation menu, FAQ, legal, Instagram, email) exclus du tableau.*

---

## 2. Destinations uniques

| Destination | CTAs qui y mènent | Cohérent ? |
|-------------|-------------------|------------|
| `https://rb-perfor.vercel.app` | Menu overlay, Footer | ⚠️ Arrive sur l'app React, pas sur un signup |
| `https://rb-perfor.vercel.app/?coach=true` | Bento, Sticky, Quiz | ⚠️ Même problème — pas de landing signup dédiée |
| `/login` | Nav | ⚠️ Route relative — si landing = landing.html, /login = app React |
| `/demo` | Explorer coach | ⚠️ Route relative — même problème |
| `/demo-client` | Explorer client | ⚠️ Route relative — même problème |
| `/register` | Founding Coach | ⚠️ Route relative — même problème |
| `/signup?plan=starter` | Plan Starter | ⚠️ Route relative — même problème |
| `/signup?plan=pro` | Plan Pro | ⚠️ Route relative — même problème |
| `/signup?plan=elite` | Plan Elite | ⚠️ Route relative — même problème |

**→ 6 destinations différentes pour les CTAs de conversion. C'est trop.**

---

## 3. Incohérences critiques

### 3.1 Textes similaires, destinations différentes
- **"Commencer"** apparaît 4 fois : Starter (`/signup?plan=starter`), Pro (`/signup?plan=pro`), Elite (`/signup?plan=elite`), Sticky (`vercel app ?coach=true`). Le sticky CTA "Commencer" n'amène **pas** au même endroit que les plans.
- **"Rejoindre"** apparaît 2 fois : Menu overlay (`vercel app`), Founding Coach (`/register`). Deux destinations différentes.

### 3.2 CTAs contradictoires
- Le sticky CTA dit **"Garantie 14j — démarre sans risque"** mais renvoie vers l'app générique, pas vers un essai gratuit.
- Les plans disent **"Commencer"** mais pointent vers `/signup` (route relative sur landing.html = probablement 404 ou app React).
- Le Founding Coach dit **"Rejoindre →"** vers `/register` — différent de `/signup`.

### 3.3 Destinations probablement cassées
- `/register` — aucune route connue dans le repo pour ce path depuis landing.html
- `/signup?plan=X` — même problème, ce sont des routes React, pas des pages statiques
- `/login` — idem
- `/demo` et `/demo-client` — fonctionnent probablement via les rewrites Vercel, à vérifier

### 3.4 Problème architectural
La landing est servie comme `landing.html` (fichier statique). Les routes `/signup`, `/register`, `/login` sont des routes React SPA servies par `index.html`. **Sur Vercel, `/signup` depuis `landing.html` va charger l'app React** — ce qui fonctionne SI les rewrites sont configurés. Mais le prospect quitte visuellement la landing pour arriver sur une app différente (splash screen, design différent). **Rupture d'expérience.**

---

## 4. Recommandation stratégique

### Contexte
- Lancement Founding Coach Program = **50 places à 149€/mois verrouillé à vie**
- Stripe **pas encore en mode live**
- Objectif = **collecter des inscriptions** (waitlist/pre-register), pas du paiement immédiat

### CTA primaire unique (répété partout)

**Texte :** `Rejoindre les 50 Founding Coachs →`

**Destination :** Une seule URL — soit :
- **Option A :** `https://rb-perfor.vercel.app/?coach=true&founding=true` (si le flow d'inscription existe)
- **Option B :** Un formulaire Typeform/Tally embedé directement sur la landing (zéro rupture)
- **Option C :** Un `mailto:` ou lien WhatsApp (MVP brutal mais efficace pour 50 places)

**Justification :**
- Un seul texte = un seul message = zéro confusion
- "50 Founding Coachs" = scarcité + exclusivité (Hormozi)
- "→" = momentum, pas "Commencer" (trop générique, on est partout)
- Répété sur : Bento, Sticky CTA, Menu overlay, Founding Coach card, 3 plans

### CTA secondaire (max 1)

**Texte :** `Voir la démo`
**Destination :** Navigation interne vers la section Explorer
**Usage :** Pour les prospects pas encore prêts à s'inscrire — ils explorent d'abord

### Ce qui disparaît
- "Commencer" (trop générique)
- "Rejoindre RB Perform →" (pas assez spécifique)
- "Accéder à l'app →" (confusant — l'app c'est pour après l'inscription)
- Liens `/signup?plan=X` séparés par plan (le Founding Coach est l'unique offre de lancement)
- "Garantie 14j" sur le sticky (remplacé par "Plus que X places")

---

## 5. Plan de refactor (par étapes)

### Étape 1 — Décider la destination unique
Avant de toucher le code : choisir Option A, B ou C ci-dessus. Si Stripe n'est pas live, Option B (Tally/Typeform) est le plus rapide.

### Étape 2 — Unifier les CTAs de conversion
| Fichier | Ligne(s) | Changement |
|---------|----------|------------|
| `landing.html` | ~1686 | Menu overlay : "Rejoindre RB Perform →" → "Rejoindre les 50 Founding Coachs →" + nouvelle URL |
| `landing.html` | ~2066 | Bento : "Démarrer" → "Rejoindre les 50 Founding Coachs →" + nouvelle URL |
| `landing.html` | ~2729 | Founding Coach : "Rejoindre →" → "Rejoindre les 50 Founding Coachs →" + nouvelle URL |
| `landing.html` | ~2765,2780,2795 | 3 plans : "Commencer" → "Rejoindre les 50 Founding Coachs →" + nouvelle URL (même URL pour les 3 pendant le lancement) |
| `landing.html` | ~2939 | Sticky CTA : "Commencer" → "Rejoindre les 50 Founding Coachs →" + label "Plus que X/50 places" |
| `landing.html` | ~2927 | Footer : "Accéder à l'app →" → supprimer ou remplacer par "Rejoindre →" |

### Étape 3 — Unifier les CTAs démo
| Fichier | Ligne(s) | Changement |
|---------|----------|------------|
| `landing.html` | ~2108 | Démo coach : garder mais vérifier que `/demo` fonctionne |
| `landing.html` | ~2131 | Démo client : garder mais vérifier que `/demo-client` fonctionne |
| `landing.html` | ~3898 | Black Mirror "Voir la démo" : garder (navigation interne, OK) |

### Étape 4 — Nettoyer les routes mortes
| Fichier | Ligne(s) | Changement |
|---------|----------|------------|
| `landing.html` | ~1652 | Nav "Connexion" : changer `/login` → `https://rb-perfor.vercel.app/login` (URL absolue) |
| `landing.html` | ~1638 | Logo `href="#"` → `href="/"` ou supprimer le href |

### Étape 5 — Tester toutes les destinations
Vérifier que chaque URL fonctionne sur desktop + mobile après refactor.

---

## 6. Résumé visuel

```
AVANT (chaos) :
  Menu    → vercel app
  Bento   → vercel app/?coach=true
  Founding → /register
  Starter → /signup?plan=starter
  Pro     → /signup?plan=pro
  Elite   → /signup?plan=elite
  Sticky  → vercel app/?coach=true
  Footer  → vercel app

APRÈS (unifié) :
  TOUT → [destination unique Founding Coach]
  Démo → navigation interne section Explorer
```

---

*Aucun fichier modifié. Audit terminé. Prêt pour refactor sur validation.*
