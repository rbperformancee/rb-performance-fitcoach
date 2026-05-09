/**
 * Cron coach welcome drip — Vercel Cron Job
 *
 * Schedule : tous les jours à 10h UTC. Cf. vercel.json.
 *
 * Pour chaque coach, envoie 3 emails post-signup :
 *   - J+0 (jour de signup)  : bienvenue + rappel onboarding
 *   - J+3                    : "1er client invité ?" + lien bulk migration
 *   - J+7                    : vitrine publique + parrainage
 *
 * Idempotence : on track les emails envoyés via coach_activity_log
 *   activity_type = 'welcome_drip_d{N}' (où N = 0, 3, 7).
 *
 * Filtre : ne traite que les coachs avec onboarding_completed_at OU
 * created_at > 0 (i.e. pas de bots, comptes inactifs etc.).
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "RB Perform <noreply@rbperform.app>";
const SITE = "https://rbperform.app";
const G = "#02d1ba";

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || "") === `Bearer ${cronSecret}`;
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    body: options.body || undefined,
  });
  if (!res.ok && options.method !== "POST") return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  return res.ok;
}

const escHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function emailWrapper(content, footerNote = "") {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif;color:#fff;">
  <div style="max-width:540px;margin:0 auto;padding:36px 28px;">
    <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:18px;">RB Perform</div>
    ${content}
    <div style="margin-top:48px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:11px;color:rgba(255,255,255,0.35);line-height:1.6;">
        ${footerNote || "Tu reçois cet email parce que tu as créé un compte coach sur RB Perform."}
        <br/>
        <a href="${SITE}/login" style="color:${G};text-decoration:none;">Mon compte</a>
      </div>
    </div>
  </div>
</body></html>`;
}

function buildD0(firstName) {
  const subject = `${firstName ? firstName + ", b" : "B"}ienvenue sur RB Perform.`;
  const html = emailWrapper(`
    <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.15;margin-bottom:14px;">
      Bienvenue${firstName ? " " + escHtml(firstName) : ""}<span style="color:${G};">.</span>
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:20px;">
      Tu as 6 minutes ? Termine ton onboarding maintenant — c'est le seul moment où tu vas devoir penser au setup. Après, tout coule.
    </div>
    <ul style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.9;padding-left:18px;margin:0 0 24px;">
      <li>Identité (nom + spécialités) — 30s</li>
      <li>Branding (couleur + logo) — 1 min</li>
      <li>Notifs push activées — 10s</li>
      <li>Choix d'un programme template — 1 min</li>
      <li>Invitation 1er client OU import CSV — 2 min</li>
    </ul>
    <a href="${SITE}/login" style="display:inline-block;padding:13px 26px;background:${G};color:#000;border-radius:11px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Reprendre l'onboarding →</a>
    <div style="margin-top:24px;padding:16px 18px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:12px;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.7;">
      <strong style="color:#fff;">Tu migres depuis Trainerize, Hexfit, Eklo ?</strong> Le guide t'amène en 30 min de 0 à 20 clients invités. Voir <a href="${SITE}/login" style="color:${G};">l'aide migration</a>.
    </div>
  `);
  return { subject, html };
}

function buildD3(firstName, hasInvited) {
  const subject = hasInvited ? `${firstName ? firstName + ", c" : "C"}'est parti.` : `${firstName ? firstName + ", t" : "T"}u as invité ton 1er client ?`;
  const html = emailWrapper(hasInvited ? `
    <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.15;margin-bottom:14px;">
      Premier client envoyé<span style="color:${G};">.</span>
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:20px;">
      C'est l'étape 1. Maintenant la mécanique RB Perform commence à tourner pour toi :
    </div>
    <ul style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.9;padding-left:18px;margin:0 0 24px;">
      <li>Quand il logue une séance → tu vois en live (Activity Feed)</li>
      <li>Quand il bat un PR → push direct sur ton tel</li>
      <li>Quand il signale une douleur → alerte instantanée</li>
      <li>Dimanche soir → bilan hebdo structuré (poids + ressenti + note)</li>
    </ul>
    <a href="${SITE}/login" style="display:inline-block;padding:13px 26px;background:${G};color:#000;border-radius:11px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Voir mon dashboard →</a>
  ` : `
    <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.15;margin-bottom:14px;">
      3 jours${firstName ? ", " + escHtml(firstName) : ""}<span style="color:${G};">.</span>
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:20px;">
      Tu n'as pas encore invité ton 1er client. C'est le moment où la plupart des coachs perdent le momentum. 30 secondes pour envoyer une invitation.
    </div>
    <a href="${SITE}/login" style="display:inline-block;padding:13px 26px;background:${G};color:#000;border-radius:11px;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;">Inviter un client →</a>
    <div style="margin-top:18px;padding:16px 18px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:12px;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.7;">
      <strong style="color:#fff;">Tu as 10+ clients à migrer ?</strong> Drop un CSV (email, prénom, téléphone). 20 invitations partent en 2 min.
    </div>
  `);
  return { subject, html };
}

function buildD7(firstName, hasPublicProfile, hasReferralCode) {
  const subject = `${firstName ? firstName + ", t" : "T"}a vitrine publique`;
  const html = emailWrapper(`
    <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.15;margin-bottom:14px;">
      1 semaine sur RB Perform<span style="color:${G};">.</span>
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:20px;">
      Deux choses à débloquer cette semaine pour passer à l'échelle :
    </div>
    <div style="margin-bottom:14px;padding:18px 20px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
      <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">${hasPublicProfile ? "✓ Activée" : "01"} Vitrine publique</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:10px;">
        ${hasPublicProfile ? "Ton lien rbperform.app/coach/&lt;ton-slug&gt; est live. Colle-le dans ta bio Insta/TikTok pour les leads organiques." : "Active ta page coach publique : photo, bio, spécialités, témoignages clients. Lien partageable depuis Insta/TikTok."}
      </div>
      ${!hasPublicProfile ? `<a href="${SITE}/login" style="display:inline-block;padding:8px 14px;background:${G}15;border:1px solid ${G}40;border-radius:8px;color:${G};font-size:11px;font-weight:700;text-decoration:none;letter-spacing:.05em;text-transform:uppercase;">Activer ma vitrine →</a>` : ""}
    </div>
    <div style="margin-bottom:24px;padding:18px 20px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:14px;">
      <div style="font-size:11px;font-weight:700;color:${G};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">${hasReferralCode ? "✓ Code généré" : "02"} Parrainage coach</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:10px;">
        Tu connais un coach qui galère sur Trainerize ? Partage ton lien — vous gagnez chacun 1 mois offert.
      </div>
      <a href="${SITE}/login" style="display:inline-block;padding:8px 14px;background:${G}15;border:1px solid ${G}40;border-radius:8px;color:${G};font-size:11px;font-weight:700;text-decoration:none;letter-spacing:.05em;text-transform:uppercase;">${hasReferralCode ? "Partager mon code" : "Générer mon code"} →</a>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.7;">
      Une question ? Réponds direct à ce mail, je lis tout.<br/>— Rayan
    </div>
  `);
  return { subject, html };
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase env missing" });

  try {
    const now = Date.now();
    // Récupère tous les coachs créés dans les 14 derniers jours (window large)
    const since = new Date(now - 14 * 86400000).toISOString();
    const coaches = await sbFetch(
      `/rest/v1/coaches?select=id,email,full_name,first_name,created_at,public_profile_enabled,referral_code,onboarding_completed_at&created_at=gte.${since}`
    );
    if (!Array.isArray(coaches) || coaches.length === 0) {
      return res.status(200).json({ ok: true, eligible: 0, sent: 0 });
    }

    let sent = 0;
    let skipped = 0;
    const log = [];

    for (const c of coaches) {
      if (!c.email) { skipped++; continue; }
      const ageDays = Math.floor((now - new Date(c.created_at).getTime()) / 86400000);
      const firstName = c.first_name || (c.full_name || "").split(" ")[0] || "";

      // Détermine le palier à envoyer (J+0, J+3, J+7) avec fenêtre de tolérance
      let tier = null;
      if (ageDays === 0) tier = "d0";
      else if (ageDays >= 3 && ageDays <= 4) tier = "d3";
      else if (ageDays >= 7 && ageDays <= 8) tier = "d7";
      if (!tier) { skipped++; continue; }

      // Idempotence : check si déjà envoyé via coach_activity_log
      const activityType = `welcome_drip_${tier}`;
      const existing = await sbFetch(
        `/rest/v1/coach_activity_log?coach_id=eq.${c.id}&activity_type=eq.${activityType}&select=id&limit=1`
      );
      if (Array.isArray(existing) && existing.length > 0) { skipped++; continue; }

      // Pour J+3, check si client invité
      let hasInvited = false;
      if (tier === "d3") {
        const invs = await sbFetch(`/rest/v1/invitations?coach_id=eq.${c.id}&select=id&limit=1`);
        hasInvited = Array.isArray(invs) && invs.length > 0;
      }

      let emailContent;
      if (tier === "d0") emailContent = buildD0(firstName);
      else if (tier === "d3") emailContent = buildD3(firstName, hasInvited);
      else if (tier === "d7") emailContent = buildD7(firstName, !!c.public_profile_enabled, !!c.referral_code);

      const ok = await sendEmail(c.email, emailContent.subject, emailContent.html);
      if (ok) {
        sent++;
        log.push({ email: c.email, tier });
        // Marque comme envoyé
        await sbFetch(`/rest/v1/coach_activity_log`, {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            coach_id: c.id,
            activity_type: activityType,
            details: `Welcome drip ${tier} sent to ${c.email}`,
          }),
        });
      }
    }

    return res.status(200).json({ ok: true, eligible: coaches.length, sent, skipped, log });
  } catch (e) {
    console.error("[cron-coach-welcome-drip]", e);
    await captureException(e, { tags: { endpoint: "cron-coach-welcome-drip" } });
    return res.status(500).json({ error: e.message });
  }
};
