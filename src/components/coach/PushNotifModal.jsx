import React from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "../Toast";
import haptic from "../../lib/haptic";

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
  if (!open) return null;

  async function handleActivate() {
    if (isDemo) {
      haptic.selection();
      toast.info("Disponible en version complete →");
      onClose?.();
      return;
    }

    haptic.selection();

    if (!("Notification" in window)) {
      toast.error("Ton navigateur ne supporte pas les notifications");
      onClose?.();
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast.success("Notifications activees ✓");
        // Persister l'etat dans Supabase (best-effort)
        if (coachId) {
          try {
            await supabase
              .from("coaches")
              .update({ notif_push_enabled: true })
              .eq("id", coachId);
          } catch (_) {}
        }
        // TODO: register subscription via push API + VAPID (Edge Fn dediee)
      } else if (perm === "denied") {
        toast.info("Tu peux les activer plus tard dans les Settings");
      }
    } catch (_) {
      toast.error("Erreur lors de l'activation");
    }

    onClose?.();
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6vh 16px",
        animation: "pushFadeIn .2s ease both",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Activer les notifications"
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
          aria-label="Fermer"
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
          Sois alerte en temps reel<span style={{ color: G }}>.</span>
        </h2>

        <p style={{
          fontSize: 13, color: "rgba(255,255,255,.45)",
          margin: "0 0 28px", lineHeight: 1.55,
          fontWeight: 300,
        }}>
          Recois une alerte des qu'il se passe quelque chose d'important sur ton espace.
        </p>

        {/* 3 benefices */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" }}>
          {[
            { emoji: "🔴", title: "Client a risque de churn", desc: "Avant qu'il ne decroche" },
            { emoji: "💪", title: "Seance completee par un client", desc: "Au moment meme ou ca arrive" },
            { emoji: "💬", title: "Nouveau message recu", desc: "Reponds sans delai" },
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
                fontSize: 18,
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{b.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{b.title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{b.desc}</div>
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
            fontFamily: "'Syne', sans-serif",
            fontSize: 12, fontWeight: 900,
            letterSpacing: ".1em", textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: `0 16px 40px rgba(2,209,186,.35)`,
            transition: "opacity .15s, transform .15s",
          }}
        >
          Activer maintenant
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
          Plus tard
        </button>
      </div>
    </div>
  );
}
