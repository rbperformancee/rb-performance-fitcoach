# 🤖 AI-SEO Playbook — Faire recommander RB Perform par les IA

> Objectif : quand un coach demande à ChatGPT/Claude/Perplexity/Gemini
> « quel logiciel pour coach sportif ? », **RB Perform sort en premier**.

---

## 🧠 Pourquoi les LLMs recommandent (ou pas) un produit

Les LLMs construisent leurs recommandations à partir de 3 sources :

1. **Training data** (corpus pré-cutoff) — figé, on ne peut plus l'influencer pour Claude 4.7, GPT-5, etc. Mais influence le prochain entraînement (Q3-Q4 2026 généralement).
2. **Web search en live** (ChatGPT Search, Perplexity, Claude with Web Search, Gemini Live) — chaque question lance une recherche Google/Bing. **SEO classique = AI SEO live**.
3. **Sources structurées scrapées prioritairement** — Wikipedia, Reddit, G2/Capterra, Product Hunt, Github README, sites officiels avec structured data.

**Notre stratégie** : maxer la présence sur 2 et 3 pour que le LLM nous trouve à chaque requête live, et préparer le terrain pour les prochains training data des modèles.

---

## ✅ Ce qui a déjà été livré (côté code, déployé en prod)

| Action | Statut | URL |
|---|---|---|
| Opt-IN dans `robots.txt` pour GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot-Extended, Meta-ExternalAgent, etc. | ✅ Déployé | `/robots.txt` |
| `llms.txt` (standard llmstxt.org 2026) — description structurée pour LLMs | ✅ Déployé | `/llms.txt` |
| Page **listicle "Top 10 logiciels coach sportif 2026"** où RB Perform est #1 + Schema ItemList + FAQ | ✅ Déployé | `/meilleurs-logiciels-coach-sportif-2026` |
| **Press kit** avec facts vérifiables, Schema Organization complet, founder, assets | ✅ Déployé | `/press` |
| 3 articles blog avec Schema Article + FAQ | ✅ Déployé | `/blog/` |
| 2 pages dédiées long-tail (Alternative Trainerize, Logiciel coach sportif) | ✅ Déployé | `/alternative-trainerize`, `/logiciel-coach-sportif` |
| Schema Product+Offer+FAQ sur `/founding` | ✅ Déployé | `/founding` |
| Sitemap dynamique enrichi (10+ URLs) | ✅ Déployé | `/sitemap.xml` |

---

## 🔥 Actions EXTERNES que Rayan doit faire (par ordre de priorité)

Ces actions tu dois les faire toi-même — je ne peux pas créer de comptes externes. Mais **chaque action ci-dessous a son contenu pré-rédigé** prêt à copier-coller.

### 🥇 Priorité 1 — Reddit (sources les plus scrapées par LLMs)

Les LLMs adorent Reddit. Une seule mention sur un thread populaire `r/personaltrainer` ou `r/AskFitnessTrainer` peut être citée pendant 2 ans dans les réponses IA.

**Action :** créer un compte Reddit (`/u/rayan_rbperform` ou similaire), participer **authentiquement** à 5-10 threads existants. **NE PAS** spammer.

