import React from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const G = "#02d1ba";

/**
 * PushNotifModal — modal premium pour demander la permission notifications
 * au lieu du prompt navigateur brut. S'affiche avec 3 benefices + CTA.
 *
 * En isDemo: le CTA affiche un toast 'Disponible en version complete'
 * sans appeler Notification.requestPermission().
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   coachId: uuid | undefined
 *   isDemo: boolean
 */
export default function PushNotifModal({ open, onClose, coachId, isDemo = false }) {
  const t = useT();
  if (!open) return null;

  async function handleActivate() {
    if (isDemo) {
      haptic.selection();
      toast.info(t("pn.toast_demo_unavailable"));
      onClose?.();
      return;
    }

    haptic.selection();

    if (!("Notification" in window)) {
      toast.error(t("pn.toast_unsupported"));
      onClose?.();
      return;
    }

    try {
      // Detection : Notification.permission peut déjà être "granted" sans demande
      const existingPerm = Notification.permission;
      const perm = existingPerm === "granted" ? "granted" : await Notification.requestPermission();
      if (perm === "granted") {
        toast.success(t("pn.toast_activated"));
        if (coachId) {
          try {
            await supabase
              .from("coaches")
              .update({ notif_push_enabled: true })
              .eq("id", coachId);
          } catch (_) {}
        }
      } else if (perm === "denied") {
        toast.info(t("pn.toast_denied"));
      }
      // perm === "default" : user a fermé le prompt sans choisir → pas de toast (silent)
    } catch (_) {
      toast.error(t("pn.toast_error"));
    }

    onClose?.();
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,.8)",
        WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6vh 16px",
        animation: "pushFadeIn .2s ease both",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("pn.aria_label")}
    >
      <style>{`
        @keyframes pushFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pushSlide  { from { opacity: 0; transform: translateY(-12px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pushBoltPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: .65; transform: scale(.92); }
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 440,
        background: "#0a0a0a",
        border: `1px solid rgba(2,209,186,.2)`,
        borderRadius: 20,
        padding: "36px 28px 28px",
        textAlign: "center",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        color: "#fff",
        boxShadow: "0 30px 90px rgba(0,0,0,.7), 0 0 0 1px rgba(2,209,186,.08)",
        animation: "pushSlide .25s cubic-bezier(.22,1,.36,1) both",
        position: "relative",
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t("pn.aria_close")}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "rgba(255,255,255,.04)", border: "none",
            borderRadius: 8,
            width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,.5)",
            fontSize: 18, lineHeight: 1,
            fontFamily: "inherit",
          }}
        >×</button>

        {/* Eclair anime */}
        <div style={{ marginBottom: 20, animation: "pushBoltPulse 1.8s ease-in-out infinite" }}>
          <svg viewBox="170 50 180 410" width="22" height="48" aria-hidden="true">
            <polygon points="300,60 180,280 248,280 210,450 340,220 268,220 300,60" fill={G} />
          </svg>
        </div>

        {/* Titre */}
        <h2 style={{
          fontSize: "clamp(24px, 6vw, 28px)",
          fontWeight: 800,
          letterSpacing: "-0.045em",
          color: "#fff", margin: "0 0 10px",
          lineHeight: 0.95,
        }}>
          {t("pn.title")}<span style={{ color: G }}>.</span>
        </h2>

        <p style={{
          fontSize: 13, color: "rgba(255,255,255,.45)",
          margin: "0 0 28px", lineHeight: 1.55,
          fontWeight: 300,
        }}>
          {t("pn.subtitle")}
        </p>

        {/* 3 benefices */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" }}>
          {[
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
              color: "#ff6b6b",
              title: t("pn.benefit1_title"), desc: t("pn.benefit1_desc"),
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
              color: "#02d1ba",
              title: t("pn.benefit2_title"), desc: t("pn.benefit2_desc"),
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
              color: "#a78bfa",
              title: t("pn.benefit3_title"), desc: t("pn.benefit3_desc"),
            },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                background: "rgba(255,255,255,.025)",
                border: ".5px solid rgba(255,255,255,.06)",
                borderRadius: 10,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: b.color + "1a", color: b.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {React.cloneElement(b.icon, { width: 16, height: 16 })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{b.title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleActivate}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: G, color: "#000",
            border: "none", borderRadius: 12,
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 13, fontWeight: 900,
            letterSpacing: ".05em",
            cursor: "pointer",
            boxShadow: `0 16px 40px rgba(2,209,186,.35)`,
            transition: "opacity .15s, transform .15s",
          }}
        >
          {t("pn.btn_activate")}
        </button>

        <button
          onClick={onClose}
          style={{
            marginTop: 14,
            background: "transparent", border: "none",
            color: "rgba(255,255,255,.3)",
            fontSize: 12, fontFamily: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          {t("pn.btn_later")}
        </button>
      </div>
    </div>
  );
}
