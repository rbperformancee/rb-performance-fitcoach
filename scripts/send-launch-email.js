// Envoie l'email de lancement "5 places" aux ~80 leads via Gmail SMTP.
// Sender : rb.performancee@gmail.com (continuite avec l'email du 17 mars).
// Mode :
//   node scripts/send-launch-email.js --test   → envoie 1 email a rayan.b2701@gmail.com
//   node scripts/send-launch-email.js --live   → envoie a tous les leads du CSV
//   node scripts/send-launch-email.js --delivered-only --live  → filtre delivered only
// Auth : variable d'env GMAIL_APP_PASSWORD (16 chars de myaccount.google.com/apppasswords)

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const GMAIL_USER = 'rb.performancee@gmail.com';
const GMAIL_PASS = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const FROM = `Rayan Bonte <${GMAIL_USER}>`;
const REPLY_TO = GMAIL_USER;
const SUBJECT = '5 places.';
const LEADS_CSV = '/Users/rayan/Library/CloudStorage/OneDrive-Personnel/Documents/RB PERFORM APP/LEADS/Liste-leads-RB-Perform.csv';
const TEST_RECIPIENT = 'rayan.b2701@gmail.com';
const THROTTLE_MS = 1500;
const LOG_FILE = '/tmp/launch-email.log';

const args = process.argv.slice(2);
const isTest = args.includes('--test');
const isLive = args.includes('--live');
const deliveredOnly = args.includes('--delivered-only');
// --resume : lit /tmp/launch-email.log et skip les emails déjà envoyés (✓)
// Permet de reprendre un batch interrompu sans re-spammer.
const isResume = args.includes('--resume');

if (!isTest && !isLive) {
  console.error('Usage: node send-launch-email.js [--test|--live] [--delivered-only]');
  process.exit(1);
}
if (!GMAIL_PASS) {
  console.error('ERREUR : GMAIL_APP_PASSWORD non defini.');
  console.error('Genere ton App Password sur https://myaccount.google.com/apppasswords');
  console.error('Puis : GMAIL_APP_PASSWORD="abcd efgh ijkl mnop" node scripts/send-launch-email.js --test');
  process.exit(1);
}

// ── Build HTML email (premium dark, match charte RB Perform) ──
const buildHTML = () => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:44px 36px">

    <div style="font-size:10px;letter-spacing:5px;text-transform:uppercase;color:#02d1ba;margin-bottom:24px;font-weight:800">
      Accompagnement Premium &middot; 5 places
    </div>

    <div style="font-size:34px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-1.5px;margin-bottom:24px">
      5 places.<br>
      <span style="color:#02d1ba">Avant tout le monde.</span>
    </div>

    <p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;margin:0 0 18px">
      Salut,
    </p>

    <p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;margin:0 0 18px">
      Tu fais partie des personnes &agrave; qui j'&eacute;cris en premier &mdash; soit tu as d&eacute;j&agrave; mes programmes, soit tu suis ce que je fais depuis le d&eacute;but.
    </p>

    <p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;margin:0 0 28px">
      C'est pour &ccedil;a que je te dis &ccedil;a avant tout le monde.
    </p>

    <div style="margin:0 0 28px;padding:22px 24px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.22);border-radius:12px">
      <p style="font-size:16px;color:#fff;line-height:1.7;margin:0;font-weight:600">
        J'ouvre <strong style="color:#02d1ba">5 places</strong> en accompagnement personnel, sur l'app premium <strong>RB Perform</strong>.
      </p>
    </div>

    <p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;margin:0 0 18px">
      L'app, c'est ce que j'ai construit ces derniers mois. Elle est r&eacute;serv&eacute;e &agrave; mes clients priv&eacute;s &mdash; tu ne peux pas l'acheter seul.
    </p>

    <p style="font-size:15px;color:rgba(255,255,255,0.85);line-height:1.75;margin:0 0 32px;font-weight:600">
      C'est ce qui fait la vraie diff&eacute;rence sur 3 mois.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 28px">
      <tr><td align="center">
        <a href="https://rbperform.app/candidature"
           style="display:inline-block;padding:18px 38px;background:#02d1ba;color:#000;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;border-radius:14px">
          Voir l'offre &rarr;
        </a>
      </td></tr>
    </table>

    <p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;text-align:center;margin:0 0 28px">
      Aucun paiement avant que je valide ton dossier.<br>
      C'est moi qui choisis les 5.
    </p>

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:8px 0 24px"></div>

    <p style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">
      Rayan.
    </p>

  </td></tr>

  <tr><td style="padding:24px 8px 0">
    <p style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;margin:0;font-style:italic">
      P.S. &mdash; Les 5 places se ferment d&egrave;s qu'elles sont remplies.
    </p>
  </td></tr>

  <tr><td style="padding:32px 8px 0;text-align:center">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.18);font-weight:700">
      RB Perform &middot; Rayan Bonte
    </div>
  </td></tr>

</table>
</td></tr></table></body></html>`;

// ── Plain-text fallback (pour clients qui ne lisent pas le HTML) ──
const buildText = () => `5 places. Avant tout le monde.

Salut,

Tu fais partie des personnes a qui j'ecris en premier — soit tu as deja mes programmes, soit tu suis ce que je fais depuis le debut.

