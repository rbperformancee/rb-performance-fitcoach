/**
 * Cron auto-validate sessions — Vercel Cron Job
 *
 * Schedule : toutes les heures (cf. vercel.json `0 * * * *`).
 *
 * Problème résolu (cf. cas Enzo Perez 24/05/26) :
 *   Le client logge ses exos un par un dans TrainingPage mais oublie de
 *   cliquer "Terminer la séance" → aucune row dans session_completions ni
 *   session_logs → le coach ne voit pas la séance comme faite alors qu'elle
 *   l'est dans les faits.
 *
 * Règle d'auto-validation (décision Rayan 24/05/26) :
 *   - ≥ 3 exos distincts loggés pour une (week_idx, session_idx)
 *   - Dernier log ≥ 2h (le client ne reviendra probablement plus)
 *   - Aucune session_completion existante pour ce (client, week, session)
 *   → INSERT session_completions (auto_validated=true)
 *   → INSERT session_logs avec session_name extrait du programme
 *
 * Le coach voit ces séances avec un badge gris "auto" dans son dashboard.
 *
 * Format ex_key supporté :
 *   - "client_<uuid>__w<W>_s<S>_e<E>"  (Enzo format)
 *   - "<anything>__w<W>_s<S>_e<E>"      (programme format)
 *   - Regex commune : /_w(\d+)_s(\d+)_e\d+$/
 */

