# 🤖 Listing Play Store — RB Perform (FR)

Tout ce qu'il faut copier-coller dans la Play Console quand Google aura validé ton identité.

---

## 📱 Informations de base

| Champ | Valeur |
|---|---|
| Nom de l'app | `RB Perform` |
| Nom du dev (visible public) | `RB Perform` |
| Catégorie | `Santé et remise en forme` |
| Sous-catégorie | `Sport / Fitness` |
| Type de contenu | `Application` (pas jeu) |
| Tarification | `Gratuit` |
| Achats intégrés | `Non` (pour l'instant) |
| Pays | Tous, principalement FR |
| Site web | `https://rbperform.app` |
| Email support | `rayan.b2701@gmail.com` |
| Politique de confidentialité | `https://rbperform.app/legal.html` |

---

## ✏️ Description courte (max 80 caractères)

```
Le coaching d'un athlète, pour les athlètes. Programme, suivi et performance.
```
*(78 chars)*

**Variantes selon ce qui marche en A/B :**
```
Ton coaching sportif sur-mesure. Programme, séances, suivi 7j/7.
```
*(64 chars)*

```
L'app de l'athlète : programme personnalisé, suivi des séances, accountability
```
*(78 chars)*

---

## 📝 Description longue (max 4000 caractères)

```
RB Perform, c'est ton accompagnement sportif personnalisé directement sur ton iPhone et Android.

Pensé par un athlète qui accompagne les athlètes — pas une plateforme générique, pas un PDF figé.

▸ TON PROGRAMME, PAS UN PROGRAMME LAMBDA
Un programme structuré qui s'adapte à toi : ton objectif, ton matériel, ta semaine, ton niveau, tes contraintes. Pas du copier-coller. Pas du "même routine pour tout le monde".

▸ DES SÉANCES PRÉCISES
Chaque séance détaillée : exercices, séries, reps, charges, RPE, temps de repos. Tutos vidéo intégrés pour chaque mouvement. Tu sais exactement quoi faire et pourquoi.

▸ UN SUIVI VIVANT
Logging des séances en 30 secondes. Historique des performances. Personal Records suivis automatiquement. Ton programme s'ajuste en fonction de tes progrès et de tes ressentis.

▸ TIMER DE REPOS INTELLIGENT
Timer de repos qui apparaît directement dans la Dynamic Island et la Live Activity (iOS). Tu n'as pas besoin de rouvrir l'app entre chaque set. Le timer te suit partout.

▸ ACCOUNTABILITY DIRECTE
Pas de "coach virtuel". Pas de réponse automatique. Une vraie ligne directe avec moi quand tu en as besoin. Pour ajuster le programme, pour les coups de mou, pour les questions techniques.

▸ POUR QUI ?
Athlètes amateurs sérieux qui s'entraînent 3 à 5 fois par semaine et qui veulent passer un palier.
Sportifs de force, hypertrophie, athlétisme, sports de combat.
Adultes 18+. Pas pour les débutants absolus, pas pour les ados.

▸ CE QUE CE N'EST PAS
Ce n'est pas une app gratuite illimitée. RB Perform est l'app utilisée par les athlètes accompagnés dans le programme RB Perform PRO. L'accès à l'accompagnement complet (programme personnalisé + suivi + ligne directe) se fait sur candidature et entretien.

L'app reste téléchargeable gratuitement pour : 
- Découvrir l'écosystème
- Tester le timer de repos
- Consulter les séances types
- Lancer le processus de candidature

▸ MÉTHODE
Une méthode, pas dix. Construite autour de 5 piliers :
1. Programmation adaptée et lisible
2. Une app qui simplifie le tracking au lieu de le compliquer
3. Accountability humaine, pas une notif robot
4. Programme vivant qui s'ajuste à tes feedbacks
5. Sélection limitée — 15 athlètes max par mois

▸ INFOS PRATIQUES
- 100% en français
- Données stockées de manière sécurisée
- Aucune collecte commerciale, aucune pub
- Politique de confidentialité : https://rbperform.app/legal.html
- Pour candidater au programme PRO : https://rbperform.app/candidature

▸ POSITIONNEMENT
Je m'appelle Rayan Bonte, athlète et fondateur de RB Perform. J'accompagne les athlètes amateurs qui veulent passer du "ouais je m'entraîne" à "je structure et je progresse vraiment". Cette app est l'outil que j'utilise avec mes athlètes — elle est là, ouverte à tous ceux qui veulent voir comment je travaille.

Plus d'infos : https://rbperform.app
Contact : rayan.b2701@gmail.com
```

*(~3500 chars — sous la limite, marge confortable)*

---

## 🎨 Assets visuels — préparés dans `assets/`

| Asset | Fichier | Dimensions | Statut |
|---|---|---|---|
| App icon | `assets/icon-512.png` | 512×512 PNG | ✅ Prêt (depuis iOS source 1024×1024) |
| Feature graphic | `assets/feature-graphic-1024x500.png` | 1024×500 PNG | ✅ Prêt (logo + tagline composés) |
| Screenshots phone | `screenshots/` | min 320px, max 3840px ratio 16:9 ou 9:16 | ⏳ À capturer depuis l'émulateur (cf. section dédiée) |

---

## 📸 Screenshots — workflow recommandé

Play Store demande **min 2 screenshots phone**, **max 8**. Je recommande **4-6 screenshots**.

### Option A — Émulateur Android (le plus propre)

1. Installer l'émulateur Android Studio si pas déjà fait
2. Créer un AVD Pixel 7 (résolution 1080×2400)
3. Installer l'AAB :
   ```bash
   adb install /Users/rayan/fitcoach_updated/android/app/build/outputs/bundle/release/app-release.aab
   ```
   (Note: AAB → besoin de `bundletool` pour install direct sur émulateur. Plus simple = build APK debug : `./gradlew assembleDebug`)
4. Naviguer dans l'app + capturer (cmd+S dans l'émulateur)

