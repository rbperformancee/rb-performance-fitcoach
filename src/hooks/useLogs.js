import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

import { todayLocal } from "../lib/date";
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
    const summary = `${name} a battu son record sur ${liftName} : ${fmt(priorMax)}kg → ${fmt(newMax)}kg (+${fmt(newMax - priorMax)}kg)`;
    await supabase.from("coach_activity_log").insert({
      coach_id: client.coach_id,
      client_id: clientId,
      activity_type: "client_pr",
      details: summary,
    });
    // Push notif sur le téléphone du coach (au-delà du activity log).
    // Best-effort : si le coach n'a pas encore activé les push, le filtre
    // dans push_subscriptions renvoie 0 row et l'Edge function no-op.
    try {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;
      if (SUPABASE_URL && ANON) {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON },
          body: JSON.stringify({
            coach_id: client.coach_id,
            title: `Record battu · ${name}`,
            body: `${liftName} : ${fmt(priorMax)}kg → ${fmt(newMax)}kg (+${fmt(newMax - priorMax)}kg)`,
            url: "/login",
          }),
        });
      }
    } catch { /* push best-effort */ }
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

  // Hydrate logs depuis Supabase. Factorisé pour réutiliser depuis
  // useEffect (mount/clientId) ET depuis pull-to-refresh côté iOS.
  const hydrateFromCloud = useCallback(async () => {
    if (!clientId) return;
    // SELECT inclut `sets` (JSONB des sets détaillés) : sans ça, le hydrate
    // ne conservait que weight (moyenne) et reps (dernier set) → le ghost
    // "la dernière fois" affichait avg × lastReps qui ne correspond à aucun
    // set réel (ex: 80×10/75×10/70×8 → ghost "75kg × 8" jamais fait). Le
    // prefill du SetRow utilise aussi sets[i]?.weight pour pre-remplir le
    // set i avec le poids réel de cette série précédente.
    const { data } = await supabase
      .from("exercise_logs")
      .select("ex_key, date, weight, reps, sets, logged_at")
      .eq("client_id", clientId)
      .order("logged_at", { ascending: true })
      .limit(2000);
    if (!Array.isArray(data) || data.length === 0) return;
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
          sets: Array.isArray(r.sets) ? r.sets : null,
        });
        arr.sort((a, b) => a.date.localeCompare(b.date));
        next[key] = arr;
      }
      return next;
    });
  }, [clientId]);

  // Hydrate localStorage depuis Supabase au mount + apres changement clientId.
  // Permet au coach de voir l'historique depuis n'importe quel device et au
  // client de retrouver ses logs apres reinstall / changement de tel.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await hydrateFromCloud();
    })();
    return () => { cancelled = true; };
  }, [clientId, hydrateFromCloud]);

  // Retourne l'historique du même (semaine, séance, exo).
  // Utilisé pour : "as-tu fait CET exo cette semaine ?" (badge done, progression
  // de la séance courante, gating PDF export). Strictement scope semaine courante.
  const getHistory = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const key = buildExKey(programmeName, weekIdx, sessionIdx, exIdx);
      return logs[key] || [];
    },
    [logs, programmeName]
  );

  // Retourne l'historique du même (séance, exo) **toutes semaines confondues**.
  // C'est ce qu'on affiche dans l'ExerciseCard : "quel poids j'ai mis la
  // dernière fois sur ce squat" — quelque soit la semaine. Sans ça, en
  // semaine 2 le client ne voit JAMAIS les charges qu'il a tapées en semaine 1
  // (bug rapporté en prod 2 juin 2026 : "je vois pas les poids semaine
  // précédente").
  //
  // Regex : match `__wN_s<sessionIdx>_e<exIdx>` pour tout N. Si le coach a
  // restructuré le programme (ajout/retrait de semaines), les entrées
  // historiques restent visibles tant que (sessionIdx, exIdx) sont stables.
  const getCrossWeekHistory = useCallback(
    (sessionIdx, exIdx) => {
      const pattern = new RegExp(`__w\\d+_s${sessionIdx}_e${exIdx}$`);
      const out = [];
      for (const key of Object.keys(logs)) {
        if (pattern.test(key)) {
          const arr = logs[key];
          if (Array.isArray(arr)) out.push(...arr);
        }
      }
      // Tri chronologique ASC pour que [length-1] soit la séance la plus
      // récente. Dédup par date au cas où une saisie ait été dupliquée
      // (la dernière gagne — match avec la sémantique de saveLog qui
      // delete-then-insert sur (client_id, ex_key, date)).
      const byDate = new Map();
      for (const e of out) {
        if (e && e.date) byDate.set(e.date, e);
      }
      return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    [logs]
  );

  // Dernière entrée toutes semaines confondues — utilisé pour pré-remplir le
  // poids quand le client ouvre la séance de cette semaine (référence = ce
  // qu'il a fait la fois précédente, peu importe la semaine).
  const getLatest = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const history = getCrossWeekHistory(sessionIdx, exIdx);
      return history.length > 0 ? history[history.length - 1] : null;
    },
    [getCrossWeekHistory]
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
      const today = todayLocal();
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

      // Persist en cloud. Sans ça le coach ne voit jamais les charges et le
      // client perd tout en changeant de device.
      //
      // Atomicité : avant on faisait delete-then-insert sans transaction. Si
      // le insert plantait (drop wifi mid-write, RLS, JWT expirée), la row
      // était perdue à jamais — seul un console.warn fire-and-forget. Camille
      // a déjà eu ce bug en wifi→4G handoff au milieu d'une série.
      //
      // Fix : on garde un snapshot des anciennes rows AVANT delete, et si
      // l'insert fail on les ré-insère pour restaurer l'état initial. Le
      // log local (localStorage) reste, donc le retry à la prochaine entrée
      // de la même série remettra tout d'aplomb.
      if (clientId) {
        (async () => {
          let backup = null;
          try {
            const { data: existing } = await supabase
              .from("exercise_logs")
              .select("*")
              .eq("client_id", clientId)
              .eq("ex_key", key)
              .eq("date", today);
            backup = existing || [];
            const { error: delErr } = await supabase
              .from("exercise_logs")
              .delete()
              .eq("client_id", clientId)
              .eq("ex_key", key)
              .eq("date", today);
            if (delErr) throw delErr;
            const { error: insErr } = await supabase.from("exercise_logs").insert({
              client_id: clientId,
              ex_key: key,
              date: today,
              weight: w,
              reps: r,
              sets: normalizedSets,
              logged_at: new Date().toISOString(),
            });
            if (insErr) throw insErr;
          } catch (e) {
            console.warn("[useLogs] cloud persist failed:", e?.message);
            // Restaurer le snapshot pour éviter une perte définitive si le
            // delete a réussi mais le insert a échoué.
            if (backup && backup.length > 0) {
              try {
                await supabase.from("exercise_logs").insert(
                  backup.map(({ id: _id, ...row }) => row) // strip id
                );
              } catch (restoreErr) {
                console.error("[useLogs] backup restore failed:", restoreErr?.message);
              }
            }
          }
        })();
      }
    },
    [programmeName, clientId, logs]
  );

  // Delta entre la dernière et l'avant-dernière entrée, toutes semaines
  // confondues. Permet d'afficher "+2.5kg" sur la flèche de progression
  // semaine-après-semaine (sans ça, le delta n'apparaît qu'à la 2e séance
  // de la SEMAINE COURANTE — donc jamais en pratique).
  const getDelta = useCallback(
    (weekIdx, sessionIdx, exIdx) => {
      const history = getCrossWeekHistory(sessionIdx, exIdx);
      if (history.length < 2) return null;
      const delta = history[history.length - 1].weight - history[history.length - 2].weight;
      return delta;
    },
    [getCrossWeekHistory]
  );

  return { getHistory, getCrossWeekHistory, getLatest, saveLog, getDelta, refresh: hydrateFromCloud };
}
