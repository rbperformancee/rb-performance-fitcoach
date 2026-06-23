// Cron bilans hebdo — version standalone exécutable hors Vercel.
//
// Tourne dans GitHub Actions (.github/workflows/cron-bilans.yml) sur 3
// créneaux : dim 19h UTC + mar 18h UTC + jeu 18h UTC. Indépendant du
// déploiement Vercel — pas de risque de casser la PWA en rebuild.
//
// Pour chaque client qui n'a pas encore soumis de bilan pour la semaine
// en cours :
//   1. Push web (Supabase Edge `send-push`) si endpoint actif
//   2. Push APNs (Vercel `/api/send-push-apns`) si CRON_SECRET dispo (iOS natif)
//   3. Email Zoho SMTP en fallback si pas de push reçue
//
// Tonalité du message selon le jour (UTC) :
//   dim → ton calme "Ton bilan, 30s"
//   mar → "3 jours qu'on t'attend"
//   jeu → "Dernier rappel"
//
// Env requis :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY     — accès DB
//   ZOHO_SMTP_USER, ZOHO_SMTP_PASS              — email fallback
//   CRON_SECRET, APP_BASE_URL                   — push APNs via endpoint Vercel
//   DRY_RUN=1                                   — optionnel : log only, n'envoie rien

