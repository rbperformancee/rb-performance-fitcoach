/**
 * POST /api/internal/ebook-grant-access
 *
 * Endpoint server-to-server appelé par le webhook Stripe de rbperform.com
 * (Next.js, autre repo) après un achat de l'ebook 60J.
 *
 * Rôle :
 *   1. Idempotent — stripe_session_id en PK dans ebook_purchases.
 *   2. Compteur 30 places : check + verrou via la même table.
 *   3. Si slot OK : crée auth.users + clients (pending_start) + duplique
 *      le template programme (cf migration 106) en programmes.html_content.
 *   4. Si >=30 places prises OU collision coach existant : enregistre la
 *      purchase mais app_access_granted=false. Le caller envoie l'email
 *      waitlist au lieu de l'email d'accès.
 *
 * Auth : X-Internal-Secret ou Authorization: Bearer <INTERNAL_API_SECRET>
 *
 * Body (JSON) :
 *   - stripe_session_id (string, required) : cs_xxxxx
 *   - email             (string, required)
 *   - full_name         (string, optional)
 *   - source            (string, optional, default 'rbperform.com')
 *   - raw_metadata      (object, optional) : snapshot session.metadata
 *
 * Réponse (200) :
 *   {
 *     success: true,
 *     idempotent: boolean,         // true si purchase existait déjà
 *     app_access_granted: boolean,
 *     reason: 'granted' | 'waitlist_wave2' | 'coach_collision',
 *     places_left: number,         // après cette purchase
 *     client_id: uuid | null,
 *     programme_id: uuid | null,
 *   }
 *
 * Réponses erreur :
 *   401 — Auth invalide
 *   400 — Body invalide
 *   405 — Méthode != POST
 *   500 — Erreur interne (Stripe retry recommandé)
 *   503 — EBOOK_VIRTUAL_COACH_ID/EBOOK_TEMPLATE_ID non configurés
 */

const { getServiceClient } = require('../_supabase');
const { isInternalAuthorized, attachRequestId, getIP } = require('../_security');
const { captureException } = require('../_sentry');

const MAX_GRANTED_SLOTS = 30;
const SUBSCRIPTION_PLAN_LABEL = 'ebook-100d';
const PROGRAMME_NAME = 'Ebook Athlète 100J';

