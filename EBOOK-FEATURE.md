# Feature : Ebook self-serve athlète (PDF + accès app 100j)

Documentation opérationnelle du flow `achat ebook` → `provisioning compte athlète` →
`accès 100 jours à l'app RB Perform`.

> **TL;DR** : un acheteur de `ebook-athlete-60` sur rbperform.com reçoit le PDF + un email
> avec un bouton "Accéder à mon espace" qui le logge sur rbperform.app. L'app lui est offerte
> 100 jours (à partir du jour où **il** clique sur "Démarrer"). Seuls les 30 premiers acheteurs
> ont droit à l'accès app : au-delà, le PDF reste envoyé + email waitlist wave 2.

---

## Architecture (2 repos)

```
┌────────────────────────────────────┐                ┌──────────────────────────────────┐
│ ~/rbperform (rbperform.com)        │                │ ~/fitcoach_updated (rbperform.app)│
│ Next.js 16                          │                │ React CRA + Vercel api/*          │
│                                    │                │                                  │
│ /api/webhooks/stripe (POST)        │   X-Internal   │ /api/internal/ebook-grant-access │
│  └─ checkout.session.completed     │ ─────Secret───▶│  ├─ idempotence stripe_session_id│
│      └─ programmeId.startsWith(    │                │  ├─ compteur 30 places            │
│           'ebook-athlete')          │                │  ├─ check coach existant          │
│         └─ grantAppAccess()        │ ◀───{granted,──│  ├─ auth.users + clients          │
│         └─ sendEbookEmail()        │   places_left} │  │   (status=pending_start)       │
│             (PDF + variant)        │                │  └─ programmes (dup template)     │
└────────────────────────────────────┘                └──────────────────────────────────┘
```

Le SaaS (`fitcoach_updated`) est la **source de vérité** pour :
- L'idempotence (table `ebook_purchases.stripe_session_id` PK)
- Le compteur 30 (SELECT count WHERE app_access_granted=true)
- L'état du compte athlète (clients + auth.users + programmes)

`rbperform.com` est uniquement l'**émetteur du paiement** et l'**émetteur de l'email**.

---

## Étapes ordonnées (statut)

| # | Étape                                                        | Repo               | Statut |
|---|--------------------------------------------------------------|--------------------|--------|
| 1 | Coach virtuel + template HTML placeholder                    | fitcoach_updated   | ✅     |
| 2 | Table `ebook_purchases` (idempotence + compteur)             | fitcoach_updated   | ⏳ DDL — voir ci-dessous |
| 3 | Endpoint `/api/internal/ebook-grant-access`                  | fitcoach_updated   | ✅     |
| 4 | Helper `isInternalAuthorized` dans `_security.js`            | fitcoach_updated   | ✅     |
| 5 | Login pre-fill + écran "Démarrer 100j"                       | fitcoach_updated   | ✅     |
| 6 | Webhook rbperform.com : branch `ebook-athlete-60`            | rbperform          | ✅     |
| 7 | Email `sendEbookEmail` (2 variants : granted/waitlist)       | rbperform          | ✅     |
| 8 | Tests E2E mode Stripe test                                   | both               | ✅ doc + script |
| 9 | Déploiement prod + monitoring                                | both               | À faire |

---

## ⚠️ Avant de déployer — checklist obligatoire

### A. Migration 107 (`ebook_purchases`) à appliquer

Le script `scripts/setup-ebook-virtual-coach.mjs` a déjà créé le coach virtuel + template
via PostgREST. Mais la table `ebook_purchases` nécessite du **DDL** → SQL Editor Supabase :

