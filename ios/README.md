# RB Perform iOS — Build & Submission

Référence opérationnelle pour shipper l'app athlète sur l'App Store.
Cf `APP_STORE_ROADMAP.md` à la racine pour le contexte stratégique.

---

## État actuel

| Élément | État | Détail |
|---|---|---|
| Code applicatif (Waves 1-6) | ✅ | Déployé en prod web, gated `isNative()` |
| Info.plist permissions | ✅ | Caméra, photo, mic, no encryption |
| PrivacyInfo.xcprivacy | ✅ | Données + Required Reason APIs déclarées |
| App Icon 1024×1024 | ✅ | `Assets.xcassets/AppIcon.appiconset/` |
| Splash 2732×2732 | ✅ | `Assets.xcassets/Splash.imageset/` |
| Capacitor SPM (5 plugins) | ✅ | `cap sync ios` OK |
| App Store Connect metadata | ✅ | `ios/AppStoreConnect/` (FR + EN) |
| ExportOptions.plist | ✅ | `ios/export-options/` (app-store + adhoc) |
| Apple Developer Program | ❌ | À souscrire (99€/an) |
| App ID provisionné | ❌ | `app.rbperform` à claim sur developer.apple.com |
| Distribution certificate | ❌ | À générer une fois Apple Dev validé |
| TestFlight build | ❌ | Après archive Xcode |
| App Store review | ❌ | Après TestFlight validé |

---

## Marche à suivre côté Rayan (à FAIRE)

### 1. Apple Developer Program (99€/an, 24-48h validation)

1. https://developer.apple.com/programs/enroll
2. Connecte-toi avec ton Apple ID
3. Choisis "Individual" (ou "Organization" si tu veux que le bandeau
   App Store affiche "RB Perform" au lieu de ton nom perso → exige un
   D-U-N-S number, plus long à obtenir)
4. Paie 99€ → mail de validation sous 24-48h

### 2. App Store Connect (gratuit, après step 1)

1. https://appstoreconnect.apple.com → My Apps → "+"
2. Bundle ID : `app.rbperform` (auto-créé si tu sélectionnes "register a new app ID")
3. Primary Language : Français (France)
4. SKU : `rbperform-ios-1` (libre)

### 3. Copier les metadata dans App Store Connect

Tout est rédigé dans `ios/AppStoreConnect/` :

- **Nom / Sous-titre** : `name.txt` + `subtitle.txt` (FR + EN)
- **Description** : `description.txt`
- **Texte promotionnel** : `promotional_text.txt`
- **Quoi de neuf** : `whats_new.txt`
- **Mots-clés** : `keywords.txt`
- **URLs** : `support_url.txt` + `marketing_url.txt` + `privacy_url.txt`
- **Catégorie** : `category.txt`
- **Notes pour Apple Review** : `review_notes.txt` ← MET LA INTÉGRALEMENT
- **Age rating** : suis `age_rating.txt`
- **Export compliance** : suis `encryption_questions.txt`

### 4. APNs configuration

1. App Store Connect → Settings → Keys → "+" → Apple Push Notifications service (APNs)
2. Télécharge le fichier .p8 (1 chance — Apple ne te le redonne pas)
3. Note le Key ID (10 chars)
4. Vercel env vars (production + preview) :
   ```
   APNS_KEY_ID=<Key ID>
   APNS_TEAM_ID=<Team ID 10 chars>
   APNS_AUTH_KEY=<contenu du .p8, multi-lignes PEM>
   APNS_BUNDLE_ID=app.rbperform
   APNS_USE_SANDBOX=1   # à retirer pour prod App Store
   ```

### 5. Édite les ExportOptions.plist

Dans `ios/export-options/AppStore.plist` et `Adhoc.plist`, remplace
`TEAMIDXXXX` par ton vrai team ID (10 chars, visible sur
developer.apple.com → Membership).

---

## Build local (côté ingénierie)

### Build Simulator (pas besoin de compte Apple)

```sh
npm run build               # bundle CRA → build/
npx cap sync ios            # copie + Package.swift refresh
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath build/sim build
```

### Archive pour App Store

```sh
npm run build
npx cap sync ios

xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -archivePath build/RBPerform.xcarchive \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  archive

xcodebuild -exportArchive \
  -archivePath build/RBPerform.xcarchive \
  -exportPath  build/RBPerform-ipa \
  -exportOptionsPlist ios/export-options/AppStore.plist
```

Le `.ipa` apparaît dans `build/RBPerform-ipa/`. Upload via :
- **Transporter.app** (App Store) — GUI, glisser-déposer
- **Xcode Organizer** : Window → Organizer → Archives → Distribute App
- **CLI** : `xcrun altool --upload-app -f build/RBPerform-ipa/App.ipa
  -t ios --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>`

---

## Submission App Store Review

1. App Store Connect → ton app → version 1.0 → "Submit for Review"
2. Apple répond sous **24-48h** (souvent 24h)
3. Si refusé : lis le motif, fixe, resoumets
4. Si accepté : "Ready for Sale" → tu choisis "Release manually" ou
   "Release automatically after approval"

**Délais réalistes** :
- Apple Dev validation : 24-48h
- TestFlight build processing : 30 min - 4h
- TestFlight beta review (1ère fois) : 24h
- App Store review : 24-48h en moyenne (peut aller jusqu'à 5j)

**Total** : ~5-7 jours du compte Apple Dev créé jusqu'au "Ready for Sale".

---

## En cas de rejet App Review (top motifs)

- **Guideline 4.3** (spam / clone) → si rejeté ici, c'est sérieux. Mais
  on a un vrai produit avec coach humain → faible probabilité.
- **Guideline 5.1.1(v)** (account delete missing) → Wave 3 le couvre.
- **Guideline 4.8** (SIWA missing) → applicable QUE si on offre d'autres
  OAuth tiers. Magic link OTP n'en est pas un → on est OK.
- **Privacy Manifest incomplet** → si Apple détecte une API Required
  Reason non déclarée, rejet. PrivacyInfo.xcprivacy à jour Wave 2.
- **Demo account ne marche pas** → le bouton "Continuer en mode démo"
  doit fonctionner. Test avant submission.

---

## Annexes

- `AppStoreConnect/fr-FR/` : metadata française
- `AppStoreConnect/en-US/` : metadata anglaise
- `AppStoreConnect/review_notes.txt` : pour Apple
- `AppStoreConnect/age_rating.txt` : réponses au questionnaire
- `AppStoreConnect/encryption_questions.txt` : export compliance
- `export-options/AppStore.plist` : pour `xcodebuild -exportArchive`
- `export-options/Adhoc.plist` : pour distribution interne UDID