const { captureException } = require("./_sentry");
const { getServiceClient } = require("./_supabase");

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${cronSecret}`) return true;
  return req.headers["user-agent"]?.includes("vercel-cron") || false;
}

const STALE_HOURS = 2;          // ≥2h depuis le dernier log
const MIN_EXOS = 3;             // ≥3 exos distincts
const LOOKBACK_HOURS = 30;      // fenêtre de scan (couvre 24h + marge cron qui tournerait pas pile)
const EX_KEY_RE = /_w(\d+)_s(\d+)_e\d+$/;

// Extrait le nom de séance depuis le HTML programme (format ProgrammeBuilder).
// HTML contient des inputs avec id="sn-<sid>" value="UPPER"/"PUSH"/etc.
// Index sessions est l'ordre d'apparition dans la semaine 0 (suffit pour name).
function extractSessionName(htmlContent, sessionIdx) {
  if (!htmlContent) return null;
  const matches = [...htmlContent.matchAll(/id="sn-[^"]+"[^>]*value="([^"]+)"/g)];
  // Les sessions sont listées dans l'ordre d'apparition. Mais le HTML peut
  // contenir des sessions de plusieurs semaines — on prend juste les premières
  // 7 ou 8 et on prend session_idx parmi celles-là.
  // En pratique, sessionIdx est l'index dans la SEMAINE, et la semaine 0
  // apparaît en premier dans le HTML → matches[sessionIdx] est le bon nom.
  if (matches.length > sessionIdx) return matches[sessionIdx][1].trim();
  return null;
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "unauthorized" });

  const startedAt = Date.now();
  const stats = { eligible: 0, validated: 0, skipped: 0, failed: 0 };

  try {
    const supabase = getServiceClient();
    const now = Date.now();
    const since = new Date(now - LOOKBACK_HOURS * 3600 * 1000).toISOString();
    const staleCutoff = now - STALE_HOURS * 3600 * 1000;

    // 1. Charger tous les exercise_logs récents (window LOOKBACK_HOURS)
    const { data: logs, error: lErr } = await supabase
      .from("exercise_logs")
      .select("client_id, ex_key, logged_at")
      .gte("logged_at", since)
      .order("logged_at", { ascending: true })
      .limit(5000);
    if (lErr) throw lErr;

    // 2. Grouper par (client, week, session)
    // groups[key] = { clientId, weekIdx, sessionIdx, exos: Set, lastLog: timestamp }
    const groups = new Map();
    for (const log of (logs || [])) {
      const m = (log.ex_key || "").match(EX_KEY_RE);
      if (!m) continue;
      const weekIdx = parseInt(m[1], 10);
      const sessionIdx = parseInt(m[2], 10);
      const key = `${log.client_id}|${weekIdx}|${sessionIdx}`;
      const ts = new Date(log.logged_at).getTime();
      if (!groups.has(key)) {
        groups.set(key, { clientId: log.client_id, weekIdx, sessionIdx, exos: new Set(), lastLog: 0 });
      }
      const g = groups.get(key);
      g.exos.add(log.ex_key);
      if (ts > g.lastLog) g.lastLog = ts;
    }

    // 3. Filtrer par règle (≥MIN_EXOS distincts + stale ≥STALE_HOURS)
    const candidates = [...groups.values()].filter(
      (g) => g.exos.size >= MIN_EXOS && g.lastLog <= staleCutoff
    );
    stats.eligible = candidates.length;

    if (candidates.length === 0) {
      return res.status(200).json({ ok: true, ...stats, durationMs: Date.now() - startedAt });
    }

    // 4. Récupérer les completions existantes pour ces (client, week, session)
    // pour skip les déjà-validées
    const clientIds = [...new Set(candidates.map((c) => c.clientId))];
    const { data: existingComps } = await supabase
      .from("session_completions")
      .select("client_id, week_idx, session_idx")
      .in("client_id", clientIds);
    const existsKey = new Set(
      (existingComps || []).map((c) => `${c.client_id}|${c.week_idx}|${c.session_idx}`)
    );

    // 5. Charger les programmes des clients pour extraire le session_name
    // (un client peut avoir plusieurs programmes archivés ; on prend l'actif).
    const { data: progs } = await supabase
      .from("programmes")
      .select("id, client_id, programme_name, html_content, is_active")
      .in("client_id", clientIds)
      .eq("is_active", true);
    const progByClient = new Map();
    for (const p of (progs || [])) progByClient.set(p.client_id, p);

    // 6. Pour chaque candidate : INSERT completion + log
    for (const g of candidates) {
      const compKey = `${g.clientId}|${g.weekIdx}|${g.sessionIdx}`;
      if (existsKey.has(compKey)) { stats.skipped++; continue; }

      const prog = progByClient.get(g.clientId);
      const sessionName = extractSessionName(prog?.html_content, g.sessionIdx) || `Séance ${g.sessionIdx + 1}`;
      const programmeName = prog?.programme_name || null;
      const validatedAt = new Date(g.lastLog).toISOString(); // timestamp = dernier exo

      try {
        // INSERT completion (auto_validated=true)
        const { error: ce } = await supabase.from("session_completions").insert({
          client_id: g.clientId,
          week_idx: g.weekIdx,
          session_idx: g.sessionIdx,
          chrono_seconds: 0,        // pas de chrono fiable si auto
          finisher_seconds: 0,
          volume_kg: 0,
          rpe: 0,
          programme_id: prog?.id || null,
          validated_at: validatedAt,
          auto_validated: true,
        });
        if (ce && ce.code !== "23505") throw ce; // 23505 = conflit (race condition), ignore

        // INSERT session_log avec session_name pour que la timeline coach affiche
        const { error: le } = await supabase.from("session_logs").insert({
          client_id: g.clientId,
          session_name: sessionName,
          programme_name: programmeName,
          logged_at: validatedAt,
        });
        if (le) console.warn(`[AUTO_VALID] session_log insert warn for ${g.clientId}: ${le.message}`);

        stats.validated++;
        console.log(`[AUTO_VALID] ${g.clientId} w${g.weekIdx}s${g.sessionIdx} "${sessionName}" — ${g.exos.size} exos, last ${new Date(g.lastLog).toISOString()}`);
      } catch (e) {
        stats.failed++;
        console.error(`[AUTO_VALID_FAIL] ${g.clientId} w${g.weekIdx}s${g.sessionIdx}: ${e.message}`);
        await captureException(e, {
          tags: { endpoint: "cron-auto-validate-sessions" },
          extra: { clientId: g.clientId, weekIdx: g.weekIdx, sessionIdx: g.sessionIdx },
        });
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[AUTO_VALID] Done in ${durationMs}ms —`, JSON.stringify(stats));
    return res.status(200).json({ ok: true, durationMs, ...stats });
  } catch (e) {
    console.error("[AUTO_VALID_FATAL]", e.message);
    await captureException(e, { tags: { endpoint: "cron-auto-validate-sessions", stage: "fatal" } });
    return res.status(500).json({ error: e.message, ...stats });
  }
};
