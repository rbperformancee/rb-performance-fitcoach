# Roadmap App Store — Athlète iOS

Référence permanente pour le passage de la PWA RB Perform vers l'App Store
en mode "athlète seul" (pas le coach). Mise à jour à chaque wave shippée.

> **Date cible go-live** : mi-septembre 2026
> **Décision stratégique** : ship athlète uniquement (pas le coach) pour éviter le piège IAP.

---

## Pré-requis administratifs (à faire par Rayan, indépendant du code)

| # | Tâche | Coût | Délai | État |
|---|---|---|---|---|
| 1 | Compte Apple Developer Program | 99€/an | 24-48h validation | ☐ à faire |
| 2 | App ID `app.rbperform` claimé | gratuit | instantané | ☐ |
| 3 | APNs Authentication Key (.p8) générée | gratuit | instantané | ☐ |
| 4 | App Store Connect : app créée, screenshots, description | gratuit | 2-3h prep | ☐ |
| 5 | Privacy Policy URL accessible | déjà fait `/legal` | ✅ | ✅ fait |

**Bloquant** : tant que (1) n'est pas validé, on ne peut pas tester sur device réel ni publier TestFlight.

---

## Architecture cible

```
┌─ iOS App (Capacitor 8.3.1 wrapper) ────────────────────┐
│  React app (CRA build) — même code que web             │
│   • Login : magic link OTP (web) + Sign in with Apple  │
│   • Push : APNs via @capacitor/push-notifications      │
│   • Cache offline : @capacitor/preferences             │
│   • Camera/Photo : @capacitor/camera                   │
│   • Scanner : zbar-wasm (déjà géré)                    │
└─────────────────────────────────────────────────────────┘
```

**Principe clé** : un seul codebase React qui détecte runtime s'il tourne en
web ou en natif. Les chemins push/auth/cache divergent selon le contexte,
le reste identique.

**Garantie zéro régression web** : tout nouveau code est wrappé derrière
`isNative()`. Les athlètes PWA en prod aujourd'hui ne voient AUCUN
changement de comportement. Web push, service worker, magic link, tout
continue à marcher pareil.

---

## Plan de migration en 6 waves

Chaque wave = 1 commit (ou bundle de commits), buildable, testable web, ne
casse rien en prod. On ne passe à la wave suivante qu'après confirmation
"web OK" de Rayan.

### Wave 1 — Native detection helper ✅ DONE

**But** : un utility `isNative()` réutilisable partout. Aucun changement
visible côté athlète.

Fichier livré : `src/lib/native.js` + `src/lib/native.test.js` (5 tests).
Contrat : tout fallback web → `false` / `"web"`. Garantit zéro régression PWA.

### Wave 2 — Info.plist iOS + Privacy Manifest ✅ DONE

**But** : conformité App Store sur les permissions et la déclaration des
APIs utilisées. Aucune modification du JS — uniquement les fichiers iOS.

Fichiers livrés :
- `ios/App/App/Info.plist` : NSCameraUsageDescription, NSPhotoLibraryUsageDescription,
  NSPhotoLibraryAddUsageDescription, NSMicrophoneUsageDescription,
  ITSAppUsesNonExemptEncryption=false (évite questionnaire export TestFlight)
- `ios/App/App/PrivacyInfo.xcprivacy` (nouveau) : déclare Email, Name,
  PhotosOrVideos, Fitness, DeviceID (linked, AppFunctionality, no tracking)
  + Required Reason API UserDefaults (CA92.1, pour @capacitor/preferences Wave 6)
- Validé par `plutil -lint` (OK / OK)

### Wave 3 — Account delete UI ✅ DONE

**But** : conformité Apple Guideline 5.1.1(v) — l'utilisateur doit pouvoir
supprimer son compte depuis l'app. Utile aussi côté web (RGPD).

