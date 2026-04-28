# Registre des activités de traitement (Art. 30 RGPD)

**Responsable de traitement** : Rayan Bonte (Micro-entrepreneur)
**SIRET** : 990 637 803 00018
**Adresse** : 10 Rue Cardinale, 84000 Avignon, France
**Contact RGPD** : `rb.performancee@gmail.com`
**Last updated** : 2026-04-29
**Version** : 1.0

---

## Préambule

Ce registre documente l'ensemble des traitements de données personnelles effectués par RB Perform (SaaS de coaching pour coachs sportifs). Il est tenu en application de l'article 30 du RGPD et disponible sur demande à la CNIL ou aux personnes concernées.

---

## Traitement n°1 — Gestion des comptes Coach

| Champ | Valeur |
|---|---|
| **Finalité** | Permettre aux coachs sportifs de créer un compte, gérer leur profil, branding et clients sur la plateforme RB Perform. |
| **Base légale** | Exécution d'un contrat (Art. 6.1.b RGPD) |
| **Catégories de personnes** | Coachs sportifs (clients payants ou en essai gratuit) |
| **Catégories de données** | Identification : nom, prénom, email, téléphone (optionnel), photo / logo<br>Professionnelles : nom commercial (`brand_name`), SIRET, adresse facturation<br>Techniques : ID Supabase Auth, mots de passe hashés bcrypt, sessions JWT<br>Préférences : accent_color, coaching_name, langue<br>Stripe : ID client Stripe, payment_link |
| **Destinataires** | Sous-traitant Supabase (hébergement DB)<br>Sous-traitant Vercel (hébergement front + edge)<br>Sous-traitant Stripe (paiements)<br>Sous-traitant Zoho (emails transactionnels) |
| **Durée de conservation** | Durée de l'abonnement + 30 jours après suppression du compte. Données de facturation : 10 ans (obligation comptable) |
| **Transferts hors UE** | Non pour les données structurées (Supabase Frankfurt). Stripe : entité US mais conformité PCI-DSS + DPA + SCCs en place. Vercel : entité US mais DPA + SCCs en place. |
| **Mesures de sécurité** | TLS 1.2+ partout, chiffrement at rest AES-256, RLS Postgres, hashing bcrypt mots de passe, sessions JWT à expiration courte. Voir `EMAIL-DELIVERABILITY.md` + `/security` |

---

## Traitement n°2 — Gestion des comptes Client (utilisateurs finaux des coachs)

| Champ | Valeur |
|---|---|
| **Finalité** | Permettre aux clients des coachs de s'inscrire via invitation, suivre leurs programmes, logger leurs séances, communiquer avec leur coach. |
| **Base légale** | Exécution d'un contrat (Art. 6.1.b — contrat tripartite : coach signe avec RB Perform pour fournir le service à ses clients) + Consentement explicite (Art. 9.2.a) pour les données de santé |
| **Catégories de personnes** | Clients des coachs (utilisateurs finaux) |
| **Catégories de données** | Identification : nom, prénom, email<br>Authentification : mot de passe hashé bcrypt<br>**Données de santé (catégorie spéciale Art. 9)** :<br>• Poids corporel (`weight_logs`)<br>• Durée de sommeil (onboarding + daily_tracking)<br>• Activité physique : sessions, RPE, charges (1RM bench/squat/pull-up), reps, volume<br>• Nutrition : macros, allergies, intolérances<br>• Pas par jour, mesures corporelles (tour de taille, etc.)<br>Communication : messages avec coach, voice messages |
| **Destinataires** | Le coach du client (lecture limitée à ses propres clients via RLS Postgres)<br>Sous-traitants : Supabase, Vercel, Zoho, Resend (emails invitation) |
| **Durée de conservation** | Durée de la relation coach-client. Suppression du compte → purge des données sous 30 jours après confirmation |
| **Transferts hors UE** | Non pour les données structurées. Voir Traitement n°1 |
| **Mesures de sécurité** | Idem Traitement n°1. RLS Postgres garantit qu'un coach ne voit pas les clients d'un autre coach. |

---

## Traitement n°3 — Inscription Waitlist (prospects coachs)

| Champ | Valeur |
|---|---|
| **Finalité** | Constituer une liste d'attente de prospects coachs avant le lancement officiel + collecter intel marketing (clients count, plus gros problème, source UTM) |
| **Base légale** | Consentement (Art. 6.1.a) — formulaire `/founding#join` avec opt-in explicite |
| **Catégories de personnes** | Prospects (coachs sportifs intéressés) |
| **Catégories de données** | Identification : prénom, email<br>Profilage marketing : nombre de clients actuels, problème principal, source d'acquisition (utm_source, utm_medium, utm_campaign, utm_content, referrer) |
| **Destinataires** | Aucun tiers. Données stockées chez Supabase. Emails de confirmation/notif via Zoho SMTP. |
| **Durée de conservation** | 24 mois maximum à compter de l'inscription. Désinscription possible à tout moment via lien `List-Unsubscribe` (RFC 8058) sur tout email. |
| **Transferts hors UE** | Non |
| **Mesures de sécurité** | RLS Postgres, chiffrement at rest, rate-limit IP sur l'endpoint `/api/waitlist` (5 tentatives/h) |

---

## Traitement n°4 — Cold outreach prospects (Sentinel)

