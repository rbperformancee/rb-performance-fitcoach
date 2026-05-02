# RB Perform — Audit BUSINESS (pas code)

**Date** : 2026-05-02
**Auditeur** : Operator senior, vu plusieurs SaaS faire 100k → 10M ARR
**Scope** : maturité business (proposition de valeur, pricing, GTM, moat, scale)
**Objectif fondateur** : 10M€ CA

---

## 1. VERDICT

> **18 mois de fondations business avant que la trajectoire 10M soit crédible. Et probablement 36 mois avant d'y être réellement.**

Le **produit est en avance d'au moins 12 mois sur le business**. Tu as un SaaS qui tape la qualité d'exécution d'un seed-funded à 1M€ levé (CI, CodeQL, RGPD art.30, RUNBOOK, structured logs, CSP hardening, multi-currency Stripe, OG dynamiques par coach, vitrine SSR). Mais tu lances dans 24 jours avec :

- **0 client payant**, 0 témoignage validé, 0 case study
- **80 leads** sur la waitlist (≈ une nano-base — Trainerize en a 100k+)
- **Aucune stratégie d'acquisition systémique** au-delà de cold email manuel + 1 launch email + Insta @rb_perform
- **2 offres mutuellement contradictoires** servies par un fondateur sans qualif sportive validée à date
- **Aucun moat défendable** au-delà du "low price founder lock" (qui est par définition non-scalable)

À 199€/mois ARPU, 10M€ ARR = **4 200 coachs payants actifs**. Le marché FR des coachs sportifs indépendants est estimé à **40-60k personnes** (BPJEPS APT/AF/AGFF + CQP + auto-entrepreneurs). Tu vises donc **7 à 10% de pénétration** d'un marché ultra-fragmenté qu'aucun acteur français n'a réussi à consolider. C'est **techniquement faisable mais nécessite une machine d'acquisition que tu n'as pas codée et pas pensée**.

La bonne nouvelle : la fondation produit te donne 12 mois d'avance pour pivoter, croiser les vagues, et trouver le PMF. La mauvaise : si tu ne mets pas TOUTE ton énergie business dans les 6 prochains mois sur 1 seul des 2 produits, tu vas mourir entre les deux.

---

## 2. TOP 3 FORCES BUSINESS

### Force #1 — La narration anti-Trainerize est claire et défensible
La proposition « 0% commission, prix verrouillé à vie, 30 places » est **un message de positionnement net** dans un marché où Trainerize prélève 3-30% sur le CA des coachs. C'est un **wedge** légitime : un coach à 5k€ MRR perd 1 500€/mois chez Trainerize, donc 199€ flat est un no-brainer rationnel. Le calcul "5 400€/an d'économie" est concret, chiffrable, copy-pastable dans un cold email.

C'est le seul angle marketing du projet qui a des chances de marcher viralement chez les coachs (cf. comparable : ConvertKit qui a explosé en attaquant le "rip-off" de Mailchimp sur les listes dupliquées).

### Force #2 — La machine email/cron transactionnelle est en place
- Cron weekly digest coach (lundi 7h UTC)
- Cron founder check-in J+30
- Cron relance client (push + email)
- Cron weekly recap client
- Cron cold-outreach J+0/J+3/J+7
- Welcome plan-aware via Resend post-checkout
- Webhook Stripe gérant 4 events (payment_failed = signal churn)

C'est l'**ossature CRM/lifecycle d'un SaaS à 1M€ ARR**. La plupart des SaaS solo fondateurs n'ont pas ça à 100k ARR. Cela permettra une rétention >90% si les emails sont bien copywrités (à valider).

### Force #3 — Vitrine publique SSR par coach = effet réseau latent
La vitrine `/coach/<slug>` avec SSR + OG dynamiques est **le seul endroit où il y a un moat potentiel**. Chaque coach payant qui partage son lien en story Insta = 1 page indexée + 1 OG card propre + 1 backlink vers RB Perform. Si 1 000 coachs partagent leur vitrine, tu as 1 000 micro-landings SEO autonomes pointant vers ton domaine.

C'est le pattern Linktree → 50M users / Calendly → unicorn. **C'est ton seul vrai vecteur viral codé**, et tu ne l'exploites pas en messaging.

---

## 3. TOP 3 MANQUES CRITIQUES BUSINESS

### Manque #1 — La proposition de valeur "Méthode RB Perform" est un cancer stratégique
Tu as 2 produits qui se cannibalisent dans la tête du visiteur :

| Offre | Cible | Prix | Promesse | Fondateur qualifié ? |
|---|---|---|---|---|
| SaaS Founding Coach | Coachs BPJEPS | 199€/mois | "Outil pour gérer tes clients" | OK (B2B SaaS) |
| Méthode RB Perform | Particuliers transformer leur physique | 300€/mois | "Méthode produit numérique" | NON, CQP juin 2026 |

