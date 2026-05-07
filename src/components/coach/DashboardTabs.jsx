import React from "react";
import haptic from "../../lib/haptic";

/**
 * DashboardTabs — chapitres LVMH style, inspires de la landing page.
 *
 * Layout :
 *   - Topbar wrap noir #0a0a0a, sticky, border-bottom rgba subtle
 *   - Wordmark "RB PERFORM" a gauche (Syne)
 *   - Chapitres numerotes au centre : 01 OVERVIEW · 02 BUSINESS · ...
 *   - Active : underline teal anime + scale
 *   - Inactive : numero monospace + label gris
 */

const TABS = [
  { id: "overview",    num: "01", label: "Overview" },
  { id: "business",    num: "02", label: "Business" },
  { id: "clients",     num: "03", label: "Clients" },
  { id: "recipes",     num: "04", label: "Recettes" },
  { id: "analytics",   num: "05", label: "Analytics" },
  { id: "achievements",num: "06", label: "Achievements" },
];

export default function DashboardTabs({ active, onChange, alerts = 0 }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 0,
        padding: "16px 4px 18px",
        marginBottom: 24,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`[role="tablist"]::-webkit-scrollbar { display: none; }`}</style>
      {TABS.map((t) => {
        const isActive = active === t.id;
        const showAlert = t.id === "clients" && alerts > 0;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => { haptic.selection(); onChange(t.id); }}
            className="dash-chapter"
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 8,
              padding: "8px 18px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
              flexShrink: 0,
              minHeight: 36,
              position: "relative",
              opacity: isActive ? 1 : 0.55,
            }}
          >
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: "0.05em",
              color: isActive ? "#02d1ba" : "rgba(255,255,255,0.35)",
              transition: "color 0.25s",
            }}>{t.num}</span>
            <span style={{
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
              transition: "color 0.25s, font-weight 0.25s",
            }}>{t.label}</span>
            {showAlert && (
              <span style={{
                marginLeft: 4,
                minWidth: 16, height: 16, borderRadius: "50%",
                background: "#ef4444",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "#fff",
                padding: "0 4px",
                fontFamily: "'JetBrains Mono', monospace",
              }}>{alerts > 9 ? "9+" : alerts}</span>
            )}
            {/* Underline anime */}
            <span style={{
              position: "absolute",
              left: "18px", right: "18px",
              bottom: -19,
              height: 2,
              background: "#02d1ba",
              borderRadius: 2,
              transformOrigin: "center",
              transform: isActive ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
              boxShadow: isActive ? "0 0 12px rgba(2,209,186,0.5)" : "none",
            }} />
          </button>
        );
      })}
      <style>{`
        .dash-chapter:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
