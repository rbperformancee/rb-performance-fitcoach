/**
 * GET /api/cron-demo-reset
 *
 * Reset le client demo (lucas.demo@rbperform.app) tous les jours.
 * Supprime les writes accidentels des prospects ET re-applique le seed.
 *
 * Securise par CRON_SECRET (header Authorization: Bearer X-CRON-SECRET).
 *
 * A planifier dans vercel.json :
 *   { path: "/api/cron-demo-reset", schedule: "0 3 * * *" }  (03:00 UTC)
 */

const { getServiceClient } = require('./_supabase');

const DEMO_CLIENT_ID = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65';

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CRON_AUTH_FAIL] CRON_SECRET missing — refused');
    return false;
  }
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getServiceClient();
  const now = new Date().toISOString();
  const stats = {};

  // 1. Cleanup les writes accidentels des prospects sur lucas.demo
  // (l'app frontend bloque deja en mode demo via isClientDemoMode(), mais
  // si quelqu'un bypasse ou si la prod RLS laisse passer, on purge ici).
  const tablesToReset = [
    'client_measurements',
    'sessions',
    'session_sets',
    'client_badges',
    'messages',
  ];

  for (const table of tablesToReset) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('client_id', DEMO_CLIENT_ID);
    stats[table] = { deleted: count || 0, error: error?.message || null };
  }

  // 2. Re-seed les pesees (30 jours, perte progressive)
  const measurements = [];
  for (let i = 1; i <= 30; i++) {
    const weight = 78.2 - (i * 0.1) + (Math.random() * 0.8 - 0.4);
    measurements.push({
      client_id: DEMO_CLIENT_ID,
      weight_kg: Math.round(weight * 10) / 10,
      created_at: new Date(Date.now() - (30 - i) * 86400000).toISOString(),
    });
  }
  const { error: mErr } = await supabase.from('client_measurements').insert(measurements);
  stats.measurements_inserted = { count: measurements.length, error: mErr?.message || null };

  // 3. Re-seed sessions (12 sur 30 jours)
  const sessions = [];
  const seances = ['Push', 'Pull', 'Legs'];
  for (let i = 1; i <= 12; i++) {
    const startedAt = new Date(Date.now() - (12 - i) * 2 * 86400000 - 90 * 60000);
    const endedAt = new Date(Date.now() - (12 - i) * 2 * 86400000);
    sessions.push({
      client_id: DEMO_CLIENT_ID,
      seance_nom: seances[i % 3],
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_minutes: 60 + Math.floor(Math.random() * 30),
      rpe_moyen: 6 + Math.floor(Math.random() * 3),
      sets_completes: 20 + Math.floor(Math.random() * 4),
      sets_total: 24,
      status: 'completed',
    });
  }
  const { error: sErr } = await supabase.from('sessions').insert(sessions);
  stats.sessions_inserted = { count: sessions.length, error: sErr?.message || null };

  // 4. Re-seed badges
  const badges = [
    { id: 'first_session',  daysAgo: 40 },
    { id: 'five_sessions',  daysAgo: 25 },
    { id: 'ten_sessions',   daysAgo: 5 },
    { id: 'weight_logged',  daysAgo: 40 },
  ];
  const { error: bErr } = await supabase.from('client_badges').insert(
    badges.map(b => ({
      client_id: DEMO_CLIENT_ID,
      badge_id: b.id,
      earned_at: new Date(Date.now() - b.daysAgo * 86400000).toISOString(),
    }))
  );
  stats.badges_inserted = { count: badges.length, error: bErr?.message || null };

  // 5. Re-seed messages
  const { error: msgErr } = await supabase.from('messages').insert([
    { client_id: DEMO_CLIENT_ID, content: 'Salut Lucas, super seance hier ! On garde la meme structure cette semaine.', from_coach: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { client_id: DEMO_CLIENT_ID, content: 'Merci coach, je me sens vraiment plus fort sur le bench.', from_coach: false, created_at: new Date(Date.now() - 2 * 86400000 + 2 * 3600000).toISOString() },
    { client_id: DEMO_CLIENT_ID, content: 'Tu peux me partager ta consommation proteines de la semaine ?', from_coach: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);
  stats.messages_inserted = { error: msgErr?.message || null };

  console.log(`[cron-demo-reset] OK at ${now}`, JSON.stringify(stats));
  return res.status(200).json({ ok: true, at: now, stats });
};
