# DMARC Playbook — RB Perform

État au 2026-05-09 :

```
DMARC : v=DMARC1; p=none; rua=mailto:rayan@rbperform.app; pct=100
SPF   : v=spf1 include:zohomail.eu include:_spf.resend.com ~all
DKIM  : ABSENT ❌
```

⚠️ **Durcir DMARC sans DKIM = tous les emails en spam.** Procédure obligatoire en 3 étapes.

---

## Étape 1 — Setup DKIM Resend (À FAIRE MAINTENANT)

1. Connecte-toi sur [resend.com/domains](https://resend.com/domains)
2. Vérifie que `rbperform.app` est listé. Si non → "Add domain"
3. Resend te donne 3 records à ajouter dans ton DNS (OVH/Cloudflare) :

   | Type  | Name                              | Value                            |
   |-------|-----------------------------------|----------------------------------|
   | MX    | send.rbperform.app                | feedback-smtp.eu-west-1.amazonses.com (priority 10) |
   | TXT   | send.rbperform.app                | v=spf1 include:amazonses.com ~all |
   | TXT   | resend._domainkey.rbperform.app   | (clé publique RSA fournie par Resend) |

4. Dans OVH/Cloudflare → Zone DNS → ajoute les 3 records ci-dessus
5. Reviens sur Resend → "Verify DNS records" → attends ~10 min → ✓

**Vérification** :
```bash
dig +short TXT resend._domainkey.rbperform.app
# Doit retourner une longue clé RSA "k=rsa; p=MIIB..."
```

---

## Étape 2 — Setup DKIM Zoho (si encore utilisé)

Si Zoho est encore actif (l'app référence `ZOHO_SMTP_USER`) :

1. [mailadmin.zoho.eu](https://mailadmin.zoho.eu) → Domains → rbperform.app → DKIM
2. Génère la clé pour le sélecteur `zoho`
3. Ajoute en DNS :

   | Type | Name                          | Value (fourni par Zoho) |
   |------|-------------------------------|--------------------------|
   | TXT  | zoho._domainkey.rbperform.app | v=DKIM1; k=rsa; p=...    |

4. Zoho admin → "Verify DKIM" → ✓

⚠️ Si Zoho n'est plus utilisé : **retire `include:zohomail.eu` du SPF** pour pas autoriser un sender mort. Nouveau SPF :
```
v=spf1 include:_spf.resend.com include:amazonses.com ~all
```

---

## Étape 3 — Durcissement DMARC progressif

**Calendrier recommandé** (assume launch 2026-05-26) :

| Date           | DMARC record                                                                                       | Comportement                          |
|----------------|----------------------------------------------------------------------------------------------------|---------------------------------------|
| Aujourd'hui    | `v=DMARC1; p=none; rua=mailto:rayan@rbperform.app; pct=100` (déjà set)                             | Observation, rapports                 |
| **J+7 (2026-06-02)**  | `v=DMARC1; p=quarantine; pct=10; rua=mailto:rayan@rbperform.app`                                | Spam pour 10% des emails non-DKIM     |
| **J+14 (2026-06-09)** | `v=DMARC1; p=quarantine; pct=50; rua=mailto:rayan@rbperform.app`                                | Spam pour 50%                         |
| **J+21 (2026-06-16)** | `v=DMARC1; p=quarantine; pct=100; rua=mailto:rayan@rbperform.app`                               | Tout email non-DKIM → spam            |
| **J+30 (2026-06-25)** | `v=DMARC1; p=reject; pct=100; rua=mailto:rayan@rbperform.app; ruf=mailto:rayan@rbperform.app`   | Reject pur (mail bounce)              |

**À chaque palier** :
1. Modifier le record TXT `_dmarc.rbperform.app` dans OVH/Cloudflare
2. Vérifier 24h après : `dig +short TXT _dmarc.rbperform.app`
3. Lire les rapports `rua` reçus dans `rayan@rbperform.app` (XML — utilise [dmarcian.com](https://dmarcian.com) pour parser gratuit)
4. Si trop de fails légitimes → reculer d'un palier, identifier le sender oublié

---

## Étape 4 — Outils de monitoring (optionnels mais recommandés)

- **[dmarcian.com](https://dmarcian.com)** — parse les rapports XML gratuits jusqu'à 100k mails/mois
- **[postmarkapp.com/dmarc](https://postmarkapp.com/dmarc)** — alternative gratuite, plus simple
- Active reporting forensique (ruf=) seulement après le palier reject pour pas crasher ta inbox

---

## Liens directs

- DNS rbperform.app sur OVH : [Manager OVH](https://www.ovh.com/manager/web/#/zone/rbperform.app)
- Resend domains : [resend.com/domains](https://resend.com/domains)
- DMARC current value : `dig +short TXT _dmarc.rbperform.app`
- SPF current value   : `dig +short TXT rbperform.app | grep spf`
- Test email Resend   : [resend.com/emails](https://resend.com/emails)