1. Ouvre [supabase.com/dashboard](https://supabase.com/dashboard) → projet → **SQL Editor**
2. Colle le contenu de `supabase/migrations/107_ebook_purchases.sql` → **Run**
3. Vérifie : `node scripts/apply-ebook-migration-107.mjs` → doit dire "✅ EXISTE"

### B. Stripe product à créer (rbperform.com)

> ⚠️ Le code attend `metadata.programmeId === "ebook-athlete-60"` (commence par `ebook-athlete-`).

**Procédure Stripe Dashboard** :

1. **TEST mode** d'abord : [dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)
2. **+ Create product** :
   - Name : `Ebook Athlète 60J`
   - Price : à toi de définir (suggestion : 27€/39€/47€)
   - Type : One-time
3. **Récupère le `price_id`** (format `price_xxx`)
4. **Côté front rbperform.com** : ajoute un bouton qui POST sur `/api/checkout` avec :
   ```json
   { "programmeId": "ebook-athlete-60",
     "programmeName": "Ebook Athlète 60J",
     "price": 27 }
   ```
5. **Reproduis en LIVE** mode quand prêt à vendre.

### C. PDF placeholder à remplacer

Le fichier `~/rbperform/public/pdfs/ebook-athlete-60.pdf` doit exister.
Tant qu'il n'existe pas, l'email partira sans pièce jointe (warning dans les logs).

Quand tu as le vrai PDF : `cp /chemin/ton-ebook.pdf ~/rbperform/public/pdfs/ebook-athlete-60.pdf`
puis redéploie rbperform.

### D. Template HTML programme à remplacer

Le template `eb000000-0000-4000-8000-000000000002` contient un HTML minimaliste
("Programme à compléter"). Pour le remplacer par le vrai programme 100J :

Option 1 — via script (à venir, pas encore écrit) :
```bash
node scripts/update-ebook-template.mjs /chemin/vers/programme.html
```

Option 2 — manuel via Supabase Dashboard :
```sql
UPDATE coach_programme_templates
SET html_content = '<...>', updated_at = now()
WHERE id = 'eb000000-0000-4000-8000-000000000002';
```

---

## Env vars à provisionner

### `~/fitcoach_updated` (Vercel project rbperform.app)

```bash
INTERNAL_API_SECRET=<32+ chars random, ex: openssl rand -hex 32>
EBOOK_VIRTUAL_COACH_ID=eb000000-0000-4000-8000-000000000001
EBOOK_TEMPLATE_ID=eb000000-0000-4000-8000-000000000002
```

### `~/rbperform` (Vercel project rbperform.com)

```bash
INTERNAL_API_SECRET=<MÊME valeur que ci-dessus>
SAAS_API_URL=https://rbperform.app
SAAS_APP_URL=https://rbperform.app    # pour /login?email=...&source=ebook dans l'email
```

> ⚠️ `INTERNAL_API_SECRET` **doit être identique** sur les 2 projets sinon 401.

---

## Tests E2E

### Test rapide local (endpoint seul)

```bash
# Démarre dev server (vercel dev)
cd ~/fitcoach_updated && vercel dev

# Dans un autre terminal :
node scripts/test-ebook-grant.mjs
```

Le script teste :
- Auth (401 sans/mauvais secret)
- Validation body (400 sur champs manquants)
- Happy path (granted + client + programme créés)
- Idempotence (replay même session_id → pas de doublon client)
- Coach collision (email coach existant → granted=false)

Cleanup automatique après tests.

### Test full E2E via Stripe CLI (mode test)

```bash
cd ~/rbperform
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Dans un autre terminal — simule un achat
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.programmeId=ebook-athlete-60 \
  --add checkout_session:metadata.programmeName="Ebook Athlète 60J" \
  --add checkout_session:customer_email=test-e2e@example.com
```

Vérifie ensuite côté SaaS :
```sql
SELECT * FROM ebook_purchases ORDER BY created_at DESC LIMIT 5;
SELECT * FROM clients WHERE coach_id = 'eb000000-0000-4000-8000-000000000001' ORDER BY created_at DESC LIMIT 5;
```

### Test compteur 30 (mock 29 places prises)

```sql
-- À jouer en SQL Editor pour simuler 29 places prises
INSERT INTO ebook_purchases (stripe_session_id, email, app_access_granted, granted_at)
SELECT 'cs_mock_' || g, 'mock' || g || '@test.com', true, now()
FROM generate_series(1, 29) g;

-- Maintenant le 30e achat doit retourner granted=true (place 30)
-- Le 31e doit retourner granted=false + reason=waitlist_wave2

-- Cleanup
DELETE FROM ebook_purchases WHERE stripe_session_id LIKE 'cs_mock_%';
```

---

## Flow client (UX complet)

1. **Achat sur rbperform.com** → checkout Stripe → paiement
2. **Webhook Stripe** → grantAppAccess() → sendEbookEmail()
3. **Email reçu** (variant A si granted) :
   - PDF en pièce jointe
   - Gros bouton **"Accéder à mon espace →"**
4. **Clic bouton** → `rbperform.app/login?email=client@x.com&source=ebook`
5. **LoginScreen** :
   - Bannière "Ebook Athlète · 100j"
   - Email pré-rempli + signInWithOtp() auto-déclenché
   - Client reçoit code 6 chiffres par email Supabase
6. **Code entré** → JWT → redirection `/app.html`
7. **App.jsx** détecte `client.subscription_status === 'pending_start'`
8. **EbookStartScreen** s'affiche : "Bienvenue [Prénom]. Démarre quand tu es prêt."
9. **Clic "Démarrer mes 100 jours"** → confirmation → UPDATE clients :
   - `subscription_status='active'`
   - `subscription_start_date=now()`
   - `subscription_end_date=now() + 100j`
10. **TrainingPage** s'affiche normalement avec le programme dupliqué du template.

---

## Schéma DB

### `ebook_purchases` (migration 107)
```sql
stripe_session_id   text PRIMARY KEY,
email               text NOT NULL,
client_id           uuid REFERENCES clients(id) ON DELETE SET NULL,
programme_id        uuid REFERENCES programmes(id) ON DELETE SET NULL,
app_access_granted  boolean NOT NULL DEFAULT false,
raw_metadata        jsonb,
source              text NOT NULL DEFAULT 'rbperform.com',
created_at          timestamptz NOT NULL DEFAULT now(),
granted_at          timestamptz,
notes               text  -- 'waitlist_wave2' | 'coach_collision' | NULL
```

### Coach virtuel (migration 106)
- `coaches.id = eb000000-0000-4000-8000-000000000001`
- `coaches.email = athletes@rbperform.app`
- Tous les clients ebook sont attachés via `clients.coach_id = <ce UUID>`

### Template programme (migration 106)
- `coach_programme_templates.id = eb000000-0000-4000-8000-000000000002`
- `html_content` = placeholder à remplacer

---

## Monitoring & alerting

Tous les paths d'erreur capturent dans **Sentry** via `_sentry.js#captureException` :

| Tag `stage`     | Quand                                              |
|-----------------|----------------------------------------------------|
| `lookup`        | SELECT ebook_purchases failed                      |
| `auth`          | admin.createUser / listUsers failed                |
| `client`        | INSERT clients failed                              |
| `template`      | SELECT coach_programme_templates failed            |
| `programme`     | INSERT programmes failed                           |
| `purchase`      | INSERT ebook_purchases failed (hors 23505)         |
| `unhandled`     | Exception non capturée                             |

À monitorer en production :
- Compteur places restantes : `SELECT 30 - count(*) FROM ebook_purchases WHERE app_access_granted=true`
- Taux d'activation : `SELECT count(*) FROM clients WHERE coach_id='eb000000-...' AND subscription_status='active'` / `SELECT count FROM ebook_purchases WHERE app_access_granted=true`
- Webhook failures : Stripe Dashboard → Developers → Webhooks → logs

---

## Cas edges traités

| Cas                                              | Comportement                                          |
|--------------------------------------------------|-------------------------------------------------------|
| Stripe retry le webhook (réseau, timeout)         | Idempotence via `stripe_session_id` PK → réponse identique |
| 2 webhooks simultanés même session_id            | Race : 23505 sur INSERT purchase → fallback granted (déjà en base) |
| Email acheteur = email coach existant            | granted=false, reason=`coach_collision`, email "contacte-nous" |
| 30 places déjà prises                            | granted=false, reason=`waitlist_wave2`, PDF envoyé   |
| SaaS unreachable depuis rbperform.com            | Email envoyé sans bloc accès app, alerte logs        |
| auth.users existe déjà pour cet email            | Réutilisé (cas: client ancien sur l'app)              |
| clients row existe déjà pour cet email + coach virtuel | Réutilisée (cas: retry après crash partiel)    |
| INSERT clients OK mais INSERT programmes KO       | clients préservé, retry Stripe → INSERT programmes complète |

---

## TODO / Améliorations futures

- [ ] Script `scripts/update-ebook-template.mjs` pour remplacer le HTML du template
- [ ] Page `/admin/ebook-purchases` dans CoachDashboard pour Rayan (liste des achats + filtres)
- [ ] Email J+7/J+30 automatique (engagement) via cron existant
- [ ] Upsell J+95 vers founding/coaching premium (cron + Resend)
- [ ] Dashboard temps réel compteur 30 places (déjà couvert par `/api/founding-stats` pattern)
- [ ] Support multi-cohorts (waitlist wave 2/3 activable manuellement)