Aucun acheteur sain ne saura **quoi acheter en arrivant sur rbperform.app**. Pire : le marché qui paye 300€/mois pour un programme transformation physique attend un coach validé (Greg Doucette, Jeff Nippard, en France Tibo InShape, Rayan Dussaut...). Toi, sans qualif, sans transfo personnelle visible (les transfos sur landing sont de qui ?), tu vends une "méthode" en mode produit numérique qui ressemble à un infopreneur de bas de gamme. **Ça polluera le brand B2B SaaS** que tu construis pour les coachs.

Comparable : Calendly n'a jamais vendu de coaching de productivité à côté. Notion n'a pas vendu de templates payants en propre (laissé à la communauté). **Choisis 1 produit et abandonne l'autre, ou tu vas perdre 12 mois en confusion de message.**

### Manque #2 — Aucune stratégie d'acquisition systémique codée ni pensée
Inventaire exhaustif de l'acquisition actuelle :
- Cold email manuel (50 prospects scrapés Insta) — non scalable
- 1 launch email aux 80 leads waitlist — one-shot
- Insta @rb_perform (taille audience inconnue)
- SEO landing (excellent JSON-LD, mais 0 contenu de fond, 0 article, 0 page outils)
- Aucun PPC, aucun affiliation, aucun partenariat fédération sport

Référentiel d'un SaaS qui vise 10M€ : Calendly a fait du SEO programmatique avec **15 000 landing pages** "{firstName} Calendly link" + integrations Zapier/Slack. **Tu n'as pas une machine d'acquisition, tu as un funnel d'attente.**

Le programme de parrainage existe en i18n (`set.referral_*` = "1 mois offert") mais **n'est pas wiré** côté UI fonctionnelle (à vérifier mais aucun composant ReferralPanel détecté). Pour 10M€ tu as besoin d'un viral loop intégré au produit, pas d'un cold email Zoho.

