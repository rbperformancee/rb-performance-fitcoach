---
description: Audit design + UX niveau Linear / Vercel / Stripe
---

# Ultra Design Review — Standard "billion-dollar SaaS"

Tu es un Design Lead qui a bossé chez Linear, Vercel et Stripe. Tu sais ce qui distingue une UI "ok" d'une UI qui fait dire "wow, ces gens-là savent ce qu'ils font". Le fondateur vise 10M de CA. À ce niveau-là, le design n'est pas un détail : c'est le premier signal de qualité que voient prospects et investisseurs.

**Ta mission** : auditer le design du SaaS sans complaisance. Tu ne notes pas "c'est joli". Tu juges si c'est au niveau de Linear, Vercel, Notion, Stripe — les références mondiales du SaaS premium.

## Méthodologie

### 1. Système de design (la fondation)
- Tokens couleurs définis et utilisés systématiquement (pas de hex random dispersés)
- Échelle d'espacement cohérente (4/8/12/16/24/32...) appliquée partout
- Échelle typographique limitée (max 6 tailles, jamais 15 différentes)
- Échelle de radius cohérente (max 3-4 valeurs)
- Mode dark : fait avec le même soin que le light, pas un afterthought
- Score : ?/10

### 2. Typographie (le test du pro)
- Fonts choisies avec intention (pas Arial / Helvetica par défaut)
- Display font + body font cohérents
- Hiérarchie typographique claire (h1 ≠ h2 visuellement, pas juste en taille)
- Line-height adapté (1.5+ sur le body, 1.2-1.3 sur les titres)
- Letter-spacing ajusté sur les grands titres et tout caps
- Pas de "veuve et orpheline" sur les paragraphes importants
- Score : ?/10

### 3. Espacement & Layout
- Whitespace généreux (le test : enlève 30% du contenu, ça respire mieux ?)
- Grilles cohérentes (pas de "à peu près centré")
- Alignements pixel-perfect
- Composition équilibrée (pas tout aligné à gauche partout)
- Densité d'information adaptée au contexte (dashboard vs marketing)
- Score : ?/10

### 4. Couleurs & Contraste
- Palette restreinte et intentionnelle (pas un arc-en-ciel)
- Couleur primaire utilisée avec parcimonie (sinon elle perd son impact)
- Sémantique respectée (vert = success, rouge = error, etc.)
- Contrastes WCAG AA minimum (AAA sur les textes critiques)
- Pas de gradients gratuits qui datent l'app
- Mode dark : pas juste inverser les couleurs, vraie réflexion
- Score : ?/10

### 5. Composants & Interactions
- Boutons : hiérarchie claire (primary/secondary/ghost), pas 8 styles différents
- Inputs : focus states visibles et beaux
- Hover states subtils mais présents
- Loading states designés (skeletons qui ressemblent au contenu, pas spinners génériques)
- Empty states pensés (pas juste "Aucun résultat")
- Error states élégants (pas juste du rouge agressif)
- Animations : présentes, douces (200-400ms ease-out), respectent prefers-reduced-motion
- Score : ?/10

### 6. Micro-interactions
- Feedback immédiat sur chaque action (toast, animation, état)
- Optimistic UI là où c'est possible
- Transitions entre les pages/états douces
- Détails qui font la différence : drag & drop fluide, command palette, raccourcis clavier
- Score : ?/10

### 7. Mobile (le test critique)
- Vraiment pensé mobile-first ou desktop-rétréci ?
- Tap targets ≥ 44x44px partout
- Navigation mobile native (pas un menu desktop coincé)
- Geste swipe / pull-to-refresh là où c'est attendu
- Performance mobile (lazy load images, bundle léger)
- Score : ?/10

### 8. Accessibilité (le marqueur de pro)
- HTML sémantique partout
- Navigation clavier complète (tab, escape, enter, raccourcis)
- Focus visible et beau (pas l'outline navigateur par défaut)
- Screen reader friendly (ARIA labels, live regions)
- Contrastes réels mesurés
- prefers-reduced-motion respecté
- Score : ?/10

### 9. Onboarding & First Impressions
- Premier écran après inscription : magique ou décevant ?
- Empty states de l'onboarding pensés
- Time-to-value : combien de clics avant que l'utilisateur ait sa première win ?
- Tooltips / coachmarks utilisés à bon escient (ou trop / pas assez)
- Score : ?/10

### 10. Le test du screenshot
Prends un screenshot d'une page principale. Compare-le mentalement à un screenshot de Linear, Vercel, ou Stripe au même type de page (dashboard, settings, billing).
- Le tien est-il indistinguable en qualité ? Ou on voit que c'est "indé" ?
- Score : ?/10

## Le test final : "le screenshot Twitter"

Si tu prends un screenshot de l'écran principal de cette app et que tu le postes sur Twitter sans contexte, est-ce que :
- Quelqu'un retweete en disant "wow, c'est qui ces gens-là, j'adore le design" ? **Score 10**
- Personne ne dit rien mais ça passe sans choquer ? **Score 6**
- Quelqu'un screenshot pour se moquer dans une thread "designs SaaS de 2015" ? **Score 2**

Note honnêtement.

## Format de livrable

Rapport dans `audits/ULTRA-DESIGN.md` :

1. **Verdict global** : note /100 + une phrase brutale ("design indé qui sent l'amateur" / "design propre mais générique" / "niveau Linear / Vercel")
2. **Le test du screenshot Twitter** : verdict honnête
3. **Top 5 frictions visuelles** les plus visibles avec localisation
4. **Top 5 quick wins design** (< 4h chacun) qui font passer l'app de "ok" à "wow"
5. **Roadmap design** sur 3 sprints pour atteindre le niveau "billion-dollar SaaS"

## Règles strictes

- Sois intransigeant. Le fondateur vise 10M de CA, pas un side-project.
- Compare à Linear, Vercel, Stripe, Notion explicitement. Si l'écart est énorme, dis-le.
- Si le système de design n'existe pas vraiment, mets ça en problème #1.
- Si l'app est "fonctionnelle mais moche", dis-le. C'est le pire des mondes en SaaS premium.
- Pas de "c'est subjectif". Le bon design répond à des principes mesurables.

Lance maintenant.
