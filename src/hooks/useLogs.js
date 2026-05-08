import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "fitcoach_logs_v1";

function buildExKey(programmeName, weekIdx, sessionIdx, exIdx) {
  const base = (programmeName || "prog").toLowerCase().replace(/\s+/g, "_");
  return `${base}__w${weekIdx}_s${sessionIdx}_e${exIdx}`;
}

// Reconnait les 3 mouvements polyarticulaires majeurs (powerlifting "big 3").
// Renvoie le nom canonique pour le notif coach, ou null si l'exo n'est pas
// un main lift — on ne veut PAS notifier le coach pour un PR sur curl biceps.
// Volontairement strict : exclut split squat / goblet squat / etc. qui sont
// accessoires plutôt que mouvement principal.
function canonicalMainLift(name) {
  const n = String(name || "").toLowerCase().trim();
  if (!n) return null;
  // Squat (back/front/box/pause/high-bar/low-bar) — exclut les variantes accessoires
  if (/\bsquat\b/.test(n) && !/split|bulgar|goblet|pistol|sissy|hack|single|jump|sumo squat/.test(n)) return "Squat";
  // Développé couché : DC, bench press, incline/decline bench
  if (/d[eé]velopp[eé]\s*couch[eé]/.test(n) || /\bbench(?:\s*press)?\b/.test(n) || /^dc\b|\sdc\b/.test(n)) return "Développé couché";
  // Deadlift / Soulevé de terre / SDT
  if (/deadlift/.test(n) || /soulev[eé]\s*de\s*terre/.test(n) || /^sdt\b|\ssdt\b/.test(n)) return "Deadlift";
  return null;
}

