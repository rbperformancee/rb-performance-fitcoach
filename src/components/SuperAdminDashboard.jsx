import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import Spinner from "./Spinner";
import haptic from "../lib/haptic";
import { useT, getLocale } from "../lib/i18n";

const intlLocale = () => (getLocale() === "en" ? "en-US" : "fr-FR");

// ===== CHARTE — alignée avec le reste de l'app (Syne + Inter + JetBrains Mono) =====
const BLUE = "#818cf8";
const BLUE_DIM = "rgba(129,140,248,0.08)";
const BLUE_BORDER = "rgba(129,140,248,0.22)";
const IVORY = "#f0ece4";
const G = "#02d1ba";
const RED = "#ef4444";
const AMBER = "#fbbf24";
const DISPLAY = "'Syne',-apple-system,sans-serif";
const BODY = "-apple-system,'Inter',sans-serif";
const MONO = "'JetBrains Mono','SF Mono',monospace";

// Plans coach SaaS — quand migration 008 sera apply, ça remplit auto.
const COACH_PLAN_PRICE = { starter: 199, founding: 199, pro: 299, elite: 499, free: 0 };

// ───────────────────────────────────────────────────────────────────────────
//  Primitives
// ───────────────────────────────────────────────────────────────────────────

function Ic({ name, size = 16, color = "currentColor" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const m = {
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    arrowRight: <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    arrowLeft: <svg {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    check: <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
    alert: <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    activity: <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    spark: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  };
  return m[name] || null;
}

function AnimNum({ value, duration = 700 }) {
  const [d, setD] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const t = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
    if (!t) { setD(0); return; }
    const s = Date.now();
    const a = () => {
      const p = Math.min((Date.now() - s) / duration, 1);
      setD(Math.round(t * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(a);
    };
    ref.current = requestAnimationFrame(a);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{d.toLocaleString()}</span>;
}

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(t.getHours()).padStart(2, "0")}:{String(t.getMinutes()).padStart(2, "0")}</span>;
}

function rel(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "à l'instant";
  if (diff < 3600000) return Math.floor(diff / 60000) + "min";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  return Math.floor(diff / 86400000) + "j";
}

// Section header LVMH-style : icône · label · ligne · meta
function SectionHead({ icon, label, color = BLUE, meta }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <Ic name={icon} size={13} color={color} />
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: color, opacity: 0.75 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}33, transparent)` }} />
      {meta && <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{meta}</span>}
    </div>
  );
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
  const [weightLogs, setWeightLogs] = useState([]);
  const [runLogs, setRunLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [pushSubs, setPushSubs] = useState([]);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailCoach, setDetailCoach] = useState(null);
  const [funnelDialog, setFunnelDialog] = useState(null); // { step: 'created'|'setup'|'activated'|'engaged'|'paying', label, list }

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const ago30d = ago30.split("T")[0];

    // 12 queries parallèles. Migration 008 pas appliquée → on tente quand même
    // de récupérer subscription_plan, ça fail silencieusement et on traite "free".
    const [c, cl, pr, sl, wl, rl, el, nl, ps, wlist, capps] = await Promise.all([
      supabase.from("coaches").select("*").order("created_at"),
      supabase.from("clients").select("id,email,full_name,coach_id,subscription_plan,subscription_status,subscription_end_date,onboarding_done,created_at,last_seen_at,avatar_url"),
      supabase.from("programmes").select("id,client_id,is_active,uploaded_at,programme_name"),
      supabase.from("session_logs").select("client_id,session_name,programme_name,logged_at").gte("logged_at", ago30),
      supabase.from("weight_logs").select("client_id,date,weight").gte("date", ago30d),
      supabase.from("run_logs").select("client_id,date,distance_km").gte("date", ago30d),
      supabase.from("exercise_logs").select("client_id,date,logged_at").gte("date", ago30d),
      supabase.from("nutrition_logs").select("client_id,date,aliment,logged_at").gte("date", ago30d),
      supabase.from("push_subscriptions").select("id,client_id"),
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      supabase.from("coaching_applications").select("id", { count: "exact", head: true }),
    ]);

    setCoaches(c.data || []);
    setAllClients(cl.data || []);
    setProgrammes(pr.data || []);
    setSessionLogs(sl.data || []);
    setWeightLogs(wl.data || []);
    setRunLogs(rl.data || []);
    setExerciseLogs(el.data || []);
    setNutritionLogs(nl.data || []);
    setPushSubs(ps.data || []);
    setWaitlistCount(wlist.count || 0);
    setApplicationsCount(capps.count || 0);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Live updates — Supabase Realtime sur les events qui bougent les chiffres.
  // Debounce 800ms pour éviter rafale. Try/catch silencieux si Realtime pas activé.
  const refetchTimer = useRef(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => loadData(true), 800);
  }, [loadData]);
  useEffect(() => {
    let ch;
    try {
      ch = supabase.channel("ceo-cockpit-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "clients" }, scheduleRefetch)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clients" }, scheduleRefetch)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "coaches" }, scheduleRefetch)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "coaches" }, scheduleRefetch)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_logs" }, scheduleRefetch)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "waitlist" }, scheduleRefetch)
        .subscribe();
    } catch (e) { /* Realtime peut-être pas activé sur ces tables. silencieux. */ }
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [scheduleRefetch]);

  // ===== ENRICHISSEMENT COACHS =====
  // Pour chaque coach : athletes managed, activité, état d'activation, MRR (= 0
  // tant que migration 008 pas apply), last login, etc.
  const enriched = useMemo(() => coaches.map((coach) => {
    const cls = allClients.filter((cl) => cl.coach_id === coach.id);
    const cIds = new Set(cls.map((cl) => cl.id));
    const cProgs = programmes.filter((p) => cIds.has(p.client_id));
    const cActiveProgs = cProgs.filter((p) => p.is_active);
    const cSessions = sessionLogs.filter((s) => cIds.has(s.client_id)).length;
    const cExercises = exerciseLogs.filter((e) => cIds.has(e.client_id)).length;
    const cNutrition = nutritionLogs.filter((n) => cIds.has(n.client_id)).length;
    const cWeights = weightLogs.filter((w) => cIds.has(w.client_id)).length;
    const totalActivity = cSessions + cExercises + cNutrition + cWeights;

    // Plan SaaS — fallback 'free' si la colonne n'existe pas (migration 008 pending).
    const plan = coach.subscription_plan || "free";
    const status = coach.subscription_status || "—";
    const mrrContribution = (status === "active" && COACH_PLAN_PRICE[plan]) ? COACH_PLAN_PRICE[plan] : 0;

    // Activation funnel (proxy sans migration 008) :
    //   1. créé : existe dans la table
    //   2. setup : a fait l'onboarding business (monthly_revenue_goal set)
    //   3. activé : a au moins 1 client invité
    //   4. engagé : son client a au moins 1 activité loggée (= utilisation réelle)
    const isSetup = !!coach.business_goals_set_at;
    const isActivated = cls.length > 0;
    const isEngaged = totalActivity > 0 || cActiveProgs.length > 0;

    // Last activity du coach (proxy : last activity de ses athlètes — on n'a pas
    // last_login coach direct, donc on triangule via les logs des athlètes).
    const allCoachActivity = [
      ...sessionLogs.filter((s) => cIds.has(s.client_id)).map((s) => new Date(s.logged_at).getTime()),
      ...exerciseLogs.filter((e) => cIds.has(e.client_id)).map((e) => new Date(e.logged_at || e.date).getTime()),
      ...nutritionLogs.filter((n) => cIds.has(n.client_id)).map((n) => new Date(n.logged_at || n.date).getTime()),
      ...weightLogs.filter((w) => cIds.has(w.client_id)).map((w) => new Date(w.date).getTime()),
    ];
    const lastActivityTs = allCoachActivity.length > 0 ? Math.max(...allCoachActivity) : null;

    return {
      ...coach,
      _plan: plan,
      _status: status,
      _mrr: mrrContribution,
      _athletes: cls.length,
      _activeAthletes: cls.filter((cl) => cl.subscription_status === "active").length,
      _programmes: cProgs.length,
      _activeProgs: cActiveProgs.length,
      _sessions: cSessions,
      _totalActivity: totalActivity,
      _lastActivityTs: lastActivityTs,
      _isSetup: isSetup,
      _isActivated: isActivated,
      _isEngaged: isEngaged,
    };
  }).sort((a, b) => (b._mrr - a._mrr) || (b._totalActivity - a._totalActivity) || (b._athletes - a._athletes)), [coaches, allClients, programmes, sessionLogs, exerciseLogs, nutritionLogs, weightLogs]);

  // ===== METRIQUES TOP-LINE =====
  const totalCoaches = coaches.length;
  const payingCoaches = enriched.filter((c) => c._mrr > 0);
  const mrr = payingCoaches.reduce((s, c) => s + c._mrr, 0);
  const arr = mrr * 12;
  const stripeReady = coaches.some((c) => !!c.stripe_customer_id) || coaches.some((c) => !!c.subscription_plan && c.subscription_plan !== "free");

  // Activation funnel (à l'échelle des coachs)
  const stepCreated = coaches.length;
  const stepSetup = enriched.filter((c) => c._isSetup).length;
  const stepActivated = enriched.filter((c) => c._isActivated).length;
  const stepEngaged = enriched.filter((c) => c._isEngaged).length;
  const stepPaying = payingCoaches.length;

  // Action items pour Rayan — coach-focused
  const actionItems = useMemo(() => {
    const items = [];
    const inactive7d = enriched.filter((c) => c._isActivated && (!c._lastActivityTs || c._lastActivityTs < Date.now() - 7 * 86400000));
    if (inactive7d.length > 0) items.push({ label: `${inactive7d.length} coach${inactive7d.length > 1 ? "s" : ""} sans activité 7j+`, names: inactive7d.slice(0, 3).map((c) => c.full_name?.split(" ")[0] || c.email?.split("@")[0]).join(", "), count: inactive7d.length, color: AMBER, group: "inactive" });
    const notActivated = enriched.filter((c) => !c._isActivated);
    if (notActivated.length > 0) items.push({ label: `${notActivated.length} coach${notActivated.length > 1 ? "s" : ""} créé${notActivated.length > 1 ? "s" : ""} sans athlète`, names: notActivated.slice(0, 3).map((c) => c.full_name?.split(" ")[0] || c.email?.split("@")[0]).join(", "), count: notActivated.length, color: BLUE, group: "notactivated" });
    if (waitlistCount > 0) items.push({ label: `${waitlistCount} en waitlist à contacter`, count: waitlistCount, color: G, group: "waitlist" });
    if (!stripeReady) items.push({ label: "Tracking Stripe non branché", subtext: "Apply migration 008 + connecter webhook pour voir le MRR", count: "!", color: RED, group: "stripe" });
    return items;
  }, [enriched, waitlistCount, stripeReady]);

  // Activity feed (events des athlètes des coachs — proxy plateforme)
  const activityFeed = useMemo(() => {
    const evs = [];
    const ago48 = Date.now() - 48 * 3600000;
    const clientName = (cid) => {
      const c = allClients.find((x) => x.id === cid);
      return c?.full_name?.split(" ")[0] || c?.email?.split("@")[0] || "?";
    };
    const coachOf = (cid) => {
      const c = allClients.find((x) => x.id === cid);
      const co = coaches.find((x) => x.id === c?.coach_id);
      return co?.full_name?.split(" ")[0] || co?.brand_name || "?";
    };
    sessionLogs.forEach((s) => {
      const ts = new Date(s.logged_at).getTime();
      if (ts > ago48) evs.push({ ts, type: "session", color: BLUE, athlete: clientName(s.client_id), coach: coachOf(s.client_id), detail: s.session_name || s.programme_name || "Séance" });
    });
    weightLogs.forEach((w) => {
      const ts = new Date(w.date).getTime();
      if (ts > ago48) evs.push({ ts, type: "weight", color: G, athlete: clientName(w.client_id), coach: coachOf(w.client_id), detail: `${w.weight}kg` });
    });
    runLogs.forEach((r) => {
      const ts = new Date(r.date).getTime();
      if (ts > ago48) evs.push({ ts, type: "run", color: RED, athlete: clientName(r.client_id), coach: coachOf(r.client_id), detail: `${r.distance_km}km` });
    });
    nutritionLogs.forEach((n) => {
      const ts = new Date(n.logged_at || n.date).getTime();
      if (ts > ago48) evs.push({ ts, type: "meal", color: AMBER, athlete: clientName(n.client_id), coach: coachOf(n.client_id), detail: n.aliment || "Repas" });
    });
    allClients.forEach((c) => {
      const ts = new Date(c.created_at).getTime();
      if (ts > ago48) evs.push({ ts, type: "signup", color: BLUE, athlete: c.full_name?.split(" ")[0] || c.email?.split("@")[0] || "?", coach: (() => { const co = coaches.find((x) => x.id === c.coach_id); return co?.full_name?.split(" ")[0] || "?"; })(), detail: "Nouveau client" });
    });
    coaches.forEach((co) => {
      const ts = new Date(co.created_at).getTime();
      if (ts > ago48) evs.push({ ts, type: "coach", color: G, athlete: "—", coach: co.full_name?.split(" ")[0] || co.brand_name || "?", detail: "Nouveau coach" });
    });
    evs.sort((a, b) => b.ts - a.ts);
    return evs.slice(0, 16);
  }, [sessionLogs, weightLogs, runLogs, nutritionLogs, allClients, coaches]);

  // ===== LOADING SKELETON =====
  if (loading) {
    const sk = (w, h, r = 8, mb = 0) => <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb, background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)", backgroundSize: "200% 100%", animation: "skSh 1.4s ease-in-out infinite" }} />;
    return (
      <div style={{ minHeight: "100dvh", background: "#030303", fontFamily: BODY, color: IVORY }}>
        <style>{`@keyframes skSh{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "0 24px 140px" }}>
          <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 18px)", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12 }}>{sk(120, 14, 4)}{sk(80, 14, 4)}</div>
            <div style={{ display: "flex", gap: 12 }}>{sk(60, 12, 4)}{sk(50, 12, 4)}</div>
          </div>
          <div style={{ marginTop: 36, marginBottom: 32 }}>
            {sk(240, 11, 4, 18)}
            {sk(420, 84, 12, 16)}
            {sk(280, 13, 4, 10)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 20 }}>
              {sk(120, 11, 4, 18)}
              {[0, 1, 2].map((i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>{sk(36, 36, 100)}<div style={{ flex: 1 }}>{sk("70%", 12, 4, 5)}{sk("50%", 9, 4)}</div>{sk(60, 14, 4)}</div>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[0, 1].map((i) => <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 20 }}>{sk(80, 11, 4, 14)}{[0, 1, 2].map((j) => <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>{sk(8, 8, 100)}<div style={{ flex: 1 }}>{sk("100%", 11, 4)}</div></div>)}</div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#030303", fontFamily: BODY, color: IVORY }}>
      <style>{`
        @keyframes cF{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ceoPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}
        .live-dot{width:6px;height:6px;border-radius:50%;background:${G};box-shadow:0 0 8px ${G};display:inline-block}
        .row-hover:hover{background:rgba(255,255,255,0.025)!important}
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 50% -20%, rgba(129,140,248,0.06), transparent 55%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "0 24px 140px" }}>

        {/* ═══════ HEADER LVMH chapter style ═══════ */}
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 18px)", paddingBottom: 16, borderBottom: "1px solid rgba(240,236,228,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 900, letterSpacing: "0.2em", color: IVORY, textTransform: "uppercase" }}>RB Perform</span>
            <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)", alignSelf: "center" }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: BLUE, letterSpacing: "0.05em" }}>01</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#fff", textTransform: "uppercase" }}>Cockpit CEO</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", width: 6, height: 6 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BLUE, boxShadow: `0 0 10px ${BLUE}` }} />
                <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: BLUE, opacity: 0.3, animation: "ceoPulse 2s ease-in-out infinite" }} />
              </div>
              <span style={{ fontSize: 9, fontFamily: MONO, color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>{refreshing ? "syncing" : "live"}</span>
            </div>
            <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(240,236,228,0.5)" }}><Clock /></span>
          </div>
        </div>

        {/* ═══════ HERO — état pré-launch honnête ═══════ */}
        <div style={{ marginTop: 36, marginBottom: 28, animation: "cF 0.4s ease both" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500, letterSpacing: "0.3px", marginBottom: 18, textTransform: "capitalize" }}>
            {new Date().toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" })}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 88, fontWeight: 900, lineHeight: 0.9, color: IVORY, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
              <AnimNum value={mrr} />€
            </div>
            <div style={{ paddingBottom: 14, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>MRR Coach SaaS</span>
              {!stripeReady && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: AMBER, letterSpacing: "0.05em" }}>tracking Stripe non branché</span>
              )}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500, marginBottom: 24 }}>
            {payingCoaches.length} coach{payingCoaches.length > 1 ? "s" : ""} payant{payingCoaches.length > 1 ? "s" : ""}{stripeReady ? "" : " trackable"} · {totalCoaches} coach{totalCoaches > 1 ? "s" : ""} créé{totalCoaches > 1 ? "s" : ""} · ARR {arr.toLocaleString()}€
          </div>

          {/* Activation funnel — grid auto-fit qui wrap au lieu de squasher.
              Sur desktop : 5 colonnes égales. Sur mobile : 2-3 par ligne. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, padding: "20px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(() => {
              const steps = [
                { key: "created", label: "Créés", value: stepCreated, color: "rgba(255,255,255,0.6)", list: enriched },
                { key: "setup", label: "Setup", value: stepSetup, color: BLUE, list: enriched.filter(c => c._isSetup) },
                { key: "activated", label: "Activés", value: stepActivated, color: BLUE, list: enriched.filter(c => c._isActivated) },
                { key: "engaged", label: "Engagés", value: stepEngaged, color: G, list: enriched.filter(c => c._isEngaged) },
                { key: "paying", label: "Payants", value: stepPaying, color: AMBER, list: payingCoaches },
              ];
              return steps.map((s, i) => {
                const next = steps[i + 1];
                const conv = i < steps.length - 1 && s.value > 0 ? Math.round((next.value / s.value) * 100) : null;
                return (
                  <button
                    key={s.key}
                    onClick={() => { haptic.selection(); setFunnelDialog({ step: s.key, label: s.label, color: s.color, list: s.list }); }}
                    style={{
                      padding: "8px 14px",
                      background: "transparent", border: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      fontFamily: "inherit", color: "inherit", textAlign: "left",
                      transition: "all 0.15s", borderRadius: 10,
                      minHeight: 86,
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = `${s.color}33`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>{s.label}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, color: s.value > 0 ? s.color : "rgba(255,255,255,0.22)", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                    {conv !== null && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: MONO, marginTop: 8 }}>
                        {next.value > 0 ? `${conv}% →` : "→"}
                      </div>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* ═══════ OPERATOR ROW : coachs (gauche) + actions + pipeline (droite) ═══════ */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, marginBottom: 24, animation: "cF 0.4s ease 0.15s both" }}>

          {/* MES COACHS */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Mes coachs</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{enriched.length}</span>
            </div>
            {enriched.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Aucun coach.</div>
            ) : (
              enriched.map((c, i) => (
                <button key={c.id} onClick={() => { haptic.selection(); setDetailCoach(c); }} className="row-hover" style={{ width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: "inherit", textAlign: "left", transition: "background 0.15s" }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: c.logo_url ? "transparent" : "rgba(2,209,186,0.08)",
                    backgroundImage: c.logo_url ? `url(${c.logo_url})` : "none",
                    backgroundSize: "cover", backgroundPosition: "center",
                    border: "1px solid rgba(2,209,186,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: G, overflow: "hidden",
                  }}>
                    {!c.logo_url && (c.full_name || c.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.full_name || c.email}</span>
                      {c._mrr > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: AMBER, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 100, padding: "2px 7px", letterSpacing: "0.5px" }}>{c._plan.toUpperCase()}</span>}
                      {!c.is_active && <span style={{ fontSize: 8, fontWeight: 800, color: RED, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 100, padding: "2px 7px" }}>OFF</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3, fontFamily: MONO }}>
                      {c._athletes} ath. · {c._activeProgs}/{c._programmes} prog{c._programmes > 1 ? "s" : ""} · {c._totalActivity} activités 30j
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: c._mrr > 0 ? BLUE : "rgba(255,255,255,0.25)", fontVariantNumeric: "tabular-nums" }}>{c._mrr}€</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{c._lastActivityTs ? rel(c._lastActivityTs) : "—"}</div>
                  </div>
                  <Ic name="arrowRight" size={11} color="rgba(255,255,255,0.25)" />
                </button>
              ))
            )}
          </div>

          {/* COLONNE DROITE : actions + pipeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* À FAIRE */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>À faire</span>
                {actionItems.length > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: AMBER, fontWeight: 700 }}>{actionItems.length}</span>}
              </div>
              {actionItems.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: G, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Ic name="check" size={14} color={G} /> Tout est en ordre
                </div>
              ) : (
                actionItems.map((a, i) => (
                  <div key={i} style={{ padding: "12px 20px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, boxShadow: `0 0 8px ${a.color}aa`, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{a.label}</div>
                      {a.names && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.names}</div>}
                      {a.subtext && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{a.subtext}</div>}
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: a.color, fontVariantNumeric: "tabular-nums" }}>{a.count}</span>
                  </div>
                ))
              )}
            </div>

            {/* PIPELINE */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Pipeline</span>
              </div>
              {[
                { l: "Waitlist (coach)", v: waitlistCount, c: G },
                { l: "Coachs créés", v: stepCreated, c: BLUE },
                { l: "Coachs payants", v: stepPaying, c: AMBER },
                { l: "Apps B2C (/candidature)", v: applicationsCount, c: "rgba(255,255,255,0.4)", muted: true },
              ].map((p, i) => (
                <div key={i} style={{ padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <span style={{ fontSize: 12, color: p.muted ? "rgba(255,255,255,0.4)" : "#fff", fontWeight: 500 }}>{p.l}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: p.v > 0 ? p.c : "rgba(255,255,255,0.25)", fontVariantNumeric: "tabular-nums" }}>{p.v}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ═══════ ACTIVITÉ PLATEFORME (proxy santé via les athlètes) ═══════ */}
        <div style={{ marginBottom: 24, animation: "cF 0.4s ease 0.25s both" }}>
          <SectionHead icon="activity" label="Activité plateforme" color={BLUE} meta={`48H · ${activityFeed.length} EVENTS`} />
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            {activityFeed.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Aucune activité dans les dernières 48h.</div>
            ) : (() => {
              const todayStr = new Date().toISOString().split("T")[0];
              const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
              const groups = {};
              activityFeed.forEach((ev) => {
                const d = new Date(ev.ts).toISOString().split("T")[0];
                if (!groups[d]) groups[d] = [];
                groups[d].push(ev);
              });
              return Object.keys(groups).sort().reverse().map((dKey, gi) => {
                const label = dKey === todayStr ? "Aujourd'hui" : dKey === yesterdayStr ? "Hier" : new Date(dKey).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "short" });
                const evs = groups[dKey];
                return (
                  <div key={dKey}>
                    <div style={{ padding: "10px 20px", borderTop: gi > 0 ? "1px solid rgba(255,255,255,0.03)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.012)" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: dKey === todayStr ? G : "rgba(255,255,255,0.4)" }}>{label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{evs.length}</span>
                    </div>
                    {evs.map((ev, i) => (
                      <div key={i} className="row-hover" style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid rgba(255,255,255,0.025)", transition: "background 0.15s" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontFamily: MONO, letterSpacing: "1px", color: "rgba(255,255,255,0.4)", width: 50, textTransform: "uppercase", fontWeight: 700 }}>{ev.type}</span>
                        <span style={{ flex: 1, fontSize: 12, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "rgba(255,255,255,0.85)" }}>{ev.athlete}</span>
                          <span style={{ color: "rgba(255,255,255,0.35)" }}> · coach {ev.coach}</span>
                        </span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{ev.detail}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.3)", width: 36, textAlign: "right", flexShrink: 0 }}>{rel(ev.ts)}</span>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* ═══════ FOOTER STRIP — system + readiness ═══════ */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, flexWrap: "wrap", animation: "cF 0.4s ease 0.3s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 10, fontFamily: MONO, color: G, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>System OK</span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO }}><span style={{ color: pushSubs.length > 0 ? G : "rgba(255,255,255,0.3)", fontWeight: 700 }}>{pushSubs.length}</span> push</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO }}><span style={{ color: "#fff", fontWeight: 700 }}>{programmes.length}</span> programmes</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO }}><span style={{ color: "#fff", fontWeight: 700 }}>{allClients.length}</span> athlètes</span>
          {!stripeReady && (
            <>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: 10, color: AMBER, fontFamily: MONO, letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Ic name="alert" size={11} color={AMBER} /> Migration 008 pending
              </span>
            </>
          )}
        </div>

      </div>

      {/* ═══════ FLOATING PILL — quick actions ═══════ */}
      <nav style={{ position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 0, background: "rgba(15,15,15,0.78)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 100, padding: 5, zIndex: 100, WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
        {[
          { id: "refresh", icon: "refresh", color: refreshing ? BLUE : "rgba(255,255,255,0.6)", onClick: () => { haptic.selection(); loadData(true); }, title: "Refresh", active: refreshing, activeBg: BLUE_DIM },
          { id: "coach", icon: "users", color: G, onClick: () => { haptic.medium(); onSwitchToCoach?.(); }, title: "Vue coach", hoverBg: "rgba(2,209,186,0.1)" },
        ].map((b) => (
          <button
            key={b.id}
            onClick={b.onClick}
            title={b.title}
            style={{
              width: 46, height: 46, borderRadius: 100, border: "none",
              background: b.active ? b.activeBg : "transparent",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { if (!b.active) e.currentTarget.style.background = b.hoverBg || "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { if (!b.active) e.currentTarget.style.background = "transparent"; }}
          >
            <Ic name={b.icon} size={16} color={b.color} />
          </button>
        ))}
      </nav>

      {/* ═══════ FUNNEL DIALOG — liste des coachs d'une étape ═══════ */}
      {funnelDialog && (
        <FunnelDialog
          dialog={funnelDialog}
          onSelectCoach={(c) => { setFunnelDialog(null); setDetailCoach(c); }}
          onClose={() => setFunnelDialog(null)}
        />
      )}

      {/* ═══════ DRILL-DOWN COACH (full screen) ═══════ */}
      {detailCoach && (
        <CoachDetail
          coach={detailCoach}
          allClients={allClients}
          programmes={programmes}
          sessionLogs={sessionLogs}
          onClose={() => setDetailCoach(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  FunnelDialog — modal listant les coachs d'une étape du funnel
// ───────────────────────────────────────────────────────────────────────────
function FunnelDialog({ dialog, onSelectCoach, onClose }) {
  const { label, color, list } = dialog;
  // Lock scroll body pendant le modal
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const explanations = {
    created: "Tous les coachs qui ont un compte (table coaches).",
    setup: "Coachs qui ont validé leur onboarding business (objectif mensuel défini).",
    activated: "Coachs qui ont au moins 1 athlète invité.",
    engaged: "Coachs dont l'athlète a au moins 1 activité loggée OU 1 programme actif.",
    paying: "Coachs avec un abonnement Stripe actif (payent RB Perform).",
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: BODY, color: IVORY,
        animation: "cF 0.2s ease",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 540, maxHeight: "85vh",
        background: "#0a0a0a",
        border: `1px solid ${color}33`,
        borderRadius: 16,
        boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 80px ${color}10`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.25em", textTransform: "uppercase", color: color, opacity: 0.85 }}>{label}</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, color: IVORY, letterSpacing: "-0.02em", marginTop: 4, lineHeight: 1 }}>
              {list.length} coach{list.length > 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 36, height: 36, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic name="x" size={14} />
          </button>
        </div>

        {/* Explanation */}
        <div style={{ padding: "12px 22px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          {explanations[dialog.step]}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {list.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              Aucun coach à cette étape.
            </div>
          ) : (
            list.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onSelectCoach(c)}
                className="row-hover"
                style={{
                  width: "100%", padding: "14px 22px",
                  display: "flex", alignItems: "center", gap: 14,
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontFamily: "inherit", color: "inherit", textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: c.logo_url ? "transparent" : "rgba(2,209,186,0.08)",
                  backgroundImage: c.logo_url ? `url(${c.logo_url})` : "none",
                  backgroundSize: "cover", backgroundPosition: "center",
                  border: "1px solid rgba(2,209,186,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 15, color: G, overflow: "hidden",
                }}>
                  {!c.logo_url && (c.full_name || c.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.full_name || c.email}</span>
                    {c._mrr > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: AMBER, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 100, padding: "2px 7px", letterSpacing: "0.5px", textTransform: "uppercase" }}>{c._plan}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: MONO }}>
                    {c._athletes} ath. · {c._activeProgs}/{c._programmes} prog · {c._totalActivity} activités · {c._lastActivityTs ? `vu ${rel(c._lastActivityTs)}` : "jamais actif"}
                  </div>
                </div>
                <Ic name="arrowRight" size={11} color="rgba(255,255,255,0.3)" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
//  CoachDetail — drill-down full screen pour un coach
// ───────────────────────────────────────────────────────────────────────────
function CoachDetail({ coach, allClients, programmes, sessionLogs, onClose }) {
  const cls = allClients.filter((c) => c.coach_id === coach.id);
  const cIds = new Set(cls.map((c) => c.id));
  const cProgs = programmes.filter((p) => cIds.has(p.client_id));
  const sessions = sessionLogs.filter((s) => cIds.has(s.client_id));
  const athleteMrr = cls.filter((c) => c.subscription_status === "active" && c.subscription_plan).reduce((s, c) => s + ({ "3m": 120, "6m": 110, "12m": 100 }[c.subscription_plan] || 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#030303", overflowY: "auto", color: IVORY, fontFamily: BODY }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "25%", background: "radial-gradient(ellipse at 50% -15%, rgba(129,140,248,0.05), transparent 55%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 14px)", marginBottom: 28 }}>
          <button onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(240,236,228,0.4)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: BODY, padding: 0, marginBottom: 18 }}>
            <Ic name="arrowLeft" size={11} /> retour
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: coach.logo_url ? "transparent" : "rgba(2,209,186,0.08)", backgroundImage: coach.logo_url ? `url(${coach.logo_url})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid rgba(2,209,186,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: G, overflow: "hidden", flexShrink: 0 }}>
              {!coach.logo_url && (coach.full_name || coach.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 900, color: IVORY, letterSpacing: "-0.03em", margin: 0, lineHeight: 1 }}>
                {coach.full_name || coach.email}
              </h1>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                {coach.brand_name || "—"} · {coach.email}
                {coach.coach_slug && <span> · /coach/{coach.coach_slug}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          {[
            { l: "MRR Saas", v: coach._mrr ?? 0, suf: "€", c: BLUE },
            { l: "Athlètes", v: cls.length, c: G },
            { l: "Programmes", v: cProgs.length, c: "#fff" },
            { l: "Sessions 30j", v: sessions.length, c: AMBER },
            { l: "MRR athlètes", v: athleteMrr, suf: "€", c: "rgba(255,255,255,0.7)" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "16px 18px", background: "#0a0a0a" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{s.l}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 800, color: s.c, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.v}{s.suf || ""}</div>
            </div>
          ))}
        </div>

        {/* Athlètes */}
        <div style={{ marginBottom: 28 }}>
          <SectionHead icon="users" label="Athlètes" color={G} meta={`${cls.length}`} />
          {cls.length === 0 ? (
            <div style={{ padding: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Ce coach n'a pas encore invité d'athlète.</div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
              {cls.map((cl, i) => {
                const sub = cl.subscription_status;
                const subColor = sub === "active" ? G : sub === "trialing" ? AMBER : "rgba(255,255,255,0.3)";
                return (
                  <div key={cl.id} style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: cl.avatar_url ? "transparent" : "rgba(255,255,255,0.04)", backgroundImage: cl.avatar_url ? `url(${cl.avatar_url})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.6)", overflow: "hidden", flexShrink: 0 }}>
                      {!cl.avatar_url && (cl.full_name || cl.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{cl.full_name || cl.email}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: MONO, marginTop: 2 }}>
                        {cl.subscription_plan || "—"} · {sub || "—"}
                      </div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: subColor, flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Programmes */}
        {cProgs.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHead icon="spark" label="Programmes" color={BLUE} meta={`${cProgs.length}`} />
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
              {cProgs.slice(0, 8).map((p, i) => {
                const cl = allClients.find((c) => c.id === p.client_id);
                return (
                  <div key={p.id} style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: 12, borderTop: i > 0 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.is_active ? G : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: "#fff" }}>{p.programme_name || "—"}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{cl?.full_name?.split(" ")[0] || cl?.email?.split("@")[0] || "?"}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.uploaded_at ? rel(new Date(p.uploaded_at).getTime()) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div style={{ padding: "16px 18px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: MONO, lineHeight: 1.7 }}>
          <div>Créé le {new Date(coach.created_at).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric" })}</div>
          <div>Stripe : {coach.stripe_customer_id ? coach.stripe_customer_id : "non connecté"}</div>
          <div>Plan : {coach.subscription_plan || "free (migration 008 pending)"}</div>
          <div>Status : {coach.subscription_status || "—"}</div>
          {coach.monthly_revenue_goal > 0 && <div>Goal mensuel : {coach.monthly_revenue_goal.toLocaleString()}€</div>}
        </div>
      </div>
    </div>
  );
}
