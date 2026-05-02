# Email Templates — Méthode RB Perform (offre /candidature)

Templates prêts à copier-coller dans Gmail / Outlook après chaque étape du funnel /candidature.

**Variables à remplacer partout** :
- `{Prénom}` — prénom du candidat
- `{NomComplet}` — nom + prénom
- `{DateAppel}` — date du call de validation
- `{Profil}` — Force / Hypertrophie / Performance
- `{Niveau}` — Débutant / Intermédiaire / Avancé
- `{DateDébut}` — date prévue de démarrage
- `{Mois1}` `{Mois2}` `{Mois3}` — premiers mois (ex: "juin", "juillet")

---

## 📧 1. Email de validation (post-call → tu es pris)

**Objet** : `Méthode RB Perform — ta candidature est validée`

**Corps** :

```
Salut {Prénom},

Suite à notre échange du {DateAppel}, je valide ta candidature pour la Méthode RB Perform.

Tu rentres sur le profil **{Profil}**, niveau **{Niveau}**.

————————————————————————————————

POUR DÉMARRER

Premier virement à effectuer dès aujourd'hui :

  • Montant         : 300,00 €
  • Bénéficiaire    : Rayan Bonte
  • IBAN            : FR76 XXXX XXXX XXXX XXXX XXXX XXX
  • BIC             : XXXXFRXX
  • Mention OBLIGATOIRE : RBPerform-Methode-{Prénom}

⚠ La mention est obligatoire — sans elle ton paiement ne peut pas être rattaché à ton dossier.

————————————————————————————————

CE QUE TU ACCEPTES EN VIREMENT

L'envoi du virement avec la mention exacte vaut acceptation des Conditions de Vente
de la Méthode RB Perform :

  → https://rbperform.app/legal#cgu-methode

Points clés à connaître avant le virement :
  • Engagement minimum : 3 mois consécutifs ({Mois1} · {Mois2} · {Mois3})
  • Reconduction tacite mensuelle après les 3 mois, résiliable avec préavis 15j
  • Tu suis la méthode en autonomie — RB Perform n'est pas un encadrement sportif
  • Certificat médical de non-contre-indication obligatoire de ton côté
  • Renonciation au droit de rétractation 14j (service numérique exécution immédiate)

————————————————————————————————

APRÈS RÉCEPTION DU VIREMENT

Sous 24h après réception, tu reçois :
  1. Tes accès à l'app RB Perform (lien magique par email)
  2. Le programme {Profil} niveau {Niveau} pré-chargé sur ton compte
  3. L'accès messagerie pour clarifications
  4. Ton créneau pour le call mensuel de clarification

————————————————————————————————

Une question avant le virement → réponds à ce mail.

À très vite,
Rayan
```

---

## 📧 2. Email de refus (poliment)

**Objet** : `Méthode RB Perform — retour sur ta candidature`

**Corps** :

```
Salut {Prénom},

Merci pour le temps que tu as pris à candidater à la Méthode RB Perform et pour notre échange du {DateAppel}.

Après réflexion, je ne te valide pas pour cette session.

Ce n'est pas un jugement sur ton sérieux — la Méthode est calibrée pour des profils précis,
et à ce stade je préfère être honnête plutôt que de t'embarquer si je ne suis pas sûr de pouvoir
te servir comme tu le mérites.

Quelques pistes selon ce qu'on a évoqué :

  • [À personnaliser : ex. "commencer par stabiliser tes 3 séances/semaine pendant 8 semaines"]
  • [À personnaliser : ex. "consulter un kiné pour ta blessure avant tout programme intensif"]
  • [À personnaliser : ex. "te lancer en autonomie avec mes contenus gratuits Insta @rb_perform"]

Si ta situation évolue dans 3-6 mois, n'hésite pas à recandidater.

Bonne continuation,
Rayan
```

---

## 📧 3. Email de bienvenue (après réception du virement)

**Objet** : `Bienvenue dans la Méthode RB Perform · tes accès`

**Corps** :

