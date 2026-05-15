/**
 * GET /api/cron-demo-coach-reseed
 *
 * Re-populate les données d'activité du Demo Coach (33ae97b9...) :
 *   - last_seen_at distribués (60% <2j, 25% 3-7j, 15% 8-14j)
 *   - weight_logs sur 14 jours (~50% des clients)
 *   - daily_tracking 7j (~60% des clients)
 *   - 3 conversations coach<>client réalistes
 *
 * Idempotent : utilise upserts via on_conflict pour weight_logs +
 * daily_tracking, et purge des messages tagués [seed] avant réinsertion.
 *
 * Securité : CRON_SECRET via Bearer (même pattern que cron-demo-reset).
 * Planifié : vercel.json — "0 6 * * *" (06:00 UTC = 08:00 Paris été).
 *
 * Source de vérité : scripts/seed-demo-coach.js (version standalone).
 */

const DEMO_COACH = "33ae97b9-b068-44f3-bef0-0c7c18e5b774";
const SEED_TAG = "[demo-seed]";

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON_AUTH_FAIL] CRON_SECRET missing — refused");
    return false;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${cronSecret}`;
}

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function sb(path, init = {}) {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const res = await fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: { ...sbHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} on ${path}: ${body.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const today = () => new Date();
const dateStr = (offset) => {
  const d = today(); d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};
const isoAt = (offset, hour = 18, min = 30) => {
  const d = today(); d.setDate(d.getDate() - offset);
  d.setUTCHours(hour, min, 0, 0);
  return d.toISOString();
};
const rand = (a, b) => Math.round((Math.random() * (b - a) + a) * 100) / 100;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function reseed() {
  const stats = { last_seen: 0, weight_logs: 0, daily_tracking: 0, messages: 0 };

  const clients = await sb(
    `/clients?select=id,email&coach_id=eq.${DEMO_COACH}&subscription_status=eq.active`
  );
  const targets = clients.filter((c) => !c.email?.startsWith("lucas.demo"));
  const ids = targets.map((c) => c.id);
  if (!ids.length) return { ...stats, note: "no targets" };

  // 1. last_seen_at
  await Promise.all(
    targets.map((c, i) => {
      const r = (i * 17) % 100;
      let offset;
      if (r < 60) offset = Math.floor(Math.random() * 3);
      else if (r < 85) offset = 3 + Math.floor(Math.random() * 5);
      else offset = 8 + Math.floor(Math.random() * 7);
      const seenAt = isoAt(offset, 8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60));
      stats.last_seen++;
      return sb(`/clients?id=eq.${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ last_seen_at: seenAt }),
      });
    })
  );

  // 2. weight_logs (upsert via on_conflict)
  const weightRows = [];
  for (const c of targets) {
    if (Math.random() < 0.5) continue;
    const startW = rand(60, 95);
    const slope = pick(["loss", "gain"]) === "loss" ? -0.08 : 0.05;
    for (let day = 14; day >= 0; day -= pick([2, 3])) {
      const noise = rand(-0.3, 0.3);
      const w = Math.round((startW + slope * (14 - day) + noise) * 10) / 10;
      weightRows.push({ client_id: c.id, date: dateStr(day), weight: w, note: SEED_TAG });
    }
  }
  if (weightRows.length) {
    await sb(`/weight_logs?on_conflict=client_id,date`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(weightRows),
    });
    stats.weight_logs = weightRows.length;
  }

  // 3. daily_tracking (upsert)
  const dailyRows = [];
  for (const c of targets) {
    if (Math.random() < 0.4) continue;
    for (let day = 0; day <= 7; day++) {
      if (Math.random() < 0.25) continue;
      dailyRows.push({
        client_id: c.id,
        date: dateStr(day),
        pas: 4000 + Math.floor(Math.random() * 9000),
        sommeil_h: rand(5.5, 8.5),
        eau_ml: 1500 + Math.floor(Math.random() * 1500),
      });
    }
  }
  if (dailyRows.length) {
    await sb(`/daily_tracking?on_conflict=client_id,date`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(dailyRows),
    });
    stats.daily_tracking = dailyRows.length;
  }

  // 4. messages — purge old seed + reinsert
  const conv1 = targets.slice(0, 3);
  if (conv1.length) {
    await sb(
      `/messages?client_id=in.(${conv1.map((c) => c.id).join(",")})&content=ilike.${encodeURIComponent("[seed]%")}`,
      { method: "DELETE" }
    );
    const scripts = [
      [
        { coach: true,  txt: "Salut, comment tu te sens après la séance d'hier ?", offset: 2 },
        { coach: false, txt: "Niquel, j'ai bien senti les pecs aujourd'hui", offset: 2 },
        { coach: true,  txt: "Top. On ajoute 2.5kg au développé couché la prochaine ?", offset: 1 },
        { coach: false, txt: "Go", offset: 1 },
        { coach: true,  txt: "Pense à ta pesée du matin !", offset: 0 },
      ],
      [
        { coach: false, txt: "Hello, j'ai raté ma séance hier (taf trop chargé)", offset: 3 },
        { coach: true,  txt: "Pas grave. Tu peux la rattraper ce soir ou décaler à demain ?", offset: 3 },
        { coach: false, txt: "Demain matin avant le boulot je pense", offset: 3 },
        { coach: true,  txt: "Parfait. Garde le volume, baisse l'intensité de 10% si tu sens la fatigue.", offset: 2 },
        { coach: false, txt: "OK merci 🙏", offset: 2 },
      ],
      [
        { coach: false, txt: "Coach j'ai une douleur au genou droit depuis 2 jours", offset: 4 },
        { coach: true,  txt: "Tu peux préciser ? Douleur en flexion ? Sous la rotule ?", offset: 4 },
        { coach: false, txt: "Sous la rotule, surtout quand je descends en squat", offset: 4 },
        { coach: true,  txt: "OK on remplace squat par leg press cette semaine. Si pas mieux dans 7j → kiné.", offset: 3 },
        { coach: false, txt: "Reçu. Merci pour la réactivité.", offset: 3 },
      ],
    ];
    const msgRows = [];
    conv1.forEach((c, idx) => {
      scripts[idx].forEach((m, j) => {
        msgRows.push({
          client_id: c.id,
          from_coach: m.coach,
          content: `[seed] ${m.txt}`,
          read: true,
          created_at: isoAt(m.offset, 10 + j, j * 7),
        });
      });
    });
    if (msgRows.length) {
      await sb(`/messages`, {
        method: "POST",
        body: JSON.stringify(msgRows),
      });
      stats.messages = msgRows.length;
    }
  }

  return stats;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const stats = await reseed();
    return res.status(200).json({ ok: true, stats, ran_at: new Date().toISOString() });
  } catch (e) {
    console.error("[cron-demo-coach-reseed] error:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
