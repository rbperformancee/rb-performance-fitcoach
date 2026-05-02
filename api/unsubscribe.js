/**
 * /api/unsubscribe
 *
 * Gere les opt-out emails RFC 8058 (List-Unsubscribe One-Click).
 *
 * Gmail/Yahoo envoient un POST automatique a cette URL quand l'user
 * clique sur "Se desabonner" depuis leur boite. RFC 8058 :
 *   POST /api/unsubscribe?email=...&type=...
 *   Body: List-Unsubscribe=One-Click
 *
 * On accepte aussi GET (lien depuis l'email) pour les autres clients.
 *
 * Persiste le choix dans Supabase :
 *   coaches.unsub_<type> = true (ou clients.unsub_<type>)
 *
 * Types supportés :
 *   - weekly_digest : email hebdomadaire coach
 *   - founder_checkin : checkin du founder
 *   - welcome : email de bienvenue (idempotent — pas de re-send)
 *   - all : opt-out global de tous les emails non-transactionnels
 */

const { getServiceClient } = require('./_supabase');
const { verifyUnsubToken } = require('./_unsubToken');

const VALID_TYPES = ['weekly_digest', 'founder_checkin', 'welcome', 'marketing', 'all'];

module.exports = async (req, res) => {
  // CORS for GET — anyone can hit this from email
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const email = (req.query?.email || '').trim().toLowerCase();
  const type = (req.query?.type || 'all').trim().toLowerCase();
  const token = (req.query?.t || '').trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'invalid_type', valid_types: VALID_TYPES });
  }

  // Vérification HMAC token (audit ULTRA-SECURITY HIGH).
  // Sans ça, n'importe qui peut désabonner n'importe quel email en boucle.
  // Tolérance : on accepte une absence de token uniquement pour les vieux
  // liens d'avant ce déploiement (grace period 30 jours). Logger les hits
  // sans token pour identifier l'arrêt de la grace period.
  if (token) {
    if (!verifyUnsubToken(email, type, token)) {
      console.warn(`[unsubscribe] invalid token for ${email} type=${type} — possible abuse`);
      // Réponse 200 pour ne pas divulguer la validation aux scanners,
      // mais on n'effectue PAS le désabonnement.
      return respondConfirmation(res, req, email);
    }
  } else {
    console.info(`[unsubscribe] LEGACY no-token request ${email} type=${type} — grace period`);
    // TODO post-2026-06-02 : changer en `return respondConfirmation(res, req, email)`
    // sans appliquer le désabonnement, une fois la grace period écoulée.
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    // Idempotent : si Supabase pas configure, on log et on confirme quand meme
    // (l'user voit "tu es desabonne" — on traitera manuellement)
    console.warn(`[unsubscribe] Supabase not configured — manual processing needed for ${email} type=${type}`);
    return respondConfirmation(res, req, email);
  }

  try {

    // Try coaches table first (most common for digests/checkin)
    const updateData = {};
    if (type === 'all') {
      updateData.unsub_all = true;
    } else {
      updateData[`unsub_${type}`] = true;
    }

    const [{ data: coach }, { data: client }] = await Promise.all([
      supabase.from('coaches').update(updateData).eq('email', email).select('id').maybeSingle(),
      supabase.from('clients').update(updateData).eq('email', email).select('id').maybeSingle(),
    ]);

    if (!coach && !client) {
      // Email pas trouve dans nos tables — log mais confirme (RFC 8058 demande
      // de ne pas leak l'existence d'un compte)
      console.info(`[unsubscribe] email not found ${email} type=${type} — logged for cleanup`);
    } else {
      console.info(`[unsubscribe] OK ${email} type=${type} coach=${!!coach} client=${!!client}`);
    }

    return respondConfirmation(res, req, email);
  } catch (e) {
    console.error('[unsubscribe] error:', e.message);
    // Toujours repondre 200 pour eviter que Gmail re-classe le sender
    return respondConfirmation(res, req, email);
  }
};

function respondConfirmation(res, req, email) {
  // RFC 8058 : POST One-Click → repondre 200 simple
  if (req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true, email });
  }

  // GET : afficher une page HTML simple bilingue
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Désabonné · RB Perform</title>
<meta name="robots" content="noindex">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#080C14;color:#fff;font-family:-apple-system,Inter,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
  .card{max-width:420px}
  .check{width:64px;height:64px;border-radius:50%;background:rgba(2,209,186,0.1);border:1px solid rgba(2,209,186,0.3);display:inline-flex;align-items:center;justify-content:center;color:#02d1ba;margin-bottom:24px;font-size:28px}
  h1{font-size:24px;font-weight:800;letter-spacing:-1px;margin-bottom:12px}
  p{font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:8px}
  a{color:#02d1ba;text-decoration:none}
  a:hover{text-decoration:underline}
  .home{margin-top:24px;display:inline-block;padding:10px 24px;border:1px solid rgba(255,255,255,0.1);border-radius:100px;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600}
</style>
</head>
<body>
<div class="card">
  <div class="check">✓</div>
  <h1>Tu es désabonné.</h1>
  <p>${escapeHtml(email)} ne recevra plus ce type d'email.</p>
  <p>Tu peux gérer tes préférences à tout moment depuis ton compte RB Perform.</p>
  <a href="/" class="home">Retour à RB Perform</a>
</div>
</body>
</html>`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
