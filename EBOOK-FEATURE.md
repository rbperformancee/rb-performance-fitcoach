# Feature : Ebook self-serve athlète — 3 tiers (47 / 57 / 87 €)

Documentation opérationnelle du flow `achat ebook` → `provisioning compte athlète` →
`accès 100 jours à l'app RB Perform` (bonus founding).

> **TL;DR** : trois products Stripe (`ebook-athlete-100-pdf`, `ebook-athlete-100-founding`,
> `ebook-athlete-100-perf`) sur rbperform.com. Les tiers `founding` et `perf` déclenchent
> le provisioning d'un compte athlète sur rbperform.app + accès app 100j pour les 30 premiers.
> Le tier `pdf` n'envoie qu'un PDF (pas de compte app). Les 100j d'accès app démarrent quand
> **le client** clique sur "Démarrer" dans l'app, pas à l'achat.

---

## Architecture des 3 tiers

| Tier | Suffix programmeId | Prix | Contenu | Compte app | Compte 30 places |
|---|---|---|---|---|---|
| **PDF** | `-pdf` | **47€** | Ebook 100J PDF seul | ❌ | ❌ (pas comptabilisé) |
| **FOUNDING** | `-founding` | **57€** | Ebook 100J + accès app 100j | ✅ (si 30 places dispo) | ✅ |
| **PERFORMANCE** | `-perf` | **87€** | Ebook 100J + Force & Masse + accès app 100j | ✅ (si 30 places dispo) | ✅ |

**Compteur 30 places** : partagé entre tiers `founding` et `perf` (1 compteur global, pas un par tier).

---

## Architecture (2 repos)

```
┌────────────────────────────────────┐                ┌──────────────────────────────────┐
│ ~/rbperform (rbperform.com)        │                │ ~/fitcoach_updated (rbperform.app)│
│ Next.js 16                          │                │ React CRA + Vercel api/*          │
│                                    │                │                                  │
│ /api/webhooks/stripe (POST)        │                │ /api/internal/ebook-grant-access │
│  └─ checkout.session.completed     │                │                                  │
│      └─ getEbookTier(programmeId)  │                │  Appelé UNIQUEMENT pour les      │
│         ├─ 'pdf' → email only      │                │  tiers founding/perf :           │
│         └─ 'founding'/'perf' →     │   X-Internal   │  ├─ idempotence stripe_session_id│
│            grantAppAccess()        │ ─────Secret───▶│  ├─ compteur 30 places            │
│            └─ sendEbookEmail()     │                │  ├─ check coach existant          │
│               (3 variants HTML)    │ ◀───{granted,──│  ├─ auth.users + clients          │
│                                    │  places_left}  │  │   (status=pending_start)       │
└────────────────────────────────────┘                │  └─ programmes (dup template)     │
                                                      └──────────────────────────────────┘
```

---

## Flow client par tier

### Tier `pdf` (47€)
1. Achat sur rbperform.com → checkout Stripe avec `programmeId=ebook-athlete-100-pdf`
2. Webhook reçoit → `sendEbookEmail(tier='pdf')`
3. Email : PDF en pièce jointe + petit teaser "tu veux l'app ? Réponds-moi"
4. Aucun compte SaaS créé, aucune ligne dans `ebook_purchases`

### Tier `founding` (57€) — 30 premiers
1. Achat avec `programmeId=ebook-athlete-100-founding`
2. Webhook → `grantAppAccess` → SaaS provisionne client + programme
3. Email : PDF + bouton **"Accéder à mon espace 100j"** → `/login?email=...&source=ebook`
4. Login OTP 6 chiffres → `/training` → écran "Démarrer mes 100 jours" (irréversible)
5. Clic Démarrer → `subscription_start_date = now()`, `+100j` jusqu'à `subscription_end_date`

### Tier `perf` (87€) — Performance pack
Identique à `founding` mais :
- 2 PDFs en pièce jointe (Ebook 100J + Force & Masse)
- Email avec bloc "Performance pack — 2 fichiers"

### Tier `founding`/`perf` après les 30 places
- `app_access_granted=false`, `reason=waitlist_wave2`
- Email : PDF normal + bloc orange "30 places prises, tu es sur la waitlist"
- Pas de bouton login

---

## Étapes ordonnées (statut)

| # | Étape | Repo | Statut |
|---|---|---|---|
| 1 | Coach virtuel + template HTML | fitcoach_updated | ✅ |
| 2 | Table `ebook_purchases` | fitcoach_updated | ✅ |
| 3 | Endpoint `/api/internal/ebook-grant-access` | fitcoach_updated | ✅ |
| 4 | Helper `isInternalAuthorized` | fitcoach_updated | ✅ |
| 5 | Pre-fill login + écran "Démarrer 100j" | fitcoach_updated | ✅ |
| 6 | Webhook switch 3 tiers + `getEbookTier()` | rbperform | ✅ |
| 7 | Email 3 variants (pdf/founding/perf, granted/waitlist/collision) | rbperform | ✅ |
| 8 | Tests E2E mode prod | both | ✅ (20/20) |
| 9 | Déploiement prod | both | ✅ |

---

## Stripe — créer les 3 products

