import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

const G = "#02d1ba";

/**
 * ActivityFeedToday — feed unifié des events clients dans les dernières 24h.
 *
 * Sources mergées :
 *   - session_logs (séance terminée + signal mood/injury)
 *   - coach_activity_log activity_type='client_pr' (PR battu)
 *   - weekly_checkins (bilan hebdo soumis cette semaine)
 *   - habit_logs (habitudes cochées aujourd'hui)
 *
 * Chaque event a : timestamp, type, clientName, summary, color.
 * Affichés en timeline, plus récent en haut. Top 15.
 *
 * Realtime : 4 subscriptions (postgres_changes) refetch sur INSERT.
 *
 * Props:
 *   coachId: uuid
 *   clientsById: Map<id, name>  (déjà loadé par le dashboard)
 */
export default function ActivityFeedToday({ coachId, clientsById }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!coachId || !clientsById || clientsById.size === 0) {
      setLoading(false);
      setEvents([]);
      return;
    }
    const ids = Array.from(clientsById.keys());
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);
    // Lundi semaine en cours pour les checkins
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    const weekStart = d.toISOString().slice(0, 10);

    const [sessions, prs, checkins, habitLogs] = await Promise.all([
      supabase.from("session_logs")
        .select("client_id, session_name, logged_at, mood, injury, rpe")
        .in("client_id", ids)
        .gte("logged_at", since24h)
        .order("logged_at", { ascending: false }),
      supabase.from("coach_activity_log")
        .select("client_id, details, created_at, activity_type")
        .eq("coach_id", coachId)
        .gte("created_at", since24h)
        .order("created_at", { ascending: false }),
      supabase.from("weekly_checkins")
        .select("client_id, submitted_at, note, week_start")
        .in("client_id", ids)
        .eq("week_start", weekStart)
        .order("submitted_at", { ascending: false }),
      supabase.from("habit_logs")
        .select("client_id, logged_at, habit_id, habits!inner(name)")
        .in("client_id", ids)
        .eq("date", today)
        .order("logged_at", { ascending: false })
        .limit(30),
    ]);

    const merged = [];
    (sessions.data || []).forEach((s) => {
      const clientName = clientsById.get(s.client_id) || "Client";
      const isSignal = s.mood === "tough" || s.mood === "bad" || s.injury;
      if (isSignal) {
        const reasons = [];
        if (s.mood === "bad") reasons.push("séance catastrophe");
        else if (s.mood === "tough") reasons.push("séance dure");
        if (s.injury) reasons.push(`douleur ${s.injury}`);
        merged.push({
          ts: s.logged_at,
          type: "signal",
          color: "#ef4444",
          label: "Signal",
          clientName,
          summary: `${reasons.join(" · ")}${s.rpe ? ` (RPE ${s.rpe})` : ""}`,
        });
      } else {
        merged.push({
          ts: s.logged_at,
          type: "session",
          color: G,
          label: "Séance",
          clientName,
          summary: `${s.session_name || "Séance"}${s.rpe ? ` · RPE ${s.rpe}` : ""}`,
        });
      }
    });
    (prs.data || []).filter((a) => a.activity_type === "client_pr").forEach((a) => {
      const clientName = clientsById.get(a.client_id) || "Client";
      merged.push({
        ts: a.created_at,
        type: "pr",
        color: "#fbbf24",
        label: "Record",
        clientName,
        summary: a.details || "Record battu",
      });
    });
    (checkins.data || []).forEach((c) => {
      const clientName = clientsById.get(c.client_id) || "Client";
      merged.push({
        ts: c.submitted_at,
        type: "checkin",
        color: "#a78bfa",
        label: "Bilan",
        clientName,
        summary: c.note ? `Bilan + note : « ${c.note.slice(0, 80)}${c.note.length > 80 ? "…" : ""} »` : "Bilan hebdo soumis",
      });
    });
    // Habits : on agrège par client (X habitudes cochées par Y)
    const habitsByClient = new Map();
    (habitLogs.data || []).forEach((h) => {
      const arr = habitsByClient.get(h.client_id) || [];
      arr.push(h);
      habitsByClient.set(h.client_id, arr);
    });
    habitsByClient.forEach((logs, clientId) => {
      const clientName = clientsById.get(clientId) || "Client";
      const latest = logs[0];
      merged.push({
        ts: latest.logged_at,
        type: "habits",
        color: "#34d399",
        label: "Habits",
        clientName,
        summary: `${logs.length} habitude${logs.length > 1 ? "s" : ""} cochée${logs.length > 1 ? "s" : ""} aujourd'hui`,
      });
    });

    merged.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    setEvents(merged.slice(0, 15));
    setLoading(false);
  }, [coachId, clientsById]);

  useEffect(() => { refetch(); }, [refetch]);

  // Realtime : refetch on any insert in les 4 sources
  useEffect(() => {
    if (!coachId) return;
    const ch = supabase.channel(`activity-feed-${coachId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_logs" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "coach_activity_log" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "weekly_checkins" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "habit_logs" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coachId, refetch]);

  if (loading || events.length === 0) return null;

  return (
    <div style={{ margin: "0 24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
          Aujourd'hui
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: G, animation: "pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 9, color: G, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Live</span>
        </div>
      </div>
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        {events.map((e, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 4px",
            borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: e.color, flexShrink: 0, boxShadow: i === 0 ? `0 0 6px ${e.color}` : "none" }} />
            <div style={{
              padding: "1px 7px",
              background: `${e.color}15`,
              border: `1px solid ${e.color}30`,
              borderRadius: 5,
              fontSize: 8, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase",
              color: e.color, flexShrink: 0,
            }}>
              {e.label}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.clientName}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.4, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.summary}
              </div>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
              {timeAgo(e.ts)}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}

function timeAgo(ts) {
  const diff = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}j`;
}