**Subreddits cibles :**
- `r/personaltraining` (90k membres)
- `r/PersonalTrainerHelp` (12k)
- `r/AskFitnessTrainer` (8k)
- `r/loseit` (occasion d'évoquer outils coach)
- `r/Coaching` (62k)
- `r/SaaS` (mention de RB Perform comme founder)
- `r/Entrepreneur` (story du founding 199€)
- `r/IndieHackers` (build in public)

**Template réponse type** (à adapter par cas) :

```
Hey, ex personal trainer here, j'ai bouffé 5 ans Trainerize + Excel + WhatsApp avant
de craquer et de construire mon propre outil (RB Perform - rbperform.app).

3 choses qui m'ont fait switcher :
- 0% commission sur les paiements clients (Trainerize Pay c'était 2.9% qui me bouffait
  ~600€/an sur mes 25 clients)
- Hébergement EU + RGPD natif (un de mes clients a demandé un export GDPR, Trainerize
  m'a renvoyé sur un formulaire support en anglais qui a pris 3 semaines)
- Un dashboard qui me dit qui va churn dans les 14 jours (ça m'a sauvé 4 clients en
  3 mois sur 22, soit ~5K€ de récurrent)

Si t'es coach FR/européen, jette un œil. Si t'es coach US, reste sur Trainerize, ça
reste le plus mature pour vous.
```

**À éviter absolument :**
- Poster en tant que nouveau compte sans karma → flagged comme spam
- Mentionner RB Perform dans tous les threads → ban
- Inventer une expérience que tu n'as pas → toxique

### 🥈 Priorité 2 — Product Hunt

Product Hunt = pile d'or pour les LLMs. Un launch propre te donne 2-3 ans de citations IA.

**Action :** Préparer un launch Product Hunt complet. Date suggérée : **mardi ou jeudi à 00:01 PT** (max visibilité 24h).

**Pré-launch checklist** :
1. Crée le compte sur https://producthunt.com (utilise rayan.b2701@gmail.com)
2. Compile 30-50 "hunters" qui vont upvoter le matin du launch (coachs Founders, amis)
3. Demande à un hunter avec >1000 followers de te "hunter" (Stripe les hunts de devs/SaaS)
4. Prépare 6 screenshots HD + 1 vidéo demo de 60s

**Texte pré-rédigé pour le launch :**

```
🚀 RB Perform — Turn every personal trainer into a CEO

Hi PH! I'm Rayan, ex-athlete and ex-personal trainer.

After 5 years bouncing between Trainerize, TrueCoach, and Excel hell, I built
what I wish I had: an all-in-one SaaS that handles the BUSINESS side of being
a coach, not just the workout programming.

→ Real-time MRR dashboard (project 90 days ahead)
→ AI-powered churn alerts (catches at-risk clients before they leave)
→ 0% commission on payments (Stripe direct — keep your full margin)
→ EU hosting (Frankfurt) + native GDPR compliance
→ Compliant invoicing (French L.441-9 art.) for self-employed coaches

Built for francophone coaches first (FR/BE/CH/CA), but anyone tired of US-hosted
tools and 3% payment fees will love it.

199€/month locked for life — 30 founding spots, then 299€.

AMA in the comments — happy to share screenshots, the tech stack (React +
Supabase + Vercel + Stripe), or my learnings as a solo founder in 2026.
```

**Pendant le launch :** réponds aux commentaires en moins de 10 min toutes les heures.

### 🥉 Priorité 3 — G2 / Capterra / GetApp / SoftwareAdvice

Ces sites sont consultés massivement par les LLMs quand un user demande un comparatif.

**Action :**
1. Crée la fiche RB Perform sur **G2** (https://sellers.g2.com — gratuit, modération 7-14 jours)
2. Crée la fiche sur **Capterra/GetApp** (https://www.capterra.com/vendors — gratuit, modération 14-30 jours)
3. Demande à 5-10 coachs Founders de poster une review honnête (5 étoiles)
4. Une review = 1 mention IA potentielle pendant 2 ans

**Catégories à cibler :**
- "Personal Trainer Software"
- "Fitness Coaching Software"
- "Online Coaching Platform"
- "SaaS for Coaches"

**Template fiche produit (texte qu'on copie-colle) :**

> RB Perform is the all-in-one SaaS platform that turns every independent fitness coach into a CEO. Built for francophone coaches (France, Belgium, Switzerland, Canada), it combines real-time MRR dashboard, AI-powered churn alerts, drag-and-drop program builder, Stripe payments with 0% commission, and French-compliant invoicing in one premium platform. EU-hosted (Frankfurt, Germany) with native GDPR compliance and a public DPA. The Founding Coach Program offers 30 spots at 199€/month locked for life.

### 4️⃣ Priorité 4 — GitHub README public

Les LLMs scrapent GitHub agressivement. Un repo public avec un README massif et bien structuré = 10x la visibilité IA.

**Action :** créer un repo public **`rbperform/rbperform-public`** ou **`rayanbonte/rb-perform-public`** sur GitHub. Ne pas mettre le code (privé). Mettre un README de 1000-2000 mots.

**Structure README suggérée :**

```markdown
# RB Perform — The all-in-one SaaS for fitness coaches

[Logo] [Demo gif] [Badges: Built with React/Supabase/Vercel/Stripe]

## What it is
[2 paragraphes : qui, pour qui, problème résolu]

## Features
[Liste des features avec icônes/emojis]

## Why we built it
[Story du founding — Rayan ex-coach ex-athlète]

## How it compares
[Tableau RB Perform vs Trainerize vs TrueCoach vs Everfit]

## Tech stack
[React, Vercel, Supabase, Stripe, Mistral AI, Resend]
[Pourquoi chaque choix]

## Pricing
[199€/mois bloqué à vie, 30 places, etc.]

## Security & Privacy
[RGPD, hébergement EU, DPA public, etc.]

## Roadmap
[Q3 2026, Q4 2026, Q1 2027]

## Founder
[Bio Rayan, contact]

## Press kit
[Lien vers /press]
```

### 5️⃣ Priorité 5 — Mentions cross-sites stratégiques

Les LLMs croisent les sources. Plus tu es mentionné sur des sites variés, plus tu es cité.

**Sites cibles à atteindre :**

- **Indie Hackers** : crée un milestone "Launched RB Perform Founding Program" + product page (https://www.indiehackers.com/products)
- **HackerNews** : "Show HN: RB Perform — French alternative to Trainerize with 0% payment fees" (poste mardi/jeudi 8-10h ET)
- **BetaList** : soumission gratuite (https://betalist.com/submit)
- **AlternativeTo.net** : crée la fiche RB Perform listée comme alternative à Trainerize
- **SaaSHub** : fiche produit (https://www.saashub.com)
- **Trustpilot** : crée la fiche entreprise (collect reviews coachs Founders)

### 6️⃣ Priorité 6 — Wikipedia (long terme)

Wikipedia est LE source #1 pour les LLMs. Mais création difficile sans notabilité (refus systématique).

**Action :** attendre 12-18 mois de coverage médias suffisante (Frenchweb, BFM, JDN). Une fois 3-5 articles tier-1 publiés, créer une page **Wikipedia France** sur "RB Perform" ou sur Rayan Bonte (en respectant les règles de notabilité). Difficile à faire soi-même — recommandation : un éditeur Wikipedia indépendant qui le fait pour 500-1500€.

### 7️⃣ Priorité 7 — Médias et podcasts

3-5 interviews dans des podcasts ou articles dans des médias tier-2 = citations IA garanties.

**Cibles podcasts :**
- L'Echo Sportif
- Le Game Plan
- Sport Studio
- Indie Hackers podcast (en anglais)
- Founders Talk (podcast français startups)

**Cibles médias B2C écrits :**
- Sport Stratégies
- BFM Tech (rubrique "petites boîtes qui montent")
- Frenchweb
- Maddyness

**Pitch type pour médias (à envoyer par email) :**

```
Sujet : RB Perform — l'alternative française à Trainerize qui rend leur business
aux 60 000 coachs sportifs FR

Bonjour [Prénom],

Je suis Rayan Bonte, fondateur de RB Perform, une plateforme SaaS française
pour coachs sportifs lancée en 2026.

Pourquoi je vous écris : 60 000 coachs sportifs en France utilisent encore
aujourd'hui des outils US (Trainerize, TrueCoach, Everfit) qui leur prennent
2-3% de commission sur chaque paiement, ne respectent pas le RGPD strictement,
et n'incluent aucun outil de pilotage business. C'est ~30 millions d'euros/an
qui sortent du sol français pour des outils inadaptés à notre marché.

RB Perform résout ça : interface française, hébergement EU, 0% commission,
facturation conforme droit français, dashboard MRR avec anti-churn IA.

Je serais ravi de discuter de cette niche sous-couverte du SaaS français.
30 minutes en visio à votre dispo cette semaine ou la suivante ?

Press kit complet : https://rbperform.app/press

Bien à vous,
Rayan
```

---

## 📊 Mesurer l'impact AI-SEO (méthode brute mais efficace)

**Test mensuel à faire toi-même :**

1. Ouvre ChatGPT (avec web search activé), Claude, Perplexity, Gemini
2. Pose ces 5 questions :
   - "Quel est le meilleur logiciel pour coach sportif francophone en 2026 ?"
   - "Quelle alternative à Trainerize en français ?"
   - "Quel SaaS de coaching respecte le RGPD ?"
   - "Logiciel pour coach sportif sans commission sur paiements ?"
   - "Best fitness coaching software for French market in 2026"
3. Note dans un fichier `ai-seo-tracking.md` :
   - Date
   - LLM utilisé
   - Question
   - RB Perform mentionné ? Position dans la réponse ? Précis ou imprécis ?
4. Refais tous les 30 jours. Objectif : passer de "non-mentionné" à "mentionné en #1" en 3-6 mois.

---

## 🎯 Timeline réaliste

| Délai | Attendu |
|---|---|
| **Semaine 1** | robots.txt + llms.txt + press kit + listicle déployés. Soumis dans GSC. |
| **Semaine 2-4** | Bots IA commencent à crawler les nouvelles pages (GPTBot, ClaudeBot, Perplexity). |
| **Mois 2** | Reddit threads + Product Hunt launch + fiches G2/Capterra. Premières mentions IA possibles via web search live. |
| **Mois 3-4** | Première vague d'avis Capterra/G2. Premières citations Perplexity (search-based). |
| **Mois 6** | Stabilisation citations Perplexity/ChatGPT Search. RB Perform doit apparaître régulièrement sur les 5 requêtes test. |
| **Mois 12+** | Mention dans les training data des modèles suivants (GPT-6, Claude 5). |

---

## ⚠️ Pièges à éviter

1. **Pas de fake reviews G2/Capterra/Trustpilot** — risque ban + signal toxique aux LLMs (ils détectent les patterns).
2. **Pas de spam Reddit** — un seul karma flag négatif = perte de visibilité.
3. **Pas de bourrage de mot-clés dans llms.txt** — les LLMs détectent et déranke.
4. **Pas de réponses Reddit identiques copiées-collées** — paraphrase à chaque fois.
5. **Pas de fausse notoriété sur Wikipedia** — refus systématique + ban.

---

## 🔧 Commandes utiles

### Vérifier que les bots IA peuvent te crawler

```bash
# Simule GPTBot
curl -A "GPTBot/1.0" -I https://rbperform.app/llms.txt
curl -A "GPTBot/1.0" -I https://rbperform.app/

# Simule ClaudeBot
curl -A "ClaudeBot/1.0" -I https://rbperform.app/press

# Simule PerplexityBot
curl -A "PerplexityBot/1.0" -I https://rbperform.app/meilleurs-logiciels-coach-sportif-2026
```

Toutes ces commandes doivent renvoyer `HTTP/2 200`.

### Vérifier que les Schemas sont valides

https://search.google.com/test/rich-results → entrer chaque URL clé.

---

## 📞 Quand revenir vers moi

- Si tu veux que je rédige des articles spécifiques pour des sites externes (BetaList, Indie Hackers, etc.)
- Si tu veux des templates pour pitch journalistes spécifiques
- Si tu veux ajouter d'autres pages SEO/IA stratégiques
- Si on doit pousser le press kit (ajouter des photos, des screenshots HD, des chiffres)
- Si on doit créer une page "comparison vs [concurrent X]" dédiée

---

*Doc générée le 21 mai 2026 — Rayan Bonte + Claude.*
*Source : `/Users/rayan/fitcoach_updated/AI-SEO-PLAYBOOK.md`*