> ⚠️ Le webhook attend que `metadata.programmeId` soit l'un des 3 :
> `ebook-athlete-100-pdf` / `ebook-athlete-100-founding` / `ebook-athlete-100-perf`

### Procédure dashboard Stripe (TEST puis LIVE)

1. [dashboard.stripe.com/products](https://dashboard.stripe.com/products) → **+ Add product** (×3)
2. Pour chacun :

| Product Name (Stripe) | programmeId metadata | Price |
|---|---|---|
| `Ebook Athlète 100J — PDF` | `ebook-athlete-100-pdf` | 47.00 € |
| `Ebook Athlète 100J — Founding` | `ebook-athlete-100-founding` | 57.00 € |
| `Performance Pack 100J + F&M` | `ebook-athlete-100-perf` | 87.00 € |

3. Configuration commune :
   - Currency : EUR
   - Tax behavior : Inclusive ou Exclusive selon ton setup
   - Recurring : NO (one-time)

4. Côté front rbperform.com : 3 boutons → POST `/api/checkout` avec :
   ```json
   { "programmeId": "ebook-athlete-100-founding",
     "programmeName": "Ebook Athlète 100J — Founding",
     "price": 57 }
   ```

5. **Reproduis en LIVE** une fois validé en TEST.

---

## PDF à fournir

Place ces fichiers dans `~/rbperform/public/pdfs/` :

| Path | Tier | Statut |
|---|---|---|
| `ebook-athlete-100.pdf` | utilisé par pdf/founding/perf | ⏳ à fournir |
| `programme-force-masse.pdf` | additionalPdf du tier perf | ✅ existe (force-masse déjà sorti) |

---

## Env vars en place (vérifiées en prod)

### `~/fitcoach_updated` (rb-perfor) ✅
- `INTERNAL_API_SECRET` (64 chars hex)
- `EBOOK_VIRTUAL_COACH_ID=eb000000-0000-4000-8000-000000000001`
- `EBOOK_TEMPLATE_ID=eb000000-0000-4000-8000-000000000002`

### `~/rbperform` ✅
- `INTERNAL_API_SECRET` (même valeur)
- `SAAS_API_URL=https://rbperform.app`
- `SAAS_APP_URL=https://rbperform.app`

---

## Schéma DB

### `coaches` virtuel (migration 106)
- `id = eb000000-0000-4000-8000-000000000001`
- `email = athletes@rbperform.app`
- Tous les clients ebook attachés via `clients.coach_id`

### `coach_programme_templates` (migration 106)
- `id = eb000000-0000-4000-8000-000000000002`
- `html_content` = programme 100J — placeholder à remplacer

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
notes               text  -- 'waitlist_wave2' | 'coach_collision'
```

---

## Tests E2E

Tests passés contre prod (20/20) :
```bash
INTERNAL_API_SECRET=<secret> API_URL=https://rbperform.app \
  node scripts/test-ebook-grant.mjs
```

Cleanup automatique après tests.

---

## Monitoring

**Compteur places restantes** :
```sql
SELECT 30 - count(*) AS places_left
FROM ebook_purchases
WHERE app_access_granted = true;
```

**Répartition par tier** (à requêter via metadata Stripe + ebook_purchases.raw_metadata) :
```sql
SELECT raw_metadata->>'programmeId' AS tier, count(*)
FROM ebook_purchases
GROUP BY raw_metadata->>'programmeId';
```

**Taux d'activation** (clients ayant cliqué "Démarrer") :
```sql
SELECT
  count(*) FILTER (WHERE subscription_status = 'active') AS activated,
  count(*) FILTER (WHERE subscription_status = 'pending_start') AS pending,
  count(*) AS total
FROM clients
WHERE coach_id = 'eb000000-0000-4000-8000-000000000001';
```

---

## Cas edges (tous gérés)

| Cas | Comportement |
|---|---|
| Stripe retry webhook | Idempotence via `stripe_session_id` PK |
| 2 webhooks simultanés même session | 23505 unique_violation → fallback granted |
| Email = coach existant | granted=false, reason=`coach_collision`, email "contacte-nous" |
| 30 places prises | granted=false, reason=`waitlist_wave2`, PDF envoyé |
| Tier `pdf` (pas d'app) | Pas d'appel SaaS, pas de ligne `ebook_purchases` |
| SaaS unreachable depuis webhook | Email envoyé sans bloc app, alerte logs |
| auth.users existe déjà | Réutilisé |
| clients existe déjà (retry partiel) | Réutilisé, `user_id` re-attaché |

---

## TODO

- [ ] PDF `ebook-athlete-100.pdf` à uploader dans `~/rbperform/public/pdfs/`
- [ ] HTML template programme 100J à remplacer (`UPDATE coach_programme_templates ... WHERE id='eb000000-0000-4000-8000-000000000002'`)
- [ ] Stripe products à créer (TEST + LIVE) — cf section dédiée
- [ ] Front rbperform.com : 3 boutons d'achat (un par tier)
- [ ] Optionnel : page `/admin/ebook-purchases` côté CoachDashboard pour Rayan
- [ ] Optionnel : compteur live "il reste X/30 places" sur la landing rbperform.com (alimenté par `/api/founding-stats` pattern)
