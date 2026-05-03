import React from "react";
import { colors, R, FS, SHADOW, EASE } from "../../lib/tokens";

/**
 * Button — composant unifié pour TOUS les CTA et actions.
 *
 * L'audit ULTRA-DESIGN identifiait 47 boutons inlinés dans CoachDashboard
 * avec 8 styles primary distincts. Ce composant canonise les variants pour
 * sortir du chaos.
 *
 * Usage :
 *   <Button variant="primary" size="md" onClick={...}>Save</Button>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="ghost" icon={<svg.../>}>Edit</Button>
 *   <Button variant="danger" loading={saving}>Delete</Button>
 *
 * Variants :
 *   - primary    : CTA principal (gradient teal, ombre glow)
 *   - secondary  : action secondaire (border subtil, bg surface)
 *   - ghost      : tertiaire (transparent, hover bg)
 *   - danger     : destructive (border rouge, color rouge)
 *   - icon       : icon-only carré (border subtil)
 *
 * Sizes :
 *   - sm         : 30px height (header toolbar, inline)
 *   - md         : 38px height (default, dialogs)
 *   - lg         : 48px height (form submits, hero CTAs)
 *
 * Props :
 *   - loading    : remplace le label par "..." et désactive
 *   - disabled   : désactive avec opacity 0.4
 *   - icon       : ReactNode placé avant le label
 *   - iconRight  : ReactNode placé après le label
 *   - fullWidth  : width: 100%
 *   - as         : "button" (default) ou "a" pour les liens
 *   - href       : (si as="a")
 *   - className  : pour les overrides exceptionnels
 *   - style      : merged en dernier pour overrides précis
 */

const VARIANTS = {
  primary: {
    background: `linear-gradient(135deg, ${colors.teal}, #0891b2)`,
    color: "#000",
    border: "none",
    boxShadow: SHADOW.tealGlow,
    fontWeight: 800,
  },
  secondary: {
    background: "rgba(255,255,255,0.04)",
    color: colors.text,
    border: `1px solid ${colors.border}`,
    fontWeight: 700,
  },
  ghost: {
    background: "transparent",
    color: colors.textDim,
    border: `1px solid ${colors.border}`,
    fontWeight: 600,
  },
  danger: {
    background: "transparent",
    color: colors.red,
    border: `1px solid rgba(239,68,68,0.25)`,
    fontWeight: 700,
  },
  accent: {
    background: `${colors.teal}15`,
    color: colors.teal,
    border: `1px solid ${colors.teal}40`,
    fontWeight: 700,
  },
  icon: {
    background: "rgba(255,255,255,0.04)",
    color: colors.textDim,
    border: `1px solid ${colors.border}`,
    fontWeight: 600,
  },
};

const SIZES = {
  sm: { height: 30, padding: "0 12px", fontSize: FS.sm, gap: 6 },
  md: { height: 38, padding: "0 16px", fontSize: FS.base, gap: 7 },
  lg: { height: 48, padding: "0 24px", fontSize: FS.base, gap: 8 },
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  as = "button",
  href,
  onClick,
  type = "button",
  children,
  className,
  style,
  title,
  "aria-label": ariaLabel,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;
  const isIconOnly = variant === "icon" || (!children && (icon || iconRight));

  const combined = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    height: s.height,
    padding: isIconOnly ? 0 : s.padding,
    width: isIconOnly ? s.height : (fullWidth ? "100%" : "auto"),
    fontSize: s.fontSize,
    fontFamily: "inherit",
    letterSpacing: variant === "primary" ? "0.05em" : "0.02em",
    textTransform: variant === "primary" ? "uppercase" : "none",
    borderRadius: isIconOnly ? R.xs : R.sm,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.45 : 1,
    transition: `transform 150ms ${EASE.standard}, opacity 150ms ${EASE.standard}, background 150ms ${EASE.standard}`,
    textDecoration: "none",
    whiteSpace: "nowrap",
    ...v,
    ...style,
  };

  const Comp = as === "a" ? "a" : "button";
  const compProps = as === "a"
    ? { href, onClick: isDisabled ? undefined : onClick }
    : { type, onClick: isDisabled ? undefined : onClick, disabled: isDisabled };

  return (
    <Comp
      {...compProps}
      title={title}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={className}
      style={combined}
      onMouseDown={(e) => { if (!isDisabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { if (!isDisabled) e.currentTarget.style.transform = ""; }}
      onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.transform = ""; }}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon}
          {children}
          {iconRight}
        </>
      )}
    </Comp>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "btnSpin 0.8s linear infinite" }} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="14 30" />
      <style>{`@keyframes btnSpin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default Button;
