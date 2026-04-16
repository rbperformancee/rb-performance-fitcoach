import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  calculateMRR,
  countActiveClients,
  calculateRetention,
  averageSubscriptionDuration,
  calculateActivityScore,
  calculateBusinessScore,
  getScoreMessage,
  getScoreColor,
  annualizedRevenue,
  clientsNeededForGoal,
  nextMilestone,
  mrrVariation,
  PLAN_MRR,
} from "../../lib/coachBusiness";
import AppIcon from "../AppIcon";
import Spinner from "../Spinner";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

const G = "#02d1ba";
const ORANGE = "#00C9A7";
const VIOLET = "#00C9A7";
const RED = "#ff6b6b";

/**
 * BusinessSection — section dediee au business du coach dans le dashboard.
 * Affiche :
 *   - MRR actuel + variation + annualized
 *   - Score business avec anneau SVG anime
 *   - Objectif mensuel editable
 *   - Retention + duree moyenne abonnements + benchmark
 *   - Prochain palier
 */
export default function BusinessSection({ coachData, clients = [] }) {
  const [goal, setGoal] = useState(coachData?.monthly_revenue_goal || 0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [history30d, setHistory30d] = useState([]);
  const [lastMonthMrr, setLastMonthMrr] = useState(null);
  const [platformBenchmark, setPlatformBenchmark] = useState(null);

  const mrr = useMemo(() => calculateMRR(clients), [clients]);
  const active = useMemo(() => countActiveClients(clients), [clients]);
  const retention = useMemo(() => calculateRetention(clients), [clients]);
  const avgDuration = useMemo(() => averageSubscriptionDuration(clients), [clients]);
  const activity = useMemo(() => calculateActivityScore(clients), [clients]);
  const score = useMemo(
    () => calculateBusinessScore({ retention, activity, mrr }),
    [retention, activity, mrr]
  );
  const scoreColor = getScoreColor(score);
  const scoreMsg = getScoreMessage(score);
  const variation = useMemo(() => mrrVariation(mrr, lastMonthMrr), [mrr, lastMonthMrr]);
  const milestone = nextMilestone(mrr);
  const clientsToMilestone = clientsNeededForGoal(mrr, milestone, clients);
  const clientsToGoal = goal > 0 ? clientsNeededForGoal(mrr, goal, clients) : 0;
  const goalPct = goal > 0 ? Math.min(100, Math.round((mrr / goal) * 100)) : 0;

  // Load historique + mois dernier + benchmark plateforme — batch parallele
  useEffect(() => {
    if (!coachData?.id) return;
    let mounted = true;
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);
    const todayStr = new Date().toISOString().split("T")[0];
    const since30Str = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    Promise.all([
      // Snapshots 30j
      supabase.from("coach_business_snapshots")
        .select("snapshot_date, business_score, mrr")
        .eq("coach_id", coachData.id).gte("snapshot_date", since30Str)
        .order("snapshot_date", { ascending: true }),
      // MRR mois dernier
      supabase.from("coach_business_snapshots")
        .select("mrr")
        .eq("coach_id", coachData.id).lte("snapshot_date", lastMonthEnd.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
      // Benchmark plateforme
      supabase.from("coach_business_snapshots")
        .select("business_score, retention_pct")
        .eq("snapshot_date", todayStr),
    ]).then(([histRes, lastMonthRes, benchRes]) => {
      if (!mounted) return;
      setHistory30d(histRes.data || []);
      if (lastMonthRes.data) setLastMonthMrr(lastMonthRes.data.mrr);
      if (benchRes.data && benchRes.data.length > 0) {
        const data = benchRes.data;
        const avgScore = Math.round(data.reduce((s, r) => s + (r.business_score || 0), 0) / data.length);
        const avgRetention = Math.round(data.reduce((s, r) => s + (r.retention_pct || 0), 0) / data.length);
        setPlatformBenchmark({ score: avgScore, retention: avgRetention });
      }
    }).catch((e) => console.warn("[BusinessSection load]", e));

    return () => { mounted = false; };
  }, [coachData?.id]);

  // Snapshot une seule fois par session (sentinel localStorage par jour)
  useEffect(() => {
    if (!coachData?.id || clients.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const sentinel = `bs_snap_${coachData.id}_${today}`;
    try { if (sessionStorage.getItem(sentinel)) return; } catch {}
    supabase.from("coach_business_snapshots").upsert({
      coach_id: coachData.id,
      snapshot_date: today,
      mrr, active_clients: active, retention_pct: retention,
      business_score: score, activity_score: activity,
    }, { onConflict: "coach_id,snapshot_date" }).then(() => {
      try { sessionStorage.setItem(sentinel, "1"); } catch {}
    });
  }, [coachData?.id, mrr, active, retention, score, activity, clients.length]);

  const saveGoal = async () => {
    const g = parseInt(newGoal);
    if (isNaN(g) || g < 0) return;
    setSavingGoal(true);
    haptic.success();
    const { error } = await supabase
      .from("coaches")
      .update({
        monthly_revenue_goal: g,
        business_goals_set_at: new Date().toISOString(),
      })
      .eq("id", coachData.id);
    setSavingGoal(false);
    if (error) {
      toast.error("Objectif non enregistre");
      return;
    }
    setGoal(g);
    setEditingGoal(false);
    setNewGoal("");
    toast.success("Objectif mis a jour");
  };

  return (
    <div style={{ marginBottom: 40, animation: "fadeUp 0.4s ease both" }}>
      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#4A4A5A", marginBottom: 8 }}>Business</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Ton business<span style={{ color: G }}>.</span></div>
      </div>

      {/* ===== HERO MRR + SCORE ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {/* MRR card */}
        <div style={{ background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 18, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.7)", fontWeight: 700, marginBottom: 8 }}>MRR du mois</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>
            {mrr.toLocaleString("fr-FR")}<span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>€</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {variation.direction !== "flat" && lastMonthMrr != null && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: variation.direction === "up" ? G : RED,
                display: "inline-flex", alignItems: "center", gap: 3,
                background: variation.direction === "up" ? "rgba(2,209,186,0.12)" : "rgba(255,107,107,0.12)",
                padding: "2px 8px", borderRadius: 100,
              }}>
                <span style={{ fontSize: 10 }}>{variation.direction === "up" ? "▲" : "▼"}</span>
                {Math.abs(variation.pct)}%
              </span>
            )}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              vs mois dernier
            </span>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Annualise : <strong style={{ color: "#fff" }}>{annualizedRevenue(mrr).toLocaleString("fr-FR")} €</strong>
          </div>
        </div>

        {/* Score business ring */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <ScoreRing score={score} color={scoreColor} size={80} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>Score business</div>
            <div style={{ fontSize: 12, color: scoreColor, fontWeight: 700, lineHeight: 1.4 }}>{scoreMsg}</div>
            {platformBenchmark && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                Plateforme : {platformBenchmark.score}/100
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== OBJECTIF MENSUEL ===== */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "18px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AppIcon name="target" size={12} color={ORANGE} />
            Objectif mensuel
          </div>
          {!editingGoal && (
            <button
              onClick={() => { haptic.light(); setEditingGoal(true); setNewGoal(String(goal || "")); }}
              style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30`, borderRadius: 10, padding: "6px 12px", color: ORANGE, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 32 }}
            >
              {goal > 0 ? "Modifier" : "Definir"}
            </button>
          )}
        </div>

        {editingGoal ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Ex: 3000"
              style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${ORANGE}40`, borderRadius: 12, color: "#fff", fontSize: 16, outline: "none", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}
            />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>€/mois</span>
            <button
              onClick={saveGoal}
              disabled={savingGoal}
              style={{ padding: "12px 18px", background: ORANGE, color: "#000", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 12, cursor: savingGoal ? "default" : "pointer", minWidth: 60, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              {savingGoal ? <Spinner variant="dots" size={14} color="#000" /> : "OK"}
            </button>
            <button
              onClick={() => { setEditingGoal(false); setNewGoal(""); }}
              style={{ padding: "12px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "inherit" }}
            >
              ✕
            </button>
          </div>
        ) : goal > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 800, color: "#fff" }}>
                {mrr.toLocaleString("fr-FR")} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>/ {goal.toLocaleString("fr-FR")} €</span>
              </div>
              <div style={{ fontSize: 13, color: goalPct >= 100 ? G : ORANGE, fontWeight: 800 }}>{goalPct}%</div>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${goalPct}%`, background: `linear-gradient(90deg, ${ORANGE}, ${G})`, borderRadius: 3, boxShadow: `0 0 12px ${ORANGE}40`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {goalPct >= 100 ? (
                <span style={{ color: G, fontWeight: 700 }}>Objectif atteint. On vise plus haut ?</span>
              ) : (
                <>Il te manque <strong style={{ color: "#fff" }}>{clientsToGoal}</strong> client{clientsToGoal > 1 ? "s" : ""} pour atteindre ton objectif.</>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Fixe-toi un objectif de revenus pour mesurer ta progression chaque mois.
            <button
              onClick={() => { haptic.light(); setEditingGoal(true); setNewGoal(""); }}
              style={{ display: "block", marginTop: 10, background: `${ORANGE}15`, border: `1px solid ${ORANGE}30`, borderRadius: 10, padding: "8px 16px", color: ORANGE, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 32 }}
            >
              + Definir mon objectif
            </button>
          </div>
        )}
      </div>

      {/* ===== RETENTION + DUREE MOYENNE + PROCHAIN PALIER ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <StatCard
          label="Retention 30j+"
          value={`${retention}%`}
          sub={platformBenchmark ? `plateforme ${platformBenchmark.retention}%` : `${active} actifs`}
          icon="trending-up"
          color={retention >= 70 ? G : retention >= 40 ? ORANGE : RED}
        />
        <StatCard
          label="Duree moyenne"
          value={avgDuration > 0 ? `${Math.round(avgDuration / 30)}m` : "—"}
          sub={avgDuration > 0 ? `${avgDuration}j` : "en cours"}
          icon="clock"
          color={VIOLET}
        />
        <StatCard
          label="Prochain palier"
          value={`${milestone.toLocaleString("fr-FR")}€`}
          sub={clientsToMilestone > 0 ? `+${clientsToMilestone} client${clientsToMilestone > 1 ? "s" : ""}` : "atteint"}
          icon="target"
          color={G}
        />
      </div>

      {/* ===== SPARKLINE HISTORIQUE SCORE 30J ===== */}
      {history30d.length >= 2 && (
        <div style={{ marginTop: 18, padding: "14px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>Evolution score 30j</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {history30d[0].business_score} → {history30d[history30d.length - 1].business_score}
            </div>
          </div>
          <MiniLine
            points={history30d.map((h, i) => ({ x: i, y: h.business_score }))}
            color={scoreColor}
            width={120}
            height={40}
          />
        </div>
      )}
    </div>
  );
}

// ===== SCORE RING anime =====
function ScoreRing({ score, color, size = 72 }) {
  const [displayed, setDisplayed] = useState(0);
  const strokeW = 6;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - displayed / 100);

  useEffect(() => {
    let raf;
    const start = Date.now();
    const anim = () => {
      const p = Math.min((Date.now() - start) / 900, 1);
      setDisplayed(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(anim);
    };
    raf = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.1s linear", filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: size * 0.32, fontWeight: 800, color }}>{displayed}</div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", fontWeight: 700, marginTop: -2 }}>/100</div>
      </div>
    </div>
  );
}

// ===== STAT CARD (petite) =====
function StatCard({ label, value, sub, icon, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>{label}</div>
        <AppIcon name={icon} size={12} color={color} />
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: color, marginTop: 4, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

// ===== MINI LINE graph =====
function MiniLine({ points, color, width = 120, height = 40 }) {
  if (!points || points.length < 2) return null;
  const values = points.map((p) => p.y);
  const min = Math.min(...values);
  const max = Math.max(...values) + 1;
  const range = max - min || 1;
  const toX = (i) => (i / (points.length - 1)) * width;
  const toY = (v) => height - ((v - min) / range) * (height - 6) - 3;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.y)}`).join(" ");
  const dArea = d + ` L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="mlGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={dArea} fill="url(#mlGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1].y)} r="3" fill={color} />
    </svg>
  );
}