// Insert dans coach_activity_log si PR détecté sur un main lift. Best-effort
// (try/catch silencieux) : la perf de la séance ne doit pas être bloquée par
// un échec de notif. RLS coach_activity_log autorise insert si coach_id existe.
//
// Garde-fou "lune de miel" : on ne notifie PAS pendant les 4 premières
// semaines du client. Pendant cette période d'adaptation neurale, chaque
// séance bat techniquement le record précédent — ça spammerait le coach
// avec du bruit. Au-delà de J+28, les vrais PR ressortent.
const HONEYMOON_DAYS = 28;
async function notifyCoachPR(clientId, liftName, priorMax, newMax) {
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("coach_id, full_name, created_at")
      .eq("id", clientId)
      .maybeSingle();
    if (!client?.coach_id) return;
    if (client.created_at) {
      const ageMs = Date.now() - new Date(client.created_at).getTime();
      const ageDays = ageMs / 86400000;
      if (ageDays < HONEYMOON_DAYS) return; // silence pendant l'adaptation
    }
    const name = client.full_name || "Client";
    const fmt = (w) => Number.isInteger(w) ? String(w) : (Math.round(w * 10) / 10).toString();
    const summary = `🏆 ${name} a battu son record sur ${liftName} : ${fmt(priorMax)}kg → ${fmt(newMax)}kg (+${fmt(newMax - priorMax)}kg)`;
    await supabase.from("coach_activity_log").insert({
      coach_id: client.coach_id,
      client_id: clientId,
      activity_type: "client_pr",
      details: summary,
    });
  } catch { /* silent — pas critique */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function useLogs(programmeName, clientId = null) {
  const [logs, setLogs] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(logs);
  }, [logs]);

  // Hydrate localStorage depuis Supabase au mount + apres changement clientId.
  // Permet au coach de voir l'historique depuis n'importe quel device et au
  // client de retrouver ses logs apres reinstall / changement de tel.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("exercise_logs")
        .select("ex_key, date, weight, reps, logged_at")
        .eq("client_id", clientId)
        .order("logged_at", { ascending: true })
        .limit(2000);
      if (cancelled || !Array.isArray(data) || data.length === 0) return;
      // Merge cloud → local (cloud gagne sur les doublons par date)
      setLogs((prev) => {
        const next = { ...prev };
        for (const r of data) {
          const key = r.ex_key;
          if (!key) continue;
          const arr = (next[key] || []).filter((e) => e.date !== r.date);
          arr.push({
            date: r.date || (r.logged_at || "").slice(0, 10),
            weight: parseFloat(r.weight) || 0,
            reps: r.reps || "",
          });
          arr.sort((a, b) => a.date.localeCompare(b.date));
          next[key] = arr;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  // Retourne l'historique complet d'un exercice : [{date, weight, reps}]
  const getHistory = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const key = buildExKey(programmeName, weekIdx, sessionIdx, exIdx);
      return logs[key] || [];
    },
    [logs, programmeName]
  );

  // Dernière entrée
  const getLatest = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const history = getHistory(weekIdx, sessionIdx, exIdx);
      return history.length > 0 ? history[history.length - 1] : null;
    },
    [getHistory]
  );

  // Ajouter / mettre à jour une entrée pour aujourd'hui.
  // setsArr : tableau optionnel { weight, reps } détaillé set-par-set,
  // persisté en JSONB via la migration 046. Si non fourni, on retombe sur
  // l'aggrégation legacy (weight=moyenne, reps=dernière série).
  // exName : nom de l'exercice — utilisé pour détecter un PR sur un main
  // lift (squat/bench/deadlift) et notifier le coach.
  const saveLog = useCallback(
    (weekIdx, sessionIdx, exIdx, weight, reps, setsArr = null, exName = null) => {
      const key = buildExKey(programmeName, weekIdx, sessionIdx, exIdx);
      const today = new Date().toISOString().slice(0, 10);
      const w = parseFloat(weight) || 0;
      const r = reps || "";
      // Normalise le tableau : on ne garde que weight (number) + reps (number/string)
      // et on filtre les sets vides (rien à montrer au coach).
      const normalizedSets = Array.isArray(setsArr)
        ? setsArr
            .map((s) => ({
              weight: parseFloat(s?.weight) || 0,
              reps: s?.reps != null ? s.reps : "",
            }))
            .filter((s) => s.weight > 0 || (s.reps !== "" && Number(s.reps) > 0))
        : null;

      // ── Détection PR (avant le setLogs car on a besoin de l'historique
      // antérieur, hors séance courante). Best-effort, silencieux.
      const lift = canonicalMainLift(exName);
      if (lift && clientId) {
        const newMax = normalizedSets && normalizedSets.length > 0
          ? Math.max(...normalizedSets.map((s) => Number(s.weight) || 0))
          : w;
        const priorEntries = (logs[key] || []).filter((e) => e.date !== today);
        const priorMax = Math.max(0, ...priorEntries.map((h) =>
          Array.isArray(h.sets) && h.sets.length > 0
            ? Math.max(...h.sets.map((s) => Number(s.weight) || 0))
            : Number(h.weight) || 0
        ));
        // Nécessite un priorMax > 0 pour éviter de "PR" sur la 1ère séance
        // de l'exo (techniquement c'est un PR mais ça spam le coach pour
        // chaque nouveau client).
        if (newMax > priorMax && priorMax > 0) {
          notifyCoachPR(clientId, lift, priorMax, newMax);
        }
      }

      setLogs((prev) => {
        const existing = prev[key] || [];
        // Si entrée du jour déjà présente → on la met à jour
        const filtered = existing.filter((e) => e.date !== today);
        const newEntry = { date: today, weight: w, reps: r, sets: normalizedSets };
        return { ...prev, [key]: [...filtered, newEntry] };
      });

      // Persist en cloud (fire-and-forget). Sans ça le coach ne voit jamais
      // les charges et le client perd tout en changeant de device.
      // Upsert manuel via delete-then-insert sur (client_id, ex_key, date)
      // car la table n'a pas de contrainte unique declaree.
      if (clientId) {
        (async () => {
          try {
            await supabase
              .from("exercise_logs")
              .delete()
              .eq("client_id", clientId)
              .eq("ex_key", key)
              .eq("date", today);
            await supabase.from("exercise_logs").insert({
              client_id: clientId,
              ex_key: key,
              date: today,
              weight: w,
              reps: r,
              sets: normalizedSets,
              logged_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("[useLogs] cloud persist failed (offline?):", e?.message);
          }
        })();
      }
    },
    [programmeName, clientId, logs]
  );

  // Delta entre la dernière et l'avant-dernière entrée
  const getDelta = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const history = getHistory(weekIdx, sessionIdx, exIdx);
      if (history.length < 2) return null;
      const delta = history[history.length - 1].weight - history[history.length - 2].weight;
      return delta;
    },
    [getHistory]
  );

  return { getHistory, getLatest, saveLog, getDelta };
}
