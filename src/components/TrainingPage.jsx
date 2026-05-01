import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { ExerciseCard } from "./ExerciseCard";
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

export default function TrainingPage({ client, programme, activeWeek, setActiveWeek, activeSession, setActiveSession, getHistory, getLatest, saveLog, getDelta, onStartSession }) {
  const t = useT();
  const [showRessenti, setShowRessenti] = useState(false);
  const [sessionValidee, setSessionValidee] = useState(false);
  // Helper : verifier si une seance (week, sessionIdx) est validee via localStorage
  const isSessionValidee = useCallback((wIdx, sIdx) => {
    try {
      const s = JSON.parse(localStorage.getItem(`rb_c_${wIdx}_${sIdx}`) || "{}");
      return !!s.validee;
    } catch (e) { return false; }
  }, []);
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
  const ovApi = useProgrammeOverrides({
    clientId: client?.id,
    programmeId: programme?.id || programme?.programme_id,
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
    stopChrono(chrono);

    // 1. Logger la seance
    await supabase.from("session_logs").insert({
      client_id: client.id,
      session_name: currentSession?.name || "Seance",
      programme_name: programme?.name || "Programme",
      logged_at: new Date().toISOString(),
    });

    // 2. Compter le nombre de seances completees pour les badges
    const { data: logs } = await supabase
      .from("session_logs")
      .select("id")
      .eq("client_id", client.id);
    const totalDone = (logs?.length || 0);

    // 3. Badges automatiques
    const badges = [];
    if (totalDone === 1) badges.push({ client_id: client.id, badge_id: "first_session", earned_at: new Date().toISOString() });
    if (totalDone === 10) badges.push({ client_id: client.id, badge_id: "ten_sessions", earned_at: new Date().toISOString() });
    if (totalDone === 50) badges.push({ client_id: client.id, badge_id: "fifty_sessions", earned_at: new Date().toISOString() });
    if (badges.length > 0) {
      await supabase.from("client_badges").upsert(badges, { onConflict: "client_id,badge_id" });
    }

    // 4. XP +40 via daily_tracking
    const today = new Date().toISOString().split("T")[0];
    const { data: dt } = await supabase.from("daily_tracking").select("xp").eq("client_id", client.id).eq("date", today).maybeSingle();
    const currentXP = dt?.xp || 0;
    await supabase.from("daily_tracking").upsert({ client_id: client.id, date: today, xp: currentXP + 40 }, { onConflict: "client_id,date" });

    if (navigator.vibrate) navigator.vibrate([50, 30, 100, 30, 150]);
    setShowRessenti(true);
  };

  const handleRessenti = async (idx) => {
    setSelectedRessenti(idx);
    await supabase.from("session_rpe").insert({
      client_id: client?.id,
      session_name: currentSession?.name,
      rpe: idx + 1,
      date: new Date().toISOString().split("T")[0],
    });
    // Ne pas fermer automatiquement - laisser l utilisateur voir le recap
  };

  if (!programme || !currentWeek || !currentSession) return (
    <div style={{ minHeight: "100dvh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{t("train.no_programme")}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 180px)" }}>

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
          return exs.map((ex, ei) => {
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
          });
        })()}
      </div>

      {/* FINISHER */}
      {currentSession.finisher && currentSession.finisher.trim().length > 0 && (
        <div style={{ padding: "0 20px", marginTop: 18 }}>
          <div style={{
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.18)",
            borderLeft: "3px solid rgba(239,68,68,0.6)",
            borderRadius: 14,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(239,68,68,0.85)", marginBottom: 8 }}>
              {t("train.finisher_label")}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {currentSession.finisher}
            </div>
          </div>
        </div>
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

                <button onClick={() => {
                    setShowRessenti(false);
                    setSessionValidee(true);
                    // Fermer SeanceVivante (session_live -> active=false via cleanup)
                    if (typeof onStartSession === "function") onStartSession(false);
                    // Sauvegarder dans localStorage
                    try {
                      const ckey = `rb_c_${activeWeek}_${activeSession}`;
                      const s = JSON.parse(localStorage.getItem(ckey) || "{}");
                      localStorage.setItem(ckey, JSON.stringify({ ...s, validee: true }));
                    } catch(e) {}
                    // Sauvegarder dans Supabase
                    if (client?.id) {
                      supabase.from("session_completions").upsert({
                        client_id: client.id, week_idx: activeWeek, session_idx: activeSession,
                        validated_at: new Date().toISOString(),
                        chrono_seconds: chrono,
                        rpe: selectedRessenti + 1
                      }, { onConflict: "client_id,week_idx,session_idx" });
                    }
                  }} style={{ width: "100%", padding: 16, background: G, color: "#000", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.3px" }}>
                  {t("train.finish_check")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
