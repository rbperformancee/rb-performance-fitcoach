# Plan de Réponse aux Incidents — RB Perform

**Owner** : Rayan Bonte
**Last updated** : 2026-04-29
**RGPD** : Conforme Art. 33 (notification CNIL <72h) + Art. 34 (notification utilisateurs)

---

## 1. Définition d'un incident

**Security Incident** = breach de confidentialité, intégrité ou disponibilité des données personnelles. Inclus :

- Accès non-autorisé aux données (DB, storage, logs)
- Fuite ou divulgation accidentelle (mauvais email, partage public)
- Perte ou destruction de données (corruption DB, suppression accidentelle)
- Disponibilité service > 4h (downtime majeur)
- Compromise compte admin / Supabase / Vercel / Stripe

**Pas un incident** : downtime <30min isolé, bug non-bloquant, scan automatisé sans intrusion réelle.

---

## 2. Phase DÉTECTION

### Sources de détection
| Source | Quoi | Action |
|---|---|---|
| **Sentry** (`https://sentry.io`) | Erreurs runtime React + API | Email auto sur threshold |
| **User report** (rb.performancee@gmail.com avec `[SECURITY]`) | Signalement externe | Réponse <24h |
| **Vercel logs** | Erreurs serverless functions | Check hebdo + sur alerte |
| **Supabase logs** | Erreurs DB / Auth | Check hebdo + sur alerte |
| **Status page** (`/status`) | Healthchecks down | Self-monitoring |
| **Stripe Dashboard** | Activité suspecte payments | Email auto fraud detection |

### Détecté → STOP. Notez l'heure de détection (T0). Le compteur 72h démarre.

---

## 3. Phase ÉVALUATION (T0 → T0+1h)

Répondre aux questions :

| Question | Réponse |
|---|---|
| Quelle data est concernée ? | Emails / mots de passe / data santé / data financière / autre |
| Combien d'utilisateurs affectés ? | 0 / 1-10 / 10-100 / 100+ |
| La data est-elle chiffrée ? | Oui (DB encrypted at rest) / Non |
| Y a-t-il eu exfiltration ? | Confirmé / Probable / Improbable |
| Le service est-il toujours up ? | Oui / Down / Dégradé |
| L'attaquant a-t-il toujours accès ? | Oui (urgent) / Non / Inconnu |

### Classification severity

| Niveau | Critères | Action |
|---|---|---|
| **🔴 P1 Critique** | Breach data confirmé OU service down >2h OU compte admin compromise | Incident ACTIVÉ — go to Phase 4 |
| **🟠 P2 Élevé** | Breach probable, data sensitive, peu d'users | Incident actif, mais notification CNIL conditionnelle |
| **🟡 P3 Moyen** | Bug bloquant, vulnérabilité non-exploitée | Patch sous 7j, pas de notification |
| **🟢 P4 Faible** | Bug mineur, scan automatisé | Patch quand possible |

---

## 4. Phase CONTAINMENT (T0+1h → T0+4h)

### Actions immédiates si P1/P2

**a. Bloquer l'accès attaquant** (si compromise compte) :
```bash
# Reset password Supabase admin
# Via dashboard Supabase → Account → Security → Change password
# Idem Vercel + Stripe + Zoho

# Rotate les keys API
# Vercel : Settings → Environment Variables → regenerate SUPABASE_SERVICE_ROLE_KEY
# Stripe : Dashboard → Developers → API keys → roll the key
# Resend : Dashboard → API keys → revoke + create new
```

**b. Couper les services compromis** :
```bash
# Si la DB est compromise, mettre en mode read-only :
# Supabase Dashboard → Database → Settings → Pause project
# OU rotate la SERVICE_ROLE_KEY dans Vercel pour kill toutes les APIs Vercel
```

