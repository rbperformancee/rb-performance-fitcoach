# Témoignages Founder — Process de collecte + injection landing

**Règle d'or :** jamais de témoignage inventé, jamais de quote approximative, jamais sans autorisation écrite.

---

## Timing : quand demander

- **J+30** après l'activation Founder — l'email `founder_checkin_j30`
  (cron `api/cron-founder-checkin.js`) propose déjà 2 trucs, dont l'enregistrement d'un témoignage de 60s en échange de :
  - logo sur landing
  - mention dans le prochain Reel Instagram
  - (optionnel) offre parrainage

- **Cas idéal** : le coach a déjà parlé de RB Perform sur son Insta spontanément. Tu t'appuies sur ça.

- **Cas neutre** : il n'a rien posté. Tu demandes direct : « Tu me fais 60s vidéo ? »

- **Cas mou** : il ne réponds pas à J+30. Tu relances une fois à J+60 MANUELLEMENT. Pas de cron pour ça — si à J+60 tu n'as pas de momentum, le témoignage ne viendra pas de toi.

---

## Les 3 questions à lui envoyer (par mail, pour qu'il ait le temps de réfléchir)

Copie-colle dans ton mail de relance :

```
Voici 3 questions — tu réponds en vidéo (front cam iPhone OK) ou en
texte, comme tu préfères :

1. Qu'est-ce qui ne marchait PAS avec ton setup d'avant RB Perform ?
   (2 phrases max — le plus spécifique possible)

2. Qu'est-ce qui a CHANGÉ concrètement depuis que tu utilises RB Perform ?
   (si tu as un chiffre, même approximatif : client sauvé, MRR, heures
   gagnées, etc., c'est parfait)

3. À quel type de coach tu le recommandes (et à quel type tu le
   recommandes PAS) ?

Ensuite, deux autorisations simples :
[ ] OK pour afficher ton nom + ta ville + ta photo (ou ton logo) sur la
    landing rbperform.app
[ ] OK pour que je te cite dans un Reel Insta @rb_perform (durée ≤ 15s)
```

---

## Qualité minimum avant d'afficher sur la landing

| Critère | OK si |
|---|---|
| Spécifique | Mentionne UN chiffre OU UN moment précis |
| Pas générique | Pas « super outil, je recommande ». Trop vide. |
| Reconnaissable | Vraie personne — nom + ville + Insta/site |
| Autorisation écrite | Dans un mail ou un DM, peu importe, tant que c'est tracé |

Si la réponse est molle (« ouais c'est cool, je kiffe »), relance-le une fois : « Tu me donnes un exemple concret ? » et transforme ça en 2 phrases solides.

---

## Injection dans landing.html — template prêt

Actuellement la classe `.testimonial` existe en CSS (lignes 446+) mais n'est pas utilisée dans le body. Quand tu as ton premier témoignage validé, injecte ce bloc **juste avant la section `.pricing`** (autour de la ligne 2800) :

```html
<!-- ========== TESTIMONIAL ========== -->
<section class="testimonial" id="testimonial">
  <div class="testimonial-bg">"</div>
  <div class="testimonial-content">
    <p class="testimonial-quote">
      « {{CITATION_COACH}} »
    </p>
    <div class="testimonial-author">
      <b>{{PRENOM_NOM}}</b> — {{VILLE}} · Coach sportif · <a href="https://instagram.com/{{INSTA_HANDLE}}" target="_blank" rel="noopener noreferrer" style="color:inherit;border-bottom:.5px solid currentColor">@{{INSTA_HANDLE}}</a>
    </div>
  </div>
</section>
```

Exemple rempli (fictif, pour illustration) :

```html
<p class="testimonial-quote">
  « J'ai récupéré 3 clients sur 4 qui allaient partir en décembre grâce aux alertes. +450€/mois que je n'avais pas avant. »
</p>
<div class="testimonial-author">
  <b>Kevin Martin</b> — Lyon · Coach sportif · <a href="https://instagram.com/kevinmartin_coach" target="_blank" rel="noopener noreferrer">@kevinmartin_coach</a>
</div>
```

---

## Checklist d'injection technique

Quand tu injectes, garde ces règles :

- [ ] Citation ≤ 180 caractères (au-delà, la typo Bebas Neue casse visuellement)
- [ ] Prénom + Nom complet visible (pas juste un prénom anonyme)
- [ ] Ville réelle (crédibilise, localise)
- [ ] Lien Insta `target="_blank" rel="noopener noreferrer"` (déjà enforcé par check-deploy)
- [ ] Pas de balise `<script>` injectée via les variables — fais de l'`esc()` si tu n'es pas sûr
- [ ] Commit message : `feat(landing): add testimonial from {{firstName}} ({{ville}})`
- [ ] Si le coach fournit une photo : upload dans `public/images/testimonials/{{slug}}.webp` et ajoute un `<img>` 80×80 circle à gauche de `.testimonial-author`

---

## Schema.org Review (bonus SEO — à ajouter quand ≥ 3 testimonials)

Dans le bloc JSON-LD existant de landing.html (`@graph`), ajoute :

```json
{
  "@type":"Review",
  "itemReviewed":{"@id":"https://rbperform.app/#org"},
  "reviewRating":{"@type":"Rating","ratingValue":"5","bestRating":"5"},
  "author":{"@type":"Person","name":"{{PRENOM_NOM}}"},
  "reviewBody":"{{CITATION_COACH}}",
  "datePublished":"{{YYYY-MM-DD}}"
}
```

Ça peut déclencher un "Rich Review" snippet dans Google SERP.

---

## Bibliothèque — template Reel Instagram pour le témoignage

Voir [`docs/INSTAGRAM-REEL-SCRIPTS.md`](./INSTAGRAM-REEL-SCRIPTS.md) pour la trame. Le témoignage devient le 6e Reel une fois collecté (montage split-screen : coach en bas, dashboard en haut).

---

## Anti-patterns à éviter

- ❌ Fake testimonial (« Kevin M. » avec photo stock) — tu vas te faire cramer par un regard attentif + c'est illégal
- ❌ Paraphraser sans l'accord — mot pour mot ou rien
- ❌ Témoignage de ta mère / meilleur ami — conflict of interest évident
- ❌ Mettre un testimonial qui n'a pas de chiffre alors qu'un concurrent en aura

---

**Version :** 1.0 — 2026-04-25
**Next review :** après le 1er témoignage Founder reçu.
