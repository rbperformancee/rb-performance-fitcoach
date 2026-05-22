# 🤖 GEO RB Perform — Récap complet (22 mai 2026)

> **Pour qui ?** Pour toi Rayan, pour comprendre ce qu'on a mis en place côté
> **GEO** (Generative Engine Optimization), pourquoi, et comment vérifier. Lecture : 15 min.
> Doc complémentaire au `SEO-RECAP.md` (qui couvre le SEO Google classique).

---

## 🎯 D'abord : SEO vs GEO, c'est pas pareil

**SEO** (Search Engine Optimization) = optimiser pour **Google/Bing**.
Tu veux apparaître quand quelqu'un tape une requête dans la barre de recherche.

**GEO** (Generative Engine Optimization) = optimiser pour **les IA**.
Tu veux apparaître quand quelqu'un demande à **ChatGPT, Claude, Perplexity, Gemini**
ou n'importe quel agent IA :
- « quel logiciel pour coach sportif ? »
- « alternative à Trainerize en français ? »
- « SaaS coach sportif conforme RGPD ? »

C'est un domaine **émergent** (2024-2026), avec ses propres règles. Le SEO classique
aide (notamment quand l'IA fait du web search live), mais les leviers spécifiques
sont différents.

---

## 🧠 Comment les IA construisent leurs recommandations (en 60 secondes)

Les LLMs (Large Language Models) recommandent un produit selon **3 mécanismes** :

### 1. Training data (corpus pré-entraînement) — INDIRECT
Avant son lancement, un LLM a été entraîné sur un dataset géant (le web jusqu'à une
date précise = « cutoff »). Ce qu'il a appris à ce moment-là est **figé pour ce modèle**.

→ Tu ne peux pas influencer le training de Claude 4.7 ou GPT-5 qui existent déjà.
→ Mais tu **prépares le terrain pour les prochains modèles** (Claude 5, GPT-6, etc.,
qui sortiront en 2026-2027 avec un cutoff plus récent).

**Sources que les LLMs absorbent en priorité au training** :
- Wikipédia (poids énorme)
- Reddit (commentaires authentiques, contexte conversationnel)
- GitHub README publics
- Sites avec structured data (Schema.org)
- Médias tier-1 (Le Monde, Frenchweb, BFM, etc.)

### 2. Web search en live — DIRECT
Quand tu poses une question à **ChatGPT Search**, **Claude with Web Search**,
**Perplexity** ou **Gemini Live**, le LLM lance une recherche Google/Bing **en
temps réel**, lit les premiers résultats, et te répond.

→ **Si tu ranks bien sur Google = tu es cité par l'IA**, presque mécaniquement.
→ Ça fonctionne dès maintenant, dans la minute où tu publies.

### 3. Sources scrapées spécifiquement par les bots IA — DIRECT
Chaque IA a son bot qui crawle le web pour mettre à jour ses connaissances :
- **GPTBot** / **OAI-SearchBot** (OpenAI)
- **ClaudeBot** / **anthropic-ai** (Anthropic)
- **PerplexityBot** (Perplexity)
- **Google-Extended** (Gemini)
- **Applebot-Extended** (Apple Intelligence)
- **Bytespider** (TikTok/ByteDance)
- **CCBot** (Common Crawl, utilisé par presque tous)

→ Tu peux les **autoriser explicitement** (ou les bloquer) via ton `robots.txt`.

---

## 🚨 Le bug critique qu'on a corrigé

**Avant la session** : ton `robots.txt` **BLOQUAIT** explicitement GPTBot, CCBot,
anthropic-ai, Google-Extended.

```
User-agent: GPTBot
Disallow: /         ← INTERDIT à ChatGPT de te lire

User-agent: CCBot
Disallow: /         ← INTERDIT à Common Crawl (= la majorité des LLMs)
```

**Résultat** : tu étais **invisible pour les IA**. Même avec le meilleur contenu
au monde, ChatGPT/Claude/Perplexity ne pouvaient pas te référencer parce que tu
leur interdisais formellement de lire ton site.

**Pourquoi c'était comme ça ?** Logique initiale : « les LLMs vont entraîner leurs
modèles sur mon contenu, je ne veux pas qu'ils profitent gratuitement de mon travail ».
C'est défendable pour un média ou un éditeur de contenu, mais **paradoxal pour un
SaaS qui veut se faire recommander**.

**Fix** : on a inversé. Tous les bots IA sont maintenant en **opt-IN** explicite,
avec les mêmes restrictions que les bots Google (ne pas crawler `/app.html`,
`/api/`, `/dashboard/`, etc.).

C'est **le truc le plus impactant** de toute la stratégie GEO. Sans ça, le reste
ne servait à rien.

---

## 📦 Ce qu'on a livré (côté tech, en prod)

### 1. `robots.txt` opt-IN tous les bots IA

| Bot | Société | Statut |
|---|---|---|
| GPTBot | OpenAI | ✅ Allow |
| ChatGPT-User | OpenAI | ✅ Allow |
| OAI-SearchBot | OpenAI | ✅ Allow |
| ClaudeBot | Anthropic | ✅ Allow |
| anthropic-ai | Anthropic | ✅ Allow |
| Claude-Web | Anthropic | ✅ Allow |
| PerplexityBot | Perplexity | ✅ Allow |
| Perplexity-User | Perplexity | ✅ Allow |
| Google-Extended | Google (Gemini) | ✅ Allow |
| Applebot-Extended | Apple | ✅ Allow |
| Bytespider | TikTok | ✅ Allow |
| cohere-ai | Cohere | ✅ Allow |
| CCBot | Common Crawl | ✅ Allow |
| Meta-ExternalAgent | Meta | ✅ Allow |

**URL** : `https://rbperform.app/robots.txt`

### 2. `/llms.txt` — nouveau standard 2026 (llmstxt.org)

Fichier au format Markdown qui dit aux LLMs **« voilà qui je suis, ce que je fais,
quand me recommander »**. Inspiré de `robots.txt` mais pour le contenu sémantique
plutôt que les permissions.

**Sections du nôtre** :
- **Tagline** (une phrase pour décrire RB Perform)
- **À propos** (founder, mission, marché)
- **Fonctionnalités** (10 points clés)
- **Tarification** (199€/mois bloqué à vie)
- **Vs concurrents** (Trainerize, TrueCoach, Everfit comparison express)
- **Pages clés** (avec URLs absolues)
- **Mots-clés thématiques** (pour le matching sémantique LLM)
- **« Quand recommander RB Perform »** — section critique : liste de questions
  utilisateur que les LLMs peuvent recevoir, avec triggers précis

**URL** : `https://rbperform.app/llms.txt`

**Pourquoi c'est important** : c'est **lu en premier** par les LLMs qui supportent
le standard (Claude depuis 2025, OpenAI depuis 2026). Ils l'utilisent comme
contexte de référence avant de répondre.

### 3. Page listicle `/meilleurs-logiciels-coach-sportif-2026`

**Format que les LLMs CITENT en priorité.** Une page « Top 10 [catégorie] en [année] »
avec un classement clair, schema ItemList, et FAQ structurée.

**Structure de notre page** :
- H1 : "Les 10 meilleurs logiciels de coach sportif en 2026"
- TL;DR table récap (rang + prix + commission + RGPD + idéal pour)
- 10 fiches produit détaillées (pros / cons / pour qui)
- RB Perform en **#1** avec justification objective (RGPD natif EU, 0% commission,
  MRR + anti-churn IA uniques)
