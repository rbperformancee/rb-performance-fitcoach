/**
 * Cron nurture lead magnet Pack Découverte.
 * Schedule : daily 9h UTC (vercel.json)
 *
 * Pour chaque pack_decouverte_optins avec status='active' :
 *   J+0 : (déjà envoyé par /api/pack-decouverte-optin — welcome + pack)
 *   J+1 : "L'erreur n°1 des athlètes amateurs" (valeur actionnable)
 *   J+3 : "Comment Raphaël a transformé sa prép en 3 mois" (preuve sociale)
 *   J+5 : "Pourquoi t'as toujours pas le physique d'athlète" (objection killer)
 *   J+7 : "Si t'es prêt à passer à la vitesse supérieure" (CTA candidature)
 *
 * Dedup via funnel_notification_logs (migration 118).
 * Skip si converted (status='converted' = devenu candidature high-ticket).
 *
 * Verrous brand respectés : pas de "coach", pas de prix, ton "athlète".
 */

const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const APP_URL = process.env.REACT_APP_PUBLIC_URL || 'https://rbperform.app';
const G = '#02d1ba';

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || '') === `Bearer ${cronSecret}`;
}

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

const wrap = (eyebrow, body) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">
    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">${eyebrow}</div>
    ${body}
    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:18px">Rayan</div>
  </td></tr>
  <tr><td style="padding:20px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.22);letter-spacing:.5px">RB Perform · Rayan Bonte</div>
  </td></tr>
