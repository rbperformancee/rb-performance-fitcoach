/**
 * GET /api/coaching-call-ics?app_id=uuid
 *
 * Génère et sert le fichier .ics correspondant au call_scheduled_at d'une
 * coaching_application. Mime text/calendar → sur iPhone Safari, iOS détecte
 * et ouvre Calendar.app direct. Sur desktop, télécharge le .ics.
 *
 * Utilisé par le mail de confirmation slot (bouton "Apple Calendar").
 *
 * Pas d'auth : l'URL contient l'UUID de l'application (non guessable). Le
 * contenu .ics ne contient que la date/heure du call + lien WhatsApp Rayan,
 * pas de données sensibles.
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_USER = process.env.ZOHO_SMTP_USER || 'rayan@rbperform.app';
const WHATSAPP_URL = 'https://wa.me/33695129347';
const METHODE_URL = 'https://www.rbperform.com/methode-coaching';
const CALL_DURATION_MIN = 30;

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

function buildICS({ startUTC, endUTC, summary, description, location, organizerEmail, attendeeEmail }) {
  const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const uid = `coaching-${startUTC.getTime()}-${Math.random().toString(36).slice(2, 8)}@rbperform.app`;
  const desc = String(description).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RB Perform//Coaching Call//FR',
    'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(startUTC)}`, `DTEND:${fmt(endUTC)}`,
    `SUMMARY:${summary}`, `DESCRIPTION:${desc}`, `LOCATION:${location}`,
    `ORGANIZER;CN=Rayan Bonte:mailto:${organizerEmail}`,
    `ATTENDEE;CN=Athlete;RSVP=TRUE:mailto:${attendeeEmail}`,
    'STATUS:CONFIRMED', 'BEGIN:VALARM', 'ACTION:DISPLAY',
    'DESCRIPTION:Appel RB Perform dans 1h', 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const appId = req.query?.app_id;
  if (!appId || !/^[0-9a-f-]{36}$/i.test(appId)) {
    return res.status(400).json({ error: 'Invalid app_id' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env' });
  }

  try {
    const apps = await sbFetch(
      `/rest/v1/coaching_applications?id=eq.${appId}&select=id,email,nom_prenom,call_scheduled_at&limit=1`
    );
    if (!Array.isArray(apps) || apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = apps[0];
    if (!app.call_scheduled_at) {
      return res.status(409).json({ error: 'No call_scheduled_at set' });
    }

    const startUTC = new Date(app.call_scheduled_at);
    const endUTC = new Date(startUTC.getTime() + CALL_DURATION_MIN * 60000);
    const ics = buildICS({
      startUTC, endUTC,
      summary: 'Appel RB Perform avec Rayan',
      description: `Appel WhatsApp avec Rayan. Prépare-toi : ${METHODE_URL}\\n\\nWhatsApp Rayan : ${WHATSAPP_URL}`,
      location: 'WhatsApp Rayan',
      organizerEmail: SMTP_USER,
      attendeeEmail: app.email || SMTP_USER,
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="rb-perform-appel.ics"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(ics);
  } catch (err) {
    console.error('[coaching-call-ics] error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
};
// touched 2026-06-26 force redeploy
