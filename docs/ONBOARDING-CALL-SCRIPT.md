# Onboarding Call 1:1 — Script Founder

**Durée cible :** 20 minutes · 25 max.
**Objectif :** le coach ressort avec son branding configuré, son premier client importé, et la PWA installée sur son iPhone. Pas plus, pas moins.

---

## Avant l'appel (T−5 min)

1. Ouvre Supabase → table `coaches`, vérifie que `stripe_customer_id`, `plan=founding`, `locked_price=199` sont bien remplis pour ce coach
2. Ouvre son profil Instagram pour avoir son univers en tête (ton, audience, spécialité)
3. Ouvre rbperform.app/status (montre la rigueur, au cas où)

---

## Minute 0-2 — Accueil chaleureux + vérification tech

- « Tu m'entends bien ? Vidéo ok pour toi ? »
- « Tu es sur iPhone ou Android ? » → prépare-toi à le guider sur sa plateforme
- « L'app est déjà sur ton écran d'accueil, ou on l'installe ensemble ? »
  - Si non → **garde 2 min à la fin** pour l'installation en direct

---

## Minute 2-5 — Poser le cadre business (pas la tech)

Pose 3 questions courtes, écoute sans proposer :

1. **« Combien de clients tu coaches en ce moment ? »** — note le chiffre
2. **« Quel est ton plus gros caillou dans la chaussure actuellement ? »** (churn / visibilité / admin / outils éparpillés)
3. **« Dans 6 mois, tu voudrais être où en nombre de clients ? »** — note l'écart

> Ces 3 réponses te donnent :
> - le ton du reste de l'appel (rassurer vs pousser)
> - le contenu de son dashboard MRR prévisionnel
> - l'angle pour le futur témoignage J+30

---

## Minute 5-10 — Configuration branding (en direct, écran partagé)

Ensemble, pas à sa place :

- Dashboard → **Mon compte** → onglet Profil → nom complet, ville, téléphone
- **Facturation** → SIRET, raison sociale (s'il veut des factures propres)
- **Settings** → branding : logo, couleur principale, slug custom
  - Si pas de logo prêt, utilise ses initiales en fallback
- **Plans coaching** → il crée son 1er plan vendu (ex : "Pack 3 mois 220€")

---

## Minute 10-15 — Import premier client

- Dashboard → **Clients** → Inviter
- Il saisit : prénom, email, plan coaching, date début, date fin
- RB Perform génère un code à 6 chiffres + un lien
- **Il envoie le lien à son client depuis son téléphone pendant l'appel** (ou te le dicte, tu le notes)
- Dès que le client utilise le code : célèbre ensemble, la connexion est visible dans le dashboard

Si le client n'est pas dispo dans la minute → **demande au coach un "client test"** (son cousin, un ami) pour qu'il voie le flow s'animer.

---

## Minute 15-18 — PWA install

Si pas déjà fait :

- **iPhone** : Safari → rbperform.app/login → bouton Partager (carré avec flèche) → "Sur l'écran d'accueil" → Ajouter
- **Android** : Chrome → rbperform.app/login → menu ⋮ → "Installer l'application"

Fais-le lui faire LUI, pas toi. Il doit savoir refaire.

Ensuite : **demande-lui d'ouvrir l'app depuis l'écran d'accueil** (pas le navigateur). Montre-lui qu'elle s'ouvre en plein écran, sans barre d'URL — comme une app native.

---

## Minute 18-20 — Débrief + 3 promesses

### Dis ces 3 trucs explicitement :

1. **« Mon WhatsApp : [ton numéro]. Tu m'écris quand tu veux pendant les 90 prochains jours. Pas la peine de passer par le support — message direct. »**
2. **« À J+3 tu recevras un email de check-in, à J+14 un sondage sur ta feature la plus demandée, à J+30 une proposition de partenariat. Tous par mail — pas de spam. »**
3. **« Ton prix est figé. Même si je monte à 499€ l'année prochaine, tu restes à 199€. C'est écrit noir sur blanc dans les CGV (`/legal.html#cgu-founder`). »**

### Questions de sortie :

- « Sur une échelle 1-10, quelle est la probabilité que tu recommandes RB Perform à un autre coach cette semaine ? » — NPS précoce
- « Qu'est-ce qu'il te manque maintenant pour passer à 10/10 ? » — roadmap input

### Fin :

- « Je raccroche, je t'envoie un récap par mail avec les 3 liens : dashboard, app installée, numéro WhatsApp. »
- Dans les 5 min après le call, envoie le récap mail.

---

## Après l'appel (T+5 min)

1. Note dans ton CRM (ou Obsidian) :
   - Leurs 3 réponses initiales (nb clients, caillou, objectif)
   - NPS 1-10
   - Feature demandée
2. Ajoute son numéro WhatsApp à un groupe "Founders RB Perform" (si >1 Founder)
3. Envoie le récap mail avec :
   - Lien dashboard direct
   - Rappel des 3 promesses
   - Ton WhatsApp
4. Mets un rappel calendrier à J+3 pour check manuel rapide (« ça tourne ? »)

---

## Red flags pendant l'appel

| Signal | Action |
|---|---|
| Il ne pose aucune question | Tu as trop parlé. Pose une question ouverte : « Qu'est-ce qui n'est pas clair ? » |
| Il ne bouge pas sur le partage d'écran | Il subit. Arrête la config tech, recentre sur ses objectifs. |
| Il mentionne un autre outil qu'il paie | **Note-le**. C'est ton benchmark concurrence. |
| Il veut parler tarif en fin d'appel | Il réfléchit à arrêter. Écoute 100%, ne défends pas. Propose une pause 7j sans facturation si besoin. |

---

## Ce que tu ne fais PAS pendant ce call

- ❌ Décrire toutes les features. Il les découvrira seul.
- ❌ Parler de la roadmap. Trop tôt.
- ❌ Vendre un up-sell.
- ❌ Promettre une feature pas encore buildée (il retiendra).

---

**Version :** 1.0 — 2026-04-25
**Prochaine revue :** après les 3 premiers onboarding Founder (retours tests).
