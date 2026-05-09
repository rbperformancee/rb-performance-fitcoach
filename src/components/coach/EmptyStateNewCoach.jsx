import React from "react";

const G = "#02d1ba";

/**
 * EmptyStateNewCoach — affiché sur l'overview du coach quand il a 0 clients.
 *
 * Évite que le dashboard soit vide post-onboarding (moment où le coach
 * peut décrocher si l'app a l'air "morte"). Trois CTAs prioritaires +
 * tip discret pour migrer.
 *
 * Props:
 *   onInvite: () => void
 *   onBuilder: () => void
 *   onMigrate: () => void
 *   coachFirstName?: string
 */
export default function EmptyStateNewCoach({ onInvite, onBuilder, onMigrate, coachFirstName }) {
  const cards = [
    {
      step: "01",
      label: "Invite ton premier client",
      desc: "Envoie un mail magique en 30s. Il s'inscrit, tu vois sa fiche apparaître.",
      cta: "Inviter",
      onClick: onInvite,
      primary: true,
    },
    {
      step: "02",
      label: "Construis un programme template",
      desc: "PPL / Full Body / Powerlift / Hybrid prêts à dupliquer pour gagner du temps.",
      cta: "Builder",
      onClick: onBuilder,
      primary: false,
    },
    {
      step: "03",
      label: "Migre tes clients existants",
      desc: "Tu viens de Trainerize, Hexfit, Eklo ? Import CSV en 5 min, 30 emails à la fois.",
      cta: "Migration",
      onClick: onMigrate,
      primary: false,
    },
  ];

  return (
    <div style={{ margin: "0 24px 28px", position: "relative", zIndex: 2 }}>
      {/* Hero */}
      <div style={{
        padding: "26px 22px",
        background: `linear-gradient(135deg, ${G}10, transparent 60%)`,
        border: `1px solid ${G}25`,
        borderRadius: 22,
        marginBottom: 14,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, background: `radial-gradient(circle, ${G}15 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "3px", color: G, textTransform: "uppercase", marginBottom: 8 }}>
          Premiers pas
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2, marginBottom: 8 }}>
          {coachFirstName ? `Bienvenue ${coachFirstName}.` : "Bienvenue sur ton dashboard."}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
          3 étapes pour tout activer. 10 minutes max, et tu coaches comme un pro à distance.
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map((c) => (
          <button
            key={c.step}
            type="button"
            onClick={c.onClick}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px",
              background: c.primary ? `${G}10` : "rgba(255,255,255,0.025)",
              border: `1px solid ${c.primary ? G + "30" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 14,
              textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              transition: "all .15s",
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "1.5px",
              color: c.primary ? G : "rgba(255,255,255,0.35)",
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
              minWidth: 18,
            }}>
              {c.step}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                {c.desc}
              </div>
            </div>
            <div style={{
              padding: "6px 11px",
              background: c.primary ? G : "rgba(255,255,255,0.04)",
              border: c.primary ? "none" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: c.primary ? "#000" : "rgba(255,255,255,0.7)",
              fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
              flexShrink: 0,
            }}>
              {c.cta}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
