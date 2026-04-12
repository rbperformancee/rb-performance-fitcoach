import React from "react";

const G = "#02d1ba";

/**
 * EmptyState — ecran "aucune donnee" premium reutilisable.
 *
 * Props :
 *   icon      : nom SVG ou React node (SVG inline)
 *   title     : titre principal
 *   subtitle  : description secondaire
 *   action    : { label, onClick } optionnel pour CTA
 *   accent    : couleur d'accent (default teal)
 *   size      : "sm" | "md" | "lg" (default "md")
 *   style     : override style container
 */
export default function EmptyState({ icon, title, subtitle, action, accent = G, size = "md", style }) {
  const sizes = {
    sm: { iconSize: 28, titleSize: 15, subSize: 12, padding: 24, gap: 8 },
    md: { iconSize: 40, titleSize: 18, subSize: 13, padding: 36, gap: 12 },
    lg: { iconSize: 56, titleSize: 22, subSize: 14, padding: 48, gap: 16 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: s.padding,
        gap: s.gap,
        fontFamily: "-apple-system,Inter,sans-serif",
        animation: "esFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
        ...style,
      }}
    >
      <style>{`@keyframes esFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Icone */}
      <div
        style={{
          width: s.iconSize + 24,
          height: s.iconSize + 24,
          borderRadius: "50%",
          background: `${accent}0f`,
          border: `1px solid ${accent}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          marginBottom: 4,
        }}
      >
        {typeof icon === "string" ? <IconByName name={icon} size={s.iconSize} /> : icon || <IconByName name="box" size={s.iconSize} />}
      </div>

      {/* Titre */}
      {title && (
        <div
          style={{
            fontSize: s.titleSize,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.3px",
            maxWidth: 320,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: s.subSize,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.55,
            maxWidth: 320,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 8,
            padding: "11px 22px",
            background: accent,
            color: "#000",
            border: "none",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: `0 6px 18px ${accent}33`,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function IconByName({ name, size = 40 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  const map = {
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    scale: <svg {...p}><rect x="3" y="15" width="18" height="5" rx="2" /><line x1="12" y1="15" x2="12" y2="9" /><path d="M8 9h8" /><path d="M6 9a6 6 0 0 1 12 0" /></svg>,
    apple: <svg {...p}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z" /><path d="M10 2c1 .5 2 2 2 5" /></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    chart: <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    box: <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    message: <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    zap: <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    activity: <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    dumbbell: <svg {...p}><rect x="5" y="10" width="2" height="4" rx="1" /><rect x="17" y="10" width="2" height="4" rx="1" /><line x1="3" y1="11" x2="3" y2="13" /><line x1="2" y1="11" x2="4" y2="11" /><line x1="2" y1="13" x2="4" y2="13" /><line x1="21" y1="11" x2="21" y2="13" /><line x1="20" y1="11" x2="22" y2="11" /><line x1="20" y1="13" x2="22" y2="13" /><line x1="7" y1="12" x2="17" y2="12" /></svg>,
  };
  return map[name] || map.box;
}
