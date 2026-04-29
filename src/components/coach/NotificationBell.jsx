import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import AppIcon from "../AppIcon";
import { calculateChurnRisk } from "../../lib/coachIntelligence";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

const RED = "#ff6b6b";
const ORANGE = "#00C9A7";
const G = "#02d1ba";

/**
 * NotificationBell — bell icon avec pastille rouge si alertes actionables.
 * Click → drawer avec liste des notifs (messages non lus + clients a risque + abos expirants).
 */
export default function NotificationBell({ clients = [], coachId, onOpenClient }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messages, setMessages] = useState([]);

  // Compute alerts dynamiquement (titles/descs translated at render via i18nKey)
  const alerts = useMemo(() => {
    const list = [];
    for (const c of clients) {
      const risk = calculateChurnRisk(c);
      const fn = c.full_name?.split(" ")[0] || "__client_fallback__";
      if (risk >= 60) {
        list.push({
          id: `risk_${c.id}`,
          type: "churn",
          severity: "high",
          color: RED,
          titleKey: "nb.alert_title_high_risk",
          descKey: "nb.alert_desc_high_risk",
          vars: { name: fn, score: risk },
          client: c,
        });
      } else if (c.subscription_end_date) {
        const daysLeft = Math.ceil((new Date(c.subscription_end_date) - Date.now()) / 86400000);
        if (daysLeft > 0 && daysLeft <= 7) {
          list.push({
            id: `expire_${c.id}`,
            type: "expire",
            severity: "medium",
            color: ORANGE,
            titleKey: "nb.alert_title_expiring",
            descKey: "nb.alert_desc_expiring",
            vars: { name: fn, n: daysLeft },
            client: c,
          });
        } else if (daysLeft <= 0) {
          list.push({
            id: `expired_${c.id}`,
            type: "expired",
            severity: "high",
            color: RED,
            titleKey: "nb.alert_title_expired",
            descKey: "nb.alert_desc_expired",
            vars: { name: fn },
            client: c,
          });
        }
      }
    }
    return list.sort((a, b) => (a.severity === "high" ? -1 : 1));
  }, [clients]);

  // Resolve labels at render so locale changes refresh them
  const resolveName = (n) => (n === "__client_fallback__" ? t("nb.client_fallback") : n);

  // Compter messages non lus envoyes par les clients (from_coach=false, read=false)
  useEffect(() => {
    if (!coachId || clients.length === 0) return;
    let mounted = true;
    const ids = clients.map((c) => `"${c.id}"`).join(",");
    supabase.from("messages")
      .select("id, content, client_id, created_at", { count: "exact" })
      .in("client_id", clients.map((c) => c.id))
      .eq("from_coach", false)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, count }) => {
        if (!mounted) return;
        setUnreadMessages(count || 0);
        setMessages(data || []);
      });
    return () => { mounted = false; };
  }, [coachId, clients]);

  const totalCount = alerts.length + unreadMessages;

  return (
    <>
      <button
        onClick={() => { haptic.light(); setOpen(true); }}
        aria-label={fillTpl(t("nb.aria_count"), { n: totalCount })}
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 100,
          width: 36, height: 36,
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit",
        }}
      >
        <AppIcon name="bell" size={14} color="rgba(255,255,255,0.7)" />
        {totalCount > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            minWidth: 18, height: 18, borderRadius: 100, padding: "0 5px",
            background: RED, color: "#fff",
            fontSize: 9, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #080C14",
            animation: "bellPulse 2s ease-in-out infinite",
          }}>
            <style>{`@keyframes bellPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(0,0,0,0.6)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "flex-end" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("nb.aria_dialog")}
            style={{ width: "100%", maxWidth: 380, background: "#080C14", borderLeft: "1px solid rgba(255,255,255,0.08)", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", animation: "nbSlide 0.25s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <style>{`@keyframes nbSlide { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
            {/* Header */}
            <div style={{ position: "sticky", top: 0, background: "#080C14", padding: "calc(env(safe-area-inset-top, 16px) + 16px) 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 2 }}>{t("nb.eyebrow")}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{fillTpl(totalCount > 1 ? t("nb.alert_many") : t("nb.alert_one"), { n: totalCount })}</div>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t("nb.aria_close")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, width: 44, height: 44, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AppIcon name="x" size={18} color="rgba(255,255,255,0.85)" />
              </button>
            </div>

            <div style={{ padding: 14 }}>
              {totalCount === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(2,209,186,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: G, marginBottom: 14 }}>
                    <AppIcon name="check-circle" size={28} color={G} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{t("nb.empty_title")}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t("nb.empty_sub")}</div>
                </div>
              ) : (
                <>
                  {/* Messages non lus */}
                  {messages.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(2,209,186,0.7)", fontWeight: 700, marginBottom: 8 }}>{t("nb.section_messages")}</div>
                      {messages.map((m) => {
                        const c = clients.find((x) => x.id === m.client_id);
                        const fn = c?.full_name?.split(" ")[0] || t("nb.client_fallback");
                        return (
                          <button
                            key={m.id}
                            onClick={() => { haptic.light(); setOpen(false); if (c) onOpenClient?.(c); }}
                            style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: 12, background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 12, marginBottom: 6, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "#fff" }}
                          >
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(2,209,186,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: G, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{fn[0]?.toUpperCase() || "?"}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{fn}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>{m.content}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Alertes clients */}
                  {alerts.length > 0 && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,107,107,0.7)", fontWeight: 700, marginBottom: 8 }}>{t("nb.section_urgent")}</div>
                      {alerts.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => { haptic.light(); setOpen(false); onOpenClient?.(a.client); }}
                          style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: 12, background: `${a.color}06`, border: `1px solid ${a.color}25`, borderRadius: 12, marginBottom: 6, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "#fff" }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${a.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }}>
                            <AppIcon name={a.type === "churn" ? "alert" : "calendar"} size={13} color={a.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{fillTpl(t(a.titleKey), { ...a.vars, name: resolveName(a.vars.name) })}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{fillTpl(t(a.descKey), { ...a.vars, name: resolveName(a.vars.name) })}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
