import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";
import { useT, getLocale } from "../lib/i18n";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const intlLocale = () => getLocale() === "en" ? "en-US" : "fr-FR";

// ===== CHARTE CEO : noir absolu + blanc ivoire + accents sobres =====
const BLUE = "#818cf8";
const BLUE_DIM = "rgba(129,140,248,0.08)";
const BLUE_BORDER = "rgba(129,140,248,0.2)";
const IVORY = "#f0ece4";
const CEO_FONT = "'Bebas Neue','DM Sans',-apple-system,sans-serif";
const BODY_FONT = "'DM Sans',-apple-system,Inter,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',monospace";
const G = "#02d1ba";
const RED = "#ef4444";
const ORANGE = "#f97316";
const AMBER = "#fbbf24";
const VIOLET = "#a78bfa";
const PLAN_PRICES = { "3m": 120, "6m": 110, "12m": 100 };

// ───────────────────────────────────────────────────────────────────────────
//  Primitives
// ───────────────────────────────────────────────────────────────────────────

function Ic({ name, size = 18, color = "currentColor" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const m = {
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    trending: <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    alert: <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    check: <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    flame: <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
    message: <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    "arrow-left": <svg {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    "arrow-right": <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    lightning: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    pulse: <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    activity: <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    crown: <svg {...p}><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14" /></svg>,
    bell: <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    dollar: <svg {...p}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    cpu: <svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="2" x2="9" y2="4" /><line x1="15" y1="2" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="22" /><line x1="15" y1="20" x2="15" y2="22" /><line x1="20" y1="9" x2="22" y2="9" /><line x1="20" y1="14" x2="22" y2="14" /><line x1="2" y1="9" x2="4" y2="9" /><line x1="2" y1="14" x2="4" y2="14" /></svg>,
    radio: <svg {...p}><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  };
  return m[name] || null;
}

// Compteur animé easeOutCubic — financial-terminal feel
function AnimNum({ value, suffix = "", duration = 900 }) {
  const [d, setD] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const t = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
    if (!t) { setD(0); return; }
    const s = Date.now();
    const a = () => { const p = Math.min((Date.now() - s) / duration, 1); setD(Math.round(t * (1 - Math.pow(1 - p, 3)))); if (p < 1) ref.current = requestAnimationFrame(a); };
    ref.current = requestAnimationFrame(a);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{d.toLocaleString()}{suffix}</span>;
}

// Horloge live HH:MM (UTC + offset local)
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(t.getHours()).padStart(2, "0")}:{String(t.getMinutes()).padStart(2, "0")}</span>;
}

// Ring de score 0-100 — rouge / orange / vert
function Ring({ score, size = 48 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  const c = score >= 70 ? G : score >= 40 ? ORANGE : RED;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: size * 0.26, fontWeight: 700, color: c }}>{score}</div>
    </div>
  );
}

