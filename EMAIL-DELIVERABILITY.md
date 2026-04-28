# Email Deliverability — Checklist leader-grade

Pour assumer leader marché : que **chaque** email RB Perform atterrisse en boîte de réception primaire (pas spam, pas Promotions). Sinon :
- Onboarding cassé (clients ne reçoivent pas leur invite)
- Welcome Stripe checkout = mort si en spam
- Founder checkin → spam = relation client morte

## État actuel — `rbperform.app`

Audit via `node scripts/check-email-deliverability.js rbperform.app` :

| Check | Statut | Détails |
|---|---|---|
| SPF | ✅ | `v=spf1 include:zohomail.eu include:_spf.resend.com ~all` |
| DMARC | ✅ Phase 1 | `v=DMARC1; p=none; rua=mailto:rayan@rbperform.app; pct=100` |
| DKIM Zoho | ✅ | `zmail._domainkey.rbperform.app` verified |
| DKIM Resend | ⚠️ N/A | Ne sert que pour Supabase Edge Functions (invitations) |
| MX | ✅ | Zoho EU (mx.zoho.eu, mx2.zoho.eu, mx3.zoho.eu) |
| MTA-STS | ⚠️ Optional | Bonus deliverability — non bloquant |
| TLS-RPT | ⚠️ Optional | Bonus — non bloquant |
| BIMI | ⚠️ Future | Logo dans Gmail mobile — nécessite DMARC quarantine/reject + VMC |

## Architecture emails

### Channel principal — Zoho SMTP

**Pour** : welcome (Stripe checkout), waitlist confirmation, cron founder-checkin, cron weekly-digest, cold outreach.

**Code** : `api/waitlist.js`, `api/send-welcome.js`, `api/cron-coach-weekly-digest.js`, `api/cron-founder-checkin.js`, `api/cron/cold-outreach.js`, `api/webhook-stripe.js`.

**Config** :
- Host : `smtp.zoho.eu:465` (TLS)
- Auth : `ZOHO_SMTP_USER` (default `rayan@rbperform.app`) + `ZOHO_SMTP_PASS` (Zoho app password)
- DKIM : signé par Zoho via selector `zmail`

### Channel secondaire — Resend (Supabase Edge Functions)

**Pour** : invitations clients (`send-invite`).

**Code** : `supabase/functions/send-invite/index.ts`.

**Config** :
- Env : `RESEND_API_KEY` (Supabase Edge Function secret)
- DKIM : signé par Resend si domaine ajouté chez eux (à faire si on migre `send-invite` plus tard)

> **Migration future** : `send-invite` migrer vers Zoho via `denomailer` (lib SMTP Deno-compatible) — voir issue tracker.

## Progressive DMARC rollout

Politique de quoi faire si SPF/DKIM échouent. **Démarrer doux puis durcir.**

### J+0 — Monitor only (en place actuellement)

```
v=DMARC1; p=none; rua=mailto:rayan@rbperform.app; pct=100
```

**Effet** : aucun email rejeté. Tu reçois les rapports XML quotidiens dans `rayan@rbperform.app`.

**À surveiller pendant 7 jours** :
- Aucun email légitime ne fail SPF + DKIM
- Identifier sources non-autorisées (potentiel phishing)

### J+7 — Quarantine 25%

Une fois 7 jours de rapports DMARC validés :

```
v=DMARC1; p=quarantine; rua=mailto:rayan@rbperform.app; pct=25
```

**Effet** : 25% des emails non-conformes vont en spam. Si tu vois des faux positifs, repasse à `p=none` et investigue.

### J+14 — Quarantine 100%

Si pas de faux positif après 7 jours :

```
v=DMARC1; p=quarantine; rua=mailto:rayan@rbperform.app; pct=100
```

### J+30 — Reject

Niveau leader. Tout email non-conforme rejeté avant inbox :

```
v=DMARC1; p=reject; rua=mailto:rayan@rbperform.app; fo=1; adkim=r; aspf=r
```

**Avant de passer à `reject`** : vérifier que TOUS les services qui envoient pour `rbperform.app` ont SPF + DKIM en règle (Zoho ✓, Resend pour `send-invite` à confirmer).

## Headers RFC 8058 — déjà en place

> [!warning] Gmail/Yahoo (depuis fev 2024)
> **Exigent** `List-Unsubscribe` + `List-Unsubscribe-Post` pour les bulk senders. Sans ça → Promotions/spam systématique.

Tous les crons + welcome utilisent :

```js
headers: {
  'List-Unsubscribe': `<https://rbperform.app/unsubscribe?email=...&type=...>, <mailto:unsubscribe@rbperform.app?subject=unsubscribe>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
```

L'endpoint `/api/unsubscribe` (RFC 8058 One-Click) est en prod et persiste les flags `unsub_*` dans `coaches` / `clients` Supabase.

## Bonus optionnels

### MTA-STS

Force TLS pour les emails entrants. Améliore le score deliverability mais non-bloquant.

```
TXT _mta-sts.rbperform.app  "v=STSv1; id=20260428000000Z"
```

Plus créer `https://mta-sts.rbperform.app/.well-known/mta-sts.txt` :
```
version: STSv1
mode: enforce
mx: mx.zoho.eu
mx: mx2.zoho.eu
mx: mx3.zoho.eu
max_age: 604800
```

### TLS-RPT

```
TXT _smtp._tls.rbperform.app  "v=TLSRPTv1; rua=mailto:rayan@rbperform.app"
```

### BIMI (logo dans Gmail mobile)

Prérequis : DMARC `p=quarantine` ou `p=reject` (J+14+).

```
TXT default._bimi.rbperform.app  "v=BIMI1; l=https://rbperform.app/bimi-logo.svg; a=https://rbperform.app/bimi-vmc.pem"
```

Logo : SVG Tiny PS 1.2 (carré, max 32KB). VMC (Verified Mark Certificate) ~1500€/an chez DigiCert — Gmail demande VMC depuis 2024 pour afficher le logo. Skip pré-launch, faisable post-traction.

## Vérification automatique

```bash
node scripts/check-email-deliverability.js rbperform.app
```

Output : ✅ / ⚠️ / ❌ par check + recommendations. Lance avant chaque deploy + chaque semaine pour confirmer rien ne s'est cassé.

## Test deliverability

Avant launch (et au moindre doute) :

1. **mail-tester.com** : envoie un email transactionnel à l'adresse temporaire fournie. Score >= 9/10 obligatoire.
2. **GlockApps** : teste sur 50+ providers (Gmail, Outlook, Yahoo, Apple Mail, ProtonMail). Deliverability >= 95%.

Si score < 9/10 → DNS à corriger. Re-run le script d'audit pour identifier.

## Réponse incident "emails ne partent pas"

Symptôme : "Mes clients ne reçoivent pas l'invite."

1. Vérifier `/api/health?deep=1` → `zoho_smtp` doit être `configured`
2. Vérifier que `ZOHO_SMTP_PASS` est bien set dans Vercel env vars
3. Pour les invitations clients : vérifier `RESEND_API_KEY` dans Supabase Edge Function secrets
4. Si bounce → adresse invalide → marquer dans Supabase `clients.email_invalid = true`
5. Si delivered mais pas reçu → spam : tester sur mail-tester.com, vérifier DKIM/DMARC

## Owner

Rayan Bonte — `rayan@rbperform.app` (canal principal) / `rb.performancee@gmail.com` (fallback).
