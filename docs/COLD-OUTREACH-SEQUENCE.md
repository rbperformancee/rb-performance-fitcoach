# Cold Outreach — Séquence 3 emails pour coachs sportifs FR

**Déjà wirée côté tech :** `api/cron/cold-outreach.js` gère l'envoi J+0 / J+3 / J+7 automatiquement via Zoho SMTP. Ce doc est la **copy** de référence — copie-colle dans les prompts d'ingestion de la table `cold_outreach_prospects`.

**Profil cible :** coach sportif FR indépendant, 5-25 clients, usage Excel ou Trainerize (peu satisfaits), présence Insta 1k-20k.

**Source des leads :** scraping manuel @profiles coaching + Insta search + bouche-à-oreille. Taille test : 50 prospects pour la 1re vague.

---

## Email 1 — J+0 : Le hook honnête

**Subject** : `{{firstName}}, 2 min ?`

**Alt subjects A/B :**
- `{{firstName}}, une question rapide sur ton setup`
- `{{firstName}}, tu utilises encore Excel ?`

**Corps :**

```
Salut {{firstName}},

J'ai vu {{specificInsta}} — {{compliment_specifique_sur_son_post_recent}}.

Je suis coach sportif aussi, basé à Avignon (84). J'ai buildé un outil
pour moi-même cette année parce que je perdais 2-3 clients par mois sans
les voir partir. Je demande pas si tu es intéressé — je demande juste
comment tu gères aujourd'hui :

- Tu as combien de clients en ce moment ?
- Tu utilises quoi pour suivre leurs progrès ? (Excel, Trainerize,
  autre ?)
- Qu'est-ce qui te saoule le plus dans ton setup actuel ?

Pas besoin de répondre long — une ligne par point me suffit. Si tu as 30s
pour me répondre, je te montre ce que j'ai buildé — tu me dis si ça te
parle. Sinon, ignore ce mail, pas de relance automatique prévue côté
CRM (c'est moi qui écris).

Rayan
instagram.com/rb_perform
```

---

## Email 2 — J+3 : Le cas concret (si pas de réponse J+0)

**Subject** : `{{firstName}}, un exemple concret`

**Corps :**

```
{{firstName}},

Tu n'as pas eu le temps de répondre, c'est ok. Au cas où ça t'intéresse,
un exemple vite fait :

Il y a 2 mois, un de mes clients a arrêté de logger ses séances pendant
6 jours. Avant, j'aurais rien vu — j'aurais découvert qu'il partait
après coup. Là, l'outil m'a envoyé une alerte lundi matin avec un score
de 72% de probabilité de départ, et un message pre-rédigé que j'ai
envoyé en 10 secondes.

Il a répondu dans l'heure, m'a dit qu'il traversait une semaine compliquée
au boulot, on a réajusté le programme, il est encore là.

Ça c'est 150€/mois qui ne sont pas partis. Le genre de choses qui me
faisait perdre 2-3 clients par mois, et que je récupère maintenant sans
y penser.

Si tu veux que je te montre ça en 10 min vidéo (pas de slide, juste mon
écran), dis-moi 3 créneaux cette semaine.

Rayan
```

---

## Email 3 — J+7 : Le dernier contact (si toujours pas de réponse)

**Subject** : `{{firstName}}, je range ton nom`

**Corps :**

```
{{firstName}},

Dernier mail, promis.

J'ouvre 30 places founder cette semaine sur RB Perform — 199€/mois
verrouillé à vie, accès WhatsApp direct avec moi pendant 90 jours. Après
ces 30, l'offre disparaît et le prix public passe à 299€ puis 499€.

Je te l'écris pas pour te pousser — si tu es pas prêt, tu es pas prêt.
Je range juste ton nom au cas où tu changes d'avis dans 3 mois.

Si tu veux voir à quoi ça ressemble sans engagement :
→ rbperform.app/founding (la page qui explique l'offre)
→ rbperform.app/demo (la démo interactive, 15 min max)

Si tu préfères qu'on en parle de vive voix, je suis là : WhatsApp
{{ton_numero}} ou réponse directe à ce mail.

Sinon, bonne route avec ton setup actuel — sincèrement.

Rayan
rayan@rbperform.com
instagram.com/rb_perform
```

---

## Objet principal de la séquence

**Réel objectif : obtenir une conversation.** Pas une vente directe.
- Un « ok montre-moi » → appel vidéo → démo → 30% convertissent
- Un « non merci » → CRM status `declined`, on ne relance pas avant 6 mois
- Un silence complet → CRM status `cold`, on remet dans le pipeline dans 3 mois

Le cron `api/cron/cold-outreach.js` gère déjà la transition de status
via le champ `sent_1 → sent_2 → sent_3 → expired`. Un prospect qui
répond à n'importe lequel des 3 emails doit **manuellement** être passé
à `in_conversation` pour couper la séquence.

---

## Checklist avant d'ajouter un prospect à la table

- [ ] Email vérifié (hunter.io, neverbounce, ou ping manuel)
- [ ] Insta actif, ≥ 3 posts dans les 30 derniers jours
- [ ] Compliment spécifique écrit (pas « j'aime ton contenu » — trop lâche)
- [ ] Pas déjà dans la waitlist / Founder
- [ ] Pas de relation personnelle directe (ceux-là, message privé Insta à la main, pas email froid)

---

## KPIs séquence (cibles 1re vague de 50)

| Metric | Cible | Alert si |
|---|---|---|
| Taux d'ouverture email 1 | ≥ 45% | < 30% → subject line à retravailler |
| Taux de réponse total séquence | ≥ 15% | < 8% → ICP mal défini |
| Taux de conversion réponse → appel | ≥ 40% | < 25% → email trop vendeur |
| Unsubscribe ou "stop" | < 5% | > 10% → ton trop intrusif, revoir email 1 |

---

**Version :** 1.0 — 2026-04-25
