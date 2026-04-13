import React from "react";
import AppIcon from "./AppIcon";

const G = "#02d1ba";

/**
 * PullToRefreshIndicator — affiche une pastille circulaire en haut de l'ecran.
 * Rotation progressive selon progress (0..1), spin quand refreshing.
 */
export default function PullToRefreshIndicator({ pulling, progress = 0, refreshing }) {
  if (!pulling && !refreshing) return null;

  const visible = pulling || refreshing;
  const scale = Math.min(1, progress + 0.3);
  const translateY = refreshing ? 40 : (progress * 50);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: `translate(-50%, ${translateY}px) scale(${scale})`,
        zIndex: 200,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: refreshing ? "all 0.2s" : "none",
      }}
    >
      <style>{`
        @keyframes ptrSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div
        style={{
          width: 38, height: 38,
          borderRadius: "50%",
          background: "rgba(15,15,15,0.9)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${progress >= 1 || refreshing ? G : "rgba(255,255,255,0.1)"}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: progress >= 1 || refreshing ? G : "rgba(255,255,255,0.5)",
          animation: refreshing ? "ptrSpin 0.7s linear infinite" : "none",
          transition: "border-color 0.2s, color 0.2s",
        }}
      >
        <div style={{ transform: refreshing ? "none" : `rotate(${progress * 360}deg)`, transition: "transform 0.05s" }}>
          <AppIcon name="refresh" size={16} color="currentColor" />
        </div>
      </div>
    </div>
  );
}
