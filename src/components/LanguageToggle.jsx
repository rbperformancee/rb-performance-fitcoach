import React from "react";
import { useLocale } from "../lib/i18n";
import haptic from "../lib/haptic";

/**
 * LanguageToggle — switch FR/EN simple en pill avec 2 options.
 * Place dans Profile, OnboardingFlow first step, ou dans coach settings.
 */
export default function LanguageToggle({ compact = false }) {
  const [locale, setLocale] = useLocale();

  const opts = [
    { id: "fr", label: "FR", flag: "🇫🇷" },
    { id: "en", label: "EN", flag: "🇬🇧" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Langue / Language"
      style={{
        display: "inline-flex",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 100,
        padding: 3,
        gap: 2,
      }}
    >
      {opts.map((o) => {
        const active = locale === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => { haptic.selection(); setLocale(o.id); }}
            style={{
              padding: compact ? "6px 12px" : "8px 16px",
              borderRadius: 100,
              background: active ? "#02d1ba" : "transparent",
              color: active ? "#000" : "rgba(255,255,255,0.5)",
              border: "none",
              fontSize: compact ? 11 : 12,
              fontWeight: 800,
              letterSpacing: "1px",
              cursor: "pointer",
              fontFamily: "-apple-system,Inter,sans-serif",
              transition: "all 0.2s",
              minHeight: 32,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