| Champ | Valeur |
|---|---|
| **Finalité** | Identifier des coachs sportifs sur Instagram (sources publiques) et leur envoyer un email d'introduction commercial. |
| **Base légale** | Intérêt légitime (Art. 6.1.f) — démarche B2B, droit d'opposition garanti dans chaque email |
| **Catégories de personnes** | Coachs sportifs publics sur Instagram (data publiquement accessible) |
| **Catégories de données** | Nom complet (depuis Insta), email professionnel, handle Instagram, nombre de followers, niche, statut envoi |
| **Destinataires** | Aucun tiers. Stockage chez Supabase. Envois via Zoho SMTP. |
| **Durée de conservation** | 12 mois maximum sans interaction. Suppression sur demande email (RGPD Art. 17). |
| **Transferts hors UE** | Non |
| **Mesures de sécurité** | RLS Postgres (table `cold_prospects` — service_role only). Email avec opt-out clair. |

---

## Traitement n°5 — Logs techniques (Sentry, Vercel, Supabase)

| Champ | Valeur |
|---|---|
| **Finalité** | Détecter les erreurs et incidents de sécurité, assurer la disponibilité du service, répondre aux obligations Art. 33 RGPD |
| **Base légale** | Intérêt légitime (Art. 6.1.f) — sécurité du service et de ses utilisateurs |
| **Catégories de personnes** | Tous utilisateurs (coachs + clients) en cas d'erreur les concernant |
| **Catégories de données** | IP de connexion, user agent, ID utilisateur, message d'erreur, stack trace. **Pas de données métier complètes dans les logs.** |
| **Destinataires** | Sentry (logs erreurs), Vercel (logs functions), Supabase (logs auth + DB) |
| **Durée de conservation** | 30 jours (Sentry free tier) à 90 jours selon l'outil |
| **Transferts hors UE** | Sentry : entité US (DPA + SCCs en place via Sentry's standard terms) |
| **Mesures de sécurité** | Pas de données sensibles loggées (IP scrubbing partiel, pas de mots de passe, pas de tokens) |

---

## Traitement n°6 — Notifications et emails transactionnels

| Champ | Valeur |
|---|---|
| **Finalité** | Envoyer aux utilisateurs : confirmation d'inscription, invitation client, welcome après paiement, digest hebdomadaire coach, founder check-in (J+3/14/30) |
| **Base légale** | Exécution du contrat (Art. 6.1.b) pour les transactionnels + Consentement (opt-in implicite via inscription) pour les digests |
| **Catégories de personnes** | Coachs et clients utilisateurs du service |
| **Catégories de données** | Email, prénom, contenu personnalisé (statistiques business pour coach digest) |
| **Destinataires** | Zoho SMTP (envois principal), Resend (envois Edge Function `send-invite` uniquement) |
| **Durée de conservation** | Logs d'envoi : 30 jours dans Zoho. Pas de stockage long-terme du contenu. |
| **Transferts hors UE** | Zoho : entité US/IN (DPA + SCCs en place). Resend : entité US (DPA + SCCs en place). |
| **Mesures de sécurité** | TLS sur SMTP (port 465), DKIM signing (selector zmail Zoho + DKIM Resend), List-Unsubscribe RFC 8058 sur tous les emails non-transactionnels |

---

## Sous-traitants (Liste exhaustive)

| Sous-traitant | Rôle | Localisation | DPA signé | SCCs | Lien |
|---|---|---|---|---|---|
| **Supabase** | Hébergement DB Postgres + Auth + Storage | EU (Frankfurt) — eu-central-1 | ✓ 2026-04-28 | ✓ via DPA Schedule 4 | https://supabase.com/legal/dpa |
| **Vercel** | Hébergement front + edge functions + serverless API | US (multi-region) | ✓ via Terms of Service | ✓ via DPA standard | https://vercel.com/legal/dpa |
| **Stripe** | Traitement paiements | US + IE | ✓ via Terms (auto-accepted) | ✓ | https://stripe.com/legal/dpa |
| **Zoho** | Emails transactionnels (SMTP) | EU (Frankfurt) + US | ✓ via Terms | ✓ | https://www.zoho.com/dpa.html |
| **Resend** | Emails Edge Function `send-invite` (legacy, à migrer post-launch) | US | ✓ via Terms | ✓ | https://resend.com/legal/dpa |
| **Sentry** | Logs d'erreur applicatifs | US (with EU regions opt-in) | ✓ via Terms | ✓ | https://sentry.io/legal/dpa/ |
| **OVH** | Registrar DNS pour `rbperform.app` (et `rbperform.com`) | EU (France) | N/A (registrar uniquement, pas de processing data) | N/A | — |

---

## Droits des personnes concernées

Toute personne concernée peut exercer ses droits RGPD en écrivant à **`rb.performancee@gmail.com`** :

- **Droit d'accès** (Art. 15) : copie des données la concernant
- **Droit de rectification** (Art. 16) : correction de données inexactes
- **Droit à l'effacement** (Art. 17) : suppression du compte et purge des données associées sous 30 jours
- **Droit à la limitation** (Art. 18) : suspension du traitement
- **Droit à la portabilité** (Art. 20) : export des données dans un format structuré (JSON)
- **Droit d'opposition** (Art. 21) : refuser le traitement basé sur intérêt légitime (cold outreach)
- **Retrait du consentement** (Art. 7) : à tout moment, sans conséquence sur la légalité du traitement antérieur

**Délai de réponse** : <30 jours ouvrés.

**Recours** : en cas de difficulté, plainte possible auprès de la CNIL (https://www.cnil.fr).

---

## Mises à jour du registre

Ce registre doit être mis à jour à chaque :
- Ajout d'un nouveau traitement (ex: nouvelle feature)
- Changement de sous-traitant
- Modification significative d'une finalité ou catégorie de données

| Date | Auteur | Changement |
|---|---|---|
| 2026-04-29 | Rayan Bonte | Création initiale (pre-launch) |
