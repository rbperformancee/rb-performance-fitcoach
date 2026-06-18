# 🧾 Setup Stripe — redirection vers /post-vente

Pour que le funnel boucle proprement, le checkout Stripe doit rediriger vers `/post-vente` après paiement réussi.

## 🎯 Objectif

Quand un athlète paie via le lien Stripe que tu lui envoies au call (ou par WhatsApp), Stripe doit :
1. Confirmer le paiement
2. Rediriger automatiquement vers `https://rbperform.app/post-vente`
3. L'athlète tombe sur la page welcome avec ta vidéo + roadmap 30 jours

---

## ✅ Option A — Via le Dashboard Stripe (le plus simple)

Si tu utilises des **Payment Links** Stripe (le truc qu'on génère sur dashboard.stripe.com et qu'on partage par WhatsApp) :

1. Va sur https://dashboard.stripe.com/payment-links
2. Édite ou crée un Payment Link pour RB Perform PRO
3. Section **"Confirmation page"** → choisis **"Don't show confirmation page"**
4. Active **"Redirect customers to your website"**
5. Mets : `https://rbperform.app/post-vente?session_id={CHECKOUT_SESSION_ID}`

→ Fait. Tous les paiements via ce link redirigent vers ta page welcome.

---

## ✅ Option B — Via l'API Stripe (si tu génères les sessions dynamiquement)

Si tu crées les checkout sessions via code (`stripe.checkout.sessions.create()`), tu passes :

```js
const session = await stripe.checkout.sessions.create({
  // ... autres params
  success_url: 'https://rbperform.app/post-vente?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://rbperform.app/candidature',
});
```

---

## 🔐 Option C — Webhook + onboarding automatique (PRO mais plus complexe)

Si tu veux automatiser plus loin (créer le compte client en DB, envoyer le WhatsApp welcome, générer le programme initial), il faut un webhook Stripe.

**Pas urgent pour le launch.** Tu peux commencer avec Option A et améliorer plus tard.

Si tu veux le webhook plus tard, voilà le squelette :

```js
// api/stripe-webhook.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // 1. Update coaching_applications status = paid
    // 2. Send WhatsApp welcome via Twilio
    // 3. Create user in Supabase
    // 4. Log dans CRM
  }

  res.json({ received: true });
}
```

---

## 📋 Ce qu'il faut faire MAINTENANT

- [ ] Édite ton Payment Link RB Perform PRO sur dashboard.stripe.com
- [ ] Set `success_url` = `https://rbperform.app/post-vente?session_id={CHECKOUT_SESSION_ID}`
- [ ] Teste avec un paiement à 1€ (tu peux mettre une promo 99% temporaire)
- [ ] Vérifie que la redirection vers `/post-vente` marche

---

## 📞 Si tu envoies un lien Stripe via WhatsApp pendant le call

Workflow recommandé :

1. Tu finis ton pitch sur le call, le prospect dit "go"
2. Tu copies le Payment Link Stripe RB Perform PRO (déjà préparé avec redirect /post-vente)
3. Tu colles dans le WhatsApp du prospect
4. Il paie sur son tel → Stripe redirige automatiquement vers /post-vente
5. Il voit ta vidéo welcome + la roadmap 30 jours
6. T'as gagné 5 minutes d'explications post-paiement
