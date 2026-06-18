# 🎫 Apple Support Case — DSA Trader Status FR

## Case info

| Champ | Valeur |
|---|---|
| **Case number** | `102919214420` |
| **Submitted** | 2026-06-18 |
| **Topic** | Distribution > Autres questions de distribution |
| **Apple ID concerné** | 6776260337 (RB perform) |
| **SLA Apple promise** | 2 jours ouvrés (donc réponse attendue d'ici le **2026-06-20**) |
| **Status local** | Sent, waiting Apple |

## Pourquoi ce ticket existe

- App approuvée le 17/06 (v1.0.4) MAIS bloquée dans 27 territoires UE
- contentStatuses FR = `["TRADER_STATUS_NOT_PROVIDED"]`
- Trader Status soumis le 04/06 → "En cours de vérification" depuis 14 jours
- Hors fourchette normale (généralement < 14j)

## Plan de suivi

### J0 (18/06) — fait
- [x] Ticket envoyé via developer.apple.com/contact
- [x] Case number reçu et archivé : 102919214420
- [x] W-8BEN signé (pour 0% retenue source future)
- [ ] Vérifier ce qui se passe dans la boîte mail rayan.b2701@gmail.com sous 24h

### J+1 (19/06) — surveillance
- Check mail Apple : réponse intermédiaire / demande d'infos / escalade ?
- Check ASC : contentStatuses FR a-t-il bougé ?

### J+2 (20/06) — DEADLINE Apple SLA
- Si pas de réponse → relance par mail sur la conversation ouverte (case 102919214420)
- Si pas de retour → phone support (developer.apple.com/contact/phone)

### J+3 à J+5
- Si toujours nada → re-soumettre Trader Status (parfois ça réveille la queue)
- Considérer escalade Twitter/X @AppStoreConnect avec mention du case number

## Phone support (plan B)

URL : https://developer.apple.com/contact/phone/
Choisis France → numéro français
Heures : Lun-Ven 9h-17h

Script court :
> "Bonjour, je veux escalader le case 102919214420. App ID 6776260337 'RB perform'.
> Mon Trader Status DSA est en review depuis 14 jours, mon app est approuvée mais
> bloquée en UE. C'est critique pour mon launch cette semaine. Pouvez-vous escalader ?"

## Indicateur de succès

`node scripts/asc-fr-deep-check.js` doit faire passer FR de :
```
FRA: ⏳ ["TRADER_STATUS_NOT_PROVIDED"]
```
à :
```
FRA: ✅ ["AVAILABLE"]
```

Et la page `https://apps.apple.com/fr/app/id6776260337` doit passer de **HTTP 404** à **HTTP 200**.
