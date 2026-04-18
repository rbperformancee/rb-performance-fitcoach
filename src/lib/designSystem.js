/**
 * Design System — RB Perform
 *
 * Tokens extraits de CoachHomeScreen + client panel.
 * Source de vérité pour toute l'app mobile.
 */

export const DS = {
  // ===== COLORS =====
  bg: {
    primary: "#050505",
    panel: "#080C14",
    card: "rgba(255,255,255,0.03)",
    cardHover: "rgba(255,255,255,0.05)",
    input: "rgba(255,255,255,0.04)",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    medium: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.12)",
    accent: "rgba(2,209,186,0.2)",
    accentStrong: "rgba(2,209,186,0.3)",
  },
  accent: {
    teal: "#02d1ba",
    tealDim: "rgba(2,209,186,0.1)",
    tealGlow: "rgba(2,209,186,0.4)",
    red: "#ff6b6b",
    redDim: "rgba(255,107,107,0.1)",
    orange: "#f97316",
  },
  text: {
    primary: "#fff",
    secondary: "rgba(255,255,255,0.5)",
    muted: "rgba(255,255,255,0.25)",
    ghost: "rgba(255,255,255,0.12)",
    accent: "rgba(2,209,186,0.7)",
  },

  // ===== TYPOGRAPHY =====
  font: {
    display: "'Syne', sans-serif",
    body: "-apple-system, Inter, sans-serif",
    mono: "'JetBrains Mono', monospace",
    number: "'Bebas Neue', sans-serif",
  },
  fontSize: {
    hero: 44,        // nom sur home screen
    title: 28,       // titres sections
    subtitle: 22,    // citations, sous-titres
    body: 14,        // texte courant
    caption: 11,     // labels, metadata
    label: 10,       // uppercase labels
    micro: 9,        // letter-spaced labels
    stat: 32,        // gros chiffres stats
    clock: 38,       // heure
  },

  // ===== SPACING =====
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 36,
    container: 28,   // padding horizontal des pages
    safeTop: "calc(env(safe-area-inset-top, 44px) + 12px)",
    safeBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
  },

  // ===== RADIUS =====
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    pill: 100,
  },

  // ===== EFFECTS =====
  gradient: {
    ambiance_top: "radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.15) 0%, transparent 60%)",
    ambiance_bottom: "radial-gradient(ellipse at 50% 120%, rgba(2,209,186,0.06) 0%, transparent 60%)",
    divider: "linear-gradient(90deg, rgba(2,209,186,0.3) 0%, rgba(255,255,255,0.05) 100%)",
  },
  shadow: {
    card: "0 4px 24px rgba(0,0,0,0.4)",
    glow: "drop-shadow(0 0 6px rgba(2,209,186,0.8))",
    pill: "0 8px 32px rgba(0,0,0,0.5)",
  },

  // ===== ANIMATION =====
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  duration: {
    fast: "0.15s",
    normal: "0.25s",
    slow: "0.5s",
  },

  // ===== Z-INDEX =====
  zIndex: {
    base: 0,
    content: 1,
    sticky: 10,
    overlay: 150,
    clientPanel: 200,
    pill: 250,
    modal: 300,
    sidebar: 500,
    homeScreen: 600,
    homePill: 601,
    fullscreenModal: 700,
    toast: 800,
    splash: 99999,
  },

  // ===== SCORE RING =====
  ring: {
    size: 52,
    strokeWidth: 8,
    radius: 40,
    circumference: 2 * Math.PI * 40,
  },

  // ===== PILL NAV =====
  pill: {
    bg: "rgba(15,15,15,0.75)",
    border: "1px solid rgba(255,255,255,0.09)",
    blur: "blur(20px)",
    buttonSize: 50,
    iconSize: 20,
    iconStroke: 2.5,
  },
};

// ===== STYLE HELPERS =====

export const cardStyle = {
  background: DS.bg.card,
  border: `1px solid ${DS.border.subtle}`,
  borderRadius: DS.radius.lg,
  padding: `${DS.spacing.md}px ${DS.spacing.lg}px`,
};

export const labelStyle = {
  fontSize: DS.fontSize.label,
  fontWeight: 600,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: DS.text.muted,
};

export const statStyle = {
  fontSize: DS.fontSize.stat,
  fontWeight: 200,
  letterSpacing: "-1.5px",
  lineHeight: 1,
};

export const pillNavStyle = {
  position: "fixed",
  bottom: DS.spacing.safeBottom,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 0,
  background: DS.pill.bg,
  border: DS.pill.border,
  borderRadius: DS.radius.pill,
  padding: 5,
  backdropFilter: DS.pill.blur,
  WebkitBackdropFilter: DS.pill.blur,
};

export const pillButtonStyle = (isActive) => ({
  width: DS.pill.buttonSize,
  height: DS.pill.buttonSize,
  borderRadius: DS.radius.pill,
  border: "none",
  background: isActive ? DS.accent.teal : "transparent",
  color: isActive ? "#000" : "rgba(255,255,255,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: `all ${DS.duration.normal} ${DS.ease}`,
});

export const ambianceTop = {
  position: "absolute",
  top: 0, left: 0, right: 0,
  height: "60%",
  background: DS.gradient.ambiance_top,
  pointerEvents: "none",
};

export const ambianceBottom = {
  position: "absolute",
  bottom: 0, left: 0, right: 0,
  height: "40%",
  background: DS.gradient.ambiance_bottom,
  pointerEvents: "none",
};
