import React from "react";
import { getInitials, getBrandLabel, isWhiteLabelClient } from "../lib/branding";

/**
 * Logo coach (image si logo_url, sinon initiales).
 * Utilise en header app cote client.
 */
export function CoachLogo({ coachInfo, size = 40 }) {
  const accent = coachInfo?.accent_color || "#02d1ba";
  const name = coachInfo?.brand_name || coachInfo?.full_name;
  const logoUrl = coachInfo?.logo_url;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${name}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `1px solid ${accent}40`,
        }}
      />
    );
  }

  return (
    <div
      aria-label={`Logo ${name}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 800,
        color: "#000",
        letterSpacing: "0.5px",
        fontFamily: "'Bebas Neue',sans-serif",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/**
 * Header brand : logo + nom a afficher en haut des ecrans client
 */
export function CoachBrandHeader({ coachInfo, compact = false }) {
  const label = getBrandLabel(coachInfo);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 12 }}>
      <CoachLogo coachInfo={coachInfo} size={compact ? 28 : 36} />
      <div style={{ fontSize: compact ? 13 : 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
        {label}
      </div>
    </div>
  );
}

/**
 * Footer "Propulse par RB Perform" — affiche seulement pour les clients
 * d'un coach tiers (pas pour Rayan).
 */
export function PoweredByBadge({ coachInfo }) {
  if (!isWhiteLabelClient(coachInfo)) return null;
  return (
    <div
      aria-label="Propulse par RB Perform"
      style={{
        textAlign: "center",
        padding: "16px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)",
        fontSize: 10,
        color: "rgba(255,255,255,0.2)",
        letterSpacing: "2px",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      Propulse par <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>RB Perform</span>
    </div>
  );
}