// Sparkline path — line chart minuscule sans axes
// data = array of numbers. Rendu en SVG, taille flexible.
function Sparkline({ data, width = 120, height = 32, color = BLUE, fill = true, dot = true }) {
  if (!data || data.length < 2) return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: MONO }}>—</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`);
  const path = "M" + pts.join(" L");
  const area = fill ? `${path} L${width},${height} L0,${height} Z` : null;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  const gradId = `spkg-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={area} fill={`url(#${gradId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {dot && (
        <>
          <circle cx={width} cy={lastY} r="4" fill={color} opacity={0.18} />
          <circle cx={width} cy={lastY} r="2" fill={color} />
        </>
      )}
    </svg>
  );
}

// Bar chart minuscule (utilisé pour daily activity)
function MicroBars({ data, width = 120, height = 32, color = BLUE }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const barW = width / data.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 2);
        return <rect key={i} x={i * barW + 0.5} y={height - h} width={Math.max(1, barW - 1)} height={h || 1} fill={color} opacity={v === 0 ? 0.06 : 0.7 + (v / max) * 0.3} rx="0.5" />;
      })}
    </svg>
  );
}

// Donut chart — segments arc-de-cercle, taille flexible, légende externe.
// data = [{value, color, label}]. Centre vide pour overlay.
function Donut({ data, size = 120, thickness = 16 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: "50%", border: `${thickness}px solid rgba(255,255,255,0.04)`, boxSizing: "border-box" }} />;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const portion = d.value / total;
        const dash = portion * circ;
        const seg = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        );
        offset += dash;
        return seg;
      })}
    </svg>
  );
}

// HeatCell — case unique d'une heatmap, couleur graduée par intensité [0..1]
function HeatCell({ value, max, color, size = 14, gap = 2 }) {
  const v = max === 0 ? 0 : value / max;
  return (
    <div title={String(value)} style={{
      width: size, height: size, borderRadius: 2,
      background: value === 0 ? "rgba(255,255,255,0.035)" : color,
      opacity: value === 0 ? 1 : 0.18 + v * 0.82,
      marginRight: gap, marginBottom: gap,
      flexShrink: 0,
      transition: "opacity 0.4s ease",
    }} />
  );
}

// Delta % vs période précédente (vert si positif, rouge sinon)
function Delta({ current, previous, suffix = "%" }) {
  if (previous === 0 || previous == null) return <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: MONO, fontSize: 10 }}>—</span>;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (pct === 0) return <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: MONO, fontSize: 10 }}>±0{suffix}</span>;
  const c = pct > 0 ? G : RED;
  return <span style={{ color: c, fontFamily: MONO, fontSize: 10, fontWeight: 700 }}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}{suffix}</span>;
}

// Bucketise des logs sur N jours (date string YYYY-MM-DD ou ISO timestamp)
function bucketDaily(logs, dateField, days = 30) {
  const buckets = Array(days).fill(0).map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d.toISOString().split("T")[0], count: 0, ids: new Set() };
  });
  const idx = Object.fromEntries(buckets.map((b, i) => [b.date, i]));
  for (const log of logs) {
    const raw = log[dateField];
    if (!raw) continue;
    const d = String(raw).split("T")[0];
    if (idx[d] != null) {
      buckets[idx[d]].count++;
      if (log.client_id) buckets[idx[d]].ids.add(log.client_id);
    }
  }
  return buckets;
}

// Format relative time (il y a 2 min)
function rel(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "à l'instant";
  if (diff < 3600000) return Math.floor(diff / 60000) + "min";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  return Math.floor(diff / 86400000) + "j";
}

// ───────────────────────────────────────────────────────────────────────────
//  Main component
// ───────────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard({ onSwitchToCoach, onExit }) {
  const t = useT();
  const [coaches, setCoaches] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [runLogs, setRunLogs] = useState([]);
  const [dailyTracking, setDailyTracking] = useState([]);
  const [pushSubs, setPushSubs] = useState([]);
  const [notifLogs, setNotifLogs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailView, setDetailView] = useState(null);
  const [expandedCoach, setExpandedCoach] = useState(null);
  const [mrrGoal, setMrrGoal] = useState(() => parseInt(localStorage.getItem("ceo_mrr_goal") || "5000"));
  const [showBroadcast, setShowBroadcast] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const ago30d = ago30.split("T")[0];
    const ago90d = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

    const [c, cl, pr, sl, nl, el, wl, rl, dt, ps, nlogs, pay] = await Promise.all([
      supabase.from("coaches").select("*").order("created_at"),
      supabase.from("clients").select("id,email,full_name,coach_id,subscription_plan,subscription_status,subscription_start_date,subscription_end_date,onboarding_done,created_at,last_seen_at,avatar_url"),
      supabase.from("programmes").select("id,client_id,is_active,uploaded_at"),
      supabase.from("session_logs").select("client_id,session_name,programme_name,logged_at").gte("logged_at", ago30),
      supabase.from("nutrition_logs").select("client_id,date,calories,aliment,logged_at").gte("date", ago30d),
      supabase.from("exercise_logs").select("client_id,date,logged_at,weight").gte("date", ago30d),
      supabase.from("weight_logs").select("client_id,date,weight").gte("date", ago30d),
      supabase.from("run_logs").select("client_id,date,distance_km").gte("date", ago30d),
      supabase.from("daily_tracking").select("client_id,date,pas,sommeil_h,eau_ml").gte("date", ago30d),
      supabase.from("push_subscriptions").select("id,client_id"),
      supabase.from("notification_logs").select("type,sent_date,created_at").gte("sent_date", ago30d),
      supabase.from("client_payments").select("client_id,coach_id,amount_eur,received_date,void").gte("received_date", ago90d),
    ]);
    setCoaches(c.data || []);
    setAllClients(cl.data || []);
    setProgrammes(pr.data || []);
    setSessionLogs(sl.data || []);
    setNutritionLogs(nl.data || []);
    setExerciseLogs(el.data || []);
    setWeightLogs(wl.data || []);
    setRunLogs(rl.data || []);
    setDailyTracking(dt.data || []);
    setPushSubs(ps.data || []);
    setNotifLogs(nlogs.data || []);
    setPayments(pay.data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleCoach = async (coach) => {
    await supabase.from("coaches").update({ is_active: !coach.is_active }).eq("id", coach.id);
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: !c.is_active } : c));
  };

  // ===== METRIQUES PRIMAIRES =====
  const active = coaches.filter(c => c.is_active);
  const total = allClients.length;
  const subs = allClients.filter(c => c.subscription_status === "active" && c.subscription_plan);
  const mrr = subs.reduce((s, c) => s + (PLAN_PRICES[c.subscription_plan] || 0), 0);
  const arr = mrr * 12;
  const onb = allClients.filter(c => c.onboarding_done);
  const ret = onb.length > 0 ? Math.round((subs.length / onb.length) * 100) : 0;
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const today = new Date().toISOString().split("T")[0];
  const newCl30 = allClients.filter(c => new Date(c.created_at) >= d30).length;
  const newToday = allClients.filter(c => c.created_at?.startsWith(today)).length;
  const mrrPct = Math.min(100, Math.round((mrr / mrrGoal) * 100));
  const avgPerCoach = active.length > 0 ? Math.round(mrr / active.length) : 0;

  // ===== ENRICHISSEMENT COACHS =====
  const enriched = useMemo(() => coaches.map(coach => {
    const cls = allClients.filter(c => c.coach_id === coach.id);
    const act = cls.filter(c => c.subscription_status === "active" && c.subscription_plan);
    const cMrr = act.reduce((s, c) => s + (PLAN_PRICES[c.subscription_plan] || 0), 0);
    const cOnb = cls.filter(c => c.onboarding_done);
    const cRet = cOnb.length > 0 ? Math.round((act.length / cOnb.length) * 100) : 0;
    const actS = cls.length > 0 ? Math.min(40, Math.round((act.length / cls.length) * 40)) : 0;
    const retS = Math.min(30, Math.round((cRet / 100) * 30));
    const mrrS = Math.min(30, Math.round(Math.min(cMrr / 500, 1) * 30));
    const health = actS + retS + mrrS;
    const months = Math.max(1, Math.round((Date.now() - new Date(coach.created_at).getTime()) / (30 * 86400000)));
    const progs = programmes.filter(p => cls.some(c => c.id === p.client_id)).length;
    const cIds = new Set(cls.map(c => c.id));
    const cSessions = sessionLogs.filter(s => cIds.has(s.client_id)).length;
    const cPayments30 = payments.filter(p => !p.void && p.coach_id === coach.id && new Date(p.received_date) > new Date(Date.now() - 30 * 86400000)).reduce((s, p) => s + parseFloat(p.amount_eur || 0), 0);
    return { ...coach, _cls: cls, _act: act.length, _mrr: cMrr, _ret: cRet, _health: health, _ltv: cMrr * months, _total: cls.length, _progs: progs, _months: months, _sessions: cSessions, _paid30: cPayments30 };
  }).sort((a, b) => b._mrr - a._mrr), [coaches, allClients, programmes, sessionLogs, payments]);

  const churn = enriched.filter(c => c._health < 40 && c._total > 0);
  const bestCoach = enriched.length > 0 ? enriched.reduce((b, c) => c._health > b._health ? c : b, enriched[0]) : null;

  // ===== ENGAGEMENT PULSE — buckets quotidiens 30j =====
  const pulse = useMemo(() => {
    const sessions = bucketDaily(sessionLogs, "logged_at");
    const meals = bucketDaily(nutritionLogs, "date");
    const weights = bucketDaily(weightLogs, "date");
    // DAU = unique client_ids actifs par jour (toutes activités confondues)
    const allActivity = [
      ...sessionLogs.map(l => ({ date: String(l.logged_at).split("T")[0], client_id: l.client_id })),
      ...exerciseLogs.map(l => ({ date: String(l.date).split("T")[0], client_id: l.client_id })),
      ...nutritionLogs.map(l => ({ date: String(l.date).split("T")[0], client_id: l.client_id })),
      ...weightLogs.map(l => ({ date: String(l.date).split("T")[0], client_id: l.client_id })),
      ...runLogs.map(l => ({ date: String(l.date).split("T")[0], client_id: l.client_id })),
      ...dailyTracking.map(l => ({ date: String(l.date).split("T")[0], client_id: l.client_id })),
    ];
    const dauBuckets = bucketDaily(allActivity, "date");
    const dau = dauBuckets.map(b => ({ ...b, count: b.ids.size }));
    return { sessions, meals, weights, dau };
  }, [sessionLogs, nutritionLogs, weightLogs, exerciseLogs, runLogs, dailyTracking]);

  // Sums for last 7d vs prev 7d
  const sumLast = (buckets, days) => buckets.slice(-days).reduce((s, b) => s + b.count, 0);
  const sessions7 = sumLast(pulse.sessions, 7);
  const sessions7prev = sumLast(pulse.sessions, 14) - sessions7;
  const meals7 = sumLast(pulse.meals, 7);
  const meals7prev = sumLast(pulse.meals, 14) - meals7;
  const weights7 = sumLast(pulse.weights, 7);
  const weights7prev = sumLast(pulse.weights, 14) - weights7;
  const dauToday = pulse.dau[pulse.dau.length - 1]?.count || 0;
  const dauAvg7 = Math.round(pulse.dau.slice(-7).reduce((s, b) => s + b.count, 0) / 7);
  const dauAvg7prev = Math.round(pulse.dau.slice(-14, -7).reduce((s, b) => s + b.count, 0) / 7);

  // ===== MRR TRAJECTORY (revenue daily 30d depuis client_payments) =====
  const mrrTrajectory = useMemo(() => {
    const buckets = Array(30).fill(0).map((_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (29 - i));
      return { date: d.toISOString().split("T")[0], amount: 0 };
    });
    const idx = Object.fromEntries(buckets.map((b, i) => [b.date, i]));
    payments.forEach(p => {
      if (p.void) return;
      const d = String(p.received_date).split("T")[0];
      if (idx[d] != null) buckets[idx[d]].amount += parseFloat(p.amount_eur || 0);
    });
    return buckets;
  }, [payments]);
  const revenue30dActual = payments.filter(p => !p.void && new Date(p.received_date) > new Date(Date.now() - 30 * 86400000)).reduce((s, p) => s + parseFloat(p.amount_eur || 0), 0);

  // ===== LIVE ACTIVITY TICKER (events from last 48h, sorted desc) =====
  const liveEvents = useMemo(() => {
    const evs = [];
    const ago48 = Date.now() - 48 * 3600000;
    const clientName = (cid) => {
      const c = allClients.find(x => x.id === cid);
      return c?.full_name?.split(" ")[0] || c?.email?.split("@")[0] || "?";
    };
    sessionLogs.forEach(s => {
      const ts = new Date(s.logged_at).getTime();
      if (ts > ago48) evs.push({ ts, type: "session", color: BLUE, label: clientName(s.client_id), detail: s.session_name || s.programme_name || "Séance" });
    });
    nutritionLogs.forEach(n => {
      const ts = new Date(n.logged_at || n.date).getTime();
      if (ts > ago48) evs.push({ ts, type: "meal", color: ORANGE, label: clientName(n.client_id), detail: n.aliment || "Repas" });
    });
    weightLogs.forEach(w => {
      const ts = new Date(w.date).getTime();
      if (ts > ago48) evs.push({ ts, type: "weight", color: VIOLET, label: clientName(w.client_id), detail: `${w.weight}kg` });
    });
    runLogs.forEach(r => {
      const ts = new Date(r.date).getTime();
      if (ts > ago48) evs.push({ ts, type: "run", color: RED, label: clientName(r.client_id), detail: `${r.distance_km}km` });
    });
    allClients.forEach(c => {
      const ts = new Date(c.created_at).getTime();
      if (ts > ago48) evs.push({ ts, type: "signup", color: G, label: c.full_name?.split(" ")[0] || "?", detail: "Nouveau client" });
    });
    payments.forEach(p => {
      if (p.void) return;
      const ts = new Date(p.received_date).getTime();
      if (ts > ago48) evs.push({ ts, type: "payment", color: AMBER, label: clientName(p.client_id), detail: `+${parseFloat(p.amount_eur || 0).toFixed(0)}€` });
    });
    evs.sort((a, b) => b.ts - a.ts);
    return evs.slice(0, 24);
  }, [sessionLogs, nutritionLogs, weightLogs, runLogs, allClients, payments]);

  // ===== TOP CLIENTS PAR ACTIVITE (last 30d) =====
  const topClients = useMemo(() => {
    const score = {};
    sessionLogs.forEach(s => { score[s.client_id] = (score[s.client_id] || 0) + 3; });
    exerciseLogs.forEach(e => { score[e.client_id] = (score[e.client_id] || 0) + 1; });
    nutritionLogs.forEach(n => { score[n.client_id] = (score[n.client_id] || 0) + 0.5; });
    weightLogs.forEach(w => { score[w.client_id] = (score[w.client_id] || 0) + 1.5; });
    runLogs.forEach(r => { score[r.client_id] = (score[r.client_id] || 0) + 2; });
    return Object.entries(score)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cid, s]) => {
        const c = allClients.find(x => x.id === cid);
        if (!c) return null;
        const coach = coaches.find(x => x.id === c.coach_id);
        return { ...c, _score: Math.round(s), _coach: coach?.brand_name || coach?.full_name || "—" };
      })
      .filter(Boolean);
  }, [sessionLogs, exerciseLogs, nutritionLogs, weightLogs, runLogs, allClients, coaches]);

  // ===== SYSTEM VITALS =====
  const totalDataPoints = sessionLogs.length + nutritionLogs.length + exerciseLogs.length + weightLogs.length + runLogs.length + dailyTracking.length;
  const notifs7d = notifLogs.filter(n => new Date(n.sent_date) > new Date(Date.now() - 7 * 86400000)).length;
  const subscriptionsExpiring30 = allClients.filter(c => c.subscription_end_date && new Date(c.subscription_end_date) > new Date() && new Date(c.subscription_end_date) < new Date(Date.now() + 30 * 86400000)).length;
  const pushReachable = pushSubs.length;

  // ===== ONLINE NOW (last_seen_at < 5 min) =====
  const onlineNow = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return allClients.filter(c => c.last_seen_at && new Date(c.last_seen_at).getTime() > cutoff).length;
  }, [allClients]);

  // ===== PLAN BREAKDOWN (revenue mix) =====
  const planBreakdown = useMemo(() => {
    const breakdown = {
      "3m": { count: 0, mrr: 0, color: BLUE, label: "3 mois" },
      "6m": { count: 0, mrr: 0, color: VIOLET, label: "6 mois" },
      "12m": { count: 0, mrr: 0, color: G, label: "12 mois" },
    };
    subs.forEach(s => {
      const p = s.subscription_plan;
      if (breakdown[p]) {
        breakdown[p].count++;
        breakdown[p].mrr += PLAN_PRICES[p];
      }
    });
    return breakdown;
  }, [subs]);

  // ===== COHORTS — 6 derniers mois, % retention courante par cohorte =====
  const cohorts = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString(intlLocale(), { month: "short" }),
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
      });
    }
    return months.map((m, i) => {
      const cohortClients = allClients.filter(c => {
        const cd = new Date(c.created_at);
        return cd.getFullYear() === m.year && cd.getMonth() === m.monthIdx;
      });
      const total = cohortClients.length;
      // Approximation : retention "courante" — nb actifs / nb cohorte. Pour les mois plus récents on
      // n'a pas l'historique de l'état d'abonnement à chaque mois écoulé, donc on affiche l'état
      // actuel répliqué (gris si cohorte vide).
      const stillActive = cohortClients.filter(c => c.subscription_status === "active").length;
      const pct = total > 0 ? Math.round((stillActive / total) * 100) : 0;
      const monthsElapsed = 5 - i;
      const retention = Array(monthsElapsed + 1).fill(null).map((_, mi) => {
        // M0 toujours 100% (tous les nouveaux étaient actifs au signup), puis décroît linéairement
        // jusqu'à `pct` au mois actuel. Heuristique pour donner du grain visuel sans avoir
        // l'historique réel.
        if (total === 0) return null;
        if (mi === 0) return 100;
        const progress = monthsElapsed === 0 ? 1 : mi / monthsElapsed;
        return Math.round(100 - (100 - pct) * progress);
      });
      return { ...m, total, retention };
    });
  }, [allClients]);

  // ===== HOUR-OF-DAY (7 jours × 24 heures) =====
  const hourOfDay = useMemo(() => {
    const grid = Array(7).fill(0).map(() => Array(24).fill(0));
    const tsList = [
      ...sessionLogs.map(l => l.logged_at),
      ...exerciseLogs.map(l => l.logged_at),
      ...nutritionLogs.map(l => l.logged_at || (l.date ? l.date + "T12:00:00" : null)),
      ...weightLogs.map(l => l.date ? l.date + "T12:00:00" : null),
    ].filter(Boolean);
    tsList.forEach(ts => {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return;
      const dow = (d.getDay() + 6) % 7; // Lundi = 0
      const h = d.getHours();
      grid[dow][h]++;
    });
    return grid;
  }, [sessionLogs, exerciseLogs, nutritionLogs, weightLogs]);
  const hourMax = Math.max(...hourOfDay.flat(), 1);

  // ===== AI INTEL — auto-generated insights =====
  const aiInsights = useMemo(() => {
    const ins = [];
    // 1. MRR pace
    if (mrr > 0 && mrrGoal > mrr && newCl30 > 0) {
      const weeklyPace = (newCl30 / 4) * (avgPerCoach || 100);
      if (weeklyPace > 0) {
        const remaining = mrrGoal - mrr;
        const weeksNeeded = Math.ceil(remaining / weeklyPace);
        if (weeksNeeded > 0 && weeksNeeded < 104) {
          ins.push({ icon: "trending", color: BLUE, label: "MRR pace", detail: `Au rythme actuel, objectif ${mrrGoal.toLocaleString()}€ atteint en ${weeksNeeded} semaine${weeksNeeded > 1 ? "s" : ""}` });
        }
      }
    }
    // 2. Silent active subs
    const cutoff = Date.now() - 7 * 86400000;
    const activeIds = new Set();
    sessionLogs.forEach(l => { if (new Date(l.logged_at).getTime() > cutoff) activeIds.add(l.client_id); });
    nutritionLogs.forEach(l => { if (new Date(l.logged_at || l.date).getTime() > cutoff) activeIds.add(l.client_id); });
    exerciseLogs.forEach(l => { if (new Date(l.logged_at || l.date).getTime() > cutoff) activeIds.add(l.client_id); });
    weightLogs.forEach(l => { if (new Date(l.date).getTime() > cutoff) activeIds.add(l.client_id); });
    runLogs.forEach(l => { if (new Date(l.date).getTime() > cutoff) activeIds.add(l.client_id); });
    dailyTracking.forEach(l => { if (new Date(l.date).getTime() > cutoff) activeIds.add(l.client_id); });
    const silentSubs = subs.filter(c => !activeIds.has(c.id)).length;
    if (silentSubs > 0) {
      ins.push({ icon: "alert", color: ORANGE, label: "Silent subs", detail: `${silentSubs} abonné${silentSubs > 1 ? "s" : ""} actif${silentSubs > 1 ? "s" : ""} sans aucune activité depuis 7j` });
    }
    // 3. Best activity day in 30d
    const dayTotals = pulse.dau.map(b => b.count);
    const maxDay = Math.max(...dayTotals, 0);
    if (maxDay > 0) {
      const maxDayIdx = dayTotals.indexOf(maxDay);
      const d = new Date(); d.setDate(d.getDate() - (29 - maxDayIdx));
      ins.push({ icon: "flame", color: G, label: "Peak engagement", detail: `${maxDay} utilisateurs actifs le ${d.toLocaleDateString(intlLocale(), { day: "numeric", month: "short" })}` });
    }
    // 4. Push reach
    if (subs.length > 0 && pushReachable < subs.length) {
      const missing = subs.length - pushReachable;
      const subscribedRate = Math.round((pushReachable / subs.length) * 100);
      ins.push({ icon: "bell", color: missing > 5 ? RED : ORANGE, label: "Push reach", detail: `${pushReachable}/${subs.length} subs joignables (${subscribedRate}%) — ${missing} doi${missing > 1 ? "vent" : "t"} activer les notifs` });
    }
    // 5. Expiring soon
    if (subscriptionsExpiring30 > 0) {
      ins.push({ icon: "clock", color: subscriptionsExpiring30 > 3 ? RED : AMBER, label: "Renewals", detail: `${subscriptionsExpiring30} abonnement${subscriptionsExpiring30 > 1 ? "s" : ""} expire${subscriptionsExpiring30 > 1 ? "nt" : ""} dans 30j` });
    }
    // 6. Top performer praise
    if (bestCoach && bestCoach._mrr > 0) {
      ins.push({ icon: "crown", color: AMBER, label: "Top coach", detail: `${bestCoach.full_name?.split(" ")[0] || bestCoach.email?.split("@")[0]} domine avec ${bestCoach._mrr}€ MRR et ${bestCoach._ret}% retention` });
    }
    // 7. Cash 30d
    if (revenue30dActual > 0) {
      const validPayments = payments.filter(p => !p.void).length;
      ins.push({ icon: "dollar", color: G, label: "Cash 30d", detail: `${revenue30dActual.toLocaleString()}€ effectivement encaissés (${validPayments} paiement${validPayments > 1 ? "s" : ""})` });
    }
    return ins;
  }, [mrr, mrrGoal, newCl30, avgPerCoach, subs, sessionLogs, nutritionLogs, exerciseLogs, weightLogs, runLogs, dailyTracking, pulse, pushReachable, subscriptionsExpiring30, bestCoach, revenue30dActual, payments]);

  // ===== OPERATOR DATA — vue SaaS opérationnelle (au lieu du dataviz) =====

  // MoM delta : revenue payé sur 30j vs 30j précédents
  const revenue30to60 = payments.filter(p => !p.void && new Date(p.received_date) > new Date(Date.now() - 60 * 86400000) && new Date(p.received_date) <= new Date(Date.now() - 30 * 86400000)).reduce((s, p) => s + parseFloat(p.amount_eur || 0), 0);
  const mrrDeltaPct = revenue30to60 > 0 ? Math.round(((revenue30dActual - revenue30to60) / revenue30to60) * 100) : (revenue30dActual > 0 ? 100 : 0);

  // Net new ce mois-ci : nouveaux clients - churn (subscription_end_date passée ce mois)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = allClients.filter(c => new Date(c.created_at) >= monthStart).length;
  const churnedThisMonth = allClients.filter(c => c.subscription_end_date && new Date(c.subscription_end_date) >= monthStart && new Date(c.subscription_end_date) < new Date()).length;
  const netNewMonth = newThisMonth - churnedThisMonth;

  // Renouvellements imminents (14j)
  const renewals14 = useMemo(() => allClients.filter(c => c.subscription_end_date && new Date(c.subscription_end_date) > new Date() && new Date(c.subscription_end_date) < new Date(Date.now() + 14 * 86400000)), [allClients]);

  // Subs silencieux (aucune activité 7j+)
  const silentSubs = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    const ids = new Set();
    sessionLogs.forEach(l => { if (new Date(l.logged_at).getTime() > cutoff) ids.add(l.client_id); });
    nutritionLogs.forEach(l => { if (new Date(l.logged_at || l.date).getTime() > cutoff) ids.add(l.client_id); });
    exerciseLogs.forEach(l => { if (new Date(l.logged_at || l.date).getTime() > cutoff) ids.add(l.client_id); });
    weightLogs.forEach(l => { if (new Date(l.date).getTime() > cutoff) ids.add(l.client_id); });
    runLogs.forEach(l => { if (new Date(l.date).getTime() > cutoff) ids.add(l.client_id); });
    dailyTracking.forEach(l => { if (new Date(l.date).getTime() > cutoff) ids.add(l.client_id); });
    return subs.filter(c => !ids.has(c.id));
  }, [subs, sessionLogs, nutritionLogs, exerciseLogs, weightLogs, runLogs, dailyTracking]);

  // Coachs avec clients mais zero session loggée 30j (alerte managériale)
  const inactiveCoaches = enriched.filter(c => c.is_active && c._total > 0 && c._sessions === 0);

  // Action items prioritaires triés par urgence — avec exemples de noms
  const firstName = (c) => c?.full_name?.split(" ")[0] || c?.email?.split("@")[0] || "?";
  const examples = (arr, n = 3) => {
    const names = arr.slice(0, n).map(firstName);
    if (arr.length > n) return names.join(", ") + ` +${arr.length - n}`;
    return names.join(", ");
  };
  const actionItems = [];
  if (renewals14.length > 0) actionItems.push({ label: `${renewals14.length} renouvellement${renewals14.length > 1 ? "s" : ""} dans 14j`, names: examples(renewals14), count: renewals14.length, color: AMBER, target: "clients" });
  if (silentSubs.length > 0) actionItems.push({ label: `${silentSubs.length} abonné${silentSubs.length > 1 ? "s" : ""} silencieux 7j+`, names: examples(silentSubs), count: silentSubs.length, color: ORANGE, target: "clients" });
  if (inactiveCoaches.length > 0) actionItems.push({ label: `${inactiveCoaches.length} coach${inactiveCoaches.length > 1 ? "s" : ""} sans session 30j`, names: examples(inactiveCoaches), count: inactiveCoaches.length, color: ORANGE, target: "coachs" });
  const expiring15to30List = allClients.filter(c => c.subscription_end_date && new Date(c.subscription_end_date) >= new Date(Date.now() + 14 * 86400000) && new Date(c.subscription_end_date) < new Date(Date.now() + 30 * 86400000));
  if (expiring15to30List.length > 0) actionItems.push({ label: `${expiring15to30List.length} renouvellement${expiring15to30List.length > 1 ? "s" : ""} 15-30j`, names: examples(expiring15to30List), count: expiring15to30List.length, color: BLUE, target: "clients" });

  // Activité récente : reuse liveEvents mais on ne l'animera plus en ticker
  const recentActivity = liveEvents.slice(0, 12);

  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s" };

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#030303", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <Spinner variant="dots" size={40} color={BLUE} />
      <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase" }}>Loading cockpit...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#030303", fontFamily: BODY_FONT, color: IVORY }}>
      <style>{`
        @keyframes cF{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ceoPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}
        @keyframes tickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes flashIn{0%{background:rgba(129,140,248,0.15)}100%{background:transparent}}
        @keyframes scanLine{0%{left:-100%}100%{left:100%}}
        .sa-c:hover{transform:translateY(-2px)!important;box-shadow:0 12px 32px rgba(0,0,0,0.4)!important}
        .ticker-track{display:inline-flex;gap:32px;padding-left:32px;animation:tickerScroll 70s linear infinite}
        .ticker-track:hover{animation-play-state:paused}
        .live-dot{width:6px;height:6px;border-radius:50%;background:${G};box-shadow:0 0 8px ${G};display:inline-block}
        .scan-shine{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(90deg,transparent,rgba(129,140,248,0.04),transparent);pointer-events:none;animation:scanLine 8s ease-in-out infinite}
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 50% -20%, rgba(129,140,248,0.06), transparent 55%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER PREMIUM CEO                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 16px)", paddingBottom: 18, marginBottom: 0, borderBottom: "1px solid rgba(240,236,228,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 8, height: 8 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BLUE, boxShadow: `0 0 12px ${BLUE}` }} />
                <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: BLUE, opacity: 0.3, animation: "ceoPulse 2s ease-in-out infinite" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 8, letterSpacing: "4px", color: "rgba(129,140,248,0.7)", fontWeight: 700, textTransform: "uppercase" }}>{t("sad.live_cockpit") || "Live Cockpit"}</div>
                <div style={{ fontFamily: CEO_FONT, fontSize: 15, letterSpacing: "3px", color: IVORY, textTransform: "uppercase" }}>{t("sad.ceo_dashboard") || "CEO Dashboard"}</div>
              </div>
              {onlineNow > 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.22)", borderRadius: 100, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: G, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  <span className="live-dot" /> {onlineNow} online
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 300, color: "rgba(240,236,228,0.5)", letterSpacing: "1px" }}>
                <Clock />
              </div>
              <button
                onClick={() => { haptic.selection(); loadData(true); }}
                title="Refresh"
                style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: refreshing ? BLUE : "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              >
                <Ic name="refresh" size={12} color={refreshing ? BLUE : "rgba(255,255,255,0.4)"} />
              </button>
              <div style={{ width: 1, height: 20, background: "rgba(240,236,228,0.08)" }} />
              <button
                onClick={() => { haptic.medium(); onSwitchToCoach?.(); }}
                title={t("sad.switch_coach_title") || "Switch to coach view"}
                style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(2,209,186,0.04)", border: `1px solid rgba(2,209,186,0.15)`, color: G, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.1)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.04)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.15)"; }}
              >
                <Ic name="users" size={14} color={G} />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HERO — un seul chiffre qui compte + sparkline + secondary stats */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: 36, marginBottom: 32, animation: "cF 0.4s ease both" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: BODY_FONT, fontWeight: 500, letterSpacing: "0.3px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ textTransform: "capitalize" }}>{new Date().toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
            <span style={{ color: payments.filter(p => !p.void && new Date(p.received_date).toISOString().split("T")[0] === new Date().toISOString().split("T")[0]).reduce((s, p) => s + parseFloat(p.amount_eur || 0), 0) > 0 ? G : "rgba(255,255,255,0.45)", fontWeight: 600 }}>
              {(() => {
                const todayPaid = payments.filter(p => !p.void && new Date(p.received_date).toISOString().split("T")[0] === new Date().toISOString().split("T")[0]).reduce((s, p) => s + parseFloat(p.amount_eur || 0), 0);
                if (todayPaid > 0) return `${todayPaid.toLocaleString()}€ encaissés aujourd'hui`;
                if (newToday > 0) return `${newToday} nouveau client aujourd'hui`;
                if (recentActivity.length > 0) return `${recentActivity.length} événement${recentActivity.length > 1 ? "s" : ""} récent${recentActivity.length > 1 ? "s" : ""}`;
                return "calme plat aujourd'hui";
              })()}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ fontFamily: CEO_FONT, fontSize: 96, lineHeight: 0.85, color: IVORY, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
              <AnimNum value={mrr} />€
            </div>
            {revenue30to60 > 0 && (
              <div style={{ paddingBottom: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: mrrDeltaPct >= 0 ? G : RED, letterSpacing: "0.5px" }}>
                  {mrrDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(mrrDeltaPct)}%
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>vs 30j préc.</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: BODY_FONT, marginBottom: 8, fontWeight: 500 }}>
            MRR · {subs.length} abonnement{subs.length > 1 ? "s" : ""} actif{subs.length > 1 ? "s" : ""} · ARR {arr.toLocaleString()}€
          </div>

          <div onClick={() => { const v = window.prompt("Objectif MRR (€) :", String(mrrGoal)); if (v && !isNaN(parseInt(v))) { setMrrGoal(parseInt(v)); localStorage.setItem("ceo_mrr_goal", v); } }} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px", background: "rgba(129,140,248,0.05)", border: "1px solid rgba(129,140,248,0.18)", borderRadius: 100, marginTop: 10, marginBottom: 26, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(129,140,248,0.1)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(129,140,248,0.05)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.18)"; }}>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: BLUE }}>Goal</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{mrr.toLocaleString()}/{mrrGoal.toLocaleString()}€</span>
            <div style={{ width: 50, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: mrrPct + "%", background: BLUE, borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: BLUE, fontVariantNumeric: "tabular-nums" }}>{mrrPct}%</span>
          </div>

          <div style={{ position: "relative", height: 80, marginBottom: 28, opacity: 0.92 }}>
            <Sparkline data={mrrTrajectory.map(b => b.amount)} width={1032} height={80} color={BLUE} fill={true} dot={true} />
            <div style={{ position: "absolute", top: 6, left: 6, fontSize: 8, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Cash flow · 30j</div>
            <div style={{ position: "absolute", top: 6, right: 6, fontSize: 11, fontFamily: MONO, fontWeight: 700, color: BLUE, fontVariantNumeric: "tabular-nums" }}>{Math.round(revenue30dActual).toLocaleString()}€</div>
          </div>

          <div style={{ display: "flex", gap: 0, paddingTop: 22, paddingBottom: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "Cash 30j", value: `${Math.round(revenue30dActual).toLocaleString()}€`, sub: `${payments.filter(p => !p.void).length} paiement${payments.filter(p => !p.void).length > 1 ? "s" : ""}`, color: G },
              { label: "Active subs", value: subs.length, sub: newToday > 0 ? `+${newToday} aujourd'hui` : (newCl30 > 0 ? `+${newCl30} sur 30j` : "stable"), color: VIOLET },
              { label: "Net new (mois)", value: `${netNewMonth >= 0 ? "+" : ""}${netNewMonth}`, sub: `${newThisMonth} new · ${churnedThisMonth} churn`, color: netNewMonth >= 0 ? G : RED },
            ].map((m, i) => (
              <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 28 : 0, borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", paddingRight: 28 }}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontFamily: CEO_FONT, fontSize: 32, color: IVORY, letterSpacing: "0.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                <div style={{ fontSize: 11, color: m.color || "rgba(255,255,255,0.4)", fontFamily: MONO, marginTop: 6, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OPERATOR ROW — activité récente (gauche) + actions + top (droite) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, marginBottom: 24, animation: "cF 0.4s ease 0.2s both" }} className="op-row">

          {/* ACTIVITÉ RÉCENTE */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Activité récente</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>48H</span>
            </div>
            <div>
              {recentActivity.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Aucune activité dans les dernières 48h.</div>
              ) : (() => {
                // Group by day: today / yesterday / older
                const todayStr = new Date().toISOString().split("T")[0];
                const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
                const groups = {};
                recentActivity.forEach(ev => {
                  const d = new Date(ev.ts).toISOString().split("T")[0];
                  if (!groups[d]) groups[d] = [];
                  groups[d].push(ev);
                });
                const sortedKeys = Object.keys(groups).sort().reverse();
                return sortedKeys.map((dKey, gi) => {
                  const label = dKey === todayStr ? "Aujourd'hui" : dKey === yesterdayStr ? "Hier" : new Date(dKey).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "short" });
                  const evs = groups[dKey];
                  return (
                    <div key={dKey}>
                      <div style={{ padding: "10px 20px", borderTop: gi > 0 ? "1px solid rgba(255,255,255,0.03)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.012)" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: dKey === todayStr ? G : "rgba(255,255,255,0.4)" }}>{label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{evs.length}</span>
                      </div>
                      {evs.map((ev, i) => (
                        <div key={i} style={{ padding: "11px 20px", display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid rgba(255,255,255,0.025)", transition: "background 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.015)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 9, fontFamily: MONO, letterSpacing: "1px", color: "rgba(255,255,255,0.4)", width: 56, textTransform: "uppercase", fontWeight: 700 }}>{ev.type}</span>
                          <span style={{ flex: 1, fontSize: 13, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.label}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{ev.detail}</span>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)", width: 38, textAlign: "right", flexShrink: 0 }}>{rel(ev.ts)}</span>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* COLONNE DROITE : actions + top coachs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ACTION ITEMS */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>À faire</span>
                {actionItems.length > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: AMBER, letterSpacing: "1px", fontWeight: 700 }}>{actionItems.length}</span>}
              </div>
              {actionItems.length === 0 ? (
                <div style={{ padding: "24px 20px", textAlign: "center", fontSize: 12, color: G, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Ic name="check" size={14} color={G} /> Tout est en ordre
                </div>
              ) : (
                actionItems.map((a, i) => (
                  <button key={i} onClick={() => { haptic.selection(); setDetailView(a.target); }} style={{ width: "100%", padding: "12px 20px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 12, borderBottom: i < actionItems.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "inherit", transition: "background 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.025)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, boxShadow: `0 0 8px ${a.color}aa`, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{a.label}</div>
                      {a.names && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.names}</div>}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: a.color, fontVariantNumeric: "tabular-nums" }}>{a.count}</span>
                    <Ic name="arrow-right" size={11} color="rgba(255,255,255,0.25)" />
                  </button>
                ))
              )}
            </div>

            {/* TOP COACHS COMPACT */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Top coachs</span>
                <button onClick={() => { haptic.selection(); setDetailView("coachs"); }} style={{ background: "none", border: "none", color: "rgba(129,140,248,0.7)", fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Tout →</button>
              </div>
              {enriched.filter(c => c._mrr > 0).length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Aucun coach actif.</div>
              ) : (
                enriched.filter(c => c._mrr > 0).slice(0, 5).map((c, i) => (
                  <button key={c.id} onClick={() => { haptic.selection(); setExpandedCoach(c.id); setDetailView("coachs"); }} style={{ width: "100%", padding: "11px 20px", background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, borderBottom: i < Math.min(4, enriched.filter(c2 => c2._mrr > 0).length - 1) ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "inherit", transition: "background 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.025)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: i === 0 ? AMBER : "rgba(255,255,255,0.3)", fontWeight: 700, width: 14 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.full_name?.split(" ")[0] || c.email?.split("@")[0]}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: c._ret >= 80 ? G : c._ret >= 50 ? AMBER : RED, fontVariantNumeric: "tabular-nums", width: 32, textAlign: "right" }}>{c._ret}%</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: BLUE, fontVariantNumeric: "tabular-nums", width: 48, textAlign: "right" }}>{c._mrr}€</span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER STRIP — system + broadcast                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, flexWrap: "wrap", animation: "cF 0.4s ease 0.3s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 10, fontFamily: MONO, color: G, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>System OK</span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}><span style={{ color: pushReachable > 0 ? G : "rgba(255,255,255,0.3)", fontWeight: 700 }}>{pushReachable}</span> push</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}><span style={{ color: "#fff", fontWeight: 700 }}>{totalDataPoints}</span> data 30j</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}><span style={{ color: "#fff", fontWeight: 700 }}>{programmes.length}</span> programmes</span>
          {notifs7d > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}><span style={{ color: AMBER, fontWeight: 700 }}>{notifs7d}</span> notifs 7j</span>}
          <div style={{ flex: 1 }} />
          <button onClick={() => { haptic.medium(); setShowBroadcast(true); }} disabled={pushReachable === 0} style={{ padding: "8px 14px", background: pushReachable > 0 ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.03)", color: pushReachable > 0 ? BLUE : "rgba(255,255,255,0.3)", border: `1px solid ${pushReachable > 0 ? "rgba(129,140,248,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", cursor: pushReachable > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.15s" }} onMouseEnter={(e) => { if (pushReachable > 0) { e.currentTarget.style.background = "rgba(129,140,248,0.15)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.4)"; } }} onMouseLeave={(e) => { e.currentTarget.style.background = pushReachable > 0 ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = pushReachable > 0 ? "rgba(129,140,248,0.25)" : "rgba(255,255,255,0.06)"; }}>
            <Ic name="send" size={11} color={pushReachable > 0 ? BLUE : "rgba(255,255,255,0.3)"} />
            Broadcast
          </button>
        </div>

      </div>


      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DETAIL VIEWS (drill-down full screen)                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {detailView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#030303", overflowY: "auto", WebkitOverflowScrolling: "touch", color: IVORY }}>
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "25%", background: "radial-gradient(ellipse at 50% -15%, rgba(129,140,248,0.05), transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>
            <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 12px)", marginBottom: 28 }}>
              <button onClick={() => { setDetailView(null); setExpandedCoach(null); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(240,236,228,0.3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: BODY_FONT, padding: 0, marginBottom: 16 }}>
                <Ic name="arrow-left" size={12} /> back
              </button>
              <h1 style={{ fontFamily: CEO_FONT, fontSize: 48, color: IVORY, letterSpacing: "2px", margin: 0, lineHeight: 0.95, textTransform: "capitalize" }}>
                {{ mrr: "Revenue", clients: "Clients", retention: "Retention", coachs: "Coachs", growth: "Growth", churn: "Churn risk" }[detailView]}
              </h1>
            </div>

            {/* MRR */}
            {detailView === "mrr" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
                  {[{ l: "MRR", v: mrr.toLocaleString() + " €", c: BLUE }, { l: "ARR", v: arr.toLocaleString() + " €", c: "#fff" }, { l: "Avg/coach", v: avgPerCoach + " €", c: BLUE }].map((s, i) => (
                    <div key={i} style={{ ...card, textAlign: "center", cursor: "default" }}>
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 200, color: s.c, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 6, fontWeight: 700 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {enriched.filter(c => c._mrr > 0).map(c => (
                  <div key={c.id} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Ring score={c._health} size={44} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{c.brand_name} · {c._total} clients · {c._ret}% retention</div>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 200, color: BLUE, fontVariantNumeric: "tabular-nums" }}>{c._mrr}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>€</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CLIENTS */}
            {detailView === "clients" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allClients.map((cl, i) => {
                  const dl = cl.subscription_end_date ? Math.ceil((new Date(cl.subscription_end_date) - Date.now()) / 86400000) : null;
                  const coach = coaches.find(c => c.id === cl.coach_id);
                  return (
                    <div key={cl.id} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, animation: `cF ${0.1 + i * 0.02}s ease both` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundImage: cl.avatar_url ? `url(${cl.avatar_url})` : "none", backgroundSize: "cover", backgroundPosition: "center", background: cl.avatar_url ? "transparent" : (cl.subscription_status === "active" ? BLUE_DIM : "rgba(255,255,255,0.03)"), border: `2px solid ${cl.subscription_status === "active" ? BLUE_BORDER : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: cl.subscription_status === "active" ? BLUE : "rgba(255,255,255,0.3)", flexShrink: 0, overflow: "hidden" }}>
                          {!cl.avatar_url && (cl.full_name || cl.email || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.full_name || cl.email}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{cl.email}{coach ? ` · ${coach.brand_name || coach.full_name}` : ""}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {cl.subscription_plan && <div style={{ fontSize: 10, fontWeight: 700, color: BLUE }}>{cl.subscription_plan}</div>}
                          {dl !== null && <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: dl <= 0 ? RED : dl <= 14 ? ORANGE : "rgba(255,255,255,0.35)", marginTop: 2 }}>{dl <= 0 ? "expired" : dl + "d"}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RETENTION */}
            {detailView === "retention" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[{ l: "Active", v: subs.length, c: G }, { l: "Inactive", v: onb.length - subs.length, c: ORANGE }, { l: "Rate", v: ret + "%", c: ret >= 80 ? G : ORANGE }].map((s, i) => (
                    <div key={i} style={{ ...card, textAlign: "center", cursor: "default", padding: 20 }}>
                      <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 200, color: s.c, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 8, fontWeight: 700 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                  {fillTpl(t("sad.retention_desc") || "{active} of {total} onboarded clients have an active subscription.", { active: subs.length, total: onb.length })}
                </div>
              </div>
            )}

            {/* COACHS */}
            {detailView === "coachs" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {enriched.map((c, i) => (
                  <div key={c.id} onClick={() => setExpandedCoach(expandedCoach === c.id ? null : c.id)} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: expandedCoach === c.id ? `1px solid ${BLUE_BORDER}` : "1px solid rgba(255,255,255,0.06)", borderRadius: 16, cursor: "pointer", animation: `cF ${0.1 + i * 0.03}s ease both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Ring score={c._health} size={48} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.full_name || c.email}</span>
                          {bestCoach?.id === c.id && enriched.length > 1 && <span style={{ fontSize: 7, fontWeight: 800, color: BLUE, background: BLUE_DIM, border: `1px solid ${BLUE_BORDER}`, borderRadius: 100, padding: "2px 8px" }}>TOP</span>}
                          {!c.is_active && <span style={{ fontSize: 7, color: RED, background: "rgba(239,68,68,0.08)", borderRadius: 100, padding: "2px 7px", fontWeight: 700 }}>OFF</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{c.brand_name} · {c._total} clients · {c._sessions || 0} sessions</div>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}><div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 200, color: BLUE, fontVariantNumeric: "tabular-nums" }}>{c._mrr}€</div><div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>MRR</div></div>
                        <div style={{ textAlign: "center" }}><div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 200, color: c._ret >= 80 ? G : ORANGE, fontVariantNumeric: "tabular-nums" }}>{c._ret}%</div><div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>RET</div></div>
                      </div>
                    </div>
                    {expandedCoach === c.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", animation: "cF 0.2s ease" }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
                          <span>Joined {new Date(c.created_at).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric" })}</span>
                          <span>· {c._progs} programmes</span>
                          <span>· LTV {c._ltv.toLocaleString()}€</span>
                          <span>· {c._paid30}€ paid 30d</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCoach(c); }} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: c.is_active ? "rgba(239,68,68,0.06)" : BLUE_DIM, border: `1px solid ${c.is_active ? "rgba(239,68,68,0.2)" : BLUE_BORDER}`, color: c.is_active ? RED : BLUE, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                        {c._cls.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {c._cls.map(cl => {
                              const dl = cl.subscription_end_date ? Math.ceil((new Date(cl.subscription_end_date) - Date.now()) / 86400000) : null;
                              return (
                                <div key={cl.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.015)", borderRadius: 8, fontSize: 11 }}>
                                  <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{cl.full_name || cl.email}</span>
                                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: dl !== null ? (dl <= 0 ? RED : dl <= 14 ? ORANGE : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.2)" }}>{dl !== null ? (dl <= 0 ? "expired" : dl + "d") : "—"}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* GROWTH */}
            {detailView === "growth" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[{ l: "Forecast 3m", v: (mrr * 3).toLocaleString() + " €" }, { l: "Forecast 6m", v: Math.round(mrr * 6 * ret / 100).toLocaleString() + " €" }, { l: "Forecast 12m", v: Math.round(mrr * 12 * Math.pow(ret / 100, 2)).toLocaleString() + " €" }].map((s, i) => (
                    <div key={i} style={{ ...card, textAlign: "center", cursor: "default", padding: 20 }}>
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 200, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 8, fontWeight: 700 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ ...card, cursor: "default", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Clients per coach</div>
                  {enriched.filter(c => c._total > 0).map(c => {
                    const mx = Math.max(1, ...enriched.map(e => e._total));
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 70, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{c.full_name?.split(" ")[0]}</div>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: (c._total / mx * 100) + "%", background: BLUE, borderRadius: 3 }} /></div>
                        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#fff", width: 30, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c._total}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHURN */}
            {detailView === "churn" && (
              <div>
                {churn.length === 0 ? (
                  <div style={{ ...card, cursor: "default", textAlign: "center", padding: 40 }}>
                    <Ic name="check" size={32} color={G} />
                    <div style={{ fontSize: 16, fontWeight: 800, color: G, marginTop: 12 }}>No churn risk</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>All coaches are healthy.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {churn.map((c, i) => (
                      <div key={c.id} style={{ padding: "16px 18px", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 16, animation: `cF ${0.1 + i * 0.03}s ease both` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <Ring score={c._health} size={48} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.full_name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{c._total} clients · {c._mrr}€ MRR · {c._progs} programmes</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 800, color: RED, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 100, padding: "4px 12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>RISK</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BROADCAST PUSH MODAL                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          subsCount={pushReachable}
          allClients={allClients}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  Broadcast modal — sends a push to all clients with a registered device
// ───────────────────────────────────────────────────────────────────────────
function BroadcastModal({ onClose, subsCount, allClients }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    let sent = 0, failed = 0, total = 0;

    // Récupère les client_ids qui ont au moins une push subscription
    const { data: subs } = await supabase.from("push_subscriptions").select("client_id");
    const targetIds = [...new Set((subs || []).map(s => s.client_id))];

    // Envoie en parallèle (Promise.all) — limit à 20 simultanés via chunks
    const chunkSize = 10;
    for (let i = 0; i < targetIds.length; i += chunkSize) {
      const chunk = targetIds.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(async cid => {
        try {
          const r = await supabase.functions.invoke("send-push", {
            body: { client_id: cid, title: title.trim(), body: body.trim(), url: "/" },
          });
          if (r.error) return { failed: true };
          return r.data || { sent: 0, total: 0 };
        } catch (e) {
          return { failed: true };
        }
      }));
      results.forEach(r => {
        if (r.failed) failed++;
        else { sent += (r.sent || 0); total += (r.total || 0); }
      });
    }

    setResult({ sent, failed, total, targets: targetIds.length });
    setSending(false);
    haptic.success();
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: BODY_FONT, color: IVORY }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#0a0a0a", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 18, padding: 28, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 80px rgba(129,140,248,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Ic name="radio" size={16} color={BLUE} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: BLUE }}>Broadcast</span>
          <div style={{ flex: 1 }} />
          {!sending && <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}><Ic name="x" size={16} /></button>}
        </div>

        {!result ? (
          <>
            <h2 style={{ fontFamily: CEO_FONT, fontSize: 32, color: IVORY, letterSpacing: "1px", margin: "0 0 8px" }}>Push to all</h2>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
              Will send to <span style={{ color: BLUE, fontWeight: 700, fontFamily: MONO }}>{subsCount}</span> {subsCount === 1 ? "device" : "devices"}.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Nouveau programme disponible"
                maxLength={60}
                disabled={sending}
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: BODY_FONT }}
              />
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4, fontFamily: MONO, textAlign: "right" }}>{title.length}/60</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Court et direct."
                maxLength={140}
                rows={3}
                disabled={sending}
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: BODY_FONT, resize: "vertical" }}
              />
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4, fontFamily: MONO, textAlign: "right" }}>{body.length}/140</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} disabled={sending} style={{ flex: "0 0 auto", padding: "12px 18px", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: BODY_FONT }}>Cancel</button>
              <button
                onClick={send}
                disabled={sending || !title.trim() || !body.trim() || subsCount === 0}
                style={{ flex: 1, padding: "12px 18px", background: (title.trim() && body.trim() && subsCount > 0 && !sending) ? BLUE : "rgba(255,255,255,0.06)", color: (title.trim() && body.trim() && subsCount > 0 && !sending) ? "#0a0a0a" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", cursor: (title.trim() && body.trim() && subsCount > 0 && !sending) ? "pointer" : "not-allowed", fontFamily: BODY_FONT, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {sending ? <><Spinner variant="dots" size={14} color="#0a0a0a" /> Sending...</> : <><Ic name="send" size={12} color={(title.trim() && body.trim() && subsCount > 0) ? "#0a0a0a" : "rgba(255,255,255,0.3)"} /> Send broadcast</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: CEO_FONT, fontSize: 32, color: IVORY, letterSpacing: "1px", margin: "0 0 8px" }}>Broadcast sent</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20, marginBottom: 20 }}>
              <div style={{ textAlign: "center", padding: "16px 12px", background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.18)", borderRadius: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 200, color: G, fontVariantNumeric: "tabular-nums" }}>{result.sent}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>delivered</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 200, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{result.targets}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>targets</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px 12px", background: result.failed > 0 ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${result.failed > 0 ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)"}`, borderRadius: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 200, color: result.failed > 0 ? RED : "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>{result.failed}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, fontWeight: 700 }}>failed</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: "12px 18px", background: BLUE, color: "#0a0a0a", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", fontFamily: BODY_FONT }}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
