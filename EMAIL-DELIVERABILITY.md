# Email Deliverability — Checklist leader-grade

Pour assumer leader marché : que **chaque** email RB Perform atterrisse en boîte de réception primaire (pas spam, pas Promotions). Sinon :
- Onboarding cassé (clients ne reçoivent pas leur invite)
- Reset password inutilisable (support inondé)
- Founder checkin → spam = relation client morte

## Domaine émetteur

`rbperform.com` (utilisé par les emails) — différent de `rbperform.app` (le SaaS frontend).

Tous les emails partent depuis :
- `noreply@rbperform.com` (notifications transactionnelles)
- `rb.performancee@gmail.com` (founder direct, fallback Gmail)

À terme, migrer le founder vers `rayan@rbperform.com` pour cohérence brand.

## Checklist DNS

À exécuter dans la console DNS du registrar de `rbperform.com` (Cloudflare / OVH / etc.).

### 1. SPF — Sender Policy Framework

Autorise Resend à envoyer pour `rbperform.com`.

Type : `TXT`
Host : `@`
Value :
```
v=spf1 include:amazonses.com include:_spf.resend.com -all
```

Note : `-all` (hard fail) est strict. Si tu envoies aussi via Gmail (founder), ajouter `include:_spf.google.com` avant `-all`.

Vérification : `dig TXT rbperform.com | grep "v=spf1"`

### 2. DKIM — DomainKeys Identified Mail

Resend génère 3 records CNAME automatiquement quand tu vérifies le domaine dans le dashboard Resend → Domains. Suivre :
1. Aller sur https://resend.com/domains
2. Add Domain → `rbperform.com`
3. Resend affiche 3 records (selector1, selector2, selector3)
4. Ajouter chaque record dans le DNS

Type : `CNAME`
Host : `resend._domainkey` (ou les selectors fournis)
Value : `<selector>.dkim.resend.com`

Vérification : Resend dashboard passe au statut "Verified" (vert).

### 3. DMARC — Domain Message Authentication

Politique de quoi faire si SPF/DKIM échouent. Commencer en monitor-only puis durcir.

#### Phase 1 (semaine 1-2 post-launch) : monitor

Type : `TXT`
Host : `_dmarc`
Value :
```
v=DMARC1; p=none; rua=mailto:rb.performancee@gmail.com; ruf=mailto:rb.performancee@gmail.com; fo=1; adkim=r; aspf=r; pct=100
```

#### Phase 2 (mois 1-2) : quarantine

Une fois les rapports DMARC validés (aucun email légitime échouant) :
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@rbperform.com; pct=25
```

#### Phase 3 (mois 3+) : reject

```
v=DMARC1; p=reject; rua=mailto:dmarc@rbperform.com; pct=100
```

### 4. MTA-STS — Mail Transport Agent Strict Transport Security

Force TLS pour les emails entrants. Bonus deliverability + trust.

Type : `TXT`
Host : `_mta-sts`
Value : `v=STSv1; id=<unix-timestamp>` (ex: `id=20260101000000`)

Plus créer un fichier `.well-known/mta-sts.txt` à `https://mta-sts.rbperform.com/.well-known/mta-sts.txt` :
```
version: STSv1
mode: enforce
mx: feedback-smtp.eu-west-1.amazonses.com
max_age: 604800
```

### 5. TLS-RPT — TLS Reporting

Type : `TXT`
Host : `_smtp._tls`
Value : `v=TLSRPTv1; rua=mailto:tls-reports@rbperform.com`

### 6. BIMI — Brand Indicators (logo dans Gmail mobile)

Trust signal énorme : ton logo s'affiche à côté de chaque email dans Gmail / Yahoo Mail.

Prérequis : DMARC `p=quarantine` ou `p=reject` (Phase 2+).

Type : `TXT`
Host : `default._bimi`
Value : `v=BIMI1; l=https://rbperform.com/bimi-logo.svg; a=https://rbperform.com/bimi-vmc.pem`

Logo : SVG Tiny PS 1.2 (carré, ratio 1:1, max 32KB). Le `a=` (Verified Mark Certificate) est optionnel mais Gmail demande VMC depuis 2024 pour afficher le logo. Coût ~1500€/an chez DigiCert. Skip pour l'instant, faisable post-traction.

## Headers à ajouter aux emails sortants

Dans `api/cron-coach-weekly-digest.js`, `api/cron-founder-checkin.js`, et tout autre endroit qui call Resend :

```js
{
  from: "RB Perform <noreply@rbperform.com>",
  to: [to],
  reply_to: "rb.performancee@gmail.com",  // pour que les replies arrivent au founder
  subject,
  html,
  headers: {
    "List-Unsubscribe": `<https://rbperform.app/unsubscribe?email=${encodeURIComponent(to)}>, <mailto:unsubscribe@rbperform.com?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"  // RFC 8058 — Gmail/Yahoo bouton 1-clic unsubscribe
  }
}
```

Note : Gmail (depuis fév. 2024) **exige** `List-Unsubscribe` + `List-Unsubscribe-Post` pour les bulk senders sinon l'email atterrit en Promotions/spam. C'est non-négociable.

## Vérification automatique

Lancer le script de check :

```bash
node scripts/check-email-deliverability.js rbperform.com
```

Le script ping :
- SPF
- DMARC (avec décodage de la policy)
- DKIM (selectors Resend)
- MTA-STS
- TLS-RPT
- BIMI

Output : ✅ / ⚠️ / ❌ par check + recommandations.

## Test deliverability

Avant chaque release majeure :

1. **mail-tester.com** : envoyer un email transactionnel à l'adresse temporaire fournie. Score >= 9/10 obligatoire.
2. **GlockApps** : tester sur 50+ providers (Gmail, Outlook, Yahoo, Apple Mail, ProtonMail, etc.) — score deliverability >= 95%.
3. **Postmark Spam Check** : analyse de header.

Si score < 9/10, le DNS est probablement à corriger.

## Réponse à un incident deliverability

Symptôme : "Mes clients reçoivent pas l'invite par email."

1. Vérifier statut Resend : https://status.resend.com
2. Vérifier `/api/health?deep=1` côté status.html (Resend apparait dans les checks)
3. Vérifier les Resend logs : Dashboard → Logs → filtrer par `rbperform.com`
4. Si bounce : adresse invalide → marquer dans Supabase `clients.email_invalid = true`
5. Si soft fail : retry après 1h (Resend le fait auto)
6. Si delivered mais pas reçu : très probablement spam → vérifier DKIM/DMARC, baisser le %DMARC quarantine si récent.

## Calendrier suggéré

- **J-7 (avant launch)** : SPF + DKIM verified Resend + DMARC `p=none`
- **J0 (launch)** : monitorer rapports DMARC quotidiens
- **M+1** : DMARC `p=quarantine` à 25%
- **M+2** : DMARC `p=quarantine` à 100%
- **M+3** : DMARC `p=reject`, ajout BIMI (sans VMC d'abord)
- **M+6** : VMC BIMI achete pour afficher le logo dans Gmail
- **M+12** : MTA-STS + TLS-RPT enforce

## Owner

Rayan Bonte — rb.performancee@gmail.com
