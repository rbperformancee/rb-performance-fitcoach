import React from "react";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";
import { useT } from "../../lib/i18n";

const G = "#02d1ba";

const fillTpl = (s, vars) => {
  let out = s;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  return out;
};

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
  const t = useT();
  const profileComplete = !!(coach?.brand_name && coach?.full_name);
  const hasLogo = !!coach?.logo_url;
  const hasPayment = !!coach?.payment_link;
  const profileScore = (profileComplete ? 1 : 0) + (hasLogo ? 1 : 0) + (hasPayment ? 1 : 0);

  const steps = [
    {
      id: "profile",
      title: t("ow.step1_title"),
      desc: t("ow.step1_desc"),
      icon: "edit",
      done: profileScore >= 2,
      progress: `${profileScore}/3`,
      color: profileScore >= 2 ? G : "#f97316",
    },
    {
      id: "invite",
      title: t("ow.step2_title"),
      desc: coach?.coach_code ? fillTpl(t("ow.step2_desc_with"), { code: coach.coach_code }) : t("ow.step2_desc_no_code"),
      icon: "users",
      done: false,
      progress: t("ow.step2_progress"),
      color: "#a78bfa",
      action: { label: t("ow.step2_action"), onClick: onScrollToInvitation },
    },
    {
      id: "programme",
      title: t("ow.step3_title"),
      desc: t("ow.step3_desc"),
      icon: "document",
      done: false,
      progress: t("ow.step3_progress"),
      color: "#fbbf24",
    },
  ];

  return (
    <div style={{ marginBottom: 28, animation: "fadeUp 0.5s ease both" }}>
      {/* Hero accueil — premium */}
      <div style={{ padding: "40px 28px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#4A4A5A", fontWeight: 700, marginBottom: 12 }}>
          {t("ow.welcome")}
        </div>
        <h2 style={{ fontFamily: "'Inter',-apple-system,sans-serif", fontSize: "clamp(34px, 5vw, 48px)", fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.03em", lineHeight: 1.0 }}>
          {t("ow.title")}<span style={{ color: G }}>.</span>
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 auto", maxWidth: 380 }}>
          {t("ow.subtitle")}
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
