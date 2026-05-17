import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { ExerciseCard } from "./ExerciseCard";
import { buildExerciseBlocks, supersetTypeLabel } from "../lib/supersets";
import SessionOptionsModal from "./SessionOptionsModal";
import { useProgrammeOverrides } from "../hooks/useProgrammeOverrides";
import { useT } from "../lib/i18n";

const G = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.1)";
const G_BORDER = "rgba(2,209,186,0.25)";

function getProgressStatus(history) {
  if (!history || history.length < 2) return "neutral";
  const last = history[history.length - 1]?.weight;
  const prev = history[history.length - 2]?.weight;
  if (!last || !prev) return "neutral";
  if (last > prev) return "green";
  if (last < prev) return "red";
  return "yellow";
}

function StatusDot({ status }) {
  const colors = { green: G, yellow: "#fbbf24", red: "#ef4444", neutral: "rgba(255,255,255,0.15)" };
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || colors.neutral, flexShrink: 0 }} />;
}

// FinisherCard premium avec chrono persistant (timestamp-based, survit close PWA)
const fmtTime = (s) => {
  const ss = Math.max(0, Math.floor(s));
  return String(Math.floor(ss / 60)).padStart(2, "0") + ":" + String(ss % 60).padStart(2, "0");
};

function FinisherCard({ finisher, weekIdx, sessionIdx, label }) {
  const KEY = `rb_finisher_${weekIdx}_${sessionIdx}`;

  // État chrono : { start: timestamp ms, total?: seconds (figé au stop), done?: bool }
  const readState = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }, [KEY]);

  const [seconds, setSeconds] = useState(() => {
    const s = readState();
    if (s.done) return s.total || 0;
    if (s.start) return Math.floor((Date.now() - s.start) / 1000);
    return 0;
  });
  const [running, setRunning] = useState(() => {
    const s = readState();
    return !!(s.start && !s.done);
  });
  const [done, setDone] = useState(() => !!readState().done);
  const tickRef = useRef(null);

  // Reset l'état UI quand on change de séance
  useEffect(() => {
    const s = readState();
    if (s.done) { setSeconds(s.total || 0); setRunning(false); setDone(true); }
    else if (s.start) { setSeconds(Math.floor((Date.now() - s.start) / 1000)); setRunning(true); setDone(false); }
    else { setSeconds(0); setRunning(false); setDone(false); }
  }, [weekIdx, sessionIdx, readState]);

  // Tick + resync au retour de l'app (visibilitychange)
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!running) return;
    tickRef.current = setInterval(() => {
      const s = readState();
      if (s.start && !s.done) setSeconds(Math.floor((Date.now() - s.start) / 1000));
    }, 1000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const s = readState();
      if (s.start && !s.done) setSeconds(Math.floor((Date.now() - s.start) / 1000));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(tickRef.current); document.removeEventListener("visibilitychange", onVisible); };
  }, [running, readState]);

  const start = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ start: Date.now() })); } catch {}
    setSeconds(0); setRunning(true); setDone(false);
  };
  const stop = () => {
    const s = readState();
    const total = s.start ? Math.floor((Date.now() - s.start) / 1000) : seconds;
    try { localStorage.setItem(KEY, JSON.stringify({ start: s.start || Date.now(), total, done: true })); } catch {}
    setSeconds(total); setRunning(false); setDone(true);
  };
  const reset = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setSeconds(0); setRunning(false); setDone(false);
  };

  const tColor = done ? G : (running ? "#fff" : "rgba(255,255,255,0.35)");
  const tStateLabel = done ? "TON TEMPS — VALIDÉ" : (running ? "CHRONO EN COURS" : "PRÊT À DÉMARRER");
  const display = (seconds > 0 || running || done) ? fmtTime(seconds) : "--:--";

  return (
    <div style={{ padding: "0 20px", marginTop: 28 }}>
      <div style={{
        background: "linear-gradient(160deg, rgba(239,68,68,0.10) 0%, rgba(15,15,15,0.55) 60%, rgba(0,0,0,0.7) 100%)",
        border: "1px solid rgba(239,68,68,0.28)",
        borderRadius: 22,
        padding: "26px 24px 24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        {/* Accent line top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(239,68,68,0.6) 40%, rgba(239,68,68,0) 100%)" }} />
        {/* Glow halo */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 220, height: 220,
          background: "radial-gradient(circle, rgba(239,68,68,0.22) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -90, left: -60, width: 220, height: 220,
          background: "radial-gradient(circle, rgba(239,68,68,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(239,68,68,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239,68,68,0.4)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
              <polygon points="13,2 3,14 11,14 11,22 21,10 13,10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "3.5px", textTransform: "uppercase", color: "#ef4444" }}>
              {label || "Finisher"}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Bonus de fin de séance
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 14.5, color: "rgba(255,255,255,0.94)", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 22, position: "relative", fontWeight: 500 }}>
          {finisher}
        </div>

        {/* Chrono display */}
        <div style={{ paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)", position: "relative", textAlign: "center" }}>
          <div style={{
            fontSize: 56, fontWeight: 100, color: tColor, letterSpacing: "-3px",
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            lineHeight: 1, marginBottom: 8,
            textShadow: done ? `0 0 30px ${G}55` : (running ? "0 0 20px rgba(239,68,68,0.3)" : "none"),
            transition: "color 0.2s, text-shadow 0.2s",
          }}>
            {display.split(":")[0]}
            <span style={{ color: "rgba(255,255,255,0.2)" }}>:</span>
            {display.split(":")[1]}
          </div>
          <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase",
            color: done ? G : "rgba(255,255,255,0.35)", marginBottom: 18, transition: "color 0.2s" }}>
            {tStateLabel}{done && " ✓"}
          </div>

          {/* Buttons */}
          {!running && !done && (
            <button onClick={start} style={{
              background: "#ef4444", color: "white", border: "none", borderRadius: 12,
              padding: "13px 30px", fontSize: 12, fontWeight: 800, letterSpacing: "2px",
              textTransform: "uppercase", cursor: "pointer", width: "100%",
              boxShadow: "0 4px 18px rgba(239,68,68,0.35)",
              transition: "transform 0.1s, box-shadow 0.15s",
            }}
              onTouchStart={(e) => e.currentTarget.style.transform = "scale(0.98)"}
              onTouchEnd={(e) => e.currentTarget.style.transform = ""}>
              Démarrer le chrono
            </button>
          )}
          {running && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={stop} style={{
                flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: 12,
                padding: "13px 20px", fontSize: 12, fontWeight: 800, letterSpacing: "2px",
                textTransform: "uppercase", cursor: "pointer",
                boxShadow: "0 4px 18px rgba(239,68,68,0.35)",
              }}>
                Stop
              </button>
              <button onClick={reset} style={{
                background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
                padding: "13px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
                textTransform: "uppercase", cursor: "pointer",
              }}>
                Reset
              </button>
            </div>
          )}
          {done && (
            <button onClick={reset} style={{
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              padding: "11px 24px", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", cursor: "pointer",
            }}>
              Refaire
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Compute today's expected session based on programme.start_date + training_days,
// en sautant les dates dans skipped_dates (Reporter / Jour de repos).
function computeTodaysSession(programmeMeta, programme) {
  if (!programmeMeta?.start_date || !programmeMeta?.training_days?.length || !programme?.weeks?.length) {
    return null;
  }
  const start = new Date(programmeMeta.start_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const skipped = new Set(programmeMeta.skipped_dates || []);
  const msPerDay = 86400000;
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / msPerDay);
  if (daysSinceStart < 0) return { type: "not_started", daysUntil: -daysSinceStart };

  // Aujourd'hui marqué comme skip via le bouton Reporter ou Jour de repos
  if (skipped.has(todayStr)) return { type: "rest" };

  const weekday = ((today.getDay() + 6) % 7) + 1;
  const trainingDays = programmeMeta.training_days.slice().sort((a, b) => a - b);
  if (!trainingDays.includes(weekday)) return { type: "rest" };

  // Compte les training days "effectifs" (non skippés) jusqu'à aujourd'hui.
  // Si le client a skip 1 mardi, le mercredi suivant prend la session qui
  // était prévue ce mardi → effet "session reportée d'1 jour".
  let effectiveIdx = -1;
  for (let d = 0; d <= daysSinceStart; d++) {
    const date = new Date(start.getTime() + d * msPerDay);
    const dateStr = date.toISOString().slice(0, 10);
    const dayWeekday = ((date.getDay() + 6) % 7) + 1;
    if (trainingDays.includes(dayWeekday) && !skipped.has(dateStr)) {
      effectiveIdx++;
    }
  }
  if (effectiveIdx < 0) return { type: "rest" };

  const sessionsPerWeek = trainingDays.length;
  const weekIdx = Math.floor(effectiveIdx / sessionsPerWeek);
  const sessionIdx = effectiveIdx % sessionsPerWeek;
  if (weekIdx >= programme.weeks.length) return { type: "finished" };
  const sessionsInWeek = programme.weeks[weekIdx]?.sessions?.length || 0;
  if (sessionIdx >= sessionsInWeek) return { type: "rest" };
  return { type: "session", week: weekIdx, session: sessionIdx, sessionsPerWeek };
}

export default function TrainingPage({ client, programme, programmeMeta, activeWeek, setActiveWeek, activeSession, setActiveSession, getHistory, getLatest, saveLog, getDelta, onStartSession }) {
  const t = useT();
  const [showRessenti, setShowRessenti] = useState(false);
  const [sessionValidee, setSessionValidee] = useState(false);
  const [hydratedFromCloud, setHydratedFromCloud] = useState(false);
  // Bypass de l'ecran "Jour de repos" via le bouton "Voir le programme quand
  // meme" : sans ce state l'early-return (l. ~583) renvoie tjs l'ecran repos.
  const [forceShowProgramme, setForceShowProgramme] = useState(false);
  // Helper : verifier si une seance (week, sessionIdx) est validee via localStorage
  const isSessionValidee = useCallback((wIdx, sIdx) => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_c_${wIdx}_${sIdx}`) || "{}");
      return !!s.validee;
    } catch (e) { return false; }
  }, []);

  // Calcul de la séance prévue AUJOURD'HUI selon programme.start_date + training_days
  const todaysSession = useMemo(
    () => computeTodaysSession(programmeMeta, programme),
    [programmeMeta?.start_date, programmeMeta?.training_days, programme?.weeks?.length]
  );

  // Mini-calendrier hebdo : pour chaque jour de la semaine en cours (Lun-Dim)
  // → status (rest / todo / done / today / future)
  const weekStrip = useMemo(() => {
    if (!programmeMeta?.start_date || !programmeMeta?.training_days?.length) return null;
    const start = new Date(programmeMeta.start_date + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const td = programmeMeta.training_days.slice().sort((a, b) => a - b);
    const msDay = 86400000;
    // Trouve le lundi de la semaine actuelle
    const dow = ((today.getDay() + 6) % 7); // 0=Mon..6=Sun
    const monday = new Date(today.getTime() - dow * msDay);
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(monday.getTime() + i * msDay);
      const weekday = i + 1;
      const daysSinceStart = Math.floor((date - start) / msDay);
      const isFuture = date > today;
      const isToday = date.getTime() === today.getTime();
      const isPast = !isFuture && !isToday;
      if (daysSinceStart < 0) return { weekday, status: "future", date };
      if (!td.includes(weekday)) return { weekday, status: "rest", date };
      const wIdx = Math.floor(daysSinceStart / 7);
      const sIdx = td.indexOf(weekday);
      const validated = isSessionValidee(wIdx, sIdx);
      let status;
      if (validated) status = "done";
      else if (isToday) status = "today";
      else if (isPast) status = "missed";
      else status = "future_training";
      return { weekday, status, date, wIdx, sIdx };
    });
  }, [programmeMeta?.start_date, programmeMeta?.training_days, isSessionValidee, programme?.weeks?.length]);

  const missedCount = useMemo(
    () => (weekStrip || []).filter(d => d.status === "missed").length,
    [weekStrip]
  );

  // ==== HYDRATATION CLOUD ====
  // Au premier mount : fetch session_completions du client + auto-position
  // sur la séance d'aujourd'hui (selon le calendrier) ou la 1re non-complétée.
  useEffect(() => {
    if (!client?.id || hydratedFromCloud) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("session_completions")
        .select("week_idx, session_idx, validated_at, chrono_seconds")
        .eq("client_id", client.id);
      if (cancelled) return;
      const completed = new Set();
      (data || []).forEach((c) => {
        const ckey = `rb_c_${c.week_idx}_${c.session_idx}`;
        try {
          const cur = JSON.parse(localStorage.getItem(ckey) || "{}");
          localStorage.setItem(ckey, JSON.stringify({
            ...cur,
            validee: true,
            done: true,
            total: c.chrono_seconds || cur.total || 0,
          }));
        } catch {}
        completed.add(`${c.week_idx}_${c.session_idx}`);
      });

      // Priorité 1 : si on a un calendrier ET qu'aujourd'hui est un training day → on y va
      // Priorité 2 : 1re séance non-complétée
      let target = null;
      if (todaysSession?.type === "session") {
        target = { w: todaysSession.week, s: todaysSession.session };
      } else {
        const weeks = programme?.weeks || [];
        outer: for (let w = 0; w < weeks.length; w++) {
          const sessions = weeks[w].sessions || [];
          for (let s = 0; s < sessions.length; s++) {
            if (!completed.has(`${w}_${s}`)) { target = { w, s }; break outer; }
          }
        }
      }
      if (target && (target.w !== activeWeek || target.s !== activeSession)) {
        setActiveWeek(target.w);
        setActiveSession(target.s);
      }
      setHydratedFromCloud(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [client?.id, programme?.weeks?.length, todaysSession?.type]);
  // Ref pour la rangee horizontale des seances (auto-scroll vers la seance active)
  const sessionsRowRef = useRef(null);

  // Recharger depuis Supabase + localStorage quand on change de seance
  useEffect(() => {
    // D abord localStorage pour reactivite immediate
    try {
      const s = JSON.parse(localStorage.getItem(`rb_c_${activeWeek}_${activeSession}`) || "{}");
      setSessionValidee(!!s.validee);
    } catch(e) { setSessionValidee(false); }
    // Puis Supabase pour sync cross-device
    if (client?.id) {
      supabase.from("session_completions")
        .select("validated_at, chrono_seconds")
        .eq("client_id", client.id)
        .eq("week_idx", activeWeek)
        .eq("session_idx", activeSession)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.validated_at) {
            setSessionValidee(true);
            // Sync localStorage
            try {
              const ckey = `rb_c_${activeWeek}_${activeSession}`;
              const s = JSON.parse(localStorage.getItem(ckey) || "{}");
              localStorage.setItem(ckey, JSON.stringify({ ...s, validee: true, done: true, total: data.chrono_seconds || 0 }));
            } catch(e) {}
          }
        });
    }
  }, [activeWeek, activeSession, client?.id]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedRessenti, setSelectedRessenti] = useState(null);
  // Feedback structuré post-séance (cohérence avec SessionTracker — migration 056)
  const [sessionLogId, setSessionLogId] = useState(null);
  const [feedbackMood, setFeedbackMood] = useState(null);
  const [feedbackInjury, setFeedbackInjury] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [showFeedbackExtra, setShowFeedbackExtra] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const CKEY = `rb_c_${activeWeek}_${activeSession}`;
  const [chrono, setChrono] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_c_${activeWeek}_${activeSession}`) || "{}");
      if (s.done) return s.total || 0;
      if (s.start) return Math.floor((Date.now() - s.start) / 1000);
    } catch(e) {}
    return 0;
  });
  const [chronoOn, setChronoOn] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_c_${activeWeek}_${activeSession}`) || "{}");
      return !!(s.start && !s.done);
    } catch(e) { return false; }
  });
  const [chronoDone, setChronoDone] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_c_${activeWeek}_${activeSession}`) || "{}");
      return !!s.done;
    } catch(e) { return false; }
  });
  const intervalRef = useRef(null);

  // Détecte un nouveau programme : clear les complétions de séance et chrono
  // finisher en localStorage (sinon les anciennes complétions persistent par index).
  useEffect(() => {
    const progId = programme?.id || programme?.programme_id;
    if (!progId) return;
    const key = "rb_current_prog_id";
    const stored = localStorage.getItem(key);
    if (stored && stored !== String(progId)) {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith("rb_c_") || k.startsWith("rb_finisher_")) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
    }
    try { localStorage.setItem(key, String(progId)); } catch {}
  }, [programme?.id, programme?.programme_id]);

  // Un seul effet - relit le timestamp a chaque tick
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!chronoOn) return;
    intervalRef.current = setInterval(() => {
      try {
        const s = JSON.parse(localStorage.getItem(CKEY) || "{}");
        if (s.start) setChrono(Math.floor((Date.now() - s.start) / 1000));
      } catch(e) {}
    }, 1000);
    // Au retour sur l app iOS
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const s = JSON.parse(localStorage.getItem(CKEY) || "{}");
        if (s.start) setChrono(Math.floor((Date.now() - s.start) / 1000));
      } catch(e) {}
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(intervalRef.current); document.removeEventListener("visibilitychange", onVisible); };
  }, [chronoOn, CKEY]);

  // Auto-scroll la rangee horizontale des seances pour centrer la seance active
  useEffect(() => {
    const row = sessionsRowRef.current;
    if (!row) return;
    const node = row.querySelector(`[data-session-idx="${activeSession}"]`);
    if (node && typeof node.scrollIntoView === "function") {
      try { node.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); } catch(e) {}
    }
  }, [activeSession, activeWeek]);

  const startChrono = () => {
    try { localStorage.setItem(CKEY, JSON.stringify({ start: Date.now() })); } catch(e) {}
    setChrono(0); setChronoDone(false); setChronoOn(true);
    // Notifier le parent que la seance demarre (mount SeanceVivante / session_live)
    if (typeof onStartSession === "function") onStartSession(true);
  };

  const stopChrono = async (total) => {
    clearInterval(intervalRef.current);
    setChronoOn(false); setChronoDone(true);
    try { localStorage.setItem(CKEY, JSON.stringify({ done: true, total })); } catch(e) {}
    if (client?.id) {
      await supabase.from("session_completions").upsert({
        client_id: client.id, week_idx: activeWeek, session_idx: activeSession,
        chrono_seconds: total
      }, { onConflict: "client_id,week_idx,session_idx" });
    }
  };

  const fmt = (s) => String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");

  const currentWeek = programme?.weeks?.[activeWeek];
  const rawCurrentSession = currentWeek?.sessions?.[activeSession];

  // Overrides client (substitutions / reordering)
  // programmeMeta.id vient du row DB (programmes.id), c'est l'id qu'attend le hook.
  // programme.id n'existait pas (programme = HTML parsé, pas le row DB).
  const ovApi = useProgrammeOverrides({
    clientId: client?.id,
    programmeId: programmeMeta?.id || programme?.id || programme?.programme_id,
  });
  const currentSession = useMemo(
    () => ovApi.applyToSession(rawCurrentSession, activeWeek, activeSession),
    [ovApi, rawCurrentSession, activeWeek, activeSession]
  );
  const totalSessions = programme?.weeks?.reduce((a, w) => a + (w.sessions?.length || 0), 0) || 0;
  // Le compteur "done" provient EXCLUSIVEMENT des seances explicitement validees.
  const doneSessions = (programme?.weeks || []).reduce((a, w, wIdx) => {
    return a + (w.sessions || []).reduce((b, _s, sIdx) => {
      if (wIdx === activeWeek && sIdx === activeSession) return b + (sessionValidee ? 1 : 0);
      return b + (isSessionValidee(wIdx, sIdx) ? 1 : 0);
    }, 0);
  }, 0);
  const globalPct = totalSessions > 0 ? Math.min(Math.round((doneSessions / totalSessions) * 100), 100) : 0;
  const totalEx = currentSession?.exercises?.length || 0;
  const doneEx = (currentSession?.exercises || []).filter((_, ei) => (getHistory(activeWeek, activeSession, ei) || []).length > 0).length;
  const sessionPct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;

  const volumeTotal = (currentSession?.exercises || []).reduce((tot, ex, ei) => {
    const h = getHistory(activeWeek, activeSession, ei) || [];
    if (h.length === 0) return tot;
    return tot + (parseFloat(h[h.length - 1]?.weight) || 0) * (parseInt(ex.sets) || 1) * (parseInt(ex.reps) || 1);
  }, 0);

  const seriesDone = (currentSession?.exercises || []).reduce((tot, ex, ei) => {
    const h = getHistory(activeWeek, activeSession, ei) || [];
    return tot + (h.length > 0 ? parseInt(ex.sets) || 1 : 0);
  }, 0);

  const handleBilan = async () => {
    if (!client?.id) return;
    // Aucune écriture DB ici : on attend que le client choisisse son RPE
    // pour insérer session_logs. Avant, on insérait immédiatement et si le
    // user abandonnait l'étape RPE, la séance était déjà comptée → "Léo a
    // fait 2 séances" alors qu'une seule était vraiment validée.
    stopChrono(chrono);
    if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 150]);
    setShowRessenti(true);
  };

  const handleRessenti = async (idx) => {
    setSelectedRessenti(idx);
    if (!client?.id) return;

    // 1. INSERT session_logs avec RPE inclus dès l'origine (pas d'update
    //    séparé). C'est ici que la séance devient vraiment "comptée".
    let logId = sessionLogId;
    if (!logId) {
      const { data: logRow } = await supabase.from("session_logs").insert({
        client_id: client.id,
        session_name: currentSession?.name || "Seance",
        programme_name: programme?.name || "Programme",
        logged_at: new Date().toISOString(),
        rpe: idx + 1,
      }).select("id").single();
      logId = logRow?.id || null;
      setSessionLogId(logId);
    } else {
      // Cas hors-normes : RPE re-sélectionné après un 1er choix
      await supabase.from("session_logs").update({ rpe: idx + 1 }).eq("id", logId);
    }

    // 2. session_rpe (historique RPE détaillé, table à part)
    await supabase.from("session_rpe").insert({
      client_id: client.id,
      session_name: currentSession?.name,
      rpe: idx + 1,
      date: new Date().toISOString().split("T")[0],
    });

    // 3. Badges automatiques (n'allume qu'à la 1ère validation, pas à chaque
    //    re-sélection du RPE)
    if (logId && !sessionLogId) {
      const { data: logs } = await supabase
        .from("session_logs")
        .select("id")
        .eq("client_id", client.id);
      const totalDone = (logs?.length || 0);
      const badges = [];
      if (totalDone === 1) badges.push({ client_id: client.id, badge_id: "first_session", earned_at: new Date().toISOString() });
      if (totalDone === 10) badges.push({ client_id: client.id, badge_id: "ten_sessions", earned_at: new Date().toISOString() });
      if (totalDone === 50) badges.push({ client_id: client.id, badge_id: "fifty_sessions", earned_at: new Date().toISOString() });
      if (badges.length > 0) {
        await supabase.from("client_badges").upsert(badges, { onConflict: "client_id,badge_id" });
      }

      // 4. XP +40 via daily_tracking (1x par séance validée)
      const today = new Date().toISOString().split("T")[0];
      const { data: dt } = await supabase.from("daily_tracking").select("xp").eq("client_id", client.id).eq("date", today).maybeSingle();
      const currentXP = dt?.xp || 0;
      await supabase.from("daily_tracking").upsert({ client_id: client.id, date: today, xp: currentXP + 40 }, { onConflict: "client_id,date" });
    }
    // Ne pas fermer automatiquement - laisser l utilisateur voir le recap
  };

  // Submit feedback étendu (mood + injury + note) après le RPE
  const submitFeedbackExtra = async () => {
    if (!sessionLogId) { setShowFeedbackExtra(false); return; }
    setFeedbackSaving(true);
    try {
      await supabase.from("session_logs").update({
        mood: feedbackMood || null,
        injury: feedbackInjury.trim() || null,
        feedback_note: feedbackNote.trim() || null,
      }).eq("id", sessionLogId);
      // Push au coach si signal critique
      try {
        const { notifyCoachSessionFeedback } = await import("../lib/notifyCoach");
        notifyCoachSessionFeedback(client.id, { mood: feedbackMood, injury: feedbackInjury.trim() });
      } catch (e) { /* best-effort */ }
    } catch (e) {
      console.warn("[TrainingPage] feedback extra update", e);
    }
    setFeedbackSaving(false);
    setShowFeedbackExtra(false);
  };

  if (!programme || !currentWeek || !currentSession) return (
    <div style={{ minHeight: "100dvh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{t("train.no_programme")}</div>
    </div>
  );

  // Écran "Repos" si aujourd'hui n'est pas un training day OU programme pas démarré
  // (bypass via setForceShowProgramme — bouton "Voir le programme quand meme")
  if (!forceShowProgramme && (todaysSession?.type === "rest" || todaysSession?.type === "not_started" || todaysSession?.type === "finished")) {
    const isRest = todaysSession.type === "rest";
    const isNotStarted = todaysSession.type === "not_started";
    const isFinished = todaysSession.type === "finished";
    return (
      <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg, #060606 0%, #050505 60%)", color: "#fff", fontFamily: "-apple-system, Inter, sans-serif", padding: "calc(env(safe-area-inset-top, 0px) + 60px) 24px 120px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: G, letterSpacing: "4px", textTransform: "uppercase", fontWeight: 700, marginBottom: 24, opacity: 0.7 }}>
          {isRest ? "Aujourd'hui" : isNotStarted ? "Programme à venir" : "Programme terminé"}
        </div>
        {/* Pictogramme custom — design premium teal/glow, evite l'emoji OS qui detonne */}
        <div style={{ marginBottom: 28, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isRest && (
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, rgba(2,209,186,0.18), rgba(2,209,186,0.04) 60%, transparent 80%)",
              border: "1px solid rgba(2,209,186,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 60px rgba(2,209,186,0.12), inset 0 0 30px rgba(2,209,186,0.06)",
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </div>
          )}
          {isNotStarted && (
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, rgba(2,209,186,0.18), rgba(2,209,186,0.04) 60%, transparent 80%)",
              border: "1px solid rgba(2,209,186,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 60px rgba(2,209,186,0.12), inset 0 0 30px rgba(2,209,186,0.06)",
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          )}
          {isFinished && (
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, rgba(2,209,186,0.22), rgba(2,209,186,0.05) 60%, transparent 80%)",
              border: "1px solid rgba(2,209,186,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 60px rgba(2,209,186,0.18), inset 0 0 30px rgba(2,209,186,0.08)",
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" />
              </svg>
            </div>
          )}
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1.5px" }}>
          {(() => {
            // On rend les strings i18n qui contiennent {color}…{/color}
            // en injectant un span coloré autour de la portion ciblée.
            const renderColored = (raw, replacements = {}) => {
              let s = String(raw || "");
              Object.entries(replacements).forEach(([k, v]) => { s = s.split(`{${k}}`).join(String(v)); });
              const m = s.match(/^(.*?)\{color\}(.+?)\{\/color\}(.*)$/);
              if (!m) return s;
              return <>{m[1]}<span style={{ color: G }}>{m[2]}</span>{m[3]}</>;
            };
            if (isRest) return renderColored(t('train.day_rest_text'));
            if (isNotStarted) return renderColored(t(todaysSession.daysUntil > 1 ? 'train.starts_in_days_many' : 'train.starts_in_days_one'), { n: todaysSession.daysUntil });
            return renderColored(t('train.cycle_finished_text'));
          })()}
        </div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, maxWidth: 360, marginBottom: 36 }}>
          {isRest && "Profite. Hydrate-toi, mange propre, dors bien. Le corps progresse pendant le repos."}
          {isNotStarted && "Ton programme commence bientôt. Reviens à la date prévue pour démarrer."}
          {isFinished && "Tu as terminé ton cycle. Bilan avec ton coach pour la suite."}
        </div>
        {isRest && (
          <button onClick={() => {
            const next = (programme.weeks || []).flatMap((w, wi) =>
              (w.sessions || []).map((_, si) => ({ wi, si }))
            ).find(({ wi, si }) => !isSessionValidee(wi, si));
            if (next) { setActiveWeek(next.wi); setActiveSession(next.si); }
            setForceShowProgramme(true);
          }} style={{ padding: "13px 26px", borderRadius: 12, border: "1px solid rgba(2,209,186,0.25)", background: "rgba(2,209,186,0.06)", color: G, fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", cursor: "pointer" }}>
            Voir le programme quand même
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 180px)" }}>

      {/* BANNER : séances ratées */}
      {missedCount > 0 && (
        <div style={{ margin: "8px 20px 0", padding: "10px 14px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16 }}>⚠️</div>
          <div style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
            {(() => {
              const raw = missedCount === 1 ? t('train.missed_one_session') : t('train.missed_multiple').split('{n}').join(String(missedCount));
              // On met en orange le segment quantifié pour garder le visuel
              // existant. Découpe naïve sur le 1er chiffre rencontré.
              const m = raw.match(/^(.*?)(\d+\s+\S+)(.*)$/);
              if (!m) return raw;
              return <>{m[1]}<strong style={{ color: "#f97316" }}>{m[2]}</strong>{m[3]}</>;
            })()}
          </div>
        </div>
      )}

      {/* MINI-CALENDRIER HEBDO */}
      {weekStrip && (
        <div style={{ margin: "12px 20px 4px", display: "flex", justifyContent: "space-between", gap: 4 }}>
          {weekStrip.map((d, i) => {
            const labels = ["L", "M", "M", "J", "V", "S", "D"];
            const colors = {
              done: { bg: "rgba(2,209,186,0.18)", dot: G, txt: G },
              today: { bg: "rgba(2,209,186,0.06)", dot: G, txt: "#fff", ring: G },
              missed: { bg: "rgba(249,115,22,0.1)", dot: "#f97316", txt: "rgba(255,255,255,0.7)" },
              future_training: { bg: "rgba(255,255,255,0.03)", dot: "rgba(255,255,255,0.25)", txt: "rgba(255,255,255,0.45)" },
              rest: { bg: "rgba(255,255,255,0.015)", dot: "rgba(255,255,255,0.1)", txt: "rgba(255,255,255,0.25)" },
              future: { bg: "rgba(255,255,255,0.015)", dot: "rgba(255,255,255,0.06)", txt: "rgba(255,255,255,0.2)" },
            };
            const c = colors[d.status] || colors.rest;
            const isToday = d.status === "today";
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", borderRadius: 8, background: c.bg, border: isToday ? `1px solid ${c.ring}` : "1px solid transparent" }}>
                <div style={{ fontSize: 9, color: c.txt, fontWeight: 700, letterSpacing: "0.5px" }}>{labels[i]}</div>
                <div style={{ fontSize: 11, color: c.txt, fontWeight: isToday ? 800 : 500 }}>{d.date.getDate()}</div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
              </div>
            );
          })}
        </div>
      )}

      {/* HERO */}
      <div style={{ padding: "0px 20px 16px" }}>
        <div style={{ fontSize: 9, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>{t("train.programme_label")}</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.9, marginBottom: 10 }}>
          {t("train.title")}<span style={{ color: G }}>.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{programme.name}</div>
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize: 13, color: G, fontWeight: 600 }}>{t("train.week")} {activeWeek + 1}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>{t("train.this_week")}</div>
            <div style={{ fontSize: 11, color: G, fontWeight: 700 }}>
              {(currentWeek?.sessions || []).filter((_, i) => {
                // i === activeSession : utiliser sessionValidee (state React reactif)
                if (i === activeSession) return sessionValidee;
                return isSessionValidee(activeWeek, i);
              }).length}/{currentWeek?.sessions?.length || 0} {t("train.sessions_count")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {(currentWeek?.sessions || []).map((_, i) => {
              // i === activeSession : utiliser sessionValidee (state React reactif)
              // autres sessions : lire localStorage
              let seanceFaite = false;
              if (i === activeSession) {
                seanceFaite = sessionValidee;
              } else {
                try {
                  const s = JSON.parse(localStorage.getItem(`rb_c_${activeWeek}_${i}`) || "{}");
                  seanceFaite = !!s.validee;
                } catch(e) {}
              }
              const active = i === activeSession && !seanceFaite;
              return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: seanceFaite ? G : active ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.06)", transition: "background 0.6s ease" }} />;
            })}
          </div>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, marginBottom: 16 }}>
          <div style={{ height: "100%", width: globalPct + "%", background: G, borderRadius: 1, transition: "width 0.6s ease" }} />
        </div>

        {/* Chrono + Stats */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 200, color: "#fff", letterSpacing: "-1px" }}>{Math.round(volumeTotal)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>{t("train.kg")}</span></div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>{t("train.volume")}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 200, color: G, letterSpacing: "-1px" }}>{seriesDone}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>{t("train.series")}</span></div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>{t("train.completed")}</div>
            </div>
          </div>
          {chronoOn ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 100, color: "#fff", letterSpacing: "-2px" }}>
                {fmt(chrono).split(":")[0]}<span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>{fmt(chrono).split(":")[1]}
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>{t("train.chrono")}</div>
            </div>
          ) : (
            <button onClick={startChrono} style={{ background: "#02d1ba", color: "#000", border: "none", borderRadius: 100, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {t("train.start_chrono")}
            </button>
          )}
        </div>
      </div>

      {/* SEMAINES */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>{t("train.weeks_header")}</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
          {programme.weeks.map((w, i) => {
            // "Done" : seulement si toutes les seances de la semaine ont ete validees explicitement.
            const totalSes = w.sessions?.length || 0;
            const doneSes = (w.sessions || []).filter((_, sIdx) => isSessionValidee(i, sIdx)).length;
            const isDone = totalSes > 0 && doneSes === totalSes;
            const isActive = i === activeWeek;
            return (
              <div key={i} onClick={() => setActiveWeek(i)} style={{ flexShrink: 0, width: 76, padding: "14px 10px", borderRadius: 18, textAlign: "center", cursor: "pointer", background: isActive ? G_DIM : "rgba(255,255,255,0.02)", border: isActive ? `1.5px solid ${G}` : "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
                {isDone && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: G }} />}
                <div style={{ fontSize: 22, fontWeight: isActive ? 800 : 200, color: isActive ? G : isDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.5)", letterSpacing: "-1px" }}>S{i + 1}</div>
                <div style={{ fontSize: 7, color: isActive ? "rgba(2,209,186,0.6)" : "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "1px" }}>{isDone ? t("train.week_done") : isActive ? t("train.week_active") : t("train.week_upcoming")}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEANCES */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10, padding: "0 20px" }}>{t("train.sessions_header")}</div>
        <div ref={sessionsRowRef} style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", padding: "0 20px 4px" }}>
          {currentWeek.sessions.map((s, i) => {
            const isActive = i === activeSession;
            // Une seance n est marquee "DONE" QUE si validee explicitement (localStorage / Supabase),
            // jamais juste parce qu on la depasse en navigation.
            const isDone = isActive ? sessionValidee : isSessionValidee(activeWeek, i);
            const sexs = s.exercises?.length || 0;
            const doneS = (s.exercises || []).filter((_, ei) => (getHistory(activeWeek, i, ei) || []).length > 0).length;
            const pct = sexs > 0 ? Math.round((doneS / sexs) * 100) : 0;
            return (
              <div key={i} data-session-idx={i} onClick={() => setActiveSession(i)} style={{ flexShrink: 0, width: 128, padding: "16px 14px", borderRadius: 20, cursor: "pointer", background: isActive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)", border: isActive ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: 8, color: isDone ? G : isActive ? "rgba(2,209,186,0.7)" : "rgba(255,255,255,0.2)", letterSpacing: "1px", marginBottom: 8, fontWeight: 700 }}>
                  {isDone ? t("train.session_done") : isActive ? t("train.session_today") : t("train.session_upcoming")}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: isDone ? "rgba(255,255,255,0.5)" : isActive ? "#fff" : "rgba(255,255,255,0.45)", marginBottom: 3 }}>{s.name || `${t("train.session_default")} ${i + 1}`}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>{sexs} {t("train.exercises_count")}</div>
                <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
                  <div style={{ height: "100%", width: isDone ? "100%" : pct + "%", background: G, borderRadius: 1, transition: "width 0.8s ease" }} />
                </div>
              </div>
            );
          })}
          <div onClick={() => setShowOptions(true)} style={{ flexShrink: 0, width: 80, borderRadius: 20, cursor: "pointer", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 10px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.4 }}>{t("train.options")}</div>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: 1, background: `linear-gradient(90deg, rgba(2,209,186,0.4) 0%, rgba(255,255,255,0.03) 100%)`, margin: "0 20px 16px" }} />

      {/* PROGRESSION SEANCE */}
      <div style={{ padding: "0 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>{currentSession.name || t("train.session_default")}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{doneEx} <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 300 }}>/ {totalEx} {t("train.exercises_count")}</span></div>
          </div>
          <div style={{ position: "relative", width: 52, height: 52 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"/>
              <circle cx="26" cy="26" r="21" fill="none" stroke={G} strokeWidth="4" strokeLinecap="round"
                strokeDasharray="132" strokeDashoffset={132 - (132 * sessionPct / 100)} transform="rotate(-90 26 26)"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}/>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: G }}>{sessionPct}%</div>
          </div>
        </div>
      </div>

      {/* FANTOME — affiche uniquement si au moins un exercice a une trace
          de la semaine precedente. Sinon le message ment ("visible sur
          chaque exercice" alors qu'aucun n'a de fantome). */}
      {(() => {
        if (activeWeek <= 0) return null;
        const totalEx = (currentSession.exercises || []).length;
        if (totalEx === 0) return null;
        const ghostsCount = (currentSession.exercises || []).reduce((acc, _, ei) => {
          const g = getLatest(activeWeek - 1, activeSession, ei);
          return acc + (g ? 1 : 0);
        }, 0);
        if (ghostsCount === 0) return null;
        const allHave = ghostsCount === totalEx;
        return (
          <div style={{ margin: "0 20px 14px", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
              {t("train.ghost_prefix")}{activeWeek} {allHave ? t("train.ghost_all") : `${t("train.ghost_some")} ${ghostsCount}/${totalEx} ${t("train.ghost_some_suffix")}`}
            </div>
          </div>
        );
      })()}

      {/* EXERCICES */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>{t("train.exercises_header")}</div>
        {(() => {
          const exs = currentSession.exercises || [];
          // Le premier exercice "non-fait" est le seul a etre marque ACTIF.
          const firstUndoneIdx = exs.findIndex((_, ei) => (getHistory(activeWeek, activeSession, ei) || []).length === 0);
          // Rend une carte d'exercice à l'index global `ei`.
          const renderCard = (ex, ei) => {
            const history = getHistory(activeWeek, activeSession, ei) || [];
            const status = getProgressStatus(history);
            const isDone = history.length > 0;
            const ghostData = activeWeek > 0 ? getLatest(activeWeek - 1, activeSession, ei) : null;
            const bandColor = isDone ? G : status === "green" ? "rgba(2,209,186,0.5)" : status === "yellow" ? "rgba(251,191,36,0.5)" : status === "red" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)";
            const isExActive = firstUndoneIdx !== -1 && firstUndoneIdx === ei;
            return (
              <div key={ei} style={{ marginBottom: 10, opacity: isDone ? 1 : (getHistory(activeWeek, activeSession, ei - 1) || []).length > 0 || ei === 0 ? 1 : 0.4 }}>
                <ExerciseCard
                  ex={ex}
                  weekIdx={activeWeek}
                  sessionIdx={activeSession}
                  exIdx={ei}
                  globalIndex={ei}
                  getHistory={getHistory}
                  getLatest={getLatest}
                  saveLog={saveLog}
                  getDelta={getDelta}
                  nextExName={(currentSession.exercises || [])[ei + 1]?.name}
                  ghostData={ghostData}
                  bandColor={bandColor}
                  isActive={isExActive}
                />
              </div>
            );
          };
          // Regroupe les exercices A1/A2… en supersets : on les enchaîne et
          // seul le dernier porte le repos (les autres → repos masqué).
          return buildExerciseBlocks(exs).map((block, bi) => {
            if (!block.isSuperset) {
              const { ex, index } = block.members[0];
              return renderCard(ex, index);
            }
            return (
              <div key={"sset-" + bi} style={{ marginBottom: 10, border: "1px solid rgba(2,209,186,0.18)", borderRadius: 18, padding: "8px 8px 0", background: "rgba(2,209,186,0.025)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7, padding: "5px 8px 9px" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(2,209,186,0.85)" }}>
                    ⚡ {supersetTypeLabel(block.members.length)} · {block.key}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>— enchaîne sans repos</span>
                </div>
                {block.members.map(({ ex, index }, mi) =>
                  renderCard(mi === block.members.length - 1 ? ex : { ...ex, rest: "" }, index)
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* FINISHER — premium card avec chrono persistant */}
      {currentSession.finisher && currentSession.finisher.trim().length > 0 && (
        <FinisherCard
          finisher={currentSession.finisher}
          weekIdx={activeWeek}
          sessionIdx={activeSession}
          label={t("train.finisher_label")}
        />
      )}

      {/* RUNS PRESCRITS DE LA SEANCE */}
      {Array.isArray(currentSession.runs) && currentSession.runs.length > 0 && (
        <div style={{ padding: "0 20px", marginTop: 18 }}>
          <div style={{ fontSize: 9, color: "rgba(2,209,186,0.7)", letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 800, marginBottom: 10 }}>
            {t("train.cardio_label")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {currentSession.runs.map((r, ri) => (
              <div key={ri} style={{
                background: "rgba(2,209,186,0.03)",
                border: "1px solid rgba(2,209,186,0.15)",
                borderRadius: 12,
                padding: "12px 14px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{r.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  {r.distance && <span>📏 {r.distance}</span>}
                  {r.duration && <span>⏱ {r.duration}</span>}
                  {r.bpm && <span>❤️ {r.bpm} bpm</span>}
                  {r.rest && <span>⏸ {r.rest}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
            {t("train.cardio_log_hint")} <strong style={{ color: "rgba(2,209,186,0.7)" }}>{t("train.cardio_run_tab")}</strong>.
          </div>
        </div>
      )}

      {/* BOUTON TERMINER */}
      <div style={{ padding: "20px 20px 0" }}>
        <div onClick={() => !sessionValidee && setShowConfirm(true)} style={{ padding: "16px 20px", background: sessionValidee ? "rgba(2,209,186,0.05)" : G_DIM, border: `1px solid ${sessionValidee ? "rgba(2,209,186,0.15)" : G_BORDER}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: sessionValidee ? "default" : "pointer", opacity: sessionValidee ? 0.7 : 1, transition: "all 0.5s ease" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: G }}>{sessionValidee ? t("train.session_validated") : t("train.finish_session")}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{sessionValidee ? fmt(chrono) : `${doneEx}/${totalEx} · +40 XP`}</div>
        </div>
      </div>

      {/* MODAL OPTIONS */}
      <SessionOptionsModal
        open={showOptions}
        onClose={() => setShowOptions(false)}
        sessionName={currentSession?.name}
        exercises={currentSession?.exercises || []}
        weekIndex={activeWeek}
        sessionIndex={activeSession}
        ovApi={ovApi}
        onProgrammeMutated={() => { window.location.reload(); }}
      />

      {/* MODAL CONFIRMATION */}
      {showConfirm && (
        <div onClick={() => setShowConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "24px 24px 0 0", padding: "28px 20px calc(env(safe-area-inset-bottom,0px) + 28px)", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.5px" }}>{t("train.finish_session_q")}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>{doneEx}/{totalEx} {t("train.exercises_count")} · +40 XP</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer" }}>{t("train.confirm_continue")}</button>
              <button onClick={() => { setShowConfirm(false); handleBilan(); }} style={{ flex: 1, padding: 16, background: G, border: "none", borderRadius: 14, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t("train.confirm_finish")}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RPE + RECAP */}
      {showRessenti && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 0 0 0" }}>
          <div style={{ width: "100%", maxWidth: 420, background: "#0a0a0a", borderRadius: "28px 28px 0 0", padding: "32px 24px calc(env(safe-area-inset-bottom,0px) + 32px)", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }}>

            {selectedRessenti === null ? (
              /* ETAPE 1 : RPE */
              <>
                <div style={{ fontSize: 11, color: "rgba(2,209,186,0.6)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>{t("train.session_done_label")}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", marginBottom: 6 }}>{t("train.how_did_you_feel")}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>{t("train.feedback_help")}</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[
                    { num: "1", label: t("train.rpe_dur"),    color: "#ef4444" },
                    { num: "2", label: t("train.rpe_ok"),     color: "#fb923c" },
                    { num: "3", label: t("train.rpe_good"),   color: "#facc15" },
                    { num: "4", label: t("train.rpe_strong"), color: "#a3e635" },
                    { num: "5", label: t("train.rpe_top"),    color: G },
                  ].map((r, i) => (
                    <div key={i} onClick={() => handleRessenti(i)} style={{
                      flex: 1, padding: "18px 4px", borderRadius: 18, textAlign: "center", cursor: "pointer",
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = r.color + "10"; e.currentTarget.style.borderColor = r.color + "55"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                    >
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: r.color, lineHeight: 1, letterSpacing: -1 }}>{r.num}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700, marginTop: 6 }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* ETAPE 2 : RECAP PREMIUM */
              <>
                <div style={{ fontSize: 11, color: "rgba(2,209,186,0.6)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>{t("train.session_recap")}</div>

                {/* Stats principales */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 100, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>{fmt(chrono)}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6 }}>{t("train.duration_label")}</div>
                  </div>
                  <div style={{ background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 100, color: G, letterSpacing: "-1.5px", lineHeight: 1 }}>
                      {Math.round((currentSession?.exercises || []).reduce((tot, ex, ei) => {
                        const h = getHistory(activeWeek, activeSession, ei) || [];
                        if (h.length === 0) return tot;
                        return tot + (parseFloat(h[h.length-1]?.weight) || 0) * (parseInt(ex.sets)||1) * (parseInt(ex.reps)||1);
                      }, 0))}
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(2,209,186,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6 }}>{t("train.volume_kg")}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 100, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>{doneEx}/{totalEx}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6 }}>{t("train.exercises_label")}</div>
                  </div>
                </div>

                {/* ESTIMATION KCAL */}
                {(() => {
                  // Si user a oublié de démarrer le chrono, on estime la durée à partir
                  // du nombre de sets logués (≈ 2 min par set avec repos compris) + 8 min warmup.
                  const sessionsExos = currentSession?.exercises || [];
                  let setsDone = 0;
                  sessionsExos.forEach((ex, ei) => {
                    const h = getHistory(activeWeek, activeSession, ei) || [];
                    if (h.length > 0) setsDone += parseInt(ex.sets) || 1;
                  });
                  const chronoMin = Math.round(chrono / 60);
                  const estimatedFromSets = setsDone > 0 ? (8 + setsDone * 2) : 0;
                  // Si chrono < 5min, on assume "oublié de démarrer" et on prend l'estimation
                  const durationMin = chronoMin >= 5 ? chronoMin : Math.max(1, estimatedFromSets);
                  const wasEstimated = chronoMin < 5 && setsDone > 0;
                  const volume = sessionsExos.reduce((tot, ex, ei) => {
                    const h = getHistory(activeWeek, activeSession, ei) || [];
                    if (h.length === 0) return tot;
                    return tot + (parseFloat(h[h.length-1]?.weight) || 0) * (parseInt(ex.sets)||1) * (parseInt(ex.reps)||1);
                  }, 0);
                  // MET musculation : 3 (modéré) à 6 (intense). Calibré selon RPE 1-5.
                  const met = 3.5 + (selectedRessenti || 2) * 0.6;
                  // Poids client (fallback 75kg)
                  const bodyWeight = client?.weight || client?.current_weight || 75;
                  // Formule MET : kcal = MET × kg × heures (validée scientifique)
                  const kcalBase = Math.round(met * bodyWeight * (durationMin / 60));
                  // Bonus volume musculation : +1 kcal par 200 kg de volume (corrigé : était trop élevé)
                  const kcalVolume = Math.round(volume / 200);
                  const kcalTotal = kcalBase + kcalVolume;
                  return (
                    <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 18, padding: "16px 12px", textAlign: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 32, fontWeight: 100, color: "#f97316", letterSpacing: "-1.5px", lineHeight: 1 }}>{kcalTotal}</div>
                      <div style={{ fontSize: 8, color: "rgba(249,115,22,0.5)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 6 }}>{t("train.kcal_estimated")}</div>
                    </div>
                  );
                })()}

                {/* RPE + XP */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 32, fontWeight: 200, color: ["#ef4444","#fb923c","#facc15","#a3e635",G][selectedRessenti], letterSpacing: -1, lineHeight: 1 }}>{selectedRessenti + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{[t("train.rpe_difficult"), t("train.rpe_correct"), t("train.rpe_good_full"), t("train.rpe_strong_full"), t("train.rpe_top_full")][selectedRessenti]}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{t("train.feeling_label")}</div>
                    </div>
                  </div>
                  <div style={{ background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: G }}>+40</div>
                    <div style={{ fontSize: 10, color: "rgba(2,209,186,0.5)", lineHeight: 1.3 }}>{t("train.xp_gained_1")}<br/>{t("train.xp_gained_2")}</div>
                  </div>
                </div>

                {/* Message motivant */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontStyle: "italic", lineHeight: 1.5 }}>
                    {selectedRessenti >= 3 ? t("train.message_strong") : selectedRessenti === 2 ? t("train.message_correct") : t("train.message_hard")}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    // Termine direct : pas de 2e étape mood/blessure/note —
                    // l'utilisateur l'a jugée pesante. RPE suffit comme signal.
                    setShowRessenti(false);
                    setSessionValidee(true);
                    if (typeof onStartSession === "function") onStartSession(false);
                    try {
                      const ckey = `rb_c_${activeWeek}_${activeSession}`;
                      const s = JSON.parse(localStorage.getItem(ckey) || "{}");
                      localStorage.setItem(ckey, JSON.stringify({ ...s, validee: true }));
                    } catch(e) {}
                    if (client?.id) {
                      supabase.from("session_completions").upsert({
                        client_id: client.id, week_idx: activeWeek, session_idx: activeSession,
                        validated_at: new Date().toISOString(),
                        chrono_seconds: chrono,
                        rpe: selectedRessenti + 1
                      }, { onConflict: "client_id,week_idx,session_idx" });
                    }
                  }}
                  style={{ width: "100%", padding: 16, background: G, color: "#000", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.3px" }}
                >
                  {t("train.finish_check")}
                </button>
              </>
            )}
          </div>

          {/* ETAPE FEEDBACK ETENDU — retirée. RPE suffit comme signal.
             Garde-fou : si jamais showFeedbackExtra est forcé à true depuis
             ailleurs, on ne rend rien (le code overlay ci-dessous est mort). */}
          {false && showFeedbackExtra && (() => {
            const MOODS = [
              { id: "great", label: "Au top",      emoji: "✓✓" },
              { id: "good",  label: "Bien",        emoji: "✓"  },
              { id: "ok",    label: "Correct",     emoji: "—"  },
              { id: "tough", label: "Dure",        emoji: "↓"  },
              { id: "bad",   label: "Catastrophe", emoji: "✕"  },
            ];
            return (
              <div style={{ position: "absolute", inset: 0, background: "#0a0a0a", borderRadius: "28px 28px 0 0", padding: "26px 22px calc(env(safe-area-inset-bottom,0px) + 22px)", overflowY: "auto" }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "3px", color: G, textTransform: "uppercase", marginBottom: 8 }}>
                  {t('train.feedback_extra_eyebrow')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-.4px", marginBottom: 18, lineHeight: 1.2 }}>
                  {t('train.feeling_precise_q')}
                </div>

                {/* MOOD */}
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{t('train.feeling_session_label')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 18 }}>
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setFeedbackMood(feedbackMood === m.id ? null : m.id)}
                      style={{
                        padding: "10px 4px",
                        background: feedbackMood === m.id ? `${G}20` : "rgba(255,255,255,.03)",
                        border: `1px solid ${feedbackMood === m.id ? G + "60" : "rgba(255,255,255,.06)"}`,
                        borderRadius: 10,
                        color: feedbackMood === m.id ? G : "rgba(255,255,255,.55)",
                        fontFamily: "inherit", fontSize: 9, fontWeight: 700,
                        cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{m.emoji}</span>
                      <span style={{ letterSpacing: ".05em", textTransform: "uppercase" }}>{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* INJURY */}
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{t('train.injury_label')}</div>
                <input
                  type="text"
                  value={feedbackInjury}
                  onChange={(e) => setFeedbackInjury(e.target.value)}
                  placeholder={t('train.injury_placeholder')}
                  style={{
                    width: "100%", padding: "11px 14px",
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 10, color: "#fff", fontSize: 13,
                    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    marginBottom: 16,
                  }}
                />

                {/* NOTE */}
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>Note pour le coach (optionnel)</div>
                <textarea
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Comment t'es senti ? Quelque chose à signaler ?"
                  rows={3}
                  style={{
                    width: "100%", padding: "11px 14px",
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 10, color: "#fff", fontSize: 13,
                    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    resize: "none", marginBottom: 18,
                  }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      // Skip = on valide direct la séance sans feedback
                      setShowFeedbackExtra(false);
                      setShowRessenti(false);
                      setSessionValidee(true);
                      if (typeof onStartSession === "function") onStartSession(false);
                      try {
                        const ckey = `rb_c_${activeWeek}_${activeSession}`;
                        const s = JSON.parse(localStorage.getItem(ckey) || "{}");
                        localStorage.setItem(ckey, JSON.stringify({ ...s, validee: true }));
                      } catch(e) {}
                      if (client?.id) {
                        supabase.from("session_completions").upsert({
                          client_id: client.id, week_idx: activeWeek, session_idx: activeSession,
                          validated_at: new Date().toISOString(),
                          chrono_seconds: chrono,
                          rpe: selectedRessenti + 1
                        }, { onConflict: "client_id,week_idx,session_idx" });
                      }
                    }}
                    style={{
                      padding: "14px 18px",
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 12,
                      color: "rgba(255,255,255,.5)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Passer
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await submitFeedbackExtra();
                      setShowRessenti(false);
                      setSessionValidee(true);
                      if (typeof onStartSession === "function") onStartSession(false);
                      try {
                        const ckey = `rb_c_${activeWeek}_${activeSession}`;
                        const s = JSON.parse(localStorage.getItem(ckey) || "{}");
                        localStorage.setItem(ckey, JSON.stringify({ ...s, validee: true }));
                      } catch(e) {}
                      if (client?.id) {
                        supabase.from("session_completions").upsert({
                          client_id: client.id, week_idx: activeWeek, session_idx: activeSession,
                          validated_at: new Date().toISOString(),
                          chrono_seconds: chrono,
                          rpe: selectedRessenti + 1
                        }, { onConflict: "client_id,week_idx,session_idx" });
                      }
                    }}
                    disabled={feedbackSaving}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      background: G, color: "#000", border: "none",
                      borderRadius: 12, fontSize: 13, fontWeight: 800,
                      cursor: feedbackSaving ? "wait" : "pointer",
                      fontFamily: "inherit", letterSpacing: ".05em", textTransform: "uppercase",
                    }}
                  >
                    {feedbackSaving ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
