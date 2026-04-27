import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { parseProgrammeHTML } from "../utils/parserProgramme";

/**
 * useScheduledRuns — recupere les runs prescrits par le coach pour la
 * semaine en cours, et indique lesquels ont deja ete loggues.
 *
 * Source : programmes (html_content) + run_logs.
 *
 * Retourne :
 *   loading: boolean
 *   programmeId: uuid|null
 *   currentWeek: 1..N (1 si pas de start_date)
 *   runs: [{
 *     name, distance, duration, bpm, rest,
 *     sessionIndex,            // 0-based dans la semaine en cours
 *     sessionName,
 *     runIndex,                // 0-based dans la session
 *     done: boolean,
 *     loggedRun: run_logs row | null,
 *   }]
 *   refresh: () => void
 */
export function useScheduledRuns(clientId) {
  const [state, setState] = useState({
    loading: true,
    programmeId: null,
    currentWeek: 1,
    runs: [],
  });

  const fetchAll = useCallback(async () => {
    if (!clientId) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    // 1. fetch active programme
    const { data: prog } = await supabase
      .from("programmes")
      .select("id, html_content, programme_start_date, uploaded_at")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prog?.html_content) {
      setState({ loading: false, programmeId: null, currentWeek: 1, runs: [] });
      return;
    }

    // 2. parse
    let parsed;
    try {
      parsed = parseProgrammeHTML(prog.html_content);
    } catch (_) {
      setState({ loading: false, programmeId: prog.id, currentWeek: 1, runs: [] });
      return;
    }

    // 3. compute current week (1-based)
    const startDate = prog.programme_start_date
      ? new Date(prog.programme_start_date)
      : new Date(prog.uploaded_at);
    const daysSince = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000));
    const weekNumber = Math.min(Math.floor(daysSince / 7) + 1, parsed.totalWeeks || 1);
    const week = parsed.weeks?.[weekNumber - 1];

    if (!week) {
      setState({ loading: false, programmeId: prog.id, currentWeek: weekNumber, runs: [] });
      return;
    }

    // 4. flatten all prescribed runs of the week
    const flatRuns = [];
    week.sessions.forEach((session, si) => {
      (session.runs || []).forEach((run, ri) => {
        flatRuns.push({
          ...run,
          sessionIndex: si,
          sessionName: session.name,
          runIndex: ri,
        });
      });
    });

    if (flatRuns.length === 0) {
      setState({ loading: false, programmeId: prog.id, currentWeek: weekNumber, runs: [] });
      return;
    }

    // 5. fetch run_logs for this week to mark done
    const weekStart = new Date(startDate.getTime() + (weekNumber - 1) * 7 * 86400000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const weekStartIso = weekStart.toISOString().split("T")[0];
    const weekEndIso = weekEnd.toISOString().split("T")[0];

    const { data: logs } = await supabase
      .from("run_logs")
      .select("*")
      .eq("client_id", clientId)
      .eq("programme_id", prog.id)
      .eq("programme_week", weekNumber)
      .gte("date", weekStartIso)
      .lt("date", weekEndIso);

    const logsByKey = new Map();
    (logs || []).forEach(l => {
      const key = `${l.programme_session}-${l.programme_run_index}`;
      logsByKey.set(key, l);
    });

    const enriched = flatRuns.map(r => {
      const key = `${r.sessionIndex}-${r.runIndex}`;
      const log = logsByKey.get(key);
      return { ...r, done: !!log, loggedRun: log || null };
    });

    setState({
      loading: false,
      programmeId: prog.id,
      currentWeek: weekNumber,
      runs: enriched,
    });
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { ...state, refresh: fetchAll };
}
