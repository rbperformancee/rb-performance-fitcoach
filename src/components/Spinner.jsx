import React from "react";

/**
 * Spinner premium — 3 variantes, remplace les cercles basiques.
 *
 * Variants :
 *   - "dots"  : 3 points qui pulsent en sequence (par defaut, le plus premium)
 *   - "arc"   : arc teal qui tourne avec glow subtil
 *   - "pulse" : orbe pulsante avec halo
 *
 * Props :
 *   size     : hauteur/largeur (default 28)
 *   color    : couleur d'accent (default teal #02d1ba)
 *   variant  : dots | arc | pulse
 *   label    : texte sous le spinner (optionnel)
 *   center   : bool — centre dans son parent (default false)
 */
export default function Spinner({
  size = 28,
  color = "#02d1ba",
  variant = "dots",
  label,
  center = false,
  style = {},
}) {
  const inner = (() => {
    switch (variant) {
      case "arc":
        return <ArcSpinner size={size} color={color} />;
      case "pulse":
        return <PulseSpinner size={size} color={color} />;
      case "dots":
      default:
        return <DotsSpinner size={size} color={color} />;
    }
  })();

  const wrapperStyle = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: label ? 10 : 0,
    ...(center ? { position: "absolute", inset: 0 } : {}),
    ...style,
  };

  return (
    <div style={wrapperStyle} role="status" aria-label={label || "Chargement"}>
      {inner}
      {label && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "1px",
            fontFamily: "-apple-system,Inter,sans-serif",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/** ===== Variant DOTS (3 points pulses, tres premium) ===== */
function DotsSpinner({ size, color }) {
  const dot = size / 4.5;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: dot * 0.7 }}>
      <style>{`
        @keyframes spDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40%          { transform: scale(1);   opacity: 1; }
        }
      `}</style>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: dot,
            height: dot,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 ${dot}px ${color}66`,
            animation: `spDot 1.2s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** ===== Variant ARC (arc fin + glow) ===== */
function ArcSpinner({ size, color }) {
  const strokeW = Math.max(1.5, size / 18);
  const dim = color + "18";
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <style>{`
        @keyframes spArc { to { transform: rotate(360deg); } }
      `}</style>
      <svg
        viewBox="0 0 50 50"
        width={size}
        height={size}
        style={{
          animation: "spArc 0.9s linear infinite",
          filter: `drop-shadow(0 0 ${size / 6}px ${color}55)`,
        }}
      >
        <circle cx="25" cy="25" r="20" stroke={dim} strokeWidth={strokeW} fill="none" />
        <path
          d="M 25 5 A 20 20 0 0 1 45 25"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/** ===== Variant PULSE (orbe pulsante + halo) ===== */
function PulseSpinner({ size, color }) {
  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes spPulseCore { 0%,100% { transform: scale(0.85); opacity: 0.9; } 50% { transform: scale(1); opacity: 1; } }
        @keyframes spPulseHalo { 0% { transform: scale(0.6); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
      `}</style>
      <div
        style={{
          position: "absolute",
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: "50%",
          background: `${color}44`,
          animation: "spPulseHalo 1.6s ease-out infinite",
        }}
      />
      <div
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 ${size / 2}px ${color}99`,
          animation: "spPulseCore 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}
