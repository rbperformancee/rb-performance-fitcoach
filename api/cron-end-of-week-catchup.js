/**
 * Cron end-of-week catchup — Vercel Cron Job
 *
 * Schedule : dimanche 17h UTC (≈ 18h-19h Paris selon DST). Cf. vercel.json.
 *
 * Pour chaque client avec un programme actif :
 *   - Calcule la semaine en cours depuis programmes.start_date
 *   - Compte les session_completions pour cette semaine
 *   - Si done < target (= nombre de séances normales de la semaine) →
 *     push "Tu as N séances pas encore faites cette semaine"
 *   - Skip si toutes faites
 *
 * Pourquoi : dans le mode "objectifs semaine" l'athlète n'a plus de calendrier
 *   rigide, donc on lui rappelle dimanche soir s'il n'a pas bouclé. Avant
 *   minuit la semaine roule (sessions non faites = "perdues" dans le compteur,
 *   pas dans le programme — il peut tjs y revenir manuellement).
 *
 * Note : ne tape PAS les clients dont la semaine est entièrement faite, ni
 *   ceux dont le programme n'est pas démarré.
 */

const { captureException } = require("./_sentry");

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DAY_MS = 86400000;

function isAuthorizedCron(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing — refused");
    return false;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function sendPush(clientId, title, body, deepLink) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        title,
        body,
        url: deepLink || "/app",
      }),
    });
    return true;
  } catch (e) {
    console.warn("[end-of-week-catchup] push failed for", clientId, e?.message);
    return false;
  }
}

function computeWeekIdx(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return null;
  return Math.floor(days / 7);
}

// Compte les séances normales (non-bonus) d'une semaine du programme.
// programme.weeks[idx].sessions = [{nom, bonus?, ...}]
function targetForWeek(programme, weekIdx) {
  const weeks = programme?.weeks || [];
  if (weekIdx < 0 || weekIdx >= weeks.length) return 0;
  return (weeks[weekIdx]?.sessions || []).filter((s) => !s?.bonus).length;
}

module.exports = async (req, res) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase env missing" });
  }

  try {
    // 1. Tous les clients avec push abo actif
    const subs = await sbFetch(`/rest/v1/push_subscriptions?select=client_id`);
    if (!Array.isArray(subs)) return res.status(500).json({ error: "Failed subscriptions" });
    const clientIds = Array.from(new Set(subs.map((s) => s.client_id).filter(Boolean)));
    if (clientIds.length === 0) return res.status(200).json({ ok: true, eligible: 0, sent: 0 });

    const idsCsv = clientIds.map((id) => `"${id}"`).join(",");

    // 2. Programmes actifs pour ces clients (assigned + active)
    // Note : `programmes` est la table principale avec start_date + weeks JSON.
    const programmes = await sbFetch(
      `/rest/v1/programmes?client_id=in.(${idsCsv})&select=id,client_id,start_date,weeks,name`
    );
    if (!Array.isArray(programmes)) return res.status(500).json({ error: "Failed programmes" });

    // 3. Charge noms client
    const clientsRows = await sbFetch(
      `/rest/v1/clients?select=id,full_name&id=in.(${idsCsv})`
    );
    const nameById = new Map();
    if (Array.isArray(clientsRows)) {
      clientsRows.forEach((c) => nameById.set(c.id, c.full_name));
    }

    // 4. Charge toutes les session_completions pour les programmes actifs
    const progIds = programmes.map((p) => p.id).filter(Boolean);
    if (progIds.length === 0) {
      return res.status(200).json({ ok: true, eligible: 0, sent: 0, reason: "no active programmes" });
    }
    const progIdsCsv = progIds.map((id) => `"${id}"`).join(",");
    const completions = await sbFetch(
      `/rest/v1/session_completions?programme_id=in.(${progIdsCsv})&validated_at=not.is.null&select=client_id,programme_id,week_idx,session_idx`
    );
    const doneByClientWeek = new Map(); // key: `${clientId}|${weekIdx}` → count
    if (Array.isArray(completions)) {
      for (const c of completions) {
        const key = `${c.client_id}|${c.week_idx}`;
        doneByClientWeek.set(key, (doneByClientWeek.get(key) || 0) + 1);
      }
    }

    // 5. Envoie le push aux clients en retard sur la semaine en cours
    let sent = 0;
    let allDone = 0;
    let notStarted = 0;
    let eligible = 0;

    for (const prog of programmes) {
      const weekIdx = computeWeekIdx(prog.start_date);
      if (weekIdx == null || weekIdx < 0) { notStarted++; continue; }
      const programme = typeof prog.weeks === "string" ? JSON.parse(prog.weeks) : prog.weeks;
      const target = targetForWeek({ weeks: programme }, weekIdx);
      if (target === 0) continue; // semaine sans séance normale (rest week)
      eligible++;

      const done = doneByClientWeek.get(`${prog.client_id}|${weekIdx}`) || 0;
      if (done >= target) { allDone++; continue; }

      const remaining = target - done;
      const firstName = (nameById.get(prog.client_id) || "").split(" ")[0] || "";
      const title = firstName ? `${firstName}, ta semaine ?` : "Ta semaine d'entraînement";
      const body = remaining === 1
        ? `Il te reste 1 séance cette semaine. Dimanche soir = dernière chance.`
        : `Il te reste ${remaining} séances cette semaine. Dimanche soir, c'est maintenant ou jamais.`;

      const ok = await sendPush(prog.client_id, title, body, "/app");
      if (ok) sent++;
    }

    return res.status(200).json({
      ok: true, eligible, sent, allDone, notStarted,
    });
  } catch (e) {
    console.error("[cron-end-of-week-catchup]", e);
    await captureException(e, { tags: { endpoint: "cron-end-of-week-catchup" } });
    return res.status(500).json({ error: e.message });
  }
};