</table>
</td></tr></table></body></html>`;

const TEMPLATES = {
  // J+1 — Valeur actionnable
  nurture_j1: (firstName) => ({
    subject: `L'erreur n°1 que je vois chez 90% des athlètes`,
    html: wrap('Méthode · 24h après ton pack', `
      <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;margin-bottom:16px">
        Le truc qui te ralentit le plus${firstName ? ', ' + escHtml(firstName) : ''}.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:20px">
        90% des athlètes amateurs que je vois font la même erreur : ils changent de programme tous les 4-6 semaines parce qu'ils s'ennuient ou qu'ils ont vu un nouveau "système" sur Instagram.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.75;margin-bottom:24px">
        Résultat : leur corps n'a jamais le temps d'<em>adapter</em>. Tu progresses sur les 3 premières semaines (système nerveux), puis tu plateau, et au lieu de pousser à travers, tu changes. Tu recommences de zéro chaque mois.
      </div>
      <div style="margin-bottom:24px;padding:18px 20px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
        <div style="font-size:13px;color:#fff;line-height:1.7;font-weight:600;margin-bottom:6px">La règle que j'applique sur tous mes athlètes :</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7">
          <strong style="color:#fff">12 semaines minimum</strong> sur la même structure de programme. Les charges montent, les volumes ajustent, mais les mouvements clés restent. C'est le seul moyen d'avoir un vrai feedback corps/effort.
        </div>
      </div>
      <div style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin-bottom:14px">
        Si tu suis le Pack Découverte, fais les 4 semaines au complet avant de juger. Pas de switch en cours.
      </div>
    `),
  }),

  // J+3 — Preuve sociale (case study Alexis / Dragons Catalans)
  nurture_j3: (firstName) => ({
    subject: `${firstName ? firstName + ', ' : ''}le cas d'Alexis (Dragons Catalans)`,
    html: wrap('Case study · J+3', `
      <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;margin-bottom:16px">
        D'amateur sérieux à athlète pro chez les Dragons Catalans.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:20px">
        Alexis, c'est le mec qui m'envoie les meilleurs résultats que je puisse montrer. Il joue maintenant aux <strong style="color:#fff">Dragons Catalans</strong> en pro. On bosse ensemble depuis longtemps, et ce qu'on construit avec lui n'a rien à voir avec "prendre de la masse" ou "perdre du gras".
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.75;margin-bottom:24px">
        Ce qu'on travaille avec lui : <strong style="color:#fff">puissance</strong>, <strong style="color:#fff">explosivité</strong>, <strong style="color:#fff">résistance aux blessures</strong> en saison, et la récupération entre matchs. La logique n'est pas la même qu'un programme de salle classique — c'est une prep physique au service d'une performance sportive précise.
      </div>
      <div style="margin-bottom:24px;padding:18px 20px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
        <div style="font-size:13px;color:#fff;line-height:1.7;font-weight:600;margin-bottom:6px">Ce qui a fait la différence pour lui :</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7">
          → Une structure de programme qui s'ajuste à son calendrier compétition<br>
          → Pas de surcharge inutile en semaine de match<br>
          → Suivi régulier sur les ressentis (fatigue, gênes, sommeil)<br>
          → Ajustement nutrition selon les phases (intensification / décharge / compétition)
        </div>
      </div>
      <div style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.75;margin-bottom:12px">
        Pour toi qui n'es pas pro — le pattern reste le même. Une prep adaptée à TON sport et TA vie, pas un copier-coller générique. C'est ça qui change tout.
      </div>
    `),
  }),

  // J+5 — Objection killer
  nurture_j5: (firstName) => ({
    subject: `Pourquoi t'as toujours pas le physique que tu veux`,
    html: wrap('Honnêteté · J+5', `
      <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;margin-bottom:16px">
        Honnêteté brute${firstName ? ', ' + escHtml(firstName) : ''}.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:20px">
        Si t'as téléchargé le Pack Découverte mais que tu te dis "ouais je verrai plus tard", j'ai une question pour toi : tu fais ça depuis quand exactement ?
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.75;margin-bottom:20px">
        La raison pour laquelle t'as toujours pas le physique que tu veux, c'est pas le programme. C'est pas la salle. C'est pas l'app. C'est que tu n'as <em>jamais</em> appliqué quelque chose sérieusement sur 6 mois sans dévier.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.75;margin-bottom:24px">
        Et c'est pas ta faute — c'est juste qu'on a tous besoin d'un point d'ancrage externe pour tenir un cap.
      </div>
      <div style="margin-bottom:24px;padding:18px 20px;background:rgba(2,209,186,0.05);border-left:3px solid ${G};border-radius:6px">
        <div style="font-size:14px;color:#fff;line-height:1.7;font-weight:600;margin-bottom:6px">Mes athlètes accompagnés ne sont pas plus motivés que toi.</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7">
          Ils ont juste pris la décision d'avoir quelqu'un qui les rappelle à l'ordre, qui ajuste leur programme, qui les pousse quand ils traînent. C'est ça qui fait la différence — pas l'info, la structure.
        </div>
      </div>
      <div style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.75;margin-bottom:8px">
        Je t'écris pas pour te vendre. Je t'écris pour que tu réfléchisses 30 secondes à pourquoi t'es encore là à 26, 28, 32 ans avec un physique de "j'ai potentiel" plutôt qu'un physique de "j'ai exécuté".
      </div>
    `),
  }),

  // J+7 — CTA candidature high-ticket
  nurture_j7: (firstName) => ({
    subject: `Dernier message — si t'es prêt`,
    html: wrap('CTA · J+7', `
      <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.2;margin-bottom:16px">
        Si t'es prêt à passer à la vitesse supérieure.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.75;margin-bottom:20px">
        Ça fait une semaine que t'as récupéré le pack. Si t'as appliqué — bravo, continue. Si tu n'as pas appliqué, je t'invite à honnêtement réfléchir à pourquoi.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.75;margin-bottom:24px">
        Pour ceux qui veulent passer du "j'essaie tout seul" à "j'ai un accompagnement sérieux sur 6-12 mois avec une vraie méthode", j'ai mon programme premium <strong style="color:#fff">RB Perform PRO</strong>. C'est limité (15 places max / mois), sur dossier, et ce n'est pas pour tout le monde.
      </div>
      <div style="font-size:15px;color:rgba(255,255,255,0.7);line-height:1.75;margin-bottom:24px">
        Si tu veux candidater :
      </div>
      <div style="margin-bottom:28px;text-align:center">
        <a href="${escHtml(APP_URL)}/candidature" style="display:inline-block;padding:16px 32px;background:${G};color:#000;text-decoration:none;font-weight:900;font-size:14px;border-radius:10px;letter-spacing:.5px">
          → DÉCOUVRIR L'ACCOMPAGNEMENT
        </a>
      </div>
      <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:8px">
        Si tu veux pas, c'est OK aussi. Garde le pack, continue sérieusement, et reviens vers moi le jour où tu sens que c'est le bon moment.
      </div>
    `),
  }),
};

function buildTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function wasSent(refId, type) {
  const data = await sbFetch(
    `/rest/v1/funnel_notification_logs?ref_id=eq.${refId}&type=eq.${type}&select=id&limit=1`
  );
  return Array.isArray(data) && data.length > 0;
}