### Option B — Recycler les screenshots iOS

Si tu as déjà uploadé des screenshots iOS sur App Store Connect, tu peux les réutiliser sur Play Store **à condition** que :
- L'UI soit identique (c'est le cas, Capacitor = même UI)
- Tu retires la zone "notch / Dynamic Island" qui est iOS-only

Play Store accepte les ratios variés, donc même un screenshot iPhone 6.7" peut passer.

### Suggestions de scénarios à capturer

1. **Home / Dashboard** — vue d'ensemble programme du jour
2. **Séance en cours** — l'exercice en cours, série/rep/charge
3. **Timer de repos en action** — l'écran timer fullscreen
4. **Historique perfs** — graphique de progression d'un mouvement
5. **Page de candidature** — pour ceux qui veulent passer en PRO
6. *(Optionnel)* Profile / Réglages

---

## 🎯 Content rating — questionnaire IARC

Quand tu cliques "Demander une notation" sur Play Console, Google te pose un questionnaire IARC. Voici les réponses attendues :

| Catégorie | Réponse |
|---|---|
| Violence | `Non` |
| Sexe / nudité | `Non` |
| Langage vulgaire | `Non` |
| Substances contrôlées | `Non` |
| Achats simulés / jeu | `Non` |
| Achats intégrés | `Non` (gratuit pour l'instant) |
| Localisation utilisateur | `Non` (sauf si tu utilises GPS — RB Perform ne devrait pas) |
| Partage d'infos perso | `Non` (pas de social, pas de chat public) |
| Contenu généré par utilisateur | `Non` (utilisateur enregistre ses séances pour lui-même) |
| Publicité tierce | `Non` |

→ Tu obtiendras une note **PEGI 3 / IARC 3+** (= adapté à tout public). Parfait pour le marché français.

---

## 🔐 Data safety / Privacy section

Play Store demande de déclarer chaque type de données collectées. Voici ce que tu coches pour RB Perform :

| Type de donnée | Collecte ? | Partage ? | Optionnelle ? |
|---|---|---|---|
| **Nom** | Oui (pour ton profil) | Non | Non (requis pour candidature) |
| **Email** | Oui | Non | Non |
| **Téléphone** | Oui (candidature) | Non | Oui |
| **Activité sportive** (séances, perfs) | Oui | Non | Non |
| **Mensurations / poids** | Oui | Non | Oui (que pour les athlètes accompagnés) |
| **Photos** | Si user upload photos progrès | Non | Oui |
| **Location précise** | Non | — | — |
| **Web history** | Non | — | — |
| **Contacts** | Non | — | — |
| **Identifiants device** | Oui (analytics anonymes) | Non | Non |

Et tu confirmes :
- ✅ Toutes les données sont chiffrées en transit (HTTPS Supabase)
- ✅ Les utilisateurs peuvent demander la suppression de leurs données (RGPD)
- ✅ Pas de partage avec des tiers (ni publicité, ni analyse comportementale tierce)

---

## 📋 Checklist finale avant submit

- [ ] Identité Google validée (mail reçu sur rb.performancee@gmail.com)
- [ ] Téléphone validé (SMS)
- [ ] Compte de paiement créé (gratuit obligatoire même pour app gratuite, juste pour les rapports)
- [ ] App créée dans Play Console avec nom "RB Perform"
- [ ] Description courte + longue collées (depuis ce doc)
- [ ] Icône 512×512 uploadée (`assets/icon-512.png`)
- [ ] Feature graphic 1024×500 uploadée (`assets/feature-graphic-1024x500.png`)
- [ ] Min 2 screenshots phone uploadés
- [ ] Catégorie : Santé et remise en forme
- [ ] Content rating IARC effectué (PEGI 3+)
- [ ] Data Safety questionnaire rempli
- [ ] Privacy Policy URL : `https://rbperform.app/legal.html`
- [ ] Politiques Play Store validées (publicité, COVID, sensitive permissions...)
- [ ] AAB uploadé (`app-release.aab`, 32 MB)
- [ ] Soumis en **Production** (ou commencer par **Closed testing** pour tester avec quelques athlètes en interne d'abord)
- [ ] Review Google : 1-3 jours typiquement
