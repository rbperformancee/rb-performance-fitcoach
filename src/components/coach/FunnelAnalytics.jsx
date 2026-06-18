// FunnelAnalytics — dashboard self-hosted lecture analytics_events.
// Affiché dans la page coach super_admin (sidebar ou tab).
//
// Affiche : pageviews 30j, funnel drop-off (Landing → Started → Submitted),
// source breakdown, top events. Tout en lecture directe depuis Supabase
// (RLS super_admin only).

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";

const GREEN = "#02d1ba";
const BG = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.08)";

const PERIODS = [
  { id: "7d", label: "7 jours", days: 7 },
  { id: "30d", label: "30 jours", days: 30 },
  { id: "90d", label: "90 jours", days: 90 },
];

export default function FunnelAnalytics() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const days = PERIODS.find((p) => p.id === period)?.days || 30;
      const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("name, props, source, country, created_at, session_id, page_path")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (cancelled) return;
      if (error) {
        console.error("[FunnelAnalytics] load failed:", error);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [period]);

  const stats = useMemo(() => {
    const byName = {};
    const sources = {};
    const sessions = new Set();
    const pages = {};
    for (const e of events) {
      byName[e.name] = (byName[e.name] || 0) + 1;
      const src = e.source || "unknown";
      sources[src] = (sources[src] || 0) + 1;
      if (e.session_id) sessions.add(e.session_id);
      if (e.name === "Funnel:LandingViewed") {
        const p = e.page_path || "/";
        pages[p] = (pages[p] || 0) + 1;
      }
    }
    return { byName, sources, uniqueSessions: sessions.size, pages };
  }, [events]);

  const funnel = useMemo(() => {
    const landing = stats.byName["Funnel:LandingViewed"] || 0;
    const started = stats.byName["Funnel:ApplicationStarted"] || 0;
    const submitted = stats.byName["Funnel:ApplicationSubmitted"] || 0;
    const confirmation = stats.byName["Funnel:ConfirmationViewed"] || 0;
    const postvente = stats.byName["Funnel:PostVenteViewed"] || 0;
    const rate = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
    return [
      { label: "Landing vues", count: landing, rate: null },
      { label: "Form ouvert", count: started, rate: rate(started, landing) },
      { label: "Form soumis", count: submitted, rate: rate(submitted, started) },
      { label: "Confirmation vue", count: confirmation, rate: rate(confirmation, submitted) },
      { label: "Page post-vente", count: postvente, rate: rate(postvente, submitted) },
    ];
  }, [stats]);

  const topSources = useMemo(() => {
    return Object.entries(stats.sources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [stats]);

  return (
    <div style={{ padding: "16px 16px 80px", maxWidth: 1100, margin: "0 auto", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 4 }}>
            Funnel analytics · Super admin
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            {events.length.toLocaleString("fr-FR")} events sur {period}
          </h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            {stats.uniqueSessions} sessions uniques · self-hosted Supabase
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: "6px 12px", fontSize: 11, fontWeight: 800,
                letterSpacing: 0.5, textTransform: "uppercase",
                background: period === p.id ? `${GREEN}22` : BG,
                color: period === p.id ? GREEN : "rgba(255,255,255,0.5)",
                border: `1px solid ${period === p.id ? GREEN : BORDER}`,
                borderRadius: 8, cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ color: "rgba(255,255,255,0.4)", padding: 24, textAlign: "center" }}>Chargement…</div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", background: BG, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            Aucun event sur la période.
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Le tracking est en place. Dès qu'un visiteur passe sur la landing, les events arrivent ici.
          </div>
        </div>
      )}

      {!loading && events.length > 0 && (
        <>
          {/* Funnel drop-off */}
          <div style={{ marginBottom: 24, padding: 18, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GREEN, fontWeight: 800, marginBottom: 14 }}>
              Entonnoir candidature
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {funnel.map((step, i) => {
                const maxCount = funnel[0].count || 1;
                const widthPct = Math.max(8, Math.round((step.count / maxCount) * 100));
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                        <strong style={{ color: "#fff" }}>{step.count}</strong>
                        {step.rate != null && (
                          <span style={{ marginLeft: 8, color: step.rate >= 30 ? GREEN : "#ffb000" }}>
                            ({step.rate}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      height: 8, borderRadius: 4,
                      background: "rgba(255,255,255,0.04)", overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${widthPct}%`, height: "100%",
                        background: `linear-gradient(90deg, ${GREEN}, #0891b2)`,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sources */}
          <div style={{ marginBottom: 24, padding: 18, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GREEN, fontWeight: 800, marginBottom: 14 }}>
              Sources de traffic
            </div>
            {topSources.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Aucune donnée.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {topSources.map(([src, count]) => {
                  const totalEvents = events.length || 1;
                  const pct = Math.round((count / totalEvents) * 100);
                  return (
                    <div key={src} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{src}</div>
                      </div>
                      <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: GREEN }} />
                      </div>
                      <div style={{ width: 60, textAlign: "right", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                        {count} <span style={{ color: "rgba(255,255,255,0.4)" }}>({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top events */}
          <div style={{ padding: 18, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: GREEN, fontWeight: 800, marginBottom: 14 }}>
              Tous les events
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(stats.byName)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", fontSize: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.75)" }}>{name}</span>
                    <strong style={{ color: "#fff" }}>{count}</strong>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
