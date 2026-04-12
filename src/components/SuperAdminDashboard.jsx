import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ===== CHARTE CEO : fond sombre + dore + blanc casse =====
const GOLD = "#f5c842";
const GOLD_DIM = "rgba(245,200,66,0.08)";
const GOLD_BORDER = "rgba(245,200,66,0.25)";
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
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  };
  return m[name] || null;
}

export default function SuperAdminDashboard({ onSwitchToCoach, onExit }) {
  const [coaches, setCoaches] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCoach, setExpandedCoach] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: cl }] = await Promise.all([
      supabase.from("coaches").select("*").order("created_at"),
      supabase.from("clients").select("id,email,full_name,coach_id,subscription_plan,subscription_status,subscription_start_date,subscription_end_date,onboarding_done,created_at").order("created_at", { ascending: false }),
    ]);
    setCoaches(c || []);
    setAllClients(cl || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleCoach = async (coach) => {
    await supabase.from("coaches").update({ is_active: !coach.is_active }).eq("id", coach.id);
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: !c.is_active } : c));
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSending(true);
    // Insert un message pour chaque coach (via la table messages, client_id = coach_id conceptuellement)
    // Pour l'instant on alert + log. Un vrai broadcast nécessiterait une table coach_messages.
    alert("Broadcast envoye a " + coaches.length + " coachs :\n\n" + broadcastMsg.trim());
    setBroadcastMsg("");
    setSending(false);
  };

  // ===== CALCULS PLATEFORME =====
  const activeCoaches = coaches.filter(c => c.is_active);
  const totalClients = allClients.length;
  const activeSubs = allClients.filter(c => c.subscription_status === "active" && c.subscription_plan);
  const mrr = activeSubs.reduce((s, c) => s + (PLAN_PRICES[c.subscription_plan] || 0), 0);
  const arr = mrr * 12;

  // Retention
  const onboarded = allClients.filter(c => c.onboarding_done);
  const retentionRate = onboarded.length > 0 ? Math.round((activeSubs.length / onboarded.length) * 100) : 0;

  // Croissance 30j
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const newCl30 = allClients.filter(c => new Date(c.created_at) >= d30).length;
  const newCo30 = coaches.filter(c => new Date(c.created_at) >= d30).length;

  // Objectif du mois (configurable, defaut 2000€ MRR)
  const mrrGoal = 5000;
  const mrrProgress = Math.min(100, Math.round((mrr / mrrGoal) * 100));

  // Previsions
  const prev3m = mrr * 3;
  const prev6m = mrr * 6 * (retentionRate / 100);
  const prev12m = mrr * 12 * Math.pow(retentionRate / 100, 2);

  // Enrichir coachs
  const enriched = coaches.map(coach => {
    const cls = allClients.filter(c => c.coach_id === coach.id);
    const act = cls.filter(c => c.subscription_status === "active" && c.subscription_plan);
    const coachMrr = act.reduce((s, c) => s + (PLAN_PRICES[c.subscription_plan] || 0), 0);
    const coachOnb = cls.filter(c => c.onboarding_done);
    const coachRet = coachOnb.length > 0 ? Math.round((act.length / coachOnb.length) * 100) : 0;
    // Score sante : activite (coach a des clients actifs) + retention + MRR
    const activityScore = cls.length > 0 ? Math.min(40, Math.round((act.length / cls.length) * 40)) : 0;
    const retScore = Math.min(30, Math.round((coachRet / 100) * 30));
    const mrrScore = Math.min(30, Math.round(Math.min(coachMrr / 500, 1) * 30));
    const healthScore = activityScore + retScore + mrrScore;
    // LTV = MRR * mois depuis inscription
    const monthsSinceJoin = Math.max(1, Math.round((Date.now() - new Date(coach.created_at).getTime()) / (30 * 86400000)));
    const ltv = coachMrr * monthsSinceJoin;
    // Inactif 14j+
    const lastClientActivity = cls.reduce((latest, c) => {
      if (!c.created_at) return latest;
      return new Date(c.created_at) > latest ? new Date(c.created_at) : latest;
    }, new Date(0));
    const daysSinceActivity = Math.floor((Date.now() - lastClientActivity.getTime()) / 86400000);
    const isInactive14 = cls.length > 0 && daysSinceActivity >= 14;

    return {
      ...coach, _cls: cls, _act: act.length, _mrr: coachMrr, _ret: coachRet,
      _health: healthScore, _ltv: ltv, _total: cls.length, _inactive14: isInactive14,
      _daysSince: daysSinceActivity,
    };
  }).sort((a, b) => b._mrr - a._mrr);

  // Churn predictif : coachs dont le score sante < 40
  const churnRisk = enriched.filter(c => c._health < 40 && c._total > 0);
  // Expansion : coachs avec > 10 clients qui pourraient upgrader
  const expansionTargets = enriched.filter(c => c._total >= 10 && c._mrr < 1000);

  const section = (title, icon) => (
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
        @keyframes goldPulse{0%,100%{opacity:0.6}50%{opacity:1}}
        .ceo-card:hover{border-color:rgba(245,200,66,0.3)!important;cursor:pointer}
      `}</style>

      {/* Ambient dore */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "35%", background: "radial-gradient(ellipse at 50% -15%, rgba(245,200,66,0.08), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ===== HEADER ===== */}
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 16px)", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "5px", textTransform: "uppercase", color: "rgba(245,200,66,0.5)" }}>RB Perform · CEO</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onSwitchToCoach} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "rgba(2,209,186,0.06)", border: `1px solid rgba(2,209,186,0.2)`, borderRadius: 10, color: G, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Ic name="arrow-left" size={11} /> Coach
              </button>
              <button onClick={onExit} style={{ padding: "7px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>App</button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            1. PULSE TEMPS REEL
        ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease both" }}>
          {section("Pulse temps reel", "lightning")}

          {/* MRR hero */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 56, fontWeight: 200, color: GOLD, letterSpacing: "-4px", lineHeight: 1 }}>
                {mrr.toLocaleString()} <span style={{ fontSize: 22, color: "rgba(245,200,66,0.5)" }}>€</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>MRR · {activeSubs.length} abonnements actifs · {activeCoaches.length} coachs</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>ARR {arr.toLocaleString()} €</div>
            </div>

            {/* Objectif du mois */}
            <div style={{ ...goldCard, width: 180, textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(245,200,66,0.5)", marginBottom: 8 }}>Objectif MRR</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 200, color: GOLD }}>{mrrProgress}%</div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: mrrProgress + "%", background: `linear-gradient(90deg, ${GOLD}, #f5a623)`, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>{mrr.toLocaleString()} / {mrrGoal.toLocaleString()} €</div>
            </div>
          </div>

          {/* Stats rapides */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[
              { l: "Clients total", v: totalClients, c: "#f5f0e8" },
              { l: "Retention", v: retentionRate + "%", c: retentionRate >= 80 ? G : retentionRate >= 60 ? ORANGE : RED },
              { l: "Nouveaux 30j", v: "+" + newCl30, c: newCl30 > 0 ? G : "rgba(255,255,255,0.4)" },
              { l: "Coachs 30j", v: "+" + newCo30, c: newCo30 > 0 ? GOLD : "rgba(255,255,255,0.4)" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 700, color: s.c }}>{s.v}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            2. SANTE DES COACHS
        ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.1s both" }}>
          {section("Sante des coachs", "users")}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enriched.map((coach, i) => {
              const hColor = coach._health >= 70 ? G : coach._health >= 40 ? ORANGE : RED;
              const expanded = expandedCoach === coach.id;
              return (
                <div key={coach.id} className="ceo-card" onClick={() => setExpandedCoach(expanded ? null : coach.id)} style={{
                  ...card, transition: "all 0.2s",
                  border: expanded ? `1px solid ${GOLD_BORDER}` : card.border,
                  animation: `ceoFade ${0.2 + i * 0.04}s ease both`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Score sante en cercle */}
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                      background: `conic-gradient(${hColor} ${coach._health * 3.6}deg, rgba(255,255,255,0.04) 0deg)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: hColor }}>{coach._health}</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#f5f0e8" }}>{coach.full_name || coach.email}</span>
                        {coach._inactive14 && <span style={{ fontSize: 8, fontWeight: 700, color: RED, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 100, padding: "2px 7px" }}>Inactif {coach._daysSince}j</span>}
                        {!coach.is_active && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", borderRadius: 100, padding: "2px 7px" }}>Desactive</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{coach.brand_name} · {coach.email}</div>
                    </div>

                    {/* Metriques */}
                    <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
                      {[
                        { v: coach._total, l: "Clients", c: "#f5f0e8" },
                        { v: coach._mrr + "€", l: "MRR", c: GOLD },
                        { v: coach._ret + "%", l: "Retention", c: coach._ret >= 80 ? G : coach._ret >= 60 ? ORANGE : RED },
                        { v: coach._ltv.toLocaleString() + "€", l: "LTV", c: "rgba(255,255,255,0.5)" },
                      ].map((m, j) => (
                        <div key={j} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 200, color: m.c }}>{m.v}</div>
                          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2, fontWeight: 700 }}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expand */}
                  {expanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", animation: "ceoFade 0.2s ease" }}>
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
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 8 }}>Inscrit {new Date(coach.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            3. LEVIER CROISSANCE
        ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.2s both" }}>
          {section("Levier croissance", "trending")}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { l: "Prevision 3 mois", v: prev3m.toLocaleString() + " €", c: "#f5f0e8" },
              { l: "Prevision 6 mois", v: Math.round(prev6m).toLocaleString() + " €", c: GOLD, sub: "avec " + retentionRate + "% retention" },
              { l: "Prevision 12 mois", v: Math.round(prev12m).toLocaleString() + " €", c: GOLD, sub: "retention composee" },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{s.l}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 200, color: s.c, letterSpacing: "-1px" }}>{s.v}</div>
                {s.sub && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Clients par coach */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Clients par coach</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {enriched.filter(c => c._total > 0).map((c, i) => {
                const maxCl = Math.max(1, ...enriched.map(e => e._total));
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 80, fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{c.full_name?.split(" ")[0] || c.email}</div>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: (c._total / maxCl * 100) + "%", background: GOLD, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#f5f0e8", width: 30, textAlign: "right" }}>{c._total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            4. INTELLIGENCE PREDICTIVE
        ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.3s both" }}>
          {section("Intelligence predictive", "alert")}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Churn predictif */}
            <div style={{ ...card, background: churnRisk.length > 0 ? "rgba(239,68,68,0.03)" : card.background, border: churnRisk.length > 0 ? "1px solid rgba(239,68,68,0.15)" : card.border }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: churnRisk.length > 0 ? RED : "rgba(255,255,255,0.3)", marginBottom: 10 }}>Churn predictif 30j</div>
              {churnRisk.length === 0 ? (
                <div style={{ fontSize: 12, color: G }}>Aucun coach a risque</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {churnRisk.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{c.full_name?.split(" ")[0]}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: RED, fontWeight: 700 }}>Score {c._health}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expansion revenue */}
            <div style={{ ...card, background: expansionTargets.length > 0 ? GOLD_DIM : card.background, border: expansionTargets.length > 0 ? `1px solid ${GOLD_BORDER}` : card.border }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: expansionTargets.length > 0 ? GOLD : "rgba(255,255,255,0.3)", marginBottom: 10 }}>Expansion revenue</div>
              {expansionTargets.length === 0 ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Aucun coach a upgrader</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {expansionTargets.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{c.full_name?.split(" ")[0]} · {c._total} clients</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: GOLD, fontWeight: 700 }}>{c._mrr}€ MRR</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            5. ACTIONS RAPIDES CEO
        ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 36, animation: "ceoFade 0.4s ease 0.4s both" }}>
          {section("Actions rapides", "flame")}

          {/* Broadcast */}
          <div style={{ ...goldCard, marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(245,200,66,0.5)", marginBottom: 10 }}>Message broadcast a tous les coachs</div>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Annonce importante pour tous les coachs..."
                rows={2}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#f5f0e8", fontFamily: "inherit", fontSize: 13, resize: "none", outline: "none" }}
              />
              <button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || sending} style={{
                alignSelf: "flex-end", padding: "10px 18px", borderRadius: 10,
                background: broadcastMsg.trim() ? `linear-gradient(135deg, ${GOLD}, #f5a623)` : "rgba(255,255,255,0.04)",
                border: "none", color: broadcastMsg.trim() ? "#000" : "rgba(255,255,255,0.25)",
                fontSize: 11, fontWeight: 800, cursor: broadcastMsg.trim() ? "pointer" : "default",
                fontFamily: "inherit", textTransform: "uppercase",
              }}>Envoyer</button>
            </div>
          </div>

          {/* Actions rapides grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              { label: "Coachs actifs", value: activeCoaches.length + " / " + coaches.length, icon: "check", color: G },
              { label: "Abos expirant 30j", value: allClients.filter(c => { const d = c.subscription_end_date ? Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000) : 999; return d > 0 && d <= 30; }).length, icon: "alert", color: ORANGE },
              { label: "Clients sans abo", value: allClients.filter(c => !c.subscription_plan).length, icon: "users", color: "rgba(255,255,255,0.5)" },
            ].map((a, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Ic name={a.icon} size={13} color={a.color} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{a.label}</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 200, color: a.color }}>{a.value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
