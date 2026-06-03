# TestFlight invite — RB Perform iOS

## Template email pour les 3 beta testers

Personnaliser `{prénom}` avant envoi.

---

**Sujet** : Tu testes la nouvelle app RB Perform sur iPhone (3 min)

**Corps** :

Hello {prénom},

J'ai fini la version iOS de RB Perform et je submitt à Apple cette semaine. Avant ça, je veux que **3 personnes de confiance** la testent sur leur vrai iPhone — pour shooter les derniers bugs avant App Store.

Tu fais partie des 3. Voici comment installer (5 min) :

**1.** Installe l'app gratuite **TestFlight** depuis l'App Store : https://apps.apple.com/app/testflight/id899247664

**2.** Quand TestFlight est installé, ouvre ce lien sur ton iPhone :
*(je t'enverrai le lien d'invitation TestFlight une fois ton email ajouté au programme — délai 5 min)*

**3.** Tu verras "RB Perform" dans TestFlight → bouton "Install"

**4.** Lance l'app. **Login normal avec ton email habituel** (magic link OTP).

**Ce que je te demande de tester (~3 min total) :**
- L'app boot OK (pas de crash, splash → écran login)
- Tu peux logger une séance (1 set sur 1 exo suffit)
- Tu navigues entre Train / Body / Fuel / Move / Profile
- Tu reçois bien tes notifs push si tu en avais déjà sur le web

**Si quelque chose foire** : screenshot + envoie-moi sur WhatsApp. Tout retour vaut de l'or à ce stade.

Merci 🙏 — sans toi, je ne pourrais pas garantir que l'app marche sur 50+ iPhones différents.

Rayan

---

## Liste testers (à compléter)

| Prénom | Email Apple ID | Sent invite ? | Installed ? | Feedback ? |
|---|---|---|---|---|
| Skander | (à fournir) | ⬜ | ⬜ | ⬜ |
| ... | (à fournir) | ⬜ | ⬜ | ⬜ |
| ... | (à fournir) | ⬜ | ⬜ | ⬜ |

## Comment ajouter un tester dans App Store Connect

Une fois que tu as l'app dans App Store Connect (post Apple validation) :

1. App Store Connect → ton app → **TestFlight**
2. Onglet **Internal Testing** → **Add testers**
3. Colle les 3 emails Apple ID (séparés par virgules)
4. **Apple envoie automatiquement l'invitation TestFlight aux 3 emails**

Tu n'as pas besoin d'envoyer toi-même le lien d'invitation — TestFlight gère l'email d'invitation. Tu envoies juste **ton** email "Hello, je t'ai mis sur la liste" pour les motiver à cliquer.

## Smoke test minimum acceptable

Si les 3 testers réussissent ces étapes sans crash, **OK pour submit prod review** :

- [ ] Boot app (splash → login)
- [ ] Login OTP (magic link arrive bien)
- [ ] Dashboard charge (programme visible)
- [ ] Navigate les 5 onglets — pas de freeze
- [ ] Logger 1 set sur 1 exo (le poids/reps se save)
- [ ] Demander permission notifs (alert iOS apparaît)
- [ ] Logout → retour login screen
- [ ] **Aucun crash dans Sentry après 24h d'usage cumulé des 3**

Si **1+ tester rapporte un crash** → fix → re-archive → re-TestFlight → re-test avant submit.
