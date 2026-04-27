import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { parseProgrammeHTML } from "../utils/parserProgramme";

/**
 * useScheduledRuns — runs prescrits par le coach pour la semaine consultee.
 *
 * Computes "currentWeek" automatiquement depuis programme_start_date / uploaded_at.
 * "viewWeek" est la semaine que l'utilisateur regarde (par defaut = currentWeek).
 *
 * Retourne :
 *   loading, programmeId, totalWeeks, currentWeek, viewWeek, setViewWeek,
 *   canGoPrev, canGoNext, runs (pour la viewWeek), refresh
 */
export function useScheduledRuns(clientId) {
  const [parsedData, setParsedData] = useState({
    loading: true,
    programmeId: null,
    parsed: null,
    startDate: null,
    runLogs: [],
  });
  const [viewWeek, setViewWeek] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!clientId) {
      setParsedData(s => ({ ...s, loading: false }));
      return;
    }

    const { data: prog } = await supabase
      .from("programmes")
      .select("id, html_content, programme_start_date, uploaded_at")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prog?.html_content) {
      setParsedData({ loading: false, programmeId: null, parsed: null, startDate: null, runLogs: [] });
      return;
    }

    let parsed = null;
    try { parsed = parseProgrammeHTML(prog.html_content); } catch (_) {}

    const startDate = prog.programme_start_date
      ? new Date(prog.programme_start_date)
      : new Date(prog.uploaded_at);

    // Tous les runs prescrits valides — pour cross-ref avec les logs
    const { data: logs } = await supabase
      .from("run_logs")
      .select("*")
      .eq("client_id", clientId)
      .eq("programme_id", prog.id);

    setParsedData({
      loading: false,
      programmeId: prog.id,
      parsed,
      startDate,
      runLogs: logs || [],
    });
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalWeeks = parsedData.parsed?.totalWeeks || 0;

  const currentWeek = useMemo(() => {
    if (!parsedData.startDate || !totalWeeks) return 1;
    const daysSince = Math.max(0, Math.floor((Date.now() - parsedData.startDate.getTime()) / 86400000));
    return Math.min(Math.floor(daysSince / 7) + 1, totalWeeks);
  }, [parsedData.startDate, totalWeeks]);

  // Init viewWeek = currentWeek une fois que les donnees sont la
  useEffect(() => {
    if (viewWeek === null && totalWeeks > 0) {
      setViewWeek(currentWeek);
    }
  }, [viewWeek, currentWeek, totalWeeks]);

  const effectiveViewWeek = viewWeek || currentWeek || 1;

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

    // Mark done state
    const logsByKey = new Map();
    parsedData.runLogs
      .filter(l => l.programme_week === effectiveViewWeek)
      .forEach(l => {
        logsByKey.set(`${l.programme_session}-${l.programme_run_index}`, l);
      });

    return flat.map(r => {
      const key = `${r.sessionIndex}-${r.runIndex}`;
      const log = logsByKey.get(key);
      return { ...r, done: !!log, loggedRun: log || null };
    });
  }, [parsedData.parsed, parsedData.runLogs, effectiveViewWeek, totalWeeks]);

  return {
    loading: parsedData.loading,
    programmeId: parsedData.programmeId,
    totalWeeks,
    currentWeek,
    viewWeek: effectiveViewWeek,
    setViewWeek,
    canGoPrev: effectiveViewWeek > 1,
    canGoNext: effectiveViewWeek < totalWeeks,
    runs,
    refresh: fetchAll,
  };
}