Fichiers livrés :
- `src/components/LegalPages.jsx` : `DeleteConfirmModal` durcie avec
  typed-confirm "SUPPRIMER" + état `busy` (anti double-clic, désactivation
  pendant l'appel réseau).
- `src/App.jsx` : `handleDeleteAccount` réécrit. L'ancien faisait un cascade
  client-side qui oubliait des tables (`check_ins`, `push_subscriptions`...)
  et ne supprimait PAS `auth.users` → le compte restait dans Supabase et
  l'email était bloqué pour toute recréation. Maintenant délègue à
  `/api/gdpr-delete` (server-side, service role, cascade FKs + auth.users +
  email confirmation + audit log). Même contrat que côté coach.

### Wave 4 — Sign in with Apple ⏸ DEFERRED (non bloquant)

**Statut** : pas implémentée maintenant — décision documentée.

**Raison** : Apple Guideline 4.8 n'impose SIWA QUE si l'app offre déjà un
autre OAuth tiers (Google / Facebook / etc.). RB Perform athlète utilise
uniquement magic link OTP (auth interne via email), donc SIWA n'est PAS
requise pour la submission initiale. À ré-activer si on ajoute Google
Sign-In plus tard.

Reprise planifiée si besoin :
- `src/components/LoginScreen.jsx` (bouton SIWA conditionnel via `isIOSNative()`)
- `src/lib/auth-apple.js` (wrapper @capacitor-community/apple-sign-in)
- `api/auth-apple.js` (valide ID token Apple, échange contre session Supabase)
- Apple Services ID + .p8 key configurés dans Supabase dashboard

### Wave 5 — APNs Push (parallèle au web push) ✅ DONE

**But** : recevoir les notifs sur iOS native. Le web push existant
continue à marcher pour les PWA athlètes en prod.

Fichiers livrés :
- `src/hooks/usePushNotifications.js` : branche native via dynamic import
  `@capacitor/push-notifications` quand `isNative()`, sinon web push
  inchangé. Sur 1ère register iOS, purge des subs web push Apple PWA pour
  CE client (évite la double notif PWA + native sur le même iPhone).
- `api/_apns.js` (nouveau) : helper pure-Node, JWT ES256 signé via crypto
  natif (P1363 dsaEncoding direct), cache JWT 50 min, `isApnsConfigured()`
  pour gating idempotent.
- `api/send-push-apns.js` (nouveau) : endpoint POST, auth via CRON_SECRET
  ou service role. **503 si APNs pas configuré** → garantit zéro impact
  prod tant qu'on n'a pas le compte Apple Developer.
- `api/cron-client-daily-reminder.js` : appel APNs en parallèle du web
  push, gated par CRON_SECRET, 503 traité comme no-op normal.
- `supabase/migrations/109_push_subscriptions_apns.sql` : col `apns_token
  TEXT NULL` + CHECK channel (endpoint OR apns_token) + indexes partiels
  unique pour upsert idempotent.
- 7 tests `src/__tests__/api-apns.test.js` valident le contrat no-op + JWT.

**État live web** : aucun changement. La branche native du hook n'est
jamais exécutée hors WebView Capacitor. La migration 109 reste à appliquer
quand le user lance `npm run migrate 109_push_subscriptions_apns.sql`.

### Wave 6 — Service Worker bypass on native + offline cache natif ✅ DONE

**But** : éviter les conflits SW / WebView sur iOS. Cache offline via
`@capacitor/preferences` au lieu du DATA_CACHE web.

Fichiers livrés :
- `public/index.html` : SW register skip si `window.Capacitor.isNativePlatform()`.
  Auto-unregister des SW résiduels (cas user installé en PWA AVANT l'app
  native → on évite la double couche de cache).
- `src/lib/offline.js` (nouveau) : abstraction `setProgrammeHtml /
  getProgrammeHtml / clearProgrammeCache`. Web → SW postMessage inchangé.
  Native → @capacitor/preferences via import dynamique gated. Best-effort
  silencieux, jamais de throw.
- `src/hooks/useAuth.js` : 2 call sites SW postMessage remplacés par
  `setProgrammeHtml()`. Path web bit-for-bit identique, path native
  s'active automatiquement.
- `package.json` : ajout `@capacitor/preferences ^8.0.1`.
- 5 tests `src/lib/offline.test.js` valident web path + dégradation.

---

## Risques identifiés + mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Rejet App Review pour Account Delete manquant | élevée | bloquant | Wave 3 le couvre |
| Rejet App Review pour Privacy Manifest manquant | élevée (iOS 17+) | bloquant | Wave 2 le couvre |
| Athlètes PWA perdent leurs notifs pendant migration | moyen | gêne support | Web push existant reste actif, on n'efface pas |
| Doublon notifs (PWA + iOS native installées) | moyen | UX confusing | Sur 1ère ouverture native, purge la sub web push DB du device |
| Scanner zbar-wasm crash en WKWebView | faible | feature dégradée | Déjà géré via fallback snap-photo (`IS_IOS` 4 signaux) |

---

## Hors scope (à NE PAS faire pour l'instant)

- **IAP coach** : on ne ship pas le coach sur iOS. Le coach reste web only.
  → si le coach veut accéder à son dashboard via iPhone, il ouvre Safari sur
  rbperform.app. PWA install reste possible pour lui.
- **Android Play Store** : possible plus tard, +30-50% effort. Pas pour ce sprint.
- **Universal links** (rbperform.app → app native) : possible v2.
- **Apple Watch companion** : non.

---

## Suivi des waves

| Wave | Description | Commit | Date | Build web OK ? |
|---|---|---|---|---|
| 1 | Native detection helper | (pending) | 2026-06-02 | ✅ (126/126 tests) |
| 2 | Info.plist + Privacy Manifest | (pending) | 2026-06-02 | ✅ (plutil OK) |
| 3 | Account delete UI | (pending) | 2026-06-02 | ✅ (126/126 tests) |
| 4 | Sign in with Apple | — | DEFERRED | — |
| 5 | APNs Push parallèle | (pending) | 2026-06-02 | ✅ (133/133 tests, build OK) |
| 6 | SW bypass + offline natif | (pending) | 2026-06-02 | ✅ (138/138 tests, build OK) |

---

## État au 2 juin 2026 (post-implémentation autonome)

Tout le code applicatif est livré et testé en web sans régression. La
suite est entièrement bloquée sur l'inscription Apple Developer + les
deux étapes manuelles ci-dessous.

### À faire par Rayan AVANT submission TestFlight

1. **Apple Developer Program** (99€/an, validation 24-48h)
   - Créer Team ID
   - Générer APNs Auth Key (.p8) → noter Key ID
   - App ID `app.rbperform` claimé
2. **Variables d'env Vercel** (production + preview) :
   - `APNS_KEY_ID` = 10 chars Key ID
   - `APNS_TEAM_ID` = 10 chars Team ID
   - `APNS_AUTH_KEY` = contenu du .p8 (multi-lignes PEM)
   - `APNS_BUNDLE_ID` = `app.rbperform` (default si non set)
   - `APNS_USE_SANDBOX` = `1` pendant TestFlight, retirer pour prod
3. **Appliquer migration 109** :
   ```sh
   npm run migrate 109_push_subscriptions_apns.sql
   ```
4. **Build iOS** (depuis le repo) :
   ```sh
   npm run build && npx cap sync ios && npx cap open ios
   ```
   Puis Xcode → Archive → Upload TestFlight.

### Quand reprendre après le launch programmes

Le launch Athlète Founders ouvre le 8 juin et ferme le 14 juin. Si Apple
Dev validé d'ici-là, la submission TestFlight peut se faire dès le 15 juin.

---

## Glossaire pour les non-iOS

- **APNs** = Apple Push Notification service. L'API Apple pour notifs push natives.
- **WKWebView** = le moteur web Apple utilisé par Capacitor pour rendre la React app dans une coque native.
- **IAP** = In-App Purchase. Le système Apple pour vendre des biens numériques (avec 15-30% commission).
- **SIWA** = Sign in with Apple. L'OAuth Apple obligatoire si on offre d'autres OAuth tiers.
- **Privacy Manifest** = fichier `.xcprivacy` qui déclare les "Required Reason APIs" utilisées (iOS 17+).
- **TestFlight** = service Apple pour distribuer des builds beta à des testeurs avant submission App Store.