C'est pour ca que je te dis ca avant tout le monde.

J'ouvre 5 places en accompagnement personnel, sur l'app premium RB Perform.

L'app, c'est ce que j'ai construit ces derniers mois. Elle est reservee a mes clients prives — tu ne peux pas l'acheter seul.

C'est ce qui fait la vraie difference sur 3 mois.

Tout est sur la page : https://rbperform.app/candidature

Aucun paiement avant que je valide ton dossier. C'est moi qui choisis les 5.

Rayan.

P.S. — Les 5 places se ferment des qu'elles sont remplies.`;

// ── Leads supplémentaires (clients Pack découverte récents) ──
// Ajoutés manuellement par Rayan le 2026-05-04 pour le launch /candidature.
// Inclus par défaut (--include-extras pas requis).
const EXTRA_LEADS = [
  'asheshbarreau@gmail.com',
  'halim.salhi@hotmail.com',
  'arthurroca66220@gmail.com',
  'paulrebert75@gmail.com',
  'thomasloubatieres@icloud.com',
  'floriangustot@gmail.com',
  'gio-italia@outlook.fr',
  'lesmlogan@gmail.com',
  'barth.mlh94@gmail.com',
];

// ── Lecture des emails déjà envoyés (pour --resume) ──
const loadAlreadySent = () => {
  if (!fs.existsSync(LOG_FILE)) return new Set();
  const raw = fs.readFileSync(LOG_FILE, 'utf8');
  const sent = new Set();
  for (const line of raw.split('\n')) {
    // Format : "2026-05-04T18:34:21.234Z [N/M] ✓ email@example.com (<msgId>)"
    const m = line.match(/✓\s+([^\s]+@[^\s]+)\s/);
    if (m) sent.add(m[1].toLowerCase());
  }
  return sent;
};

// ── Read leads from CSV + extras ──
const loadLeads = () => {
  const raw = fs.readFileSync(LEADS_CSV, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  const cols = header.split(',');
  const emailIdx = cols.findIndex(c => c.toLowerCase().trim() === 'email');
  const statusIdx = cols.findIndex(c => c.toLowerCase().includes('statut'));
  let leads = rows.map(r => {
    const parts = r.split(',');
    return { email: (parts[emailIdx] || '').trim(), status: (parts[statusIdx] || '').trim() };
  }).filter(l => l.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(l.email));
  if (deliveredOnly) leads = leads.filter(l => l.status === 'delivered');

  // Append les EXTRA_LEADS (si pas déjà dans le CSV)
  const csvEmails = new Set(leads.map(l => l.email.toLowerCase()));
  for (const e of EXTRA_LEADS) {
    if (!csvEmails.has(e.toLowerCase())) {
      leads.push({ email: e, status: 'extra' });
    }
  }

  // Si --resume, retire les emails déjà envoyés (logged ✓)
  if (isResume) {
    const sent = loadAlreadySent();
    const before = leads.length;
    leads = leads.filter(l => !sent.has(l.email.toLowerCase()));
    console.log(`[resume] Skipped ${before - leads.length} emails déjà envoyés (depuis ${LOG_FILE})`);
  }

  // Dédup final (au cas où)
  const seen = new Set();
  return leads.filter(l => {
    const k = l.email.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ── Main ──
(async () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  // Verif auth
  console.log(`[auth] Verification Gmail SMTP (${GMAIL_USER})…`);
  await transporter.verify();
  console.log('[auth] OK');

  const html = buildHTML();
  const text = buildText();

  let recipients;
  if (isTest) {
    recipients = [{ email: TEST_RECIPIENT, status: 'test' }];
    console.log(`[mode] TEST → ${TEST_RECIPIENT}`);
  } else {
    recipients = loadLeads();
    console.log(`[mode] LIVE → ${recipients.length} destinataires${deliveredOnly ? ' (delivered only)' : ''}`);
    console.log(`[preview] ${recipients.slice(0, 5).map(r => r.email).join(', ')}${recipients.length > 5 ? '…' : ''}`);
    console.log(`[wait] Demarrage dans 5s — Ctrl+C pour annuler`);
    await new Promise(r => setTimeout(r, 5000));
  }

  const log = (line) => {
    const stamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `${stamp} ${line}\n`);
    console.log(line);
  };
  log(`──── BATCH START ${isTest ? 'TEST' : 'LIVE'} (${recipients.length}) ────`);

  let ok = 0, fail = 0;
  for (let i = 0; i < recipients.length; i++) {
    const { email } = recipients[i];
    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: email,
        replyTo: REPLY_TO,
        subject: SUBJECT,
        text,
        html,
      });
      log(`[${i + 1}/${recipients.length}] ✓ ${email} (${info.messageId})`);
      ok++;
    } catch (e) {
      log(`[${i + 1}/${recipients.length}] ✗ ${email} — ${e.message}`);
      fail++;
    }
    if (i < recipients.length - 1) {
      await new Promise(r => setTimeout(r, THROTTLE_MS));
    }
  }
  log(`──── BATCH DONE — ✓${ok} ✗${fail} (log: ${LOG_FILE}) ────`);
})().catch(e => { console.error(e); process.exit(1); });
