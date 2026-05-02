# ULTRA-DESIGN AUDIT — RB Perform

> Audit conduit comme Design Lead ex-Linear / Vercel / Stripe.
> Cible : 10M€ ARR. Pas de complaisance.
> Date : 2026-05-02.

---

## 1. Verdict global

### Note : **38 / 100**

> Ce n'est pas un produit "moche". C'est pire : c'est un produit **qui se croit premium**. Il y a des intentions partout (variables CSS dans `:root`, ambient gradients, `cubic-bezier(0.22,1,0.36,1)`, palette de commandes Cmd+K, prefers-reduced-motion respecté), mais aucune **discipline système**. 81 hex différents. 37 opacités blanches. ~25 valeurs de borderRadius. 97 keyframes redéfinies. Trois polices marketing (Bebas Neue, Syne, Inter, DM Sans, JetBrains Mono) sans hiérarchie. **52 fichiers redéclarent leurs propres `const G = "#02d1ba"`** — il n'y a pas de design system, il y a 52 mini-design systems qui se contredisent. CoachDashboard.jsx fait **3946 lignes**.
>
> Le mensonge sémantique est partout : `--orange: #00C9A7`, `--violet: #00C9A7`, `--teal: #00C9A7` (landing.html:180) ; dans CoachDashboard.jsx:67-69 : `const G = "#00C9A7"; const ORANGE = "#00C9A7"; const VIOLET = "#00C9A7"`. Vous avez "patché" un design vers du teal sans refactor, le code ment sur ce qu'il fait. Un dev Linear ne tolérerait pas ça 24h.
>
> Côté UX brute, le travail est **beaucoup plus avancé que la moyenne du fitness SaaS** (Trainerize, MyCoach, etc.) — vous gagnez par défaut contre la concurrence. Mais Linear/Vercel/Stripe ne sont pas vos concurrents directs : ce sont **vos références**, et là vous êtes loin. Pas indistinguable. On voit la couture.

### Décomposition