**c. Préserver les preuves** :
- Screenshot des logs Sentry, Vercel, Supabase
- Export DB snapshot (point in time avant l'incident)
- Logs Stripe (si payments concernés)
- Save tout dans `~/Documents/RB Perform/Incidents/<DATE>/`

**d. Déterminer le scope exact** :
- Query Supabase : quelles rows accédées ? quelles tables ? quel timestamp ?
- Cross-référencer avec les logs Vercel functions

---

## 5. Phase NOTIFICATION (T0+4h → T0+72h max)

### Notification CNIL (Obligation RGPD Art. 33)

**Si breach confirmé impactant ≥1 user :**
1. Aller sur **https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles**
2. Remplir le formulaire en ligne
3. Délai : **<72h après constatation** (T0)
4. Inclure :
   - Nature de la violation
   - Catégories et nombre approximatif de personnes concernées
   - Catégories et nombre approximatif de données concernées
   - Mesures prises pour remédier
   - Coordonnées du DPO ou contact RGPD : `rb.performancee@gmail.com`
5. Numéro de référence CNIL → save dans dossier incident

**Si breach mineur (impact limité, pas de risque user)** : possibilité de ne pas notifier mais documenter le raisonnement par écrit dans le dossier incident.

### Notification utilisateurs (Obligation RGPD Art. 34)

**Obligatoire si "risque élevé pour les droits et libertés des personnes"** :
- Mots de passe en clair leakés
- Données financières exposées
- Données de santé exposées (notre cas potentiel)
- Possibilité de fraude / usurpation

**Template email aux utilisateurs concernés** :

```
Subject: Information importante sur votre compte RB Perform

Bonjour [Prénom],

Le [DATE], nous avons détecté un incident de sécurité affectant 
[type de données]. Nous vous écrivons en application de l'article 34 
du RGPD pour vous tenir informé.

Ce qui s'est passé :
[Description factuelle, 2-3 phrases]

Données concernées :
[Liste précise]

Ce que nous avons fait :
- [Action de containment 1]
- [Action de containment 2]
- Notification CNIL faite le [DATE], référence [N°]

Ce que vous pouvez faire :
- Changer votre mot de passe RB Perform
- [Autre action recommandée selon nature]
- Surveiller votre compte bancaire si finance concerné

Pour toute question, répondez à cet email.
Toutes nos excuses pour cet incident et la confiance que vous nous accordez.

— Rayan, fondateur RB Perform
```

Envoi via Zoho SMTP (api/cron-coach-weekly-digest.js pattern) ou direct depuis ton inbox.

---

## 6. Phase POST-MORTEM (T0+72h → T0+7j)

Document à remplir dans `~/Documents/RB Perform/Incidents/<DATE>/post-mortem.md` :

```markdown
# Post-mortem incident <DATE>

## Timeline
- T0 (heure exacte) : détection
- T0+Xh : évaluation
- T0+Xh : containment
- T0+Xh : notification CNIL (référence)
- T0+Xh : notification users
- T0+X jours : résolution complète

## Root cause
[Analyse 5-whys du vrai problème, pas le symptôme]

## Impact
- Utilisateurs affectés : N
- Data leaked : type + volume
- Downtime : minutes
- Coût (refunds + heures, etc.) : €

## Actions correctives
1. [Quoi] — owner — deadline
2. [Quoi] — owner — deadline

## Prévention future
[Comment éviter exact ce type d'incident]

## Lessons learned
[Ce qu'on apprend, pas du blame]
```

**Si severity P1 → publier post-mortem public** (sanitisé, sans exposer infos sensibles) sur `/status` ou via newsletter coachs.

---

## 7. Quick reference — Numéros à connaître

| Service | Contact urgence |
|---|---|
| **CNIL (autorité supervisory)** | https://www.cnil.fr — formulaire en ligne |
| **Supabase Support** | https://supabase.com/support (paid plan) ou Discord public |
| **Vercel Support** | https://vercel.com/support |
| **Stripe Support** | https://support.stripe.com (24/7 fraud) |
| **Zoho Support** | https://www.zoho.com/contact.html |
| **Avocat data protection** | [À définir — chercher cabinet spécialisé Avignon/Marseille] |
| **Hébergeur DNS (OVH)** | 1007 (FR support) |

---

## 8. Drill (test annuel)

**Une fois par an minimum** : simulation d'incident pour s'entraîner.
- Choisir un scénario (ex: "Supabase service-role key leakée sur GitHub")
- Dérouler le plan
- Mesurer les temps réels
- Améliorer le plan en conséquence

**Prochain drill suggéré** : 3 mois post-launch (août 2026).

---

## 9. Mises à jour du plan

| Date | Auteur | Changement |
|---|---|---|
| 2026-04-29 | Rayan Bonte | Création initiale |