```
Salut {Prénom},

Virement bien reçu. Le contrat est officiellement formé — bienvenue dans la Méthode.

————————————————————————————————

TES ACCÈS

  • App RB Perform     : https://rbperform.app/login
  • Email de connexion : {EmailDuCandidat}
  • Profil chargé      : {Profil} niveau {Niveau}
  • Démarrage prévu    : {DateDébut}

Lien magique pour ta première connexion (clique avant 24h) :
  → [À générer via Supabase Auth → magic link]

————————————————————————————————

CE QUE TU AS DÈS AUJOURD'HUI

  ✓ Programme {Profil} 12 semaines, structuré et chargé sur ton compte
  ✓ Calculateur de macros calibré sur ton profil
  ✓ Tracking sommeil + récupération
  ✓ Framework supplémentation
  ✓ Messagerie 7j/7 pour tes clarifications (réponse async sous 2h en semaine)

————————————————————————————————

LE CALL MENSUEL DE CLARIFICATION

30 min en visio, une fois par mois, pour faire le point sur ton ressenti et orienter ton profil.
Ce call NE remplace PAS un suivi sportif — c'est une discussion sur la méthode et ton orientation.

Ton premier call : [Lien Calendly à insérer]

————————————————————————————————

RAPPEL IMPORTANT (santé)

Tu as accepté en démarrant que :
  • Tu disposes d'un certificat médical de non-contre-indication en cours de validité
  • Tu suis la méthode en autonomie sous ta propre responsabilité
  • Tu arrêtes immédiatement si douleur ou symptôme anormal et consultes ton médecin

————————————————————————————————

PROCHAINS VIREMENTS

Mêmes coordonnées, même mention, le 1er de chaque mois pendant les 3 mois minimum.

Allez, on se met au travail.

Rayan
```

---

## 📧 4. Email de relance avant échéance (J-3 du virement mensuel)

**Objet** : `Méthode RB Perform — virement mensuel à venir le {DateÉchéance}`

**Corps** :

```
Salut {Prénom},

Petit rappel — ton virement mensuel pour la Méthode RB Perform est à effectuer le {DateÉchéance}.

  • Montant      : 300,00 €
  • Bénéficiaire : Rayan Bonte
  • IBAN         : FR76 XXXX XXXX XXXX XXXX XXXX XXX
  • Mention      : RBPerform-Methode-{Prénom}

Pas besoin de me confirmer, je vois passer le virement de mon côté.

————————————————————————————————

Ce mois fait partie de la période d'engagement minimum de 3 mois ({Mois}/3).

À tout moment après les 3 mois, tu peux résilier avec un préavis de 15 jours
en répondant simplement à ce mail.

————————————————————————————————

Une question sur ton programme → écris-moi dans la messagerie de l'app.

Rayan
```

---

## 📧 5. Email de résiliation (réception)

**Objet** : `Méthode RB Perform — confirmation de résiliation`

**Corps** :

```
Salut {Prénom},

Bien reçu ta demande de résiliation.

  • Dernière échéance facturée : {DateDernièreÉchéance}
  • Fin d'accès à la Méthode    : {DateFin}
  • Tes données restent accessibles 30 jours après cette date pour export
    depuis l'app (Settings → Mon compte → Exporter mes données)

Pas de rancune, tu as fait ce qui est juste pour toi.

Si la situation évolue dans le futur, tu sais où me trouver.

Bonne route,
Rayan
```

---

## 📋 Checklist pré-envoi (validation)

Avant d'envoyer le mail #1, vérifie :

- [ ] Le candidat a passé le call de 30 min visio
- [ ] Tu as collecté son **prénom + email + objectif**
- [ ] Tu as choisi son **profil** (Force / Hypertrophie / Performance)
- [ ] Tu as choisi son **niveau** (Débutant / Intermédiaire / Avancé)
- [ ] Le candidat a confirmé qu'il a un certificat médical de non-contre-indication
- [ ] Tu as ton **RIB** à jour dans le template
- [ ] Le profil a une **place disponible** (max 5 personnes simultanées)

## 📋 Checklist pré-envoi (refus)

Avant d'envoyer le mail #2, vérifie :

- [ ] Tu as 1-2 raisons concrètes (sans les divulguer dans le mail si elles sont sensibles)
- [ ] Tu proposes au moins 1 piste alternative pour ne pas laisser le candidat dans le néant
- [ ] Tu n'as pas mentionné un autre coach concurrent par nom (politesse pro)

---

## 🛠 Comment customiser

**Pour gagner du temps** (10 candidats/mois × 5 min par mail = 1h économisée) :

1. Ouvre Gmail → **Paramètres** → **Avancé** → active "Modèles" (Templates)
2. Crée un nouveau brouillon vide
3. Colle le template
4. **Plus** → **Modèles** → **Enregistrer le brouillon comme modèle** → nomme-le ("Validation Méthode")
5. Pour la prochaine validation : nouveau mail → **Plus** → **Modèles** → choisi le bon → remplace les `{...}` → envoie

Same dans Outlook → "Quick Parts" / "Modèles".

---

## ⚠ Rappels juridiques importants

- **Ne jamais** envoyer un email qui appelle l'utilisateur "client" avant le 1er virement reçu (avant ça, c'est un "candidat")
- **Ne jamais** utiliser le mot "coach" dans tes emails pro tant que CQP ALS pas validé
- **Toujours** mentionner le numéro d'engagement (mois 1/3, 2/3, 3/3) dans les emails de relance pour preuve de l'information continue
- **Garder** les preuves : tous tes emails envoyés dans Gmail = preuve juridique en cas de litige
- En cas de litige, droit français + tribunaux d'Avignon (cf. Article 03.C dispositions communes)