### Manque #3 — Crédibilité fondateur insuffisante pour le ticket B2B 199€
Un coach BPJEPS à qui tu demandes 199€/mois pendant 24 mois (4 776€) va vouloir savoir :
1. Qui est Rayan Bonte ? (Aucune bio LinkedIn vérifiable mentionnée nulle part dans le repo, juste "Founder & CEO" en JSON-LD)
2. Combien de clients RB Perform a-t-il déjà servi ? (0 témoignages)
3. Que se passe-t-il si tu arrêtes le projet ? (Pas de clause d'export en cas de shutdown dans le DPA)
4. As-tu déjà coaché des coachs ? (Tu n'es pas BPJEPS toi-même)

Le storytelling actuel "je suis coach et j'ai buildé pour moi" est **mensonger** vs. la réalité (CQP ALS prévu juin 2026 = pas encore coach légitime). Si 1 prospect creuse, le château de cartes tombe. Pour les 30 founders ça passe avec assez de chaleur humaine (groupe WhatsApp, accès direct), mais à 100, 500, 1 000 coachs il faut un proof social froid.

**Comparable** : Tally.so (concurrent Typeform) a explosé parce que Marie Martens documentait le revenu MRR public sur Twitter → trust automatique. Toi tu n'as ni revenu public, ni qualif, ni testimonial.

---

## 4. LE MANQUE #1 QUI EMPÊCHE LE DÉCOLLAGE

> **Tu ne sais pas qui est ton ICP. Tu en as 2-3 dans la tête, et ça paralyse toutes tes décisions.**

C'est LA racine de tous les autres problèmes :

- **Pourquoi 2 offres ?** → Parce que tu n'as pas tranché si tu vends à des coachs (B2B) ou à leurs clients (B2C).
- **Pourquoi pas de stratégie d'acquisition ?** → Parce que tu ne peux pas définir une machine d'acquisition tant que l'ICP est flou.
- **Pourquoi crédibilité fondateur ambiguë ?** → Parce que tu joues "athlète qui sait" pour la Méthode et "techno entrepreneur" pour le SaaS, et tu ne peux pas être les deux.
- **Pourquoi le pricing à 199€ est-il une devinette ?** → Parce que tu ne sais pas si c'est cher (vs. coach bootstrap à 5 clients) ou pas cher (vs. coach 6 chiffres à 50 clients).
- **Pourquoi le moat est faible ?** → Parce que tu n'as pas choisi qui défendre.

**La décision la plus rentable que tu puisses prendre dans les 7 jours : tuer la Méthode RB Perform.** Garde rbperform.com pour le SaaS uniquement. Mets la "Méthode" à part sur un sous-domaine personnel `methode.rayanbonte.com` ou abandonne-la. Sans ce focus, tu n'auras ni 10M ARR sur le SaaS ni 6 chiffres sur le coaching perso. **Tu seras médian sur les deux et invisible à 18 mois.**

ICP recommandé pour le SaaS (lock-in à choisir maintenant) :
- Coach BPJEPS/CQP, 25-40 ans, FR
- 8 à 30 clients actifs
- MRR personnel 2k-10k€
- Utilise Excel, Notion ou Trainerize aujourd'hui
- Présence Insta active (>1k followers, posts hebdo)
- Veut scaler son business, **PAS** seulement gagner en organisation

Cet ICP fait ~5 000 coachs en France. À 199€/mois avec 30% de pénétration sur 5 ans = 1 500 clients = 3.6M€ ARR. **Pour atteindre 10M€ il te faudra étendre Europe + segments adjacents (kinés, préparateurs physiques).**

---

## 5. PLAN EN 3 SPRINTS BUSINESS

Pas de code à écrire dans ce plan. Que des décisions et des actes business.

### SPRINT 1 — "TUE LA CONFUSION" (Mai 4 → Juin 4, 2026)

**Objectif** : avoir un message unique, une offre, un fondateur crédible.

| # | Action | KPI sortie |
|---|---|---|
| 1 | **Décider** : on tue la Méthode RB Perform OU on tue le SaaS B2B. Pas les deux ensemble. | Décision écrite + page `/candidature` masquée OU `rbperform.app` redirigé vers méthode |
| 2 | Écrire **1 page LinkedIn fondateur** béton (parcours, vrai pourquoi, métriques transparentes) — even si c'est "j'ai 0 client, j'apprends en public" | Page publiée, 50+ connections relances |
| 3 | Closer 5 founders à 199€ (les 80 leads waitlist + 50 cold email) — **face caméra, pas par mail** | 5 paid signups |
| 4 | Récolter 3 témoignages vidéo des 5 premiers (offre échange : logo + reel Insta) | 3 vidéos 60s + autorisation écrite |
| 5 | Auditer la concurrence FR sérieusement : Hexfit, MyCoachingZone, FizzUp Pro, Trainerize, Everfit, TrueCoach, KitsuneSport. Tableau positioning concret. | 1 doc concurrence + ton positionnement signé en 1 phrase |

**Si tu n'as pas 5 paid au 4 juin, tu dois réviser drastiquement le pricing ou l'ICP, pas continuer à coder.**

### SPRINT 2 — "MACHINE D'ACQUISITION V1" (Juin 5 → Août 5, 2026)

**Objectif** : transformer le bouche-à-oreille manuel en flux mesurable.

| # | Action | KPI sortie |
|---|---|---|
| 1 | Lancer un **content engine SEO** : 1 article/sem ciblé "{problème coach} {outil}" (ex: "Comment suivre 30 clients avec Excel sans craquer") | 8 articles publiés J60, 500 visiteurs organiques/mois |
| 2 | **Activer le viral loop vitrine** : forcer chaque coach payant à partager `/coach/<slug>` en story Insta (achievement déblocable, +1 mois offert). C'est ton seul moat code. | 50% des coachs partagent dans les 7 jours |
| 3 | Wirer le **programme de parrainage** : code unique par coach, attribution Stripe coupon, dashboard "tu as parrainé X coachs". L'i18n existe déjà. | 1 coach parrainé / 3 coachs payants |
| 4 | Lancer une **chaîne YouTube fondateur** orientée "build in public SaaS coaching" — c'est ton seul vrai canal de top-funnel scalable solo. Pas Insta (saturé, RoI faible). | 12 vidéos pub, 500 abos |
| 5 | Setup **Plausible** ou **PostHog** (pas Vercel Analytics qui est limité) pour tracker funnel landing → checkout → activation | Funnel mesurable, 1 metric clé : conversion landing → signup |

**Indicateur sprint 2 réussi** : 20 coachs payants au 5 août, dont 30% acquis hors cold email.

### SPRINT 3 — "PRÉPARER LE LEVÉE OU LE BOOTSTRAP DÉCISIF" (Août 6 → Nov 6, 2026)

**Objectif** : prouver que la machine tourne sans le fondateur 100% sur le clavier.

| # | Action | KPI sortie |
|---|---|---|
| 1 | Atteindre **50 coachs payants** = 10k€ MRR = 120k€ ARR. Seuil minimum pour parler crédiblement à un VC seed FR (Kima, Roxanne, Frst) ou aller en bootstrap pur. | 50 paid, churn < 5%/mois |
| 2 | Recruter **1 personne** : soit Sales (BDR FR pour cold/demo), soit Content (1 article/sem + 4 vidéos/mois), pas Dev | 1 hire, 30j onboarding fait |
| 3 | Monter le **Pro tier à 299€** et **Elite à 499€** avec features différenciantes claires (multi-coach team pour Elite, ex.) — sortir du flat 199€ qui plafonne ARPU | 20% des paid passent sur Pro/Elite (= ARPU blended 250€) |
| 4 | Lancer **EN** : page landing US/UK + 5 cold emails ciblés à des coachs anglo. Le code est déjà bilingue. | 3 paid hors FR |
| 5 | Décider : levée seed (1.5-2M€ pour scaler ads + équipe) OU bootstrap profitable (cap équipe à 3, cible 1M€ ARR fin 2027) | Décision documentée, pitch deck si levée |

**Indicateur sprint 3 réussi** : 50 paid, 1 hire actif, ARPU >220€, churn <5%, 1 article SEO/sem en autopilote.

---

## 6. 3 QUESTIONS CLÉS À RÉPONDRE DEMAIN MATIN

### Question #1 — "Si je devais me présenter en 1 phrase à un VC qui me demande 'tu vends quoi à qui', je dirais quoi ?"

Si la phrase contient le mot "ET" (ex: "un SaaS pour coachs ET une méthode pour clients"), **tu n'as pas répondu**. La phrase doit être 12 mots max. Exemple béton :

> *"Je vends à des coachs sportifs indépendants français le seul outil qui leur fait gagner 5 clients par mois en automatisant la rétention."*

Si tu ne peux pas la dire au reveil sans hésitation, tu ne sais pas ce que tu vends.

### Question #2 — "Si demain je perds @rb_perform Insta + mon adresse Gmail des 80 leads, comment j'acquiers mes 10 premiers clients suivants ?"

C'est un test de robustesse de ta machine d'acquisition. Aujourd'hui la réponse honnête est : *"Je suis cuit"*. Pour 10M€ il te faut au moins **3 canaux indépendants**, dont 1 où tu n'es pas le canal personnel (SEO, partenariat fédération, AdWords ciblé low-volume haute intention).

### Question #3 — "Pourquoi un coach qui m'a payé 199€ pendant 6 mois ne pourrait pas annuler et coder lui-même un Notion + Tally + Stripe + Calendly équivalent en 2 semaines ?"

Si la seule réponse est "il n'aura pas le temps" — ce n'est pas un moat, c'est un délai de remplacement. Les vrais moats SaaS B2B :
- **Switching cost** : ses 30 clients ont déjà l'app installée + leur historique 6 mois (poids, séances, photos transformations) — vrai pour RB Perform
- **Network effect** : la vitrine SEO de chaque coach renforce le brand collectif RB Perform — latent, pas encore activé
- **Data moat** : le score anti-churn IA s'améliore avec le volume cross-coachs — possible mais nécessite >100 coachs et 6 mois de data
- **Brand** : RB Perform = "le standard du coach sérieux en France" — à construire, encore 0

**Si tu ne peux pas pointer 2 de ces 4 moats avec preuve concrète à 24 mois, ton SaaS est cloneable et tu te feras dépasser par un concurrent mieux financé dès qu'il sentira la traction.**

---

## ANNEXE — 5 COMPARABLES À ÉTUDIER CETTE SEMAINE

| Comparable | Pourquoi | Métrique à voler |
|---|---|---|
| **Tally.so** (Marie Martens) | Solo founder, build in public, transparent MRR | Page revenue publique, weekly Twitter MRR update |
| **Hexfit** (Canada, FR) | Direct concurrent SaaS coach, 15 ans d'âge | Pricing tiers, content marketing FR |
| **Trainerize** | Le repoussoir que tu cites partout | Comprendre POURQUOI ils ont 100k coachs (= replication SEO) |
| **ConvertKit** (Nathan Barry) | A construit 30M€ ARR sur le wedge "anti-Mailchimp" | Email content marketing + creator partnership |
| **Notion FR** (Tibo Maker, etc.) | Adoption B2B FR via créateurs Insta/YouTube | Affiliate program structuré + content templates |

---

**Conclusion brutale** : Le code est à 95%. Le business est à 25%. Si tu mets autant d'énergie business dans les 90 jours que tu en as mis dans le code en 12 mois, tu décolles. Sinon tu auras le SaaS le mieux engineered de France à 5k€ MRR pendant 3 ans, avant qu'un concurrent moins bon techniquement mais avec une vraie machine commerciale ne te bouffe.

Tu n'as pas un problème de produit. Tu as un problème de focus, de courage de tuer la moitié, et de discipline d'acquisition.
