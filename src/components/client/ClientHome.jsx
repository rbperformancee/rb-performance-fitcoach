import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

/**
 * ClientHome — accueil client: greeting, card programme, 3 stats,
 * objectifs nutrition, activite recente.
 */
export default function ClientHome({ client, coach, accent, onTabChange }) {
  const [programme, setProgramme] = useState(null);
  const [sessions, setSessions]   = useState([]);
  const [measurements, setMeasurements] = useState([]);

  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const [progRes, sessRes, measRes] = await Promise.all([
          supabase.from("programmes")
            .select("id, programme_name, uploaded_at")
            .eq("client_id", client.id)
            .eq("is_active", true)
            .order("uploaded_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("sessions")
            .select("id, seance_nom, started_at, duration_minutes, rpe_moyen")
            .eq("client_id", client.id)
            .order("started_at", { ascending: false })
            .limit(5),
          supabase.from("client_measurements")
            .select("weight_kg, measured_at")
            .eq("client_id", client.id)
            .order("measured_at", { ascending: false })
            .limit(30),
        ]);

        if (cancelled) return;
        setProgramme(progRes.data || null);
        setSessions(sessRes.data || []);
        setMeasurements(measRes.data || []);
      } catch (_) {}
    })();

    return () => { cancelled = true; };
  }, [client?.id]);

  const firstName = (client?.full_name || "").split(" ")[0] || "";
  const coachName = coach?.coaching_name || coach?.full_name || "Ton coach";
  const coachInitials = (coach?.full_name || coachName || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  // Stats rapides
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const thisWeek = sessions.filter((s) => new Date(s.started_at) >= weekStart).length;

    // Streak: compte de jours consecutifs (simpliste — base sur days uniques)
    const days = [...new Set(sessions.map((s) => new Date(s.started_at).toDateString()))];
    let streak = 0;
    const today = new Date().toDateString();
    if (days.includes(today)) streak = 1;
    // Simple approximation: comptte les jours recents consecutifs
    for (let i = 1; i < 30; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      if (days.includes(d.toDateString())) streak++;
      else break;
    }

    return {
      thisWeek,
      goal: 3, // defaut, pourra venir de la config coach
      streak,
      coachScore: Math.min(100, 60 + thisWeek * 10 + streak * 2),
    };
  }, [sessions]);

  return (
    <div style={{ padding: "32px 20px 20px" }}>
      {/* ===== HEADER ===== */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 10 }}>
            Bonjour
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff", lineHeight: 1 }}>
            {firstName || "Champion"}<span style={{ color: accent }}>.</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 6 }}>
            Suivi par <span style={{ color: "rgba(255,255,255,.6)", fontWeight: 500 }}>{coachName}</span>
          </div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(2,209,186,.1)", border: `.5px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 900, color: accent, flexShrink: 0 }}>
          {coachInitials}
        </div>
      </div>

      {/* ===== CARTE PROGRAMME ACTIF ===== */}
      {programme && (
        <div style={{ padding: "20px 22px", background: "rgba(2,209,186,.04)", border: `.5px solid ${accent}25`, borderRadius: 16, marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }} />
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>
            Programme actif
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-.3px" }}>
            {programme.programme_name || "Sans nom"}
          </div>
          <button
            onClick={() => onTabChange?.("prog")}
            style={{ width: "100%", padding: "12px 16px", background: accent, color: "#000", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: `0 10px 26px ${accent}30` }}
          >
            Demarrer la seance →
          </button>
        </div>
      )}

      {/* ===== STATS RAPIDES ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        <Stat label="Seances" value={`${stats.thisWeek}/${stats.goal}`} accent={accent} />
        <Stat label="Streak" value={`${stats.streak}j`} icon="🔥" accent="#f97316" />
        <Stat label="Score" value={`${stats.coachScore}`} suffix="/100" accent={accent} />
      </div>

      {/* ===== OBJECTIFS NUTRITION ===== */}
      <div style={{ padding: "18px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 12 }}>
          Objectifs du jour
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GoalBar label="Calories" value={1847} target={2200} color={accent} />
          <GoalBar label="Proteines" value={142} target={150} color={accent} unit="g" />
          <GoalBar label="Eau" value={1.85} target={3.0} color="#60a5fa" unit="L" />
        </div>
      </div>

      {/* ===== ACTIVITE RECENTE ===== */}
      <div style={{ padding: "18px 20px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 14 }}>
          Activite recente
        </div>
        {sessions.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textAlign: "center", padding: 12 }}>
            Aucune seance pour le moment.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {sessions.slice(0, 3).map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 2 ? ".5px solid rgba(255,255,255,.04)" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.seance_nom || "Seance"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 1 }}>
                    {relTime(s.started_at)}
                    {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                    {s.rpe_moyen ? ` · RPE ${Number(s.rpe_moyen).toFixed(1)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, icon, accent }) {
  return (
    <div style={{ padding: "14px 12px", background: "rgba(255,255,255,.02)", border: ".5px solid rgba(255,255,255,.06)", borderRadius: 12, textAlign: "center" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 200, color: accent, letterSpacing: "-1px", lineHeight: 1 }}>
        {icon && <span style={{ marginRight: 4, fontSize: 16 }}>{icon}</span>}
        {value}
        {suffix && <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

function GoalBar({ label, value, target, color, unit = "" }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(255,255,255,.4)" }}>
          <b style={{ color: "#fff", fontWeight: 500 }}>{value}{unit}</b> / {target}{unit}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 100, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return "a l'instant";
  if (diff < 3600)   return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}
