# Ultra Synthesis — Plan de bataille 30 jours

> Synthèse des 4 audits (Review · Design · Security · Business) du 2 mai 2026.
> Lecture obligatoire : les 4 rapports détaillés dans le même dossier.

---

## Vision honest

À l'instant T, RB Perform est **un produit prêt pour 5 clients, pas pour 10M de CA**. La distance est claire :

| Horizon | État |
|---|---|
| **Pour le launch dim 4 mai (founding email)** | ❌ Bloqué par 3 failles sécurité critiques (1h de fix) |
| **Pour les 5 premiers founding coaches le 26 mai** | 🟡 OK une fois les 3 critiques fixées et la décision ICP prise |
| **Pour 50 paid coaches (~120k€ ARR)** | 🟠 3 mois de fondations (refacto monolithe + acquisition machine) |
| **Pour 10M€ CA / 4 200 clients** | 🔴 18 mois minimum, et seulement si ICP tranché + machine acquisition codée + fondateur crédibilisé |

### Le vrai point bloquant
**Ce n'est pas le code. C'est le scope.** Tu codes simultanément deux SaaS (B2B Founding pour coachs + B2C Méthode pour clients perso) avec un seul fondateur, sans qualification validée, sans machine d'acquisition. Le code suit, le business pas.

### Scores agrégés
- 🔧 **Code (Review)** : 52/100 — solide pour 5 coachs, monolithe ingérable à 50
- 🎨 **Design** : 38/100 — réflexes premium mais zéro discipline système
- 🔒 **Sécurité** : 38/100 — 3 failles CRITIQUES exploitables aujourd'hui
- 💰 **Business** : "18 mois de fondations" — produit en avance, business en retard

---

## Plan 30 jours

### Semaine 1 (3-9 mai) — STOP THE BLEEDING

L'app est exploitable en l'état. Si tu pousses le launch email dimanche sans fixer ces 3 trucs, tu envoies tes premiers leads vers une porte ouverte. **~6h de travail concentré, c'est tout.**