module.exports = async function handler(req, res) {
  const reqId = attachRequestId(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // ─── 1. Auth server-to-server ───
  if (!isInternalAuthorized(req)) {
    console.warn(`[ebook-grant ${reqId}] unauthorized from ${getIP(req)}`);
    return res.status(401).json({ error: 'unauthorized' });
  }

  // ─── 2. Validation body ───
  const { stripe_session_id, email, full_name, source, raw_metadata } = req.body || {};

  if (!stripe_session_id || typeof stripe_session_id !== 'string' || stripe_session_id.length < 4) {
    return res.status(400).json({ error: 'stripe_session_id_required' });
  }
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email_required' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'email_invalid' });
  }

  // ─── 3. Env vars critiques ───
  const VIRTUAL_COACH_ID = process.env.EBOOK_VIRTUAL_COACH_ID;
  const TEMPLATE_ID = process.env.EBOOK_TEMPLATE_ID;
  if (!VIRTUAL_COACH_ID || !TEMPLATE_ID) {
    console.error(`[ebook-grant ${reqId}] missing EBOOK_VIRTUAL_COACH_ID or EBOOK_TEMPLATE_ID`);
    return res.status(503).json({ error: 'server_not_configured' });
  }

  const supabase = getServiceClient();

  try {
    // ─── 4. Idempotence — déjà traité ? ───
    const { data: existing, error: existingErr } = await supabase
      .from('ebook_purchases')
      .select('stripe_session_id, email, client_id, programme_id, app_access_granted, notes')
      .eq('stripe_session_id', stripe_session_id)
      .maybeSingle();

    if (existingErr) {
      console.error(`[ebook-grant ${reqId}] lookup ebook_purchases failed:`, existingErr.message);
      await captureException(new Error(existingErr.message), {
        tags: { endpoint: 'ebook-grant-access', stage: 'lookup' },
        extra: { reqId, stripe_session_id },
      });
      return res.status(500).json({ error: 'lookup_failed' });
    }

    if (existing) {
      const placesLeft = await countPlacesLeft(supabase);
      return res.status(200).json({
        success: true,
        idempotent: true,
        app_access_granted: existing.app_access_granted,
        reason: existing.app_access_granted ? 'granted' : (existing.notes || 'unknown'),
        places_left: placesLeft,
        client_id: existing.client_id,
        programme_id: existing.programme_id,
      });
    }

    // ─── 5. Collision coach existant ───
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .neq('id', VIRTUAL_COACH_ID) // le coach virtuel ne compte pas
      .maybeSingle();

    if (existingCoach) {
      console.log(`[ebook-grant ${reqId}] coach collision for ${normalizedEmail}`);
      await supabase.from('ebook_purchases').insert({
        stripe_session_id,
        email: normalizedEmail,
        app_access_granted: false,
        source: source || 'rbperform.com',
        raw_metadata: raw_metadata || null,
        notes: 'coach_collision',
      });
      const placesLeft = await countPlacesLeft(supabase);
      return res.status(200).json({
        success: true,
        idempotent: false,
        app_access_granted: false,
        reason: 'coach_collision',
        places_left: placesLeft,
        client_id: null,
        programme_id: null,
      });
    }

    // ─── 6. Compteur 30 places ───
    const grantedCount = await countGranted(supabase);
    if (grantedCount >= MAX_GRANTED_SLOTS) {
      console.log(`[ebook-grant ${reqId}] waitlist (${grantedCount}/${MAX_GRANTED_SLOTS} taken) for ${normalizedEmail}`);
      await supabase.from('ebook_purchases').insert({
        stripe_session_id,
        email: normalizedEmail,
        app_access_granted: false,
        source: source || 'rbperform.com',
        raw_metadata: raw_metadata || null,
        notes: 'waitlist_wave2',
      });
      return res.status(200).json({
        success: true,
        idempotent: false,
        app_access_granted: false,
        reason: 'waitlist_wave2',
        places_left: 0,
        client_id: null,
        programme_id: null,
      });
    }

    // ─── 7. Slot OK → provisioning ───

    // 7a. auth.users — réutiliser si existant, sinon créer (sans password, OTP only)
    let authUserId = null;
    try {
      // listUsers pas filtrable par email, on pagine (max 1000)
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = list?.users?.find(
        (u) => (u.email || '').toLowerCase() === normalizedEmail
      );
      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || null,
            coach_id: VIRTUAL_COACH_ID,
            created_via: 'ebook-grant-access',
            source: source || 'rbperform.com',
          },
        });
        if (createErr || !created?.user) {
          throw new Error(`auth_create_failed: ${createErr?.message || 'unknown'}`);
        }
        authUserId = created.user.id;
      }
    } catch (authErr) {
      console.error(`[ebook-grant ${reqId}] auth provisioning failed:`, authErr.message);
      await captureException(authErr, {
        tags: { endpoint: 'ebook-grant-access', stage: 'auth' },
        extra: { reqId, stripe_session_id, email: normalizedEmail },
      });
      return res.status(500).json({ error: 'auth_provisioning_failed' });
    }

    // 7b. clients — réutiliser si déjà existant (cas: retry Stripe après crash partiel)
    let clientId = null;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('coach_id', VIRTUAL_COACH_ID)
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
      // Garantit le lien user_id ↔ clients (RLS)
      await supabase.from('clients').update({ user_id: authUserId }).eq('id', clientId);
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          coach_id: VIRTUAL_COACH_ID,
          email: normalizedEmail,
          full_name: full_name || null,
          user_id: authUserId,
          subscription_plan: SUBSCRIPTION_PLAN_LABEL,
          subscription_status: 'pending_start', // 100j commencent au clic "Démarrer"
          pipeline_status: 'new',
          tags: ['ebook-100d', 'self-serve'],
        })
        .select('id')
        .single();
      if (clientErr || !newClient) {
        console.error(`[ebook-grant ${reqId}] client insert failed:`, clientErr?.message);
        await captureException(new Error(clientErr?.message || 'client_insert_failed'), {
          tags: { endpoint: 'ebook-grant-access', stage: 'client' },
          extra: { reqId, stripe_session_id, email: normalizedEmail },
        });
        return res.status(500).json({ error: 'client_insert_failed' });
      }
      clientId = newClient.id;
    }

    // 7c. programme — duplique template HTML
    let programmeId = null;
    const { data: existingProg } = await supabase
      .from('programmes')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingProg) {
      programmeId = existingProg.id;
    } else {
      const { data: tpl, error: tplErr } = await supabase
        .from('coach_programme_templates')
        .select('html_content')
        .eq('id', TEMPLATE_ID)
        .single();
      if (tplErr || !tpl?.html_content) {
        console.error(`[ebook-grant ${reqId}] template lookup failed:`, tplErr?.message);
        await captureException(new Error(tplErr?.message || 'template_missing'), {
          tags: { endpoint: 'ebook-grant-access', stage: 'template' },
          extra: { reqId, stripe_session_id, TEMPLATE_ID },
        });
        return res.status(500).json({ error: 'template_lookup_failed' });
      }

      const { data: newProg, error: progErr } = await supabase
        .from('programmes')
        .insert({
          client_id: clientId,
          programme_name: PROGRAMME_NAME,
          html_content: tpl.html_content,
          is_active: true,
          uploaded_by: 'athletes@rbperform.app',
        })
        .select('id')
        .single();
      if (progErr || !newProg) {
        console.error(`[ebook-grant ${reqId}] programme insert failed:`, progErr?.message);
        await captureException(new Error(progErr?.message || 'programme_insert_failed'), {
          tags: { endpoint: 'ebook-grant-access', stage: 'programme' },
          extra: { reqId, stripe_session_id, clientId },
        });
        return res.status(500).json({ error: 'programme_insert_failed' });
      }
      programmeId = newProg.id;
    }

    // 7d. Sceau final — INSERT ebook_purchases (granted=true)
    // Si cet INSERT fail à cause d'une race condition (autre webhook simultané
    // sur même session_id), la PK lève une erreur 23505 → on retombe sur la
    // branche idempotente au prochain retry. clients/programmes déjà créés
    // ne sont pas dupliqués grâce aux checks "existingClient/existingProg".
    const { error: purchaseErr } = await supabase.from('ebook_purchases').insert({
      stripe_session_id,
      email: normalizedEmail,
      client_id: clientId,
      programme_id: programmeId,
      app_access_granted: true,
      source: source || 'rbperform.com',
      raw_metadata: raw_metadata || null,
      granted_at: new Date().toISOString(),
    });

    if (purchaseErr) {
      // Race condition idempotence : 23505 = unique_violation
      if (purchaseErr.code === '23505') {
        const placesLeft = await countPlacesLeft(supabase);
        return res.status(200).json({
          success: true,
          idempotent: true,
          app_access_granted: true,
          reason: 'granted',
          places_left: placesLeft,
          client_id: clientId,
          programme_id: programmeId,
        });
      }
      console.error(`[ebook-grant ${reqId}] purchase insert failed:`, purchaseErr.message);
      await captureException(new Error(purchaseErr.message), {
        tags: { endpoint: 'ebook-grant-access', stage: 'purchase' },
        extra: { reqId, stripe_session_id, clientId, programmeId },
      });
      return res.status(500).json({ error: 'purchase_insert_failed' });
    }

    const placesLeftAfter = MAX_GRANTED_SLOTS - (grantedCount + 1);
    console.log(`[ebook-grant ${reqId}] ✅ granted to ${normalizedEmail} (${placesLeftAfter} left)`);
    return res.status(200).json({
      success: true,
      idempotent: false,
      app_access_granted: true,
      reason: 'granted',
      places_left: placesLeftAfter,
      client_id: clientId,
      programme_id: programmeId,
    });
  } catch (err) {
    console.error(`[ebook-grant ${reqId}] unhandled:`, err);
    await captureException(err, {
      tags: { endpoint: 'ebook-grant-access', stage: 'unhandled' },
      extra: { reqId, stripe_session_id, email: normalizedEmail },
    });
    return res.status(500).json({ error: 'internal_error' });
  }
};

// ─── Helpers ───

async function countGranted(supabase) {
  const { count, error } = await supabase
    .from('ebook_purchases')
    .select('stripe_session_id', { count: 'exact', head: true })
    .eq('app_access_granted', true);
  if (error) {
    console.error('[ebook-grant] countGranted failed:', error.message);
    return MAX_GRANTED_SLOTS; // fail-safe : on bloque plutôt que d'over-attribuer
  }
  return count || 0;
}

async function countPlacesLeft(supabase) {
  const granted = await countGranted(supabase);
  return Math.max(0, MAX_GRANTED_SLOTS - granted);
}