async function logSent(refId, type) {
  await sbFetch('/rest/v1/funnel_notification_logs', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      ref_id: refId,
      type,
      sent_date: new Date().toISOString().split('T')[0],
    }),
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  const transporter = buildTransporter();
  if (!transporter) {
    return res.status(500).json({ error: 'Missing ZOHO_SMTP_PASS' });
  }

  // ════════ PREVIEW MODE ════════
  // Permet de tester les 4 mails du funnel en les envoyant à un email donné
  // (typiquement rayan.b2701@gmail.com pour validation visuelle).
  // Pas de DB write, pas de dedup, pas d'âge check. Auth via CRON_SECRET.
  // Usage : POST /api/cron-pack-decouverte-nurture?preview_to=rayan.b2701@gmail.com
  const previewTo = (req.query?.preview_to || '').toString().trim();
  if (previewTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previewTo)) {
    const firstName = (req.query?.first_name || 'Rayan').toString().slice(0, 60);
    const previews = [
      { key: 'j1', tpl: TEMPLATES.nurture_j1(firstName) },
      { key: 'j3', tpl: TEMPLATES.nurture_j3(firstName) },
      { key: 'j5', tpl: TEMPLATES.nurture_j5(firstName) },
      { key: 'j7', tpl: TEMPLATES.nurture_j7(firstName) },
    ];
    const sentList = [];
    for (const p of previews) {
      try {
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [previewTo],
          replyTo: SMTP_USER,
          subject: `[PREVIEW ${p.key.toUpperCase()}] ${p.tpl.subject}`,
          html: p.tpl.html,
        });
        sentList.push(p.key);
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.error(`[NURTURE_PREVIEW_FAIL] key=${p.key} err=${e.message}`);
      }
    }
    return res.status(200).json({ ok: true, preview_mode: true, sent: sentList });
  }

  const results = { j1: 0, j3: 0, j5: 0, j7: 0, skipped: 0, errors: 0 };
  const now = Date.now();

  try {
    // Range : optins actifs créés entre 8 jours et 1 jour
    const since = new Date(now - 8 * 86400 * 1000).toISOString();
    const until = new Date(now - 1 * 86400 * 1000 + 3600 * 1000).toISOString();
    const optins = await sbFetch(
      `/rest/v1/pack_decouverte_optins?status=eq.active&created_at=gte.${since}&created_at=lte.${until}&select=id,email,nom_prenom,created_at&order=created_at.asc`
    );
    if (!Array.isArray(optins)) {
      return res.status(500).json({ error: 'Failed to load optins', detail: optins });
    }

    for (const optin of optins) {
      const created = new Date(optin.created_at).getTime();
      const daysSince = (now - created) / 86400000;
      const firstName = (optin.nom_prenom || '').trim().split(/\s+/)[0] || '';

      let type, tpl;
      if (daysSince >= 1 && daysSince < 2) {
        type = 'nurture_j1'; tpl = TEMPLATES.nurture_j1(firstName);
      } else if (daysSince >= 3 && daysSince < 4) {
        type = 'nurture_j3'; tpl = TEMPLATES.nurture_j3(firstName);
      } else if (daysSince >= 5 && daysSince < 6) {
        type = 'nurture_j5'; tpl = TEMPLATES.nurture_j5(firstName);
      } else if (daysSince >= 7 && daysSince < 8) {
        type = 'nurture_j7'; tpl = TEMPLATES.nurture_j7(firstName);
      } else {
        results.skipped++;
        continue;
      }

      try {
        if (await wasSent(optin.id, type)) {
          results.skipped++;
          continue;
        }
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [optin.email],
          replyTo: SMTP_USER,
          subject: tpl.subject,
          html: tpl.html,
        });
        await logSent(optin.id, type);
        if (type === 'nurture_j1') results.j1++;
        else if (type === 'nurture_j3') results.j3++;
        else if (type === 'nurture_j5') results.j5++;
        else if (type === 'nurture_j7') results.j7++;
      } catch (err) {
        results.errors++;
        console.error(`[NURTURE_PACK_FAIL] optin=${optin.id} email=${optin.email} err=${err.message}`);
        await captureException(err, {
          tags: { cron: 'pack-decouverte-nurture' },
          extra: { optin_id: optin.id, type, days_since: daysSince },
        });
      }
    }

    return res.status(200).json({ ok: true, processed: optins.length, ...results });
  } catch (err) {
    console.error('[cron-pack-decouverte-nurture] unexpected:', err.message);
    await captureException(err, { tags: { cron: 'pack-decouverte-nurture', stage: 'unexpected' } });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
