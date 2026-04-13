import React from "react";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";

const G = "#02d1ba";

/**
 * CoachOnboardingWizard — affiche aux nouveaux coachs sans clients
 * un guide visuel des 3 etapes pour demarrer.
 *
 * Etapes :
 *   1. Configurer ton profil (logo, payment_link)
 *   2. Inviter ton 1er client (via code)
 *   3. Uploader un programme
 */
export default function CoachOnboardingWizard({ coach, onScrollToInvitation }) {
  const profileComplete = !!(coach?.brand_name && coach?.full_name);
  const hasLogo = !!coach?.logo_url;
  const hasPayment = !!coach?.payment_link;
  const profileScore = (profileComplete ? 1 : 0) + (hasLogo ? 1 : 0) + (hasPayment ? 1 : 0);

  const steps = [
    {
      id: "profile",
      title: "Complete ton profil",
      desc: "Ton logo, tes infos visibles par les clients, ton lien de paiement.",
      icon: "edit",
      done: profileScore >= 2,
      progress: `${profileScore}/3`,
      color: profileScore >= 2 ? G : "#f97316",
    },
    {
      id: "invite",
      title: "Invite ton premier client",
      desc: `Partage ton code 6 chiffres ${coach?.coach_code ? `(${coach.coach_code})` : ""} ou ton lien d'invitation.`,
      icon: "users",
      done: false,
      progress: "0 client",
      color: "#a78bfa",
      action: { label: "Voir mon code", onClick: onScrollToInvitation },
    },
    {
      id: "programme",
      title: "Cree un programme",
      desc: "Apres avoir ajoute ton premier client, uploade un programme HTML pour lui.",
      icon: "document",
      done: false,
      progress: "Pas encore",
      color: "#fbbf24",
    },
  ];

  return (
    <div style={{ marginBottom: 28, animation: "fadeUp 0.5s ease both" }}>
      {/* Hero accueil */}
      <div style={{ padding: "32px 24px", background: "linear-gradient(135deg, rgba(2,209,186,0.08), rgba(167,139,250,0.04))", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 22, marginBottom: 16, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(2,209,186,0.15)", border: "1px solid rgba(2,209,186,0.35)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: G, marginBottom: 16, boxShadow: "0 0 30px rgba(2,209,186,0.25)" }}>
          <AppIcon name="sparkles" size={28} color={G} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.8)", fontWeight: 700, marginBottom: 8 }}>
          Bienvenue, {coach?.full_name?.split(" ")[0] || "Coach"}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: "-1px", lineHeight: 1.1 }}>
          On lance ton<br />
          <span style={{ color: G }}>activite de coaching.</span>
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 auto", maxWidth: 360 }}>
          3 etapes pour avoir ton premier client actif. Chaque etape prend moins de 5 minutes.
        </p>
      </div>

      {/* 3 etapes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step, i) => (
          <div
            key={step.id}
            style={{
              background: step.done ? `${step.color}06` : "rgba(255,255,255,0.025)",
              border: `1px solid ${step.done ? `${step.color}30` : "rgba(255,255,255,0.06)"}`,
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              animation: `fadeUp 0.4s ease ${0.1 + i * 0.08}s both`,
            }}
          >
            {/* Numero / check */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: step.done ? step.color : `${step.color}15`,
              border: `1px solid ${step.color}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: step.done ? "#000" : step.color,
              fontWeight: 800, fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
              flexShrink: 0,
            }}>
              {step.done ? <AppIcon name="check" size={16} color="#000" strokeWidth={3} /> : i + 1}
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{step.title}</div>
                <span style={{ fontSize: 9, color: step.color, background: `${step.color}15`, padding: "2px 7px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  {step.progress}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                {step.desc}
              </div>
            </div>

            {/* Action button */}
            {step.action && (
              <button
                onClick={() => { haptic.light(); step.action.onClick?.(); }}
                style={{
                  padding: "8px 14px",
                  background: `${step.color}15`,
                  border: `1px solid ${step.color}30`,
                  borderRadius: 10,
                  color: step.color,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minHeight: 32,
                  letterSpacing: "0.3px",
                }}
              >
                {step.action.label} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
