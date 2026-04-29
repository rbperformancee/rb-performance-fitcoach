/**
 * POST /api/webhook-stripe
 *
 * Webhook Stripe — écoute les événements de paiement.
 * Crée automatiquement le compte coach dans Supabase après paiement.
 *
 * Events gérés :
 *   - checkout.session.completed → crée le coach
 *   - customer.subscription.deleted → désactive le coach
 *   - customer.subscription.updated → sync status + plan metadata
 *   - invoice.payment_failed → flag payment_issue (Stripe Smart Retries)
 *   - charge.refunded → désactive si full refund
 *   - charge.dispute.created → flag payment_issue
 *   - charge.dispute.funds_withdrawn / closed → désactive si lost
 *
 * Env vars :
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const getStripe = require('./_stripe');
const { getServiceClient } = require('./_supabase');
const { captureException } = require('./_sentry');
const { RB_SUPPORT_EMAIL } = require('./_branding');

const getSupabase = getServiceClient;

// ===== Welcome email via Resend =====
const PLAN_LABEL = {
  founding: 'Founder',
  founder: 'Founder',
  starter: 'Starter',
  pro: 'Pro',
  elite: 'Elite',
};

function firstNameFrom(nameOrEmail) {
  if (!nameOrEmail) return '';
  // Prefer the Stripe-provided full name. Fall back to email local-part.
  const raw = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
  const first = raw.replace(/[._-]/g, ' ').split(' ')[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
}

function buildWelcomeSubject(plan, firstName) {
  const isFounder = plan === 'founding' || plan === 'founder';
  const label = PLAN_LABEL[plan] || 'RB Perform';
  const prefix = firstName ? `${firstName}, ` : '';
  return isFounder
    ? `${prefix}bienvenue parmi les 30 Founders`
    : `${prefix}bienvenue sur RB Perform ${label}`;
}

function buildWelcomeHtml({ plan, lockedPrice, actionLink, firstName }) {
  const label = PLAN_LABEL[plan] || 'RB Perform';
  const isFounder = plan === 'founding' || plan === 'founder';
  const hi = firstName ? `Salut ${firstName},` : 'Salut,';

  // ---------- FOUNDER VARIANT ----------
  if (isFounder) {
    const priceStr = lockedPrice ? `${lockedPrice}€/mois` : '199€/mois';
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#e5e5e5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%">

  <!-- Header -->
  <tr><td align="center" style="padding-bottom:28px">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.55);margin-bottom:8px">Founding Member</div>
    <div style="font-size:26px;font-weight:900;color:#f0f0f0;letter-spacing:-1.2px">RB<span style="color:#02d1ba">.</span>Perform</div>
  </td></tr>

  <!-- Hero card -->
  <tr><td style="background:#111;border-radius:22px;border:1px solid rgba(2,209,186,0.15);padding:40px 34px">
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:16px">${hi}</div>
    <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-.8px;line-height:1.2;margin-bottom:16px">
      Tu es <span style="color:#02d1ba">fondateur</span>.<br>
      Voici ce que ça change.
    </div>
    <p style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 28px">
      Ton paiement est confirmé. Tu fais officiellement partie des 30 coachs qui ont posé les fondations de RB Perform — avec un prix verrouillé et un accès direct à moi pendant 90 jours.
    </p>

    <!-- Unlock list -->
    <div style="background:rgba(2,209,186,0.04);border:1px solid rgba(2,209,186,0.15);border-radius:14px;padding:20px 22px;margin-bottom:28px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#02d1ba;font-weight:700;margin-bottom:12px">Ce que tu débloques</div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5">✓ &nbsp;Accès complet au plan Pro (clients illimités)</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5">✓ &nbsp;Anti-churn IA — 7 signaux par client en continu</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5">✓ &nbsp;WhatsApp direct avec moi (Rayan) pendant 90 jours</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5">✓ &nbsp;Groupe privé Founders + vote sur la roadmap</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5">✓ &nbsp;Badge « Founding Member » visible par tes clients</td></tr>
      </table>
    </div>

    <!-- 3 Steps -->
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:14px">Tes 3 prochaines étapes</div>

    <div style="margin-bottom:12px;padding:16px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;margin-bottom:6px">ÉTAPE 1 — 30 SECONDES</div>
      <div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:4px">Définis ton mot de passe</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:12px">Le lien ci-dessous est valable 24h. Au-delà, demande un nouveau lien sur rbperform.app/login.</div>
      <a href="${actionLink}" style="display:inline-block;background:#02d1ba;color:#000;font-size:12px;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:100px;letter-spacing:.06em;text-transform:uppercase">Créer mon accès</a>
    </div>

    <div style="margin-bottom:12px;padding:16px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;margin-bottom:6px">ÉTAPE 2 — 1 MINUTE</div>
      <div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:6px">Installe l'app sur ton iPhone / Android</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7">
        <strong style="color:rgba(255,255,255,0.7)">iPhone :</strong> Safari → rbperform.app/login → Partager → Sur l'écran d'accueil<br>
        <strong style="color:rgba(255,255,255,0.7)">Android :</strong> Chrome → rbperform.app/login → Menu → Installer l'application
      </div>
    </div>

    <div style="margin-bottom:8px;padding:16px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;margin-bottom:6px">ÉTAPE 3 — 20 MINUTES</div>
      <div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:6px">Réserve ton onboarding 1:1</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7">
        Réponds simplement à cet email avec 3 créneaux où tu es dispo cette semaine. Je te rappelle, on configure ton branding, on importe ton premier client, tu repars opérationnel.
      </div>
    </div>

    <!-- Price lock -->
    <div style="margin-top:24px;padding:16px 20px;background:linear-gradient(135deg,rgba(2,209,186,0.08),rgba(2,209,186,0.02));border:1px solid rgba(2,209,186,0.25);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">🔒 Prix verrouillé à vie</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);line-height:1.6">
        Ton tarif reste à <strong style="color:#02d1ba">${priceStr}</strong> tant que ton abonnement est actif — même quand le Pro public passera à 299€ puis 499€. C'est la seule promesse que je te fais par écrit.
      </div>
    </div>
  </td></tr>

  <!-- Signature -->
  <tr><td style="padding:32px 0 0">
    <table cellpadding="0" cellspacing="0" style="width:100%">
      <tr>
        <td style="width:56px;vertical-align:top;padding-right:14px">
          <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#02d1ba,#02d1baaa);color:#000;font-size:20px;font-weight:900;text-align:center;line-height:56px;letter-spacing:-.5px">RB</div>
        </td>
        <td style="vertical-align:top">
          <div style="font-size:14px;color:#fff;font-weight:700;margin-bottom:2px">Rayan Bonte</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:6px">Fondateur — RB Perform</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6">Ce mail arrive de ma boîte perso. Réponds directement — je lis tout, je réponds dans les 24h (souvent dans l'heure en semaine).</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:32px 0 0;text-align:center">
    <div style="font-size:10px;color:rgba(255,255,255,0.18);line-height:1.7">
      RB Perform · SIRET 990 637 803 00018 · 10 Rue Cardinale, 84000 Avignon<br>
      <a href="https://rbperform.app/legal.html#cgu-founder" style="color:rgba(2,209,186,0.45);text-decoration:none">CGV Founder (12 mois)</a>
      &nbsp;·&nbsp;
      <a href="https://rbperform.app/legal.html#rgpd" style="color:rgba(2,209,186,0.45);text-decoration:none">RGPD</a>
      &nbsp;·&nbsp;
      <a href="https://rbperform.app/status" style="color:rgba(2,209,186,0.45);text-decoration:none">Statut plateforme</a>
    </div>
  </td></tr>

</table>
</td></tr></table></body></html>`;
  }

  // ---------- STANDARD VARIANT (Starter / Pro / Elite) ----------
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#e5e5e5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">

  <tr><td align="center" style="padding-bottom:24px">
    <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(2,209,186,0.5);margin-bottom:6px">Accès ${label}</div>
    <div style="font-size:24px;font-weight:900;color:#f0f0f0;letter-spacing:-1px">RB<span style="color:#02d1ba">.</span>Perform</div>
  </td></tr>

  <tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:38px 32px">
    <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:14px">${hi}</div>
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;line-height:1.25;margin-bottom:16px">
      Ton accès <span style="color:#02d1ba">${label}</span> est prêt.
    </div>
    <p style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 24px">
      Paiement confirmé. Voici comment démarrer en moins de 5 minutes.
    </p>

    <div style="margin-bottom:10px;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;margin-bottom:4px">1 — Définis ton mot de passe</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:10px">Lien valable 24h.</div>
      <a href="${actionLink}" style="display:inline-block;background:#02d1ba;color:#000;font-size:12px;font-weight:800;text-decoration:none;padding:11px 24px;border-radius:100px;letter-spacing:.06em;text-transform:uppercase">Créer mon accès</a>
    </div>

    <div style="margin-bottom:10px;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;margin-bottom:4px">2 — Installe l'app</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.55);line-height:1.7">
        iPhone (Safari) → Partager → Sur l'écran d'accueil<br>
        Android (Chrome) → Menu → Installer l'application
      </div>
    </div>

    <div style="margin-bottom:0;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
      <div style="font-size:11px;color:#02d1ba;font-weight:700;margin-bottom:4px">3 — Ajoute ton premier client</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.55);line-height:1.7">Dashboard → Clients → Inviter — tu envoies un code, il s'inscrit, tu vois tout remonter automatiquement.</div>
    </div>
  </td></tr>

  <tr><td style="padding:28px 0 0;text-align:center">
    <div style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.7">
      Une question ? Réponds à ce mail, on te répond dans les 24h.<br>
      <a href="mailto:${RB_SUPPORT_EMAIL}" style="color:rgba(2,209,186,0.6);text-decoration:none">${RB_SUPPORT_EMAIL}</a>
    </div>
  </td></tr>

  <tr><td style="padding:24px 0 0;text-align:center">
    <div style="font-size:10px;color:rgba(255,255,255,0.18);line-height:1.7">
      RB Perform · SIRET 990 637 803 00018 · 10 Rue Cardinale, 84000 Avignon<br>
      <a href="https://rbperform.app/legal.html#cgu" style="color:rgba(2,209,186,0.45);text-decoration:none">CGV</a>
      &nbsp;·&nbsp;
      <a href="https://rbperform.app/legal.html#rgpd" style="color:rgba(2,209,186,0.45);text-decoration:none">RGPD</a>
      &nbsp;·&nbsp;
      <a href="https://rbperform.app/status" style="color:rgba(2,209,186,0.45);text-decoration:none">Statut</a>
    </div>
  </td></tr>

</table>
</td></tr></table></body></html>`;
}

async function sendWelcomeEmail({ to, plan, lockedPrice, actionLink, customerName }) {
  const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
  const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
  if (!SMTP_PASS) {
    console.error('[webhook] ZOHO_SMTP_PASS missing, cannot send welcome email');
    return { ok: false, reason: 'no_smtp_pass' };
  }
  const isFounder = plan === 'founding' || plan === 'founder';
  const firstName = firstNameFrom(customerName || to);
  // Founders get the email from my personal address (replies route back to me).
  // Standard gets noreply + Reply-To set so replies still land.
  const from = isFounder
    ? `Rayan Bonte <${SMTP_USER}>`
    : `RB Perform <${SMTP_USER}>`;
  // Gmail/Yahoo (depuis fev 2024) exigent List-Unsubscribe + List-Unsubscribe-Post
  // pour les bulk senders. Welcome = transactionnel, mais inclure quand meme par
  // securite (fait pas de mal et garantit deliverability primary inbox).
  const unsubUrl = `https://rbperform.app/unsubscribe?email=${encodeURIComponent(to)}&type=welcome`;
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: SMTP_USER,
      subject: buildWelcomeSubject(plan, firstName),
      html: buildWelcomeHtml({ plan, lockedPrice, actionLink, firstName }),
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@rbperform.app?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    console.log('[webhook] Welcome email sent to', to, 'msgId:', info.messageId);
    return { ok: true, id: info.messageId };
  } catch (e) {
    console.error(`[WEBHOOK_ZOHO_EXCEPTION] to=${to} reason="${e.message}"`);
    await captureException(e, {
      tags: { endpoint: 'webhook-stripe', stage: 'zoho_exception', plan },
      extra: { to },
    });
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
      // Explicit 300 s tolerance (Stripe default): events older than this
      // are rejected as replay attempts. Stripe's own signature generator
      // embeds a Unix timestamp in the `t=` field of the Stripe-Signature
      // header; constructEvent() compares it to Date.now() and throws.
      event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret, 300);
    } catch (err) {
      console.error('[WEBHOOK_SIG_INVALID] reason="' + err.message + '"');
      await captureException(err, { tags: { endpoint: 'webhook-stripe', stage: 'signature' } });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`[webhook] Event: ${event.type} (id: ${event.id})`);

    // ===== IDEMPOTENCY — refuser les retries Stripe =====
    // Stripe retry les webhooks jusqu'a 3 fois sur 3 jours en cas d'erreur.
    // On track event.id dans stripe_events ; si deja traite, on retourne 200
    // immediatement (sans re-creer user, re-envoyer email, etc.).
    try {
      const { data: existing } = await getSupabase()
        .from('stripe_events')
        .select('event_id')
        .eq('event_id', event.id)
        .maybeSingle();
      if (existing) {
        console.log(`[webhook] Event ${event.id} already processed — skipping (idempotency)`);
        return res.status(200).json({ received: true, deduped: true });
      }
      // Insert dans stripe_events AVANT le traitement pour eviter race conditions
      // (si deux retries arrivent en parallele, l'unique constraint event_id rejette le 2e)
      const { error: insertErr } = await getSupabase()
        .from('stripe_events')
        .insert({ event_id: event.id, type: event.type, payload: event });
      if (insertErr && insertErr.code === '23505') {
        // Code 23505 = unique violation = race avec un autre worker, deja insere
        console.log(`[webhook] Event ${event.id} race detected — skipping`);
        return res.status(200).json({ received: true, deduped: true });
      }
    } catch (e) {
      // Ne pas bloquer le webhook si le check idempotency echoue (mode degrade)
      console.error('[webhook] idempotency check failed (degraded mode):', e.message);
    }

    // ===== CHECKOUT COMPLETED — CRÉER LE COACH =====
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;
      const customerName = session.customer_details?.name || null;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const metadata = session.subscription_data?.metadata || session.metadata || {};
      // Payment Links peuvent ne pas carrier de metadata (configuree au niveau Price/Product).
      // On detecte aussi via le price ID Founder pour eviter de creer un Pro par erreur.
      let plan = metadata.plan || (metadata.founding_coach === 'true' ? 'founding' : null);
      let lockedPrice = metadata.locked_price || null;
      if (!plan) {
        try {
          const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 5 });
          const priceIds = (lineItems.data || []).map(li => li.price?.id).filter(Boolean);
          const FOUNDING_PRICES = [
            process.env.STRIPE_PRICE_FOUNDING,
            process.env.STRIPE_PRICE_FOUNDING_USD,
            process.env.STRIPE_PRICE_FOUNDING_GBP,
          ].filter(Boolean);
          if (priceIds.some(p => FOUNDING_PRICES.includes(p))) {
            plan = 'founding';
            lockedPrice = lockedPrice || '199';
            console.log(`[webhook] Founder detected via price ID match (Payment Link path)`);
          } else {
            plan = 'pro'; // fallback Standard
          }
        } catch (e) {
          console.error('[webhook] line_items fetch failed, defaulting plan=pro:', e.message);
          plan = 'pro';
        }
      }

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
          console.error(`[WEBHOOK_AUTH_FAILED] email=${email} reason="${authError.message}"`);
          await captureException(authError, {
            tags: { endpoint: 'webhook-stripe', stage: 'auth_create', plan },
            extra: { email, customerId, subscriptionId },
          });
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
        console.error(`[WEBHOOK_COACH_UPSERT_FAILED] email=${email} userId=${userId} reason="${coachError.message}"`);
        await captureException(coachError, {
          tags: { endpoint: 'webhook-stripe', stage: 'coach_upsert', plan },
          extra: { email, userId, customerId, subscriptionId, plan, lockedPrice },
        });
      }

      // 4. Générer le lien de récupération (= créer mot de passe).
      // Redirect target depends on plan: Founders land on the plan-aware
      // /welcome page (Founder-specific copy + price lock + signature);
      // Starter/Pro/Elite get the generic welcome with their plan param.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rbperform.app';
      const welcomeQuery = `plan=${encodeURIComponent(plan)}${lockedPrice ? `&price=${encodeURIComponent(lockedPrice)}` : ''}`;
      const { data: linkData, error: linkError } = await getSupabase().auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
        options: {
          redirectTo: `${siteUrl}/welcome?${welcomeQuery}`,
        },
      });

      if (linkError) {
        console.error(`[WEBHOOK_MAGIC_LINK_FAILED] email=${email} reason="${linkError.message}"`);
        await captureException(linkError, {
          tags: { endpoint: 'webhook-stripe', stage: 'generate_link', plan },
          extra: { email, userId, plan },
        });
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
          customerName,
        });
      } else {
        console.error(`[WEBHOOK_NO_ACTION_LINK] email=${email} — cannot send welcome, no magic link available`);
        await captureException(new Error('No action_link returned from generateLink'), {
          tags: { endpoint: 'webhook-stripe', stage: 'no_action_link', plan },
          extra: { email, userId, plan },
        });
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

      if (error) {
        console.error(`[WEBHOOK_DEACTIVATE_FAILED] customerId=${customerId} reason="${error.message}"`);
        await captureException(error, {
          tags: { endpoint: 'webhook-stripe', stage: 'deactivate' },
          extra: { customerId },
        });
      } else {
        console.log(`[webhook] Coach deactivated: ${customerId}`);
      }

      return res.status(200).json({ ok: true });
    }

    // ===== INVOICE PAYMENT FAILED — CHURN SIGNAL =====
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const attemptCount = invoice.attempt_count || 1;
      const nextAttempt = invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null;
      const amountDue = (invoice.amount_due || 0) / 100;

      console.error(
        `[WEBHOOK_PAYMENT_FAILED] customerId=${customerId} ` +
          `attempt=${attemptCount} amount=${amountDue}EUR next=${nextAttempt || 'none'}`
      );

      // Flag coach as at-risk but keep is_active true for now — Stripe
      // retries automatically (Smart Retries). Only deactivate on the
      // final subscription.deleted event.
      try {
        await getSupabase()
          .from('coaches')
          .update({ payment_issue: true, payment_issue_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
      } catch (dbErr) {
        // Column may not exist yet — tolerate, the Sentry capture is the signal.
        console.error(`[WEBHOOK_PAYMENT_FAILED_DB_WARN] ${dbErr.message}`);
      }

      await captureException(new Error(`Payment failed for ${customerId} (attempt ${attemptCount})`), {
        tags: { endpoint: 'webhook-stripe', stage: 'payment_failed', severity: attemptCount >= 3 ? 'critical' : 'warning' },
        extra: { customerId, attemptCount, amountDue, nextAttempt, invoiceId: invoice.id },
      });

      return res.status(200).json({ ok: true });
    }

    // ===== SUBSCRIPTION UPDATED — PLAN CHANGE / STATUS TRANSITION =====
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;
      const prevAttrs = event.data.previous_attributes || {};

      console.log(`[webhook] Subscription updated: ${customerId} status=${status} changed=${Object.keys(prevAttrs).join(',')}`);

      // Sync status + plan metadata best-effort. If new metadata carries
      // a plan, update it; otherwise leave coach row untouched.
      const updates = { stripe_subscription_status: status };
      const md = subscription.metadata || {};
      if (md.plan) updates.plan = md.plan;
      if (md.locked_price) updates.locked_price = md.locked_price;

      try {
        const { error } = await getSupabase()
          .from('coaches')
          .update(updates)
          .eq('stripe_customer_id', customerId);
        if (error) throw error;
      } catch (dbErr) {
        console.error(`[WEBHOOK_SUB_UPDATE_DB_WARN] customerId=${customerId} ${dbErr.message}`);
        // Don't capture — the stripe_subscription_status column may not
        // exist yet; it's a best-effort sync. subscription.deleted and
        // payment_failed are the hard signals.
      }

      return res.status(200).json({ ok: true });
    }

    // ===== REFUND — coach a ete rembourse (full ou partial) =====
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const customerId = charge.customer;
      const refunded = charge.amount_refunded || 0;
      const total = charge.amount || 0;
      const isFullRefund = refunded >= total;

      console.error(
        `[WEBHOOK_REFUND] customerId=${customerId} refunded=${refunded / 100}EUR ` +
          `total=${total / 100}EUR full=${isFullRefund}`
      );

      // Refund total = on desactive immediatement (le coach a recupere
      // ses sous, on ne lui doit plus l'acces). Refund partiel = on garde
      // l'acces actif et on log juste pour la compta.
      if (isFullRefund) {
        try {
          await getSupabase()
            .from('coaches')
            .update({
              is_active: false,
              payment_issue: true,
              payment_issue_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);
        } catch (dbErr) {
          console.error(`[WEBHOOK_REFUND_DB_FAIL] ${dbErr.message}`);
        }
      }

      await captureException(new Error(`Charge refunded for ${customerId}`), {
        tags: { endpoint: 'webhook-stripe', stage: 'refund', severity: isFullRefund ? 'critical' : 'warning' },
        extra: { customerId, refunded: refunded / 100, total: total / 100, isFullRefund, chargeId: charge.id },
      });

      return res.status(200).json({ ok: true });
    }

    // ===== DISPUTE OPENED — chargeback en cours, on flag =====
    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object;
      const customerId = dispute.charge?.customer || dispute.customer;
      const reason = dispute.reason || 'unknown';
      const amount = (dispute.amount || 0) / 100;

      console.error(
        `[WEBHOOK_DISPUTE_OPENED] customerId=${customerId} amount=${amount}EUR reason=${reason}`
      );

      // Flag at-risk mais on garde l'acces — le dispute peut etre gagne.
      // Stripe nous notifiera via dispute.closed (won/lost) pour la suite.
      try {
        await getSupabase()
          .from('coaches')
          .update({ payment_issue: true, payment_issue_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
      } catch (dbErr) {
        console.error(`[WEBHOOK_DISPUTE_DB_WARN] ${dbErr.message}`);
      }

      await captureException(new Error(`Dispute opened for ${customerId} (${reason})`), {
        tags: { endpoint: 'webhook-stripe', stage: 'dispute_opened', severity: 'critical' },
        extra: { customerId, amount, reason, disputeId: dispute.id },
      });

      return res.status(200).json({ ok: true });
    }

    // ===== DISPUTE PERDU — fonds retires, le coach a chargeback =====
    if (event.type === 'charge.dispute.funds_withdrawn' || event.type === 'charge.dispute.closed') {
      const dispute = event.data.object;
      const customerId = dispute.charge?.customer || dispute.customer;
      const status = dispute.status; // 'lost' | 'won' | 'warning_closed' | etc.
      const amount = (dispute.amount || 0) / 100;

      console.error(
        `[WEBHOOK_DISPUTE_CLOSED] customerId=${customerId} status=${status} amount=${amount}EUR`
      );

      // Si le dispute est perdu (lost) OU les fonds sont retires :
      // desactivation immediate. Le coach a fait un chargeback abusif
      // ou a vraiment subi une fraude — dans les deux cas on coupe l'acces.
      if (status === 'lost' || event.type === 'charge.dispute.funds_withdrawn') {
        try {
          await getSupabase()
            .from('coaches')
            .update({
              is_active: false,
              payment_issue: true,
              payment_issue_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);
        } catch (dbErr) {
          console.error(`[WEBHOOK_DISPUTE_DEACTIVATE_FAIL] ${dbErr.message}`);
        }

        await captureException(new Error(`Dispute lost / funds withdrawn for ${customerId}`), {
          tags: { endpoint: 'webhook-stripe', stage: 'dispute_lost', severity: 'critical' },
          extra: { customerId, amount, status, disputeId: dispute.id },
        });
      } else if (status === 'won') {
        // Dispute gagne — on peut clear le flag at-risk.
        try {
          await getSupabase()
            .from('coaches')
            .update({ payment_issue: false, payment_issue_at: null })
            .eq('stripe_customer_id', customerId);
        } catch (dbErr) {
          console.error(`[WEBHOOK_DISPUTE_CLEAR_FAIL] ${dbErr.message}`);
        }
      }

      return res.status(200).json({ ok: true });
    }

    // Event non géré — acknowledge quand même pour que Stripe n'insiste pas
    console.log(`[webhook] Unhandled event type: ${event.type}`);
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error(`[WEBHOOK_UNCAUGHT] reason="${err.message}"`);
    await captureException(err, {
      tags: { endpoint: 'webhook-stripe', stage: 'uncaught' },
    });
    return res.status(500).json({ error: err.message });
  }
};
