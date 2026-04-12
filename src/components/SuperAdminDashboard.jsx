import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

// ===== CHARTE CEO : noir absolu + blanc ivoire + accents sobres =====
const BLUE = "#818cf8"; // indigo clair — plus raffine que le bleu electrique
const BLUE_DIM = "rgba(129,140,248,0.08)";
const BLUE_BORDER = "rgba(129,140,248,0.2)";
const IVORY = "#f0ece4"; // blanc ivoire chaud — premium
const CEO_FONT = "'Bebas Neue','DM Sans',-apple-system,sans-serif"; // titres CEO
const BODY_FONT = "'DM Sans',-apple-system,Inter,sans-serif"; // corps premium
const G = "#02d1ba";
const RED = "#ef4444";
const ORANGE = "#f97316";
const PLAN_PRICES = { "3m": 120, "6m": 110, "12m": 100 };

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
  };
  return m[name] || null;
}

// Compteur anime
function AnimNum({ value, suffix = "" }) {
  const [d, setD] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const t = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
    if (!t) { setD(0); return; }
    const s = Date.now();
    const a = () => { const p = Math.min((Date.now() - s) / 1000, 1); setD(Math.round(t * (1 - Math.pow(1 - p, 3)))); if (p < 1) ref.current = requestAnimationFrame(a); };
    ref.current = requestAnimationFrame(a);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{d.toLocaleString()}{suffix}</>;
}

// Horloge
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <>{String(t.getHours()).padStart(2, "0")}:{String(t.getMinutes()).padStart(2, "0")}</>;
}

// Score ring
function Ring({ score, size = 48 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  const c = score >= 70 ? G : score >= 40 ? ORANGE : RED;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: size * 0.26, fontWeight: 700, color: c }}>{score}</div>
    </div>
  );
}

