import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const GOLD = "#f5c842";
const GOLD_DIM = "rgba(245,200,66,0.08)";
const GOLD_BORDER = "rgba(245,200,66,0.25)";
const G = "#02d1ba";
const RED = "#ef4444";
const ORANGE = "#f97316";
const PLAN_PRICES = { "3m": 120, "6m": 110, "12m": 100 };
const AVG_PRICE_PER_COACH = 400; // prix moyen abo coach/mois pour calcul paliers

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
    lightning: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  };
  return m[name] || null;
}

// ScoreRing SVG anime (comme dans FuelPage)
function ScoreRing({ score, size = 52, color }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const c = color || (score >= 70 ? G : score >= 40 ? ORANGE : RED);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: size * 0.28, fontWeight: 700, color: c }}>{score}</span>
      </div>
    </div>
  );
}

// Compteur anime (MRR qui monte de 0 a la valeur)
function AnimatedNumber({ value, duration = 1200, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const target = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
    if (target === 0) { setDisplay(0); return; }
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(target * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

// Horloge temps reel
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 100, color: "rgba(255,255,255,0.6)", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
      {String(time.getHours()).padStart(2, "0")}:{String(time.getMinutes()).padStart(2, "0")}
    </span>
  );
}

export default function SuperAdminDashboard({ onSwitchToCoach, onExit }) {
  const [coaches, setCoaches] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCoach, setExpandedCoach] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastType, setBroadcastType] = useState("custom");
  const [sending, setSending] = useState(false);
  const [mrrGoal, setMrrGoal] = useState(() => parseInt(localStorage.getItem("ceo_mrr_goal") || "5000"));
  const [programmes, setProgrammes] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: cl }, { data: progs }] = await Promise.all([
      supabase.from("coaches").select("*").order("created_at"),
      supabase.from("clients").select("id,email,full_name,coach_id,subscription_plan,subscription_status,subscription_start_date,subscription_end_date,onboarding_done,created_at").order("created_at", { ascending: false }),
      supabase.from("programmes").select("id,client_id,is_active,uploaded_at").order("uploaded_at", { ascending: false }),
    ]);
    setCoaches(c || []);
    setAllClients(cl || []);
    setProgrammes(progs || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleCoach = async (coach) => {
    await supabase.from("coaches").update({ is_active: !coach.is_active }).eq("id", coach.id);
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: !c.is_active } : c));
  };

  const updateGoal = () => {
    const v = window.prompt("Objectif MRR mensuel (€) :", String(mrrGoal));
    if (v && !isNaN(parseInt(v))) {
      const n = parseInt(v);
      setMrrGoal(n);
      localStorage.setItem("ceo_mrr_goal", String(n));
    }
  };

  const TEMPLATES = {
    feature: "Nouvelle fonctionnalite disponible sur RB Perform ! Connectez-vous pour la decouvrir.",
    renewal: "Rappel : pensez a renouveler votre abonnement pour continuer a accompagner vos clients sans interruption.",
    custom: "",
  };

  const sendBroadcast = async () => {
    const msg = broadcastType === "custom" ? broadcastMsg.trim() : TEMPLATES[broadcastType];
    if (!msg) return;
    setSending(true);
    alert("Broadcast envoye a " + coaches.length + " coachs :\n\n" + msg);
    setBroadcastMsg("");
    setSending(false);
  };

  // ===== METRIQUES =====
  const activeCoaches = coaches.filter(c => c.is_active);
  const totalClients = allClients.length;
  const activeSubs = allClients.filter(c => c.subscription_status === "active" && c.subscription_plan);
  const mrr = activeSubs.reduce((s, c) => s + (PLAN_PRICES[c.subscription_plan] || 0), 0);
  const arr = mrr * 12;
  const onboarded = allClients.filter(c => c.onboarding_done);
  const retentionRate = onboarded.length > 0 ? Math.round((activeSubs.length / onboarded.length) * 100) : 0;
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const today = new Date().toISOString().split("T")[0];
  const newCl30 = allClients.filter(c => new Date(c.created_at) >= d30).length;
  const newCo30 = coaches.filter(c => new Date(c.created_at) >= d30).length;
  const newClToday = allClients.filter(c => c.created_at?.startsWith(today)).length;
  const mrrProgress = Math.min(100, Math.round((mrr / mrrGoal) * 100));
  const coachesNeeded = Math.max(0, Math.ceil((mrrGoal - mrr) / AVG_PRICE_PER_COACH));
  const avgRevenuePerCoach = activeCoaches.length > 0 ? Math.round(mrr / activeCoaches.length) : 0;

  // Previsions
  const ret = retentionRate / 100;
  const prev3m = mrr * 3;
  const prev6m = Math.round(mrr * 6 * ret);
  const prev12m = Math.round(mrr * 12 * ret * ret);

  // Enrichir coachs
  const enriched = coaches.map(coach => {
    const cls = allClients.filter(c => c.coach_id === coach.id);
    const act = cls.filter(c => c.subscription_status === "active" && c.subscription_plan);
    const coachMrr = act.reduce((s, c) => s + (PLAN_PRICES[c.subscription_plan] || 0), 0);
    const coachOnb = cls.filter(c => c.onboarding_done);
    const coachRet = coachOnb.length > 0 ? Math.round((act.length / coachOnb.length) * 100) : 0;
    const actScore = cls.length > 0 ? Math.min(40, Math.round((act.length / cls.length) * 40)) : 0;
    const retScore = Math.min(30, Math.round((coachRet / 100) * 30));
    const mrrSc = Math.min(30, Math.round(Math.min(coachMrr / 500, 1) * 30));
    const health = actScore + retScore + mrrSc;
    const months = Math.max(1, Math.round((Date.now() - new Date(coach.created_at).getTime()) / (30 * 86400000)));
    const ltv = coachMrr * months;
    const totalRevenue = coachMrr * months; // approximation
    const progsCount = programmes.filter(p => cls.some(c => c.id === p.client_id)).length;
    return { ...coach, _cls: cls, _act: act.length, _mrr: coachMrr, _ret: coachRet, _health: health, _ltv: ltv, _total: cls.length, _totalRevenue: totalRevenue, _progsCount: progsCount, _months: months };
  }).sort((a, b) => b._mrr - a._mrr);

  const bestCoach = enriched.length > 0 ? enriched.reduce((best, c) => c._health > best._health ? c : best, enriched[0]) : null;
  const churnRisk = enriched.filter(c => c._health < 40 && c._total > 0);
  const expansionTargets = enriched.filter(c => c._total >= 15 && c._mrr < 1500);
  const needHelp = enriched.filter(c => c._total === 0 && c.is_active && (Date.now() - new Date(c.created_at).getTime()) / 86400000 >= 7);

  const sectionHeader = (title, icon) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <Ic name={icon} size={14} color={GOLD} />
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(245,200,66,0.6)" }}>{title}</div>
    </div>
  );

  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 18px" };
  const goldCard = { ...card, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 40, height: 40, border: `2.5px solid ${GOLD_DIM}`, borderTopColor: GOLD, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#f5f0e8" }}>
      <style>{`
        @keyframes ceoFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .ceo-card:hover{border-color:rgba(245,200,66,0.3)!important;cursor:pointer}
      `}</style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 50% -15%, rgba(245,200,66,0.08), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ===== HEADER ===== */}
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 12px)", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: "4px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 100, fontSize: 9, fontWeight: 800, letterSpacing: "3px", color: GOLD, textTransform: "uppercase" }}>CEO</div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>RB Perform</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LiveClock />
              <button onClick={onSwitchToCoach} style={{ padding: "7px 14px", background: "rgba(2,209,186,0.06)", border: `1px solid rgba(2,209,186,0.2)`, borderRadius: 10, color: G, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Coach</button>
              <button onClick={onExit} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>App</button>
            </div>
          </div>
        </div>

        {/* ══════════ 1. PULSE TEMPS REEL ══════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease both" }}>
          {sectionHeader("Pulse temps reel", "lightning")}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 56, fontWeight: 200, color: GOLD, letterSpacing: "-4px", lineHeight: 1 }}>
                <AnimatedNumber value={mrr} suffix=" €" />
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>MRR · {activeSubs.length} abos · {activeCoaches.length} coachs · ARR {arr.toLocaleString()} €</div>
              <div style={{ fontSize: 11, color: "rgba(245,200,66,0.6)", marginTop: 6, fontWeight: 600 }}>
                Prochain palier : {mrrGoal.toLocaleString()} € — il te manque {coachesNeeded} coach{coachesNeeded > 1 ? "s" : ""}
              </div>
              {/* Aujourd'hui */}
              <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                {[
                  { l: "Signups auj.", v: newClToday, c: newClToday > 0 ? G : "rgba(255,255,255,0.35)" },
                  { l: "Retention", v: retentionRate + "%", c: retentionRate >= 80 ? G : ORANGE },
                  { l: "Nouveaux 30j", v: "+" + newCl30, c: newCl30 > 0 ? G : "rgba(255,255,255,0.35)" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Objectif modifiable */}
            <div onClick={updateGoal} style={{ ...goldCard, width: 170, textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(245,200,66,0.5)", marginBottom: 8 }}>Objectif MRR</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 200, color: GOLD }}>{mrrProgress}%</div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: mrrProgress + "%", background: `linear-gradient(90deg, ${GOLD}, #f5a623)`, borderRadius: 2, transition: "width 0.8s ease" }} />
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>{mrr.toLocaleString()} / {mrrGoal.toLocaleString()} €</div>
              <div style={{ fontSize: 8, color: "rgba(245,200,66,0.4)", marginTop: 4 }}>tap pour modifier</div>
            </div>
          </div>
        </div>

        {/* ══════════ 2. SANTE DES COACHS ══════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.1s both" }}>
          {sectionHeader("Sante des coachs", "users")}
          {avgRevenuePerCoach > 0 && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
              Revenu moyen par coach : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: GOLD }}>{avgRevenuePerCoach} €</span> / mois
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enriched.map((coach, i) => {
              const expanded = expandedCoach === coach.id;
              const isBest = bestCoach && bestCoach.id === coach.id && enriched.length > 1;
              return (
                <div key={coach.id} className="ceo-card" onClick={() => setExpandedCoach(expanded ? null : coach.id)} style={{
                  ...card, transition: "all 0.2s",
                  border: expanded ? `1px solid ${GOLD_BORDER}` : isBest ? `1px solid ${G}40` : card.border,
                  animation: `ceoFade ${0.2 + i * 0.04}s ease both`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <ScoreRing score={coach._health} size={50} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#f5f0e8" }}>{coach.full_name || coach.email}</span>
                        {isBest && <span style={{ fontSize: 8, fontWeight: 800, color: GOLD, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 100, padding: "2px 8px", letterSpacing: "0.5px" }}>TOP PERFORMER</span>}
                        {!coach.is_active && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", borderRadius: 100, padding: "2px 7px" }}>Off</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{coach.brand_name || coach.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                      {[
                        { v: coach._total, l: "Clients", c: "#f5f0e8" },
                        { v: coach._mrr + "€", l: "MRR", c: GOLD },
                        { v: coach._ret + "%", l: "Ret.", c: coach._ret >= 80 ? G : coach._ret >= 60 ? ORANGE : RED },
                        { v: Math.round(coach._ltv / 1000) + "k€", l: "LTV", c: "rgba(255,255,255,0.45)" },
                      ].map((m, j) => (
                        <div key={j} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 200, color: m.c }}>{m.v}</div>
                          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2, fontWeight: 700 }}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", animation: "ceoFade 0.2s ease" }}>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                        <span>Inscrit {new Date(coach.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                        <span>·</span>
                        <span>Total encaisse : <strong style={{ color: GOLD }}>{coach._totalRevenue.toLocaleString()} €</strong></span>
                        <span>·</span>
                        <span>{coach._progsCount} programmes crees</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleCoach(coach); }} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: coach.is_active ? "rgba(239,68,68,0.06)" : GOLD_DIM, border: `1px solid ${coach.is_active ? "rgba(239,68,68,0.2)" : GOLD_BORDER}`, color: coach.is_active ? RED : GOLD, cursor: "pointer", fontFamily: "inherit" }}>
                          {coach.is_active ? "Desactiver" : "Activer"}
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {coach._cls.slice(0, 8).map(cl => {
                          const dl = cl.subscription_end_date ? Math.ceil((new Date(cl.subscription_end_date) - Date.now()) / 86400000) : null;
                          return (
                            <div key={cl.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(255,255,255,0.015)", borderRadius: 6, fontSize: 11 }}>
                              <span style={{ color: "rgba(255,255,255,0.6)" }}>{cl.full_name || cl.email}</span>
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: dl !== null ? (dl <= 0 ? RED : dl <= 14 ? ORANGE : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.2)" }}>
                                {dl !== null ? (dl <= 0 ? "Expire" : dl + "j") : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════ 3. LEVIER CROISSANCE ══════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.2s both" }}>
          {sectionHeader("Levier croissance", "trending")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { l: "Prevision 3 mois", v: prev3m.toLocaleString() + " €", sub: activeCoaches.length + " coachs", c: "#f5f0e8" },
              { l: "Prevision 6 mois", v: prev6m.toLocaleString() + " €", sub: Math.round(activeCoaches.length * ret) + " coachs proj.", c: GOLD },
              { l: "Prevision 12 mois", v: prev12m.toLocaleString() + " €", sub: "ret. composee " + retentionRate + "%", c: GOLD },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{s.l}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 200, color: s.c, letterSpacing: "-1px" }}>{s.v}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Clients par coach</div>
              <div style={{ fontSize: 10, color: "rgba(245,200,66,0.5)", fontWeight: 700 }}>Moy: {avgRevenuePerCoach} €/coach</div>
            </div>
            {enriched.filter(c => c._total > 0).map((c, i) => {
              const maxCl = Math.max(1, ...enriched.map(e => e._total));
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 70, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{c.full_name?.split(" ")[0]}</div>
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: (c._total / maxCl * 100) + "%", background: GOLD, borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#f5f0e8", width: 30, textAlign: "right" }}>{c._total}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════ 4. INTELLIGENCE PREDICTIVE ══════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.3s both" }}>
          {sectionHeader("Intelligence predictive", "alert")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Churn */}
            <div style={{ ...card, background: churnRisk.length > 0 ? "rgba(239,68,68,0.03)" : card.background }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: churnRisk.length > 0 ? RED : "rgba(255,255,255,0.3)", marginBottom: 10 }}>Churn 30j</div>
              {churnRisk.length === 0 ? <div style={{ fontSize: 11, color: G }}>Aucun risque</div> : churnRisk.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{c.full_name?.split(" ")[0]}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", color: RED, fontWeight: 700 }}>{c._health}</span>
                </div>
              ))}
            </div>
            {/* Expansion */}
            <div style={{ ...card, background: expansionTargets.length > 0 ? GOLD_DIM : card.background }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: expansionTargets.length > 0 ? GOLD : "rgba(255,255,255,0.3)", marginBottom: 10 }}>Expansion</div>
              {expansionTargets.length === 0 ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Aucune cible</div> : expansionTargets.map((c, i) => (
                <div key={i} style={{ fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{c.full_name?.split(" ")[0]}</span>
                  <span style={{ color: GOLD, fontWeight: 700, marginLeft: 6 }}>{c._total} clients → +{Math.round((c._total * 10) - c._mrr)}€ potentiel</span>
                </div>
              ))}
            </div>
            {/* Opportunites */}
            <div style={{ ...card, background: needHelp.length > 0 ? "rgba(249,115,22,0.03)" : card.background }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: needHelp.length > 0 ? ORANGE : "rgba(255,255,255,0.3)", marginBottom: 10 }}>Opportunites</div>
              {needHelp.length === 0 ? <div style={{ fontSize: 11, color: G }}>Tous les coachs sont lances</div> : (
                <div>
                  <div style={{ fontSize: 10, color: ORANGE, fontWeight: 700, marginBottom: 6 }}>{needHelp.length} coach{needHelp.length > 1 ? "s" : ""} a aider</div>
                  {needHelp.map((c, i) => (
                    <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>{c.full_name?.split(" ")[0]} · 0 client depuis {Math.round((Date.now() - new Date(c.created_at).getTime()) / 86400000)}j</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════ 5. ACTIONS RAPIDES CEO ══════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.4s both" }}>
          {sectionHeader("Actions rapides", "flame")}
          <div style={{ ...goldCard, marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(245,200,66,0.5)", marginBottom: 10 }}>Broadcast coachs</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {[
                { id: "feature", label: "Nouvelle feature" },
                { id: "renewal", label: "Rappel renouvellement" },
                { id: "custom", label: "Message libre" },
              ].map(t => (
                <button key={t.id} onClick={() => { setBroadcastType(t.id); setBroadcastMsg(t.id === "custom" ? "" : TEMPLATES[t.id]); }} style={{
                  padding: "6px 12px", borderRadius: 100, fontSize: 10, fontWeight: 700,
                  background: broadcastType === t.id ? GOLD_DIM : "rgba(255,255,255,0.03)",
                  border: `1px solid ${broadcastType === t.id ? GOLD_BORDER : "rgba(255,255,255,0.06)"}`,
                  color: broadcastType === t.id ? GOLD : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontFamily: "inherit",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea value={broadcastType === "custom" ? broadcastMsg : TEMPLATES[broadcastType]} onChange={e => { setBroadcastType("custom"); setBroadcastMsg(e.target.value); }} placeholder="Message aux coachs..." rows={2} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#f5f0e8", fontFamily: "inherit", fontSize: 13, resize: "none", outline: "none" }} />
              <button onClick={sendBroadcast} disabled={sending} style={{ alignSelf: "flex-end", padding: "10px 18px", borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}, #f5a623)`, border: "none", color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>Envoyer</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { l: "Coachs actifs", v: activeCoaches.length + " / " + coaches.length, icon: "check", c: G },
              { l: "Abos expirant 30j", v: allClients.filter(c => { const d = c.subscription_end_date ? Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000) : 999; return d > 0 && d <= 30; }).length, icon: "alert", c: ORANGE },
              { l: "Sans abonnement", v: allClients.filter(c => !c.subscription_plan).length, icon: "users", c: "rgba(255,255,255,0.5)" },
            ].map((a, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ic name={a.icon} size={12} color={a.c} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{a.l}</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 200, color: a.c }}>{a.v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
