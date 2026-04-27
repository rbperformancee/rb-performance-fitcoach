import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { parseProgrammeHTML } from "../utils/parserProgramme";

/**
 * useScheduledRuns — runs prescrits par le coach pour la semaine consultee.
 *
 * Mode hybride :
 *  - calendarWeek = computed depuis programme_start_date
 *  - validatedUntilWeek = colonne en DB (validation explicite par le client)
 *  - currentWeek = MAX(calendarWeek, validatedUntilWeek + 1)
 *
 * Le client peut valider une semaine via validateWeek(n) → bump le seuil.
 * Cap a totalWeeks.
 *
 * Retourne :
 *   loading, programmeId, totalWeeks
 *   currentWeek, calendarWeek, validatedUntilWeek
 *   viewWeek, setViewWeek, canGoPrev, canGoNext
 *   runs (pour la viewWeek)
 *   weekFullyDone (la viewWeek est-elle 100% loguee)
 *   validateWeek(week) : bump validated_until_week
 *   refresh
 */
export function useScheduledRuns(clientId) {
  const [parsedData, setParsedData] = useState({
    loading: true,
    programmeId: null,
    parsed: null,
    startDate: null,
    runLogs: [],
    sessionLogs: [],
    validatedUntilWeek: 0,
  });
  const [viewWeek, setViewWeek] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!clientId) {
      setParsedData(s => ({ ...s, loading: false }));
      return;
    }

    const { data: prog } = await supabase
      .from("programmes")
      .select("id, html_content, programme_start_date, uploaded_at, validated_until_week")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prog?.html_content) {
      setParsedData({ loading: false, programmeId: null, parsed: null, startDate: null, runLogs: [], sessionLogs: [], validatedUntilWeek: 0 });
      return;
    }

    let parsed = null;
    try { parsed = parseProgrammeHTML(prog.html_content); } catch (_) {}

    const startDate = prog.programme_start_date
      ? new Date(prog.programme_start_date)
      : new Date(prog.uploaded_at);

    const [{ data: runLogs }, { data: sessionLogs }] = await Promise.all([
      supabase.from("run_logs").select("*").eq("client_id", clientId).eq("programme_id", prog.id),
      supabase.from("session_logs").select("logged_at, session_name").eq("client_id", clientId).gte("logged_at", startDate.toISOString()),
    ]);

    setParsedData({
      loading: false,
      programmeId: prog.id,
      parsed,
      startDate,
      runLogs: runLogs || [],
      sessionLogs: sessionLogs || [],
      validatedUntilWeek: prog.validated_until_week || 0,
    });
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalWeeks = parsedData.parsed?.totalWeeks || 0;

  const calendarWeek = useMemo(() => {
    if (!parsedData.startDate || !totalWeeks) return 1;
    const daysSince = Math.max(0, Math.floor((Date.now() - parsedData.startDate.getTime()) / 86400000));
    return Math.min(Math.floor(daysSince / 7) + 1, totalWeeks);
  }, [parsedData.startDate, totalWeeks]);

  const currentWeek = useMemo(() => {
    if (!totalWeeks) return 1;
    return Math.min(Math.max(calendarWeek, parsedData.validatedUntilWeek + 1), totalWeeks);
  }, [calendarWeek, parsedData.validatedUntilWeek, totalWeeks]);

  // Init viewWeek = currentWeek une fois que les donnees sont la
  useEffect(() => {
    if (viewWeek === null && totalWeeks > 0) {
      setViewWeek(currentWeek);
    }
  }, [viewWeek, currentWeek, totalWeeks]);

  const effectiveViewWeek = viewWeek || currentWeek || 1;

  // Date range de la viewWeek (utilise pour mapper les session_logs)
  const weekDateRange = useMemo(() => {
    if (!parsedData.startDate) return { start: null, end: null };
    const start = new Date(parsedData.startDate.getTime() + (effectiveViewWeek - 1) * 7 * 86400000);
    const end = new Date(start.getTime() + 7 * 86400000);
    return { start, end };
  }, [parsedData.startDate, effectiveViewWeek]);

  const runs = useMemo(() => {
    if (!parsedData.parsed || !totalWeeks) return [];
    const week = parsedData.parsed.weeks?.[effectiveViewWeek - 1];
    if (!week) return [];

    const flat = [];
    week.sessions.forEach((session, si) => {
      (session.runs || []).forEach((run, ri) => {
        flat.push({ ...run, sessionIndex: si, sessionName: session.name, runIndex: ri });
      });
    });

    const logsByKey = new Map();
    parsedData.runLogs
      .filter(l => l.programme_week === effectiveViewWeek)
      .forEach(l => logsByKey.set(`${l.programme_session}-${l.programme_run_index}`, l));

    return flat.map(r => {
      const key = `${r.sessionIndex}-${r.runIndex}`;
      const log = logsByKey.get(key);
      return { ...r, done: !!log, loggedRun: log || null };
    });
  }, [parsedData.parsed, parsedData.runLogs, effectiveViewWeek, totalWeeks]);

  // weekFullyDone : tous les runs prescrits faits + assez de session_logs
  // dans la fenetre temporelle pour couvrir les sessions de la semaine
  const weekFullyDone = useMemo(() => {
    if (!parsedData.parsed || !totalWeeks) return false;
    const week = parsedData.parsed.weeks?.[effectiveViewWeek - 1];
    if (!week) return false;

    const allRunsDone = runs.length === 0 || runs.every(r => r.done);

    const totalSessions = week.sessions.length;
    if (totalSessions === 0) return allRunsDone;

    if (!weekDateRange.start) return false;
    const sessionsLogged = parsedData.sessionLogs.filter(l => {
      const t = new Date(l.logged_at).getTime();
      return t >= weekDateRange.start.getTime() && t < weekDateRange.end.getTime();
    });
    const uniqueNames = new Set(sessionsLogged.map(l => l.session_name).filter(Boolean));
    const sessionsDone = uniqueNames.size >= totalSessions;

    return allRunsDone && sessionsDone;
  }, [parsedData.parsed, parsedData.sessionLogs, runs, effectiveViewWeek, totalWeeks, weekDateRange]);

  const validateWeek = useCallback(async (week) => {
    if (!parsedData.programmeId) return;
    const target = Math.max(parsedData.validatedUntilWeek, week);
    const { error } = await supabase
      .from("programmes")
      .update({ validated_until_week: target, validated_at: new Date().toISOString() })
      .eq("id", parsedData.programmeId);
    if (!error) {
      // bump local + jump viewWeek a la semaine suivante si possible
      setParsedData(s => ({ ...s, validatedUntilWeek: target }));
      const next = Math.min(target + 1, totalWeeks);
      setViewWeek(next);
    }
    return !error;
  }, [parsedData.programmeId, parsedData.validatedUntilWeek, totalWeeks]);

  return {
    loading: parsedData.loading,
    programmeId: parsedData.programmeId,
    totalWeeks,
    calendarWeek,
    validatedUntilWeek: parsedData.validatedUntilWeek,
    currentWeek,
    viewWeek: effectiveViewWeek,
    setViewWeek,
    canGoPrev: effectiveViewWeek > 1,
    canGoNext: effectiveViewWeek < totalWeeks,
    runs,
    weekFullyDone,
    validateWeek,
    refresh: fetchAll,
  };
}
