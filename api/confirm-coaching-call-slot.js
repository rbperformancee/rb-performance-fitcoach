/**
 * POST /api/confirm-coaching-call-slot
 *
 * Déclenché quand Rayan clique sur un des créneaux préférés du candidat
 * dans le CRM (boutons "Valider créneau A/B/C"). Action :
 *   - Update coaching_applications.call_scheduled_at avec le slot choisi
 *   - Envoie au candidat le mail de confirmation immédiate (date + heure,
 *     bouton Add to Calendar Google + .ics attaché, lien WhatsApp pour le
 *     call, lien vers la méthode pour préparation, tips no-show)
 *   - Les reminders J-1 et H-2 partent ensuite via le cron existant.
 *
 * Auth : super_admin JWT OU INTERNAL_API_SECRET (server-to-server).
 *
 * Body : { application_id: uuid, slot: { date: "YYYY-MM-DD", time: "HH:mm" } }
 *
 * Verrous brand respectés :
 *   - JAMAIS "coach sportif" ni "préparateur" (titres protégés)
 *   - JAMAIS le prix
 *   - Ton : "athlète qui accompagne les athlètes"
 */

const { z } = require('zod');
const nodemailer = require('nodemailer');
const { captureException } = require('./_sentry');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const SMTP_PASS = process.env.ZOHO_SMTP_PASS;
const ADMIN_SECRET = process.env.ADMIN_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
const G = '#02d1ba';
const WHATSAPP_URL = 'https://wa.me/33695129347';
const METHODE_URL = 'https://www.rbperform.com/methode-coaching';
const CALL_DURATION_MIN = 30;