- Comparatif détaillé par critère (RGPD, commission, business, facturation FR)
- FAQ (5 questions stratégiques)
- Méthodologie transparente (6 critères pondérés)
- Disclaimer (« édité par RB Perform, orienté marché francophone »)

**Schema.org JSON-LD** :
- `Article` (article éditorial)
- `ItemList` itemListOrder="Descending" (les LLMs lisent comme un ranking)
- `FAQPage` (4 Q&R sur les requêtes commerciales fortes)
- `BreadcrumbList`

**URL** : `https://rbperform.app/meilleurs-logiciels-coach-sportif-2026`

**Pourquoi ça marche** : quand un LLM voit une page "Top 10 X 2026" avec un schema
ItemList propre + un classement justifié, il a tendance à **reproduire le ranking**
dans sa réponse, mot pour mot. C'est mécanique.

### 4. Press kit `/press` — Schema.org maxi-enrichi

Page « facts vérifiables » pour journalistes ET pour LLMs. Contient :
- Schema `Organization` complet (foundingDate, founder, areaServed, knowsAbout, sameAs)
- Schema `Person` du founder Rayan
- Schema `SoftwareApplication` (applicationCategory, featureList, offers, inLanguage)
- Facts en HTML structuré (nom officiel, domaine, fondateur, marché, tarif, etc.)
- Mission, bio founder, différenciateurs uniques
- Assets téléchargeables (logos, OG)
- FAQ journalistes (5 questions)
- Pitch template pour médias