export default function SuperAdminDashboard({ onSwitchToCoach, onExit }) {
  const [coaches, setCoaches] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailView, setDetailView] = useState(null); // null | "mrr" | "clients" | "retention" | "coachs" | "churn" | "growth"
  const [expandedCoach, setExpandedCoach] = useState(null);
  const [mrrGoal, setMrrGoal] = useState(() => parseInt(localStorage.getItem("ceo_mrr_goal") || "5000"));

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: cl }, { data: pr }] = await Promise.all([
      supabase.from("coaches").select("*").order("created_at"),
      supabase.from("clients").select("id,email,full_name,coach_id,subscription_plan,subscription_status,subscription_start_date,subscription_end_date,onboarding_done,created_at"),
      supabase.from("programmes").select("id,client_id,is_active,uploaded_at"),
    ]);
    setCoaches(c || []); setAllClients(cl || []); setProgrammes(pr || []); setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleCoach = async (coach) => {
    await supabase.from("coaches").update({ is_active: !coach.is_active }).eq("id", coach.id);
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: !c.is_active } : c));
  };

  // ===== METRIQUES =====
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

  // Enrichir coachs
  const enriched = coaches.map(coach => {
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
    return { ...coach, _cls: cls, _act: act.length, _mrr: cMrr, _ret: cRet, _health: health, _ltv: cMrr * months, _total: cls.length, _progs: progs, _months: months };
  }).sort((a, b) => b._mrr - a._mrr);

  const churn = enriched.filter(c => c._health < 40 && c._total > 0);
  const bestCoach = enriched.length > 0 ? enriched.reduce((b, c) => c._health > b._health ? c : b, enriched[0]) : null;

  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", transition: "all 0.15s" };
  const secTitle = (t, ic) => (<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Ic name={ic} size={14} color={BLUE} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(59,130,246,0.6)" }}>{t}</span></div>);

  if (loading) return <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width: 36, height: 36, border: `2px solid ${BLUE_DIM}`, borderTopColor: BLUE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#030303", fontFamily: BODY_FONT, color: IVORY }}>
      <style>{`@keyframes cF{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes ceoPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}.sa-c:hover{transform:translateY(-2px)!important;box-shadow:0 12px 32px rgba(0,0,0,0.4)!important}`}</style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 50% -20%, rgba(129,140,248,0.06), transparent 55%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* HEADER PREMIUM CEO */}
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 16px)", paddingBottom: 18, marginBottom: 24, borderBottom: "1px solid rgba(240,236,228,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Identite CEO */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 8, height: 8 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BLUE, boxShadow: `0 0 12px ${BLUE}` }} />
                <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: BLUE, opacity: 0.3, animation: "ceoPulse 2s ease-in-out infinite" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 8, letterSpacing: "4px", color: "rgba(129,140,248,0.7)", fontWeight: 700, textTransform: "uppercase", fontFamily: BODY_FONT }}>Live Cockpit</div>
                <div style={{ fontFamily: CEO_FONT, fontSize: 15, letterSpacing: "3px", color: IVORY, textTransform: "uppercase" }}>CEO Dashboard</div>
              </div>
            </div>

            {/* Horloge + switches */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 300, color: "rgba(240,236,228,0.5)", letterSpacing: "1px", fontVariantNumeric: "tabular-nums" }}>
                <Clock />
              </div>
              <div style={{ width: 1, height: 20, background: "rgba(240,236,228,0.08)" }} />
              <button
                onClick={onSwitchToCoach}
                title="Passer en mode Coach"
                style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(2,209,186,0.04)", border: `1px solid rgba(2,209,186,0.15)`, color: G, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.1)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(2,209,186,0.04)"; e.currentTarget.style.borderColor = "rgba(2,209,186,0.15)"; }}
              >
                <Ic name="users" size={14} color={G} />
              </button>
              <button
                onClick={onExit}
                title="Retour a l'app"
                style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(240,236,228,0.02)", border: "1px solid rgba(240,236,228,0.06)", color: "rgba(240,236,228,0.4)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,236,228,0.04)"; e.currentTarget.style.color = "rgba(240,236,228,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(240,236,228,0.02)"; e.currentTarget.style.color = "rgba(240,236,228,0.4)"; }}
              >
                <Ic name="arrow-left" size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ===== HERO MRR ===== */}
        <div style={{ marginBottom: 36, animation: "cF 0.4s ease both" }}>
          <div style={{ fontFamily: CEO_FONT, fontSize: 72, color: IVORY, letterSpacing: "2px", lineHeight: 0.9 }}>
            <AnimNum value={mrr} suffix=" €" />
          </div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: "rgba(240,236,228,0.4)", marginTop: 10, fontWeight: 500 }}>Monthly Recurring Revenue · {subs.length} abonnements · {active.length} coachs</div>
          <div style={{ fontFamily: CEO_FONT, fontSize: 22, color: "rgba(240,236,228,0.25)", letterSpacing: "2px", marginTop: 4 }}>ARR {arr.toLocaleString()} €</div>
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { v: total, l: "clients" },
              { v: ret + "%", l: "retention", c: ret >= 80 ? G : ret >= 60 ? ORANGE : RED },
              { v: "+" + newCl30, l: "30 jours", c: newCl30 > 0 ? G : "rgba(255,255,255,0.35)" },
              { v: newToday, l: "aujourd'hui", c: newToday > 0 ? BLUE : "rgba(255,255,255,0.35)" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: s.c || "#fff" }}>{s.v}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{s.l}</span>
              </div>
            ))}
          </div>
          {/* Objectif */}
          <div onClick={() => { const v = window.prompt("Objectif MRR :", String(mrrGoal)); if (v && !isNaN(parseInt(v))) { setMrrGoal(parseInt(v)); localStorage.setItem("ceo_mrr_goal", v); } }} style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: mrrPct + "%", background: BLUE, borderRadius: 2, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: BLUE }}>{mrrPct}%</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>de {mrrGoal.toLocaleString()} €</span>
          </div>
        </div>

        {/* ===== CARDS METRIQUES — remplies, colorees, comme le CTA "Voir clients" ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 32, animation: "cF 0.4s ease 0.1s both" }}>
          {[
            { k: "mrr", l: "Revenus", v: mrr.toLocaleString() + " €", ic: "chart", bg: "linear-gradient(135deg, #1e1b4b, #312e81)", ac: "#818cf8", sub: avgPerCoach + " €/coach" },
            { k: "clients", l: "Clients", v: total, ic: "users", bg: "linear-gradient(135deg, #0c4a6e, #075985)", ac: "#38bdf8", sub: subs.length + " abonnements" },
            { k: "retention", l: "Retention", v: ret + "%", ic: "check", bg: ret >= 80 ? "linear-gradient(135deg, #064e3b, #065f46)" : "linear-gradient(135deg, #431407, #7c2d12)", ac: ret >= 80 ? "#34d399" : "#fb923c", sub: subs.length + " sur " + onb.length },
            { k: "coachs", l: "Coachs", v: active.length, ic: "flame", bg: "linear-gradient(135deg, #2e1065, #4c1d95)", ac: "#a78bfa", sub: coaches.length + " inscrits" },
            { k: "growth", l: "Croissance", v: "+" + newCl30, ic: "trending", bg: newCl30 > 0 ? "linear-gradient(135deg, #052e16, #14532d)" : "linear-gradient(135deg, #171717, #262626)", ac: newCl30 > 0 ? "#4ade80" : "#525252", sub: "30 derniers jours" },
            { k: "churn", l: "Risque", v: churn.length, ic: "alert", bg: churn.length > 0 ? "linear-gradient(135deg, #450a0a, #7f1d1d)" : "linear-gradient(135deg, #052e16, #14532d)", ac: churn.length > 0 ? "#f87171" : "#4ade80", sub: churn.length > 0 ? "action requise" : "aucun risque" },
          ].map((m, i) => (
            <div key={m.k} className="sa-c" onClick={() => setDetailView(m.k)} style={{
              background: m.bg,
              border: `1px solid ${m.ac}18`,
              borderRadius: 18, padding: "22px 20px",
              cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: `0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 ${m.ac}12`,
              position: "relative", overflow: "hidden",
              animation: `cF ${0.15 + i * 0.04}s ease both`,
            }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${m.ac}15, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontFamily: BODY_FONT, fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: m.ac, opacity: 0.7 }}>{m.l}</span>
                  <Ic name={m.ic} size={15} color={m.ac} />
                </div>
                <div style={{ fontFamily: CEO_FONT, fontSize: 36, color: IVORY, letterSpacing: "1px", lineHeight: 1 }}>{m.v}</div>
                <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: "rgba(240,236,228,0.45)", marginTop: 10, fontWeight: 500 }}>{m.sub}</div>
              </div>
            </div>
          ))}
        </div>

      {/* ===== FENETRES PLEIN ECRAN PAR CARTE ===== */}
      {detailView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#030303", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: BODY_FONT, color: IVORY }}>
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "25%", background: "radial-gradient(ellipse at 50% -15%, rgba(129,140,248,0.05), transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "0 20px 80px" }}>
            {/* Header */}
            <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 12px)", marginBottom: 28 }}>
              <button onClick={() => setDetailView(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(240,236,228,0.3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: BODY_FONT, padding: 0, marginBottom: 16 }}>
                <Ic name="arrow-left" size={12} /> Retour
              </button>
              <h1 style={{ fontFamily: CEO_FONT, fontSize: 48, color: IVORY, letterSpacing: "2px", margin: 0, lineHeight: 0.95 }}>
                {{ mrr: "REVENUS", clients: "CLIENTS", retention: "RETENTION", coachs: "COACHS", growth: "CROISSANCE", churn: "RISQUE" }[detailView]}
              </h1>
            </div>

            {/* === FENETRE MRR === */}
            {detailView === "mrr" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
                  {[{ l: "MRR", v: mrr.toLocaleString() + " €", c: BLUE }, { l: "ARR", v: arr.toLocaleString() + " €", c: "#fff" }, { l: "Moy/coach", v: avgPerCoach + " €", c: BLUE }].map((s, i) => (
                    <div key={i} style={{ ...card, textAlign: "center", cursor: "default" }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: s.c }}>{s.v}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 6, fontWeight: 700 }}>{s.l}</div></div>
                  ))}
                </div>
                {enriched.filter(c => c._mrr > 0).map(c => (
                  <div key={c.id} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Ring score={c._health} size={44} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{c.brand_name} · {c._total} clients · Ret. {c._ret}%</div>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: BLUE }}>{c._mrr}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>€</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* === FENETRE CLIENTS === */}
            {detailView === "clients" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allClients.map((cl, i) => {
                  const dl = cl.subscription_end_date ? Math.ceil((new Date(cl.subscription_end_date) - Date.now()) / 86400000) : null;
                  const coach = coaches.find(c => c.id === cl.coach_id);
                  return (
                    <div key={cl.id} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, animation: `cF ${0.1 + i * 0.02}s ease both` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: cl.subscription_status === "active" ? BLUE_DIM : "rgba(255,255,255,0.03)", border: `2px solid ${cl.subscription_status === "active" ? BLUE_BORDER : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: cl.subscription_status === "active" ? BLUE : "rgba(255,255,255,0.3)", flexShrink: 0 }}>{(cl.full_name || cl.email || "?")[0].toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.full_name || cl.email}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{cl.email}{coach ? ` · ${coach.brand_name || coach.full_name}` : ""}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {cl.subscription_plan && <div style={{ fontSize: 10, fontWeight: 700, color: BLUE }}>{cl.subscription_plan}</div>}
                          {dl !== null && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: dl <= 0 ? RED : dl <= 14 ? ORANGE : "rgba(255,255,255,0.35)", marginTop: 2 }}>{dl <= 0 ? "Expire" : dl + "j"}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === FENETRE RETENTION === */}
            {detailView === "retention" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[{ l: "Actifs", v: subs.length, c: G }, { l: "Inactifs", v: onb.length - subs.length, c: ORANGE }, { l: "Taux", v: ret + "%", c: ret >= 80 ? G : ORANGE }].map((s, i) => (
                    <div key={i} style={{ ...card, textAlign: "center", cursor: "default", padding: 20 }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: s.c }}>{s.v}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 8, fontWeight: 700 }}>{s.l}</div></div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                  {subs.length} clients avec un abonnement actif sur {onb.length} clients onboardes.
                  {onb.length - subs.length > 0 && ` ${onb.length - subs.length} client${onb.length - subs.length > 1 ? "s" : ""} sans abonnement actif.`}
                </div>
              </div>
            )}

            {/* === FENETRE COACHS === */}
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
                          {!c.is_active && <span style={{ fontSize: 7, color: RED, background: "rgba(239,68,68,0.08)", borderRadius: 100, padding: "2px 7px", fontWeight: 700 }}>Off</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{c.brand_name} · {c._total} clients</div>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 200, color: BLUE }}>{c._mrr}€</div><div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>MRR</div></div>
                        <div style={{ textAlign: "center" }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 200, color: c._ret >= 80 ? G : ORANGE }}>{c._ret}%</div><div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>RET</div></div>
                      </div>
                    </div>
                    {expandedCoach === c.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", animation: "cF 0.2s ease" }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
                          <span>Inscrit {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                          <span>· {c._progs} programmes</span>
                          <span>· LTV {c._ltv.toLocaleString()} €</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCoach(c); }} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: c.is_active ? "rgba(239,68,68,0.06)" : BLUE_DIM, border: `1px solid ${c.is_active ? "rgba(239,68,68,0.2)" : BLUE_BORDER}`, color: c.is_active ? RED : BLUE, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
                          {c.is_active ? "Desactiver" : "Activer"}
                        </button>
                        {c._cls.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {c._cls.map(cl => {
                              const dl = cl.subscription_end_date ? Math.ceil((new Date(cl.subscription_end_date) - Date.now()) / 86400000) : null;
                              return (
                                <div key={cl.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.015)", borderRadius: 8, fontSize: 11 }}>
                                  <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{cl.full_name || cl.email}</span>
                                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: dl !== null ? (dl <= 0 ? RED : dl <= 14 ? ORANGE : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.2)" }}>{dl !== null ? (dl <= 0 ? "Expire" : dl + "j") : "—"}</span>
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

            {/* === FENETRE CROISSANCE === */}
            {detailView === "growth" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[{ l: "Prevision 3m", v: (mrr * 3).toLocaleString() + " €" }, { l: "Prevision 6m", v: Math.round(mrr * 6 * ret / 100).toLocaleString() + " €" }, { l: "Prevision 12m", v: Math.round(mrr * 12 * Math.pow(ret / 100, 2)).toLocaleString() + " €" }].map((s, i) => (
                    <div key={i} style={{ ...card, textAlign: "center", cursor: "default", padding: 20 }}><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 200, color: "#fff" }}>{s.v}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 8, fontWeight: 700 }}>{s.l}</div></div>
                  ))}
                </div>
                <div style={{ ...card, cursor: "default", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Clients par coach</div>
                  {enriched.filter(c => c._total > 0).map(c => {
                    const mx = Math.max(1, ...enriched.map(e => e._total));
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 70, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{c.full_name?.split(" ")[0]}</div>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: (c._total / mx * 100) + "%", background: BLUE, borderRadius: 3 }} /></div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#fff", width: 30, textAlign: "right" }}>{c._total}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Base : {ret}% retention · {active.length} coachs · {newCl30} nouveaux clients 30j</div>
              </div>
            )}

            {/* === FENETRE CHURN === */}
            {detailView === "churn" && (
              <div>
                {churn.length === 0 ? (
                  <div style={{ ...card, cursor: "default", textAlign: "center", padding: 40 }}>
                    <Ic name="check" size={32} color={G} />
                    <div style={{ fontSize: 16, fontWeight: 800, color: G, marginTop: 12 }}>Aucun risque de churn</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Tous les coachs ont un score sante superieur a 40.</div>
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
                          <span style={{ fontSize: 9, fontWeight: 800, color: RED, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 100, padding: "4px 12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Risque</span>
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

      </div>
    </div>
  );
}
