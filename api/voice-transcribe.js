/**
 * POST /api/voice-transcribe
 *
 * Transcrit un blob audio (m4a / webm / mp3) en texte FR via Mistral Voxtral.
 * Utilise pour la saisie vocale du repas dans FuelPage : le client enregistre
 * via MediaRecorder, on envoie le blob ici, on renvoie le texte, puis le
 * client appelle /api/voice-analyze pour la decomposition macros.
 *
 * Pourquoi serveur et pas window.SpeechRecognition cote client ?
 *   - iOS WKWebView (Capacitor) ne shippe pas la Web Speech API
 *   - Safari macOS fonctionne mais inegal sur Safari iOS standalone
 *   - Voxtral on-server marche partout pareil + meilleure qualite fr-FR
 *
 * Body JSON : { audio: <base64>, mimeType: "audio/m4a" | "audio/webm", lang?: "fr" }
 * Reponse OK : { text: "salade cesar avec poulet et oeuf" }
 *
 * Securise : Bearer JWT obligatoire (limite quota cote utilisateur authentifie).
 * Body limite a 4 MB (Vercel default) — voix de 30s en m4a ~= 200-400 KB base64.
 */

const { createClient } = require('@supabase/supabase-js');
const { rateLimit, attachRequestId } = require('./_security');
const { captureException } = require('./_sentry');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const VOXTRAL_MODEL = process.env.MISTRAL_VOXTRAL_MODEL || 'voxtral-mini-2507';
const MISTRAL_URL = 'https://api.mistral.ai/v1/audio/transcriptions';

// JWT verif (reuse pattern voice-analyze)
async function verifyJwt(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://rbperform.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  attachRequestId(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate-limit : 30 transcriptions / heure / IP (voix = quota Mistral expensive)
  const rl = rateLimit(req, { max: 30, windowMs: 3600000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Trop de requetes vocales. Reessaie plus tard.' });

  // Auth obligatoire
  const user = await verifyJwt(req);
  if (!user) return res.status(401).json({ error: 'Auth required' });

  if (!MISTRAL_API_KEY) {
    console.error('[voice-transcribe] MISTRAL_API_KEY manquante');
    return res.status(500).json({ error: 'AI service unavailable' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Malformed JSON' });
  }

  const audioB64 = body?.audio;
  const mimeType = body?.mimeType || 'audio/m4a';
  const lang = (body?.lang || 'fr').slice(0, 5);

  if (!audioB64 || typeof audioB64 !== 'string') {
    return res.status(400).json({ error: 'Missing audio field' });
  }
  if (audioB64.length > 6_000_000) {
    // ~4.5 MB binaire — limite Vercel
    return res.status(413).json({ error: 'Audio trop long (max 60s)' });
  }

  try {
    // Decode base64 → Buffer → Blob (Node 18+ a Blob/FormData natifs)
    const buffer = Buffer.from(audioB64, 'base64');

    // Mistral Voxtral attend file en multipart/form-data
    const ext = mimeType.includes('webm') ? 'webm'
              : mimeType.includes('mp3')  ? 'mp3'
              : mimeType.includes('wav')  ? 'wav'
              : 'm4a';

    const fd = new FormData();
    fd.append('file', new Blob([buffer], { type: mimeType }), `voice.${ext}`);
    fd.append('model', VOXTRAL_MODEL);
    fd.append('language', lang);

    const upstream = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
      body: fd,
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error(`[voice-transcribe] Mistral ${upstream.status} :`, errText.slice(0, 240));
      if (upstream.status === 429) {
        return res.status(503).json({ error: 'Service vocal momentanement indisponible. Reessaie dans 2 min.' });
      }
      return res.status(502).json({ error: 'Transcription failed' });
    }

    const data = await upstream.json();
    const text = (data?.text || '').trim();
    if (!text) return res.status(200).json({ text: '', warning: 'Aucun mot detecte. Reparle plus fort ou plus pres du micro.' });

    return res.status(200).json({ text });
  } catch (err) {
    console.error('[voice-transcribe] unexpected :', err.message);
    await captureException(err, { tags: { endpoint: 'voice-transcribe' }, extra: { userId: user.id } });
    return res.status(500).json({ error: 'Internal error' });
  }
};