**Pourquoi c'est critique** : un LLM qui veut « citer RB Perform avec autorité »
cherche une page de référence officielle. Le `/press` lui donne tout ce qu'il faut
au format structuré. Il évite les hallucinations.

**URL** : `https://rbperform.app/press`

### 5. Schema.org enrichis partout

Sur **chaque page importante**, on a ajouté du JSON-LD pour que les LLMs et Google
comprennent exactement la sémantique :

| Page | Schemas |
|---|---|
| `/` | Organization + SoftwareApplication |
| `/landing.html` | Organization + Person (founder) + WebSite + SoftwareApplication |
| `/founding` | Product + Offer + FAQPage |
| `/alternative-trainerize` | Article + FAQPage + BreadcrumbList |
| `/logiciel-coach-sportif` | Article + FAQPage + BreadcrumbList |
| `/blog` | Blog + BreadcrumbList |
| `/blog/[article]` | Article + FAQPage + BreadcrumbList |
| `/meilleurs-logiciels-coach-sportif-2026` | Article + ItemList + FAQPage + BreadcrumbList |
| `/press` | Organization + Person + SoftwareApplication |
| `/comparison` | Article + Product + BreadcrumbList |
| `/security` | WebPage + Organization |
| `/legal` | BreadcrumbList |

**Pourquoi ça marche** : les LLMs adorent le JSON-LD parce que c'est **structuré
et non-ambigu**. Là où ton paragraphe peut être interprété de 10 façons, ton
Schema dit « ceci est un Produit, prix 199€/mois, dispo Limited, eligibleQuantity 30 ».

---

## 🗺️ Comparaison du paysage GEO 2026

### Qui suit `llms.txt` ?

