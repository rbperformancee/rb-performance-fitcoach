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
  computeForecast,
  computeNextMove,
  MOCK_BUSINESS_DATA,
} from "../../lib/coachBusiness";
import AppIcon from "../AppIcon";
import Spinner from "../Spinner";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT, getLocale } from "../../lib/i18n";

const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");
const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

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
export default function BusinessSection({ coachData, clients = [], hasSentinelAccess = false, onOpenSentinel }) {
  const t = useT();
  const [goal, setGoal] = useState(coachData?.monthly_revenue_goal || 0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [history30d, setHistory30d] = useState([]);
  const [lastMonthMrr, setLastMonthMrr] = useState(null);
  const [platformBenchmark, setPlatformBenchmark] = useState(null);
  // Plus de previewMode : si 0 client, on affiche un empty state premium (pas de mock data fake).
  const [previewMode, setPreviewMode] = useState(false);
  const [sentinelCard, setSentinelCard] = useState(null);

  // Fetch latest daily playbook card from Sentinel (for Pro/Elite/Founding)
  useEffect(() => {
    if (!hasSentinelAccess || !coachData?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("sentinel_cards")
          .select("id,title,body,data,cta_label,cta_action")
          .eq("module", "daily_playbook")
          .eq("status", "active")
          .order("priority", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && data) setSentinelCard(data);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [hasSentinelAccess, coachData?.id]);

  // Next Move + Forecast (stubs → null pour vrais users, mock pour aperçu)
  const nextMove = useMemo(() => previewMode ? MOCK_BUSINESS_DATA.nextMove : computeNextMove(clients, coachData), [clients, coachData, previewMode]);
  const forecast = useMemo(() => previewMode ? MOCK_BUSINESS_DATA.forecast : computeForecast(clients, history30d), [clients, history30d, previewMode]);

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
      toast.error(t("biz.toast_goal_save_error"));
      return;
    }
    setGoal(g);
    setEditingGoal(false);
    setNewGoal("");
    toast.success(t("biz.toast_goal_saved"));
  };

  return (
    <div style={{ marginBottom: 40, animation: "fadeUp 0.4s ease both" }}>
      {/* ===== HERO (format FuelPage) ===== */}
      <div style={{ padding: "8px 0 20px" }}>
        <div style={{ fontSize: 10, color: `${G}88`, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>{t("biz.eyebrow")}</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>{t("biz.title")}<span style={{ color: G }}>.</span></div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
          {new Date().toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* ===== EMPTY STATE PREMIUM (0 clients) — pas de fake data ===== */}
      {clients.length === 0 && (
        <div style={{
          padding: "44px 32px", textAlign: "center", marginBottom: 24,
          background: "linear-gradient(180deg, rgba(2,209,186,0.05), transparent)",
          border: "1px solid rgba(2,209,186,0.18)", borderRadius: 20,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 18px", background: "rgba(2,209,186,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#02d1ba" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: "#02d1ba", textTransform: "uppercase", marginBottom: 10 }}>Business</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5, marginBottom: 10, lineHeight: 1.15 }}>Tes vrais chiffres apparaîtront ici.</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
            MRR, score business, retention, forecast — tout se débloque automatiquement dès ton premier client. Aucune donnée fictive : seules tes vraies metriques s'affichent.
          </div>
        </div>
      )}

      {/* ===== NEXT MOVE / SENTINEL WIDGET ===== */}
      {hasSentinelAccess && sentinelCard ? (
        /* Sentinel compact card — reads from daily_playbook */
        <div
          onClick={() => { haptic.light(); onOpenSentinel?.(); }}
          style={{ borderRadius: 18, padding: "20px 22px", marginBottom: 18, background: "linear-gradient(135deg, rgba(129,140,248,0.06), rgba(2,209,186,0.04))", border: "1px solid rgba(129,140,248,0.25)", position: "relative", overflow: "hidden", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(129,140,248,0.7)" }}>{t("biz.sentinel_playbook_label")}</span>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 8 }}>{sentinelCard.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sentinelCard.body}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#818cf8" }}>
            {t("biz.sentinel_see_actions")}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>
      ) : hasSentinelAccess && !sentinelCard ? (
        /* Sentinel enabled but no card yet */
        <div style={{ borderRadius: 18, padding: "20px 22px", marginBottom: 18, background: "rgba(129,140,248,0.04)", border: "1px solid rgba(129,140,248,0.12)", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(129,140,248,0.5)" }}>{t("biz.sentinel_eyebrow")}</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{t("biz.sentinel_empty")}</div>
        </div>
      ) : (
        /* Starter: original Next Move widget (teaser) */
        <div style={{ borderRadius: 18, padding: "20px 22px", marginBottom: 18, background: nextMove ? "linear-gradient(135deg, rgba(2,209,186,0.06), rgba(139,92,246,0.04))" : "rgba(255,255,255,0.02)", border: `1px solid ${nextMove ? "rgba(2,209,186,0.25)" : "rgba(255,255,255,0.06)"}`, position: "relative", overflow: "hidden" }}>
          {previewMode && nextMove && <div style={{ position: "absolute", top: 10, right: 14, fontSize: 9, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>{t("biz.example_tag")}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill={G}/></svg>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: `${G}88` }}>{t("biz.next_action_label")}</span>
          </div>
          {nextMove ? (
            <>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 10 }}>{nextMove.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 18 }}>
                {nextMove.description?.split(/(\d+%?€?)/g).map((part, i) => /\d/.test(part) ? <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{part}</span> : part)}
              </div>
              <div className="nm-btns" style={{ display: "flex", gap: 10 }}>
                <button style={{ flex: 1, padding: "12px 16px", background: "transparent", border: `1px solid ${G}40`, borderRadius: 12, color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{nextMove.action_secondary_label}</button>
                <button style={{ flex: 1, padding: "12px 16px", background: G, border: "none", borderRadius: 12, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{nextMove.action_primary_label}</button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{t("biz.no_action_this_week")}</div>
          )}
        </div>
      )}

      {/* ===== HERO MRR + SCORE ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 18 }}>
        {/* MRR card */}
        <div style={{ background: "rgba(2,209,186,0.04)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 18, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.7)", fontWeight: 700, marginBottom: 8 }}>{t("biz.mrr_month")}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1 }}>
            {mrr.toLocaleString(intlLocale())}<span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>€</span>
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
              {t("biz.vs_last_month")}
            </span>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {t("biz.annualized")} <strong style={{ color: "#fff" }}>{annualizedRevenue(mrr).toLocaleString(intlLocale())} €</strong>
          </div>
        </div>

        {/* Score business ring */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <ScoreRing score={score} color={scoreColor} size={80} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>{t("biz.score_business")}</div>
            <div style={{ fontSize: 12, color: scoreColor, fontWeight: 700, lineHeight: 1.4 }}>{scoreMsg}</div>
            {platformBenchmark && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                {fillTpl(t("biz.platform_score"), { n: platformBenchmark.score })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== FORECAST 90 JOURS ===== */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "20px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: `${G}88` }}>{t("biz.forecast_90d")}</span>
        </div>

        {forecast ? (
          <>
            {/* SVG Graph */}
            <div style={{ width: "100%", height: window.innerWidth < 480 ? 180 : 220, position: "relative", marginBottom: 16 }}>
              <svg viewBox="0 0 400 200" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {/* P10-P90 confidence band */}
                <path d={(() => {
                  const pts = forecast.points;
                  const maxV = Math.max(...pts.map(p => p.p90));
                  const minV = Math.min(...pts.map(p => p.p10));
                  const range = maxV - minV || 1;
                  const x = (i) => (i / (pts.length - 1)) * 380 + 10;
                  const y = (v) => 190 - ((v - minV) / range) * 170;
                  const top = pts.map((p, i) => `${x(i)},${y(p.p90)}`).join(" L");
                  const bot = pts.map((p, i) => `${x(pts.length - 1 - i)},${y(pts[pts.length - 1 - i].p10)}`).join(" L");
                  return `M${top} L${bot} Z`;
                })()} fill={G} fillOpacity="0.06" />
                {/* P50 line */}
                <polyline fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={forecast.points.map((p, i) => {
                  const pts = forecast.points;
                  const maxV = Math.max(...pts.map(p => p.p90));
                  const minV = Math.min(...pts.map(p => p.p10));
                  const range = maxV - minV || 1;
                  return `${(i / (pts.length - 1)) * 380 + 10},${190 - ((p.p50 - minV) / range) * 170}`;
                }).join(" ")} />
                {/* Points */}
                {forecast.points.map((p, i) => {
                  const pts = forecast.points;
                  const maxV = Math.max(...pts.map(p => p.p90));
                  const minV = Math.min(...pts.map(p => p.p10));
                  const range = maxV - minV || 1;
                  const cx = (i / (pts.length - 1)) * 380 + 10;
                  const cy = 190 - ((p.p50 - minV) / range) * 170;
                  return <circle key={i} cx={cx} cy={cy} r="4" fill="#080C14" stroke={G} strokeWidth="2" />;
                })}
                {/* X labels */}
                {[t("biz.forecast_today_short"), t("biz.forecast_d30"), t("biz.forecast_d60"), t("biz.forecast_d90")].map((l, i) => (
                  <text key={i} x={(i / 3) * 380 + 10} y="200" fill="rgba(255,255,255,0.2)" fontSize="9" textAnchor="middle" fontFamily="Inter">{l}</text>
                ))}
              </svg>
            </div>
            {/* 3 forecast cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 14 }}>
              {forecast.points.filter(p => p.day > 0).map((p, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: G }}>{p.p50.toLocaleString(intlLocale())} €</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{fillTpl(t("biz.forecast_d_prefix"), { n: p.day })} ({p.p10.toLocaleString(intlLocale())} - {p.p90.toLocaleString(intlLocale())})</div>
                </div>
              ))}
            </div>
            {/* Scenario */}
            {forecast.scenario_text && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontStyle: "italic", lineHeight: 1.5 }}>{forecast.scenario_text}</div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>{t("biz.forecast_unavailable")}</div>
            <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, Math.round((history30d.length / 60) * 100))}%`, height: "100%", background: G, borderRadius: 2, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>{fillTpl(t("biz.forecast_progress"), { n: history30d.length })}</div>
          </div>
        )}
      </div>

      {/* ===== OBJECTIF MENSUEL ===== */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "18px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AppIcon name="target" size={12} color={ORANGE} />
            {t("biz.goal_label")}
          </div>
          {!editingGoal && (
            <button
              onClick={() => { haptic.light(); setEditingGoal(true); setNewGoal(String(goal || "")); }}
              style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30`, borderRadius: 10, padding: "6px 12px", color: ORANGE, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 32 }}
            >
              {goal > 0 ? t("biz.goal_modify") : t("biz.goal_define")}
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
              placeholder={t("biz.goal_input_placeholder")}
              style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${ORANGE}40`, borderRadius: 12, color: "#fff", fontSize: 16, outline: "none", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}
            />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{t("biz.goal_per_month")}</span>
            <button
              onClick={saveGoal}
              disabled={savingGoal}
              style={{ padding: "12px 18px", background: ORANGE, color: "#000", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 12, cursor: savingGoal ? "default" : "pointer", minWidth: 60, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              {savingGoal ? <Spinner variant="dots" size={14} color="#000" /> : t("biz.goal_save")}
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
                {mrr.toLocaleString(intlLocale())} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>/ {goal.toLocaleString(intlLocale())} €</span>
              </div>
              <div style={{ fontSize: 13, color: goalPct >= 100 ? G : ORANGE, fontWeight: 800 }}>{goalPct}%</div>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${goalPct}%`, background: `linear-gradient(90deg, ${ORANGE}, ${G})`, borderRadius: 3, boxShadow: `0 0 12px ${ORANGE}40`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {goalPct >= 100 ? (
                <span style={{ color: G, fontWeight: 700 }}>{t("biz.goal_reached")}</span>
              ) : (
                fillTpl(clientsToGoal > 1 ? t("biz.goal_clients_to_many") : t("biz.goal_clients_to_one"), { n: clientsToGoal })
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            {t("biz.goal_intro")}
            <button
              onClick={() => { haptic.light(); setEditingGoal(true); setNewGoal(""); }}
              style={{ display: "block", marginTop: 10, background: `${ORANGE}15`, border: `1px solid ${ORANGE}30`, borderRadius: 10, padding: "8px 16px", color: ORANGE, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 32 }}
            >
              {t("biz.goal_define_btn")}
            </button>
          </div>
        )}
      </div>

      {/* ===== RETENTION + DUREE MOYENNE + PROCHAIN PALIER ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <StatCard
          label={t("biz.retention_30d")}
          value={`${retention}%`}
          sub={platformBenchmark ? fillTpl(t("biz.platform_pct"), { n: platformBenchmark.retention }) : fillTpl(t("biz.actives"), { n: active })}
          icon="trending-up"
          color={retention >= 70 ? G : retention >= 40 ? ORANGE : RED}
        />
        <StatCard
          label={t("biz.avg_duration")}
          value={avgDuration > 0 ? `${Math.round(avgDuration / 30)}m` : "—"}
          sub={avgDuration > 0 ? fillTpl(t("biz.duration_days"), { n: avgDuration }) : t("biz.duration_running")}
          icon="clock"
          color={VIOLET}
        />
        <StatCard
          label={t("biz.next_milestone")}
          value={`${milestone.toLocaleString(intlLocale())}€`}
          sub={clientsToMilestone > 0 ? fillTpl(clientsToMilestone > 1 ? t("biz.add_clients_many") : t("biz.add_clients_one"), { n: clientsToMilestone }) : t("biz.milestone_reached")}
          icon="target"
          color={G}
        />
      </div>

      {/* ===== SPARKLINE HISTORIQUE SCORE 30J ===== */}
      {history30d.length >= 2 && (
        <div style={{ marginTop: 18, padding: "14px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4 }}>{t("biz.score_evolution_30d")}</div>
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
