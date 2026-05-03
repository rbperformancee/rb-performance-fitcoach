/**
 * Design tokens RB Perform — valeurs canoniques pour homogeneite.
 * Ne PAS redefinir en local dans les composants.
 */

// ===== COULEURS =====
export const colors = {
  // Fonds
  bg: "#050505",        // Background app client
  bgDeep: "#030303",    // Background CEO
  surface: "rgba(255,255,255,0.03)",
  surfaceHover: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",

  // Text
  text: "#ffffff",
  textDim: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.4)",
  textFaint: "rgba(255,255,255,0.25)",

  // Accents
  teal: "#02d1ba",
  orange: "#f97316",
  violet: "#a78bfa",
  red: "#ef4444",
  gold: "#fbbf24",
  green: "#22c55e",
  indigo: "#818cf8", // CEO
  ivory: "#f0ece4",  // CEO text
};

// ===== ESPACEMENT (systeme 4px) =====
// Utilise: padding: SP.md → cohesion parfaite
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

// ===== RADIUS =====
// Utilise: borderRadius: R.md → cohesion parfaite
export const R = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999, // pills
};

// ===== TYPOGRAPHIE =====
export const FONT = {
  system: "-apple-system,Inter,sans-serif",
  mono: "'JetBrains Mono',monospace",
  display: "'Bebas Neue','DM Sans',-apple-system,sans-serif",
};

// Echelle de tailles
export const FS = {
  xs: 10,    // captions, eyebrow
  sm: 11,    // labels
  md: 13,    // body
  base: 14,  // boutons
  lg: 16,    // base accessible iOS (sans zoom)
  xl: 18,
  xxl: 22,
  h3: 28,
  h2: 36,
  h1: 48,
};

// ===== SHADOW =====
export const SHADOW = {
  sm: "0 2px 8px rgba(0,0,0,0.25)",
  md: "0 8px 28px rgba(0,0,0,0.35)",
  lg: "0 16px 48px rgba(0,0,0,0.5)",
  tealGlow: "0 6px 24px rgba(2,209,186,0.35)",
};

// ===== Z-INDEX =====
export const Z = {
  nav: 100,
  drawer: 200,
  modal: 300,
  overlay: 400,
  toast: 500,
  splash: 9999,
};

// ===== TRANSITIONS =====
export const EASE = {
  standard: "cubic-bezier(0.22,1,0.36,1)",
  bouncy: "cubic-bezier(0.34,1.56,0.64,1)",
  linear: "linear",
};

// ===== Aliases legacy pour migration progressive =====
// Les composants déclaraient localement `const G = "#02d1ba"` partout.
// On exporte les valeurs canoniques pour que les imports remplacent
// progressivement les const locales sans casser.
export const G = colors.teal;
export const RED = colors.red;
export const ORANGE = colors.orange;
export const VIOLET = colors.violet;

const tokens = { colors, SP, R, FONT, FS, SHADOW, Z, EASE };
export default tokens;