| # | Action | Source | Complexité | ETA |
|---|---|---|---|---|
| 1 | **CRIT-1 RLS** : la policy `coaches_public_via_slug` (`migrations/034:35-38`) dump tous les emails Founders + Stripe IDs via la anon key. Restreindre à `public_profile_enabled = true` ET `coach_slug IS NOT NULL`. | Security | S | 30 sec SQL |
| 2 | **CRIT-2 Demo password** : `RBPerform2025!` est dans `build/static/js/main.*.js` (vérifié par grep). Retirer `REACT_APP_DEMO_PASSWORD` du `.env.local`, rotate le mot de passe Supabase, basculer sur le pattern OTP serverless de `demo-client.js`. | Security + Review | M | 30 min |
| 3 | **CRIT-3 Webhook bodyParser** : `api/webhook-stripe.js:329` puis `337` — le `module.exports.config` est écrasé par `module.exports = handler`. Inverser l'ordre pour que Vercel reçoive la directive `bodyParser: false`. | Security | S | 5 min |
| 4 | **/api/unsubscribe sans HMAC** : un attaquant peut désabonner tes 80 leads waitlist + tes 5 Founders en une boucle bash. Ajouter token HMAC court (signature `email + epoch`) dans le lien, vérifier serveur. | Security + Review | M | 1h |
| 5 | **/api/send-welcome non auth** : permet d'envoyer du mail à n'importe quel destinataire via ton SMTP Zoho. Auth obligatoire ou retirer l'endpoint si plus utilisé en frontend. | Security | S | 30 min |
| 6 | **/api/voice-analyze non auth** : 1000 IPs × analyses Mistral = $2880/jour de facture sur ton compte. Auth + rate limit `_security.js`. | Security | S | 30 min |
| 7 | **Hardcoded Supabase URL + anon key** dans `coach-vitrine.js`, `sitemap.xml.js`, `og-coach.mjs`. Tenant ID public sur GitHub. Migrer en env vars Vercel (les valeurs ne changent pas, c'est juste cosmétique au cas où tu rotates plus tard). | Review | S | 1h |
| 8 | **DÉCISION ICP — la seule qui compte cette semaine** : tuer Méthode RB Perform OU repositionner strict produit numérique. Voir "Le pari du mois" plus bas. | Business | XL | 1h de réflexion + 4h de code si tu choisis l'option propre |

**Au total : ~5-6h de fix sécu + 4-5h de cleanup ICP = launch le 26 mai possible et propre.**

---

### Semaine 2 (10-16 mai) — FOUNDATIONS

Ce qui empêche de scaler à 50 clients sans tout casser.

| # | Action | Source | Complexité |
|---|---|---|---|
| 1 | **N+1 critique cron-relance** (`api/cron-relance.js:137-201`) — timeout Vercel garanti à 200+ clients. Refacto en batch SELECT + foreach. | Review | M (4h) |
| 2 | **Backup-avant-plans.sql 17MB commit** dans le repo — risque exfiltration. `git rm` + `git filter-repo` pour clean l'historique. | Review | S (1h) |
| 3 | **CI obligatoire** : `npm test` et `npm run test:e2e` dans `.github/workflows/`. Bloque le merge si fail. Couvre au minimum le webhook Stripe (le seul flow qui touche au revenue). | Review | M (5h) |
| 4 | **AbortController** sur les fetches longs côté client (Settings, BusinessSection, Sentinel). 0 actuellement → fuites mémoire à 10x users. | Review | M (3h) |
| 5 | **Endpoints abus/limites** : un user peut-il créer 1M ressources ? Limites côté coach (max programmes, max clients selon plan), enforced en RLS. | Security | M (3h) |
| 6 | **/api/gdpr-delete** : actuellement n'existe pas, seulement export. Article 17 RGPD = obligation 4% CA mondial en amende. Endpoint qui delete coach + cascades. | Security | M (2h) |

---

### Semaine 3 (17-23 mai) — POLISH PRE-LAUNCH

Le 26 mai, tes 5 premiers Founders cliquent sur ton lien. Ce qu'ils voient doit donner envie de payer 199€/mois pendant 12 mois.

| # | Action | Source | Complexité |
|---|---|---|---|
| 1 | **Design tokens unifiés** : créer `src/lib/tokens.js` exportant `COLORS`, `SPACE`, `RADIUS`, `TYPE`. Remplacer les 81 hex dispersés et 37 opacités blanches par les tokens. Linear en a 5 opacités, toi 37. | Design | L (8-10h) |
| 2 | **Une seule typo** : retirer Bebas Neue + Syne + DM Sans. Garder Inter (display + body) + JetBrains Mono (numérique uniquement). 5 fontes → 2 = -120kB de bundle. | Design | M (2h) |
| 3 | **Composant `<Button>` partagé** : aujourd'hui 47 boutons inlinés dans CoachDashboard avec 8 styles primary distincts. `<Button variant="primary"\|"secondary"\|"ghost">` qui canonise. | Design | L (8h) |
| 4 | **Mensonge sémantique des couleurs** : `landing.html:180` définit `--orange:#00C9A7` et `--violet:#00C9A7` (les deux sont teal). Renommer ou utiliser les bonnes valeurs. | Design | S (15min) |
| 5 | **Test funnel manuel complet** : signup nouveau coach → onboarding → 1er client → programme → 1er paiement. Toi en navigation privée, écran à côté du staging. Liste des bugs UX, fix les 5 plus critiques. | Review | L (1 jour) |
| 6 | **Email templates** : welcome, weekly digest, churn alert — vérifie que le rendu est propre dans Gmail/Outlook (pas que sur ton MacMail). | Business | M (3h) |

---

### Semaine 4 (24-30 mai) — GO-TO-MARKET READINESS

Le launch a démarré. Maintenant tu construis la machine.

| # | Action | Source | Complexité |
|---|---|---|---|
| 1 | **Analytics tracking** : PostHog ou Plausible. Tu n'as RIEN actuellement. Sans ça tu pilotes à l'aveugle. Funnel signup → activation → paiement → rétention. | Business | M (3h) |
| 2 | **LinkedIn fondateur live** + 5 posts founder's journey (le pourquoi, le comment, les chiffres, les leçons, la roadmap). Crédibilité = pré-requis du ticket 199€×24mois. | Business | M (1 jour) |
| 3 | **3 vidéos témoignage** des 5 Founders (incentive : 1 mois gratuit). Sans testimonial, ton funnel d'acquisition reste théorique. | Business | L (2 jours coordonnées) |
| 4 | **Programme parrainage** : tu m'as dit qu'on le retire au launch — OK, mais le rebrancher dès Founder 6 (parrainages internes B2B = 80% des signups SaaS niche). | Business | M (4h) |
| 5 | **1er article SEO** : "Trainerize vs RB Perform — pourquoi 0% commission change tout pour les coachs sportifs". Démarre le content engine. | Business | M (4h) |

---

## Le pari du mois

> Si tu devais parier ton mois sur UNE seule action qui aura le plus d'impact business, ce serait laquelle ?

**Tuer la Méthode RB Perform. All-in sur le SaaS B2B "Founding Coach Program".**

Pourquoi :
- L'audit business l'identifie comme **manque critique #1** : ICP non tranché = racine de tous les autres problèmes.
- L'audit code montre que la dual-offer fragmente l'attention : `/candidature`, `OnboardingFlow mode="application"`, articles légaux 03.D dédiés, email templates spécifiques, vitrine éditeur — tout ça maintenu pour ~1500€ × 5 mois = **7500€ de revenu non récurrent** vs un SaaS B2B clean qui scale.
- L'audit sécurité ajoute le risque CQP ALS non validé jusqu'à juin → si un client de la Méthode te plainte avant, exposition pénale L212-1 sans casserole couverte.
- Le SaaS B2B seul crédibilise un Loom investor-ready (audit business test #10) : *"je build l'outil que les coachs sportifs n'ont pas, 0% commission, locked à vie pour les 30 premiers"*. C'est une histoire claire. *"Je build un SaaS pour coachs ET je vends mon coaching personnel"* en est deux.

**Action concrète semaine 1** :
1. Désactiver la route `/candidature` (rewrite vers `/founding`)
2. Retirer la section 03.D du legal.html (laisse 03.A/B/C)
3. Archiver `CoachingApplicationLanding.jsx` + email templates Méthode (`docs/EMAIL-TEMPLATES-METHODE.md`)
4. Réécrire la bio vitrine de Rayan : "Athlète. Fondateur RB Perform. Je build pour les coachs sportifs ce que Stripe a fait pour les paiements."
5. Une seule URL, une seule histoire, une seule offre.

ROI estimé : -7500€ revenu Méthode mais +confiance des Founders B2B (qui voient un SaaS focalisé, pas un mec qui essaie tout) + temps libéré pour la machine d'acquisition. Sur 12 mois, le delta MRR B2B couvre 10x la perte Méthode.

---

## Les questions ouvertes

Les 5 décisions que la synthèse des audits ne peut pas trancher pour toi.

1. **Méthode RB Perform — kill ou repositioner ?**
   Si tu gardes l'offre (par attachement, par revenue immédiat, par autre raison), il te faut **impérativement** : (a) un BPJEPS validé, ou (b) un repositionnement strict produit numérique avec disclaimer L212-1 partout, et acceptation que ça reste une offre marginale qui dilue le focus.

2. **TypeScript ou JSDoc strict ?**
   50k lignes JS pur sans tsconfig. Migration TS = 4-8 semaines de refacto pour 0€ de revenue immédiat. JSDoc strict + `// @ts-check` = 1 semaine, 70% des bénéfices. Mon vote : JSDoc.

3. **Refacto CoachDashboard.jsx (3946 lignes) maintenant ou après le launch ?**
   Avant : risque de bugs au pire moment. Après : continue d'accumuler de la dette pendant 6 mois jusqu'à ce que ce soit ingérable. Mon vote : split en 4 sous-composants (ClientList, ProgrammesPanel, BusinessPanel, SettingsPanel) la semaine 2 — risque géré, gain énorme.

4. **Funding : bootstrap ou levée pré-seed après 50 clients ?**
   À 50 paid × 199€ × 12 mois = 119 400€ ARR. Levée pré-seed possible à 1.5-2M€ valuation, dilution 15-20%. Bootstrap possible si frugal et content-marketing only. Question stratégique pure : tu vises 10M en combien de temps ? 18 mois bootstrap c'est tendu, 36 mois c'est OK.

5. **Hire next : Sales/Content ou Dev ?**
   Si tu lèves : Sales senior (le SaaS B2B niche, c'est outbound). Si bootstrap : Content lead pour engin SEO. **Pas de Dev** tant que tu n'as pas de signal d'overhead technique sur 50+ clients — ton code est meilleur que ce que tu paierais à un freelance.

---

## Récapitulatif exécutif (pour le founder à 7h du matin)

```
☐ JOUR 1     : 3 fixes sécu critiques (1h) → on peut envoyer le launch email
☐ JOUR 2-3   : décision ICP (kill Méthode) + cleanup correspondant (4h)
☐ SEMAINE 1  : autres fixes sécu hauts (4h)
☐ SEMAINE 2  : N+1 cron, CI, RGPD-delete (12h)
☐ SEMAINE 3  : design tokens + Button partagé + funnel manual test (3 jours)
☐ SEMAINE 4  : analytics + LinkedIn live + 1er testimonial vidéo (3 jours)
☐ MOIS+1     : content engine SEO, parrainage rebranché, hire decision
☐ MOIS+3     : 50 paid → décision levée vs bootstrap
☐ MOIS+18    : 4 200 paid si machine acquisition tient → 10M ARR
```

Pas de magie. Un launch propre dimanche, 4 semaines d'exécution disciplinée, et 18 mois de focus pour la trajectoire 10M.

**Tu n'as pas un problème de code. Tu as un problème de scope.**

Le code suit. Tranche.
