import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const G = "#02d1ba";
const ORANGE = "#f97316";
const RED = "#ef4444";
const VIOLET = "#a78bfa";
const PLAN_PRICES = { "3m": 120, "6m": 110, "12m": 100 };

function Ic({ name, size = 18, color = "currentColor" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const m = {
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    trending: <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    alert: <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    check: <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
    x: <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    "arrow-left": <svg {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    flame: <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
  };
  return m[name] || null;
}

export default function SuperAdminDashboard({ onSwitchToCoach, onExit }) {
  const [coaches, setCoaches] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: coachesData }, { data: clientsData }] = await Promise.all([
      supabase.from("coaches").select("*").order("created_at", { ascending: true }),
      supabase.from("clients").select("id,email,full_name,coach_id,subscription_plan,subscription_status,subscription_start_date,subscription_end_date,onboarding_done,created_at").order("created_at", { ascending: false }),
    ]);
    setCoaches(coachesData || []);
    setAllClients(clientsData || []);
    setLoading(false);
  };

  const toggleCoachActive = async (coach) => {
    const newStatus = !coach.is_active;
    await supabase.from("coaches").update({ is_active: newStatus }).eq("id", coach.id);
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: newStatus } : c));
  };

  // ===== METRIQUES PLATEFORME =====
  const totalCoaches = coaches.filter(c => c.is_active).length;
  const totalClients = allClients.length;
  const activeSubscriptions = allClients.filter(c => c.subscription_status === "active" && c.subscription_plan);
  const platformMRR = activeSubscriptions.reduce((sum, c) => sum + (PLAN_PRICES[c.subscription_plan] || 0), 0);
  const annualizedRevenue = platformMRR * 12;

  // Retention : clients avec programme actif / clients onboardes
  const onboarded = allClients.filter(c => c.onboarding_done);
  const retained = activeSubscriptions.length;
  const retentionRate = onboarded.length > 0 ? Math.round((retained / onboarded.length) * 100) : 0;

  // Croissance : clients crees dans les 30 derniers jours
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const newClients30d = allClients.filter(c => new Date(c.created_at) >= d30).length;
  const newCoaches30d = coaches.filter(c => new Date(c.created_at) >= d30).length;

  // Enrichir chaque coach avec ses metriques
  const enrichedCoaches = coaches.map(coach => {
    const coachClients = allClients.filter(c => c.coach_id === coach.id);
    const coachActive = coachClients.filter(c => c.subscription_status === "active" && c.subscription_plan);
    const coachMRR = coachActive.reduce((sum, c) => sum + (PLAN_PRICES[c.subscription_plan] || 0), 0);
    const coachOnboarded = coachClients.filter(c => c.onboarding_done);
    const coachRetention = coachOnboarded.length > 0 ? Math.round((coachActive.length / coachOnboarded.length) * 100) : 0;
    return { ...coach, _clients: coachClients, _activeCount: coachActive.length, _mrr: coachMRR, _retention: coachRetention, _total: coachClients.length };
  }).sort((a, b) => b._mrr - a._mrr);

  const card = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 18px 16px" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system,Inter,sans-serif" }}>
        <div style={{ width: 40, height: 40, border: "2.5px solid rgba(167,139,250,0.15)", borderTopColor: VIOLET, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff" }}>
      <style>{`
        @keyframes saFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sa-coach-card:hover{background:rgba(167,139,250,0.04)!important;cursor:pointer}
      `}</style>

      {/* Ambient violet (distincts du teal coach) */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse at 50% -10%, rgba(167,139,250,0.1), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ===== HEADER ===== */}
        <div style={{ paddingTop: "calc(env(safe-area-inset-top, 8px) + 16px)", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(167,139,250,0.6)" }}>
              Super Admin · RB Perform
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onSwitchToCoach} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(2,209,186,0.08)", border: `1px solid rgba(2,209,186,0.25)`, borderRadius: 10, color: G, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Ic name="arrow-left" size={12} />
                Mon dashboard coach
              </button>
              <button onClick={onExit} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                App client
              </button>
            </div>
          </div>

          <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-2.5px", color: "#fff", margin: 0, lineHeight: 0.95 }}>
            {totalCoaches} coach{totalCoaches > 1 ? "s" : ""}.
            <br />
            <span style={{ color: VIOLET }}>{platformMRR.toLocaleString()} € MRR.</span>
          </h1>
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { v: totalClients, l: "clients", c: "#fff" },
              { v: activeSubscriptions.length, l: "abos actifs", c: G },
              { v: retentionRate + "%", l: "retention", c: retentionRate >= 80 ? G : retentionRate >= 60 ? ORANGE : RED },
              { v: "+" + newClients30d, l: "clients 30j", c: newClients30d > 0 ? G : "rgba(255,255,255,0.4)" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== METRIQUES PLATEFORME ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32, animation: "saFadeUp 0.4s ease both" }}>
          {[
            { label: "MRR Plateforme", value: platformMRR.toLocaleString() + " €", color: VIOLET, icon: "chart" },
            { label: "Revenu annualise", value: annualizedRevenue.toLocaleString() + " €", color: "#fff", icon: "trending" },
            { label: "Coachs actifs", value: totalCoaches, color: G, icon: "users" },
            { label: "Clients total", value: totalClients, color: "#fff", icon: "flame" },
            { label: "Retention", value: retentionRate + "%", color: retentionRate >= 80 ? G : ORANGE, icon: "check" },
            { label: "Croissance 30j", value: "+" + newClients30d + " clients", color: newClients30d > 0 ? G : "rgba(255,255,255,0.4)", sub: "+" + newCoaches30d + " coachs", icon: "trending" },
          ].map((s, i) => (
            <div key={i} style={{ ...card, position: "relative", overflow: "hidden", animation: `saFadeUp ${0.2 + i * 0.05}s ease both` }}>
              {s.color === VIOLET && <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: "radial-gradient(circle, rgba(167,139,250,0.15), transparent 70%)", pointerEvents: "none" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                <div style={{ color: s.color === "#fff" ? "rgba(255,255,255,0.3)" : s.color, opacity: 0.7 }}>
                  <Ic name={s.icon} size={14} />
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 200, color: s.color, letterSpacing: "-1px", position: "relative" }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* ===== LISTE DES COACHS ===== */}
        <div style={{ marginBottom: 32, animation: "saFadeUp 0.5s ease 0.2s both" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(167,139,250,0.55)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Ic name="users" size={14} color={VIOLET} />
            Coachs sur la plateforme ({coaches.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enrichedCoaches.map((coach, i) => (
              <div
                key={coach.id}
                className="sa-coach-card"
                onClick={() => setSelectedCoach(selectedCoach?.id === coach.id ? null : coach)}
                style={{
                  ...card,
                  transition: "all 0.2s",
                  border: selectedCoach?.id === coach.id ? `1px solid ${VIOLET}40` : card.border,
                  animation: `saFadeUp ${0.3 + i * 0.04}s ease both`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Avatar initiale */}
                  <div style={{
                    width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                    background: coach.is_active ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
                    border: `2px solid ${coach.is_active ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 18, color: coach.is_active ? VIOLET : "rgba(255,255,255,0.3)",
                  }}>
                    {(coach.full_name || coach.email || "?")[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{coach.full_name || coach.email}</div>
                      {coach.brand_name && <span style={{ fontSize: 9, color: "rgba(167,139,250,0.6)", fontWeight: 700 }}>{coach.brand_name}</span>}
                      {!coach.is_active && <span style={{ fontSize: 8, color: RED, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 100, padding: "2px 8px", fontWeight: 700 }}>Inactif</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{coach.email}</div>
                  </div>

                  {/* Stats coach */}
                  <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 200, color: "#fff" }}>{coach._total}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2, fontWeight: 700 }}>Clients</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 200, color: G }}>{coach._mrr}€</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2, fontWeight: 700 }}>MRR</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 200, color: coach._retention >= 80 ? G : coach._retention >= 60 ? ORANGE : RED }}>{coach._retention}%</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2, fontWeight: 700 }}>Retention</div>
                    </div>
                  </div>
                </div>

                {/* Detail coach (expandable) */}
                {selectedCoach?.id === coach.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", animation: "saFadeUp 0.2s ease" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCoachActive(coach); }}
                        style={{
                          padding: "8px 14px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: coach.is_active ? "rgba(239,68,68,0.08)" : "rgba(2,209,186,0.08)",
                          border: `1px solid ${coach.is_active ? "rgba(239,68,68,0.2)" : "rgba(2,209,186,0.2)"}`,
                          color: coach.is_active ? RED : G,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {coach.is_active ? "Desactiver" : "Activer"} le compte
                      </button>
                    </div>

                    {/* Liste clients du coach */}
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                      Clients de {coach.full_name?.split(" ")[0] || "ce coach"} ({coach._total})
                    </div>
                    {coach._clients.length === 0 ? (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: 12 }}>Aucun client</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {coach._clients.slice(0, 10).map((cl) => {
                          const daysLeft = cl.subscription_end_date ? Math.ceil((new Date(cl.subscription_end_date) - Date.now()) / 86400000) : null;
                          const subColor = daysLeft !== null ? (daysLeft <= 0 ? RED : daysLeft <= 14 ? ORANGE : G) : "rgba(255,255,255,0.3)";
                          return (
                            <div key={cl.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 12 }}>
                              <div>
                                <span style={{ color: "#fff", fontWeight: 600 }}>{cl.full_name || cl.email}</span>
                                {cl.subscription_plan && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 8, fontSize: 10 }}>{cl.subscription_plan}</span>}
                              </div>
                              {daysLeft !== null && (
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: subColor }}>
                                  {daysLeft <= 0 ? "Expire" : daysLeft + "j"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 10 }}>
                      Inscrit le {new Date(coach.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
