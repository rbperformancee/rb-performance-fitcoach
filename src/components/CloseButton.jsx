import React from "react";

/**
 * CloseButton — bouton X 44×44px, conforme aux touch targets WCAG.
 * Utiliser sur tous les overlays, modals, drawers, bottom sheets.
 */
export default function CloseButton({ onClick, style = {}, color = "rgba(255,255,255,0.85)", size = 18 }) {
  return (
    <button
      onClick={onClick}
      aria-label="Fermer"
      style={{
        width: 44, height: 44,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        cursor: "pointer",
        color,
        fontSize: size,
        lineHeight: 1,
        fontFamily: "inherit",
        flexShrink: 0,
        transition: "background 0.15s ease",
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}
