import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { captureError } from "../../lib/sentry";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const G = "#02d1ba";
const RED = "#ff6b6b";
const VIOLET = "#818cf8";
const ORANGE = "#fbbf24";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const MODULE_META = {
  daily_playbook: { labelKey: "sn.module_daily_playbook", icon: "zap", color: G, priority: 80 },
  revenue_unblocker: { labelKey: "sn.module_revenue_unblocker", icon: "trending", color: ORANGE, priority: 70 },
  price_intel: { labelKey: "sn.module_price_intel", icon: "chart", color: VIOLET, priority: 40 },
  ranking: { labelKey: "sn.module_ranking", icon: "award", color: "#60a5fa", priority: 30 },
};

/**
 * Sentinel — feed IA business pour coachs Pro/Elite/Founding.
 * Affiche les cartes generees par les crons dans sentinel_cards.
 * Optimistic UI: status change instant + rollback on error.
 */
export default function Sentinel({ coachData, onClose, onNavigate }) {
  const t = useT();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissing, setDismissing] = useState({}); // cardId -> true (fade out)

  const loadCards = useCallback(async () => {
    const start = Date.now();
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from("sentinel_cards")
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (err) throw err;
      setCards(data || []);

      // Sentry breadcrumb
      try {
        const duration = Date.now() - start;
        if (typeof window !== "undefined" && window.__SENTRY__) {
          window.__SENTRY__.hub?.getClient()?.addBreadcrumb?.({
            category: "sentinel",
            message: `Feed loaded: ${(data || []).length} cards in ${duration}ms`,
            level: "info",
          });
        }
      } catch (_) {}
    } catch (e) {
      console.error("[Sentinel] load error:", e);
      setError(e.message);
      captureError(e, { context: "sentinel_feed_load" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const updateCardStatus = async (cardId, status) => {
    // Optimistic
    const prev = cards;
    setDismissing((d) => ({ ...d, [cardId]: true }));

    // Wait for animation
    setTimeout(async () => {
      setCards((c) => c.filter((card) => card.id !== cardId));
      setDismissing((d) => { const n = { ...d }; delete n[cardId]; return n; });

      const updateData = { status };
      if (status === "completed") updateData.completed_at = new Date().toISOString();

      const { error: err } = await supabase
        .from("sentinel_cards")
        .update(updateData)
        .eq("id", cardId);

      if (err) {
        // Rollback
        setCards(prev);
        captureError(err, { context: "sentinel_card_update", cardId, status });
      }
    }, 300);
  };

  const handleCTA = (card) => {
    haptic.success();
    const action = card.cta_action;
    const payload = card.data?.actions?.[0]?.cta_payload || {};

    // Sentry breadcrumb
    try {
      captureError(new Error("sentinel_cta_click"), {
        level: "info",
        card_id: card.id,
        module: card.module,
        action,
      });
    } catch (_) {}

    // Dispatch action
    if (action === "open_client_list" || action === "open_client_profile") {
      onNavigate?.("clients");
    } else if (action === "open_message_compose") {
      onNavigate?.("clients");
    } else if (action === "open_plans_settings") {
      onNavigate?.("settings");
    } else if (action === "open_sentinel_detail") {
      // Already viewing — no-op
    }

    updateCardStatus(card.id, "completed");
  };

  const handleDismiss = (card) => {
    haptic.light();
    updateCardStatus(card.id, "dismissed");
  };

  // Group cards by module for display
  const grouped = {};
  for (const card of cards) {
    if (!grouped[card.module]) grouped[card.module] = [];
    grouped[card.module].push(card);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("sn.aria_label")}
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "'DM Sans',-apple-system,sans-serif", color: "#fff" }}
    >
      <style>{`
        @keyframes sentFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sentFadeOut{to{opacity:0;transform:translateY(-8px) scale(0.96)}}
        @media(max-width:600px){.sent-header{padding-left:16px !important;padding-right:16px !important} .sent-content{padding-left:16px !important;padding-right:16px !important}}
      `}</style>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 50% -10%, rgba(129,140,248,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <div className="sent-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.95)", WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onClose}
            aria-label={t("sn.aria_close")}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 36, height: 36, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(129,140,248,0.6)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>{t("sn.eyebrow")}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-2px", lineHeight: 0.92 }}>
              {t("sn.title")}<span style={{ color: VIOLET }}>.</span>
            </div>
          </div>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 8px ${G}` }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>{t("sn.live")}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <section
        role="feed"
        aria-label={t("sn.aria_feed")}
        className="sent-content"
        style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", padding: "20px 24px calc(env(safe-area-inset-bottom, 0px) + 100px)" }}
      >
        {/* Loading: skeleton cards */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: 20, animation: "sentFadeIn 0.3s ease both", animationDelay: `${i * 100}ms` }}>
                <div style={{ width: 80, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 12 }} />
                <div style={{ width: "100%", height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ width: "70%", height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 16 }} />
                <div style={{ width: 140, height: 36, background: "rgba(255,255,255,0.04)", borderRadius: 10 }} />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
              {t("sn.error")}
            </div>
            <button
              onClick={() => { setLoading(true); loadCards(); }}
              style={{ padding: "12px 24px", background: `${VIOLET}15`, border: `1px solid ${VIOLET}30`, borderRadius: 100, color: VIOLET, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              {t("sn.retry")}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && cards.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={VIOLET} strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{t("sn.empty_title")}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              {t("sn.empty_sub")}
            </div>
          </div>
        )}

        {/* Cards feed */}
        {!loading && !error && cards.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cards.map((card, idx) => {
              const meta = MODULE_META[card.module] || MODULE_META.daily_playbook;
              const isDismissing = dismissing[card.id];

              return (
                <article
                  key={card.id}
                  aria-label={card.title}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${meta.color}15`,
                    borderRadius: 18,
                    padding: 20,
                    position: "relative",
                    overflow: "hidden",
                    animation: isDismissing ? "sentFadeOut 0.3s ease forwards" : `sentFadeIn 0.35s ease both`,
                    animationDelay: isDismissing ? "0ms" : `${idx * 60}ms`,
                  }}
                >
                  {/* Top accent line */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${meta.color}60, transparent)` }} />

                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ModuleIcon name={meta.icon} size={14} color={meta.color} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: meta.color }}>{t(meta.labelKey)}</span>
                    </div>
                    <button
                      onClick={() => handleDismiss(card)}
                      aria-label={fillTpl(t("sn.aria_archive"), { title: card.title })}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 8 }}>
                    {card.title}
                  </div>

                  {/* Body */}
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, whiteSpace: "pre-line", marginBottom: card.cta_label ? 16 : 0 }}>
                    {card.body}
                  </div>

                  {/* Impact badge (for playbook/unblocker) */}
                  {card.data?.total_impact_eur && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${G}12`, border: `1px solid ${G}25`, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: G, marginBottom: card.cta_label ? 16 : 0 }}>
                      {fillTpl(t("sn.impact_potential"), { n: card.data.total_impact_eur })}
                    </div>
                  )}
                  {card.data?.total_potential_eur && !card.data?.total_impact_eur && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${ORANGE}12`, border: `1px solid ${ORANGE}25`, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: ORANGE, marginBottom: card.cta_label ? 16 : 0 }}>
                      {fillTpl(t("sn.impact_potential"), { n: card.data.total_potential_eur })}
                    </div>
                  )}

                  {/* CTA */}
                  {card.cta_label && (
                    <button
                      onClick={() => handleCTA(card)}
                      aria-label={card.cta_label}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "12px 16px",
                        background: `${meta.color}10`,
                        border: `1px solid ${meta.color}25`,
                        borderRadius: 12,
                        color: meta.color,
                        fontSize: 13, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "background 0.15s",
                      }}
                    >
                      {card.cta_label}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto" }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// Module icons (inline SVG to avoid dependency on AppIcon)
function ModuleIcon({ name, size = 14, color = "currentColor" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    zap: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    trending: <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    award: <svg {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  };
  return icons[name] || null;
}

/**
 * SentinelTeaser — modal pour les coachs sans acces (Starter).
 * 3 bullets de valeur + CTA upgrade.
 */
export function SentinelTeaser({ onClose, onUpgrade }) {
  const t = useT();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.7)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 22, padding: 28, maxWidth: 420, width: "100%", position: "relative", overflow: "hidden" }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${VIOLET}15`, border: `1px solid ${VIOLET}30`, borderRadius: 100, padding: "4px 12px", fontSize: 9, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: VIOLET, marginBottom: 20 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill={VIOLET} stroke="none"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          {t("sn.teaser_badge")}
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 8, lineHeight: 1.2 }}>
          {t("sn.eyebrow")}<span style={{ color: VIOLET }}>.</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.6 }}>
          {t("sn.teaser_desc")}
        </div>

        {/* Bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "zap", title: t("sn.teaser_b1_title"), desc: t("sn.teaser_b1_desc"), stat: t("sn.teaser_b1_stat") },
            { icon: "chart", title: t("sn.teaser_b2_title"), desc: t("sn.teaser_b2_desc"), stat: t("sn.teaser_b2_stat") },
            { icon: "trending", title: t("sn.teaser_b3_title"), desc: t("sn.teaser_b3_desc"), stat: t("sn.teaser_b3_stat") },
          ].map((b) => (
            <div key={b.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${VIOLET}10`, border: `1px solid ${VIOLET}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <ModuleIcon name={b.icon} size={14} color={VIOLET} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{b.desc}</div>
                <div style={{ fontSize: 10, color: G, fontWeight: 600, marginTop: 4 }}>{b.stat}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onUpgrade}
          style={{
            width: "100%", padding: 16,
            background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET}cc)`,
            color: "#fff", border: "none", borderRadius: 14,
            fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            textTransform: "uppercase", letterSpacing: "0.5px",
            boxShadow: `0 8px 24px ${VIOLET}40`,
          }}
        >
          {t("sn.teaser_cta")}
        </button>
        <div
          onClick={onClose}
          style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 12, cursor: "pointer" }}
        >
          {t("sn.teaser_more")}
        </div>
      </div>
    </div>
  );
}