const bodySchema = z.object({
  application_id: z.string().uuid(),
  slot: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

const escHtml = (s) => String(s ?? '').replace(/[&<>"'`=\/]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;',
}[c]));

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

function hasServerSecret(req) {
  if (!ADMIN_SECRET) return false;
  const headerSecret = req.headers['x-admin-secret'];
  if (headerSecret && headerSecret === ADMIN_SECRET) return true;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${ADMIN_SECRET}`;
}

async function isSupabaseSuperAdmin(req) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const jwt = m[1];
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
    });
    if (!userResp.ok) return false;
    const user = await userResp.json();
    const email = (user?.email || '').toLowerCase();
    if (!email) return false;
    const check = await sbFetch(
      `/rest/v1/super_admins?email=eq.${encodeURIComponent(email)}&select=email&limit=1`
    );
    return Array.isArray(check) && check.length > 0;
  } catch { return false; }
}

// "2026-06-30" + "19:00" → Date (interprété Europe/Paris)
// On reconstruit en local time puis on prend ISO. Note : Vercel functions
// tournent en UTC donc Date('2026-06-30T19:00') = 2026-06-30T19:00Z. On
// soustrait l'offset Paris (+02:00 été, +01:00 hiver) en utilisant le
// formateur Intl pour rester correct au changement d'heure.
function parseSlotToUTC(date, time) {
  const [Y, M, D] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  // Approximation Europe/Paris : on construit une date UTC qui représente
  // l'heure mur Paris demandée. Calc l'offset Paris via Intl.
  const localGuess = new Date(Date.UTC(Y, M - 1, D, h, m));
  const parisStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'shortOffset',
  }).formatToParts(localGuess);
  const offsetPart = parisStr.find(p => p.type === 'timeZoneName')?.value || 'GMT+2';
  const offsetMatch = offsetPart.match(/GMT([+-]\d+)/);
  const offsetH = offsetMatch ? parseInt(offsetMatch[1], 10) : 2;
  return new Date(Date.UTC(Y, M - 1, D, h - offsetH, m));
}

function formatFR(dateUTC) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(dateUTC).replace(':', 'h');
}

// Génère un .ics minimal pour Apple Calendar / Outlook / autres
function buildICS({ startUTC, endUTC, summary, description, location, organizerEmail, attendeeEmail, applicationId, sequence }) {
  const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  // UID DÉTERMINISTE basé sur application_id : si on resend un .ics pour
  // la même candidature (cas reschedule), même UID + SEQUENCE incrémenté
  // → Apple Calendar / Google Cal détectent et UPDATE l'event existant
  // (pas un nouveau event en plus de l'ancien). Conforme RFC 5545.
  // Fallback random pour les rares cas sans applicationId (legacy).
  const uid = applicationId
    ? `coaching-${applicationId}@rbperform.app`
    : `coaching-${startUTC.getTime()}-${Math.random().toString(36).slice(2, 8)}@rbperform.app`;
  // SEQUENCE : timestamp en seconds depuis epoch garantit monotone
  // croissant entre tous les envois successifs, calendriers comparent et
  // gardent la version la plus récente.
  const seq = sequence != null ? sequence : Math.floor(Date.now() / 1000);
  const desc = String(description).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RB Perform//Coaching Call//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${seq}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startUTC)}`,
    `DTEND:${fmt(endUTC)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=Rayan Bonte:mailto:${organizerEmail}`,
    `ATTENDEE;CN=Athlete;RSVP=TRUE:mailto:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appel RB Perform dans 1h',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function buildGCalLink({ startUTC, endUTC, title, details, location }) {
  const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('text', title);
  u.searchParams.set('dates', `${fmt(startUTC)}/${fmt(endUTC)}`);
  u.searchParams.set('details', details);
  u.searchParams.set('location', location);
  return u.toString();
}

function buildConfirmEmail({ firstName, dateLabel, gcalUrl, appleCalUrl, isMinor, isReschedule }) {
  const name = firstName ? ` ${escHtml(firstName)}` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,Inter,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#0d0d0d;border-radius:18px;border:1px solid rgba(255,255,255,0.06);padding:40px 32px">

    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${G};margin-bottom:20px;font-weight:800">${isReschedule ? 'RDV d&eacute;plac&eacute;' : 'RDV confirm&eacute;'}</div>

    <div style="font-size:28px;font-weight:900;color:#fff;line-height:1.2;letter-spacing:-1px;margin-bottom:18px">
      ${isReschedule ? `C'est cal&eacute;${name}, on a d&eacute;plac&eacute; ensemble.` : `C'est bon${name}, on s'appelle.`}
    </div>

    <div style="font-size:18px;color:${G};font-weight:800;margin-bottom:26px;letter-spacing:.2px">
      ${escHtml(dateLabel)} <span style="color:rgba(255,255,255,0.4);font-weight:500">· ${CALL_DURATION_MIN} min</span>
    </div>

    <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:26px">
      ${isReschedule
        ? `Nouveau cr&eacute;neau bien not&eacute;. J'efface l'ancien de mon c&ocirc;t&eacute;, c'est sur celui-ci qu'on s'appelle. Merci de m'avoir pr&eacute;venu.`
        : `J'ai lu ta candidature. Ton profil m'int&eacute;resse et me pla&icirc;t &mdash; c'est pour &ccedil;a qu'on prend ce moment ensemble. On va voir si ce qu'on fait correspond &agrave; ton objectif, ton agenda et ton ressenti actuel. L'un comme l'autre on doit &ecirc;tre s&ucirc;rs.`}
    </div>

    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px;width:100%">
      <tr>
        <td align="center" valign="middle" bgcolor="${G}" style="background:${G};border-radius:10px;padding:0">
          <a href="${gcalUrl.replace(/&/g,'&amp;')}" target="_blank" rel="noopener" style="display:block;padding:14px 16px;color:#000;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.5px;font-family:-apple-system,Inter,sans-serif">Ajouter au calendrier</a>
        </td>
        <td width="8">&nbsp;</td>
        <td align="center" valign="middle" bgcolor="#181818" style="background:#181818;border-radius:10px;border:1px solid rgba(255,255,255,0.12);padding:0">
          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" style="display:block;padding:14px 16px;color:#fff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.5px;font-family:-apple-system,Inter,sans-serif">WhatsApp Rayan</a>
        </td>
      </tr>
    </table>
    <div style="font-size:11px;color:rgba(255,255,255,0.35);text-align:center;margin-bottom:24px;letter-spacing:.2px">
      Sur iPhone : tap sur la pièce jointe en bas du mail pour Apple Calendar.
    </div>

    <div style="font-size:13px;color:rgba(255,255,255,0.55);text-align:center;margin-bottom:30px">
      L'appel se fait sur WhatsApp à l'heure dite. Je t'appelle.
    </div>

    <div style="margin-bottom:26px;padding:22px;background:rgba(2,209,186,0.05);border:1px solid rgba(2,209,186,0.2);border-radius:12px">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:14px">Avant l'appel — fais ces 3 trucs</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.75">
        <strong style="color:#fff">1.</strong> Regarde la méthode → <a href="${METHODE_URL}" target="_blank" rel="noopener" style="color:${G};text-decoration:underline">${METHODE_URL.replace('https://','')}</a><br><br>
        <strong style="color:#fff">2.</strong> Réfléchis honnêtement à ton vrai pourquoi. Pas "je veux prendre du muscle" — le truc derrière. Pourquoi ça t'importe maintenant.<br><br>
        <strong style="color:#fff">3.</strong> Sois dans un endroit calme, casque ou écouteurs, 30 minutes focus. Pas de scroll Insta pendant qu'on parle, on perd tous les deux notre temps.
      </div>
    </div>

    ${isMinor ? `<div style="margin-bottom:22px;padding:16px 18px;background:rgba(255,255,255,0.04);border-left:3px solid ${G};border-radius:8px">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:8px">Tes parents</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);line-height:1.65">
        Si tes parents veulent assister à l'appel ou poser des questions, ils sont les bienvenus. Préviens-moi en réponse à ce mail et je t'enverrai le lien d'invitation à transférer.
      </div>
    </div>` : ''}

    <div style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.06)">
      Si tu peux plus → préviens-moi au moins <strong style="color:rgba(255,255,255,0.7)">24h avant</strong> sur WhatsApp. Je préfère décaler que perdre nos 30 min mutuellement.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:4px">
      À très vite.
    </div>

    <div style="font-size:14px;color:rgba(255,255,255,0.85);font-weight:700;margin-top:14px">
      Rayan
    </div>

  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center">
    <div style="font-size:11px;color:rgba(255,255,255,0.22);letter-spacing:.5px">
      RB Perform · Rayan Bonte
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildTransporter() {
  if (!SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const serverOk = hasServerSecret(req);
  const superAdminOk = serverOk ? false : await isSupabaseSuperAdmin(req);
  if (!serverOk && !superAdminOk) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  let body;
  try {
    body = bodySchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid body', detail: e.errors });
  }

  try {
    const apps = await sbFetch(
      `/rest/v1/coaching_applications?id=eq.${body.application_id}&select=id,email,nom_prenom,telephone,age,call_scheduled_at,call_confirmed_at&limit=1`
    );
    if (!Array.isArray(apps) || apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = apps[0];

    const startUTC = parseSlotToUTC(body.slot.date, body.slot.time);
    const endUTC = new Date(startUTC.getTime() + CALL_DURATION_MIN * 60000);
    const dateLabel = formatFR(startUTC);

    // Reschedule detection : un call_scheduled_at préexistant ET différent
    // de la nouvelle date = replanification (cas Rayan : prospect écrit sur
    // WhatsApp pour changer de jour, Rayan clique "Déplacer" puis pose la
    // nouvelle date dans le picker custom).
    const previousScheduledISO = app.call_scheduled_at;
    const newScheduledISO = startUTC.toISOString();
    const isReschedule = previousScheduledISO != null
      && new Date(previousScheduledISO).getTime() !== startUTC.getTime();

    // 1. Update call_scheduled_at en DB. Si reschedule : reset aussi tous
    // les flags pour que le cron renvoie H-24/H-2 pour la NOUVELLE date,
    // l'ancien token de confirmation devient invalide, et le prospect doit
    // re-confirmer le nouveau créneau.
    const patch = { call_scheduled_at: newScheduledISO };
    if (isReschedule) {
      patch.reminder_h24_sent_at = null;
      patch.reminder_h2_sent_at = null;
      patch.call_confirmed_at = null;
      patch.call_confirm_token = null;
    }
    await sbFetch(
      `/rest/v1/coaching_applications?id=eq.${body.application_id}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      }
    );

    // 2. Envoi mail confirmation au candidat
    const firstName = (app.nom_prenom || '').trim().split(/\s+/)[0] || '';
    const gcalUrl = buildGCalLink({
      startUTC, endUTC,
      title: 'Appel RB Perform avec Rayan',
      details: `Appel WhatsApp avec Rayan. ${CALL_DURATION_MIN} min. Prépare-toi : ${METHODE_URL}`,
      location: 'WhatsApp Rayan',
    });
    const ics = buildICS({
      startUTC, endUTC,
      summary: 'Appel RB Perform avec Rayan',
      description: `Appel WhatsApp avec Rayan. Prépare-toi : ${METHODE_URL}\\n\\nWhatsApp Rayan : ${WHATSAPP_URL}`,
      location: 'WhatsApp Rayan',
      organizerEmail: SMTP_USER,
      attendeeEmail: app.email || SMTP_USER,
      applicationId: body.application_id,
    });
    const appleCalUrl = 'data:text/calendar;charset=utf-8;base64,' + Buffer.from(ics, 'utf-8').toString('base64');

    let emailSent = false;
    const transporter = buildTransporter();
    if (transporter && app.email) {
      try {
        // Mail 1 : candidat (confirmation + .ics + boutons)
        await transporter.sendMail({
          from: `Rayan · RB Perform <${SMTP_USER}>`,
          to: [app.email],
          replyTo: SMTP_USER,
          subject: isReschedule ? `RDV déplacé — ${dateLabel}` : `RDV confirmé — ${dateLabel}`,
          html: buildConfirmEmail({ firstName, dateLabel, gcalUrl, appleCalUrl, isMinor: Number(app.age) > 0 && Number(app.age) < 18, isReschedule }),
          icalEvent: {
            method: 'REQUEST',
            content: ics,
            filename: 'rb-perform-appel.ics',
          },
        });
        emailSent = true;

        // Mail 2 : Rayan (short notif + .ics pour ajouter à son agenda perso)
        // best effort — un échec ici n'invalide pas la confirmation
        const rayanInbox = process.env.RAYAN_PERSONAL_EMAIL || 'rayan.b2701@gmail.com';
        try {
          await transporter.sendMail({
            from: `RB Perform <${SMTP_USER}>`,
            to: [rayanInbox],
            replyTo: SMTP_USER,
            subject: isReschedule
              ? `Call déplacé : ${app.nom_prenom?.trim() || app.email} — ${dateLabel}`
              : `Call booké : ${app.nom_prenom?.trim() || app.email} — ${dateLabel}`,
            html: `<!DOCTYPE html><html><body style="font-family:-apple-system,Inter,sans-serif;background:#050505;color:#fff;padding:30px"><div style="max-width:520px;margin:0 auto;background:#0d0d0d;padding:30px;border-radius:14px;border:1px solid rgba(255,255,255,0.08)"><div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G};font-weight:800;margin-bottom:14px">CRM &middot; Call ${isReschedule ? 'd&eacute;plac&eacute;' : 'confirm&eacute;'}</div><div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:10px">${escHtml(app.nom_prenom?.trim() || 'Candidat')}</div><div style="font-size:14px;color:rgba(255,255,255,0.65);margin-bottom:18px">${escHtml(app.email)}${app.telephone ? ' &middot; ' + escHtml(app.telephone) : ''}</div>${isReschedule && previousScheduledISO ? `<div style=\"font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:8px;text-decoration:line-through\">Ancien: ${escHtml(formatFR(new Date(previousScheduledISO)))}</div>` : ''}<div style="font-size:16px;color:${G};font-weight:800;padding:14px 16px;background:rgba(2,209,186,0.08);border-radius:10px;margin-bottom:18px;text-transform:capitalize">${escHtml(dateLabel)}</div><div style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.65">${isReschedule ? `Cr&eacute;neau d&eacute;plac&eacute;. Le candidat a re&ccedil;u un nouveau mail "RDV d&eacute;plac&eacute;". Les rappels H-24 et H-2 ont &eacute;t&eacute; r&eacute;arm&eacute;s pour la nouvelle date.` : `Mail de confirmation envoy&eacute; au candidat. La pi&egrave;ce jointe .ics ajoute le call &agrave; ton agenda en 1 tap.`}</div></div></body></html>`,
            icalEvent: {
              method: 'REQUEST',
              content: ics,
              filename: 'rb-perform-appel.ics',
            },
          });
        } catch (e) {
          console.warn(`[CONFIRM_SLOT_RAYAN_MAIL] failed: ${e.message}`);
        }
      } catch (e) {
        console.error(`[CONFIRM_SLOT_EMAIL_FAIL] app=${app.id} email=${app.email} reason="${e.message}"`);
        await captureException(e, {
          tags: { endpoint: 'confirm-coaching-call-slot', stage: 'email' },
          extra: { application_id: app.id, slot: body.slot },
        });
      }
    }

    return res.status(200).json({
      ok: true,
      call_scheduled_at: startUTC.toISOString(),
      email_sent: emailSent,
      date_label: dateLabel,
    });
  } catch (err) {
    console.error('[confirm-coaching-call-slot] unexpected:', err.message);
    await captureException(err, { tags: { endpoint: 'confirm-coaching-call-slot' } });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
