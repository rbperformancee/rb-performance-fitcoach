import React from "react";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";

/**
 * DashboardTabs — segmented control pour organiser les sections du dashboard coach.
 * Sticky en haut sous le hero, scroll horizontal sur mobile.
 */
const TABS = [
  { id: "overview",  label: "Vue d'ensemble", icon: "chart" },
  { id: "business",  label: "Business",       icon: "trending-up" },
  { id: "clients",   label: "Clients",        icon: "users" },
  { id: "analytics", label: "Analytics",      icon: "activity" },
  { id: "achievements", label: "Achievements", icon: "trophy" },
];

export default function DashboardTabs({ active, onChange, alerts = 0 }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 6,
        padding: "10px 4px",
        marginBottom: 24,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
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
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 14px",
              background: isActive ? "rgba(2,209,186,0.1)" : "transparent",
              border: `1px solid ${isActive ? "rgba(2,209,186,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 100,
              color: isActive ? "#02d1ba" : "rgba(255,255,255,0.5)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.3px",
              cursor: "pointer",
              fontFamily: "-apple-system,Inter,sans-serif",
              transition: "all 0.2s",
              flexShrink: 0,
              minHeight: 36,
              position: "relative",
            }}
          >
            <AppIcon name={t.icon} size={13} color={isActive ? "#02d1ba" : "rgba(255,255,255,0.5)"} />
            {t.label}
            {showAlert && (
              <span style={{
                marginLeft: 4,
                width: 18, height: 18, borderRadius: "50%",
                background: "#ef4444",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "#fff",
                boxShadow: "0 0 8px rgba(239,68,68,0.5)",
              }}>{alerts > 9 ? "9+" : alerts}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
