import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

/**
 * useProgrammeOverrides — gestion des modifications client sur le programme
 *
 * Reporter / Repos (jour) -> bump programme_start_date (table programmes)
 * Remplacer (exercice)    -> insert/update programme_overrides.exercise_overrides
 * Reordonner (exercices)  -> insert/update programme_overrides.exercise_order
 */
export function useProgrammeOverrides({ clientId, programmeId }) {
  const [overrides, setOverrides] = useState([]); // toutes les rows pour ce programme
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clientId || !programmeId) {
      setOverrides([]); setLoading(false); return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("programme_overrides")
      .select("*")
      .eq("client_id", clientId)
      .eq("programme_id", programmeId);
    setOverrides(data || []);
    setLoading(false);
  }, [clientId, programmeId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Index par clef "{week}-{session}" pour acces O(1)
  const byKey = useMemo(() => {
    const m = new Map();
    overrides.forEach(o => m.set(`${o.week_index}-${o.session_index}`, o));
    return m;
  }, [overrides]);

  const getOverride = useCallback((weekIdx, sessionIdx) => {
    return byKey.get(`${weekIdx}-${sessionIdx}`) || null;
  }, [byKey]);

  /** Applique les overrides a une session parsee. Retourne une copie modifiee. */
  const applyToSession = useCallback((session, weekIdx, sessionIdx) => {
    if (!session) return session;
    const ov = getOverride(weekIdx, sessionIdx);
    if (!ov) return session;

    let exercises = [...(session.exercises || [])];

    // Substitutions (par index original)
    if (ov.exercise_overrides && Object.keys(ov.exercise_overrides).length > 0) {
      exercises = exercises.map((ex, i) => {
        const sub = ov.exercise_overrides[String(i)];
        if (!sub) return ex;
        return { ...ex, ...sub, _substituted: true };
      });
    }

    // Reordering
    if (Array.isArray(ov.exercise_order) && ov.exercise_order.length > 0) {
      const ordered = ov.exercise_order
        .map(idx => exercises[idx])
        .filter(Boolean);
      // On rajoute les exos manquants en fin (au cas ou l'ordre serait incomplet)
      const seen = new Set(ov.exercise_order);
      exercises.forEach((ex, i) => { if (!seen.has(i)) ordered.push(ex); });
      exercises = ordered;
    }

    return { ...session, exercises };
  }, [getOverride]);

  /** Reporter ou Repos = pousse start_date d'1 jour. */
  const bumpStartDate = useCallback(async ({ logRest = false } = {}) => {
    if (!programmeId) { console.warn("[bumpStartDate] no programmeId"); return false; }
    const { data: prog, error: e1 } = await supabase
      .from("programmes")
      .select("skipped_dates, rest_days_count, reported_days_count")
      .eq("id", programmeId)
      .maybeSingle();
    if (e1 || !prog) { console.warn("[bumpStartDate] read failed:", e1?.message, e1?.code); return false; }

    // Au lieu de bumper start_date globalement (effet domino), on AJOUTE la
    // date du jour à skipped_dates. Le calcul du calendrier saute cette date
    // → la session du jour passe en rest, et la prochaine training day prend
    // la session prévue aujourd'hui.
    const today = new Date().toISOString().slice(0, 10);
    const existing = prog.skipped_dates || [];
    if (existing.includes(today)) return true; // déjà skippée, no-op

    const counters = logRest
      ? { rest_days_count: (prog.rest_days_count || 0) + 1 }
      : { reported_days_count: (prog.reported_days_count || 0) + 1 };

    const { error: e2 } = await supabase
      .from("programmes")
      .update({
        skipped_dates: [...existing, today],
        ...counters,
      })
      .eq("id", programmeId);

    if (e2) console.warn("[bumpStartDate] update failed:", e2.message, e2.code, e2.details);
    return !e2;
  }, [programmeId]);

  /** Substitue un exercice ou enleve la substitution (sub = null). */
  const substituteExercise = useCallback(async ({ weekIndex, sessionIndex, originalIndex, substitute }) => {
    if (!clientId || !programmeId) return false;
    const existing = byKey.get(`${weekIndex}-${sessionIndex}`);
    const newOverrides = { ...(existing?.exercise_overrides || {}) };
    if (substitute) newOverrides[String(originalIndex)] = substitute;
    else delete newOverrides[String(originalIndex)];

    const payload = {
      client_id: clientId,
      programme_id: programmeId,
      week_index: weekIndex,
      session_index: sessionIndex,
      exercise_overrides: newOverrides,
      exercise_order: existing?.exercise_order || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("programme_overrides")
      .upsert(payload, { onConflict: "client_id,programme_id,week_index,session_index" });

    if (error) console.warn("[substituteExercise] failed:", error.message, error.code, error.details);
    if (!error) await fetchAll();
    return !error;
  }, [clientId, programmeId, byKey, fetchAll]);

  /** Sauvegarde un nouvel ordre d'exercices pour une session. */
  const reorderExercises = useCallback(async ({ weekIndex, sessionIndex, newOrder }) => {
    if (!clientId || !programmeId) return false;
    const existing = byKey.get(`${weekIndex}-${sessionIndex}`);
    const payload = {
      client_id: clientId,
      programme_id: programmeId,
      week_index: weekIndex,
      session_index: sessionIndex,
      exercise_overrides: existing?.exercise_overrides || {},
      exercise_order: newOrder,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("programme_overrides")
      .upsert(payload, { onConflict: "client_id,programme_id,week_index,session_index" });
    if (error) console.warn("[reorderExercises] failed:", error.message, error.code, error.details);
    if (!error) await fetchAll();
    return !error;
  }, [clientId, programmeId, byKey, fetchAll]);

  return {
    loading,
    overrides,
    getOverride,
    applyToSession,
    bumpStartDate,
    substituteExercise,
    reorderExercises,
    refresh: fetchAll,
  };
}
