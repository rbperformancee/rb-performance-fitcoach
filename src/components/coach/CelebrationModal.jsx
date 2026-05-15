import React, { useEffect } from "react";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

/**
 * CelebrationModal — confetti + message dopaminergique pour milestones
 * coach. Affiché 1x par milestone via flag localStorage.
 *
 * Milestones supportés :
 *   - first_client      : 1er client invité accepté
 *   - first_session     : 1er session loggée par n'importe quel client
 *   - first_checkin     : 1er bilan hebdo reçu
 *   - first_pr          : 1er PR battu par un client
 *
 * Props:
 *   milestone: id parmi ci-dessus
 *   onClose: () => void
 */

const CONFIG = {
  first_client: {
    eyebrow: "Premier client",
    title: "Ton premier client est arrivé.",
    body: "Tu coaches officiellement à distance. C'est plus une promesse, c'est un fait.",
    cta: "Suite",
  },
  first_session: {
    eyebrow: "Première séance loggée",
    title: "Ton client vient de logger.",
    body: "C'est le début de ta data de coach. Plus il logue, plus tu es précis.",
    cta: "Voir sa fiche",
  },
  first_checkin: {
    eyebrow: "Premier bilan reçu",
    title: "Premier bilan hebdo reçu.",
    body: "Mensurations + ressenti structurés. Plus de chat à scroller.",
    cta: "Lire le bilan",
  },
  first_pr: {
    eyebrow: "Premier record battu",
    title: "Ton premier PR client.",
    body: "Tu vas vivre ce moment des centaines de fois. Profite de la première.",
    cta: "Voir le PR",
  },
};

export default function CelebrationModal({ milestone, onClose, accent = G }) {
  const cfg = CONFIG[milestone];

  useEffect(() => {
    if (cfg) {
      try { haptic.success?.(); } catch {}
    }
  }, [milestone]);

  if (!cfg) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1500,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      <div style={{
        position: "relative", zIndex: 1,
        background: "#0a0a0a",
        border: `1px solid ${accent}30`,
        borderRadius: 24,
        maxWidth: 420, width: "100%",
        padding: "36px 28px",
        textAlign: "center",
        boxShadow: `0 24px 60px ${accent}25`,
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, color: accent, textTransform: "uppercase", marginBottom: 14 }}>
          {cfg.eyebrow}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 12 }}>
          {cfg.title}<span style={{ color: accent }}>.</span>
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 26 }}>
          {cfg.body}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "13px 26px",
            background: accent, color: "#000",
            border: "none", borderRadius: 12,
            fontSize: 12, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: ".1em", textTransform: "uppercase",
            boxShadow: `0 12px 32px ${accent}40`,
          }}
        >
          {cfg.cta}
        </button>
      </div>

      <style>{`
        @keyframes celebFall {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}

// Helper localStorage : true si milestone déjà célébré pour ce coach
export function isMilestoneCelebrated(coachId, milestone) {
  if (!coachId) return true;
  try {
    return localStorage.getItem(`rb_celeb_${coachId}_${milestone}`) === "1";
  } catch { return true; }
}

export function markMilestoneCelebrated(coachId, milestone) {
  if (!coachId) return;
  try {
    localStorage.setItem(`rb_celeb_${coachId}_${milestone}`, "1");
  } catch {}
}