import nodemailer from "nodemailer";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || "rayan@rbperform.app";
const SMTP_PASS = (process.env.ZOHO_SMTP_PASS || "").replace(/\s+/g, "");
const APP_BASE = process.env.APP_BASE_URL || "https://rbperform.app";
const CRON_SECRET = process.env.CRON_SECRET || "";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Lundi 00h UTC de la semaine courante = week_start des weekly_checkins.
function currentWeekStart() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function templatesForToday() {
  const day = new Date().getUTCDay();
  if (day === 2) return {
    label: "MARDI (relance J+2)",
    pushTitle: (n) => (n ? `${n}, on attend ton bilan` : "On attend ton bilan"),
    pushBody: "3 jours que la semaine a commencé. 30 secondes — c'est tout.",
    mailSubject: (n) => (n ? `${n}, on attend ton bilan — 30s` : "On attend ton bilan — 30s"),
    mailH1: (n) => `Ça fait 3 jours qu'on attend ton bilan${n ? ` ${n}` : ""}.`,
    mailIntro: "30 secondes. Poids, ressenti, c'est tout. Si tout va bien, dis-le moi — je préfère ça que pas de nouvelles.",
    mailCta: "Faire mon bilan",
  };
  if (day === 4) return {
    label: "JEUDI (relance J+4)",
    pushTitle: (n) => (n ? `${n}, dernier rappel bilan` : "Dernier rappel bilan"),
    pushBody: "Sans ton bilan, j'avance à l'aveugle pour la semaine prochaine. 30s.",
    mailSubject: (n) => (n ? `${n}, dernier rappel — ton bilan` : "Dernier rappel — ton bilan"),
    mailH1: (n) => `Dernier rappel${n ? ` ${n}` : ""} : ton bilan.`,
    mailIntro: "Sans tes infos je ne peux pas adapter ton plan pour la semaine prochaine. 30 secondes — promis. Si tu n'as rien à signaler, dis-le moi quand même.",
    mailCta: "Faire mon bilan",
  };
  return {
    label: "DIMANCHE (prompt initial)",
    pushTitle: (n) => (n ? `${n}, ton bilan ?` : "Ton bilan de la semaine"),
    pushBody: "30 secondes : poids, ressenti, photos. Ton coach voit ta progression.",
    mailSubject: (n) => (n ? `${n}, ton bilan de la semaine — 30s` : "Ton bilan de la semaine — 30s"),
    mailH1: () => `Ton bilan de la semaine, 30 secondes.`,
    mailIntro: "Poids, ressenti, photos si tu veux. Ça me permet de voir où tu en es et d'ajuster ton plan pour la semaine prochaine — au lieu de te laisser sur les rails.",
    mailCta: "Remplir mon bilan",
  };
}

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} ${path}`);
  return r.json();
}

async function sendWebPush(clientId, title, body, url) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ client_id: clientId, title, body, url }),
    });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({}));
    return (j.sent || 0) > 0;
  } catch { return false; }
}

async function sendApns(clientId, title, body, url) {
  if (!CRON_SECRET) return false;
  try {
    const r = await fetch(`${APP_BASE}/api/send-push-apns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CRON_SECRET}` },
      body: JSON.stringify({ client_id: clientId, title, body, url }),
    });
    if (r.status === 200) {
      const j = await r.json().catch(() => ({}));
      return (j.sent || 0) > 0;
    }
  } catch {}
  return false;
}

let _smtp = null;
function smtp() {
  if (_smtp || !SMTP_PASS) return _smtp;
  _smtp = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _smtp;
}

function emailHtml({ firstName, joinUrl, tpl }) {
  const greeting = firstName ? `Salut ${firstName},` : "Salut,";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="text-align:center;padding-bottom:24px"><svg viewBox="170 50 180 410" width="18" height="40" xmlns="http://www.w3.org/2000/svg"><polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill="#02d1ba"/></svg></td></tr>
<tr><td style="background:#111;border-radius:20px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px;">
<div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px">${greeting}</div>
<div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:16px;line-height:1.3">${tpl.mailH1(firstName)}</div>
<div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:32px">${tpl.mailIntro}</div>
<div style="text-align:center;margin-bottom:20px"><a href="${joinUrl}" style="display:inline-block;background:#02d1ba;color:#000;font-size:13px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:.08em;text-transform:uppercase;">${tpl.mailCta} →</a></div>
<div style="font-size:11px;color:rgba(255,255,255,0.25);text-align:center;letter-spacing:.04em">Si tu n'as rien de spécial à signaler : c'est OK, prends 30 secondes pour me dire que tout roule.</div>
</td></tr><tr><td style="padding:24px 0 0;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:.04em">Rayan · RB Perform</div></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendEmail(client, joinUrl, tpl) {
  const t = smtp();
  if (!t) return false;
  const firstName = (client.full_name || "").split(" ")[0] || "";
  try {
    await t.sendMail({
      from: `Rayan · RB Perform <${SMTP_USER}>`,
      to: client.email, replyTo: SMTP_USER,
      subject: tpl.mailSubject(firstName),
      html: emailHtml({ firstName, joinUrl, tpl }),
    });
    return true;
  } catch (e) {
    console.warn(`[email] failed for ${client.email}:`, e?.message || e);
    return false;
  }
}

// === MAIN ===
const weekStart = currentWeekStart();
const tpl = templatesForToday();
const joinUrl = `${APP_BASE}/login?view=checkin`;

console.log(`▶ Cron bilans · ${tpl.label} · week_start=${weekStart}${DRY_RUN ? " · DRY_RUN" : ""}`);

const clients = await sb(`/rest/v1/clients?select=id,full_name,email&limit=500`);
const subs = await sb(`/rest/v1/push_subscriptions?select=client_id`);
const pushSet = new Set(subs.map((s) => s.client_id).filter(Boolean));

const idsCsv = clients.map((c) => `"${c.id}"`).join(",");
const submitted = await sb(`/rest/v1/weekly_checkins?week_start=eq.${weekStart}&client_id=in.(${idsCsv})&select=client_id`);
const submittedSet = new Set(submitted.map((s) => s.client_id));

let pushSent = 0, emailSent = 0, alreadyDone = 0, noChannel = 0;

for (const c of clients) {
  if (submittedSet.has(c.id)) { alreadyDone++; continue; }
  const firstName = (c.full_name || "").split(" ")[0] || "";

  // Tentative push (web + APNs en parallèle)
  let pushOk = false;
  if (pushSet.has(c.id)) {
    if (DRY_RUN) { console.log(`  · DRY push → ${c.email}`); pushOk = true; }
    else {
      const [web, apns] = await Promise.all([
        sendWebPush(c.id, tpl.pushTitle(firstName), tpl.pushBody, "/login?view=checkin"),
        sendApns(c.id, tpl.pushTitle(firstName), tpl.pushBody, "/login?view=checkin"),
      ]);
      pushOk = web || apns;
    }
    if (pushOk) { pushSent++; continue; }
  }

  // Fallback email
  if (c.email) {
    if (DRY_RUN) { console.log(`  · DRY email → ${c.email}`); emailSent++; }
    else if (await sendEmail(c, joinUrl, tpl)) emailSent++;
    continue;
  }
  noChannel++;
}

console.log(`\n✓ Done. eligible=${clients.length} alreadyDone=${alreadyDone} pushSent=${pushSent} emailSent=${emailSent} noChannel=${noChannel}`);
