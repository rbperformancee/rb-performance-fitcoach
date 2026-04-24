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

const getStripe = require('./_stripe');
const { createClient } = require('@supabase/supabase-js');

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase env vars not configured');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ===== Welcome email via Resend =====
const PLAN_LABEL = {
  founding: 'Founder',
  founder: 'Founder',
  starter: 'Starter',
  pro: 'Pro',
  elite: 'Elite',
};

function buildWelcomeSubject(plan) {
  const label = PLAN_LABEL[plan] || 'RB Perform';
  if (plan === 'founding' || plan === 'founder') {
    return `Bienvenue parmi les Founders — finalise ton acces`;
  }
  return `Bienvenue sur RB Perform ${label} — finalise ton acces`;
}

function buildWelcomeHtml({ plan, lockedPrice, actionLink }) {
  const label = PLAN_LABEL[plan] || 'RB Perform';
  const isFounder = plan === 'founding' || plan === 'founder';
  const lockNote = isFounder && lockedPrice
    ? `<div style="margin-top:18px;padding:12px 16px;background:rgba(2,209,186,0.06);border:1px solid rgba(2,209,186,0.2);border-radius:10px;font-size:12px;color:rgba(255,255,255,0.65);line-height:1.5">
         <strong style="color:#02d1ba">Ton prix est verrouille a vie : ${lockedPrice}EUR/mois.</strong><br>
         Meme si RB Perform passe a 299EUR puis 499EUR, ton tarif ne bougera pas.
       </div>`
    : '';

  const heroLine = isFounder
    ? `Tu fais partie des <span style="color:#02d1ba">30 fondateurs</span>.`
    : `Ton acces <span style="color:#02d1ba">${label}</span> est pret.`;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%">
  <tr><td align="center" style="padding-bottom:24px">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px">Acces ${label}</div>
    <div style="font-size:24px;font-weight:900;color:#f0f0f0;letter-spacing:-1px">RB<span style="color:#02d1ba">.</span>Perform</div>
  </td></tr>
  <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">${heroLine}</div>
    <p style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 24px">
      Ton paiement est confirme. Il ne te reste plus qu'a definir ton mot de passe pour acceder a ton dashboard coach.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${actionLink}" style="display:inline-block;background:#02d1ba;color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:100px;letter-spacing:.06em;text-transform:uppercase">Finaliser mon acces</a>
    </div>
    <p style="font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;margin:0 0 8px;text-align:center">
      Ce lien est valable 24 heures. Au-dela, demande un nouveau lien sur <a href="https://rbperform.app/login" style="color:#02d1ba;text-decoration:none">rbperform.app/login</a>.
    </p>
    ${lockNote}
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.2);line-height:1.6">
      Une question ? Reponds a cet email ou ecris-nous a<br>
      <a href="mailto:rb.performancee@gmail.com" style="color:rgba(2,209,186,0.6);text-decoration:none">rb.performancee@gmail.com</a>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

async function sendWelcomeEmail({ to, plan, lockedPrice, actionLink }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[webhook] RESEND_API_KEY missing, cannot send welcome email');
    return { ok: false, reason: 'no_key' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RB Perform <noreply@rbperform.com>',
        to: [to],
        subject: buildWelcomeSubject(plan),
        html: buildWelcomeHtml({ plan, lockedPrice, actionLink }),
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[webhook] Resend failed', res.status, txt.slice(0, 300));
      return { ok: false, reason: `http_${res.status}` };
    }
    const body = await res.json().catch(() => ({}));
    console.log('[webhook] Welcome email sent to', to, 'id:', body.id);
    return { ok: true, id: body.id };
  } catch (e) {
    console.error('[webhook] Resend exception:', e.message);
    return { ok: false, reason: 'exception' };
  }
}

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

    if (!webhookSecret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET missing — rejecting');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    try {
      event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`[webhook] Event: ${event.type}`);

    // ===== CHECKOUT COMPLETED — CRÉER LE COACH =====
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const metadata = session.subscription_data?.metadata || session.metadata || {};
      // Without parens, `||` + `===` + ternary misgrouped → every paid coach becomes 'founding'.
      const plan = metadata.plan || (metadata.founding_coach === 'true' ? 'founding' : 'pro');
      const lockedPrice = metadata.locked_price || null;

      if (!email) {
        console.error('[webhook] No email in checkout session');
        return res.status(400).json({ error: 'No email' });
      }

      console.log(`[webhook] New coach: ${email}, plan: ${plan}`);

      // 1. Vérifier si le user existe déjà dans Supabase Auth
      const { data: existingUsers } = await getSupabase().auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase());

      let userId;

      if (existingUser) {
        userId = existingUser.id;
        console.log(`[webhook] User exists: ${userId}`);
      } else {
        // 2. Créer le user dans Supabase Auth (sans mot de passe — il le définira)
        const { data: newUser, error: authError } = await getSupabase().auth.admin.createUser({
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
      const { error: coachError } = await getSupabase().from('coaches').upsert({
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
      const { data: linkData, error: linkError } = await getSupabase().auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rbperform.app'}/login?welcome=true`,
        },
      });

      if (linkError) {
        console.error('[webhook] Generate link error:', linkError.message);
      }

      // 5. Send welcome email via Resend with the password setup link.
      // If Resend fails, we still 200 to Stripe (the coach row exists;
      // we can re-send the magic link manually from Vercel logs).
      if (linkData?.properties?.action_link) {
        await sendWelcomeEmail({
          to: email.toLowerCase(),
          plan,
          lockedPrice,
          actionLink: linkData.properties.action_link,
        });
      } else {
        console.error('[webhook] No action_link — cannot send welcome email for', email);
      }

      return res.status(200).json({ ok: true, userId, plan });
    }

    // ===== SUBSCRIPTION DELETED — DÉSACTIVER LE COACH =====
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { error } = await getSupabase()
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