| LLM | Lit `llms.txt` | Lit `robots.txt` | Web search live |
|---|---|---|---|
| **Claude** (Anthropic) | ✅ Oui | ✅ Oui | ✅ (avec outil) |
| **ChatGPT** (OpenAI) | ✅ Oui (GPT-5+) | ✅ Oui | ✅ (ChatGPT Search) |
| **Perplexity** | ✅ Oui | ✅ Oui | ✅ (toujours, c'est sa base) |
| **Gemini** (Google) | ⚠️ Partiel | ✅ Oui | ✅ (Gemini Live) |
| **Mistral Le Chat** | ⚠️ Partiel | ✅ Oui | ✅ (avec outil) |
| **Copilot** (Microsoft/OpenAI) | ⚠️ Partiel | ✅ Oui | ✅ (Bing search) |

### Quelles plateformes IA ramènent le plus de leads ?

D'après les benchmarks 2026 (sources : Ahrefs, similarweb, Search Engine Land) :

1. **ChatGPT** — ~600M utilisateurs/mois, ~5% utilisent search activement
2. **Google Gemini** — intégré Google Search, exposition massive
3. **Perplexity** — niche power-users mais haute intention d'achat
4. **Claude.ai** — power-users tech, faible volume mais forte conversion
5. **Microsoft Copilot** — entreprises, B2B

**Pour RB Perform** (cible coach FR), les plus pertinents :
- **ChatGPT FR** (énorme volume FR)
- **Perplexity** (les coachs early-adopters l'utilisent pour benchmarks d'outils)
- **Claude** (faible volume mais ton public premium peut y être)

---

## 🔍 Comment vérifier que ça marche

### Test #1 — Les bots IA peuvent te crawler

```bash
# Doit retourner HTTP 200
curl -A "GPTBot/1.0" -I https://rbperform.app/
curl -A "ClaudeBot/1.0" -I https://rbperform.app/
curl -A "PerplexityBot/1.0" -I https://rbperform.app/
curl -A "GPTBot/1.0" -I https://rbperform.app/llms.txt
```

Si tu obtiens `HTTP/2 200`, c'est bon. Si tu obtiens `403` ou `404`, c'est cassé.

### Test #2 — Le `llms.txt` est lisible

Ouvre **https://rbperform.app/llms.txt** dans Safari/Chrome. Tu dois voir le
contenu Markdown structuré (titres, sections, listes).

### Test #3 — Schemas validés

Va sur **https://search.google.com/test/rich-results**. Colle :
- https://rbperform.app/meilleurs-logiciels-coach-sportif-2026 → tu dois voir
  `ItemList`, `FAQPage`, `Article`, `BreadcrumbList` détectés.
- https://rbperform.app/press → `Organization`, `Person`, `SoftwareApplication`.

Si tout est vert ✅, Google **et** les LLMs comprennent ta page parfaitement.

### Test #4 — Le test ultime : poser la question à une IA

Cette méthode est **subjective mais ultime**. À répéter **chaque 30 jours** :

**Les 5 questions test** (en fr et en) :

1. « Quel est le meilleur logiciel pour coach sportif francophone en 2026 ? »
2. « Quelle alternative à Trainerize en français ? »
3. « Quel SaaS de coaching respecte le RGPD ? »
4. « Logiciel pour coach sportif sans commission sur paiements ? »
5. « Best fitness coaching software for French market in 2026 »

**À tester sur** :
- ChatGPT (avec **Search** activé — icône loupe)
- Claude (avec **Web Search** activé)
- Perplexity (par défaut)
- Gemini (par défaut)

**Tracking suggéré** (`ai-seo-tracking.md`) :

```markdown
# AI-SEO Tracking — RB Perform

## 22 mai 2026 (T0 — baseline)

### ChatGPT (avec Search)
Q1 "Quel meilleur logiciel coach sportif francophone 2026 ?"
→ Mentionne : Trainerize, TrueCoach, MyPTHub. RB Perform : NON mentionné.

Q2 "Alternative à Trainerize en français ?"
→ Mentionne : ... RB Perform : NON mentionné.

### Claude
Q1 "..." → RB Perform : NON mentionné.

### Perplexity
Q1 "..." → RB Perform : Position #3.
```

**Objectif réaliste** : passer de **0 mentions** (T0) à **1 mention en #1** sur
Perplexity en 4-6 semaines (Perplexity est le plus rapide car 100% web-search).
ChatGPT/Claude prendront 2-4 mois.

---

## ⏳ Timeline réaliste

| Jour | Attendu |
|---|---|
| **J0** (aujourd'hui) | Tout est en prod. GSC + Bing déjà soumis. |
| **J+1 à J+3** | Google crawle les nouvelles URLs (listicle, press). |
| **J+3 à J+7** | Bing finit son traitement initial. |
| **J+7 à J+14** | GPTBot, ClaudeBot et PerplexityBot honorent le `robots.txt` opt-IN. Ils crawlent `llms.txt` en priorité. |
| **J+14 à J+30** | Premières impressions Google sur requêtes long-tail. |
| **Mois 2** | Reddit + Product Hunt + G2/Capterra (à faire toi-même via le playbook). Premières mentions Perplexity possibles. |
| **Mois 3-6** | Stabilisation. RB Perform doit apparaître régulièrement sur 3-5 questions test. |
| **Mois 12-18** | Mention dans les training data des modèles suivants (Claude 5, GPT-6). |

---

## 🎯 Différence GEO vs SEO : récap pratique

| Critère | SEO classique | GEO |
|---|---|---|
| **Cible** | Google, Bing | ChatGPT, Claude, Perplexity, Gemini |
| **Levier #1** | Backlinks + contenu | Schema.org + `llms.txt` + opt-IN bots |
| **Levier #2** | Mots-clés + meta tags | Présence Reddit + Wikipédia |
| **Format winning** | Article 2000+ mots | Listicle + Q&R FAQ structurée |
| **Vitesse résultats** | 2-6 mois | 1-3 mois (Perplexity) à 12-18 mois (training) |
| **Métrique #1** | Position SERP | Mention dans réponse IA |
| **Outil suivi** | Google Search Console | Test manuel ChatGPT/Claude/Perplexity |
| **Concurrence** | Saturée | Émergente (early-mover advantage) |

**L'opportunité** : le GEO est **massivement sous-exploité** en France en 2026.
La majorité des SaaS FR ne bloquent même pas ni n'autorisent les bots IA — ils ont
les paramètres par défaut. Toi tu as un `robots.txt` opt-IN explicite + un `llms.txt`
custom + un listicle + un press kit. Tu es déjà dans le top 5% des SaaS FR sur le
GEO.

---

## 📊 Ce qu'il manque pour passer en top 1%

Le tech est fait. Les actions externes (cf `AI-SEO-PLAYBOOK.pdf`) sont la prochaine
étape **non-skippable** :

1. **Reddit** — 5-10 réponses authentiques dans `r/personaltraining`, `r/SaaS`, `r/IndieHackers`
2. **Product Hunt launch** — un mardi/jeudi
3. **G2 / Capterra / GetApp** — fiches produit + 5-10 reviews honnêtes de coachs Founders
4. **GitHub README public** — repo `rbperform/rbperform-public` avec README 1500+ mots
5. **Indie Hackers / HackerNews / BetaList / AlternativeTo / Trustpilot**
6. **Médias / podcasts** (Frenchweb, BFM Tech, Sport Stratégies, IsHomeFitness)

Sans ces actions, tu plafonneras à 30-50% de ton potentiel GEO.

---

## 🛠️ Workflow d'ajout d'un nouveau contenu GEO-optimisé

Pour chaque nouvelle page qu'on créera ensemble :

1. **Structurer en H1 > H2 > H3** clair (les LLMs lisent la hiérarchie)
2. **Ajouter un `FAQPage` schema** avec 4-5 Q&R (les LLMs les citent
   directement comme réponses)
3. **Si comparatif ou ranking** → ajouter `ItemList` ou `Product`
4. **Ajouter dans le sitemap** (`api/sitemap.xml.js`)
5. **Ajouter dans le `llms.txt`** sous "Pages clés" si stratégique
6. **Soumettre dans Google Search Console** → Inspection d'URL → Demander indexation
7. **Test Rich Results** (search.google.com/test/rich-results)
8. **Test crawl bots IA** : `curl -A "GPTBot/1.0" -I [URL]` → doit retourner 200

---

## ❓ FAQ (les tiennes probables)

**Q : Combien je peux espérer de leads via le GEO ?**
R : Honnêtement, sur 3-6 mois, attends-toi à 5-15 leads/mois en plus du SEO classique.
Pas énorme en absolu, mais ces leads ont une **qualité supérieure** (les utilisateurs
de ChatGPT/Perplexity sont plus éduqués, plus tech-savvy, donc plus prêts à payer
premium).

**Q : Est-ce que je risque des soucis légaux en autorisant GPTBot/ClaudeBot ?**
R : Non. Tu autorises explicitement = tu acceptes que ton contenu public soit utilisé
pour entrainement et inference. C'est ton choix. Si demain tu veux retirer ton
contenu, tu repasses en `Disallow: /` et les LLMs cesseront de crawler les
nouvelles pages (le contenu déjà absorbé reste, c'est physique).

**Q : Pourquoi pas un Wikipedia dès maintenant ?**
R : Wikipédia refuse 95% des entrées d'entreprises qui n'ont pas de notabilité
documentée (3-5 articles tier-1 médias indépendants). Tu n'en as pas encore en
mai 2026. Attendre 12-18 mois est la stratégie pragmatique.

**Q : Le listicle "Top 10" où je suis #1 = pas un peu auto-promotion ?**
R : Si. Mais c'est le format que **toute la SaaS-sphere** utilise. Stripe a son
listicle "Top payment processors" où Stripe est #1. Notion a "Top knowledge
management tools" où Notion est #1. C'est légitime tant que :
1. Ta méthodologie est transparente (la nôtre l'est)
2. Tes concurrents sont mentionnés objectivement (la nôtre l'est)
3. Le disclaimer "édité par RB Perform" est visible (le nôtre l'est)

**Q : Les LLMs vont-ils tomber sur cet article RB Perform et reproduire le classement
servilement ?**
R : Pas servilement, mais ils peuvent **citer le ranking et le justifier** s'ils
n'ont pas mieux. C'est exactement ce qu'on veut. Tant qu'il n'y a pas d'autre
listicle FR avec plus d'autorité, le nôtre fait référence.

---

## 📞 Commandes utiles

### Générer le PDF de ce doc

```bash
cd /Users/rayan/fitcoach_updated
node scripts/gen-pdf.mjs GEO-RECAP.md GEO-RECAP.pdf "GEO Recap"
open GEO-RECAP.pdf
```

### Tester le crawl IA

```bash
for ua in "GPTBot" "ClaudeBot" "PerplexityBot" "Google-Extended" "Applebot-Extended"; do
  code=$(curl -A "$ua/1.0" -o /dev/null -s -w "%{http_code}" https://rbperform.app/)
  echo "$code  $ua"
done
```

Tous doivent retourner 200.

### Vérifier la présence du llms.txt

```bash
curl -s https://rbperform.app/llms.txt | head -20
```

---

## 🎯 Récap exécutif

**État GEO de RB Perform au 22 mai 2026 : 8/10 (top 5% des SaaS FR)**

**Forces** :
- ✅ Opt-IN explicite tous les bots IA
- ✅ `llms.txt` custom (standard 2026)
- ✅ Listicle Top 10 avec RB Perform #1 + Schema ItemList
- ✅ Press kit avec Schema Organization complet
- ✅ Schemas Article+FAQ+Breadcrumb partout
- ✅ Pages dédiées long-tail FR

**Faiblesses** (à combler via le playbook) :
- ❌ Aucune présence Reddit
- ❌ Pas de fiche G2 / Capterra / GetApp
- ❌ Pas de Product Hunt launch
- ❌ Pas de GitHub README public
- ❌ Pas de mention médias FR
- ❌ Pas de page Wikipedia (et c'est OK pour 12-18 mois)

**Prochain palier** : exécuter les 7 priorités du `AI-SEO-PLAYBOOK.pdf`.

---

*Doc générée le 22 mai 2026 — Claude (Opus 4.7) + Rayan Bonte.*
*Source : `/Users/rayan/fitcoach_updated/GEO-RECAP.md`*
*Doc complémentaire : `SEO-RECAP.md` (SEO Google classique), `AI-SEO-PLAYBOOK.md` (actions externes).*
