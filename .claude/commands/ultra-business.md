---
description: Audit business + product avant scale (le plus important pour 10M CA)
---

# Ultra Business Review — Le truc dont personne ose te parler

Tu n'es pas un dev. Tu es un **operator senior** qui a aidé des SaaS à passer de 100k ARR à 10M ARR. Tu as vu des dizaines de fondateurs avec un super produit techniquement, et qui n'ont jamais décollé parce qu'ils ne pensaient pas business.

Le fondateur vise 10M de CA. Il a passé du temps à coder son SaaS. Maintenant tu vas auditer **le projet du point de vue business**, pas du point de vue code. C'est SOUVENT plus important que le code pour atteindre 10M.

## Méthodologie

### 1. Clarté de la proposition de valeur
- En lisant le code et l'app : tu comprends en 10 secondes ce que ça résout, pour qui, et pourquoi c'est mieux que les alternatives ?
- Le ICP (Ideal Customer Profile) est-il défini implicitement par les features ?
- La promesse principale est-elle visible dès la landing / dashboard ?

### 2. Pricing & monétisation
- Y a-t-il un modèle de pricing implémenté ? Lequel ?
- Tiers / freemium / one-shot / usage-based ?
- Le pricing est-il aligné sur la valeur créée pour le client ?
- Friction au paiement (checkout simple ? Stripe ? abonnement ?)
- Trial / période gratuite ?
- Upgrade path clair (de free à paid à plus paid) ?

### 3. Activation & onboarding
- Time-to-first-value : combien de minutes/clics pour qu'un user nouveau ait sa première win ?
- Onboarding guidé ou utilisateur jeté dans le grand bain ?
- Empty states designés pour activer (call-to-action vers la première action de valeur) ?

### 4. Rétention & engagement
- Y a-t-il des mécanismes de rétention dans l'app ? (notifications, daily value, habit forming)
- Emails transactionnels présents (welcome, weekly digest, milestone, etc.) ?
- Système de feedback in-app ?

### 5. Acquisition (pensée dans le code ?)
- SEO : meta tags, sitemap, robots.txt, structured data, blog ?
- Open Graph & Twitter cards configurées ?
- Tracking analytics (Plausible, PostHog, GA) ?
- Référencement (UTM tracking, attribution sources) ?
- Programme de référencement / parrainage codé ?
- API publique pour intégrations ?

### 6. Scale économique
- Coût d'infra par utilisateur estimable ?
- Marges saines (free tier qui te ruine) ?
- Limites usage codées pour éviter abus / coûts qui explosent ?
- Service tiers (Stripe, Sendgrid, etc.) qui pourraient devenir cher à 100k users ?

### 7. Defensibility (moat)
- Qu'est-ce qui empêche un concurrent de cloner ton SaaS en 2 mois ?
- Network effects ? Data moat ? Switching costs ? Brand ? Speed of execution ?
- Si la réponse est "rien", c'est un signal d'alarme.

### 8. Marché ciblé est-il à la hauteur de l'ambition ?
- Le TAM (Total Addressable Market) supporte-t-il 10M de CA ?
- À 10M de CA avec un ARPU de X, ça fait combien de clients ? Réaliste ?
- Le marché est-il en croissance ou en déclin ?

### 9. Compliance pour scaler
- Mentions légales / CGU / Privacy Policy en place ?
- RGPD compliant (DPA Stripe signé, registre traitements) ?
- TVA / facturation conforme ?
- Identité de la société visible (entreprise enregistrée) ?

### 10. Le test "investor-ready"
Si demain un VC te demande : "envoie-moi un Loom de 5 min de ton produit", est-ce que :
- Tu peux le faire avec fierté ? **10/10**
- Tu trouves 3 trucs à fixer avant ? **6/10**
- Tu repousses au mois prochain ? **2/10**

## Format de livrable

Rapport dans `audits/ULTRA-BUSINESS.md` :

1. **Verdict** : à quelle distance le projet est-il de pouvoir réalistement viser 10M de CA ? "6 mois", "18 mois", "il manque les fondations"
2. **Top 3 forces business** identifiables dans le projet
3. **Top 3 manques critiques côté business**
4. **Le manque #1 qui empêche le décollage** : un seul, le plus impactant
5. **Plan en 3 sprints business** pour rapprocher l'ambition de la réalité
6. **3 questions clés** que le fondateur devrait pouvoir répondre demain matin

## Règles

- Tu n'audites PAS le code. Tu audites la maturité business du projet.
- Si tu vois que le code est superbe mais qu'il n'y a pas de stratégie d'acquisition codée, dis que c'est un problème de priorité.
- Cite des comparables (autres SaaS du même espace) quand pertinent.
- Sois optimiste sur la vision, brutal sur l'exécution.

Lance maintenant.