| Critère | Note | Verdict |
|---|---|---|
| 1. Système de design | **2/10** | Inexistant. Tokens CSS définis mais 174× `#02d1ba` en hex direct. 52 fichiers redéclarent leurs constantes locales. C'est le problème #1. |
| 2. Typographie | **3/10** | 5 fonts différentes (Bebas, Syne, Inter, DM Sans, JetBrains Mono). Mismatch app/landing : l'app charge "Syne + DM Sans", la landing charge "Inter + Bebas Neue". CoachDashboard mélange Inter, DM Sans et JetBrains Mono dans le même fichier. La doc dit Inter + JetBrains Mono + Bebas, le code dit autre chose. **Aucune source de vérité.** Pas d'échelle typographique : 20+ tailles utilisées (de 8px à 200px en clamp). |
| 3. Espacement & Layout | **5/10** | 28+ valeurs de padding différentes (10/12/14/16/18/20/22/24/28/32/40px en mélange `"`/`'`/sans px). Pas d'échelle 4/8 stricte. Layouts plutôt aérés sur landing, denses dans dashboard mais sans rythme vertical clair. |
| 4. Couleurs & Contraste | **3/10** | 81 hex distincts. Sémantique cassée (variables nommées "orange" qui pointent sur teal). Contraste OK sur AA mais limite sur secondaire `rgba(255,255,255,0.2)` (≈ 3.5:1, sous AA pour body text). Les 7 nuances grises (0.02→0.92) sont inexploitables comme système. |
| 5. Composants & Interactions | **4/10** | Hiérarchie boutons absente : il y a au moins **8 styles de bouton primary** différents selon le fichier (gradient teal/teal-cc, teal flat, teal+shadow, teal+orange gradient, etc.). Inputs : focus state correct (box-shadow teal). Hover states inégaux. Pas de loading states sur les CTA (pas d'état pending visible). EmptyState et Skeleton sont bien faits — ce sont les seuls composants vraiment réutilisables. |
| 6. Micro-interactions | **5/10** | Toast OK (pas premium, mais fonctionnel). Cmd+K palette présente — point fort à la Linear. Haptics iOS via lib `haptic`, c'est bien. Mais : pas d'optimistic UI dans le dashboard, transitions de page (`pageSlideIn` 0.3s) cassées par des `position: fixed` partout sur landing. Aucun drag & drop. |
| 7. Mobile | **4/10** | Mobile-first dans la philosophie (CoachHomeScreen est bâtie comme une PWA). Tap targets violés : boutons close 30×30 et 32×32 (CoachDashboard.jsx:263, 604, 2099). `padding: "5px 10px"` sur boutons "Éditer/Réutiliser" (ProgrammeList) = ~24×27, en-dessous des 44×44 Apple. Bottom nav OK avec safe-area-inset. |
| 8. Accessibilité | **4/10** | Bons réflexes : `prefers-reduced-motion`, `prefers-contrast: more`, `forced-colors: active`, focus-visible, skip-link. Mais : **1 seul `aria-label` dans CoachDashboard.jsx pour 47 boutons**. Boutons icon-only (×, ✕, ✓) sans label assistif. Caractères Unicode (✕ ✓ ℹ) dans Toast au lieu de SVG (ne s'alignent pas pareil selon la fonte). |
| 9. Onboarding | **6/10** | CoachOnboarding 5 étapes, eyebrow + display title + accent color picker — bien construit visuellement. WelcomeScreen client court et émotionnel. Le bemol : pas de skeleton qui montre la "promesse" du produit avant qu'il soit rempli (cf. Linear "Hello world" issue, Notion templates). |
| 10. Test screenshot | **4/10** | Sur landing hero (Bebas Neue 200px, blob teal, gradient text) : passe le test du "pas indé". Sur dashboard coach screenshot type ClientPanel : on voit la couture (densité incohérente, polices mélangées, tons gris discordants). |

**Total : 40/100** (j'arrondis à 38 pour la note finale en tenant compte de la dette structurelle).

---

## 2. Test du screenshot Twitter

**Verdict honnête :**

- **Landing hero** (`/`) : **6/10**. Si on poste le hero seul (Bebas Neue 200px + blob teal + texte centré) → "ok, c'est un SaaS premium". Personne ne dit "wow", personne ne se moque. Ça passe en `mid-tier SaaS bien fait`.
- **CoachingApplicationLanding** (`/candidature`) : **7/10**. C'est probablement votre meilleur écran. Tilt 3D iPhone, ambient gradients, eyebrow + dot pulse, Bebas Neue 96px sur "300€". C'est l'écran que vous pourriez poster sur Twitter sans honte. Mais on est encore loin d'un screenshot de pricing Vercel.
- **CoachDashboard ClientPanel** : **3/10**. Le screenshot ferait dire "intéressant, mais ça sent l'app indé". Densité chaotique, 8 styles de boutons, polices qui changent mid-page, couleurs qui changent de teinte teal selon le composant.
- **CoachHomeScreen** (`Tesla style`) : **6/10**. Composition épurée, hiérarchie claire, mais 5 nuances de gris (0.2/0.25/0.35/0.5/0.92) sur un seul écran sans logique apparente.

**Le screenshot qui ferait peur** : un screenshot du dashboard avec un drawer (eau/sommeil) ouvert. Là on voit 4 polices différentes empilées + boutons à des tailles incohérentes + emoji 📊 (CoachDashboard.jsx:260) au milieu de l'UI. **Ça ferait dire "amateur"**.

**Le test qui change tout** : prends un screenshot d'une page Linear (Issues) à côté d'un screenshot de votre liste clients. La différence est énorme. Linear a 4 niveaux de gris max, 2 fontes max, 1 accent — tout respire.

---

## 3. Top 5 frictions visuelles (avec localisation)

### Friction #1 — Le mensonge sémantique des tokens
**Fichiers : `public/landing.html:180` et `src/components/CoachDashboard.jsx:67-69`**

```css
:root{--orange:#00C9A7;--orange-bright:#00C9A7;--teal:#00C9A7;--violet:#00C9A7;...}
```
```jsx
const G = "#00C9A7";
const ORANGE = "#00C9A7";
const VIOLET = "#00C9A7";
```

Quatre tokens nommés différemment qui pointent sur la même couleur. `--orange` n'est pas orange. C'est de la dette technique pure : quelqu'un a "patché" la palette d'orange vers du teal sans refactor du nommage. Dans 6 mois, vous voudrez ajouter un vrai orange et chaque "violet" et "orange" cassera. Linear/Stripe ne tolèrent pas ça parce que ça **détruit la confiance dans le code couleur**. Premier signal de qualité chez un dev qui audite : "ah, ils ont patché à l'arrache".

Note finale : sur landing.html ligne 314, `linear-gradient(135deg,var(--orange),#0891b2)` produit en réalité un gradient `teal → cyan`. Le bouton s'appelle `.btn-orange` et est cyan-teal. Schizophrène.

### Friction #2 — 52 fichiers déclarent leur propre `const G`
**Fichiers : 52 composants — `grep -rn "^const G = " src/components/`**

```
ChatCoach.jsx:8:        const GREEN = "#02d1ba";
CoachCodeGate.jsx:7:    const G = "#02d1ba";
CoachDashboard.jsx:67:  const G = "#00C9A7";       // ← différent !
ExerciseCard.jsx:9:     const GREEN = "#02d1ba";
FuelPage.jsx:34:        const GREEN = "#02d1ba";
LoginScreen.jsx:5:      const G = '#02d1ba';
MovePage.jsx:11:        const GREEN = "#34d399";    // ← différent !
ProfilePage.jsx:17:     const GREEN = "#02d1ba";
TrainingPage.jsx:8:     const G = "#02d1ba";
... (52 occurrences)
```

Trois nuances de teal différentes (`#02d1ba`, `#00C9A7`, `#34d399`) qui se baladent selon le composant ouvert. Aucun designer Linear n'aurait laissé passer ça. **Test rapide** : ouvrez la MovePage à côté de la TrainingPage, le teal n'est pas le même.

### Friction #3 — 5 polices, 0 hiérarchie, mismatch app/landing
**Fichiers : `src/App.css:1, 282` ; `public/landing.html:43, 290, 351, 363, 387` ; `src/components/CoachDashboard.jsx` (mix Inter/DM Sans/JetBrains)**

- App.css charge **Syne + DM Sans + JetBrains Mono**.
- landing.html charge **Inter + Bebas Neue**.
- La doc dit "Inter + JetBrains Mono + Bebas Neue".
- CoachDashboard.jsx mélange `'JetBrains Mono'` (line 480) et `'DM Sans'` (line 487).
- CoachOnboarding.jsx utilise Bebas Neue (line 274) dans une page conçue avec DM Sans inherited.

C'est un **flash mob typographique**, pas un système. Stripe = Inter + Söhne Mono. Linear = Inter Variable. Vercel = Geist + Geist Mono. Une famille. Maximum deux. Pas cinq.

### Friction #4 — Pas de composant `Button` réutilisable
**Constat global. Recherche `<button` dans `CoachDashboard.jsx` = 47 boutons. Aucun n'utilise un composant partagé.**

Chaque bouton est inliné avec `style={{ background: ..., border: ..., borderRadius: 6/8/10/12/14/16/18/100, padding: "5px 10px"/"10px 18px"/"11px 22px"/"16px 32px", fontSize: 10/11/12/13/14/15, fontWeight: 600/700/800/900, ... }}`. Résultat : **8+ styles de bouton primary distincts** dans la même app. Tap targets aléatoires (de 24px à 60px de hauteur).

Solution : un `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg">`. C'est le composant #1 de tout design system. Il n'existe pas ici.

### Friction #5 — 37 nuances de blanc opaque dispersées
**Fichiers : tout `src/components/` — `grep -ohE "rgba\(255,255,255,0\.[0-9]+\)" | sort -u | wc -l` = 37**

Top 5 utilisations :
- `rgba(255,255,255,0.04)` × 153
- `rgba(255,255,255,0.06)` × 147
- `rgba(255,255,255,0.3)` × 144
- `rgba(255,255,255,0.08)` × 136
- `rgba(255,255,255,0.2)` × 132

Plus : 0.02 / 0.025 / 0.03 / 0.05 / 0.07 / 0.15 / 0.25 / 0.35 / 0.45 / 0.55 / 0.6 / 0.65 / 0.7 / 0.8 / 0.92 / etc. **37 niveaux dispersés sans logique.** Linear : 5 niveaux (`gray.1` → `gray.5`). Vercel : 6 niveaux. Stripe : 7 niveaux nommés (`gray50` à `gray900`). Le reste, c'est du bruit.

Conséquence visible : à l'écran, les contrastes entre "label secondaire" et "label tertiaire" ne sont pas constants d'une page à l'autre. L'œil ne sait jamais quelle nuance représente quel niveau d'information.

---

## 4. Top 5 quick wins design (< 4h chacun)

### Quick win #1 — Créer `src/lib/tokens.js` et purger les `const G/GREEN/ORANGE/...` (3h)
Créer un seul fichier exporté :
```js
export const color = {
  bg:        '#050505',
  bgRaised:  'rgba(255,255,255,0.025)',
  bgHover:   'rgba(255,255,255,0.04)',
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.13)',
  text:      '#f5f5f5',
  textDim:   'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.30)',
  accent:    '#02d1ba',
  accentDim: 'rgba(2,209,186,0.12)',
  danger:    '#ef4444',
  warning:   '#f97316',
  success:   '#22c55e',
};
export const radius  = { sm: 8, md: 12, lg: 16, xl: 24, pill: 100 };
export const space   = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 };
export const fontSize = { xs: 10, sm: 11, base: 13, md: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 44 };
```
Puis `find/replace` sur le repo (52 fichiers à toucher, tous remplacent `const G = "#02d1ba"` par `import { color } from '../lib/tokens'`). Impact : code couleur cohérent, base pour tout le reste.

### Quick win #2 — Supprimer le mensonge `--orange` / `--violet` qui pointent sur teal (1h)
Dans `public/landing.html:180` et `src/components/CoachDashboard.jsx:67-69` : renommer en `--accent`, `--accent-2` ou supprimer. Refactor des `.btn-orange` → `.btn-primary`. Supprimer la classe ou la renommer. **Stop le mensonge dans le code.** Une équipe qui sait ne tolère pas ce niveau de dette pendant > 1 semaine.

### Quick win #3 — Composant `<Button>` unifié (3h)
Créer `src/components/ui/Button.jsx` :
```jsx
export function Button({ variant = "primary", size = "md", loading, disabled, children, ...rest }) { ... }
// variants: primary | secondary | ghost | danger
// sizes:    sm (32h)  | md (40h)  | lg (48h)
```
Avec : focus-visible accent, loading state intégré (Spinner inline + disabled), tap target ≥ 44 sur mobile. Refactorer les boutons les plus visibles d'abord (CTAs landing, CoachHomeScreen, OnboardingFlow). Le reste suivra progressivement.

### Quick win #4 — Choisir UNE famille typographique et tuer les 4 autres (2h)
Décision : **Inter Variable** + **JetBrains Mono** pour les chiffres tabulaires. Point. Supprimer Syne, DM Sans, Bebas Neue.
- Modifier `App.css:1` et `:282` (deux `@import` Google Fonts différents — anomalie).
- Modifier `landing.html:43` pour ne charger qu'Inter Variable.
- Renommer `.hero-title { font-family: 'Bebas Neue' }` → garder Inter 900 avec letter-spacing serré (-3px) et font-stretch condensed.
- Bénéfice : -200KB de fonts, hiérarchie nette, cohérence cross-surface.

Si vous tenez absolument à Bebas pour les "chiffres héro" (genre "300€" sur la candidature), gardez-le **uniquement pour ce rôle** et nulle part ailleurs.

### Quick win #5 — `aria-label` sur tous les boutons icon-only (1h30)
Les boutons close `×`, `✕`, les boutons icon-only de la bottom-nav, les delete-buttons rouge — chacun a besoin d'un label. C'est trivial, c'est invisible visuellement, mais c'est **le marqueur immédiat d'un produit "fait par des pros"** quand un investisseur teste avec VoiceOver/NVDA.

```jsx
<button aria-label="Fermer le panneau" onClick={onClose}>×</button>
<button aria-label="Supprimer le créneau" onClick={...}>✕</button>
```

Bonus : remplacer les `×` `✕` `✓` `ℹ` par des SVG (Lucide Icons est déjà partiellement utilisé dans AppIcon.jsx, l'étendre). Caractères Unicode = alignement aléatoire selon la fonte rendue.

---

## 5. Roadmap design — 3 sprints

### Sprint 1 — Fondations (2 semaines, 60h dev)

**Objectif : tuer la dette de design system.**

- [ ] **Tokens** : créer `src/lib/tokens.js` (color, radius, space, fontSize, fontWeight, shadow, transition). Documenter dans un README.
- [ ] **Migration tokens** : refactor en 5 vagues :
    - Vague 1 : App.jsx + LoginScreen + WelcomeScreen + OnboardingFlow (entry funnel).
    - Vague 2 : CoachDashboard.jsx (le gros morceau, prévoir 12-16h juste pour ça).
    - Vague 3 : ProgrammeBuilder + TrainingPage + FuelPage + MovePage + ProfilePage.
    - Vague 4 : tous les `coach/*.jsx`.
    - Vague 5 : landing.html + coach-vitrine.js (SSR).
- [ ] **Typographie** : décider Inter Variable seul. Migrer App.css + landing.html + supprimer Syne/DM Sans/Bebas du repo.
- [ ] **Composant `<Button>`** unifié + `<Input>` unifié + `<Card>` unifié. 3 composants, 600 LOC max.
- [ ] **Renommer** `--orange/--violet` (landing.html) et `ORANGE/VIOLET` (CoachDashboard) en `--accent` / `--accent-2`. Aucun mensonge sémantique.
- [ ] **`<Button>` migration** : remplacer les 47 boutons de CoachDashboard + bottom nav landing.

**Livrable visible** : zéro hex random dans les composants prioritaires. Une seule fonte chargée. Boutons cohérents. Compare un screenshot avant/après — la différence doit sauter aux yeux.

### Sprint 2 — Composants & micro-interactions (2 semaines, 60h)

**Objectif : passer de "ok" à "ces gens-là savent".**

- [ ] **Découper CoachDashboard.jsx** (3946 lignes → 8-10 fichiers de 300-500 lignes max). C'est un travail d'architecture autant que de design, mais ça déverrouille tout le reste.
- [ ] **Loading states** : skeleton screens partout où il y a fetch (ClientPanel, ProgrammeList, FuelPage). Réutiliser `Skeleton.jsx` qui est déjà bien fait.
- [ ] **Empty states** : auditer les "Aucun client", "Aucun programme", "Aucun message" et utiliser systématiquement `EmptyState.jsx` (qui est aussi déjà bien fait).
- [ ] **Optimistic UI** sur : ajout de note coach, validation de séance, ajout de supplément, archivage de programme. Aujourd'hui : tout passe par un round-trip Supabase puis re-render. Linear ferait optimistic.
- [ ] **Focus states** beaux : `box-shadow: 0 0 0 3px rgba(2,209,186,0.18)` partout sur les inputs, pas l'outline navigateur.
- [ ] **Toast** : remplacer `'✓','✕','ℹ'` par SVG Lucide. Ajouter une variante `loading` avec Spinner inline.
- [ ] **Cmd+K** : étendre la palette à 100% des actions (aujourd'hui partielle). Ajouter un raccourci visible "⌘K" en bas à droite quand on hover certaines zones.
- [ ] **Page transitions** : nettoyer `pageSlideIn` pour qu'il fonctionne avec le routing React (App.jsx) — actuellement la classe est appliquée mais l'effet est à peine perceptible.

**Livrable visible** : poster un screenshot de ClientPanel sur Twitter sans honte. Un dev Linear qui regarde dit "tiens, c'est propre".

### Sprint 3 — Polish & marqueurs de pro (2 semaines, 50h)

**Objectif : signaux subliminaux qui font la différence.**

- [ ] **Accessibilité** : `aria-label` sur tous les buttons icon-only. Roving tabindex sur les listes. Live regions sur les toasts (`role="status"`). Tester avec VoiceOver iOS sur 3 parcours critiques (login → dashboard → ouvrir client).
- [ ] **Mobile tap targets** : audit complet, passer tous les boutons à ≥ 44×44 (ou utiliser un `::before` invisible qui agrandit la zone hit sans changer la taille visuelle).
- [ ] **Mode dark/light** : aujourd'hui ThemeSwitcher.jsx existe mais l'app est full dark. Soit on assume "dark only" et on retire le switcher, soit on fait un vrai light mode avec la même rigueur.
- [ ] **Cohérence cross-surface** : faire un grand audit visuel avec un screenshot par écran majeur (15 écrans), affichés en grille. Repérer tout ce qui jure.
- [ ] **Animations courtes** : audit des durées. Standardiser sur `120ms` (haptic feedback), `200ms` (UI subtle), `400ms` (page transition). Aujourd'hui c'est la jungle (de 0.15s à 14s).
- [ ] **Première impression** : revoir le splash + welcome screen + premier dashboard d'un nouveau coach. Aujourd'hui : "moyennement magique". Cible : screenshot Twitter sur la première session = "wow".
- [ ] **Documentation** : créer un `DESIGN-SYSTEM.md` court (1 page) qui décrit tokens + composants + règles. Tout dev qui arrive après n'a plus d'excuse pour redéclarer `const G = "#02d1ba"`.

**Livrable visible** : un investisseur à qui vous montrez l'app dit "le design est vraiment bon". Pas "c'est joli". "C'est bon".

---

## Conclusion brutale

Vous avez les **réflexes** d'un produit premium (haptics, prefers-reduced-motion, focus-visible, ambient gradients, Cmd+K, typographie large display, palette teal cohérente intentionnellement, bonne UX du parcours candidature, vraies photos transformations, OG dynamique, SSR vitrine). C'est **plus que la moyenne du SaaS fitness** par 10x.

Ce que vous n'avez pas, c'est la **discipline système**. Linear a trois personnes en design qui passent leur vie à dire "non, on a déjà un token pour ça". Stripe a un design system documenté qui fait 200 pages. Vous, vous avez 52 fichiers qui réinventent leurs constantes et 3 nuances de teal qui se promènent.

À 10M€ d'ARR, ce n'est pas négociable. Un investisseur qui ouvre votre code et voit `const G = "#00C9A7"` à côté de `const G = "#02d1ba"` à côté de `const GREEN = "#34d399"` ferme l'onglet. Un coach qui compare votre dashboard à un Notion ouvert dans l'autre onglet sent que Notion fait moins, mais le fait mieux.

**Le travail des 6 prochaines semaines n'est pas "ajouter des features". C'est tuer 52 mensonges et remplacer par 1 vérité.** Sprint 1 seul (fondations) déplace votre note de 38 à ~60. C'est la plus grosse claque visuelle que vous puissiez vous offrir avant le 4 mai et avant les premiers paiements 300€/mois.
