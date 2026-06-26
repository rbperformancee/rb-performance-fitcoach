/**
 * GET /api/coaching-call-confirm?token=xxx
 *
 * Endpoint public (auth via token unique non-guessable) appelé quand le
 * prospect clique "Je confirme — j'y serai" dans le mail H-24.
 * Marque call_confirmed_at + sert une mini page HTML de confirmation
 * cohérente avec le brand RB Perform (fond noir, accent cyan).
 *
 * Token usage : 1 token = 1 application. Le token reste valide jusqu'au
 * call_outcome posé (peut re-confirmer si re-clic).
 */

const nodemailer = require('nodemailer');

const G = '#02d1ba';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const RAYAN_EMAIL = process.env.RAYAN_PERSONAL_EMAIL || 'rayan.b2701@gmail.com';

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`SB ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

function htmlPage({ title, headline, sub, accent, isError }) {
  const color = accent || G;
  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escHtml(title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,Inter,sans-serif;background:#050505;color:#fff;min-height:100dvh;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;text-align:center;overflow:hidden}
  .card{max-width:480px;width:100%;background:linear-gradient(180deg,#101010 0%,#0a0a0a 100%);border:1px solid ${color}40;border-radius:24px;padding:48px 32px;box-shadow:0 20px 60px ${color}22,0 0 0 1px rgba(255,255,255,0.04) inset}
  .icon{width:88px;height:88px;border-radius:50%;background:${color}1c;border:2px solid ${color};margin:0 auto 28px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px ${color}0a}
  .icon svg{width:38px;height:38px;stroke:${color};fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
  .eyebrow{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${color};font-weight:800;margin-bottom:14px}
  h1{font-size:28px;font-weight:900;letter-spacing:-1px;line-height:1.2;margin-bottom:16px}
  p{font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7}
  .footer{margin-top:36px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.5px}
</style></head>
<body>
  <div class="card">
    <div class="icon">
      ${isError
        ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'}
    </div>
    <div class="eyebrow">${escHtml(headline)}</div>
    <h1>${escHtml(title)}</h1>
    <p>${sub}</p>
    <div class="footer">RB Perform · Rayan Bonte</div>
  </div>
</body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }
  const token = req.query?.token;
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{32,64}$/.test(token)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(400).send(htmlPage({
      title: 'Lien invalide',
      headline: 'Erreur',
      sub: 'Ce lien de confirmation n\'est pas valide. Réponds à mon mail ou écris-moi sur WhatsApp.',
      accent: '#ef4444', isError: true,
    }));
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).send('Server config error');
    return;
  }

  try {
    const apps = await sbFetch(
      `/rest/v1/coaching_applications?call_confirm_token=eq.${token}&select=id,nom_prenom,call_scheduled_at,call_confirmed_at,call_outcome&limit=1`
    );
    if (!Array.isArray(apps) || apps.length === 0) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send(htmlPage({
        title: 'Lien expiré',
        headline: 'Introuvable',
        sub: 'Ce lien ne correspond à aucun rendez-vous actif. Si tu veux quand même confirmer, écris-moi sur WhatsApp.',
        accent: '#ef4444', isError: true,
      }));
      return;
    }
    const app = apps[0];

    // Déjà refusé / fait
    if (app.call_outcome && app.call_outcome !== 'pending' && app.call_outcome !== 'rescheduled') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(htmlPage({
        title: 'Rendez-vous déjà clos',
        headline: 'Info',
        sub: 'Ce rendez-vous a déjà été traité de mon côté. Si tu veux qu\'on en cale un nouveau, écris-moi sur WhatsApp.',
        accent: '#fbbf24', isError: true,
      }));
      return;
    }

    // Marque confirmé (ou re-confirmé) — idempotent
    const isFirstConfirm = !app.call_confirmed_at;
    if (isFirstConfirm) {
      await sbFetch(`/rest/v1/coaching_applications?id=eq.${app.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ call_confirmed_at: new Date().toISOString() }),
      });

      // Notif Rayan : best effort (un fail ici n'empêche pas la page
      // de s'afficher au prospect). Seulement à la 1ère confirmation
      // pour éviter de spammer si re-click.
      if (SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.eu', port: 465, secure: true,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          });
          const dateForRayan = (() => {
            try {
              return new Intl.DateTimeFormat('fr-FR', {
                timeZone: 'Europe/Paris',
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              }).format(new Date(app.call_scheduled_at)).replace(':', 'h');
            } catch { return ''; }
          })();
          const prospectName = (app.nom_prenom || '').trim() || 'Candidat';
          await transporter.sendMail({
            from: `RB Perform <${SMTP_USER}>`,
            to: [RAYAN_EMAIL],
            replyTo: SMTP_USER,
            subject: `Confirmé : ${prospectName} sera là — ${dateForRayan}`,
            html: `<!DOCTYPE html><html><body style="font-family:-apple-system,Inter,sans-serif;background:#050505;color:#fff;padding:30px"><div style="max-width:480px;margin:0 auto;background:#0d0d0d;padding:28px;border-radius:14px;border:1px solid ${G}33"><div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:12px">Prospect a confirmé</div><div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-0.3px">${escHtml(prospectName)}</div><div style="font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:16px">a cliqué "Je confirme" dans le mail H-24</div><div style="font-size:16px;color:${G};font-weight:800;padding:12px 14px;background:rgba(2,209,186,0.08);border-radius:10px;text-transform:capitalize">${escHtml(dateForRayan)}</div></div></body></html>`,
          });
        } catch (e) {
          console.warn(`[call-confirm] Rayan notif failed: ${e.message}`);
        }
      }
    }

    const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
    const dateLabel = (() => {
      try {
        return new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Europe/Paris',
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit',
        }).format(new Date(app.call_scheduled_at)).replace(':', 'h');
      } catch { return ''; }
    })();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(htmlPage({
      title: `Confirmé${firstName ? ', ' + escHtml(firstName) : ''}.`,
      headline: 'Rendez-vous confirmé',
      sub: `On se parle ${escHtml(dateLabel)}.<br><br>Je t'appelle sur WhatsApp à l'heure. Prépare ton vrai pourquoi, sois dans un endroit calme — on va faire un truc bien.`,
    }));
  } catch (err) {
    console.error('[coaching-call-confirm] error:', err.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(htmlPage({
      title: 'Erreur temporaire',
      headline: 'Problème',
      sub: 'Réessaie dans 1 min ou écris-moi sur WhatsApp si ça persiste.',
      accent: '#ef4444', isError: true,
    }));
  }
};
