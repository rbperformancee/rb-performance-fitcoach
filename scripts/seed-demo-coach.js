#!/usr/bin/env node
/**
 * scripts/seed-demo-coach.js
 *
 * Re-seed les données d'activité du Demo Coach (33ae97b9...) :
 *   - last_seen_at variés sur les 7 derniers jours
 *   - weight_logs : courbes de poids réalistes sur 14j
 *   - daily_tracking : pas / sommeil / eau sur 7j
 *   - messages : 3 conversations coach<>clients vivantes
 *
 * Idempotent : supprime l'ancien seed (logs avec ex_key="demo_seed",
 * messages avec content.startsWith("[seed]"), etc.) avant de réinsérer.
 *
 * Usage local : node scripts/seed-demo-coach.js
 * Pour brancher en cron : copier la logique dans api/cron-demo-coach-reseed.js
 * et ajouter dans vercel.json avec schedule "0 4 * * *".
 */

require("dotenv").config({ path: ".env.local" });

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_COACH = "33ae97b9-b068-44f3-bef0-0c7c18e5b774";

if (!SB_URL || !SB_KEY) {
  console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}

const H = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function sb(path, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...H, ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} on ${path}: ${body.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const SEED_TAG = "[demo-seed]";
const today = new Date();
const dateStr = (offsetDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
};
const isoAt = (offsetDays, hour = 18, minute = 30) => {
  const d = new Date(today);
  d.setDate(d.getDate() - offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
};
const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("→ Récupération des clients actifs du Demo Coach…");
  const clients = await sb(
    `/clients?select=id,full_name,email&coach_id=eq.${DEMO_COACH}&subscription_status=eq.active&order=created_at`
  );
  console.log(`  ${clients.length} clients actifs.`);

  // Exclure lucas.demo s'il appartient au demo coach (il a son propre cron)
  const targets = clients.filter((c) => !c.email?.startsWith("lucas.demo"));
  const ids = targets.map((c) => c.id);

  // ── 1. last_seen_at : mix de fraîcheur ─────────────────────────────────
  console.log("→ Bump last_seen_at avec distribution réaliste…");
  // Distribution : 60% vus dans les 2j, 25% dans 3-7j, 15% inactifs 8-14j
  await Promise.all(
    targets.map(async (c, i) => {
      let offset;
      const r = (i * 17) % 100; // déterministe pour idempotence visuelle
      if (r < 60) offset = Math.floor(Math.random() * 3); // 0-2j
      else if (r < 85) offset = 3 + Math.floor(Math.random() * 5); // 3-7j
      else offset = 8 + Math.floor(Math.random() * 7); // 8-14j
      const seenAt = isoAt(offset, 8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60));
      await sb(`/clients?id=eq.${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ last_seen_at: seenAt }),
      });
    })
  );

  // ── 2. weight_logs : purge + reseed sur 14 jours ───────────────────────
  console.log("→ Reseed weight_logs (14j)…");
  await sb(
    `/weight_logs?client_id=in.(${ids.join(",")})&note=eq.${encodeURIComponent(SEED_TAG)}`,
    { method: "DELETE" }
  );
  const weightRows = [];
  for (const c of targets) {
    // 1 sur 2 a une courbe de poids
    if (Math.random() < 0.5) continue;
    const startWeight = rand(60, 95);
    const goal = pick(["loss", "gain"]);
    const slope = goal === "loss" ? -0.08 : 0.05;
    // Pesées tous les 2-3 jours
    for (let day = 14; day >= 0; day -= pick([2, 3])) {
      const noise = rand(-0.3, 0.3);
      const w = Math.round((startWeight + slope * (14 - day) + noise) * 10) / 10;
      weightRows.push({
        client_id: c.id,
        date: dateStr(day),
        weight: w,
        note: SEED_TAG,
      });
    }
  }
  if (weightRows.length) {
    await sb(`/weight_logs?on_conflict=client_id,date`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(weightRows),
    });
  }
  console.log(`  ${weightRows.length} pesées insérées.`);

  // ── 3. daily_tracking : purge + reseed sur 7 jours ─────────────────────
  console.log("→ Reseed daily_tracking (7j)…");
  await sb(
    `/daily_tracking?client_id=in.(${ids.join(",")})&date=gte.${dateStr(7)}`,
    { method: "DELETE" }
  );
  const dailyRows = [];
  for (const c of targets) {
    if (Math.random() < 0.4) continue; // 60% des clients trackent
    for (let day = 0; day <= 7; day++) {
      if (Math.random() < 0.25) continue; // gap réaliste
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
  }
  console.log(`  ${dailyRows.length} jours trackés insérés.`);

  // ── 4. messages : 3 conversations vivantes ─────────────────────────────
  console.log("→ Reseed messages (3 convos)…");
  const conv1Targets = targets.slice(0, 3);
  await sb(
    `/messages?client_id=in.(${conv1Targets.map((c) => c.id).join(",")})&content=ilike.${encodeURIComponent("[seed]%")}`,
    { method: "DELETE" }
  );
  const msgRows = [];
  const scripts = [
    [
      { coach: true, txt: "Salut, comment tu te sens après la séance d'hier ?", offset: 2 },
      { coach: false, txt: "Niquel, j'ai bien senti les pecs aujourd'hui", offset: 2 },
      { coach: true, txt: "Top. On ajoute 2.5kg au développé couché la prochaine ?", offset: 1 },
      { coach: false, txt: "Go", offset: 1 },
      { coach: true, txt: "Pense à ta pesée du matin !", offset: 0 },
    ],
    [
      { coach: false, txt: "Hello, j'ai raté ma séance hier (taf trop chargé)", offset: 3 },
      { coach: true, txt: "Pas grave. Tu peux la rattraper ce soir ou décaler à demain ?", offset: 3 },
      { coach: false, txt: "Demain matin avant le boulot je pense", offset: 3 },
      { coach: true, txt: "Parfait. Garde le volume, baisse l'intensité de 10% si tu sens la fatigue.", offset: 2 },
      { coach: false, txt: "OK merci 🙏", offset: 2 },
    ],
    [
      { coach: false, txt: "Coach j'ai une douleur au genou droit depuis 2 jours", offset: 4 },
      { coach: true, txt: "Tu peux préciser ? Douleur en flexion ? Sous la rotule ?", offset: 4 },
      { coach: false, txt: "Sous la rotule, surtout quand je descends en squat", offset: 4 },
      { coach: true, txt: "OK on remplace squat par leg press cette semaine. Si pas mieux dans 7j → kiné.", offset: 3 },
      { coach: false, txt: "Reçu. Merci pour la réactivité.", offset: 3 },
    ],
  ];
  conv1Targets.forEach((c, idx) => {
    const convo = scripts[idx];
    convo.forEach((m, j) => {
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
  }
  console.log(`  ${msgRows.length} messages insérés (${conv1Targets.length} convos).`);

  console.log("\n✅ Seed terminé. Recharge le dashboard du Demo Coach.");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
