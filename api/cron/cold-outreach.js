/**
 * Cron: cold-outreach — tous les jours a 08:00 UTC (10:00 Paris)
 *
 * Envoie les cold emails de la sequence :
 *   - J+0 : premier email (status new → sent_1)
 *   - J+3 : relance 1 (status sent_1 → sent_2)
 *   - J+7 : derniere relance (status sent_2 → sent_3)
 *
 * Envoie via SMTP Zoho (rayan@rbperform.app)
 * Max 30 emails par execution (pour pas se faire flag)
 */

const nodemailer = require('nodemailer');
const { captureException } = require('../_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const CRON_SECRET = process.env.CRON_SECRET;

const MAX_PER_RUN = 30;

function isAuthorized(req) {
  if (!CRON_SECRET) return process.env.NODE_ENV !== 'production';
  return (req.headers.authorization || '') === `Bearer ${CRON_SECRET}`;
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

// ===== TEMPLATES =====
function getSubject(step, name) {
  const first = (name || '').split(' ')[0] || 'Coach';
  if (step === 1) return `${first}, tu perds de l\'argent sans le savoir`;
  if (step === 2) return `Re: ${first}, j\'ai oublie de te dire un truc`;
  return `Derniere chance ${first} — 30 places`;
}

function getBody(step, prospect) {
  const first = (prospect.full_name || '').split(' ')[0] || 'Coach';
  const ig = prospect.instagram ? `@${prospect.instagram.replace('@','')}` : '';

  if (step === 1) {
    return `Salut ${first},

Je suis Rayan, fondateur de RB Perform. J\'ai vu ton profil${ig ? ' ('+ig+')' : ''} et ton contenu coaching.

J\'ai construit un outil qui fait un truc simple : il empeche tes clients de partir sans que tu le voies. Une IA qui tourne chaque matin a 7h, scanne tes clients, detecte ceux qui decrochent, et te dit exactement quoi faire.

Les coachs qui l\'utilisent recuperent en moyenne 1 200EUR/mois de revenus qu\'ils perdaient sans le savoir.

On lance en mai avec 30 places fondateurs a 199EUR/mois verrouille a vie (au lieu de 299EUR). Le lien est sur rbperform.app si tu veux voir la demo.

A bientot,
Rayan
RB Perform — rbperform.app`;
  }

  if (step === 2) {
    return `Re ${first},

J\'ai oublie de te preciser un truc dans mon dernier message.

L\'outil inclut aussi une app client premium que tes athletes utilisent directement. Suivi des seances, nutrition, poids, messagerie avec toi. Tout est dans une seule app a ton nom.

En gros tu passes de 4 outils differents a 1 seul. Et toi tu as un dashboard CEO avec ton MRR, ta retention, tes alertes.

Tu peux tester la demo en 2 min sur rbperform.app/demo (cote coach) et rbperform.app/demo-client (cote athlete).

30 places fondateurs, il en reste encore.

Rayan
rbperform.app`;
  }

  return `${first},

Dernier message de ma part — je veux pas etre lourd.

On lance dans quelques jours. Les 30 places fondateurs a 199EUR/mois verrouille a vie partent vite. Apres ca le prix passe a 299EUR.

Si c\'est pas pour toi, pas de souci. Mais si tu coaches en ligne et que tu veux un outil qui fait le taf, jette un oeil a rbperform.app avant que ce soit complet.

Bonne continuation,
Rayan
RB Perform`;
}

function buildHtml(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/(rbperform\.app\S*)/g, '<a href="https://$1" style="color:#02d1ba">$1</a>');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:-apple-system,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#111;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:32px 28px">
<div style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.8">${escaped}</div>
</div>
<div style="text-align:center;padding:16px;font-size:10px;color:rgba(255,255,255,0.15)">
<a href="mailto:rayan@rbperform.app?subject=Desabonnement" style="color:rgba(255,255,255,0.2)">Se desinscrire</a>
</div>
</body></html>`;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!SMTP_PASS) return res.status(500).json({ error: 'ZOHO_SMTP_PASS missing' });

  try {
    const now = new Date().toISOString();

    // Get prospects who need an email
    const prospects = await sb(
      `/rest/v1/cold_prospects?status=in.(new,sent_1,sent_2)&next_email_at=lte.${now}&order=next_email_at.asc&limit=${MAX_PER_RUN}`
    );

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return res.status(200).json({ status: 'nothing_to_send', count: 0 });
    }

    // Setup SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    let sent = 0;
    let errors = 0;

    for (const prospect of prospects) {
      if (!prospect.email) continue;

      const step = prospect.emails_sent + 1;
      if (step > 3) continue;

      const subject = getSubject(step, prospect.full_name);
      const textBody = getBody(step, prospect);
      const htmlBody = buildHtml(textBody);

      try {
        await transporter.sendMail({
          from: `Rayan Bonte <${SMTP_USER}>`,
          to: prospect.email,
          subject,
          text: textBody,
          html: htmlBody,
          replyTo: SMTP_USER,
        });

        // Update prospect
        const newStatus = step === 1 ? 'sent_1' : step === 2 ? 'sent_2' : 'sent_3';
        const nextDate = step < 3
          ? new Date(Date.now() + (step === 1 ? 3 : 4) * 86400000).toISOString()
          : null;

        await sb(`/rest/v1/cold_prospects?id=eq.${prospect.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: newStatus,
            emails_sent: step,
            last_email_at: now,
            next_email_at: nextDate,
          }),
        });

        sent++;

        // Pause 8-15s entre chaque email (anti-spam)
        await new Promise(r => setTimeout(r, 8000 + Math.random() * 7000));

      } catch (e) {
        console.error(`[cold-outreach] ${prospect.email}:`, e.message);
        if (e.message.includes('Invalid') || e.message.includes('reject')) {
          await sb(`/rest/v1/cold_prospects?id=eq.${prospect.id}`, {
            method: 'PATCH',
            prefer: 'return=minimal',
            body: JSON.stringify({ status: 'bounced' }),
          });
        }
        errors++;
      }
    }

    return res.status(200).json({ status: 'ok', sent, errors, total: prospects.length });
  } catch (e) {
    console.error(`[CRON_COLD_OUTREACH_FAILED] reason="${e.message}"`);
    await captureException(e, { tags: { endpoint: 'cron-cold-outreach', stage: 'uncaught' } });
    return res.status(500).json({ error: e.message });
  }
}
