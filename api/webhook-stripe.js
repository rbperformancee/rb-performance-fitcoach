/**
 * POST /api/webhook-stripe
 *
 * Webhook Stripe — écoute les événements de paiement.
 * Crée automatiquement le compte coach dans Supabase après paiement.
 *
 * Events gérés :
 *   - checkout.session.completed → crée le coach
 *   - customer.subscription.deleted → désactive le coach
 *
 * Env vars :
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel envoie le body brut si on désactive le bodyParser
module.exports.config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err) {
        console.error('[webhook] Signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } else {
      // Dev mode — pas de vérification de signature
      event = JSON.parse(rawBody.toString());
      console.warn('[webhook] No STRIPE_WEBHOOK_SECRET — skipping signature check');
    }

    console.log(`[webhook] Event: ${event.type}`);

    // ===== CHECKOUT COMPLETED — CRÉER LE COACH =====
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const metadata = session.subscription_data?.metadata || session.metadata || {};
      const plan = metadata.plan || metadata.founding_coach === 'true' ? 'founding' : 'pro';
      const lockedPrice = metadata.locked_price || null;

      if (!email) {
        console.error('[webhook] No email in checkout session');
        return res.status(400).json({ error: 'No email' });
      }

      console.log(`[webhook] New coach: ${email}, plan: ${plan}`);

      // 1. Vérifier si le user existe déjà dans Supabase Auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase());

      let userId;

      if (existingUser) {
        userId = existingUser.id;
        console.log(`[webhook] User exists: ${userId}`);
      } else {
        // 2. Créer le user dans Supabase Auth (sans mot de passe — il le définira)
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          email_confirm: true, // Email déjà confirmé (il a payé)
          user_metadata: { role: 'coach', plan },
        });

        if (authError) {
          console.error('[webhook] Auth create error:', authError.message);
          return res.status(500).json({ error: authError.message });
        }

        userId = newUser.user.id;
        console.log(`[webhook] User created: ${userId}`);
      }

      // 3. Créer/updater l'entrée dans la table coaches
      const { error: coachError } = await supabase.from('coaches').upsert({
        id: userId,
        email: email.toLowerCase(),
        plan: plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        locked_price: lockedPrice,
        is_active: true,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (coachError) {
        console.error('[webhook] Coach upsert error:', coachError.message);
      }

      // 4. Générer le lien de récupération (= créer mot de passe)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rbperform.app'}/login?welcome=true`,
        },
      });

      if (linkError) {
        console.error('[webhook] Generate link error:', linkError.message);
      }

      // 5. Log le lien (en prod, envoyer par email via Resend/SendGrid)
      if (linkData?.properties?.action_link) {
        console.log(`[webhook] Password setup link for ${email}: ${linkData.properties.action_link}`);
        // TODO: Envoyer l'email de bienvenue avec ce lien
        // await sendWelcomeEmail(email, linkData.properties.action_link);
      }

      return res.status(200).json({ ok: true, userId, plan });
    }

    // ===== SUBSCRIPTION DELETED — DÉSACTIVER LE COACH =====
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { error } = await supabase
        .from('coaches')
        .update({ is_active: false })
        .eq('stripe_customer_id', customerId);

      if (error) console.error('[webhook] Deactivate error:', error.message);
      else console.log(`[webhook] Coach deactivated: ${customerId}`);

      return res.status(200).json({ ok: true });
    }

    // Event non géré — acknowledge quand même
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[webhook] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
